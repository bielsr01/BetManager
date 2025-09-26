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

  const handleImageUpload = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setIsProcessing(true);
  };

  const handleOCRComplete = (ocrData: any) => {
    // Transform OCR data to form format
    const formattedData = {
      eventDate: ocrData.date,
      sport: ocrData.sport,
      league: ocrData.league,
      teamA: ocrData.teamA,
      teamB: ocrData.teamB,
      profitPercentage: ocrData.profitPercentage.toString(),
      bet1House: ocrData.bet1.house,
      bet1Type: ocrData.bet1.type,
      bet1Odd: ocrData.bet1.odd.toString(),
      bet1Stake: ocrData.bet1.stake.toString(),
      bet1Profit: ocrData.bet1.profit.toString(),
      bet1AccountHolder: "",
      bet2House: ocrData.bet2.house,
      bet2Type: ocrData.bet2.type,
      bet2Odd: ocrData.bet2.odd.toString(),
      bet2Stake: ocrData.bet2.stake.toString(),
      bet2Profit: ocrData.bet2.profit.toString(),
      bet2AccountHolder: "",
    };
    
    setExtractedData(formattedData);
    setIsProcessing(false);
    setCurrentStep("edit");
  };

  const handleOCRError = (error: string) => {
    console.error("OCR Error:", error);
    setIsProcessing(false);
    // You could show a toast notification here
  };

  const handleImageRemove = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setExtractedData(null);
    setCurrentStep("upload");
  };

  const handleFormSubmit = async (data: any) => {
    try {
      // Create surebet set and bets
      const surebetSetData = {
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        sport: data.sport,
        league: data.league,
        teamA: data.teamA,
        teamB: data.teamB,
        profitPercentage: data.profitPercentage,
        status: "pending",
      };

      const bet1Data = {
        betType: data.bet1Type,
        odd: data.bet1Odd,
        stake: data.bet1Stake,
        potentialProfit: data.bet1Profit,
        bettingHouseId: null, // This would need to be selected from account holders
      };

      const bet2Data = {
        betType: data.bet2Type,
        odd: data.bet2Odd,
        stake: data.bet2Stake,
        potentialProfit: data.bet2Profit,
        bettingHouseId: null, // This would need to be selected from account holders
      };

      const response = await fetch('/api/surebet-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surebetSet: surebetSetData,
          bets: [bet1Data, bet2Data],
        }),
      });

      if (response.ok) {
        console.log("Bet saved successfully!");
        // Redirect to dashboard after save
        window.location.href = "/";
      } else {
        console.error("Failed to save bet");
      }
    } catch (error) {
      console.error("Error saving bet:", error);
    }
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
            onOCRComplete={handleOCRComplete}
            onOCRError={handleOCRError}
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