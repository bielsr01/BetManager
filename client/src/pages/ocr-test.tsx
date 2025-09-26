import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TestTube, FileText, Wand2, Copy, CheckCircle } from "lucide-react";

export default function OCRTest() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawText, setRawText] = useState("");
  const [structuredData, setStructuredData] = useState<any>(null);

  const handleImageUpload = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setRawText("");
    setStructuredData(null);
    
    // Simulate OCR processing
    setIsProcessing(true);
    
    // Mock OCR processing delay
    setTimeout(() => {
      //todo: remove mock functionality
      const mockRawText = `London Lions – Bristol Flyers
Basquete / British - SLB

Chance                     Aposta           D  C    Lucro
Pinnacle (BR)  Acima 77.5  1ª a metade    2.130     2297.96  USD    124.65
Betano (BR)    Abaixo 77.5  1ª a metade   1.980     2472.04  USD    124.64

Aposta total:                              4770     USD
                                          
Mostrar comissões
Use sua própria taxa de câmbio
Arredondar aposta até:  1
Levar em consideração as taxas de câmbio ao arredondar

Evento em aproximadamente 10 horas (2025-09-26 16:30 +03:00)
ROI: 1922.75%`;

      const mockStructuredData = {
        date: "26/09/25 16:30",
        sport: "Basquete",
        league: "British - SLB",
        teamA: "London Lions",
        teamB: "Bristol Flyers",
        bet1: {
          house: "Pinnacle",
          odd: 2.130,
          type: "Acima 77.5 1ª a metade",
          stake: 2297.96,
          profit: 124.65,
        },
        bet2: {
          house: "Betano",
          odd: 1.980,
          type: "Abaixo 77.5 1ª a metade",
          stake: 2472.04,
          profit: 124.64,
        },
        profitPercentage: 2.61,
      };

      setRawText(mockRawText);
      setStructuredData(mockStructuredData);
      setIsProcessing(false);
    }, 3000);
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

  const processWithOCR = () => {
    if (!uploadedImage) return;
    handleImageUpload(new File([], "test")); // Trigger processing again
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
            <CardContent>
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                uploadedImage={uploadedImage}
                isProcessing={isProcessing}
              />
              
              {uploadedImage && !isProcessing && (
                <div className="mt-4">
                  <Button 
                    onClick={processWithOCR} 
                    className="w-full"
                    data-testid="button-process-ocr"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Processar com OCR
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
                    <p className="font-medium">{structuredData.date}</p>
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
                  data-testid="button-use-data"
                >
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