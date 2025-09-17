import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Lightbulb, Target, TrendingUp, Users, FileText, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Decision {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  notes: string;
}

const decisionCategories = [
  {
    id: "technical",
    name: "Technical Decisions",
    description: "System architecture and technical choices",
    icon: Brain,
    color: "text-blue-500"
  },
  {
    id: "strategic",
    name: "Strategic Planning",
    description: "Long-term planning and strategic direction",
    icon: Target,
    color: "text-purple-500"
  },
  {
    id: "operational",
    name: "Operational",
    description: "Day-to-day operational decisions",
    icon: TrendingUp,
    color: "text-green-500"
  },
  {
    id: "team",
    name: "Team & Resources",
    description: "Team management and resource allocation",
    icon: Users,
    color: "text-orange-500"
  }
];

const priorityColors = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  high: "bg-red-100 text-red-800 border-red-200"
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
};

export function DecisionsPad() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [activeCategory, setActiveCategory] = useState("technical");
  const [newDecision, setNewDecision] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    notes: ""
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const { toast } = useToast();

  const addDecision = () => {
    if (!newDecision.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please provide a title for the decision.",
        variant: "destructive",
      });
      return;
    }

    const decision: Decision = {
      id: Date.now().toString(),
      title: newDecision.title,
      description: newDecision.description,
      priority: newDecision.priority,
      status: "pending",
      createdAt: new Date(),
      notes: newDecision.notes
    };

    setDecisions([decision, ...decisions]);
    setNewDecision({ title: "", description: "", priority: "medium", notes: "" });
    setShowNewForm(false);
    
    toast({
      title: "Decision Added",
      description: "New decision has been added to the pad.",
    });
  };

  const updateDecisionStatus = (id: string, status: Decision["status"]) => {
    setDecisions(decisions.map(d => 
      d.id === id ? { ...d, status } : d
    ));
  };

  const deleteDecision = (id: string) => {
    setDecisions(decisions.filter(d => d.id !== id));
    toast({
      title: "Decision Removed",
      description: "Decision has been removed from the pad.",
    });
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Decisions Pad</CardTitle>
          </div>
          <Button
            onClick={() => setShowNewForm(!showNewForm)}
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Decision
          </Button>
        </div>
        <CardDescription>
          Track and manage secondary decision making processes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-4">
            {decisionCategories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger key={category.id} value={category.id} className="text-xs">
                  <Icon className={`h-3 w-3 mr-1 ${category.color}`} />
                  <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {decisionCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              {/* New Decision Form */}
              {showNewForm && (
                <Card className="border-dashed border-2 border-muted">
                  <CardContent className="p-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Decision title..."
                      value={newDecision.title}
                      onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
                      className="w-full p-2 border rounded-md bg-background"
                    />
                    <Textarea
                      placeholder="Decision description..."
                      value={newDecision.description}
                      onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                      className="h-20"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newDecision.priority}
                        onChange={(e) => setNewDecision({ ...newDecision, priority: e.target.value as any })}
                        className="p-2 border rounded-md bg-background"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <Button onClick={addDecision} size="sm">
                        Add
                      </Button>
                      <Button onClick={() => setShowNewForm(false)} size="sm" variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Decisions List */}
              <div className="space-y-3">
                {decisions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No decisions yet. Add your first decision to get started.</p>
                  </div>
                ) : (
                  decisions.map((decision) => (
                    <Card key={decision.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{decision.title}</h4>
                              <Badge className={priorityColors[decision.priority]}>
                                {decision.priority}
                              </Badge>
                              <Badge className={statusColors[decision.status]}>
                                {decision.status}
                              </Badge>
                            </div>
                            {decision.description && (
                              <p className="text-sm text-muted-foreground">
                                {decision.description}
                              </p>
                            )}
                            <div className="flex gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {decision.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {decision.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateDecisionStatus(decision.id, "approved")}
                                  className="h-6 px-2 text-xs text-green-600"
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateDecisionStatus(decision.id, "rejected")}
                                  className="h-6 px-2 text-xs text-red-600"
                                >
                                  ✗
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDecision(decision.id)}
                              className="h-6 px-2 text-xs text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}