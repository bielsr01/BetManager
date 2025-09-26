import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { BetForm } from "@/components/bet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Wand2 } from "lucide-react";
import { Link } from "wouter";

type UploadStep = "upload" | "edit";

export default function UploadPage() {
  const [currentStep, setCurrentStep] = useState<UploadStep>("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleImageUpload = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    
    // Simulate OCR processing
    setIsProcessing(true);
    
    setTimeout(() => {
      //todo: remove mock functionality
      const mockExtractedData = {
        eventDate: "2024-09-29T15:48:00",
        sport: "Futebol",
        league: "Liga Pro Jupiler",
        teamA: "OH Leuven",
        teamB: "Anderlecht",
        profitPercentage: "2.22",
        bet1House: "Pinnacle",
        bet1Type: "Acima 2.25",
        bet1Odd: "2.25",
        bet1Stake: "2650.00",
        bet1Profit: "106.00",
        bet1AccountHolder: "holder1",
        bet2House: "Betano",
        bet2Type: "Abaixo 2.25",
        bet2Odd: "2.25",
        bet2Stake: "2120.00",
        bet2Profit: "106.00",
        bet2AccountHolder: "holder2",
      };
      
      setExtractedData(mockExtractedData);
      setIsProcessing(false);
      setCurrentStep("edit");
    }, 3000);
  };

  const handleImageRemove = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setExtractedData(null);
    setCurrentStep("upload");
  };

  const handleFormSubmit = (data: any) => {
    console.log("Bet data submitted:", data);
    // Here would be API call to save the bet
    
    // Redirect to dashboard after save
    window.location.href = "/";
  };

  const handleCancel = () => {
    setCurrentStep("upload");
    setExtractedData(null);
  };

  if (currentStep === "edit" && extractedData) {
    return (
      <div className="p-6">
        <BetForm
          initialData={extractedData}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nova Aposta</h1>
          <p className="text-muted-foreground">
            Faça upload de um screenshot para extrair automaticamente os dados da aposta
          </p>
        </div>
        
        <Link href="/">
          <Button variant="outline" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload da Imagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            uploadedImage={uploadedImage}
            isProcessing={isProcessing}
            className="min-h-[400px]"
          />
          
          {isProcessing && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 animate-pulse" />
                <span className="text-sm">
                  Processando imagem com OCR... Isso pode levar alguns segundos.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}