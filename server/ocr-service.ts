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
Analise esta imagem de comparação de apostas esportivas (surebet) e extraia os dados seguindo rigorosamente as regras abaixo:

**REGRAS CRÍTICAS:**
1. **DATA ATUAL:** Identifique a data atual REAL da imagem. Ela deve estar próxima de 2025 ou mais recente. Se vir uma data antiga como 2023, procure mais cuidadosamente por uma data atual na interface. A data verdadeira é a que representa QUANDO a aposta foi criada/calculada.
2. **CASAS DE APOSTAS:** Procure pelos nomes das casas de apostas nas colunas da tabela. Exemplos: Pinnacle, Bet365, 1xBet, Betfair, MariSports, etc. NUNCA use palavras genéricas como "surebet", "Casa 1", "Casa 2". Se não conseguir identificar o nome exato, use "Casa não identificada".
3. **ESTRUTURA DA TABELA:** A imagem mostra uma tabela com colunas como "Chance" (tipos de aposta), "Odd" (cotações), e colunas para diferentes casas de apostas.
4. **PRECISÃO NUMÉRICA:** Copie TODOS os números exatamente como aparecem. Não arredonde, não corrija, não "melhore".
5. **CARACTERES ESPECIAIS:** Preserve expressões como "1¹-²", "2¹-²", "Tempo Extra", etc. exatamente como estão.
6. **TIMES E ESPORTE:** Identifique o esporte e os times que estão sendo comparados na aposta.
7. **VALORES MONETÁRIOS:** Extraia valores de stake (valor apostado) e lucro/profit exatamente como mostrados.
8. **PORCENTAGEM DE LUCRO:** Procure pelo valor percentual do lucro total da operação surebet.

**INSTRUÇÕES ESPECÍFICAS:**
- Examine TODA a imagem cuidadosamente antes de responder
- Se houver múltiplas datas, use a mais recente/atual
- Identifique as casas de apostas pelos nomes reais que aparecem nos cabeçalhos das colunas
- Extraia dados de EXATAMENTE 2 apostas (uma para cada lado da surebet)
- Mantenha formatação de números e símbolos especiais

**ATENÇÃO ESPECIAL:**
- Se a data parecer muito antiga (2023 ou anterior), procure novamente por uma data mais atual
- Os nomes das casas devem ser nomes reais de empresas de apostas, não termos genéricos
**Formato de Saída:**
DATA: [dd/mm/aaaa HH:mm]
ESPORTE: [Nome do Esporte]
LIGA: [Nome da Liga]
Time A: [Nome do Time A]
Time B: [Nome do Time B]
APOSTA 1:
Casa: [Nome da Casa de Apostas]
Odd: [Valor da Odd]
Tipo: [Descrição COMPLETA do Tipo de Aposta incluindo expressões elevadas como "1¹-² Tempo Extra" se presentes]
Stake: [Valor da Aposta]
Lucro: [Valor do Lucro]
APOSTA 2:
Casa: [Nome da Casa de Apostas]
Odd: [Valor da Odd]
Tipo: [Descrição COMPLETA do Tipo de Aposta incluindo expressões elevadas como "2¹-² Tempo Extra" se presentes]
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
          max_tokens: 1500,
          temperature: 0.05
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
      const dateRaw = extractValue(content, 'DATA');
      const sport = extractValue(content, 'ESPORTE');
      const league = extractValue(content, 'LIGA');
      const teamA = extractValue(content, 'Time A');
      const teamB = extractValue(content, 'Time B');
      const profitPercentage = extractValue(content, 'Lucro%');

      // Process date to ensure proper format
      let formattedDate = '';
      if (dateRaw) {
        // Expected format from OCR: "26/09/2025 16:30-03:00" or similar
        // Extract just the date and time part: "26/09/2025 16:30"
        const dateMatch = dateRaw.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/);
        if (dateMatch) {
          const [, datePart, timePart] = dateMatch;
          // Convert to yyyy-mm-ddThh:mm format for datetime-local input
          const [day, month, year] = datePart.split('/');
          formattedDate = `${year}-${month}-${day}T${timePart}`;
        } else {
          // Fallback: try to parse as is
          const fallbackMatch = dateRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (fallbackMatch) {
            const [, datePart] = fallbackMatch;
            const [day, month, year] = datePart.split('/');
            formattedDate = `${year}-${month}-${day}T12:00`; // Default to noon
          }
        }
      }

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
        date: formattedDate || new Date().toISOString().split('T')[0] + 'T12:00',
        sport: sport || 'Esporte não identificado',
        league: league || 'Liga não identificada',
        teamA: teamA || 'Time A não identificado',
        teamB: teamB || 'Time B não identificado',
        bet1: {
          house: bet1House || 'Casa não identificada',
          odd: parseFloat(bet1Odd.replace(',', '.')) || 2.0,
          type: bet1Type || 'Tipo não identificado',
          stake: parseFloat(bet1Stake.replace(/[^\d.,]/g, '').replace(',', '.')) || 1000,
          profit: parseFloat(bet1Profit.replace(/[^\d.,]/g, '').replace(',', '.')) || 50,
        },
        bet2: {
          house: bet2House || 'Casa não identificada',
          odd: parseFloat(bet2Odd.replace(',', '.')) || 2.0,
          type: bet2Type || 'Tipo não identificado',
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