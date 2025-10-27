import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { BettingHouse } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ExtractedBet {
  fileName: string;
  success: boolean;
  error?: string;
  data?: {
    date: string;
    sport: string;
    league: string;
    teamA: string;
    teamB: string;
    bet1: {
      house: string;
      odd: number;
      type: string;
      stake: number;
      profit: number;
    };
    bet2: {
      house: string;
      odd: number;
      type: string;
      stake: number;
      profit: number;
    };
    profitPercentage: number;
  };
}

interface EditableBetData {
  date: string;
  sport: string;
  league: string;
  teamA: string;
  teamB: string;
  bet1HouseId: string;
  bet1Odd: string;
  bet1Type: string;
  bet1Stake: string;
  bet2HouseId: string;
  bet2Odd: string;
  bet2Type: string;
  bet2Stake: string;
}

export default function BatchUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [extractedBets, setExtractedBets] = useState<ExtractedBet[]>([]);
  const [editableData, setEditableData] = useState<Record<number, EditableBetData>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: bettingHouses } = useQuery<BettingHouse[]>({
    queryKey: ['/api/betting-houses'],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length !== selectedFiles.length) {
        toast({
          title: "Alguns arquivos foram ignorados",
          description: "Apenas arquivos PDF são aceitos",
          variant: "destructive",
        });
      }
      
      setFiles(pdfFiles);
      setExtractedBets([]);
      setEditableData({});
    }
  };

  const findBettingHouse = (houseName: string) => {
    if (!bettingHouses) return null;
    
    const cleanName = houseName.replace(/\s*\([A-Z]{2}\)\s*/, '').trim().toLowerCase();
    
    return bettingHouses.find(house => {
      const houseNameClean = house.name.toLowerCase();
      return houseNameClean.includes(cleanName) || cleanName.includes(houseNameClean);
    });
  };

  const processAllPdfs = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione arquivos PDF primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setExtractedBets([]);
    setEditableData({});

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/ocr/process-batch', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setExtractedBets(result.results);
        
        // Initialize editable data for successful extractions
        const initialEditableData: Record<number, EditableBetData> = {};
        result.results.forEach((bet: ExtractedBet, index: number) => {
          if (bet.success && bet.data) {
            const house1 = findBettingHouse(bet.data.bet1.house);
            const house2 = findBettingHouse(bet.data.bet2.house);
            
            initialEditableData[index] = {
              date: bet.data.date,
              sport: bet.data.sport,
              league: bet.data.league,
              teamA: bet.data.teamA,
              teamB: bet.data.teamB,
              bet1HouseId: house1?.id || '',
              bet1Odd: bet.data.bet1.odd.toString(),
              bet1Type: bet.data.bet1.type,
              bet1Stake: bet.data.bet1.stake.toString(),
              bet2HouseId: house2?.id || '',
              bet2Odd: bet.data.bet2.odd.toString(),
              bet2Type: bet.data.bet2.type,
              bet2Stake: bet.data.bet2.stake.toString(),
            };
          }
        });
        setEditableData(initialEditableData);
        
        const successCount = result.results.filter((r: ExtractedBet) => r.success).length;
        const failCount = result.results.length - successCount;
        
        toast({
          title: "Processamento concluído",
          description: `${successCount} PDFs processados com sucesso${failCount > 0 ? `, ${failCount} com erro` : ''}`,
        });
      } else {
        toast({
          title: "Erro no processamento",
          description: result.error || "Erro ao processar PDFs",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: "Falha ao processar PDFs. Tente novamente.",
        variant: "destructive",
      });
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return 'Data não disponível';
    try {
      const [datePart, timePart] = isoDate.split('T');
      const [year, month, day] = datePart.split('-');
      const time = timePart || '00:00';
      return `${day}/${month}/${year} ${time}`;
    } catch {
      return isoDate;
    }
  };

  const formatDateForInput = (isoDate: string): string => {
    if (!isoDate) return '';
    try {
      // Remove seconds and milliseconds for datetime-local input
      return isoDate.substring(0, 16);
    } catch {
      return '';
    }
  };

  const updateEditableField = (index: number, field: keyof EditableBetData, value: string) => {
    setEditableData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const calculateProfit = (data: EditableBetData) => {
    const odd1 = parseFloat(data.bet1Odd) || 0;
    const stake1 = parseFloat(data.bet1Stake) || 0;
    const odd2 = parseFloat(data.bet2Odd) || 0;
    const stake2 = parseFloat(data.bet2Stake) || 0;

    const totalInvested = stake1 + stake2;
    const return1 = stake1 * odd1;
    const return2 = stake2 * odd2;
    const minReturn = Math.min(return1, return2);
    const profit = minReturn - totalInvested;
    const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return {
      profit,
      profitPercentage,
      totalInvested,
      return1,
      return2
    };
  };

  const createAllBets = async () => {
    const successfulBets = extractedBets
      .map((bet, index) => ({ bet, index }))
      .filter(({ bet }) => bet.success && bet.data);
    
    if (successfulBets.length === 0) {
      toast({
        title: "Nenhuma aposta para criar",
        description: "Não há apostas extraídas com sucesso",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const { bet, index } of successfulBets) {
        try {
          const data = editableData[index];
          
          if (!data) {
            errors.push(`${bet.fileName}: Dados editáveis não encontrados`);
            failed++;
            continue;
          }

          if (!data.bet1HouseId || !data.bet2HouseId) {
            errors.push(`${bet.fileName}: Selecione as casas de apostas`);
            failed++;
            continue;
          }

          const surebetPayload = {
            surebetSet: {
              eventDate: data.date,
              sport: data.sport,
              league: data.league,
              teamA: data.teamA,
              teamB: data.teamB,
              status: 'pending' as const,
            },
            bets: [
              {
                bettingHouseId: data.bet1HouseId,
                odd: parseFloat(data.bet1Odd),
                type: data.bet1Type,
                stake: parseFloat(data.bet1Stake),
                result: null,
                returnAmount: null,
              },
              {
                bettingHouseId: data.bet2HouseId,
                odd: parseFloat(data.bet2Odd),
                type: data.bet2Type,
                stake: parseFloat(data.bet2Stake),
                result: null,
                returnAmount: null,
              }
            ]
          };

          await apiRequest('POST', '/api/surebet-sets', surebetPayload);

          created++;
        } catch (error) {
          errors.push(`${bet.fileName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          failed++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/surebet-sets'] });

      if (created > 0) {
        toast({
          title: "Apostas criadas com sucesso",
          description: `${created} aposta(s) adicionada(s) ao sistema${failed > 0 ? `. ${failed} falhou(aram)` : ''}`,
        });

        if (failed === 0) {
          setTimeout(() => navigate('/management'), 1500);
        }
      }

      if (errors.length > 0 && failed > 0) {
        console.error('Erros na criação:', errors);
        toast({
          title: "Alguns erros ocorreram",
          description: `${failed} aposta(s) não puderam ser criadas. Verifique o console.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Erro ao criar apostas",
        description: "Falha ao adicionar apostas ao sistema",
        variant: "destructive",
      });
      console.error('Batch creation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Package className="h-8 w-8" />
          Enviar Lote de Apostas
        </h1>
        <p className="text-muted-foreground">
          Envie múltiplos PDFs de uma vez e crie todas as apostas automaticamente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Arquivos PDF</CardTitle>
          <CardDescription>
            Escolha um ou mais arquivos PDF de surebets para processar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              id="batch-file-input"
              className="hidden"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileSelect}
              data-testid="input-batch-files"
            />
            <label htmlFor="batch-file-input">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('batch-file-input')?.click()}
                data-testid="button-select-files"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar PDFs
              </Button>
            </label>
            
            {files.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  {files.length} arquivo(s) selecionado(s)
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiles([]);
                    setExtractedBets([]);
                    setEditableData({});
                  }}
                  data-testid="button-clear-files"
                >
                  Limpar
                </Button>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Arquivos selecionados:</p>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
                    data-testid={`file-item-${index}`}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={processAllPdfs}
            disabled={files.length === 0 || isProcessing}
            className="w-full"
            data-testid="button-process-batch"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando {files.length} PDF(s)...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Processar {files.length > 0 ? `${files.length} PDF(s)` : 'PDFs'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {extractedBets.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Apostas Extraídas</span>
                <Badge variant="outline">
                  {extractedBets.filter(b => b.success).length} / {extractedBets.length} sucesso
                </Badge>
              </CardTitle>
              <CardDescription>
                Revise e edite as apostas extraídas antes de adicioná-las ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {extractedBets.map((bet, index) => (
                  <Card
                    key={index}
                    className={bet.success ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}
                    data-testid={`extracted-bet-${index}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {bet.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{bet.fileName}</p>
                          </div>
                        </div>
                        <Badge variant={bet.success ? "default" : "destructive"}>
                          {bet.success ? "Sucesso" : "Erro"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bet.success && bet.data && editableData[index] ? (
                        <div className="space-y-4">
                          {/* Event Details - Editable */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`date-${index}`}>Data do Evento</Label>
                              <Input
                                id={`date-${index}`}
                                type="datetime-local"
                                value={formatDateForInput(editableData[index].date)}
                                onChange={(e) => updateEditableField(index, 'date', e.target.value)}
                                data-testid={`input-date-${index}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`sport-${index}`}>Esporte</Label>
                              <Input
                                id={`sport-${index}`}
                                value={editableData[index].sport}
                                onChange={(e) => updateEditableField(index, 'sport', e.target.value)}
                                data-testid={`input-sport-${index}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`league-${index}`}>Liga</Label>
                              <Input
                                id={`league-${index}`}
                                value={editableData[index].league}
                                onChange={(e) => updateEditableField(index, 'league', e.target.value)}
                                data-testid={`input-league-${index}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`teamA-${index}`}>Time A</Label>
                              <Input
                                id={`teamA-${index}`}
                                value={editableData[index].teamA}
                                onChange={(e) => updateEditableField(index, 'teamA', e.target.value)}
                                data-testid={`input-teamA-${index}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`teamB-${index}`}>Time B</Label>
                              <Input
                                id={`teamB-${index}`}
                                value={editableData[index].teamB}
                                onChange={(e) => updateEditableField(index, 'teamB', e.target.value)}
                                data-testid={`input-teamB-${index}`}
                              />
                            </div>
                          </div>

                          {/* Bets - Editable */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Bet 1 */}
                            <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-3">
                              <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">APOSTA 1</p>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`bet1-house-${index}`}>Casa de Aposta</Label>
                                <Select
                                  value={editableData[index].bet1HouseId}
                                  onValueChange={(value) => updateEditableField(index, 'bet1HouseId', value)}
                                >
                                  <SelectTrigger id={`bet1-house-${index}`} data-testid={`select-bet1-house-${index}`}>
                                    <SelectValue placeholder="Selecione a casa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bettingHouses?.map((house) => (
                                      <SelectItem key={house.id} value={house.id}>
                                        {house.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`bet1-type-${index}`}>Tipo de Aposta</Label>
                                <Input
                                  id={`bet1-type-${index}`}
                                  value={editableData[index].bet1Type}
                                  onChange={(e) => updateEditableField(index, 'bet1Type', e.target.value)}
                                  data-testid={`input-bet1-type-${index}`}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label htmlFor={`bet1-odd-${index}`}>Odd</Label>
                                  <Input
                                    id={`bet1-odd-${index}`}
                                    type="number"
                                    step="0.001"
                                    value={editableData[index].bet1Odd}
                                    onChange={(e) => updateEditableField(index, 'bet1Odd', e.target.value)}
                                    data-testid={`input-bet1-odd-${index}`}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`bet1-stake-${index}`}>Stake (R$)</Label>
                                  <Input
                                    id={`bet1-stake-${index}`}
                                    type="number"
                                    step="0.01"
                                    value={editableData[index].bet1Stake}
                                    onChange={(e) => updateEditableField(index, 'bet1Stake', e.target.value)}
                                    data-testid={`input-bet1-stake-${index}`}
                                  />
                                </div>
                              </div>

                              <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-muted-foreground">
                                  Retorno: <span className="font-semibold text-foreground">
                                    R$ {calculateProfit(editableData[index]).return1.toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Bet 2 */}
                            <div className="p-4 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 space-y-3">
                              <p className="font-semibold text-sm text-purple-700 dark:text-purple-400">APOSTA 2</p>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`bet2-house-${index}`}>Casa de Aposta</Label>
                                <Select
                                  value={editableData[index].bet2HouseId}
                                  onValueChange={(value) => updateEditableField(index, 'bet2HouseId', value)}
                                >
                                  <SelectTrigger id={`bet2-house-${index}`} data-testid={`select-bet2-house-${index}`}>
                                    <SelectValue placeholder="Selecione a casa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bettingHouses?.map((house) => (
                                      <SelectItem key={house.id} value={house.id}>
                                        {house.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`bet2-type-${index}`}>Tipo de Aposta</Label>
                                <Input
                                  id={`bet2-type-${index}`}
                                  value={editableData[index].bet2Type}
                                  onChange={(e) => updateEditableField(index, 'bet2Type', e.target.value)}
                                  data-testid={`input-bet2-type-${index}`}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label htmlFor={`bet2-odd-${index}`}>Odd</Label>
                                  <Input
                                    id={`bet2-odd-${index}`}
                                    type="number"
                                    step="0.001"
                                    value={editableData[index].bet2Odd}
                                    onChange={(e) => updateEditableField(index, 'bet2Odd', e.target.value)}
                                    data-testid={`input-bet2-odd-${index}`}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`bet2-stake-${index}`}>Stake (R$)</Label>
                                  <Input
                                    id={`bet2-stake-${index}`}
                                    type="number"
                                    step="0.01"
                                    value={editableData[index].bet2Stake}
                                    onChange={(e) => updateEditableField(index, 'bet2Stake', e.target.value)}
                                    data-testid={`input-bet2-stake-${index}`}
                                  />
                                </div>
                              </div>

                              <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                                <p className="text-sm text-muted-foreground">
                                  Retorno: <span className="font-semibold text-foreground">
                                    R$ {calculateProfit(editableData[index]).return2.toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Profit Summary */}
                          <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Investido</p>
                                <p className="font-semibold text-lg" data-testid={`invested-${index}`}>
                                  R$ {calculateProfit(editableData[index]).totalInvested.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Retorno Mínimo</p>
                                <p className="font-semibold text-lg" data-testid={`min-return-${index}`}>
                                  R$ {Math.min(
                                    calculateProfit(editableData[index]).return1,
                                    calculateProfit(editableData[index]).return2
                                  ).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Lucro</p>
                                <p className={`font-semibold text-lg ${calculateProfit(editableData[index]).profit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`profit-${index}`}>
                                  R$ {calculateProfit(editableData[index]).profit.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Porcentagem</p>
                                <p className={`font-semibold text-lg ${calculateProfit(editableData[index]).profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`percentage-${index}`}>
                                  {calculateProfit(editableData[index]).profitPercentage.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          <p className="font-medium">Erro:</p>
                          <p className="text-xs mt-1">{bet.error || "Erro desconhecido ao processar PDF"}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {extractedBets.some(b => b.success) && (
            <Card className="border-green-200 dark:border-green-900">
              <CardContent className="pt-6">
                <Button
                  onClick={createAllBets}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                  data-testid="button-create-all-bets"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Criando apostas...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Adicionar Todas as Apostas ao Sistema ({extractedBets.filter(b => b.success).length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
