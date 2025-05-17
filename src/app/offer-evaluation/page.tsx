
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BrainCircuit, PlusCircle, Trash2, Loader2, Star, FileText, BadgeDollarSign, Activity, CheckCircle } from "lucide-react";
import { evaluateOffers } from "@/ai/flows/evaluate-offers-flow";
import type { EvaluateOffersInput, EvaluateOffersOutput } from "@/ai/flows/evaluate-offers-flow";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const capabilityOfferSchema = z.object({
  description: z.string().min(1, "Description is required."),
  cost: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, "Cost must be non-negative, if specified.").optional()
  ),
  qos: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, "QoS must be between 0 and 1, if specified.").max(1).optional()
  ),
  protocolCompatibility: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : String(val)),
    z.string().optional()
  ),
});

const evaluateOffersFormSchema = z.object({
  securityRequirements: z.string().optional(),
  capabilityOffers: z.array(capabilityOfferSchema).min(1, "At least one capability offer is required."),
});

type EvaluateOffersFormValues = z.infer<typeof evaluateOffersFormSchema>;

export default function OfferEvaluationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EvaluateOffersOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<EvaluateOffersFormValues>({
    resolver: zodResolver(evaluateOffersFormSchema),
    defaultValues: {
      securityRequirements: "",
      capabilityOffers: [{ description: "", cost: undefined, qos: undefined, protocolCompatibility: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "capabilityOffers",
  });

  async function onSubmit(data: EvaluateOffersFormValues) {
    setIsLoading(true);
    setResults(null);
    try {
      const aiInput: EvaluateOffersInput = {
        securityRequirements: data.securityRequirements || undefined,
        capabilityOffers: data.capabilityOffers.map((offer, index) => ({ 
          id: `offer-${index}-${Date.now()}`,
          description: offer.description,
          cost: offer.cost,
          qos: offer.qos,
          protocolCompatibility: offer.protocolCompatibility,
        })),
      };
      const evaluatedOffers = await evaluateOffers(aiInput);
      setResults(evaluatedOffers);
      toast({
        title: "Evaluation Complete",
        description: "Capability offers have been successfully evaluated.",
        variant: "default",
      });
    } catch (error) {
      console.error("Offer evaluation error:", error);
      let errorMessage = "An error occurred while evaluating offers. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Evaluation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI-Powered Offer Evaluation"
        description="Leverage AI to assess capability offers based on cost, Quality of Service (QoS), protocol compatibility, and your specific security requirements. This tool helps optimize agent selection by providing a scored and reasoned evaluation for each offer within the ACNBP framework."
        icon={BrainCircuit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Evaluation Criteria</CardTitle>
            <CardDescription>Define the parameters for evaluating capability offers. Only description is required per offer.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="securityRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Requirements (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., End-to-end encryption, specific compliance standards... Leave blank if not applicable." {...field} rows={4}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Capability Offers</FormLabel>
                  {fields.map((field, index) => (
                    <Card key={field.id} className="mt-2 mb-4 p-4 border rounded-md shadow-sm">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`capabilityOffers.${index}.description`}
                          render={({ field: offerField }) => (
                            <FormItem>
                              <FormLabel>Description (Required)</FormLabel>
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
                            name={`capabilityOffers.${index}.cost`}
                            render={({ field: offerField }) => (
                              <FormItem>
                                <FormLabel>Cost (Optional)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="e.g., 100" {...offerField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={form.control}
                            name={`capabilityOffers.${index}.qos`}
                            render={({ field: offerField }) => (
                              <FormItem>
                                <FormLabel>QoS (0-1, Optional)</FormLabel>
                                <FormControl>
                                   <Input type="number" step="0.01" min="0" max="1" placeholder="e.g., 0.9" {...offerField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`capabilityOffers.${index}.protocolCompatibility`}
                          render={({ field: offerField }) => (
                            <FormItem>
                              <FormLabel>Protocol Compatibility (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., ACNBP/1.0, HTTP/2" {...offerField} />
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
                    onClick={() => append({ description: "", cost: undefined, qos: undefined, protocolCompatibility: undefined })}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Capability Offer
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
                <p className="text-muted-foreground">AI is evaluating the capability offers...</p>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Evaluation Results</CardTitle>
                <CardDescription>
                  {results.length > 0 ? "Here are the AI-powered evaluations of the capability offers." : "No results to display. AI might not have returned valid data or no offers were processed."}
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
                      {results.sort((a,b) => b.score - a.score).map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium max-w-xs truncate" title={result.description}>{result.description}</TableCell>
                          <TableCell className="text-center">
                            {result.cost !== undefined ? (
                              <Badge variant="secondary" className="whitespace-nowrap">
                                <BadgeDollarSign className="mr-1 h-3 w-3" /> {result.cost.toFixed(2)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                             {result.qos !== undefined ? (
                              <Badge variant="secondary" className="whitespace-nowrap">
                                <Activity className="mr-1 h-3 w-3" /> {(result.qos * 100).toFixed(0)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={result.protocolCompatibility}>
                             {result.protocolCompatibility !== undefined ? (
                               <Badge variant="outline" className="whitespace-nowrap">
                                  <CheckCircle className="mr-1 h-3 w-3" /> {result.protocolCompatibility}
                               </Badge>
                             ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                             )}
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
                  <p className="text-muted-foreground text-center py-8">No evaluation results available. Ensure offers were submitted and the AI processed them correctly.</p>
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
