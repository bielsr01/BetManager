import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import type { SurebetSetWithBets, BettingHouseWithAccountHolder } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [insertionDateFrom, setInsertionDateFrom] = useState<string>("");
  const [insertionDateTo, setInsertionDateTo] = useState<string>("");
  const [eventDateFrom, setEventDateFrom] = useState<string>("");
  const [eventDateTo, setEventDateTo] = useState<string>("");
  const [houseFilter, setHouseFilter] = useState<string>("all");

  const { data: surebetSets = [], isLoading } = useQuery<SurebetSetWithBets[]>({
    queryKey: ["/api/surebet-sets"],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: bettingHouses = [] } = useQuery<BettingHouseWithAccountHolder[]>({
    queryKey: ["/api/betting-houses"],
    staleTime: 300000,
  });

  const filteredBets = useMemo(() => {
    return surebetSets.filter((set) => {
      if (statusFilter === "pending" && set.status !== "pending") return false;
      if (statusFilter === "resolved" && set.status !== "resolved") return false;

      if (insertionDateFrom && set.createdAt) {
        const insertDate = new Date(set.createdAt);
        const fromDate = new Date(insertionDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (insertDate < fromDate) return false;
      }

      if (insertionDateTo && set.createdAt) {
        const insertDate = new Date(set.createdAt);
        const toDate = new Date(insertionDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (insertDate > toDate) return false;
      }

      if (eventDateFrom && set.eventDate) {
        const evtDate = new Date(set.eventDate);
        const fromDate = new Date(eventDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (evtDate < fromDate) return false;
      }

      if (eventDateTo && set.eventDate) {
        const evtDate = new Date(set.eventDate);
        const toDate = new Date(eventDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (evtDate > toDate) return false;
      }

      if (houseFilter !== "all") {
        const hasHouse = set.bets.some(bet => bet.bettingHouse.name === houseFilter);
        if (!hasHouse) return false;
      }

      return true;
    });
  }, [surebetSets, statusFilter, insertionDateFrom, insertionDateTo, eventDateFrom, eventDateTo, houseFilter]);

  const totalBets = filteredBets.length;

  const totalInvested = filteredBets.reduce((acc, set) => {
    return acc + set.bets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
  }, 0);

  const totalProfit = filteredBets
    .filter(set => set.bets.every(bet => bet.result))
    .reduce((acc, set) => {
      const sortedBets = [...set.bets].sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );
      const bet1 = sortedBets[0];
      const bet2 = sortedBets[1];
      
      if (!bet1 || !bet2 || !bet1.result || !bet2.result) return acc;

      let profit = 0;
      const stake1 = parseFloat(bet1.stake);
      const stake2 = parseFloat(bet2.stake);
      const odd1 = parseFloat(bet1.odd);
      const odd2 = parseFloat(bet2.odd);

      if (bet1.result === "won" && bet2.result === "lost") {
        profit = (stake1 * odd1) - stake2 - stake1;
      } else if (bet2.result === "won" && bet1.result === "lost") {
        profit = (stake2 * odd2) - stake1 - stake2;
      } else if (bet1.result === "won" && bet2.result === "returned") {
        profit = (stake1 * odd1) - stake1 + stake2;
      } else if (bet2.result === "won" && bet1.result === "returned") {
        profit = (stake2 * odd2) - stake2 + stake1;
      } else if (bet1.result === "lost" && bet2.result === "returned") {
        profit = -stake1 + stake2;
      } else if (bet2.result === "lost" && bet1.result === "returned") {
        profit = -stake2 + stake1;
      } else if (bet1.result === "won" && bet2.result === "won") {
        profit = (stake1 * odd1 + stake2 * odd2) - (stake1 + stake2);
      } else if (bet1.result === "lost" && bet2.result === "lost") {
        profit = -(stake1 + stake2);
      } else if (bet1.result === "returned" && bet2.result === "returned") {
        profit = 0;
      }

      return acc + profit;
    }, 0);

  const chartData = useMemo(() => {
    const resolvedBets = filteredBets
      .filter(set => set.bets.every(bet => bet.result))
      .map(set => {
        const sortedBets = [...set.bets].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        const bet1 = sortedBets[0];
        const bet2 = sortedBets[1];
        
        let profit = 0;
        if (bet1 && bet2 && bet1.result && bet2.result) {
          const stake1 = parseFloat(bet1.stake);
          const stake2 = parseFloat(bet2.stake);
          const odd1 = parseFloat(bet1.odd);
          const odd2 = parseFloat(bet2.odd);

          if (bet1.result === "won" && bet2.result === "lost") {
            profit = (stake1 * odd1) - stake2 - stake1;
          } else if (bet2.result === "won" && bet1.result === "lost") {
            profit = (stake2 * odd2) - stake1 - stake2;
          } else if (bet1.result === "won" && bet2.result === "returned") {
            profit = (stake1 * odd1) - stake1 + stake2;
          } else if (bet2.result === "won" && bet1.result === "returned") {
            profit = (stake2 * odd2) - stake2 + stake1;
          } else if (bet1.result === "lost" && bet2.result === "returned") {
            profit = -stake1 + stake2;
          } else if (bet2.result === "lost" && bet1.result === "returned") {
            profit = -stake2 + stake1;
          } else if (bet1.result === "won" && bet2.result === "won") {
            profit = (stake1 * odd1 + stake2 * odd2) - (stake1 + stake2);
          } else if (bet1.result === "lost" && bet2.result === "lost") {
            profit = -(stake1 + stake2);
          } else if (bet1.result === "returned" && bet2.result === "returned") {
            profit = 0;
          }
        }

        const eventDate = set.eventDate ? new Date(set.eventDate) : new Date();
        const dateKey = eventDate.toISOString().split('T')[0];

        return {
          date: dateKey,
          profit: profit,
          eventDate: eventDate.getTime()
        };
      })
      .sort((a, b) => a.eventDate - b.eventDate);

    const dailyProfits = new Map<string, number>();
    resolvedBets.forEach(bet => {
      const current = dailyProfits.get(bet.date) || 0;
      dailyProfits.set(bet.date, current + bet.profit);
    });

    const sortedDates = Array.from(dailyProfits.keys()).sort();
    
    let accumulated = 0;
    return sortedDates.map(date => {
      accumulated += dailyProfits.get(date) || 0;
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        lucroAcumulado: parseFloat(accumulated.toFixed(2))
      };
    });
  }, [filteredBets]);

  const uniqueHouses = Array.from(new Set(bettingHouses.map(h => h.name))).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visualize o desempenho das suas apostas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="resolved">Resolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insertion-date-from">Data de Inserção (De)</Label>
              <Input
                id="insertion-date-from"
                type="date"
                value={insertionDateFrom}
                onChange={(e) => setInsertionDateFrom(e.target.value)}
                data-testid="input-insertion-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insertion-date-to">Data de Inserção (Até)</Label>
              <Input
                id="insertion-date-to"
                type="date"
                value={insertionDateTo}
                onChange={(e) => setInsertionDateTo(e.target.value)}
                data-testid="input-insertion-date-to"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date-from">Data do Jogo (De)</Label>
              <Input
                id="event-date-from"
                type="date"
                value={eventDateFrom}
                onChange={(e) => setEventDateFrom(e.target.value)}
                data-testid="input-event-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date-to">Data do Jogo (Até)</Label>
              <Input
                id="event-date-to"
                type="date"
                value={eventDateTo}
                onChange={(e) => setEventDateTo(e.target.value)}
                data-testid="input-event-date-to"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="house-filter">Casa de Aposta</Label>
              <Select value={houseFilter} onValueChange={setHouseFilter}>
                <SelectTrigger id="house-filter" data-testid="select-house-filter">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueHouses.map(house => (
                    <SelectItem key={house} value={house}>{house}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Apostas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-bets">{totalBets}</div>
            <p className="text-xs text-muted-foreground">
              Apostas filtradas
            </p>
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
              Soma de todas as apostas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="stat-profit">
              R$ {totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro total realizado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lucro Acumulado ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Nenhuma aposta resolvida para exibir no gráfico
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  label={{ value: 'Data', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Lucro (R$)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Lucro Acumulado']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="lucroAcumulado" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name="Lucro Acumulado"
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
