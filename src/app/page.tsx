import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BotMessageSquare, ListTree, ShieldCheck, BrainCircuit, ExternalLink } from "lucide-react";
import Image from "next/image";

const features = [
  {
    title: "Agent Simulation",
    description: "Simulate interactions of agents using A2A, MCP, and ACP protocols to handle skill set requests.",
    icon: BotMessageSquare,
    href: "/agent-simulation",
    img: "https://placehold.co/600x400.png",
    imgHint: "network abstract"
  },
  {
    title: "ANS Mock",
    description: "A mock Agent Name Service (ANS) for agent registration and lookup with protocol extensions and timestamped records.",
    icon: ListTree,
    href: "/ans-mock",
    img: "https://placehold.co/600x400.png",
    imgHint: "data server"
  },
  {
    title: "Security Simulation",
    description: "Simulate secure agent discovery processes, including identity verification and trust establishment.",
    icon: ShieldCheck,
    href: "/security-simulation",
    img: "https://placehold.co/600x400.png",
    imgHint: "security lock"
  },
  {
    title: "Intelligent Skill Evaluation",
    description: "Leverage AI to evaluate skill set offers based on cost, QoS, protocol compatibility, and security requirements.",
    icon: BrainCircuit,
    href: "/skill-evaluation",
    img: "https://placehold.co/600x400.png",
    imgHint: "artificial intelligence"
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title="Welcome to AgentConnect"
        description="Your platform for simulating and evaluating multi-agent systems, protocols, and skill sets. Explore the tools below to get started."
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
          <CardTitle>About AgentConnect</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            AgentConnect provides a suite of tools designed to facilitate the development and testing of multi-agent systems. 
            From simulating complex agent interactions to evaluating skill offerings with advanced AI, 
            our platform aims to streamline your workflow and enhance your understanding of agent dynamics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
