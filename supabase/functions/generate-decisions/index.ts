import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecisionRequest {
  analysisResults: any;
  category: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisResults, category }: DecisionRequest = await req.json();
    
    if (!analysisResults) {
      throw new Error('Analysis results are required');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = generateDecisionPrompt(analysisResults, category);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No content generated from Gemini API');
    }

    // Parse the JSON response from Gemini
    let decisions;
    try {
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        decisions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', generatedText);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({ decisions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-decisions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateDecisionPrompt(analysisResults: any, category: string): string {
  const categoryPrompts = {
    technical: `Based on the power system analysis results, suggest 2-3 technical decisions that should be made. Focus on:
    - System optimization opportunities
    - Equipment maintenance needs
    - Technical upgrades or modifications
    - Safety improvements`,
    
    operational: `Based on the power system analysis results, suggest 2-3 operational decisions. Focus on:
    - Load management strategies
    - Operational efficiency improvements
    - Maintenance scheduling
    - Performance monitoring adjustments`,
    
    strategic: `Based on the power system analysis results, suggest 2-3 strategic decisions. Focus on:
    - Long-term capacity planning
    - Infrastructure investments
    - Risk management strategies
    - System expansion considerations`,
    
    team: `Based on the power system analysis results, suggest 2-3 team and resource decisions. Focus on:
    - Training requirements
    - Resource allocation
    - Staffing considerations
    - Skill development needs`
  };

  const categoryInstructions = categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.technical;

  return `You are an expert power systems engineer analyzing electrical data. 

${categoryInstructions}

Analysis Results:
${JSON.stringify(analysisResults, null, 2)}

Please respond with ONLY a JSON array of decision objects. Each decision should have:
- title: string (concise decision title)
- description: string (detailed explanation)
- priority: "low" | "medium" | "high"
- reasoning: string (why this decision is important based on the analysis)

Format your response as a JSON array with 2-3 decisions. No other text or formatting.

Example format:
[
  {
    "title": "Optimize Phase Balance",
    "description": "Implement load redistribution to correct phase imbalance",
    "priority": "high",
    "reasoning": "Analysis shows 15% voltage unbalance which exceeds recommended limits"
  }
]`;
}