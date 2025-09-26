import type { OCRResult } from "@shared/schema";

interface MistralResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OCRService {
  private apiKey: string;
  private baseUrl = "https://api.mistral.ai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processImage(imageBase64: string): Promise<OCRResult> {
    try {
      const prompt = `
Analise esta imagem de aposta surebet e extraia as seguintes informações em formato JSON:

{
  "date": "data do evento no formato DD/MM/YY HH:MM",
  "sport": "esporte (ex: Futebol, Basquete)",
  "league": "liga ou campeonato",
  "teamA": "primeiro time/equipe",
  "teamB": "segundo time/equipe",
  "bet1": {
    "house": "nome da casa de apostas",
    "odd": "valor da odd em decimal",
    "type": "tipo da aposta (ex: Acima 2.25, Over 77.5)",
    "stake": "valor da aposta em número",
    "profit": "lucro estimado em número"
  },
  "bet2": {
    "house": "nome da segunda casa de apostas",
    "odd": "valor da odd em decimal",
    "type": "tipo da aposta (ex: Abaixo 2.25, Under 77.5)",
    "stake": "valor da aposta em número",
    "profit": "lucro estimado em número"
  },
  "profitPercentage": "percentual de lucro em número decimal"
}

Extraia apenas os dados visíveis na imagem. Se algum dado não estiver claro, use valores razoáveis baseados no contexto.
Retorne APENAS o JSON, sem texto adicional.`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "pixtral-12b-2409",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
      }

      const data: MistralResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from Mistral API');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Validate and format the response
      return {
        date: extractedData.date || new Date().toLocaleDateString('pt-BR'),
        sport: extractedData.sport || 'Futebol',
        league: extractedData.league || 'Liga não especificada',
        teamA: extractedData.teamA || 'Time A',
        teamB: extractedData.teamB || 'Time B',
        bet1: {
          house: extractedData.bet1?.house || 'Casa 1',
          odd: parseFloat(extractedData.bet1?.odd) || 2.0,
          type: extractedData.bet1?.type || 'Aposta 1',
          stake: parseFloat(extractedData.bet1?.stake) || 1000,
          profit: parseFloat(extractedData.bet1?.profit) || 50,
        },
        bet2: {
          house: extractedData.bet2?.house || 'Casa 2',
          odd: parseFloat(extractedData.bet2?.odd) || 2.0,
          type: extractedData.bet2?.type || 'Aposta 2',
          stake: parseFloat(extractedData.bet2?.stake) || 1000,
          profit: parseFloat(extractedData.bet2?.profit) || 50,
        },
        profitPercentage: parseFloat(extractedData.profitPercentage) || 2.0,
      };

    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processImageFromBuffer(imageBuffer: Buffer): Promise<OCRResult> {
    const base64Image = imageBuffer.toString('base64');
    return this.processImage(base64Image);
  }
}