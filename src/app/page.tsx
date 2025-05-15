
"use client";

import { useState, useEffect } from 'react';
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, BotMessageSquare, ListTree, ShieldCheck, BrainCircuit, ExternalLink, ImageOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { generateDashboardImage } from '@/ai/flows/generate-dashboard-image-flow';
import { useToast } from '@/hooks/use-toast';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  imgHint: string;
  placeholderImg: string;
  generatedImgUrl?: string | null;
  isLoadingImg: boolean;
  imgError: boolean;
}

const initialFeaturesData: Omit<Feature, 'generatedImgUrl' | 'isLoadingImg' | 'imgError'>[] = [
  {
    title: "Capability Negotiation",
    description: "Demonstrate the process of agents negotiating capabilities based on requirements and offers.",
    icon: BotMessageSquare,
    href: "/capability-negotiation",
    placeholderImg: "https://placehold.co/500x280.png", 
    imgHint: "discussion gears negotiation" 
  },
  {
    title: "Agent Directory Service",
    description: "A directory for registering and discovering agents, their capabilities, and protocol support.",
    icon: ListTree,
    href: "/agent-directory",
    placeholderImg: "https://placehold.co/500x280.png",
    imgHint: "network nodes directory"
  },
  {
    title: "Secure Binding Protocol",
    description: "Explore the mechanisms for establishing secure and trusted bindings between agents.",
    icon: ShieldCheck,
    href: "/secure-binding",
    placeholderImg: "https://placehold.co/500x280.png",
    imgHint: "padlock connection security"
  },
  {
    title: "AI-Powered Offer Evaluation",
    description: "Utilize AI to evaluate capability offers based on multiple criteria like cost, QoS, and security.",
    icon: BrainCircuit,
    href: "/offer-evaluation",
    placeholderImg: "https://placehold.co/500x280.png",
    imgHint: "ai analysis evaluation"
  },
];

export default function DashboardPage() {
  const [features, setFeatures] = useState<Feature[]>(
    initialFeaturesData.map(f => ({ 
      ...f, 
      generatedImgUrl: f.placeholderImg, 
      isLoadingImg: false, // Will be set to true before API call
      imgError: false 
    }))
  );
  const { toast } = useToast();

  useEffect(() => {
    const loadImages = async () => {
      // Set loading state for all features before starting generation
      setFeatures(prevFeatures => prevFeatures.map(f => ({ ...f, isLoadingImg: true, imgError: false })));

      for (let i = 0; i < initialFeaturesData.length; i++) {
        const featureToUpdate = initialFeaturesData[i];
        try {
          const result = await generateDashboardImage({ 
            prompt: `Generate a professional, vibrant, tech-themed image suitable for a feature card on a dashboard, representing the concept of "${featureToUpdate.imgHint}". Aim for a 16:9 aspect ratio for a 500x280 display.` 
          });
          
          if (result.imageDataUri) {
            setFeatures(prev => 
              prev.map(f => f.title === featureToUpdate.title ? { ...f, generatedImgUrl: result.imageDataUri, isLoadingImg: false } : f)
            );
          } else {
            console.warn(`No image URI returned for ${featureToUpdate.title}`);
            setFeatures(prev => 
              prev.map(f => f.title === featureToUpdate.title ? { ...f, isLoadingImg: false, imgError: true } : f)
            );
          }
        } catch (error) {
          console.error(`Failed to generate image for ${featureToUpdate.title}:`, error);
          toast({
            title: "Image Generation Issue",
            description: `Could not generate image for "${featureToUpdate.title}". Displaying placeholder.`,
            variant: "destructive",
          });
          setFeatures(prev => 
            prev.map(f => f.title === featureToUpdate.title ? { ...f, isLoadingImg: false, imgError: true } : f)
          );
        }
      }
    };

    // Check if GOOGLE_API_KEY might be available (this is a loose check)
    // A more robust check would be to actually try a very small, free API call if possible, or rely on user setup.
    // For now, we assume if the .env file is intended to be used, the user will set it.
    // We can't check process.env.GOOGLE_API_KEY directly in client component easily without exposing it.
    // The flow itself will fail if the key is missing on the server-side.
    loadImages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // toast is stable, initialFeaturesData is stable.

  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title="Agent Capability Negotiation and Binding Protocol"
        description="Explore the core components and functionalities of the ACNBP. This platform demonstrates how agents can negotiate capabilities, register in a directory, establish secure bindings, and evaluate offers intelligently."
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((feature) => (
          <Card key={feature.title} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="p-0 relative h-48">
              {feature.isLoadingImg && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
              )}
              {!feature.isLoadingImg && feature.imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 text-destructive">
                  <ImageOff className="h-12 w-12" />
                  <p className="mt-2 text-sm">Image unavailable</p>
                </div>
              )}
              {/* Display placeholder or generated image. Next/Image handles transitions. */}
              <Image 
                src={feature.generatedImgUrl || feature.placeholderImg} 
                alt={feature.title} 
                width={500} 
                height={280} 
                className="w-full h-full object-cover" 
                data-ai-hint={feature.imgHint}
                unoptimized={feature.generatedImgUrl?.startsWith('data:')} // Important for data URIs
                priority={initialFeaturesData.findIndex(f => f.title === feature.title) < 2} // Prioritize loading for first two images
              />
            </CardHeader>
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
