import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Building, Edit, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AccountHolder, BettingHouse } from "@shared/schema";

const accountHolderSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

const bettingHouseSchema = z.object({
  name: z.string().min(1, "Nome da casa é obrigatório"),
  notes: z.string().optional(),
});

type AccountHolderFormData = z.infer<typeof accountHolderSchema>;
type BettingHouseFormData = z.infer<typeof bettingHouseSchema>;

interface AccountHolderWithHouses extends AccountHolder {
  bettingHouses: BettingHouse[];
}

interface AccountHolderFormProps {
  onSave: (data: AccountHolderFormData) => void;
  onSaveHouse: (holderId: string, data: BettingHouseFormData) => void;
  className?: string;
}

export function AccountHolderForm({ onSave, onSaveHouse, className }: AccountHolderFormProps) {
  // Load account holders from API
  const { data: holders = [], isLoading, error } = useQuery<AccountHolder[]>({
    queryKey: ["/api/account-holders"],
  });

  // Load betting houses from API
  const { data: allHouses = [] } = useQuery<BettingHouse[]>({
    queryKey: ["/api/betting-houses"],
  });

  // Group betting houses by account holder
  const accountHoldersWithHouses: AccountHolderWithHouses[] = holders.map(holder => ({
    ...holder,
    bettingHouses: allHouses.filter(house => house.accountHolderId === holder.id)
  }));

  const [isHolderDialogOpen, setIsHolderDialogOpen] = useState(false);
  const [isHouseDialogOpen, setIsHouseDialogOpen] = useState(false);
  const [selectedHolderId, setSelectedHolderId] = useState<string | null>(null);

  // Create account holder mutation
  const createHolderMutation = useMutation({
    mutationFn: async (data: AccountHolderFormData) => {
      const response = await apiRequest("POST", "/api/account-holders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-holders"] });
      setIsHolderDialogOpen(false);
      holderForm.reset();
    },
  });

  // Create betting house mutation
  const createHouseMutation = useMutation({
    mutationFn: async ({ holderId, data }: { holderId: string; data: BettingHouseFormData }) => {
      const response = await apiRequest("POST", "/api/betting-houses", {
        ...data,
        accountHolderId: holderId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/betting-houses"] });
      setIsHouseDialogOpen(false);
      setSelectedHolderId(null);
      houseForm.reset();
    },
  });

  // Delete betting house mutation
  const deleteHouseMutation = useMutation({
    mutationFn: async (houseId: string) => {
      await apiRequest("DELETE", `/api/betting-houses/${houseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/betting-houses"] });
    },
  });

  const holderForm = useForm<AccountHolderFormData>({
    resolver: zodResolver(accountHolderSchema),
    defaultValues: {
      name: "",
    },
  });

  const houseForm = useForm<BettingHouseFormData>({
    resolver: zodResolver(bettingHouseSchema),
    defaultValues: {
      name: "",
      notes: "",
    },
  });

  const handleSaveHolder = (data: AccountHolderFormData) => {
    onSave(data);
    createHolderMutation.mutate(data);
  };

  const handleSaveHouse = (data: BettingHouseFormData) => {
    if (!selectedHolderId) return;
    onSaveHouse(selectedHolderId, data);
    createHouseMutation.mutate({ holderId: selectedHolderId, data });
  };

  const handleDeleteHouse = (houseId: string) => {
    deleteHouseMutation.mutate(houseId);
  };

  const openHouseDialog = (holderId: string) => {
    setSelectedHolderId(holderId);
    setIsHouseDialogOpen(true);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Titulares e Casas</h1>
        
        <Dialog open={isHolderDialogOpen} onOpenChange={setIsHolderDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-holder">
              <Plus className="w-4 h-4 mr-2" />
              Novo Titular
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Titular</DialogTitle>
            </DialogHeader>
            
            <Form {...holderForm}>
              <form onSubmit={holderForm.handleSubmit(handleSaveHolder)} className="space-y-4">
                <FormField
                  control={holderForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome completo do titular" data-testid="input-holder-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsHolderDialogOpen(false)}
                    data-testid="button-cancel-holder"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createHolderMutation.isPending} data-testid="button-save-holder">
                    {createHolderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Carregando titulares...</h3>
            <p className="text-muted-foreground text-center">
              Buscando dados dos titulares de conta
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar titulares</h3>
            <p className="text-muted-foreground text-center mb-4">
              Não foi possível carregar os dados. Tente novamente.
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/account-holders"] })}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : accountHoldersWithHouses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum titular cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Cadastre um titular para começar a gerenciar suas apostas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
        {accountHoldersWithHouses.map((holder) => (
          <Card key={holder.id} className="hover-elevate" data-testid={`card-holder-${holder.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {holder.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openHouseDialog(holder.id)}
                    data-testid={`button-add-house-${holder.id}`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nova Casa
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`button-edit-holder-${holder.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Casas de Apostas</h4>
                
                {holder.bettingHouses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {holder.bettingHouses.map((house) => (
                      <Badge 
                        key={house.id} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                        data-testid={`badge-house-${house.id}`}
                      >
                        <Building className="h-3 w-3" />
                        {house.name}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteHouse(house.id)}
                          disabled={deleteHouseMutation.isPending}
                          data-testid={`button-remove-house-${house.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma casa de apostas cadastrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Add Betting House Dialog */}
      <Dialog open={isHouseDialogOpen} onOpenChange={setIsHouseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Casa de Apostas</DialogTitle>
          </DialogHeader>
          
          <Form {...houseForm}>
            <form onSubmit={houseForm.handleSubmit(handleSaveHouse)} className="space-y-4">
              <FormField
                control={houseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Casa *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Bet365, Pinnacle, Betano" data-testid="input-house-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={houseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas/Informações</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Informações adicionais sobre a casa de apostas (opcional)"
                        className="min-h-[80px]"
                        data-testid="input-house-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsHouseDialogOpen(false);
                    setSelectedHolderId(null);
                  }}
                  data-testid="button-cancel-house"
                >
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-save-house">
                  Adicionar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}