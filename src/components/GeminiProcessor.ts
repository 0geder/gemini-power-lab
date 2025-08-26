interface PowerData {
  voltage_L1: number[];
  voltage_L2: number[];
  voltage_L3: number[];
  current_L1: number[];
  current_L2: number[];
  current_L3: number[];
  sampling_rate_hz: number;
}

export class GeminiProcessor {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processData(data: PowerData, mode: string): Promise<any> {
    const prompt = this.generatePrompt(data, mode);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.apiKey, {
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
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = result.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      throw new Error('Failed to parse JSON from API response');
    }
  }

  private generatePrompt(data: PowerData, mode: string): string {
    const basePrompt = `
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

    return basePrompt;
  }
}