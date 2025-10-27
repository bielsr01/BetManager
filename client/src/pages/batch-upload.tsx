import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function BatchUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [extractedBets, setExtractedBets] = useState<ExtractedBet[]>([]);
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
    }
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
      return `${day}/${month}/${year} ${timePart}`;
    } catch {
      return isoDate;
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

  const createAllBets = async () => {
    const successfulBets = extractedBets.filter(bet => bet.success && bet.data);
    
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

      for (const bet of successfulBets) {
        try {
          const data = bet.data!;
          
          const house1 = findBettingHouse(data.bet1.house);
          const house2 = findBettingHouse(data.bet2.house);

          if (!house1 || !house2) {
            errors.push(`${bet.fileName}: Casas de apostas não encontradas no sistema`);
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
                bettingHouseId: house1.id,
                odd: data.bet1.odd,
                type: data.bet1.type,
                stake: data.bet1.stake,
                result: null,
                returnAmount: null,
              },
              {
                bettingHouseId: house2.id,
                odd: data.bet2.odd,
                type: data.bet2.type,
                stake: data.bet2.stake,
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
                Revise as apostas extraídas antes de adicioná-las ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
                            {bet.success && bet.data && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {bet.data.teamA} vs {bet.data.teamB}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={bet.success ? "default" : "destructive"}>
                          {bet.success ? "Sucesso" : "Erro"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bet.success && bet.data ? (
                        <div className="grid gap-3 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-muted-foreground">Data:</span>
                              <p className="font-medium">{formatDateForDisplay(bet.data.date)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Esporte/Liga:</span>
                              <p className="font-medium">{bet.data.sport} / {bet.data.league}</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                              <p className="font-semibold text-xs text-blue-700 dark:text-blue-400 mb-2">APOSTA 1</p>
                              <div className="space-y-1">
                                <p><span className="text-muted-foreground">Casa:</span> {bet.data.bet1.house}</p>
                                <p><span className="text-muted-foreground">Tipo:</span> {bet.data.bet1.type}</p>
                                <p><span className="text-muted-foreground">Odd:</span> {bet.data.bet1.odd}</p>
                                <p><span className="text-muted-foreground">Stake:</span> R$ {bet.data.bet1.stake.toFixed(2)}</p>
                              </div>
                            </div>

                            <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                              <p className="font-semibold text-xs text-purple-700 dark:text-purple-400 mb-2">APOSTA 2</p>
                              <div className="space-y-1">
                                <p><span className="text-muted-foreground">Casa:</span> {bet.data.bet2.house}</p>
                                <p><span className="text-muted-foreground">Tipo:</span> {bet.data.bet2.type}</p>
                                <p><span className="text-muted-foreground">Odd:</span> {bet.data.bet2.odd}</p>
                                <p><span className="text-muted-foreground">Stake:</span> R$ {bet.data.bet2.stake.toFixed(2)}</p>
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
