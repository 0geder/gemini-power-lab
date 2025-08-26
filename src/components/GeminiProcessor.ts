import { PowerSystemsData, AnalysisResults } from './PowerSystemsDashboard';

export class GeminiProcessor {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private createPrompt(data: PowerSystemsData, mode: string): string {
    const basePrompt = `You are an expert electrical engineer specializing in three-phase power systems analysis. 

Analyze the following three-phase electrical data and provide a detailed technical analysis in JSON format.

Data:
${JSON.stringify(data, null, 2)}

Analysis Mode: ${mode}

Please perform the following calculations and return ONLY a valid JSON response with this exact structure:

{
  "rms_values": {
    "voltage_L1": <calculated RMS value>,
    "voltage_L2": <calculated RMS value>,
    "voltage_L3": <calculated RMS value>,
    "current_L1": <calculated RMS value>,
    "current_L2": <calculated RMS value>,
    "current_L3": <calculated RMS value>
  },
  "peak_values": {
    "voltage_L1": <calculated peak value>,
    "voltage_L2": <calculated peak value>,
    "voltage_L3": <calculated peak value>,
    "current_L1": <calculated peak value>,
    "current_L2": <calculated peak value>,
    "current_L3": <calculated peak value>
  },
  "frequency_hz": <calculated fundamental frequency>,
  "phase_angles_degrees": {
    "voltage_L1_vs_current_L1": <phase angle>,
    "voltage_L2_vs_current_L2": <phase angle>,
    "voltage_L3_vs_current_L3": <phase angle>,
    "voltage_L1_vs_voltage_L2": <phase angle>,
    "voltage_L2_vs_voltage_L3": <phase angle>,
    "voltage_L3_vs_voltage_L1": <phase angle>,
    "current_L1_vs_current_L2": <phase angle>,
    "current_L2_vs_current_L3": <phase angle>,
    "current_L3_vs_current_L1": <phase angle>
  }
}

Important:
- Calculate RMS values using the standard formula: sqrt(sum(x²)/N)
- Find peak values as the maximum absolute value in each array
- Determine frequency using FFT or zero-crossing analysis
- Calculate phase angles using cross-correlation or Fourier analysis
- All phase angles should be in degrees (-180 to +180)
- Return ONLY the JSON, no additional text or explanation`;

    return basePrompt;
  }

  async analyze(data: PowerSystemsData, mode: string): Promise<AnalysisResults> {
    try {
      const prompt = this.createPrompt(data, mode);
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
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
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const content = result.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const analysisResults: AnalysisResults = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      this.validateResults(analysisResults);
      
      return analysisResults;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Analysis failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred during analysis');
    }
  }

  private validateResults(results: any): void {
    const requiredFields = [
      'rms_values', 'peak_values', 'frequency_hz', 'phase_angles_degrees'
    ];
    
    for (const field of requiredFields) {
      if (!(field in results)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const requiredPhases = ['voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3'];
    
    for (const phase of requiredPhases) {
      if (!(phase in results.rms_values)) {
        throw new Error(`Missing RMS value for: ${phase}`);
      }
      if (!(phase in results.peak_values)) {
        throw new Error(`Missing peak value for: ${phase}`);
      }
    }
  }
}