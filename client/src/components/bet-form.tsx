import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Save, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const betFormSchema = z.object({
  eventDate: z.string(),
  sport: z.string().min(1, "Esporte é obrigatório"),
  league: z.string().min(1, "Liga é obrigatória"),
  teamA: z.string().min(1, "Time A é obrigatório"),
  teamB: z.string().min(1, "Time B é obrigatório"),
  profitPercentage: z.string().transform(Number),
  
  // Bet 1
  bet1House: z.string().min(1, "Casa é obrigatória"),
  bet1Type: z.string().min(1, "Tipo de aposta é obrigatório"),
  bet1Odd: z.string().transform(Number),
  bet1Stake: z.string().transform(Number),
  bet1Profit: z.string().transform(Number),
  bet1AccountHolder: z.string().optional(),
  
  // Bet 2
  bet2House: z.string().min(1, "Casa é obrigatória"),
  bet2Type: z.string().min(1, "Tipo de aposta é obrigatório"),
  bet2Odd: z.string().transform(Number),
  bet2Stake: z.string().transform(Number),
  bet2Profit: z.string().transform(Number),
  bet2AccountHolder: z.string().optional(),
});

type BetFormData = z.infer<typeof betFormSchema>;

interface BetFormProps {
  initialData?: Partial<BetFormData>;
  onSubmit: (data: BetFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function BetForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: BetFormProps) {
  //todo: remove mock functionality
  const mockAccountHolders = [
    { value: "holder1", label: "João Silva" },
    { value: "holder2", label: "Maria Santos" },
    { value: "holder3", label: "Pedro Costa" },
  ];

  const form = useForm<BetFormData>({
    resolver: zodResolver(betFormSchema),
    defaultValues: {
      eventDate: initialData?.eventDate || "",
      sport: initialData?.sport || "",
      league: initialData?.league || "",
      teamA: initialData?.teamA || "",
      teamB: initialData?.teamB || "",
      profitPercentage: String(initialData?.profitPercentage || ""),
      bet1House: initialData?.bet1House || "",
      bet1Type: initialData?.bet1Type || "",
      bet1Odd: String(initialData?.bet1Odd || ""),
      bet1Stake: String(initialData?.bet1Stake || ""),
      bet1Profit: String(initialData?.bet1Profit || ""),
      bet1AccountHolder: initialData?.bet1AccountHolder || "",
      bet2House: initialData?.bet2House || "",
      bet2Type: initialData?.bet2Type || "",
      bet2Odd: String(initialData?.bet2Odd || ""),
      bet2Stake: String(initialData?.bet2Stake || ""),
      bet2Profit: String(initialData?.bet2Profit || ""),
      bet2AccountHolder: initialData?.bet2AccountHolder || "",
    },
  });

  const handleSubmit = (data: BetFormData) => {
    console.log("Form submitted:", data);
    onSubmit(data);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Editar Dados da Aposta</h1>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          data-testid="input-event-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profitPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lucro (%)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="2.22"
                          data-testid="input-profit-percentage"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Esporte</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Futebol"
                          data-testid="input-sport"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="league"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Liga</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Liga Pro Jupiler"
                          data-testid="input-league"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="teamA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time A</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="OH Leuven"
                          data-testid="input-team-a"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time B</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Anderlecht"
                          data-testid="input-team-b"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bet 1 */}
          <Card>
            <CardHeader>
              <CardTitle>Aposta 1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bet1House"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Casa</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Pinnacle"
                          data-testid="input-bet1-house"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet1Type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Acima 2.25"
                          data-testid="input-bet1-type"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet1AccountHolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titular da Conta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bet1-account-holder">
                            <SelectValue placeholder="Selecionar titular" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockAccountHolders.map((holder) => (
                            <SelectItem key={holder.value} value={holder.value}>
                              {holder.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bet1Odd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odd</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="2.25"
                          data-testid="input-bet1-odd"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet1Stake"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stake (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="2650.00"
                          data-testid="input-bet1-stake"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet1Profit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lucro Potencial (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="106.00"
                          data-testid="input-bet1-profit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bet 2 */}
          <Card>
            <CardHeader>
              <CardTitle>Aposta 2</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bet2House"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Casa</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Betano"
                          data-testid="input-bet2-house"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet2Type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Abaixo 2.25"
                          data-testid="input-bet2-type"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet2AccountHolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titular da Conta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bet2-account-holder">
                            <SelectValue placeholder="Selecionar titular" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockAccountHolders.map((holder) => (
                            <SelectItem key={holder.value} value={holder.value}>
                              {holder.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bet2Odd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odd</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="2.25"
                          data-testid="input-bet2-odd"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet2Stake"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stake (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="2120.00"
                          data-testid="input-bet2-stake"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet2Profit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lucro Potencial (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="106.00"
                          data-testid="input-bet2-profit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                data-testid="button-cancel-form"
              >
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="button-save-bet"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar Aposta"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}