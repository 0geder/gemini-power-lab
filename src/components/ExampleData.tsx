import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { PowerSystemsData } from './PowerSystemsDashboard';
import { DataValidator } from './DataValidator';

interface ExampleDataProps {
  onLoadExample: (data: PowerSystemsData) => void;
}

export const ExampleData = ({ onLoadExample }: ExampleDataProps) => {
  const examples = [
    {
      id: 'balanced',
      name: 'Balanced Three-Phase System',
      description: 'Normal balanced operation with 50Hz frequency',
      data: DataValidator.createExample()
    },
    {
      id: 'unbalanced',
      name: 'Unbalanced System',
      description: 'System with voltage unbalance on L2 phase',
      data: (() => {
        const base = DataValidator.createExample();
        // Reduce voltage on L2 by 10%
        base.voltage_L2 = base.voltage_L2.map(v => v * 0.9);
        return base;
      })()
    },
    {
      id: 'harmonic',
      name: 'System with Harmonics',
      description: 'Contains 3rd and 5th harmonic distortion',
      data: (() => {
        const base = DataValidator.createExample();
        const samplingRate = base.sampling_rate_hz;
        const samples = base.voltage_L1.length;
        const time = Array.from({ length: samples }, (_, i) => i / samplingRate);
        
        // Add harmonics to voltage
        base.voltage_L1 = base.voltage_L1.map((v, i) => 
          v + 0.1 * v * Math.sin(2 * Math.PI * 150 * time[i]) + 0.05 * v * Math.sin(2 * Math.PI * 250 * time[i])
        );
        return base;
      })()
    }
  ];

  const handleLoadExample = (exampleData: PowerSystemsData) => {
    onLoadExample(exampleData);
  };

  const handleDownloadExample = (data: PowerSystemsData, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Example Datasets
        </CardTitle>
        <CardDescription>
          Load pre-configured three-phase electrical data for testing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {examples.map((example) => (
            <div key={example.id} className="p-4 border rounded-lg space-y-3">
              <div>
                <h4 className="font-medium">{example.name}</h4>
                <p className="text-sm text-muted-foreground">{example.description}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleLoadExample(example.data)}
                >
                  Load Data
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDownloadExample(example.data, example.id)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Expected JSON Format:</h4>
          <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "voltage_L1": [array of numbers],
  "voltage_L2": [array of numbers],
  "voltage_L3": [array of numbers],
  "current_L1": [array of numbers],
  "current_L2": [array of numbers],
  "current_L3": [array of numbers],
  "sampling_rate_hz": number
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};