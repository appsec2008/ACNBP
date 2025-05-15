"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotMessageSquare, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AgentSimulationPage() {
  return (
    <>
      <PageHeader
        title="Agent Simulation"
        description="Simulate interactions between agents using various protocols like A2A (Agent-to-Agent), MCP (Message Passing Protocol), and ACP (Agent Communication Protocol) to handle skill set requests and observe communication flows."
        icon={BotMessageSquare}
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Simulation Setup</CardTitle>
          <CardDescription>Configure parameters for your agent interaction simulation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="numAgents">Number of Agents</Label>
              <Input id="numAgents" type="number" placeholder="e.g., 5" defaultValue="2" />
            </div>
            <div>
              <Label htmlFor="protocol">Communication Protocol</Label>
              <Select defaultValue="A2A">
                <SelectTrigger id="protocol">
                  <SelectValue placeholder="Select a protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A2A">A2A (Agent-to-Agent)</SelectItem>
                  <SelectItem value="MCP">MCP (Message Passing Protocol)</SelectItem>
                  <SelectItem value="ACP">ACP (Agent Communication Protocol)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="skillRequest">Skill Set Request</Label>
            <Textarea id="skillRequest" placeholder="Describe the skill set needed, e.g., 'Image classification service with >90% accuracy'" />
          </div>

          <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-md">
            <div className="text-center">
              <Construction className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">Simulation Feature Coming Soon</h3>
              <p className="text-muted-foreground">
                The interactive simulation environment is currently under development.
              </p>
            </div>
          </div>
          
          <Button className="w-full" disabled>Start Simulation</Button>
        </CardContent>
      </Card>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle>Simulation Log & Results</CardTitle>
          <CardDescription>Observe the interaction log and outcomes here once the simulation runs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 rounded-md p-4 overflow-auto">
            <p className="text-muted-foreground italic">Simulation log will appear here...</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
