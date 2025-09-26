import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BetCard } from "@/components/bet-card";
import { BetFilters } from "@/components/bet-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Clock, DollarSign, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SurebetSetWithBets } from "@shared/schema";

interface FilterValues {
  status?: string;
  minStake?: number;
  maxStake?: number;
  minProfit?: number;
  maxProfit?: number;
  dateRange?: any;
  sport?: string;
  league?: string;
  house?: string;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterValues>({});

  // Load surebet sets from the API
  const { data: surebetSets = [], isLoading, error } = useQuery<SurebetSetWithBets[]>({
    queryKey: ["/api/surebet-sets"],
  });

  // Mutation for updating bet results
  const updateBetMutation = useMutation({
    mutationFn: async ({ betId, result }: { betId: string; result: "won" | "lost" | "returned" }) => {
      const response = await apiRequest("PUT", `/api/bets/${betId}`, {
        result,
        actualProfit: result === "won" ? undefined : 0, // Will be calculated based on the result
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surebet-sets"] });
    },
  });

  // Transform the data to match the BetCard component format
  const transformedBets = (surebetSets || []).map((set) => ({
    id: set.id,
    eventDate: set.eventDate ? new Date(set.eventDate).toISOString() : new Date().toISOString(),
    sport: set.sport || "Futebol",
    league: set.league || "Liga não especificada",
    teamA: set.teamA || "Time A",
    teamB: set.teamB || "Time B",
    profitPercentage: parseFloat(set.profitPercentage || "0"),
    status: set.status === "resolved" ? "resolved" as const : "pending" as const,
    bet1: set.bets[0] ? {
      id: set.bets[0].id,
      house: set.bets[0].bettingHouse.name,
      accountHolder: set.bets[0].bettingHouse.accountHolder.name,
      betType: set.bets[0].betType,
      odd: parseFloat(set.bets[0].odd),
      stake: parseFloat(set.bets[0].stake),
      potentialProfit: parseFloat(set.bets[0].potentialProfit),
      result: set.bets[0].result as "won" | "lost" | "returned" | undefined,
    } : null,
    bet2: set.bets[1] ? {
      id: set.bets[1].id,
      house: set.bets[1].bettingHouse.name,
      accountHolder: set.bets[1].bettingHouse.accountHolder.name,
      betType: set.bets[1].betType,
      odd: parseFloat(set.bets[1].odd),
      stake: parseFloat(set.bets[1].stake),
      potentialProfit: parseFloat(set.bets[1].potentialProfit),
      result: set.bets[1].result as "won" | "lost" | "returned" | undefined,
    } : null,
  })).filter((bet): bet is NonNullable<typeof bet> & { bet1: NonNullable<typeof bet.bet1>; bet2: NonNullable<typeof bet.bet2> } => bet.bet1 !== null && bet.bet2 !== null);

  // Calculate stats
  const totalBets = transformedBets.length;
  const pendingBets = transformedBets.filter(bet => bet.status === "pending").length;
  const resolvedBets = transformedBets.filter(bet => bet.status === "resolved").length;
  
  const totalInvested = transformedBets.reduce((acc, bet) => 
    acc + (bet.bet1?.stake || 0) + (bet.bet2?.stake || 0), 0
  );
  
  const totalProfit = transformedBets
    .filter(bet => bet.status === "resolved")
    .reduce((acc, bet) => {
      const bet1 = bet.bet1;
      const bet2 = bet.bet2;
      if (!bet1 || !bet2) return acc;
      
      const winningBet = bet1.result === "won" ? bet1 : bet2.result === "won" ? bet2 : null;
      const losingBet = bet1.result === "lost" ? bet1 : bet2.result === "lost" ? bet2 : null;
      if (winningBet && losingBet) {
        return acc + (winningBet.potentialProfit - losingBet.stake);
      }
      return acc;
    }, 0);

  const handleResolve = (betId: string, result: "won" | "lost" | "returned") => {
    updateBetMutation.mutate({ betId, result });
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    console.log("Filters applied:", newFilters);
    // Here would be the filtering logic
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie suas apostas surebet e acompanhe o desempenho
          </p>
        </div>
        
        <Link href="/upload">
          <Button data-testid="button-new-bet">
            <Plus className="w-4 h-4 mr-2" />
            Nova Aposta
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Médio</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-betting-profit" data-testid="stat-avg-roi">
              {resolvedBets > 0 ? ((totalProfit / totalInvested) * 100).toFixed(2) : "0.00"}%
            </div>
            <p className="text-xs text-muted-foreground">
              Retorno sobre investimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <BetFilters onFiltersChange={handleFiltersChange} />

      {/* Bets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Apostas Ativas</h2>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Atualizado agora
            </span>
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
    </div>
  );
}