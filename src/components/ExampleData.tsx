import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download } from "lucide-react";

interface ExampleDataProps {
  onLoadExample: (data: string) => void;
}

const exampleDatasets = [
  {
    name: "Balanced Three-Phase System",
    description: "Perfect 120° phase separation, 60Hz",
    data: {
      voltage_L1: Array.from({ length: 100 }, (_, i) => 120 * Math.sin(2 * Math.PI * 60 * i / 1000)),
      voltage_L2: Array.from({ length: 100 }, (_, i) => 120 * Math.sin(2 * Math.PI * 60 * i / 1000 - 2 * Math.PI / 3)),
      voltage_L3: Array.from({ length: 100 }, (_, i) => 120 * Math.sin(2 * Math.PI * 60 * i / 1000 + 2 * Math.PI / 3)),
      current_L1: Array.from({ length: 100 }, (_, i) => 15 * Math.sin(2 * Math.PI * 60 * i / 1000 - Math.PI / 6)),
      current_L2: Array.from({ length: 100 }, (_, i) => 15 * Math.sin(2 * Math.PI * 60 * i / 1000 - 2 * Math.PI / 3 - Math.PI / 6)),
      current_L3: Array.from({ length: 100 }, (_, i) => 15 * Math.sin(2 * Math.PI * 60 * i / 1000 + 2 * Math.PI / 3 - Math.PI / 6)),
      sampling_rate_hz: 1000
    }
  },
  {
    name: "Unbalanced System with Harmonics",
    description: "Voltage imbalance with 3rd harmonic content",
    data: {
      voltage_L1: Array.from({ length: 100 }, (_, i) => 
        122 * Math.sin(2 * Math.PI * 60 * i / 1000) + 5 * Math.sin(2 * Math.PI * 180 * i / 1000)
      ),
      voltage_L2: Array.from({ length: 100 }, (_, i) => 
        118 * Math.sin(2 * Math.PI * 60 * i / 1000 - 2 * Math.PI / 3) + 3 * Math.sin(2 * Math.PI * 180 * i / 1000)
      ),
      voltage_L3: Array.from({ length: 100 }, (_, i) => 
        121 * Math.sin(2 * Math.PI * 60 * i / 1000 + 2 * Math.PI / 3) + 4 * Math.sin(2 * Math.PI * 180 * i / 1000)
      ),
      current_L1: Array.from({ length: 100 }, (_, i) => 16.2 * Math.sin(2 * Math.PI * 60 * i / 1000 - Math.PI / 4)),
      current_L2: Array.from({ length: 100 }, (_, i) => 14.8 * Math.sin(2 * Math.PI * 60 * i / 1000 - 2 * Math.PI / 3 - Math.PI / 4)),
      current_L3: Array.from({ length: 100 }, (_, i) => 15.5 * Math.sin(2 * Math.PI * 60 * i / 1000 + 2 * Math.PI / 3 - Math.PI / 4)),
      sampling_rate_hz: 1000
    }
  },
  {
    name: "High Frequency Transient",
    description: "System with switching transients",
    data: {
      voltage_L1: Array.from({ length: 100 }, (_, i) => {
        const base = 120 * Math.sin(2 * Math.PI * 60 * i / 1000);
        const transient = i < 20 ? 10 * Math.exp(-i/5) * Math.sin(2 * Math.PI * 1000 * i / 1000) : 0;
        return base + transient;
      }),
      voltage_L2: Array.from({ length: 100 }, (_, i) => {
        const base = 120 * Math.sin(2 * Math.PI * 60 * i / 1000 - 2 * Math.PI / 3);
        const transient = i < 20 ? 8 * Math.exp(-i/5) * Math.sin(2 * Math.PI * 1000 * i / 1000) : 0;
        return base + transient;
      }),
      voltage_L3: Array.from({ length: 100 }, (_, i) => {
        const base = 120 * Math.sin(2 * Math.PI * 60 * i / 1000 + 2 * Math.PI / 3);
        const transient = i < 20 ? 12 * Math.exp(-i/5) * Math.sin(2 * Math.PI * 1000 * i / 1000) : 0;
        return base + transient;
      }),
      current_L1: Array.from({ length: 100 }, (_, i) => 15 * Math.sin(2 * Math.PI * 60 * i / 1000 - Math.PI / 6)),
      current_L2: Array.from({ length: 100 }, (_, i) => 15 * Math.sin(2 * Math.PI * 60 * i / 1000 - 2 * Math.PI / 3 - Math.PI / 6)),
      current_L3: Array.from({ length: 100 }, (_, i) => 15 * Math.sin(2 * Math.PI * 60 * i / 1000 + 2 * Math.PI / 3 - Math.PI / 6)),
      sampling_rate_hz: 1000
    }
  }
];

export function ExampleData({ onLoadExample }: ExampleDataProps) {
  const loadExample = (dataset: typeof exampleDatasets[0]) => {
    const jsonString = JSON.stringify(dataset.data, null, 2);
    onLoadExample(jsonString);
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Example Datasets</CardTitle>
        </div>
        <CardDescription>Load predefined electrical system scenarios</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {exampleDatasets.map((dataset, index) => (
          <div key={index} className="space-y-2">
            <div>
              <h4 className="font-medium text-sm">{dataset.name}</h4>
              <p className="text-xs text-muted-foreground">{dataset.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => loadExample(dataset)}
            >
              <Download className="h-3 w-3 mr-2" />
              Load Dataset
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}