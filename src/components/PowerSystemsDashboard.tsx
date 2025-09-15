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
import uctLogo from "@/assets/uct_logo.jpg";

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
    console.log("Starting data processing...");
    console.log("Validation status:", validationStatus);
    
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
      console.log("Creating GeminiProcessor...");
      const processor = new GeminiProcessor();
      
      console.log("Parsing input data...");
      const parsedData: PowerData = JSON.parse(inputData);
      console.log("Parsed data:", parsedData);
      
      console.log("Processing with mode:", selectedMode);
      const result = await processor.processData(parsedData, selectedMode);
      console.log("Got result:", result);
      
      setResults(result);
      toast({
        title: "Processing Complete",
        description: "Power systems analysis completed successfully.",
      });
    } catch (error) {
      console.error("Processing error:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="relative">
              <img 
                src={uctLogo} 
                alt="University of Cape Town Logo" 
                className="h-20 w-20 object-contain animate-float hover-lift shadow-card rounded-full p-2 bg-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="relative p-4 rounded-xl bg-gradient-primary shadow-glow-primary animate-pulse-glow">
                <Zap className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                  Gemini Power Lab
                </h1>
                <div className="h-1 w-full bg-gradient-accent rounded-full"></div>
              </div>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Advanced AI-Powered Three-Phase Electrical Systems Analysis Platform
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-card border-border shadow-card hover-lift">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-accent">
                    <Settings className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Configuration</CardTitle>
                    <CardDescription>Select analysis processing mode</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Processing Mode</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {processingModes.map((mode) => (
                      <Button
                        key={mode.id}
                        variant={selectedMode === mode.id ? "default" : "secondary"}
                        className={`justify-start h-auto p-4 transition-all duration-300 ${
                          selectedMode === mode.id 
                            ? "bg-gradient-primary text-primary-foreground shadow-glow-primary" 
                            : "hover:bg-muted/80 hover:shadow-card"
                        }`}
                        onClick={() => setSelectedMode(mode.id)}
                      >
                        <div className="text-left w-full">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{mode.icon}</span>
                            <span className="font-medium">{mode.name}</span>
                          </div>
                          <div className="text-xs opacity-80 mt-1">
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
            <Card className="bg-gradient-card border-border shadow-card hover-lift">
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
                    className="bg-gradient-primary hover:bg-primary/90 shadow-glow-primary transition-all duration-300 hover:shadow-elegant hover:scale-105"
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
              <ResultsDisplay results={results} rawData={validationStatus === "valid" ? JSON.parse(inputData) : undefined} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}