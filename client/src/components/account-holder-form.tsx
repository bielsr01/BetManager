import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Building, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const accountHolderSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  username: z.string().optional(),
  password: z.string().optional(),
});

const bettingHouseSchema = z.object({
  name: z.string().min(1, "Nome da casa é obrigatório"),
});

type AccountHolderFormData = z.infer<typeof accountHolderSchema>;
type BettingHouseFormData = z.infer<typeof bettingHouseSchema>;

interface AccountHolder {
  id: string;
  name: string;
  email?: string;
  username?: string;
  password?: string;
  bettingHouses: BettingHouse[];
}

interface BettingHouse {
  id: string;
  name: string;
  accountHolderId: string;
}

interface AccountHolderFormProps {
  onSave: (data: AccountHolderFormData) => void;
  onSaveHouse: (holderId: string, data: BettingHouseFormData) => void;
  className?: string;
}

export function AccountHolderForm({ onSave, onSaveHouse, className }: AccountHolderFormProps) {
  //todo: remove mock functionality
  const [accountHolders, setAccountHolders] = useState<AccountHolder[]>([
    {
      id: "1",
      name: "João Silva",
      email: "joao@email.com",
      username: "joao_silva",
      bettingHouses: [
        { id: "h1", name: "Pinnacle", accountHolderId: "1" },
        { id: "h2", name: "Betano", accountHolderId: "1" },
      ]
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@email.com",
      bettingHouses: [
        { id: "h3", name: "Bet365", accountHolderId: "2" },
      ]
    },
  ]);

  const [isHolderDialogOpen, setIsHolderDialogOpen] = useState(false);
  const [isHouseDialogOpen, setIsHouseDialogOpen] = useState(false);
  const [selectedHolderId, setSelectedHolderId] = useState<string | null>(null);

  const holderForm = useForm<AccountHolderFormData>({
    resolver: zodResolver(accountHolderSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
    },
  });

  const houseForm = useForm<BettingHouseFormData>({
    resolver: zodResolver(bettingHouseSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleSaveHolder = (data: AccountHolderFormData) => {
    console.log("Account holder saved:", data);
    onSave(data);
    
    // Mock: Add to local state
    const newHolder: AccountHolder = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email || undefined,
      username: data.username || undefined,
      password: data.password || undefined,
      bettingHouses: [],
    };
    setAccountHolders([...accountHolders, newHolder]);
    
    holderForm.reset();
    setIsHolderDialogOpen(false);
  };

  const handleSaveHouse = (data: BettingHouseFormData) => {
    if (!selectedHolderId) return;
    
    console.log("Betting house saved:", data, "for holder:", selectedHolderId);
    onSaveHouse(selectedHolderId, data);
    
    // Mock: Add to local state
    const newHouse: BettingHouse = {
      id: Date.now().toString(),
      name: data.name,
      accountHolderId: selectedHolderId,
    };
    
    setAccountHolders(accountHolders.map(holder => 
      holder.id === selectedHolderId 
        ? { ...holder, bettingHouses: [...holder.bettingHouses, newHouse] }
        : holder
    ));
    
    houseForm.reset();
    setIsHouseDialogOpen(false);
    setSelectedHolderId(null);
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
                        <Input {...field} placeholder="Nome completo" data-testid="input-holder-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={holderForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@exemplo.com" data-testid="input-holder-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={holderForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="nome_usuario" data-testid="input-holder-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={holderForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="••••••••" data-testid="input-holder-password" />
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
                  <Button type="submit" data-testid="button-save-holder">
                    Salvar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {accountHolders.map((holder) => (
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
              
              {(holder.email || holder.username) && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {holder.email && <p>Email: {holder.email}</p>}
                  {holder.username && <p>Usuário: {holder.username}</p>}
                </div>
              )}
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