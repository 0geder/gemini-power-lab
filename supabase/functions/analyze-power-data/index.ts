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

        // Deterministic baseline calculations to fill any missing/null values
        const baseline = computeBaselineMetrics(data);
        const merged = mergeAnalysis(analysisResult, baseline);

        return new Response(JSON.stringify(merged), {
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

// --- Deterministic baseline metrics to avoid nulls ---
function computeBaselineMetrics(data: PowerData) {
  const fs = data.sampling_rate_hz || 1000;
  const dur = data.voltage_L1.length / fs;

  const rms = (arr: number[]) => Math.sqrt(arr.reduce((s, x) => s + x * x, 0) / arr.length);
  const peak = (arr: number[]) => arr.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  const mean = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;
  const demean = (arr: number[]) => {
    const m = mean(arr);
    return arr.map((x) => x - m);
  };

  const freqFromZeroCross = (arr: number[]) => {
    const x = demean(arr);
    let crossings: number[] = [];
    for (let i = 1; i < x.length; i++) {
      if (x[i - 1] <= 0 && x[i] > 0) crossings.push(i);
    }
    if (crossings.length < 2) return NaN;
    const periods: number[] = [];
    for (let i = 1; i < crossings.length; i++) periods.push(crossings[i] - crossings[i - 1]);
    const avgPeriod = periods.reduce((s, p) => s + p, 0) / periods.length;
    return fs / avgPeriod;
  };

  const correlationLag = (a: number[], b: number[], maxLag: number) => {
    let bestLag = 0;
    let bestVal = -Infinity;
    const ax = demean(a);
    const bx = demean(b);
    const denom = Math.sqrt(ax.reduce((s, v) => s + v * v, 0) * bx.reduce((s, v) => s + v * v, 0));
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < ax.length; i++) {
        const j = i + lag;
        if (j >= 0 && j < bx.length) sum += ax[i] * bx[j];
      }
      const corr = sum / denom;
      if (corr > bestVal) {
        bestVal = corr;
        bestLag = lag;
      }
    }
    return bestLag;
  };

  const f0 = freqFromZeroCross(data.voltage_L1);
  const samplesPerPeriod = isFinite(f0) && f0 > 0 ? fs / f0 : fs / 50;
  const lagToDeg = (lag: number) => (lag / samplesPerPeriod) * 360;
  const normDeg = (deg: number) => {
    let d = ((deg + 180) % 360 + 360) % 360 - 180;
    return d;
  };

  // RMS and peaks
  const Vrms = {
    L1: rms(data.voltage_L1),
    L2: rms(data.voltage_L2),
    L3: rms(data.voltage_L3),
    units: 'V'
  } as const;

  const Irms = {
    L1: rms(data.current_L1),
    L2: rms(data.current_L2),
    L3: rms(data.current_L3),
    units: 'A'
  } as const;

  const Vpk = {
    L1: peak(data.voltage_L1),
    L2: peak(data.voltage_L2),
    L3: peak(data.voltage_L3)
  };
  const Ipk = {
    L1: peak(data.current_L1),
    L2: peak(data.current_L2),
    L3: peak(data.current_L3)
  };

  // Line-to-line voltages
  const v12 = data.voltage_L1.map((v, i) => v - data.voltage_L2[i]);
  const v23 = data.voltage_L2.map((v, i) => v - data.voltage_L3[i]);
  const v31 = data.voltage_L3.map((v, i) => v - data.voltage_L1[i]);

  const VLL = { L12: rms(v12), L23: rms(v23), L31: rms(v31), units: 'V' } as const;

  // Phase angles
  const maxLag = Math.round(samplesPerPeriod);
  const phi_v12 = normDeg(lagToDeg(correlationLag(data.voltage_L1, data.voltage_L2, maxLag)));
  const phi_v23 = normDeg(lagToDeg(correlationLag(data.voltage_L2, data.voltage_L3, maxLag)));
  const phi_v31 = normDeg(lagToDeg(correlationLag(data.voltage_L3, data.voltage_L1, maxLag)));

  const phi_L1 = normDeg(lagToDeg(correlationLag(data.voltage_L1, data.current_L1, maxLag)));
  const phi_L2 = normDeg(lagToDeg(correlationLag(data.voltage_L2, data.current_L2, maxLag)));
  const phi_L3 = normDeg(lagToDeg(correlationLag(data.voltage_L3, data.current_L3, maxLag)));

  // Power per phase
  const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;
  const P1 = avg(data.voltage_L1.map((v, i) => v * data.current_L1[i])) / 1000; // kW
  const P2 = avg(data.voltage_L2.map((v, i) => v * data.current_L2[i])) / 1000;
  const P3 = avg(data.voltage_L3.map((v, i) => v * data.current_L3[i])) / 1000;

  const S1 = (Vrms.L1 * Irms.L1) / 1000; // kVA
  const S2 = (Vrms.L2 * Irms.L2) / 1000;
  const S3 = (Vrms.L3 * Irms.L3) / 1000;

  const PF1 = S1 > 0 ? Math.min(1, Math.max(-1, P1 / S1)) : null;
  const PF2 = S2 > 0 ? Math.min(1, Math.max(-1, P2 / S2)) : null;
  const PF3 = S3 > 0 ? Math.min(1, Math.max(-1, P3 / S3)) : null;

  const Q1 = PF1 !== null ? Math.sqrt(Math.max(0, S1 * S1 - P1 * P1)) : null; // kVAR
  const Q2 = PF2 !== null ? Math.sqrt(Math.max(0, S2 * S2 - P2 * P2)) : null;
  const Q3 = PF3 !== null ? Math.sqrt(Math.max(0, S3 * S3 - P3 * P3)) : null;

  const totalP = [P1, P2, P3].reduce((s, v) => s + (v || 0), 0);
  const totalS = [S1, S2, S3].reduce((s, v) => s + (v || 0), 0);
  const totalQ = [Q1, Q2, Q3].reduce((s, v) => s + (v || 0), 0);
  const totalPF = totalS > 0 ? Math.min(1, Math.max(0, totalP / totalS)) : null;

  // Unbalance
  const unbalance = (a: number, b: number, c: number) => {
    const avg = (a + b + c) / 3;
    if (avg === 0) return 0;
    const maxDev = Math.max(Math.abs(a - avg), Math.abs(b - avg), Math.abs(c - avg));
    return (maxDev / avg) * 100;
  };

  // Approx THD using a few harmonics via Goertzel
  const goertzel = (arr: number[], targetHz: number) => {
    const N = arr.length;
    const w = (2 * Math.PI * targetHz) / fs;
    let s0 = 0, s1 = 0, s2 = 0;
    const coeff = 2 * Math.cos(w);
    for (let n = 0; n < N; n++) {
      s0 = arr[n] + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const real = s1 - s2 * Math.cos(w);
    const imag = s2 * Math.sin(w);
    return Math.sqrt(real * real + imag * imag) / N;
  };

  const thdPercent = (arr: number[]) => {
    const x = demean(arr);
    const f = isFinite(f0) && f0 > 0 ? f0 : 50;
    const fund = goertzel(x, f);
    if (fund === 0) return null;
    let sumSq = 0;
    for (let k = 2; k <= 10; k++) {
      const mag = goertzel(x, f * k);
      sumSq += mag * mag;
    }
    return Math.sqrt(sumSq) / Math.max(fund, 1e-9) * 100;
  };

  const thdV = { L1: thdPercent(data.voltage_L1), L2: thdPercent(data.voltage_L2), L3: thdPercent(data.voltage_L3), units: '%' };
  const thdI = { L1: thdPercent(data.current_L1), L2: thdPercent(data.current_L2), L3: thdPercent(data.current_L3), units: '%' };

  const baseline = {
    rms_values: {
      voltage: { L1: Vrms.L1, L2: Vrms.L2, L3: Vrms.L3, units: 'V' },
      current: { L1: Irms.L1, L2: Irms.L2, L3: Irms.L3, units: 'A' },
      line_to_line_voltage: VLL,
    },
    peak_values: {
      voltage_L1: Vpk.L1, voltage_L2: Vpk.L2, voltage_L3: Vpk.L3,
      current_L1: Ipk.L1, current_L2: Ipk.L2, current_L3: Ipk.L3,
    },
    frequency_hz: f0,
    phase_angles_degrees: {
      voltage_L1_vs_current_L1: phi_L1,
      voltage_L2_vs_current_L2: phi_L2,
      voltage_L3_vs_current_L3: phi_L3,
      voltage_L1_vs_voltage_L2: phi_v12,
      voltage_L2_vs_voltage_L3: phi_v23,
      voltage_L3_vs_voltage_L1: phi_v31,
    },
    power_analysis: {
      active_power: { L1: P1, L2: P2, L3: P3, total: totalP, units: 'kW' },
      reactive_power: { L1: Q1, L2: Q2, L3: Q3, total: totalQ, units: 'kVAR' },
      apparent_power: { L1: S1, L2: S2, L3: S3, total: totalS, units: 'kVA' },
      power_factor: { L1: PF1, L2: PF2, L3: PF3, total: totalPF },
    },
    quality_metrics: {
      voltage_unbalance_percent: unbalance(Vrms.L1, Vrms.L2, Vrms.L3),
      current_unbalance_percent: unbalance(Irms.L1, Irms.L2, Irms.L3),
      thd_voltage: thdV,
      thd_current: thdI,
    },
  };

  // Phase sequence (rough): if V1 leads V2 and V2 leads V3 consistently -> positive
  const seq12 = phi_v12;
  const seq23 = phi_v23;
  const positive = seq12 > -180 && seq12 < 0 && seq23 > -180 && seq23 < 0;
  (baseline as any).phase_sequence = positive ? 'positive' : 'unknown';

  return baseline;
}

function mergeAnalysis(ai: any, base: any) {
  const out = JSON.parse(JSON.stringify(base));
  const setIfMissingOrNull = (path: string[], val: any) => {
    let node: any = out;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      node[k] = node[k] ?? {};
      node = node[k];
    }
    const last = path[path.length - 1];
    const current = node[last];
    if (current === undefined || current === null || (typeof current === 'number' && isNaN(current))) {
      node[last] = val;
    }
  };

  // Shallow merge first
  Object.assign(out, ai);

  // Carefully fill in known fields if AI left them null
  if (ai?.rms_values?.voltage) {
    setIfMissingOrNull(['rms_values','voltage','L1'], ai.rms_values.voltage.L1);
    setIfMissingOrNull(['rms_values','voltage','L2'], ai.rms_values.voltage.L2);
    setIfMissingOrNull(['rms_values','voltage','L3'], ai.rms_values.voltage.L3);
  }
  if (ai?.rms_values?.current) {
    setIfMissingOrNull(['rms_values','current','L1'], ai.rms_values.current.L1);
    setIfMissingOrNull(['rms_values','current','L2'], ai.rms_values.current.L2);
    setIfMissingOrNull(['rms_values','current','L3'], ai.rms_values.current.L3);
  }
  if (ai?.rms_values?.line_to_line_voltage) {
    setIfMissingOrNull(['rms_values','line_to_line_voltage','L12'], ai.rms_values.line_to_line_voltage.L12);
    setIfMissingOrNull(['rms_values','line_to_line_voltage','L23'], ai.rms_values.line_to_line_voltage.L23);
    setIfMissingOrNull(['rms_values','line_to_line_voltage','L31'], ai.rms_values.line_to_line_voltage.L31);
  }

  setIfMissingOrNull(['frequency_hz'], ai.frequency_hz);
  setIfMissingOrNull(['phase_sequence'], ai.phase_sequence);

  if (ai?.phase_angles_degrees) {
    const p = ai.phase_angles_degrees;
    setIfMissingOrNull(['phase_angles_degrees','voltage_L1_vs_current_L1'], p.voltage_L1_vs_current_L1 ?? p.voltage?.L1_L1 ?? p.voltage_current?.L1);
    setIfMissingOrNull(['phase_angles_degrees','voltage_L2_vs_current_L2'], p.voltage_L2_vs_current_L2 ?? p.voltage?.L2_L2 ?? p.voltage_current?.L2);
    setIfMissingOrNull(['phase_angles_degrees','voltage_L3_vs_current_L3'], p.voltage_L3_vs_current_L3 ?? p.voltage?.L3_L3 ?? p.voltage_current?.L3);
    setIfMissingOrNull(['phase_angles_degrees','voltage_L1_vs_voltage_L2'], p.voltage_L1_vs_voltage_L2 ?? p.voltage?.L1_L2);
    setIfMissingOrNull(['phase_angles_degrees','voltage_L2_vs_voltage_L3'], p.voltage_L2_vs_voltage_L3 ?? p.voltage?.L2_L3);
    setIfMissingOrNull(['phase_angles_degrees','voltage_L3_vs_voltage_L1'], p.voltage_L3_vs_voltage_L1 ?? p.voltage?.L3_L1);
  }

  if (ai?.power_analysis) {
    const pa = ai.power_analysis;
    const fields = ['L1','L2','L3','total'] as const;
    for (const f of fields) {
      setIfMissingOrNull(['power_analysis','active_power',f as any], pa.active_power?.[f]);
      setIfMissingOrNull(['power_analysis','reactive_power',f as any], pa.reactive_power?.[f]);
      setIfMissingOrNull(['power_analysis','apparent_power',f as any], pa.apparent_power?.[f]);
      setIfMissingOrNull(['power_analysis','power_factor',f as any], pa.power_factor?.[f]);
    }
  }

  if (ai?.quality_metrics) {
    setIfMissingOrNull(['quality_metrics','voltage_unbalance_percent'], ai.quality_metrics.voltage_unbalance_percent);
    setIfMissingOrNull(['quality_metrics','current_unbalance_percent'], ai.quality_metrics.current_unbalance_percent);
    if (ai.quality_metrics.thd_voltage) {
      const tv = ai.quality_metrics.thd_voltage;
      setIfMissingOrNull(['quality_metrics','thd_voltage','L1'], tv.L1);
      setIfMissingOrNull(['quality_metrics','thd_voltage','L2'], tv.L2);
      setIfMissingOrNull(['quality_metrics','thd_voltage','L3'], tv.L3);
    }
    if (ai.quality_metrics.thd_current) {
      const ti = ai.quality_metrics.thd_current;
      setIfMissingOrNull(['quality_metrics','thd_current','L1'], ti.L1);
      setIfMissingOrNull(['quality_metrics','thd_current','L2'], ti.L2);
      setIfMissingOrNull(['quality_metrics','thd_current','L3'], ti.L3);
    }
  }

  if (ai?.analysis_notes) out.analysis_notes = ai.analysis_notes;

  return out;
}
