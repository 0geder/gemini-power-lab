import { useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DataValidatorProps {
  data: string;
  onValidation: (isValid: boolean) => void;
}

interface PowerData {
  voltage_L1: number[];
  voltage_L2: number[];
  voltage_L3: number[];
  current_L1: number[];
  current_L2: number[];
  current_L3: number[];
  sampling_rate_hz: number;
}

export function DataValidator({ data, onValidation }: DataValidatorProps) {
  const validateData = (jsonString: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!jsonString.trim()) {
      return { isValid: false, errors: ["No data provided"] };
    }

    try {
      const parsed: PowerData = JSON.parse(jsonString);

      // Check required fields
      const requiredFields = ['voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3', 'sampling_rate_hz'];
      for (const field of requiredFields) {
        if (!(field in parsed)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Check array fields
      const arrayFields = ['voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3'];
      for (const field of arrayFields) {
        if (field in parsed) {
          if (!Array.isArray(parsed[field as keyof PowerData])) {
            errors.push(`${field} must be an array`);
          } else {
            const arr = parsed[field as keyof PowerData] as number[];
            if (arr.length === 0) {
              errors.push(`${field} cannot be empty`);
            }
            if (!arr.every(val => typeof val === 'number' && !isNaN(val))) {
              errors.push(`${field} must contain only valid numbers`);
            }
          }
        }
      }

      // Check sampling rate
      if ('sampling_rate_hz' in parsed) {
        if (typeof parsed.sampling_rate_hz !== 'number' || isNaN(parsed.sampling_rate_hz) || parsed.sampling_rate_hz <= 0) {
          errors.push("sampling_rate_hz must be a positive number");
        }
      }

      // Check array length consistency
      if (errors.length === 0) {
        const lengths = arrayFields.map(field => (parsed[field as keyof PowerData] as number[]).length);
        const firstLength = lengths[0];
        if (!lengths.every(len => len === firstLength)) {
          errors.push("All voltage and current arrays must have the same length");
        }
      }

    } catch (parseError) {
      errors.push("Invalid JSON format");
    }

    return { isValid: errors.length === 0, errors };
  };

  useEffect(() => {
    const { isValid } = validateData(data);
    onValidation(isValid);
  }, [data, onValidation]);

  const { isValid, errors } = validateData(data);

  if (!data.trim()) {
    return null;
  }

  return (
    <Alert variant={isValid ? "default" : "destructive"} className="bg-card border-border">
      {isValid ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertDescription>
        {isValid ? (
          "Data format is valid and ready for processing"
        ) : (
          <div>
            <div className="font-medium mb-2">Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}