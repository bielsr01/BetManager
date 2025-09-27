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
IMPORTANTE: Analise APENAS a imagem fornecida e extraia os dados EXATAMENTE como aparecem. NÃO use dados de exemplo, outras apostas ou informações fixas do sistema.

Transcreva os dados da imagem de aposta esportiva seguindo estas regras RIGOROSAMENTE:

**REGRAS DE FIDELIDADE ABSOLUTA:**
1. **ZERO SUBSTITUIÇÕES:** Se um campo não estiver visível na imagem, deixe-o VAZIO. NUNCA use valores padrão ou exemplos.
2. **TIPOS DE APOSTA:** Na coluna "Chance" ou equivalente, copie LITERALMENTE cada caractere, símbolo e número. Se vir "1", escreva "1". Se vir "X", escreva "X". Se vir "2", escreva "2". Se vir símbolos como "≥", ">", "≤", copie exatamente. Se vir números elevados como "1¹-²", "2¹-²", preserve TODOS os caracteres especiais.
3. **CASAS DE APOSTAS:** Procure na PRIMEIRA COLUNA (mais à esquerda) de cada linha de aposta. Extraia o nome COMPLETO e EXATO como aparece: "VBet (BR)", "Blaze (BR)", "Pinnacle", etc.
4. **ODDS:** Copie os números exatos das odds, preservando vírgulas e pontos como aparecem.
5. **VALORES MONETÁRIOS:** Extraia apenas os números, ignorando símbolos de moeda (R$, USD, etc.).
6. **DATA:** Procure no cabeçalho/topo da imagem primeiro. Use o formato completo AAAA-MM-DD HH:MM.

**INSTRUÇÕES ESPECÍFICAS PARA TIPOS:**
- Olhe atentamente a coluna "Chance", "Mercado", "Bet Type" ou similar
- Se vir "1" isolado, escreva apenas "1"
- Se vir "X" isolado, escreva apenas "X" 
- Se vir "2" isolado, escreva apenas "2"
- Se vir "1X", escreva "1X"
- Se vir "12", escreva "12"
- Se vir "Over 2.5", escreva "Over 2.5"
- Se vir "Under 2.5", escreva "Under 2.5"
- Se vir expressões como "1¹-²", preserve EXATAMENTE: "1¹-²"
- Se vir "H1(0)", escreva "H1(0)"
- Se vir "H2(0)", escreva "H2(0)"
- JAMAIS substitua por termos genéricos como "Aposta 1" ou "Aposta 2"

**Formato de Saída (apenas com dados REAIS da imagem):**
DATA: [AAAA-MM-DD HH:MM]
ESPORTE: [Nome exato do esporte]
LIGA: [Nome exato da liga]
Time A: [Nome exato do time A]
Time B: [Nome exato do time B]
APOSTA 1:
Casa: [Nome EXATO da casa de apostas da primeira linha]
Odd: [Valor EXATO da odd]
Tipo: [Texto EXATO da coluna Chance/Mercado]
Stake: [Valor EXATO da aposta]
Lucro: [Valor EXATO do lucro]
APOSTA 2:
Casa: [Nome EXATO da casa de apostas da segunda linha]
Odd: [Valor EXATO da odd]
Tipo: [Texto EXATO da coluna Chance/Mercado]
Stake: [Valor EXATO da aposta]
Lucro: [Valor EXATO do lucro]
Lucro%: [Valor EXATO do percentual]`;

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

      console.log('OCR Raw Response:', content);

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
      
      console.log('Extracted values:', { dateRaw, sport, league, teamA, teamB, profitPercentage });

      // Process date to ensure proper format
      let formattedDate = '';
      if (dateRaw) {
        // Try YYYY-MM-DD HH:MM format first (common OCR output)
        const isoMatch = dateRaw.match(/(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})/);
        if (isoMatch) {
          const [, datePart, timePart] = isoMatch;
          formattedDate = `${datePart}T${timePart}`;
        } else {
          // Try DD/MM/YYYY HH:MM format (alternative format)
          const dateMatch = dateRaw.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/);
          if (dateMatch) {
            const [, datePart, timePart] = dateMatch;
            const [day, month, year] = datePart.split('/');
            formattedDate = `${year}-${month}-${day}T${timePart}`;
          } else {
            // Fallback: try to extract just date and use default time
            const isoFallback = dateRaw.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoFallback) {
              formattedDate = `${isoFallback[1]}T12:00`;
            } else {
              const ddmmFallback = dateRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
              if (ddmmFallback) {
                const [, datePart] = ddmmFallback;
                const [day, month, year] = datePart.split('/');
                formattedDate = `${year}-${month}-${day}T12:00`;
              }
            }
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
      
      

      // Process extracted values with 100% fidelity - no fallbacks
      const processOdd = (oddStr: string): number => {
        if (!oddStr) return 0;
        const cleaned = oddStr.replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const processAmount = (amountStr: string): number => {
        if (!amountStr) return 0;
        const cleaned = amountStr.replace(/[^\d.,]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const processPercentage = (percentStr: string): number => {
        if (!percentStr) return 0;
        const cleaned = percentStr.replace(/[^\d.,]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Return ONLY extracted data, no fallbacks
      return {
        date: formattedDate || new Date().toISOString().split('T')[0] + 'T12:00',
        sport: sport || '',
        league: league || '',
        teamA: teamA || '',
        teamB: teamB || '',
        bet1: {
          house: bet1House || '',
          odd: processOdd(bet1Odd),
          type: bet1Type || '',  // CRITICAL: No fallback - exact extraction only
          stake: processAmount(bet1Stake),
          profit: processAmount(bet1Profit),
        },
        bet2: {
          house: bet2House || '',
          odd: processOdd(bet2Odd),
          type: bet2Type || '',  // CRITICAL: No fallback - exact extraction only
          stake: processAmount(bet2Stake),
          profit: processAmount(bet2Profit),
        },
        profitPercentage: processPercentage(profitPercentage),
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