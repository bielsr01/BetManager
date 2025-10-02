import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BetCard } from "@/components/bet-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { TrendingUp, DollarSign, Clock, CheckCircle, XCircle, X, ArrowUpDown, Plus, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SurebetSetWithBets, BettingHouse } from "@shared/schema";
import type { DateRange } from "react-day-picker";

interface FilterValues {
  status?: string;
  checked?: string;
  house?: string;
  eventDateRange?: DateRange;
  createdDateRange?: DateRange;
}

export default function Management() {
  const [filters, setFilters] = useState<FilterValues>({});
  const [tempFilters, setTempFilters] = useState<FilterValues>({});
  const [chronologicalSort, setChronologicalSort] = useState(false);

  // Load surebet sets from the API
  const { data: surebetSets = [], isLoading } = useQuery<SurebetSetWithBets[]>({
    queryKey: ["/api/surebet-sets"],
    refetchInterval: 60000,
  });

  // Load betting houses from API
  const { data: bettingHouses = [] } = useQuery<BettingHouse[]>({
    queryKey: ["/api/betting-houses"],
  });

  // Mutation for updating bet results
  const updateBetMutation = useMutation({
    mutationFn: async ({ betId, result }: { betId: string; result: "won" | "lost" | "returned" }) => {
      const response = await apiRequest("PUT", `/api/bets/${betId}`, { result });
      return response.json();
    },
    onMutate: async ({ betId, result }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/surebet-sets"] });
      const previousData = queryClient.getQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"]);

      queryClient.setQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"], (old) => {
        if (!old) return old;
        return old.map(set => {
          const updatedBets = set.bets.map(bet => 
            bet.id === betId ? { ...bet, result } : bet
          );
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
      if (context?.previousData) {
        queryClient.setQueryData(["/api/surebet-sets"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
    },
  });

  // Mutation for checking/unchecking surebet set
  const updateStatusMutation = useMutation({
    mutationFn: async ({ surebetSetId, isChecked }: { surebetSetId: string; isChecked: boolean }) => {
      const response = await apiRequest("PATCH", `/api/surebet-sets/${surebetSetId}/status`, { isChecked });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
    },
  });

  // Mutation for reset
  const resetMutation = useMutation({
    mutationFn: async (surebetSetId: string) => {
      const response = await apiRequest("POST", `/api/surebet-sets/${surebetSetId}/reset`);
      return response.json();
    },
    onMutate: async (surebetSetId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/surebet-sets"] });
      const previousData = queryClient.getQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"]);

      queryClient.setQueryData<SurebetSetWithBets[]>(["/api/surebet-sets"], (old) => {
        if (!old) return old;
        return old.map(set => {
          if (set.id === surebetSetId) {
            return {
              ...set,
              status: "pending",
              bets: set.bets.map(bet => ({
                ...bet,
                result: null,
                actualProfit: null
              }))
            };
          }
          return set;
        });
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/surebet-sets"], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
    },
  });

  // Mutation for delete
  const deleteMutation = useMutation({
    mutationFn: async (surebetSetId: string) => {
      const response = await apiRequest("DELETE", `/api/surebet-sets/${surebetSetId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
    },
  });

  // Transform data
  const transformedBets = (surebetSets || [])
    .map((set) => {
      const sortedBets = [...set.bets].sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      return {
        id: set.id,
        eventDate: set.eventDate ? (typeof set.eventDate === 'string' ? set.eventDate : set.eventDate.toISOString()) : new Date().toISOString(),
        createdAt: set.createdAt ? (typeof set.createdAt === 'string' ? set.createdAt : set.createdAt.toISOString()) : new Date().toISOString(),
        sport: set.sport || "N/A",
        league: set.league || "N/A",
        teamA: set.teamA || "Time A",
        teamB: set.teamB || "Time B",
        profitPercentage: Number(set.profitPercentage) || 0,
        status: (set.status || "pending") as "pending" | "resolved",
        isChecked: set.isChecked || false,
        bet1: {
          id: sortedBets[0]?.id || "",
          house: sortedBets[0]?.bettingHouse?.name || "Casa 1",
          accountHolder: sortedBets[0]?.bettingHouse?.accountHolder?.name || "",
          betType: sortedBets[0]?.betType || "N/A",
          odd: Number(sortedBets[0]?.odd) || 0,
          stake: Number(sortedBets[0]?.stake) || 0,
          potentialProfit: Number(sortedBets[0]?.potentialProfit) || 0,
          result: sortedBets[0]?.result as "won" | "lost" | "returned" | undefined,
        },
        bet2: {
          id: sortedBets[1]?.id || "",
          house: sortedBets[1]?.bettingHouse?.name || "Casa 2",
          accountHolder: sortedBets[1]?.bettingHouse?.accountHolder?.name || "",
          betType: sortedBets[1]?.betType || "N/A",
          odd: Number(sortedBets[1]?.odd) || 0,
          stake: Number(sortedBets[1]?.stake) || 0,
          potentialProfit: Number(sortedBets[1]?.potentialProfit) || 0,
          result: sortedBets[1]?.result as "won" | "lost" | "returned" | undefined,
        },
      };
    });

  // Apply filters
  const filteredBets = transformedBets.filter((bet) => {
    if (filters.status && bet.status !== filters.status) return false;
    
    if (filters.checked) {
      if (filters.checked === "checked" && !bet.isChecked) return false;
      if (filters.checked === "unchecked" && bet.isChecked) return false;
    }
    
    if (filters.house) {
      const hasHouse = bet.bet1.house === filters.house || bet.bet2.house === filters.house;
      if (!hasHouse) return false;
    }

    if (filters.eventDateRange?.from || filters.eventDateRange?.to) {
      const eventDate = new Date(bet.eventDate);
      if (filters.eventDateRange.from) {
        const fromDate = new Date(filters.eventDateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (eventDate < fromDate) return false;
      }
      if (filters.eventDateRange.to) {
        const toDate = new Date(filters.eventDateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (eventDate > toDate) return false;
      }
    }

    if (filters.createdDateRange?.from || filters.createdDateRange?.to) {
      const createdDate = new Date(bet.createdAt);
      if (filters.createdDateRange.from) {
        const fromDate = new Date(filters.createdDateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (createdDate < fromDate) return false;
      }
      if (filters.createdDateRange.to) {
        const toDate = new Date(filters.createdDateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) return false;
      }
    }

    return true;
  })
  .sort((a, b) => {
    if (chronologicalSort) {
      // Ordenar por data do evento (mais antiga primeiro)
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    }
    // Ordenação padrão (por ordem de criação)
    return 0;
  });

  // Calculate metrics
  const pendingBets = filteredBets.filter(bet => bet.status === "pending");
  const resolvedBets = filteredBets.filter(bet => bet.status === "resolved");

  const totalStakePending = pendingBets.reduce((sum, bet) => sum + bet.bet1.stake + bet.bet2.stake, 0);
  const totalStakeResolved = resolvedBets.reduce((sum, bet) => sum + bet.bet1.stake + bet.bet2.stake, 0);
  const totalStake = totalStakePending + totalStakeResolved;

  // Calculate real profit for resolved bets
  const calculateRealProfit = (bet: typeof filteredBets[0]) => {
    const { bet1, bet2 } = bet;
    if (!bet1.result || !bet2.result) return 0;

    if (bet1.result === "won" && bet2.result === "lost") {
      return (bet1.stake * bet1.odd) - bet2.stake - bet1.stake;
    } else if (bet2.result === "won" && bet1.result === "lost") {
      return (bet2.stake * bet2.odd) - bet1.stake - bet2.stake;
    } else if (bet1.result === "won" && bet2.result === "returned") {
      return (bet1.stake * bet1.odd) - bet1.stake + bet2.stake;
    } else if (bet2.result === "won" && bet1.result === "returned") {
      return (bet2.stake * bet2.odd) - bet2.stake + bet1.stake;
    } else if (bet1.result === "lost" && bet2.result === "returned") {
      return -bet1.stake + bet2.stake;
    } else if (bet2.result === "lost" && bet1.result === "returned") {
      return -bet2.stake + bet1.stake;
    } else if (bet1.result === "won" && bet2.result === "won") {
      return (bet1.stake * bet1.odd + bet2.stake * bet2.odd) - (bet1.stake + bet2.stake);
    } else if (bet1.result === "lost" && bet2.result === "lost") {
      return -(bet1.stake + bet2.stake);
    } else if (bet1.result === "returned" && bet2.result === "returned") {
      return 0;
    }
    return 0;
  };

  const totalProfitResolved = resolvedBets.reduce((sum, bet) => sum + calculateRealProfit(bet), 0);
  const totalProfitPending = pendingBets.reduce((sum, bet) => sum + bet.bet1.potentialProfit, 0);

  const handleTempFilterChange = (key: keyof FilterValues, value: any) => {
    setTempFilters({ ...tempFilters, [key]: value === 'all' ? undefined : value });
  };

  const applyFilters = () => {
    setFilters(tempFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setTempFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (value === undefined || value === "" || value === null) return false;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined);
    }
    return true;
  });

  const uniqueHouseNames = Array.from(new Set(bettingHouses.map(house => house.name)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento</h1>
          <p className="text-muted-foreground">
            Análise detalhada de apostas
            {hasActiveFilters && (
              <span className="ml-2 text-primary font-medium" data-testid="text-filtered-count">
                • {filteredBets.length} {filteredBets.length === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={chronologicalSort ? "default" : "outline"}
            onClick={() => setChronologicalSort(!chronologicalSort)}
            data-testid="button-chronological-sort-management"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {chronologicalSort ? "Ordenado por Data" : "Ordenar por Data"}
          </Button>
          <Link href="/upload">
            <Button data-testid="button-new-bet-management">
              <Plus className="w-4 h-4 mr-2" />
              Nova Aposta
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-profit-resolved">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Resolvido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalProfitResolved.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {resolvedBets.length} apostas resolvidas
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-profit-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Pendente</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalProfitPending.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingBets.length} apostas pendentes
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stake-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Apostado (Pendente)</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalStakePending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stake-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalStake.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total apostado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card data-testid="card-filters">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select 
                value={tempFilters.status || ""} 
                onValueChange={(value) => handleTempFilterChange("status", value || undefined)}
              >
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="resolved">Resolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checked-filter">Conferência</Label>
              <Select 
                value={tempFilters.checked || ""} 
                onValueChange={(value) => handleTempFilterChange("checked", value || undefined)}
              >
                <SelectTrigger id="checked-filter" data-testid="select-checked-filter">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="checked">Conferidas</SelectItem>
                  <SelectItem value="unchecked">Não Conferidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="house-filter">Casa de Apostas</Label>
              <Select 
                value={tempFilters.house || ""} 
                onValueChange={(value) => handleTempFilterChange("house", value || undefined)}
              >
                <SelectTrigger id="house-filter" data-testid="select-house-filter">
                  <SelectValue placeholder="Todas as casas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as casas</SelectItem>
                  {uniqueHouseNames.map((house) => (
                    <SelectItem key={house} value={house}>
                      {house}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data do Jogo</Label>
              <DatePickerWithRange
                selected={tempFilters.eventDateRange}
                onSelect={(range) => setTempFilters({ ...tempFilters, eventDateRange: range })}
                placeholder="Selecione o período"
                data-testid="event-date-range-filter"
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Inserção</Label>
              <DatePickerWithRange
                selected={tempFilters.createdDateRange}
                onSelect={(range) => setTempFilters({ ...tempFilters, createdDateRange: range })}
                placeholder="Selecione o período"
                data-testid="created-date-range-filter"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={applyFilters}
              data-testid="button-apply-filters"
              className="w-full md:w-auto"
            >
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bet Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Apostas Ativas ({filteredBets.length} {filteredBets.length === 1 ? 'aposta' : 'apostas'})
        </h2>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando apostas...</p>
          </div>
        ) : filteredBets.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {hasActiveFilters ? "Nenhuma aposta encontrada com os filtros aplicados" : "Nenhuma aposta cadastrada"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBets.map((bet) => (
            <BetCard
              key={bet.id}
              {...bet}
              onResolve={(betId, result) => updateBetMutation.mutate({ betId, result })}
              onStatusChange={(surebetSetId, isChecked) => updateStatusMutation.mutate({ surebetSetId, isChecked })}
              onReset={(surebetSetId) => resetMutation.mutate(surebetSetId)}
              onDelete={(surebetSetId) => deleteMutation.mutate(surebetSetId)}
              isResetting={resetMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}
