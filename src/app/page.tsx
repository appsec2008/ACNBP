
"use client";

import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from "@/components/ui/card"; // Added CardHeader
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BotMessageSquare, ListTree, ShieldCheck, BrainCircuit, ExternalLink } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const initialFeaturesData: Feature[] = [
  {
    title: "Capability Negotiation",
    description: "Demonstrate the process of agents negotiating capabilities based on requirements and offers.",
    icon: BotMessageSquare,
    href: "/capability-negotiation",
  },
  {
    title: "Agent Name Service (ANS)",
    description: "Explore agent registration in the ANS Registry and name resolution functionalities based on the ANS architecture.",
    icon: ListTree,
    href: "/agent-directory", // This page hosts the ANS Agent Registry
  },
  {
    title: "Secure Binding Protocol",
    description: "Explore the mechanisms for establishing secure and trusted bindings between agents using CA-issued certificates.",
    icon: ShieldCheck,
    href: "/secure-binding",
  },
  {
    title: "AI-Powered Offer Evaluation",
    description: "Utilize AI to evaluate capability offers based on multiple criteria like cost, QoS, and security.",
    icon: BrainCircuit,
    href: "/offer-evaluation",
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title="Agent Capability Negotiation and Binding Protocol"
        description="Explore the core components and functionalities of the ACNBP. This platform demonstrates how agents can negotiate capabilities, register in a directory, establish secure bindings, and evaluate offers intelligently."
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {initialFeaturesData.map((feature) => (
          <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardContent className="p-6 flex-grow flex flex-col">
              <div className="flex items-center mb-3">
                <feature.icon className="h-7 w-7 text-primary mr-3" />
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
              </div>
              <CardDescription className="mb-4 min-h-[3em] flex-grow">{feature.description}</CardDescription>
              <Button asChild variant="outline" className="mt-auto">
                <Link href={feature.href}>
                  Explore <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>About ACNBP</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">
            The Agent Capability Negotiation and Binding Protocol (ACNBP) provides a standardized framework
            for dynamic interaction and collaboration in multi-agent systems. This platform offers tools to understand and implement
            key aspects of the protocol, from initial capability negotiation to secure agent binding and intelligent offer assessment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
