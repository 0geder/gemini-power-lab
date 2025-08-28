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

      return result;
    } catch (error) {
      console.error('GeminiProcessor error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process data');
    }
  }

}