import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, TrendingUp, Zap, RotateCcw } from 'lucide-react';
import { AnalysisResults } from './PowerSystemsDashboard';

interface ResultsDisplayProps {
  results: AnalysisResults | null;
  isProcessing: boolean;
}

export const ResultsDisplay = ({ results, isProcessing }: ResultsDisplayProps) => {
  const copyToClipboard = () => {
    if (results) {
      navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    }
  };

  const formatValue = (value: number, unit: string, decimals: number = 2): string => {
    return `${value.toFixed(decimals)} ${unit}`;
  };

  if (isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 animate-pulse" />
            Processing Analysis
          </CardTitle>
          <CardDescription>Gemini AI is analyzing your power systems data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analysis Results
          </CardTitle>
          <CardDescription>Results will appear here after processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No analysis results yet</p>
            <p className="text-sm">Load data and click "Analyze Data" to begin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Analysis Results
            </CardTitle>
            <CardDescription>Three-phase electrical system analysis</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-1" />
            Copy JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Frequency */}
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <div className="text-2xl font-bold text-primary">
            {formatValue(results.frequency_hz, 'Hz', 1)}
          </div>
          <div className="text-sm text-muted-foreground">System Frequency</div>
        </div>

        {/* RMS Values */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            RMS Values
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Voltages</div>
              {Object.entries(results.rms_values)
                .filter(([key]) => key.startsWith('voltage'))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{key.replace('_', ' ').toUpperCase()}:</span>
                    <Badge variant="outline">{formatValue(value, 'V')}</Badge>
                  </div>
                ))}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Currents</div>
              {Object.entries(results.rms_values)
                .filter(([key]) => key.startsWith('current'))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{key.replace('_', ' ').toUpperCase()}:</span>
                    <Badge variant="outline">{formatValue(value, 'A')}</Badge>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Peak Values */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Peak Values
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Voltages</div>
              {Object.entries(results.peak_values)
                .filter(([key]) => key.startsWith('voltage'))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{key.replace('_', ' ').toUpperCase()}:</span>
                    <Badge variant="secondary">{formatValue(value, 'V')}</Badge>
                  </div>
                ))}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Currents</div>
              {Object.entries(results.peak_values)
                .filter(([key]) => key.startsWith('current'))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{key.replace('_', ' ').toUpperCase()}:</span>
                    <Badge variant="secondary">{formatValue(value, 'A')}</Badge>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Phase Angles */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Phase Angles
          </h4>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-2">Voltage vs Current</div>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(results.phase_angles_degrees)
                  .filter(([key]) => key.includes('voltage') && key.includes('current'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {key.replace(/_/g, ' ').replace('vs', 'vs.').toUpperCase()}:
                      </span>
                      <Badge variant="outline">{formatValue(value, '°', 1)}</Badge>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Voltage Phase Relationships</div>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(results.phase_angles_degrees)
                  .filter(([key]) => key.includes('voltage') && !key.includes('current'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {key.replace(/_/g, ' ').replace('vs', 'vs.').toUpperCase()}:
                      </span>
                      <Badge variant="outline">{formatValue(value, '°', 1)}</Badge>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Current Phase Relationships</div>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(results.phase_angles_degrees)
                  .filter(([key]) => key.includes('current') && !key.includes('voltage'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {key.replace(/_/g, ' ').replace('vs', 'vs.').toUpperCase()}:
                      </span>
                      <Badge variant="outline">{formatValue(value, '°', 1)}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};