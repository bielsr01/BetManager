import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BetCard } from "@/components/bet-card";
import { BetFilters } from "@/components/bet-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, Clock, DollarSign, Loader2, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SurebetSetWithBets, BettingHouseWithAccountHolder } from "@shared/schema";
import type { DateRange } from "react-day-picker";

interface FilterValues {
  status?: string;
  minStake?: number;
  maxStake?: number;
  minProfit?: number;
  maxProfit?: number;
  dateRange?: DateRange;
  sport?: string;
  league?: string;
  house?: string;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterValues>({});
  const [editingBet, setEditingBet] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [timeDisplay, setTimeDisplay] = useState('Agora mesmo');
  const [chronologicalSort, setChronologicalSort] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setTimeDisplay(`Há ${diffInSeconds}s`);
      } else if (diffInSeconds < 3600) {
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        setTimeDisplay(`Há ${diffInMinutes}m`);
      } else if (diffInSeconds < 86400) {
        const diffInHours = Math.floor(diffInSeconds / 3600);
        setTimeDisplay(`Há ${diffInHours}h`);
      } else {
        const diffInDays = Math.floor(diffInSeconds / 86400);
        setTimeDisplay(`Há ${diffInDays}d`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [lastUpdate]);

  // Load surebet sets from the API
  const { data: surebetSets = [], isLoading, error } = useQuery<SurebetSetWithBets[]>({
    queryKey: ["/api/surebet-sets"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Load betting houses for editing
  const { data: bettingHouses = [] } = useQuery<BettingHouseWithAccountHolder[]>({
    queryKey: ["/api/betting-houses"],
  });

  // Mutation for updating bet results with optimistic updates
  const updateBetMutation = useMutation({
    mutationFn: async ({ betId, result }: { betId: string; result: "won" | "lost" | "returned" }) => {
      const response = await apiRequest("PUT", `/api/bets/${betId}`, {
        result,
      });
      return response.json();
    },
    onMutate: async ({ betId, result }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/surebet-sets"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"]);

      // Optimistically update
      queryClient.setQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"], (old) => {
        if (!old) return old;

        return old.map(set => {
          const updatedBets = set.bets.map(bet => 
            bet.id === betId ? { ...bet, result } : bet
          );

          // Check if both bets have results (check for truthy values, not just !== null)
          const allHaveResults = updatedBets.every(b => b.result != null);

          return {
            ...set,
            bets: updatedBets,
            status: allHaveResults ? "resolved" : set.status
          };
        });
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/surebet-sets"], context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
      setLastUpdate(new Date());
      setTimeDisplay('Agora mesmo');
    },
  });

  // Transform and filter the data to match the BetCard component format
  // Sort bets within each set to ensure bet1 comes before bet2 (maintain order)
  const transformedBets = (surebetSets || [])
    .map((set) => {
      // Sort bets by createdAt to maintain consistent order
      const sortedBets = [...set.bets].sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      return {
        id: set.id,
        eventDate: set.eventDate ? (typeof set.eventDate === 'string' ? set.eventDate : set.eventDate.toISOString()) : new Date().toISOString(),
        sport: set.sport || "Futebol",
        league: set.league || "Liga não especificada",
        teamA: set.teamA || "Time A",
        teamB: set.teamB || "Time B",
        profitPercentage: parseFloat(set.profitPercentage || "0"),
        status: (set.status || "pending") as "pending" | "resolved",
        isChecked: set.isChecked || false,
        bet1: sortedBets[0] ? {
          id: sortedBets[0].id,
          bettingHouseId: sortedBets[0].bettingHouseId,
          house: sortedBets[0].bettingHouse.name,
          accountHolder: sortedBets[0].bettingHouse.accountHolder.name,
          betType: sortedBets[0].betType,
          odd: parseFloat(sortedBets[0].odd),
          stake: parseFloat(sortedBets[0].stake),
          potentialProfit: parseFloat(sortedBets[0].potentialProfit),
          result: sortedBets[0].result as "won" | "lost" | "returned" | undefined,
        } : null,
        bet2: sortedBets[1] ? {
          id: sortedBets[1].id,
          bettingHouseId: sortedBets[1].bettingHouseId,
          house: sortedBets[1].bettingHouse.name,
          accountHolder: sortedBets[1].bettingHouse.accountHolder.name,
          betType: sortedBets[1].betType,
          odd: parseFloat(sortedBets[1].odd),
          stake: parseFloat(sortedBets[1].stake),
          potentialProfit: parseFloat(sortedBets[1].potentialProfit),
          result: sortedBets[1].result as "won" | "lost" | "returned" | undefined,
        } : null,
      };
    })
    .filter((bet): bet is NonNullable<typeof bet> & { bet1: NonNullable<typeof bet.bet1>; bet2: NonNullable<typeof bet.bet2> } => bet.bet1 !== null && bet.bet2 !== null)
    .filter((bet) => {
      // Apply status filter
      if (filters.status && bet.status !== filters.status) {
        return false;
      }

      // Apply house filter (check both bets)
      if (filters.house && bet.bet1.house !== filters.house && bet.bet2.house !== filters.house) {
        return false;
      }

      // Apply date range filter
      if (filters.dateRange) {
        const betDate = new Date(bet.eventDate);
        const { from, to } = filters.dateRange;
        
        if (from) {
          const startDate = new Date(from);
          startDate.setHours(0, 0, 0, 0);
          if (betDate < startDate) {
            return false;
          }
        }
        
        if (to) {
          const endDate = new Date(to);
          endDate.setHours(23, 59, 59, 999);
          if (betDate > endDate) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (chronologicalSort) {
        // Ordenar por data do evento (mais antiga primeiro)
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      // Ordenação padrão (por ordem de criação, já vem do backend)
      return 0;
    });

  // Calculate stats
  const totalBets = transformedBets.length;
  const pendingBets = transformedBets.filter(bet => bet.status === "pending").length;
  const resolvedBets = transformedBets.filter(bet => bet.status === "resolved").length;

  const totalInvested = transformedBets.reduce((acc, bet) => 
    acc + (bet.bet1?.stake || 0) + (bet.bet2?.stake || 0), 0
  );

  const totalProfit = transformedBets
    .filter(bet => bet.bet1.result && bet.bet2.result)
    .reduce((acc, bet) => {
      const bet1 = bet.bet1;
      const bet2 = bet.bet2;
      if (!bet1 || !bet2 || !bet1.result || !bet2.result) return acc;

      let profit = 0;

      if (bet1.result === "won" && bet2.result === "lost") {
        profit = (bet1.stake * bet1.odd) - bet2.stake - bet1.stake;
      } else if (bet2.result === "won" && bet1.result === "lost") {
        profit = (bet2.stake * bet2.odd) - bet1.stake - bet2.stake;
      } else if (bet1.result === "won" && bet2.result === "returned") {
        profit = (bet1.stake * bet1.odd) - bet1.stake + bet2.stake;
      } else if (bet2.result === "won" && bet1.result === "returned") {
        profit = (bet2.stake * bet2.odd) - bet2.stake + bet1.stake;
      } else if (bet1.result === "lost" && bet2.result === "returned") {
        profit = -bet1.stake + bet2.stake;
      } else if (bet2.result === "lost" && bet1.result === "returned") {
        profit = -bet2.stake + bet1.stake
      } else if (bet1.result === "won" && bet2.result === "won") {
        profit = (bet1.stake * bet1.odd + bet2.stake * bet2.odd) - (bet1.stake + bet2.stake);
      } else if (bet1.result === "lost" && bet2.result === "lost") {
        profit = -(bet1.stake + bet2.stake);
      } else if (bet1.result === "returned" && bet2.result === "returned") {
        profit = 0;
      }

      return acc + profit;
    }, 0);

  // Mutation for updating surebet set checked status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ surebetSetId, isChecked }: { surebetSetId: string; isChecked: boolean }) => {
      const response = await apiRequest("PATCH", `/api/surebet-sets/${surebetSetId}/status`, {
        isChecked,
      });
      return response.json();
    },
    onMutate: async ({ surebetSetId, isChecked }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/surebet-sets"] });

      const previousData = queryClient.getQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"]);

      queryClient.setQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"], (old) => {
        if (!old) return old;
        return old.map(set => 
          set.id === surebetSetId ? { ...set, isChecked } : set
        );
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/surebet-sets"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
      setLastUpdate(new Date());
      setTimeDisplay('Agora mesmo');
    },
  });

  const handleResolve = (betId: string, result: "won" | "lost" | "returned") => {
    updateBetMutation.mutate({ betId, result });
  };

  const handleStatusChange = (surebetSetId: string, isChecked: boolean) => {
    updateStatusMutation.mutate({ surebetSetId, isChecked });
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    console.log("Filters applied:", newFilters);
  };

  const handleReset = async (surebetSetId: string) => {
    resetMutation.mutate(surebetSetId);
  };

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async (surebetSetId: string) => {
      const response = await apiRequest("POST", `/api/surebet-sets/${surebetSetId}/reset`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
      setLastUpdate(new Date());
      setTimeDisplay('Agora mesmo');
    },
  });

  const handleEdit = (surebetSetId: string) => {
    const bet = transformedBets.find(b => b.id === surebetSetId);
    if (bet) {
      // Converte a data ISO para formato datetime-local sem alterar o fuso
      const eventDate = new Date(bet.eventDate);
      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getDate()).padStart(2, '0');
      const hours = String(eventDate.getHours()).padStart(2, '0');
      const minutes = String(eventDate.getMinutes()).padStart(2, '0');
      const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

      setEditingBet({
        id: bet.id,
        eventDate: dateTimeLocal,
        sport: bet.sport,
        league: bet.league,
        teamA: bet.teamA,
        teamB: bet.teamB,
        profitPercentage: bet.profitPercentage,
        bet1: {
          id: bet.bet1.id,
          bettingHouseId: bet.bet1.bettingHouseId,
          house: bet.bet1.house,
          accountHolder: bet.bet1.accountHolder,
          betType: bet.bet1.betType,
          odd: bet.bet1.odd,
          stake: bet.bet1.stake,
        },
        bet2: {
          id: bet.bet2.id,
          bettingHouseId: bet.bet2.bettingHouseId,
          house: bet.bet2.house,
          accountHolder: bet.bet2.accountHolder,
          betType: bet.bet2.betType,
          odd: bet.bet2.odd,
          stake: bet.bet2.stake,
        },
      });
    }
  };

  const handleSaveEdit = () => {
    if (!editingBet) return;

    updateSurebetMutation.mutate(editingBet);
  };

  // Update surebet mutation
  const updateSurebetMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update surebet set - converte datetime-local para ISO
      const eventDateISO = new Date(data.eventDate).toISOString();
      await apiRequest("PUT", `/api/surebet-sets/${data.id}`, {
        eventDate: eventDateISO,
        sport: data.sport,
        league: data.league,
        teamA: data.teamA,
        teamB: data.teamB,
        profitPercentage: String(data.profitPercentage),
      });

      // Update bet 1
      await apiRequest("PUT", `/api/bets/${data.bet1.id}`, {
        bettingHouseId: data.bet1.bettingHouseId,
        betType: data.bet1.betType,
        odd: String(data.bet1.odd),
        stake: String(data.bet1.stake),
      });

      // Update bet 2
      await apiRequest("PUT", `/api/bets/${data.bet2.id}`, {
        bettingHouseId: data.bet2.bettingHouseId,
        betType: data.bet2.betType,
        odd: String(data.bet2.odd),
        stake: String(data.bet2.stake),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
      setEditingBet(null);
      setLastUpdate(new Date());
      setTimeDisplay('Agora mesmo');
    },
  });

  const handleDelete = (surebetSetId: string) => {
    if (confirm("Tem certeza que deseja deletar esta aposta?")) {
      deleteSurebetMutation.mutate(surebetSetId);
    }
  };

  // Delete mutation
  const deleteSurebetMutation = useMutation({
    mutationFn: async (surebetSetId: string) => {
      const response = await apiRequest("DELETE", `/api/surebet-sets/${surebetSetId}`);
      return response.json();
    },
    onMutate: async (surebetSetId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/surebet-sets"] });

      const previousData = queryClient.getQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"]);

      queryClient.setQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"], (old) => {
        if (!old) return old;
        return old.filter(set => set.id !== surebetSetId);
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/surebet-sets"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
      setLastUpdate(new Date());
      setTimeDisplay('Agora mesmo');
    },
  });

  // Automatic update mutation (triggered on new bet insert or edit)
  const updateAutomatic = useMutation({
    mutationFn: async () => {
      // This mutation doesn't need to do anything specific other than trigger a refetch.
      // The API endpoint is just a placeholder to signal a change that should trigger
      // automatic updates in the backend (which then causes the frontend refetch).
      await apiRequest("POST", "/api/trigger-auto-update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
      setLastUpdate(new Date());
      setTimeDisplay('Agora mesmo');
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie suas apostas surebet e acompanhe o desempenho
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={chronologicalSort ? "default" : "outline"}
            onClick={() => setChronologicalSort(!chronologicalSort)}
            data-testid="button-chronological-sort"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {chronologicalSort ? "Ordenado por Data" : "Ordenar por Data"}
          </Button>
          <Link href="/upload">
            <Button data-testid="button-new-bet">
              <Plus className="w-4 h-4 mr-2" />
              Nova Aposta
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Apostas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-bets">{totalBets}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{pendingBets} pendentes</Badge>
              <Badge variant="outline">{resolvedBets} resolvidas</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-invested">
              R$ {totalInvested.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total em apostas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Realizado</CardTitle>
            <TrendingUp className="h-4 w-4 text-betting-profit" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-betting-profit' : 'text-betting-loss'}`} data-testid="stat-total-profit">
              R$ {totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro de apostas resolvidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <BetFilters onFiltersChange={handleFiltersChange} />

      {/* Bets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Apostas Ativas ({transformedBets.length} {transformedBets.length === 1 ? 'aposta' : 'apostas'})
          </h2>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Atualizado {timeDisplay}
            </span>
            <Button variant="outline" size="sm" onClick={() => updateAutomatic.mutate()} disabled={updateAutomatic.isPending}>
              {updateAutomatic.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar"
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Carregando apostas...</h3>
              <p className="text-muted-foreground text-center">
                Buscando suas surebets no banco de dados
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro ao carregar apostas</h3>
              <p className="text-muted-foreground text-center mb-4">
                Não foi possível carregar as apostas. Tente novamente.
              </p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] })}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : transformedBets.length > 0 ? (
          <div className="space-y-4">
            {transformedBets.map((bet) => (
              <BetCard
                key={bet.id}
                {...bet}
                onResolve={handleResolve}
                onStatusChange={handleStatusChange}
                onReset={handleReset}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isResetting={resetMutation.isPending && resetMutation.variables === bet.id}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma aposta encontrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece adicionando sua primeira aposta surebet
              </p>
              <Link href="/upload">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Aposta
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBet} onOpenChange={(open) => !open && setEditingBet(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aposta Surebet</DialogTitle>
          </DialogHeader>

          {editingBet && (
            <div className="space-y-6">
              {/* Event Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detalhes do Evento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data e Hora do Evento</Label>
                    <Input
                      type="datetime-local"
                      value={editingBet.eventDate}
                      onChange={(e) => setEditingBet({ ...editingBet, eventDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Esporte</Label>
                    <Input
                      value={editingBet.sport}
                      onChange={(e) => setEditingBet({ ...editingBet, sport: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Liga</Label>
                    <Input
                      value={editingBet.league}
                      onChange={(e) => setEditingBet({ ...editingBet, league: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Lucro (%)</Label>
                    <Input
                      type="text"
                      value={editingBet.profitPercentage.toString().replace('.', ',')}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        const numValue = parseFloat(value) || 0;
                        setEditingBet({ ...editingBet, profitPercentage: numValue });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Time A</Label>
                    <Input
                      value={editingBet.teamA}
                      onChange={(e) => setEditingBet({ ...editingBet, teamA: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time B</Label>
                    <Input
                      value={editingBet.teamB}
                      onChange={(e) => setEditingBet({ ...editingBet, teamB: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Bet 1 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">Aposta 1</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Casa de Aposta</Label>
                    <Select
                      value={editingBet.bet1.bettingHouseId}
                      onValueChange={(value) => {
                        const selectedHouse = bettingHouses.find(h => h.id === value);
                        setEditingBet({ 
                          ...editingBet, 
                          bet1: { 
                            ...editingBet.bet1, 
                            bettingHouseId: value,
                            house: selectedHouse?.name || editingBet.bet1.house,
                            accountHolder: selectedHouse?.accountHolder?.name || editingBet.bet1.accountHolder
                          }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a casa" />
                      </SelectTrigger>
                      <SelectContent>
                        {bettingHouses.map(house => (
                          <SelectItem key={house.id} value={house.id}>
                            {house.name} {house.accountHolder?.name ? `(${house.accountHolder.name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Aposta</Label>
                    <Input
                      value={editingBet.bet1.betType}
                      onChange={(e) => setEditingBet({ 
                        ...editingBet, 
                        bet1: { ...editingBet.bet1, betType: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Odd</Label>
                    <Input
                      type="text"
                      value={editingBet.bet1.odd.toString().replace('.', ',')}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        const numValue = parseFloat(value) || 0;
                        setEditingBet({ 
                          ...editingBet, 
                          bet1: { ...editingBet.bet1, odd: numValue }
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Stake (R$)</Label>
                    <Input
                      type="text"
                      value={editingBet.bet1.stake.toString().replace('.', ',')}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        const numValue = parseFloat(value) || 0;
                        setEditingBet({ 
                          ...editingBet, 
                          bet1: { ...editingBet.bet1, stake: numValue }
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bet 2 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">Aposta 2</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Casa de Aposta</Label>
                    <Select
                      value={editingBet.bet2.bettingHouseId}
                      onValueChange={(value) => {
                        const selectedHouse = bettingHouses.find(h => h.id === value);
                        setEditingBet({ 
                          ...editingBet, 
                          bet2: { 
                            ...editingBet.bet2, 
                            bettingHouseId: value,
                            house: selectedHouse?.name || editingBet.bet2.house,
                            accountHolder: selectedHouse?.accountHolder?.name || editingBet.bet2.accountHolder
                          }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a casa" />
                      </SelectTrigger>
                      <SelectContent>
                        {bettingHouses.map(house => (
                          <SelectItem key={house.id} value={house.id}>
                            {house.name} {house.accountHolder?.name ? `(${house.accountHolder.name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Aposta</Label>
                    <Input
                      value={editingBet.bet2.betType}
                      onChange={(e) => setEditingBet({ 
                        ...editingBet, 
                        bet2: { ...editingBet.bet2, betType: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Odd</Label>
                    <Input
                      type="text"
                      value={editingBet.bet2.odd.toString().replace('.', ',')}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        const numValue = parseFloat(value) || 0;
                        setEditingBet({ 
                          ...editingBet, 
                          bet2: { ...editingBet.bet2, odd: numValue }
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Stake (R$)</Label>
                    <Input
                      type="text"
                      value={editingBet.bet2.stake.toString().replace('.', ',')}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        const numValue = parseFloat(value) || 0;
                        setEditingBet({ 
                          ...editingBet, 
                          bet2: { ...editingBet.bet2, stake: numValue }
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBet(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateSurebetMutation.isPending}>
              {updateSurebetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}