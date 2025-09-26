import { useState } from "react";
import { BetCard } from "@/components/bet-card";
import { BetFilters } from "@/components/bet-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { Link } from "wouter";

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
  //todo: remove mock functionality
  const [mockBets] = useState([
    {
      id: "1",
      eventDate: "2024-09-29T15:48:00",
      sport: "Futebol",
      league: "Liga Pro Jupiler",
      teamA: "OH Leuven",
      teamB: "Anderlecht",
      profitPercentage: 2.22,
      status: "pending" as const,
      bet1: {
        id: "b1",
        house: "Pinnacle",
        accountHolder: "João Silva",
        betType: "Acima 2.25",
        odd: 2.25,
        stake: 2650.00,
        potentialProfit: 106.00,
      },
      bet2: {
        id: "b2",
        house: "Betano",
        accountHolder: "Maria Santos",
        betType: "Abaixo 2.25",
        odd: 2.25,
        stake: 2120.00,
        potentialProfit: 106.00,
      },
    },
    {
      id: "2",
      eventDate: "2024-09-28T20:00:00",
      sport: "Futebol",
      league: "Premier League",
      teamA: "Arsenal",
      teamB: "Chelsea",
      profitPercentage: 1.85,
      status: "resolved" as const,
      bet1: {
        id: "b3",
        house: "Bet365",
        accountHolder: "João Silva",
        betType: "Over 2.5",
        odd: 1.90,
        stake: 1500.00,
        potentialProfit: 350.00,
        result: "won" as const,
      },
      bet2: {
        id: "b4",
        house: "1xBet",
        accountHolder: "Pedro Costa",
        betType: "Under 2.5",
        odd: 2.10,
        stake: 1200.00,
        potentialProfit: 320.00,
        result: "lost" as const,
      },
    },
  ]);

  const [filters, setFilters] = useState<FilterValues>({});

  // Calculate stats
  const totalBets = mockBets.length;
  const pendingBets = mockBets.filter(bet => bet.status === "pending").length;
  const resolvedBets = mockBets.filter(bet => bet.status === "resolved").length;
  
  const totalInvested = mockBets.reduce((acc, bet) => 
    acc + bet.bet1.stake + bet.bet2.stake, 0
  );
  
  const totalProfit = mockBets
    .filter(bet => bet.status === "resolved")
    .reduce((acc, bet) => {
      const winningBet = bet.bet1.result === "won" ? bet.bet1 : bet.bet2.result === "won" ? bet.bet2 : null;
      const losingBet = bet.bet1.result === "lost" ? bet.bet1 : bet.bet2.result === "lost" ? bet.bet2 : null;
      if (winningBet && losingBet) {
        return acc + (winningBet.potentialProfit - losingBet.stake);
      }
      return acc;
    }, 0);

  const handleResolve = (betId: string, result: "won" | "lost" | "returned") => {
    console.log(`Resolving bet ${betId} as ${result}`);
    // Here would be the API call to update the bet result
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

        {mockBets.length > 0 ? (
          <div className="space-y-4">
            {mockBets.map((bet) => (
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