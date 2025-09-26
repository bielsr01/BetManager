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
Transcreva os dados da imagem de aposta esportiva seguindo as seguintes regras e formato:
---
**Regras:**
1. **Formato de Saída:** A saída deve seguir a ordem e o formato abaixo, sem informações extras.
2. **Acentos e Símbolos:** Preserve acentos, símbolos e caracteres especiais.
3. **Separação de Times:** O que separa o Time A do Time B é um traço maior (–).
4. **Coluna de Chance:** Copie todo o conteúdo da coluna "Chance", independentemente do tamanho do texto.
5. **Lucro%:** No canto superior direito, ignore o ROI e extraia apenas o valor percentual do Lucro.
6. **Data:** Extraia apenas a data e hora no formato \`dd/mm/aaaa HH:mm\` do canto superior direito. Ignore o resto do texto na linha.
7. **Liga e Time:** O Time A e a Liga são separados pela primeira barra (/) da linha. Tudo antes da primeira barra é o Time A, e tudo depois é a Liga.
8. **Ignorar Informações Extras:** Não inclua informações como "Mostrar comissões", "Use sua própria taxa de câmbio", "Arredondar aposta até", etc.
---
**Formato de Saída:**
DATA: [dd/mm/aaaa HH:mm]
ESPORTE: [Nome do Esporte]
LIGA: [Nome da Liga]
Time A: [Nome do Time A]
Time B: [Nome do Time B]
APOSTA 1:
Casa: [Nome da Casa de Apostas]
Odd: [Valor da Odd]
Tipo: [Descrição do Tipo de Aposta]
Stake: [Valor da Aposta]
Lucro: [Valor do Lucro]
APOSTA 2:
Casa: [Nome da Casa de Apostas]
Odd: [Valor da Odd]
Tipo: [Descrição do Tipo de Aposta]
Stake: [Valor da Aposta]
Lucro: [Valor do Lucro]
Lucro%: [Valor Percentual do Lucro]`;

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

      // Parse the structured text response
      const extractValue = (text: string, label: string): string => {
        const regex = new RegExp(`${label}:\\s*(.+)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      // Extract main data
      const date = extractValue(content, 'DATA');
      const sport = extractValue(content, 'ESPORTE');
      const league = extractValue(content, 'LIGA');
      const teamA = extractValue(content, 'Time A');
      const teamB = extractValue(content, 'Time B');
      const profitPercentage = extractValue(content, 'Lucro%');

      // Extract APOSTA 1 data
      const aposta1Section = content.match(/APOSTA 1:([\s\S]*?)(?=APOSTA 2:|$)/)?.[1] || '';
      const bet1House = extractValue(aposta1Section, 'Casa');
      const bet1Odd = extractValue(aposta1Section, 'Odd');
      const bet1Type = extractValue(aposta1Section, 'Tipo');
      const bet1Stake = extractValue(aposta1Section, 'Stake');
      const bet1Profit = extractValue(aposta1Section, 'Lucro');

      // Extract APOSTA 2 data
      const aposta2Section = content.match(/APOSTA 2:([\s\S]*?)(?=Lucro%:|$)/)?.[1] || '';
      const bet2House = extractValue(aposta2Section, 'Casa');
      const bet2Odd = extractValue(aposta2Section, 'Odd');
      const bet2Type = extractValue(aposta2Section, 'Tipo');
      const bet2Stake = extractValue(aposta2Section, 'Stake');
      const bet2Profit = extractValue(aposta2Section, 'Lucro');
      
      // Validate and format the response
      return {
        date: date || new Date().toLocaleDateString('pt-BR'),
        sport: sport || 'Futebol',
        league: league || 'Liga não especificada',
        teamA: teamA || 'Time A',
        teamB: teamB || 'Time B',
        bet1: {
          house: bet1House || 'Casa 1',
          odd: parseFloat(bet1Odd.replace(',', '.')) || 2.0,
          type: bet1Type || 'Aposta 1',
          stake: parseFloat(bet1Stake.replace(/[^\d.,]/g, '').replace(',', '.')) || 1000,
          profit: parseFloat(bet1Profit.replace(/[^\d.,]/g, '').replace(',', '.')) || 50,
        },
        bet2: {
          house: bet2House || 'Casa 2',
          odd: parseFloat(bet2Odd.replace(',', '.')) || 2.0,
          type: bet2Type || 'Aposta 2',
          stake: parseFloat(bet2Stake.replace(/[^\d.,]/g, '').replace(',', '.')) || 1000,
          profit: parseFloat(bet2Profit.replace(/[^\d.,]/g, '').replace(',', '.')) || 50,
        },
        profitPercentage: parseFloat(profitPercentage.replace(/[^\d.,]/g, '').replace(',', '.')) || 2.0,
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