import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Copy, Play, Settings, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeminiProcessor } from "./GeminiProcessor";
import { DataValidator } from "./DataValidator";
import { ExampleData } from "./ExampleData";
import { ResultsDisplay } from "./ResultsDisplay";

interface PowerData {
  voltage_L1: number[];
  voltage_L2: number[];
  voltage_L3: number[];
  current_L1: number[];
  current_L2: number[];
  current_L3: number[];
  sampling_rate_hz: number;
}

const processingModes = [
  {
    id: "waveform",
    name: "Waveform Analysis",
    description: "RMS, peak values, frequency detection",
    icon: "📊"
  },
  {
    id: "power_quality",
    name: "Power Quality",
    description: "Harmonics, THD, power factor calculations",
    icon: "⚡"
  },
  {
    id: "fault_detection",
    name: "Fault Detection",
    description: "Anomaly identification in three-phase systems",
    icon: "🔍"
  },
  {
    id: "load_analysis",
    name: "Load Analysis",
    description: "Active, reactive, and apparent power calculations",
    icon: "📈"
  }
];

export function PowerSystemsDashboard() {
  const [inputData, setInputData] = useState("");
  const [selectedMode, setSelectedMode] = useState("waveform");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [validationStatus, setValidationStatus] = useState<"valid" | "invalid" | "empty">("empty");
  const { toast } = useToast();

  const handleDataValidation = (isValid: boolean) => {
    setValidationStatus(isValid ? "valid" : "invalid");
  };

  const handleProcessData = async () => {
    if (validationStatus !== "valid") {
      toast({
        title: "Invalid Data",
        description: "Please provide valid JSON data before processing.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const processor = new GeminiProcessor();
      const parsedData: PowerData = JSON.parse(inputData);
      const result = await processor.processData(parsedData, selectedMode);
      setResults(result);
      toast({
        title: "Processing Complete",
        description: "Power systems analysis completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExampleData = (data: string) => {
    setInputData(data);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-primary">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gemini Power Lab
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            AI-Powered Three-Phase Electrical Systems Analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <CardTitle>Configuration</CardTitle>
                </div>
                <CardDescription>API settings and processing mode</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Processing Mode</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {processingModes.map((mode) => (
                      <Button
                        key={mode.id}
                        variant={selectedMode === mode.id ? "default" : "secondary"}
                        className="justify-start h-auto p-3"
                        onClick={() => setSelectedMode(mode.id)}
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span>{mode.icon}</span>
                            <span className="font-medium">{mode.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {mode.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <ExampleData onLoadExample={loadExampleData} />
          </div>

          {/* Data Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Three-Phase Data Input</CardTitle>
                    <Badge 
                      variant={validationStatus === "valid" ? "default" : validationStatus === "invalid" ? "destructive" : "secondary"}
                      className="ml-2"
                    >
                      {validationStatus === "valid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {validationStatus === "invalid" && <AlertCircle className="h-3 w-3 mr-1" />}
                      {validationStatus === "valid" ? "Valid" : validationStatus === "invalid" ? "Invalid" : "No Data"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleProcessData}
                    disabled={isProcessing || validationStatus !== "valid"}
                    className="shadow-glow-primary"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Analyze Data
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Input your three-phase electrical data in JSON format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder={`{
  "voltage_L1": [120.5, 121.0, 119.8, ...],
  "voltage_L2": [120.2, 120.8, 119.9, ...],
  "voltage_L3": [120.0, 120.3, 120.1, ...],
  "current_L1": [15.2, 15.1, 15.3, ...],
  "current_L2": [15.0, 15.2, 15.1, ...],
  "current_L3": [15.1, 15.0, 15.2, ...],
  "sampling_rate_hz": 1000
}`}
                    className="h-64 font-mono text-sm"
                  />
                  <DataValidator data={inputData} onValidation={handleDataValidation} />
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            {results && (
              <ResultsDisplay results={results} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}