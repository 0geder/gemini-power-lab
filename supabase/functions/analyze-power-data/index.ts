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
  // Stats calculation remains the same...
  const calculateStats = (arr: number[]) => ({
    min: Math.min(...arr).toFixed(3),
    max: Math.max(...arr).toFixed(3),
    avg: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3)
  });

  const v1Stats = calculateStats(data.voltage_L1);
  const v2Stats = calculateStats(data.voltage_L2);
  const v3Stats = calculateStats(data.voltage_L3);
  const i1Stats = calculateStats(data.current_L1);
  const i2Stats = calculateStats(data.current_L2);
  const i3Stats = calculateStats(data.current_L3);

  // --- DYNAMIC PROMPT SECTION ---
  let analysisInstructions = '';
  switch (mode) {
    case 'power_quality':
      analysisInstructions = `
        Focus on power quality metrics.
        1. Calculate Voltage and Current THD (Total Harmonic Distortion) for each phase.
        2. Identify the top 3 dominant harmonics (e.g., 3rd, 5th, 7th) and their magnitudes if present.
        3. Calculate voltage and current unbalance percentages.
        4. Provide detailed notes on any observed distortions, notches, or swells.
      `;
      break;
    case 'fault_detection':
      analysisInstructions = `
        Focus on fault and anomaly detection.
        1. Analyze waveforms for any transients, sags, swells, or interruptions.
        2. Check for severe phase unbalance in both voltage and current.
        3. Look for signs of short circuits (high current spikes) or open circuits (zero current on one phase).
        4. In the 'analysis_notes', clearly state if a fault is suspected and describe its characteristics.
      `;
      break;
    case 'load_analysis':
      analysisInstructions = `
        Focus on a detailed load analysis.
        1. Calculate Active Power (kW), Reactive Power (kVAR), and Apparent Power (kVA) for each phase and the total.
        2. Calculate the Power Factor for each phase and the total system.
        3. Determine if the overall load is inductive, capacitive, or resistive.
        4. Provide recommendations for power factor correction if it is below 0.95.
      `;
      break;
    case 'waveform':
    default:
      analysisInstructions = `
        Focus on fundamental waveform characteristics.
        1. Calculate True RMS and Peak values for all voltage and current waveforms.
        2. Determine the fundamental frequency of the system.
        3. Calculate the phase angles between all voltage and current pairs.
        4. Determine the phase sequence (e.g., positive/ABC).
      `;
      break;
  }

  return `
    # Three-Phase Power System Analysis

    ## System Parameters
    - Sampling Rate: ${data.sampling_rate_hz} Hz
    - Total duration: ${(data.voltage_L1.length / data.sampling_rate_hz).toFixed(3)} seconds

    ## Input Data Summary
    ### Voltage (V)
    - L1: ${data.voltage_L1.length} samples (min: ${v1Stats.min}V, max: ${v1Stats.max}V, avg: ${v1Stats.avg}V)
    - L2: ${data.voltage_L2.length} samples (min: ${v2Stats.min}V, max: ${v2Stats.max}V, avg: ${v2Stats.avg}V)
    - L3: ${data.voltage_L3.length} samples (min: ${v3Stats.min}V, max: ${v3Stats.max}V, avg: ${v3Stats.avg}V)
    ### Current (A)
    - L1: ${data.current_L1.length} samples (min: ${i1Stats.min}A, max: ${i1Stats.max}A, avg: ${i1Stats.avg}A)
    - L2: ${data.current_L2.length} samples (min: ${i2Stats.min}A, max: ${i2Stats.max}A, avg: ${i2Stats.avg}A)
    - L3: ${data.current_L3.length} samples (min: ${i3Stats.min}A, max: ${i3Stats.max}A, avg: ${i3Stats.avg}A)

    ## Analysis Request
    You are an expert power systems analysis AI. Based on the **'${mode}'** analysis mode, perform the following focused analysis.
    
    ### Focused Instructions for '${mode}' mode:
    ${analysisInstructions}

    ## Expected Output Format
    Provide your complete analysis in a single, valid JSON object. The structure below is a comprehensive example; populate all fields with your calculated values. If a value cannot be determined, use 'null' and explain why in the 'analysis_notes'.
    {
      "rms_values": {
        "voltage": {"L1": value, "L2": value, "L3": value, "units": "V"},
        "current": {"L1": value, "L2": value, "L3": value, "units": "A"},
        "line_to_line_voltage": {"L12": value, "L23": value, "L31": value, "units": "V"}
      },
      "frequency_hz": value,
      "phase_sequence": "positive | negative | unknown",
      "power_analysis": {
        "active_power": {"L1": value, "L2": value, "L3": value, "total": value, "units": "kW"},
        "reactive_power": {"L1": value, "L2": value, "L3": value, "total": value, "units": "kVAR"},
        "apparent_power": {"L1": value, "L2": value, "L3": value, "total": value, "units": "kVA"},
        "power_factor": {"L1": value, "L2": value, "L3": value, "total": value}
      },
      "quality_metrics": {
        "voltage_unbalance_percent": value,
        "current_unbalance_percent": value,
        "thd_voltage": {"L1": value, "L2": value, "L3": value, "units": "%"},
        "thd_current": {"L1": value, "L2": value, "L3": value, "units": "%"}
      },
      "analysis_notes": {
        "summary": "A brief, one-sentence summary of the system's condition.",
        "observations": ["Key finding 1.", "Key finding 2."],
        "recommendations": ["Actionable recommendation 1."]
      }
    }

    ## Data Sample (first 5 points for reference)
    ### Voltage (V)
    - L1: [${data.voltage_L1.slice(0, 5).join(', ')}]
    - L2: [${data.voltage_L2.slice(0, 5).join(', ')}]
    - L3: [${data.voltage_L3.slice(0, 5).join(', ')}]

    ### Current (A)
    - L1: [${data.current_L1.slice(0, 5).join(', ')}]
    - L2: [${data.current_L2.slice(0, 5).join(', ')}]
    - L3: [${data.current_L3.slice(0, 5).join(', ')}]
  `;
}