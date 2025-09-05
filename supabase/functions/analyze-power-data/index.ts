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
  // Calculate some basic statistics to help the AI
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

  return `
# Three-Phase Power System Analysis

## System Parameters
- Sampling Rate: ${data.sampling_rate_hz} Hz
- Samples per cycle: ${Math.round(data.sampling_rate_hz / 50)} (assuming 50Hz system)
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
Perform a detailed three-phase power system analysis with the following requirements:

### Calculations
1. **RMS Values**: Calculate using the complete dataset
2. **Peak Values**: Identify absolute maximum values
3. **Frequency Analysis**: Use zero-crossing or FFT method
4. **Phase Angles**: Calculate between all voltage and current pairs
5. **Power Calculations**: Include active, reactive, and apparent power
6. **Power Factor**: Calculate for each phase and total
7. **Harmonic Analysis**: If possible, identify any significant harmonics

### Expected Output Format
{
  "rms_values": {
    "voltage": {"L1": 230.5, "L2": 229.8, "L3": 231.2, "units": "V"},
    "current": {"L1": 10.2, "L2": 10.1, "L3": 10.3, "units": "A"},
    "line_to_line_voltage": {"L12": 398.4, "L23": 399.1, "L31": 398.8, "units": "V"}
  },
  "frequency_hz": 50.02,
  "phase_sequence": "positive",
  "phase_angles_degrees": {
    "voltage": {"L1_L2": 120.1, "L2_L3": 119.9, "L3_L1": 120.0},
    "current": {"L1_L2": 120.3, "L2_L3": 119.7, "L3_L1": 120.0},
    "power_factor": {"L1": 0.98, "L2": 0.97, "L3": 0.99}
  },
  "power_analysis": {
    "active_power": {"L1": 2.15, "L2": 2.12, "L3": 2.18, "total": 6.45, "units": "kW"},
    "reactive_power": {"L1": 0.43, "L2": 0.45, "L3": 0.41, "total": 1.29, "units": "kVAR"},
    "apparent_power": {"L1": 2.19, "L2": 2.16, "L3": 2.22, "total": 6.57, "units": "kVA"},
    "power_factor": {"L1": 0.98, "L2": 0.98, "L3": 0.98, "total": 0.98}
  },
  "quality_metrics": {
    "voltage_unbalance": 0.8,
    "current_unbalance": 1.2,
    "thd_voltage": {"L1": 1.2, "L2": 1.3, "L3": 1.1, "units": "%"},
    "thd_current": {"L1": 3.5, "L2": 3.7, "L3": 3.3, "units": "%"}
  },
  "analysis_notes": {
    "data_quality": "Good quality data with minimal noise",
    "observations": [
      "Slight voltage unbalance detected (0.8%)",
      "Current THD is within acceptable limits (<5%)",
      "Power factor is close to unity"
    ],
    "recommendations": [
      "Monitor voltage unbalance over time",
      "Consider power factor correction if loads increase"
    ]
  },
  "calculation_methods": {
    "rms": "True RMS calculation using complete dataset",
    "frequency": "Calculated using zero-crossing detection with interpolation",
    "phase_angles": "Calculated using cross-correlation method",
    "power": "Calculated using P = Vrms * Irms * cos(θ), Q = Vrms * Irms * sin(θ)",
    "harmonics": "FFT analysis with Hanning window"
  },
  "confidence_scores": {
    "overall_quality": 0.92,
    "voltage_analysis": 0.95,
    "current_analysis": 0.93,
    "power_analysis": 0.94
  }
}

## Important Notes
1. All values must be calculated with appropriate precision (3 decimal places for voltages and currents)
2. Include units for all measurements
3. Flag any potential data quality issues
4. Provide confidence scores for key measurements
5. If any calculations are not possible, explain why and provide best estimates
6. Include relevant technical observations and recommendations

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