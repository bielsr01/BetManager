import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BettingHouseWithAccountHolder } from "@shared/schema";

interface ParsedBet {
  eventDate: string;
  sport: string;
  league: string;
  teamA: string;
  teamB: string;
  profitPercentage: number;
  bet1: {
    house: string;
    type: string;
    odd: number;
    stake: number;
    profit: number;
  };
  bet2: {
    house: string;
    type: string;
    odd: number;
    stake: number;
    profit: number;
  };
}

interface EditableData {
  eventDate: string;
  profitPercentage: string;
  sport: string;
  league: string;
  teamA: string;
  teamB: string;
  bet1House: string;
  bet1Type: string;
  bet1Odd: string;
  bet1Stake: string;
  bet1SelectedHouseId?: string;
  bet2House: string;
  bet2Type: string;
  bet2Odd: string;
  bet2Stake: string;
  bet2SelectedHouseId?: string;
}

export default function BetBurger() {
  const { toast } = useToast();
  const [excelData, setExcelData] = useState("");
  const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
  const [editableData, setEditableData] = useState<Record<number, EditableData>>({});

  const { data: bettingHouses = [] } = useQuery<BettingHouseWithAccountHolder[]>({
    queryKey: ["/api/betting-houses"],
  });

  const parseBetBurgerData = (data: string): ParsedBet[] => {
    const lines = data.trim().split('\n').map(line => line.trim()).filter(line => line);
    const bets: ParsedBet[] = [];

    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 >= lines.length) break;

      const dateTimeLine = lines[i];
      const mainLine = lines[i + 1];
      const bet1Line = lines[i + 1];
      const bet2Line = lines[i + 2];

      // Parse date/time (formato: 08/11/2025 13:15)
      const dateTimeMatch = dateTimeLine.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
      let eventDate = new Date().toISOString().slice(0, 16);
      if (dateTimeMatch) {
        const [_, datePart, timePart] = dateTimeMatch;
        const [day, month, year] = datePart.split('/');
        eventDate = `${year}-${month}-${day}T${timePart}`;
      }

      // Parse linha principal: Esporte.Time1 - Time2 (Liga) Porcentagem%
      const mainMatch = mainLine.match(/^([^.]+)\.([^-]+)\s*-\s*([^(]+)\s*\(([^)]+)\)\s*([\d.]+)%/);
      if (!mainMatch) continue;

      const [_, sport, teamA, teamB, league, profitPct] = mainMatch;

      // Parse bet1 (próxima linha após a linha principal)
      const bet1Parts = bet1Line.split('\t').filter(p => p.trim());
      if (bet1Parts.length < 6) continue;

      const bet1 = {
        house: bet1Parts[0].trim(),
        type: bet1Parts[1].trim(),
        odd: parseFloat(bet1Parts[2]) || 0,
        stake: parseFloat(bet1Parts[3]) || 0,
        profit: parseFloat(bet1Parts[5]) || 0,
      };

      // Parse bet2
      const bet2Parts = bet2Line.split('\t').filter(p => p.trim());
      if (bet2Parts.length < 6) continue;

      const bet2 = {
        house: bet2Parts[0].trim(),
        type: bet2Parts[1].trim(),
        odd: parseFloat(bet2Parts[2]) || 0,
        stake: parseFloat(bet2Parts[3]) || 0,
        profit: parseFloat(bet2Parts[5]) || 0,
      };

      bets.push({
        eventDate,
        sport: sport.trim(),
        league: league.trim(),
        teamA: teamA.trim(),
        teamB: teamB.trim(),
        profitPercentage: parseFloat(profitPct),
        bet1,
        bet2,
      });
    }

    return bets;
  };

  const findMatchingHouse = (houseName: string): string | undefined => {
    const normalized = houseName.toLowerCase().replace(/[.\s]/g, '');
    const match = bettingHouses.find(h => 
      h.name.toLowerCase().replace(/[.\s]/g, '').includes(normalized) ||
      normalized.includes(h.name.toLowerCase().replace(/[.\s]/g, ''))
    );
    return match?.id;
  };

  const handleProcessData = () => {
    try {
      const parsed = parseBetBurgerData(excelData);
      
      if (parsed.length === 0) {
        toast({
          title: "❌ Erro ao processar",
          description: "Não foi possível extrair apostas dos dados colados. Verifique o formato.",
          variant: "destructive",
        });
        return;
      }

      setParsedBets(parsed);

      const initialData: Record<number, EditableData> = {};
      parsed.forEach((bet, index) => {
        initialData[index] = {
          eventDate: bet.eventDate,
          profitPercentage: bet.profitPercentage.toFixed(2),
          sport: bet.sport,
          league: bet.league,
          teamA: bet.teamA,
          teamB: bet.teamB,
          bet1House: bet.bet1.house,
          bet1Type: bet.bet1.type,
          bet1Odd: bet.bet1.odd.toFixed(3),
          bet1Stake: bet.bet1.stake.toFixed(2),
          bet1SelectedHouseId: findMatchingHouse(bet.bet1.house),
          bet2House: bet.bet2.house,
          bet2Type: bet.bet2.type,
          bet2Odd: bet.bet2.odd.toFixed(3),
          bet2Stake: bet.bet2.stake.toFixed(2),
          bet2SelectedHouseId: findMatchingHouse(bet.bet2.house),
        };
      });

      setEditableData(initialData);

      toast({
        title: "✅ Dados processados!",
        description: `${parsed.length} aposta(s) extraída(s) com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao processar dados:", error);
      toast({
        title: "❌ Erro ao processar",
        description: "Ocorreu um erro ao processar os dados. Verifique o formato.",
        variant: "destructive",
      });
    }
  };

  const handleClearAll = () => {
    setExcelData("");
    setParsedBets([]);
    setEditableData({});
  };

  const updateEditableField = (index: number, field: keyof EditableData, value: string) => {
    setEditableData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      }
    }));
  };

  const createBetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/surebet-sets", data);
      return response.json();
    },
  });

  const handleSubmitBets = async () => {
    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedBets.length; i++) {
      const data = editableData[i];
      
      if (!data.bet1SelectedHouseId || !data.bet2SelectedHouseId) {
        errors.push(`Aposta ${i + 1}: Selecione os titulares das contas`);
        failed++;
        continue;
      }

      const bet1Odd = parseFloat(data.bet1Odd);
      const bet1Stake = parseFloat(data.bet1Stake);
      const bet2Odd = parseFloat(data.bet2Odd);
      const bet2Stake = parseFloat(data.bet2Stake);

      if (isNaN(bet1Odd) || isNaN(bet1Stake) || isNaN(bet2Odd) || isNaN(bet2Stake)) {
        errors.push(`Aposta ${i + 1}: Valores numéricos inválidos`);
        failed++;
        continue;
      }

      const bet1PotentialProfit = bet1Stake * bet1Odd - bet1Stake;
      const bet2PotentialProfit = bet2Stake * bet2Odd - bet2Stake;

      try {
        await createBetMutation.mutateAsync({
          eventDate: data.eventDate,
          profitPercentage: parseFloat(data.profitPercentage),
          sport: data.sport,
          league: data.league,
          teamA: data.teamA,
          teamB: data.teamB,
          bets: [
            {
              bettingHouseId: data.bet1SelectedHouseId,
              betType: data.bet1Type,
              odd: bet1Odd.toFixed(3),
              stake: bet1Stake.toFixed(2),
              potentialProfit: bet1PotentialProfit.toFixed(2),
            },
            {
              bettingHouseId: data.bet2SelectedHouseId,
              betType: data.bet2Type,
              odd: bet2Odd.toFixed(3),
              stake: bet2Stake.toFixed(2),
              potentialProfit: bet2PotentialProfit.toFixed(2),
            }
          ]
        });
        created++;
      } catch (error: any) {
        console.error(`Erro ao criar aposta ${i + 1}:`, error);
        errors.push(`Aposta ${i + 1}: ${error.message || 'Erro desconhecido'}`);
        failed++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['/api/surebet-sets'] });

    if (created > 0) {
      toast({
        title: "✅ Apostas criadas com sucesso!",
        description: `${created} aposta(s) adicionada(s) ao sistema${failed > 0 ? `. ${failed} falhou(aram)` : ''}`,
      });

      if (failed === 0) {
        setTimeout(() => {
          handleClearAll();
        }, 1500);
      }
    }

    if (errors.length > 0 && failed > 0) {
      console.error('Erros na criação:', errors);
      toast({
        title: "⚠️ Alguns erros ocorreram",
        description: `${failed} aposta(s) não puderam ser criadas. Verifique o console.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bet Burger</h1>
          <p className="text-muted-foreground">Cole dados do Excel para adicionar apostas</p>
        </div>
      </div>

      {parsedBets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Colar Dados do Excel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-data">Dados do Bet Burger</Label>
              <Textarea
                id="excel-data"
                placeholder="Cole aqui os dados do Excel (Data/Hora, linha principal, aposta 1, aposta 2)..."
                value={excelData}
                onChange={(e) => setExcelData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-excel-data"
              />
              <p className="text-xs text-muted-foreground">
                Formato esperado: Data/Hora na primeira linha, depois Esporte.Time1 - Time2 (Liga) %, seguido das 2 apostas
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleProcessData}
                disabled={!excelData.trim()}
                data-testid="button-process-data"
              >
                <Upload className="w-4 h-4 mr-2" />
                Processar Dados
              </Button>
              <Button
                variant="outline"
                onClick={handleClearAll}
                disabled={!excelData.trim()}
                data-testid="button-clear-data"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {parsedBets.length} aposta(s) extraída(s) • Revise os dados antes de enviar
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearAll}
                data-testid="button-reset"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Recomeçar
              </Button>
              <Button
                onClick={handleSubmitBets}
                disabled={createBetMutation.isPending}
                data-testid="button-submit-bets"
              >
                {createBetMutation.isPending ? "Enviando..." : "Adicionar Todas as Apostas ao Sistema"}
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            {parsedBets.map((bet, index) => {
              const data = editableData[index];
              if (!data) return null;

              return (
                <div key={index} className="space-y-4 p-4 border rounded-lg bg-card">
                  <h3 className="text-lg font-semibold">Aposta {index + 1}</h3>

                  {/* Event Information Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Informações do Evento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Data e Hora</Label>
                          <Input
                            type="datetime-local"
                            value={data.eventDate}
                            onChange={(e) => updateEditableField(index, 'eventDate', e.target.value)}
                            data-testid={`input-event-date-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lucro (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={data.profitPercentage}
                            onChange={(e) => updateEditableField(index, 'profitPercentage', e.target.value)}
                            data-testid={`input-profit-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Esporte</Label>
                          <Input
                            value={data.sport}
                            onChange={(e) => updateEditableField(index, 'sport', e.target.value)}
                            data-testid={`input-sport-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Liga</Label>
                          <Input
                            value={data.league}
                            onChange={(e) => updateEditableField(index, 'league', e.target.value)}
                            data-testid={`input-league-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Time A</Label>
                          <Input
                            value={data.teamA}
                            onChange={(e) => updateEditableField(index, 'teamA', e.target.value)}
                            data-testid={`input-teamA-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Time B</Label>
                          <Input
                            value={data.teamB}
                            onChange={(e) => updateEditableField(index, 'teamB', e.target.value)}
                            data-testid={`input-teamB-${index}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bet 1 Card */}
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="bg-blue-50 dark:bg-blue-950">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Aposta 1
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Casa de Apostas (Extraído)</Label>
                          <Input
                            value={data.bet1House}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Input
                            value={data.bet1Type}
                            onChange={(e) => updateEditableField(index, 'bet1Type', e.target.value)}
                            data-testid={`input-bet1-type-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Titular da Conta *</Label>
                          <Select
                            value={data.bet1SelectedHouseId || ""}
                            onValueChange={(value) => updateEditableField(index, 'bet1SelectedHouseId', value)}
                          >
                            <SelectTrigger data-testid={`select-bet1-house-${index}`}>
                              <SelectValue placeholder="Selecione o titular" />
                            </SelectTrigger>
                            <SelectContent>
                              {bettingHouses.map((house) => (
                                <SelectItem key={house.id} value={house.id}>
                                  {house.accountHolder?.name} - {house.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Odd</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={data.bet1Odd}
                            onChange={(e) => updateEditableField(index, 'bet1Odd', e.target.value)}
                            data-testid={`input-bet1-odd-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stake (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={data.bet1Stake}
                            onChange={(e) => updateEditableField(index, 'bet1Stake', e.target.value)}
                            data-testid={`input-bet1-stake-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lucro Potencial (R$)</Label>
                          <Input
                            value={(parseFloat(data.bet1Stake || '0') * parseFloat(data.bet1Odd || '0') - parseFloat(data.bet1Stake || '0')).toFixed(2)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bet 2 Card */}
                  <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader className="bg-purple-50 dark:bg-purple-950">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Aposta 2
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Casa de Apostas (Extraído)</Label>
                          <Input
                            value={data.bet2House}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Input
                            value={data.bet2Type}
                            onChange={(e) => updateEditableField(index, 'bet2Type', e.target.value)}
                            data-testid={`input-bet2-type-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Titular da Conta *</Label>
                          <Select
                            value={data.bet2SelectedHouseId || ""}
                            onValueChange={(value) => updateEditableField(index, 'bet2SelectedHouseId', value)}
                          >
                            <SelectTrigger data-testid={`select-bet2-house-${index}`}>
                              <SelectValue placeholder="Selecione o titular" />
                            </SelectTrigger>
                            <SelectContent>
                              {bettingHouses.map((house) => (
                                <SelectItem key={house.id} value={house.id}>
                                  {house.accountHolder?.name} - {house.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Odd</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={data.bet2Odd}
                            onChange={(e) => updateEditableField(index, 'bet2Odd', e.target.value)}
                            data-testid={`input-bet2-odd-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stake (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={data.bet2Stake}
                            onChange={(e) => updateEditableField(index, 'bet2Stake', e.target.value)}
                            data-testid={`input-bet2-stake-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lucro Potencial (R$)</Label>
                          <Input
                            value={(parseFloat(data.bet2Stake || '0') * parseFloat(data.bet2Odd || '0') - parseFloat(data.bet2Stake || '0')).toFixed(2)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
