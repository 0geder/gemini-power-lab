import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, BarChart3, Zap, Activity, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface ResultsDisplayProps {
  results: any;
  rawData?: any;
}

export function ResultsDisplay({ results, rawData }: ResultsDisplayProps) {
  const { toast } = useToast();

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({
      title: "Copied to Clipboard",
      description: "Results have been copied to your clipboard.",
    });
  };

  const formatValue = (value: number, unit: string = "", decimals: number = 2) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return `${value.toFixed(decimals)} ${unit}`.trim();
  };
  // Prepare waveform data for charts
  const buildWaveformData = (raw: any) => {
    if (!raw || !raw.voltage_L1 || !raw.sampling_rate_hz) return null;
    const fs = raw.sampling_rate_hz;
    const n = Math.min(
      raw.voltage_L1.length,
      raw.voltage_L2?.length || 0,
      raw.voltage_L3?.length || 0,
      raw.current_L1?.length || 0,
      raw.current_L2?.length || 0,
      raw.current_L3?.length || 0
    );
    const maxPoints = 1000;
    const step = Math.max(1, Math.floor(n / maxPoints));
    const data = [] as any[];
    for (let i = 0; i < n; i += step) {
      data.push({
        i,
        t: i / fs,
        v1: raw.voltage_L1[i],
        v2: raw.voltage_L2[i],
        v3: raw.voltage_L3[i],
        i1: raw.current_L1[i],
        i2: raw.current_L2[i],
        i3: raw.current_L3[i],
      });
    }
    return data;
  };

  const waveformData = buildWaveformData(rawData);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Analysis Results</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(results)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Results
          </Button>
        </div>
        <CardDescription>
          Comprehensive power systems analysis output
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rms">RMS Values</TabsTrigger>
            <TabsTrigger value="phase">Phase Analysis</TabsTrigger>
            <TabsTrigger value="power">Power Metrics</TabsTrigger>
            <TabsTrigger value="waveforms">Waveforms</TabsTrigger>
          </TabsList>

          {waveformData ? (
            <TabsContent value="waveforms" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-6">
                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Voltage Waveforms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        v1: { label: 'VL1', color: 'hsl(var(--primary))' },
                        v2: { label: 'VL2', color: 'hsl(var(--secondary))' },
                        v3: { label: 'VL3', color: 'hsl(var(--muted-foreground))' },
                      }}
                      className="h-64"
                    >
                      <LineChart data={waveformData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" tickFormatter={(v) => `${v.toFixed(3)}s`} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="v1" stroke="hsl(var(--primary))" dot={false} name="VL1" />
                        <Line type="monotone" dataKey="v2" stroke="hsl(var(--secondary))" dot={false} name="VL2" />
                        <Line type="monotone" dataKey="v3" stroke="hsl(var(--muted-foreground))" dot={false} name="VL3" />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Current Waveforms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        i1: { label: 'IL1', color: 'hsl(var(--primary))' },
                        i2: { label: 'IL2', color: 'hsl(var(--secondary))' },
                        i3: { label: 'IL3', color: 'hsl(var(--muted-foreground))' },
                      }}
                      className="h-64"
                    >
                      <LineChart data={waveformData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" tickFormatter={(v) => `${v.toFixed(3)}s`} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="i1" stroke="hsl(var(--primary))" dot={false} name="IL1" />
                        <Line type="monotone" dataKey="i2" stroke="hsl(var(--secondary))" dot={false} name="IL2" />
                        <Line type="monotone" dataKey="i3" stroke="hsl(var(--muted-foreground))" dot={false} name="IL3" />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-secondary/50 border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">System Frequency</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatValue(results.frequency_hz, 'Hz')}
                  </div>
                </CardContent>
              </Card>

              {results.power_calculations && (
                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">Power Factor</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatValue(results.power_calculations.power_factor, '', 3)}
                    </div>
                    <Badge variant={results.power_calculations.power_factor > 0.9 ? "default" : "secondary"} className="mt-2">
                      {results.power_calculations.power_factor > 0.9 ? "Good" : "Needs Improvement"}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>

            {results.analysis_summary && (
              <Card className="bg-secondary/50 border-border">
                <CardHeader>
                  <CardTitle className="text-sm">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{results.analysis_summary}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rms" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Voltage RMS Values
                </h4>
                <div className="space-y-2">
                  {['L1', 'L2', 'L3'].map((phase) => (
                    <div key={phase} className="flex justify-between items-center p-2 rounded bg-secondary/30">
                      <span className="font-medium">Phase {phase}</span>
                      <span className="text-primary font-mono">
                        {formatValue(results.rms_values?.[`voltage_${phase}`], 'V')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Current RMS Values
                </h4>
                <div className="space-y-2">
                  {['L1', 'L2', 'L3'].map((phase) => (
                    <div key={phase} className="flex justify-between items-center p-2 rounded bg-secondary/30">
                      <span className="font-medium">Phase {phase}</span>
                      <span className="text-primary font-mono">
                        {formatValue(results.rms_values?.[`current_${phase}`], 'A')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h4 className="font-medium mb-3">Peak Voltage Values</h4>
                <div className="space-y-2">
                  {['L1', 'L2', 'L3'].map((phase) => (
                    <div key={phase} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <span className="text-sm">Phase {phase}</span>
                      <span className="text-sm font-mono">
                        {formatValue(results.peak_values?.[`voltage_${phase}`], 'V')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Peak Current Values</h4>
                <div className="space-y-2">
                  {['L1', 'L2', 'L3'].map((phase) => (
                    <div key={phase} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <span className="text-sm">Phase {phase}</span>
                      <span className="text-sm font-mono">
                        {formatValue(results.peak_values?.[`current_${phase}`], 'A')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="phase" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Voltage-Current Phase Angles</h4>
                <div className="space-y-2">
                  {['L1', 'L2', 'L3'].map((phase) => (
                    <div key={phase} className="flex justify-between items-center p-2 rounded bg-secondary/30">
                      <span className="text-sm">V{phase} vs I{phase}</span>
                      <span className="text-primary font-mono">
                        {formatValue(results.phase_angles_degrees?.[`voltage_${phase}_vs_current_${phase}`], '°')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Voltage Phase Relationships</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <span className="text-sm">VL1 vs VL2</span>
                    <span className="text-sm font-mono">
                      {formatValue(results.phase_angles_degrees?.voltage_L1_vs_voltage_L2, '°')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <span className="text-sm">VL2 vs VL3</span>
                    <span className="text-sm font-mono">
                      {formatValue(results.phase_angles_degrees?.voltage_L2_vs_voltage_L3, '°')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <span className="text-sm">VL3 vs VL1</span>
                    <span className="text-sm font-mono">
                      {formatValue(results.phase_angles_degrees?.voltage_L3_vs_voltage_L1, '°')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="power" className="space-y-4 mt-4">
            {results.power_calculations && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Power</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {formatValue(results.power_calculations.active_power_kw, 'kW')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Reactive Power</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {formatValue(results.power_calculations.reactive_power_kvar, 'kVAR')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Apparent Power</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {formatValue(results.power_calculations.apparent_power_kva, 'kVA')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Power Factor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {formatValue(results.power_calculations.power_factor, '', 3)}
                    </div>
                    <div className="mt-2">
                      <Badge variant={results.power_calculations.power_factor > 0.9 ? "default" : "secondary"}>
                        {results.power_calculations.power_factor > 0.9 ? "Excellent" : 
                         results.power_calculations.power_factor > 0.8 ? "Good" : "Poor"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}