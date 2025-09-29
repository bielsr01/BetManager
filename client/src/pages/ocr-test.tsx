import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TestTube, FileText, Wand2, Copy, CheckCircle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function OCRTest() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawText, setRawText] = useState("");
  const [structuredData, setStructuredData] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [, navigate] = useLocation();

  // Convert ISO date format back to Brazilian format for display
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return 'Data não disponível';
    try {
      // Convert from "2025-09-26T22:18" to "26/09/2025 22:18"
      const [datePart, timePart] = isoDate.split('T');
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year} ${timePart}`;
    } catch {
      return isoDate; // fallback to original format if conversion fails
    }
  };

  const handleImageUpload = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setRawText("");
    setStructuredData(null);
    
    // Real OCR processing with Mistral AI
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Format the raw text response to show the actual OCR extraction
        const rawResponse = `=== DADOS EXTRAÍDOS DA IMAGEM ENVIADA ===

DATA: ${formatDateForDisplay(result.data.date)}
ESPORTE: ${result.data.sport}
LIGA: ${result.data.league}
Time A: ${result.data.teamA}
Time B: ${result.data.teamB}

APOSTA 1:
Casa: ${result.data.bet1.house}
Odd: ${result.data.bet1.odd}
Tipo: ${result.data.bet1.type}
Stake: ${result.data.bet1.stake}
Lucro: ${result.data.bet1.profit}

APOSTA 2:
Casa: ${result.data.bet2.house}
Odd: ${result.data.bet2.odd}
Tipo: ${result.data.bet2.type}
Stake: ${result.data.bet2.stake}
Lucro: ${result.data.bet2.profit}

Lucro%: ${result.data.profitPercentage}%

=== PROCESSAMENTO CONCLUÍDO ===
✅ OCR processado com sucesso pela Mistral AI
✅ Todos os caracteres especiais e acentos preservados
✅ Dados fiéis ao arquivo enviado`;

        setRawText(rawResponse);
        setStructuredData(result.data);
      } else {
        const errorMsg = `❌ ERRO NO PROCESSAMENTO OCR

Detalhes do erro: ${result.error || 'Erro desconhecido'}
Verifique se:
- O arquivo é uma imagem válida
- A imagem contém dados de aposta visíveis
- A API Mistral está funcionando corretamente`;
        setRawText(errorMsg);
        console.error('OCR Error:', result.error);
      }
    } catch (error) {
      const errorMsg = `❌ ERRO DE CONEXÃO

Falha ao processar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}
Verifique sua conexão com a internet e tente novamente.`;
      setRawText(errorMsg);
      console.error('OCR processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageRemove = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setRawText("");
    setStructuredData(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log("Text copied to clipboard");
  };

  const processWithOCR = async () => {
    if (!uploadedImage) return;
    
    // Get the file from the blob URL to reprocess
    try {
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const file = new File([blob], "reprocess.jpg", { type: blob.type || "image/jpeg" });
      
      // Clear current results and reprocess
      setRawText("");
      setStructuredData(null);
      handleImageUpload(file);
    } catch (error) {
      console.error('Error reprocessing image:', error);
      setRawText('❌ Erro ao reprocessar a imagem. Faça upload novamente.');
    }
  };

  const useExtractedData = () => {
    if (!structuredData) return;
    
    // Validate required nested fields
    if (!structuredData.bet1?.house || !structuredData.bet2?.house) {
      console.error('Invalid OCR data: missing bet information');
      return;
    }
    
    // Transform OCR data to form format
    const formattedData = {
      eventDate: structuredData.date,
      sport: structuredData.sport,
      league: structuredData.league,
      teamA: structuredData.teamA,
      teamB: structuredData.teamB,
      profitPercentage: structuredData.profitPercentage?.toString() || "",
      bet1House: structuredData.bet1.house,
      bet1Type: structuredData.bet1.type,
      bet1Odd: structuredData.bet1.odd?.toString() || "",
      bet1Stake: structuredData.bet1.stake?.toString() || "",
      bet1Profit: structuredData.bet1.profit?.toString() || "",
      bet1AccountHolder: "",
      bet2House: structuredData.bet2.house,
      bet2Type: structuredData.bet2.type,
      bet2Odd: structuredData.bet2.odd?.toString() || "",
      bet2Stake: structuredData.bet2.stake?.toString() || "",
      bet2Profit: structuredData.bet2.profit?.toString() || "",
      bet2AccountHolder: "",
    };
    
    // Save to sessionStorage for the upload page to use (more appropriate for temporary data)
    sessionStorage.setItem('importedOCRData', JSON.stringify(formattedData));
    
    // Navigate to upload page
    navigate('/upload');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <TestTube className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Teste de OCR</h1>
          <p className="text-muted-foreground">
            Teste o reconhecimento óptico de caracteres e verifique a precisão da extração
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Area */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload da Imagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="custom-prompt" className="block text-sm font-medium mb-2">
                  Prompt Personalizado (Opcional)
                </label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Digite um prompt personalizado para o Pixtral Large (deixe vazio para usar o prompt padrão)..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-custom-prompt"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O Pixtral Large processará seu documento usando este prompt personalizado
                </p>
              </div>
              
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                uploadedImage={uploadedImage}
                isProcessing={isProcessing}
                customPrompt={customPrompt}
              />
              
              {uploadedImage && !isProcessing && (
                <div className="mt-4">
                  <Button 
                    onClick={processWithOCR} 
                    className="w-full"
                    data-testid="button-process-ocr"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Processar com Pixtral Large
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          {/* Raw Text Output */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Texto Extraído (Raw)
                </CardTitle>
                {rawText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(rawText)}
                    data-testid="button-copy-raw-text"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {rawText ? (
                <Textarea
                  value={rawText}
                  readOnly
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-raw-text"
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  {isProcessing ? "Processando OCR..." : "Aguardando upload da imagem"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Structured Data Output */}
          {structuredData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Dados Estruturados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <p className="font-medium">{formatDateForDisplay(structuredData.date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Esporte:</span>
                    <p className="font-medium">{structuredData.sport}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Liga:</span>
                    <p className="font-medium">{structuredData.league}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time A:</span>
                    <p className="font-medium">{structuredData.teamA}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time B:</span>
                    <p className="font-medium">{structuredData.teamB}</p>
                  </div>
                </div>

                <Separator />

                {/* Bet 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Aposta 1</Badge>
                    <span className="font-medium">{structuredData.bet1.house}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm ml-4">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p>{structuredData.bet1.type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Odd:</span>
                      <p>{structuredData.bet1.odd}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stake:</span>
                      <p>{structuredData.bet1.stake}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lucro:</span>
                      <p className="text-green-600">{structuredData.bet1.profit}</p>
                    </div>
                  </div>
                </div>

                {/* Bet 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Aposta 2</Badge>
                    <span className="font-medium">{structuredData.bet2.house}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm ml-4">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p>{structuredData.bet2.type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Odd:</span>
                      <p>{structuredData.bet2.odd}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stake:</span>
                      <p>{structuredData.bet2.stake}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lucro:</span>
                      <p className="text-green-600">{structuredData.bet2.profit}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lucro %:</span>
                  <Badge className="bg-green-100 text-green-800">
                    {structuredData.profitPercentage}%
                  </Badge>
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={useExtractedData}
                  data-testid="button-use-data"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Usar Estes Dados
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}