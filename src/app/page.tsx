
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BotMessageSquare, ListTree, ShieldCheck, BrainCircuit, ExternalLink } from "lucide-react";
import Image from "next/image";

const features = [
  {
    title: "Capability Negotiation",
    description: "Demonstrate the process of agents negotiating capabilities based on requirements and offers.",
    icon: BotMessageSquare,
    href: "/capability-negotiation",
    img: "https://placehold.co/500x350.png", // Updated dimension
    imgHint: "discussion gears" 
  },
  {
    title: "Agent Directory Service",
    description: "A directory for registering and discovering agents, their capabilities, and protocol support.",
    icon: ListTree,
    href: "/agent-directory",
    img: "https://placehold.co/550x380.png", // Updated dimension
    imgHint: "network nodes"
  },
  {
    title: "Secure Binding Protocol",
    description: "Explore the mechanisms for establishing secure and trusted bindings between agents.",
    icon: ShieldCheck,
    href: "/secure-binding",
    img: "https://placehold.co/520x360.png", // Updated dimension
    imgHint: "padlock connection"
  },
  {
    title: "AI-Powered Offer Evaluation",
    description: "Utilize AI to evaluate capability offers based on multiple criteria like cost, QoS, and security.",
    icon: BrainCircuit,
    href: "/offer-evaluation",
    img: "https://placehold.co/580x390.png", // Updated dimension
    imgHint: "ai analysis"
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
        {features.map((feature) => (
          <Card key={feature.title} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="p-0">
               <Image src={feature.img} alt={feature.title} width={600} height={300} className="w-full h-48 object-cover" data-ai-hint={feature.imgHint} />
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center mb-3">
                <feature.icon className="h-7 w-7 text-primary mr-3" />
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
              </div>
              <CardDescription className="mb-4 min-h-[3em]">{feature.description}</CardDescription>
              <Button asChild variant="outline">
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
        <CardContent>
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

