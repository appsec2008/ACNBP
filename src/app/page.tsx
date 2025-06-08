
"use client";

import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BotMessageSquare, ListTree, ShieldCheck, BrainCircuit, ExternalLink, Share2, SearchCode } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  isExternal?: boolean;
}

const initialFeaturesData: Feature[] = [
  {
    title: "ACNBP: Capability Negotiation",
    description: "Demonstrate agents negotiating capabilities based on requirements and offers, a core ACNBP process following ANS discovery.",
    icon: BotMessageSquare,
    href: "/capability-negotiation",
  },
  {
    title: "ANS Agent Registry",
    description: "Explore ANS functionalities: agent registration and name resolution, providing candidate lists for ACNBP.",
    icon: ListTree,
    href: "/agent-directory",
  },
  {
    title: "ANS Resolution",
    description: "Resolve an ANSName to its endpoint and certificate. Supports ACNBP's need to lookup specific agent details.",
    icon: SearchCode,
    href: "/ans-resolution",
  },
  {
    title: "ACNBP: Secure Binding",
    description: "Explore mechanisms for establishing secure bindings between agents using CA-issued certificates, integral to ACNBP.",
    icon: ShieldCheck,
    href: "/secure-binding",
  },
  {
    title: "ACNBP: AI Offer Evaluation",
    description: "Utilize AI to evaluate capability offers from agents, supporting the Skill Set Evaluation (SSE) step in ACNBP.",
    icon: BrainCircuit,
    href: "/offer-evaluation",
  },
  {
    title: "ACNBP & Google A2A Protocol",
    description: "ACNBP enables negotiation and secure binding. Post-binding, agents can use various communication protocols like Google's A2A, if specified in their 'protocolExtension', for skill execution. Learn more about A2A on GitHub.",
    icon: Share2,
    href: "https://github.com/google-a2a/A2A",
    isExternal: true,
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title="Agent Capability Negotiation and Binding Protocol (ACNBP)"
        description="Explore the core components of ACNBP, including how it leverages ANS for discovery, facilitates capability negotiation, secure binding, and AI-driven offer evaluation."
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {initialFeaturesData.map((feature) => (
          <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader>
              <div className="flex items-center mb-1">
                <feature.icon className="h-6 w-6 text-primary mr-2" />
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col pt-0">
              <CardDescription className="mb-4 min-h-[4em] flex-grow">{feature.description}</CardDescription>
              <Button asChild variant="outline" className="mt-auto">
                {feature.isExternal ? (
                  <a href={feature.href} target="_blank" rel="noopener noreferrer">
                    Explore <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                ) : (
                  <Link href={feature.href}>
                    Explore <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>About ACNBP Protocol</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">
            The Agent Capability Negotiation and Binding Protocol (ACNBP) provides a framework for precise and secure interactions in multi-agent systems, operating with an Agent Name Service (ANS) for discovery. This platform demonstrates key ACNBP concepts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
