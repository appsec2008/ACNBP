"use client";

import { useState, useEffect, FormEvent } from 'react';
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListTree, PlusCircle, Search, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AgentRegistration } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const initialAgents: AgentRegistration[] = [
  { id: "agent1", name: "WeatherBot", address: "tcp://192.168.1.10:5555", capabilities: ["weather_forecast", "temperature_reading"], protocolExtensions: ["secure_comms_v1"], timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "agent2", name: "NewsAggregator", address: "udp://news.example.com:1234", capabilities: ["news_fetch", "topic_summary"], protocolExtensions: [], timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "agent3", name: "ImageProcessor", address: "http://imageproc.svc.cluster.local", capabilities: ["resize", "filter", "ocr"], protocolExtensions: ["batch_processing_v2"], timestamp: new Date().toISOString() },
];

export default function AgentDirectoryPage() {
  const [agents, setAgents] = useState<AgentRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Form state
  const [agentName, setAgentName] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [protocolExtensions, setProtocolExtensions] = useState("");

  useEffect(() => {
    setAgents(initialAgents.map(agent => ({
      ...agent,
      timestamp: new Date(agent.timestamp).toLocaleString()
    })));
  }, []);

  const handleRegisterAgent = (e: FormEvent) => {
    e.preventDefault();
    if (!agentName || !agentAddress || !capabilities) {
        toast({
            title: "Registration Failed",
            description: "Agent Name, Address, and Capabilities are required.",
            variant: "destructive",
        });
        return;
    }

    const newAgent: AgentRegistration = {
      id: `agent${agents.length + 1}-${Date.now()}`,
      name: agentName,
      address: agentAddress,
      capabilities: capabilities.split(',').map(cap => cap.trim()).filter(cap => cap),
      protocolExtensions: protocolExtensions.split(',').map(ext => ext.trim()).filter(ext => ext),
      timestamp: new Date().toLocaleString()
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({
        title: "Agent Registered",
        description: `${agentName} has been successfully added to the directory.`,
    });
    // Reset form
    setAgentName("");
    setAgentAddress("");
    setCapabilities("");
    setProtocolExtensions("");
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="Agent Directory Service (ADS)"
        description="A service for registering and discovering agents within the ACNBP ecosystem. Records include capabilities, protocol extensions, and registration timestamps."
        icon={ListTree}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <form onSubmit={handleRegisterAgent}>
            <CardHeader>
              <CardTitle>Register New Agent</CardTitle>
              <CardDescription>Add a new agent to the directory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agentName">Agent Name</Label>
                <Input id="agentName" placeholder="e.g., FinanceBot" value={agentName} onChange={e => setAgentName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="agentAddress">Agent Address</Label>
                <Input id="agentAddress" placeholder="e.g., tcp://10.0.0.5:8080" value={agentAddress} onChange={e => setAgentAddress(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="capabilities">Capabilities (comma-separated)</Label>
                <Input id="capabilities" placeholder="e.g., stock_quote, portfolio_analysis" value={capabilities} onChange={e => setCapabilities(e.target.value)} required/>
              </div>
              <div>
                <Label htmlFor="protocolExtensions">Protocol Extensions (comma-separated)</Label>
                <Input id="protocolExtensions" placeholder="e.g., custom_auth_v1" value={protocolExtensions} onChange={e => setProtocolExtensions(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Register Agent</Button>
            </CardFooter>
          </form>
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
          <CardContent className="max-h-[600px] overflow-y-auto">
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
                           {agent.protocolExtensions.map(ext => <Badge key={ext} variant="outline">{ext}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{agent.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No agents found matching your criteria. Try registering one!</p>
            )}
            
          </CardContent>
        </Card>
      </div>
    </>
  );
}
