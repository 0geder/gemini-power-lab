import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface PowerData {
  voltage_L1: number[];
  voltage_L2: number[];
  voltage_L3: number[];
  current_L1: number[];
  current_L2: number[];
  current_L3: number[];
  sampling_rate_hz: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);

    if (res.status !== 429) return res; // success or other error

    const error = await res.json();
    const retryDelay = error?.error?.details?.find((d: any) => d['@type']?.includes("RetryInfo"))?.retryDelay;

    const delayMs = retryDelay
      ? parseFloat(retryDelay) * 1000
      : 1000 * Math.pow(2, i); // exponential backoff

    console.warn(`Quota hit (429). Retrying in ${delayMs}ms...`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error("Gemini API quota exceeded after retries");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, mode } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = "gemini-1.5-flash"; // safer for testing, switch to pro when ready
    const prompt = generatePrompt(data, mode);

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 4096,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      console.error('Request URL:', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent');
      console.error('API Key configured:', !!geminiApiKey);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Invalid Gemini response:', result);
      throw new Error('Invalid response from Gemini API');
    }

    const text = result.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(analysisResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw text:', text);
      throw new Error('Failed to parse JSON from Gemini response');
    }

  } catch (error) {
    console.error('Error in analyze-power-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generatePrompt(data: PowerData, mode: string): string {
  return `
You are an expert electrical engineer specializing in three-phase power systems analysis. 

Analyze the following three-phase electrical data and provide a structured JSON response with precise calculations.

Input Data:
- Voltage L1: ${data.voltage_L1.slice(0, 10).join(', ')}... (${data.voltage_L1.length} samples)
- Voltage L2: ${data.voltage_L2.slice(0, 10).join(', ')}... (${data.voltage_L2.length} samples)
- Voltage L3: ${data.voltage_L3.slice(0, 10).join(', ')}... (${data.voltage_L3.length} samples)
- Current L1: ${data.current_L1.slice(0, 10).join(', ')}... (${data.current_L1.length} samples)
- Current L2: ${data.current_L2.slice(0, 10).join(', ')}... (${data.current_L2.length} samples)
- Current L3: ${data.current_L3.slice(0, 10).join(', ')}... (${data.current_L3.length} samples)
- Sampling Rate: ${data.sampling_rate_hz} Hz

Processing Mode: ${mode}

IMPORTANT: Return ONLY a valid JSON object with the following structure:

{
  "rms_values": {
    "voltage_L1": <calculated_rms_value>,
    "voltage_L2": <calculated_rms_value>,
    "voltage_L3": <calculated_rms_value>,
    "current_L1": <calculated_rms_value>,
    "current_L2": <calculated_rms_value>,
    "current_L3": <calculated_rms_value>
  },
  "peak_values": {
    "voltage_L1": <calculated_peak_value>,
    "voltage_L2": <calculated_peak_value>,
    "voltage_L3": <calculated_peak_value>,
    "current_L1": <calculated_peak_value>,
    "current_L2": <calculated_peak_value>,
    "current_L3": <calculated_peak_value>
  },
  "frequency_hz": <calculated_frequency>,
  "phase_angles_degrees": {
    "voltage_L1_vs_current_L1": <calculated_phase_angle>,
    "voltage_L2_vs_current_L2": <calculated_phase_angle>,
    "voltage_L3_vs_current_L3": <calculated_phase_angle>,
    "voltage_L1_vs_voltage_L2": <calculated_phase_angle>,
    "voltage_L2_vs_voltage_L3": <calculated_phase_angle>,
    "voltage_L3_vs_voltage_L1": <calculated_phase_angle>,
    "current_L1_vs_current_L2": <calculated_phase_angle>,
    "current_L2_vs_current_L3": <calculated_phase_angle>,
    "current_L3_vs_current_L1": <calculated_phase_angle>
  },
  "analysis_summary": "<brief_technical_summary>",
  "power_calculations": {
    "active_power_kw": <calculated_value>,
    "reactive_power_kvar": <calculated_value>,
    "apparent_power_kva": <calculated_value>,
    "power_factor": <calculated_value>
  }
}

Calculate all values using standard electrical engineering formulas and provide accurate numerical results.`;
}