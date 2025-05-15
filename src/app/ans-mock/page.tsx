"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListTree, PlusCircle, Search, Construction, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AgentRegistration } from "@/lib/types";

const initialAgents: AgentRegistration[] = [
  { id: "agent1", name: "WeatherBot", address: "tcp://192.168.1.10:5555", capabilities: ["weather_forecast", "temperature_reading"], protocolExtensions: ["secure_comms_v1"], timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "agent2", name: "NewsAggregator", address: "udp://news.example.com:1234", capabilities: ["news_fetch", "topic_summary"], protocolExtensions: [], timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "agent3", name: "ImageProcessor", address: "http://imageproc.svc.cluster.local", capabilities: ["resize", "filter", "ocr"], protocolExtensions: ["batch_processing_v2"], timestamp: new Date().toISOString() },
];


export default function AnsMockPage() {
  const [agents, setAgents] = useState<AgentRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Simulate fetching initial agents or use defaults
    // This ensures Date objects are handled client-side
    setAgents(initialAgents.map(agent => ({
      ...agent,
      timestamp: new Date(agent.timestamp).toLocaleString() // Format for display
    })));
  }, []);


  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="ANS Mock (Agent Name Service)"
        description="A mock service for registering and looking up agents. Includes support for protocol extensions and timestamped records for tracking agent availability and updates."
        icon={ListTree}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Register New Agent</CardTitle>
            <CardDescription>Add a new agent to the directory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
              <Label htmlFor="agentName">Agent Name</Label>
              <Input id="agentName" placeholder="e.g., FinanceBot" />
            </div>
            <div>
              <Label htmlFor="agentAddress">Agent Address</Label>
              <Input id="agentAddress" placeholder="e.g., tcp://10.0.0.5:8080" />
            </div>
            <div>
              <Label htmlFor="capabilities">Capabilities (comma-separated)</Label>
              <Input id="capabilities" placeholder="e.g., stock_quote, portfolio_analysis" />
            </div>
             <div>
              <Label htmlFor="protocolExtensions">Protocol Extensions (comma-separated)</Label>
              <Input id="protocolExtensions" placeholder="e.g., custom_auth_v1" />
            </div>
            <div className="flex items-center justify-center p-4 border-2 border-dashed border-border rounded-md mt-4">
                <div className="text-center">
                <Construction className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                    Registration form is illustrative. Functionality coming soon.
                </p>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled><PlusCircle className="mr-2 h-4 w-4" /> Register Agent</Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Registered Agents</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search agents by name, address, capability..." 
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredAgents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Registered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium flex items-center">
                        <Server className="h-4 w-4 mr-2 text-primary opacity-70" />
                        {agent.name}
                      </TableCell>
                      <TableCell>{agent.address}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.map(cap => <Badge key={cap} variant="secondary">{cap}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{agent.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No agents found matching your criteria.</p>
            )}
            
          </CardContent>
        </Card>
      </div>
    </>
  );
}
