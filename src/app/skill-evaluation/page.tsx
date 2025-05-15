"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BrainCircuit, PlusCircle, Trash2, Loader2, Star, FileText, BadgeDollarSign, Activity, CheckCircle } from "lucide-react";
import { evaluateSkillSets } from "@/ai/flows/evaluate-skill-sets";
import type { EvaluateSkillSetsInput, EvaluateSkillSetsOutput } from "@/ai/flows/evaluate-skill-sets";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const skillSetOfferSchema = z.object({
  description: z.string().min(1, "Description is required."),
  cost: z.coerce.number().min(0, "Cost must be non-negative."),
  qos: z.coerce.number().min(0).max(1, "QoS must be between 0 and 1."),
  protocolCompatibility: z.string().min(1, "Protocol compatibility is required."),
});

const evaluateSkillSetsFormSchema = z.object({
  securityRequirements: z.string().min(1, "Security requirements are required."),
  skillSetOffers: z.array(skillSetOfferSchema).min(1, "At least one skill set offer is required."),
});

type EvaluateSkillSetsFormValues = z.infer<typeof evaluateSkillSetsFormSchema>;

export default function SkillEvaluationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EvaluateSkillSetsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<EvaluateSkillSetsFormValues>({
    resolver: zodResolver(evaluateSkillSetsFormSchema),
    defaultValues: {
      securityRequirements: "",
      skillSetOffers: [{ description: "", cost: 0, qos: 0.5, protocolCompatibility: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "skillSetOffers",
  });

  async function onSubmit(data: EvaluateSkillSetsFormValues) {
    setIsLoading(true);
    setResults(null);
    try {
      const aiInput: EvaluateSkillSetsInput = {
        securityRequirements: data.securityRequirements,
        skillSetOffers: data.skillSetOffers.map(offer => ({
          description: offer.description,
          cost: Number(offer.cost),
          qos: Number(offer.qos),
          protocolCompatibility: offer.protocolCompatibility,
        })),
      };
      const evaluatedOffers = await evaluateSkillSets(aiInput);
      setResults(evaluatedOffers);
      toast({
        title: "Evaluation Complete",
        description: "Skill set offers have been successfully evaluated.",
        variant: "default",
      });
    } catch (error) {
      console.error("Skill evaluation error:", error);
      toast({
        title: "Evaluation Failed",
        description: "An error occurred while evaluating skill sets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Intelligent Skill Evaluation"
        description="Utilize AI to assess skill set offers based on cost, Quality of Service (QoS), protocol compatibility, and your specific security requirements. This tool helps optimize agent selection by providing a scored and reasoned evaluation for each offer."
        icon={BrainCircuit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Evaluation Criteria</CardTitle>
            <CardDescription>Define the parameters for evaluating skill set offers.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="securityRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Requirements</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., End-to-end encryption, specific compliance standards..." {...field} rows={4}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Skill Set Offers</FormLabel>
                  {fields.map((field, index) => (
                    <Card key={field.id} className="mt-2 mb-4 p-4 border rounded-md shadow-sm">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`skillSetOffers.${index}.description`}
                          render={({ field: offerField }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Data processing service" {...offerField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                           <FormField
                            control={form.control}
                            name={`skillSetOffers.${index}.cost`}
                            render={({ field: offerField }) => (
                              <FormItem>
                                <FormLabel>Cost</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="e.g., 100" {...offerField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={form.control}
                            name={`skillSetOffers.${index}.qos`}
                            render={({ field: offerField }) => (
                              <FormItem>
                                <FormLabel>QoS (0-1)</FormLabel>
                                <FormControl>
                                   <Slider
                                      defaultValue={[0.5]}
                                      max={1}
                                      step={0.01}
                                      onValueChange={(value) => offerField.onChange(value[0])}
                                      value={[offerField.value]}
                                    />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`skillSetOffers.${index}.protocolCompatibility`}
                          render={({ field: offerField }) => (
                            <FormItem>
                              <FormLabel>Protocol Compatibility</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., HTTP/2, Custom TCP" {...offerField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="mt-4 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Offer
                        </Button>
                      )}
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", cost: 0, qos: 0.5, protocolCompatibility: "" })}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Skill Offer
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BrainCircuit className="mr-2 h-4 w-4" />
                  )}
                  Evaluate Offers
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="lg:col-span-2">
          {isLoading && !results && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Evaluation in Progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">AI is evaluating the skill set offers...</p>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Evaluation Results</CardTitle>
                <CardDescription>
                  {results.length > 0 ? "Here are the AI-powered evaluations of the skill set offers." : "No results to display."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Cost</TableHead>
                        <TableHead className="text-center">QoS</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.sort((a,b) => b.score - a.score).map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium max-w-xs truncate" title={result.description}>{result.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="whitespace-nowrap">
                              <BadgeDollarSign className="mr-1 h-3 w-3" /> {result.cost.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="whitespace-nowrap">
                              <Activity className="mr-1 h-3 w-3" /> {(result.qos * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={result.protocolCompatibility}>
                             <Badge variant="outline" className="whitespace-nowrap">
                                <CheckCircle className="mr-1 h-3 w-3" /> {result.protocolCompatibility}
                             </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={result.score > 70 ? "bg-accent text-accent-foreground" : result.score > 40 ? "bg-yellow-400 text-yellow-900" : "bg-destructive text-destructive-foreground"}>
                              <Star className="mr-1 h-3 w-3" /> {result.score.toFixed(0)}/100
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md" title={result.reasoning}>
                            <FileText className="inline mr-1 h-4 w-4 align-text-bottom" /> {result.reasoning.length > 100 ? result.reasoning.substring(0, 100) + "..." : result.reasoning}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No evaluation results available. Submit criteria to see results.</p>
                )}
              </CardContent>
            </Card>
          )}
          {!isLoading && !results && (
             <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Ready for Evaluation</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <BrainCircuit className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Fill in the criteria and submit to get AI-powered evaluations.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
