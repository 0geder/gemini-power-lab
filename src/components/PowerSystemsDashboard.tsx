import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Zap, Activity, BarChart3, Settings } from 'lucide-react';
import { GeminiProcessor } from './GeminiProcessor';
import { DataValidator } from './DataValidator';
import { ExampleData } from './ExampleData';
import { ResultsDisplay } from './ResultsDisplay';

export interface PowerSystemsData {
  voltage_L1: number[];
  voltage_L2: number[];
  voltage_L3: number[];
  current_L1: number[];
  current_L2: number[];
  current_L3: number[];
  sampling_rate_hz: number;
}

export interface AnalysisResults {
  rms_values: {
    voltage_L1: number;
    voltage_L2: number;
    voltage_L3: number;
    current_L1: number;
    current_L2: number;
    current_L3: number;
  };
  peak_values: {
    voltage_L1: number;
    voltage_L2: number;
    voltage_L3: number;
    current_L1: number;
    current_L2: number;
    current_L3: number;
  };
  frequency_hz: number;
  phase_angles_degrees: {
    voltage_L1_vs_current_L1: number;
    voltage_L2_vs_current_L2: number;
    voltage_L3_vs_current_L3: number;
    voltage_L1_vs_voltage_L2: number;
    voltage_L2_vs_voltage_L3: number;
    voltage_L3_vs_voltage_L1: number;
    current_L1_vs_current_L2: number;
    current_L2_vs_current_L3: number;
    current_L3_vs_current_L1: number;
  };
}

const processingModes = [
  { id: 'waveform', label: 'Waveform Analysis', icon: Activity, description: 'RMS, peak values, frequency detection' },
  { id: 'power_quality', label: 'Power Quality', icon: BarChart3, description: 'Harmonics, THD, power factor calculations' },
  { id: 'fault_detection', label: 'Fault Detection', icon: AlertCircle, description: 'Anomaly identification in three-phase systems' },
  { id: 'load_analysis', label: 'Load Analysis', icon: Settings, description: 'Active, reactive, and apparent power calculations' }
];

export const PowerSystemsDashboard = () => {
  const [apiKey, setApiKey] = useState('');
  const [inputData, setInputData] = useState('');
  const [processingMode, setProcessingMode] = useState('waveform');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] }>({ isValid: false, errors: [] });

  const handleDataValidation = (data: string) => {
    setInputData(data);
    const validation = DataValidator.validate(data);
    setValidationResult(validation);
    setError(null);
  };

  const handleProcess = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    if (!validationResult.isValid) {
      setError('Please fix validation errors before processing');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parsedData: PowerSystemsData = JSON.parse(inputData);
      const processor = new GeminiProcessor(apiKey);
      const analysisResults = await processor.analyze(parsedData, processingMode);
      setResults(analysisResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExampleLoad = (exampleData: PowerSystemsData) => {
    setInputData(JSON.stringify(exampleData, null, 2));
    handleDataValidation(JSON.stringify(exampleData, null, 2));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gemini AI Power Systems Dashboard</h1>
              <p className="text-muted-foreground">Advanced three-phase electrical analysis powered by Google's Gemini AI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>Enter your Google Gemini API key to enable processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="api-key">Gemini API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Processing Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Mode</CardTitle>
            <CardDescription>Select the type of electrical analysis to perform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {processingModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = processingMode === mode.id;
                return (
                  <Button
                    key={mode.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-auto p-4 flex flex-col items-center gap-2 ${isSelected ? 'animate-pulse-glow' : ''}`}
                    onClick={() => setProcessingMode(mode.id)}
                  >
                    <Icon className="w-6 h-6" />
                    <div className="text-center">
                      <div className="font-semibold">{mode.label}</div>
                      <div className="text-xs opacity-80">{mode.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Input */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Three-Phase Data Input</CardTitle>
                <CardDescription>
                  Enter your electrical waveform data in JSON format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="data-input">JSON Data</Label>
                  <Textarea
                    id="data-input"
                    placeholder="Paste your three-phase electrical data here..."
                    value={inputData}
                    onChange={(e) => handleDataValidation(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {/* Validation Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={validationResult.isValid ? "default" : "destructive"}>
                    {validationResult.isValid ? "Valid Format" : "Invalid Format"}
                  </Badge>
                  {validationResult.errors.length > 0 && (
                    <div className="text-sm text-destructive">
                      {validationResult.errors.join(", ")}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={!validationResult.isValid || !apiKey.trim() || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? "Processing..." : "Analyze Data"}
                </Button>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Example Data */}
            <ExampleData onLoadExample={handleExampleLoad} />
          </div>

          {/* Results Display */}
          <div>
            <ResultsDisplay results={results} isProcessing={isProcessing} />
          </div>
        </div>
      </div>
    </div>
  );
};