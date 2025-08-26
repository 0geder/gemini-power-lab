import { PowerSystemsData } from './PowerSystemsDashboard';

export class DataValidator {
  static validate(jsonString: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!jsonString.trim()) {
      errors.push('Input data is empty');
      return { isValid: false, errors };
    }

    try {
      const data = JSON.parse(jsonString);
      
      // Check required fields
      const requiredFields = ['voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3', 'sampling_rate_hz'];
      
      for (const field of requiredFields) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      if (errors.length > 0) {
        return { isValid: false, errors };
      }

      // Validate data types and values
      const phases = ['voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3'];
      
      for (const phase of phases) {
        if (!Array.isArray(data[phase])) {
          errors.push(`${phase} must be an array`);
          continue;
        }
        
        if (data[phase].length === 0) {
          errors.push(`${phase} array cannot be empty`);
          continue;
        }
        
        // Check if all elements are numbers
        const hasNonNumbers = data[phase].some((value: any) => typeof value !== 'number' || !isFinite(value));
        if (hasNonNumbers) {
          errors.push(`${phase} must contain only finite numbers`);
        }
      }

      // Validate sampling rate
      if (typeof data.sampling_rate_hz !== 'number' || !isFinite(data.sampling_rate_hz) || data.sampling_rate_hz <= 0) {
        errors.push('sampling_rate_hz must be a positive number');
      }

      // Check array length consistency
      if (errors.length === 0) {
        const firstLength = data[phases[0]].length;
        for (const phase of phases) {
          if (data[phase].length !== firstLength) {
            errors.push('All voltage and current arrays must have the same length');
            break;
          }
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (parseError) {
      errors.push('Invalid JSON format');
      return { isValid: false, errors };
    }
  }

  static createExample(): PowerSystemsData {
    const samplingRate = 1000; // 1 kHz
    const frequency = 50; // 50 Hz
    const samples = 100;
    const time = Array.from({ length: samples }, (_, i) => i / samplingRate);
    
    // Generate realistic three-phase sinusoidal waveforms
    const voltage_L1 = time.map(t => 230 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * t));
    const voltage_L2 = time.map(t => 230 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * t - 2 * Math.PI / 3));
    const voltage_L3 = time.map(t => 230 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * t + 2 * Math.PI / 3));
    
    const current_L1 = time.map(t => 10 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * t - Math.PI / 6));
    const current_L2 = time.map(t => 10 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * t - 2 * Math.PI / 3 - Math.PI / 6));
    const current_L3 = time.map(t => 10 * Math.sqrt(2) * Math.sin(2 * Math.PI * frequency * t + 2 * Math.PI / 3 - Math.PI / 6));

    return {
      voltage_L1,
      voltage_L2,
      voltage_L3,
      current_L1,
      current_L2,
      current_L3,
      sampling_rate_hz: samplingRate
    };
  }
}