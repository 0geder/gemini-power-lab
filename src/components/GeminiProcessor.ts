import { supabase } from "@/integrations/supabase/client";

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
  async processData(data: PowerData, mode: string): Promise<any> {
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-power-data', {
        body: { data, mode }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!result) {
        throw new Error('No result received from analysis service');
      }

      const normalized = this.normalizeResult(result);
      return normalized;
    } catch (error) {
      console.error('GeminiProcessor error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process data');
    }
  }

  private normalizeResult(result: any) {
    const out: any = { ...result };

    // Normalize RMS values to flat keys expected by UI: voltage_L1, current_L1, etc.
    const rv = result?.rms_values || {};
    if (rv.voltage && typeof rv.voltage === 'object') {
      out.rms_values = out.rms_values || {};
      out.rms_values.voltage_L1 = rv.voltage.L1 ?? rv.voltage.l1 ?? rv.voltage['phase_1'] ?? null;
      out.rms_values.voltage_L2 = rv.voltage.L2 ?? rv.voltage.l2 ?? rv.voltage['phase_2'] ?? null;
      out.rms_values.voltage_L3 = rv.voltage.L3 ?? rv.voltage.l3 ?? rv.voltage['phase_3'] ?? null;
    }
    if (rv.current && typeof rv.current === 'object') {
      out.rms_values = out.rms_values || {};
      out.rms_values.current_L1 = rv.current.L1 ?? rv.current.l1 ?? rv.current['phase_1'] ?? null;
      out.rms_values.current_L2 = rv.current.L2 ?? rv.current.l2 ?? rv.current['phase_2'] ?? null;
      out.rms_values.current_L3 = rv.current.L3 ?? rv.current.l3 ?? rv.current['phase_3'] ?? null;
    }

    // Map power_analysis to power_calculations expected by UI
    if (result.power_analysis) {
      const pa = result.power_analysis;
      out.power_calculations = {
        active_power_kw: pa.active_power?.total ?? null,
        reactive_power_kvar: pa.reactive_power?.total ?? null,
        apparent_power_kva: pa.apparent_power?.total ?? null,
        power_factor: pa.power_factor?.total ?? null,
      };
    }

    // Normalize phase angle keys if provided in different shapes
    if (result.phase_angles_degrees) {
      const pad = result.phase_angles_degrees;
      out.phase_angles_degrees = {
        voltage_L1_vs_current_L1: pad.voltage_L1_vs_current_L1 ?? pad.voltage_current?.L1 ?? null,
        voltage_L2_vs_current_L2: pad.voltage_L2_vs_current_L2 ?? pad.voltage_current?.L2 ?? null,
        voltage_L3_vs_current_L3: pad.voltage_L3_vs_current_L3 ?? pad.voltage_current?.L3 ?? null,
        voltage_L1_vs_voltage_L2: pad.voltage_L1_vs_voltage_L2 ?? pad.voltage?.L1_L2 ?? null,
        voltage_L2_vs_voltage_L3: pad.voltage_L2_vs_voltage_L3 ?? pad.voltage?.L2_L3 ?? null,
        voltage_L3_vs_voltage_L1: pad.voltage_L3_vs_voltage_L1 ?? pad.voltage?.L3_L1 ?? null,
      };
    }

    // Provide a flat analysis summary for the Overview tab
    if (result.analysis_notes?.summary && !out.analysis_summary) {
      out.analysis_summary = result.analysis_notes.summary;
    }

    return out;
  }
}
