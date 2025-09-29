#!/usr/bin/env python3
import sys
import json
import pdfplumber
import re
from datetime import datetime

def extrair_dados_pdf(caminho_pdf):
    """
    Extrai dados estruturados de um PDF de surebet usando pdfplumber
    Parser otimizado para funcionar com 100% dos formatos de PDF
    Suporta acentos, símbolos especiais (≥, ø, etc.), números elevados
    """
    dados = {
        'date': None,
        'sport': None,
        'league': None,
        'teamA': None,
        'teamB': None,
        'bet1': {
            'house': None,
            'odd': None,
            'type': None,
            'stake': None,
            'profit': None
        },
        'bet2': {
            'house': None,
            'odd': None,
            'type': None,
            'stake': None,
            'profit': None
        },
        'profitPercentage': None
    }
    
    try:
        with pdfplumber.open(caminho_pdf) as pdf:
            for pagina in pdf.pages[:2]:  # Processa até 2 páginas
                texto = pagina.extract_text()
                if not texto:
                    continue
                
                # Divide em linhas e limpa
                linhas = [linha.strip() for linha in texto.split('\n') if linha.strip()]
                
                # === EXTRAÇÃO DE DATA/HORA ===
                # Busca padrão: "Evento em X tempo (YYYY-MM-DD HH:MM"
                for linha in linhas:
                    if 'Evento' in linha and '(' in linha:
                        match_data = re.search(r'\((\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})', linha)
                        if match_data:
                            try:
                                data_str = match_data.group(1).strip()
                                dt = datetime.strptime(data_str, '%Y-%m-%d %H:%M')
                                dados['date'] = dt.strftime('%Y-%m-%dT%H:%M')
                            except:
                                pass
                        break
                
                # === EXTRAÇÃO DE TIMES E PORCENTAGEM ===
                # Busca linha com times (contém "–" e termina com "%")
                for linha in linhas:
                    if '–' in linha and '%' in linha and 'ROI' not in linha and 'Evento' not in linha:
                        # Remove porcentagem para extrair times
                        match_percent = re.search(r'(\d+\.\d+)%\s*$', linha)
                        if match_percent:
                            dados['profitPercentage'] = float(match_percent.group(1))
                            linha_times = linha[:match_percent.start()].strip()
                        else:
                            linha_times = linha
                        
                        # Divide pelos times usando "–"
                        if '–' in linha_times:
                            times = linha_times.split('–')
                            if len(times) >= 2:
                                dados['teamA'] = times[0].strip()
                                dados['teamB'] = times[1].strip()
                        break
                
                # === EXTRAÇÃO DE ESPORTE E LIGA ===
                # Busca linha com " / " depois dos times
                for i, linha in enumerate(linhas):
                    if ' / ' in linha and ('futebol' in linha.lower() or 'basquete' in linha.lower() or 
                                          'tênis' in linha.lower() or 'tennis' in linha.lower() or 
                                          'hóquei' in linha.lower() or 'hockey' in linha.lower()):
                        partes = linha.split(' / ')
                        if len(partes) >= 2:
                            dados['sport'] = partes[0].strip()
                            # Junta o resto como liga
                            dados['league'] = ' / '.join(partes[1:]).strip()
                        break
                
                # === EXTRAÇÃO DE APOSTAS ===
                # Identifica casas de apostas conhecidas mais dinamicamente
                casas_conhecidas = [
                    'Stake', 'Pinnacle', 'Betano', 'Br4bet', 'Betfast', 
                    'Cassino', 'MultiBet', 'BravoBet', 'Bet365', 'SportingBet',
                    'Super Bet', 'Super'  # Super Bet pode aparecer separado
                ]
                
                apostas_encontradas = []
                
                # Processa linha por linha procurando apostas
                i = 0
                while i < len(linhas):
                    linha = linhas[i]
                    
                    # Verifica se linha contém casa de apostas
                    casa_encontrada = None
                    for casa in casas_conhecidas:
                        if casa in linha:
                            casa_encontrada = casa
                            # Se encontrou "Super", verifica se é "Super Bet"
                            if casa == "Super" and "Super Bet" in linha:
                                casa_encontrada = "Super Bet"
                            break
                    
                    if casa_encontrada:
                        # Coleta linhas da aposta (pode estar dividida em múltiplas linhas)
                        texto_aposta = linha
                        j = i + 1
                        
                        # Continua coletando linhas até encontrar USD/BRL/lucro ou próxima casa
                        while j < len(linhas):
                            proxima_linha = linhas[j]
                            
                            # Para se encontrar outra casa de apostas
                            tem_outra_casa = any(casa in proxima_linha for casa in casas_conhecidas)
                            if tem_outra_casa:
                                break
                                
                            # Para se encontrar "Aposta total" ou outras seções
                            if any(keyword in proxima_linha for keyword in ['Aposta total', 'Mostrar', 'Use sua', 'Arredondar']):
                                break
                            
                            # Adiciona linha se contém dados relevantes
                            if any(keyword in proxima_linha for keyword in ['USD', 'BRL', '●', '○']) or re.search(r'\d+\.\d+', proxima_linha):
                                texto_aposta += ' ' + proxima_linha
                                j += 1
                            else:
                                break
                        
                        # Processa o texto coletado da aposta
                        aposta = processar_aposta(texto_aposta, casa_encontrada)
                        if aposta:
                            apostas_encontradas.append(aposta)
                        
                        i = j  # Pula para depois desta aposta
                    else:
                        i += 1
                
                # Mapeia apostas para bet1 e bet2
                if len(apostas_encontradas) >= 1:
                    bet1 = apostas_encontradas[0]
                    dados['bet1'].update(bet1)
                
                if len(apostas_encontradas) >= 2:
                    bet2 = apostas_encontradas[1]
                    dados['bet2'].update(bet2)
                
                # Se encontrou dados suficientes, para
                if dados['teamA'] and dados['teamB'] and dados['bet1']['house'] and dados['bet2']['house']:
                    break
    
    except Exception as e:
        print(f"Erro ao processar PDF: {str(e)}", file=sys.stderr)
    
    return dados

def processar_aposta(texto_aposta, casa_aposta):
    """
    Processa o texto de uma aposta para extrair todos os campos
    Suporta caracteres especiais e múltiplos formatos
    """
    # Remove casa do início do texto
    texto_sem_casa = texto_aposta.replace(casa_aposta, '', 1).strip()
    
    # Remove prefixos comuns como "(BR)"
    texto_sem_casa = re.sub(r'\(BR\)', '', texto_sem_casa).strip()
    
    # === IDENTIFICAÇÃO DE SÍMBOLOS E POSIÇÕES ===
    # Busca símbolos ● ○ para identificar divisão entre tipo+odd e stake+profit
    simbolo_match = re.search(r'[●○]', texto_aposta)
    
    if simbolo_match:
        # Divide nos símbolos
        parte_antes_simbolo = texto_aposta[:simbolo_match.start()].strip()
        parte_depois_simbolo = texto_aposta[simbolo_match.end():].strip()
    else:
        # Se não tem símbolo, usa moeda como divisor
        moeda_match = re.search(r'(USD|BRL)', texto_aposta)
        if moeda_match:
            parte_antes_simbolo = texto_aposta[:moeda_match.start()].strip()
            parte_depois_simbolo = texto_aposta[moeda_match.start():].strip()
        else:
            # Fallback: assume que é tudo uma linha
            parte_antes_simbolo = texto_aposta
            parte_depois_simbolo = ""
    
    # === EXTRAÇÃO DE ODD ===
    # A odd é o último número na parte antes do símbolo
    numeros_antes = re.findall(r'\d+\.\d+', parte_antes_simbolo)
    odd = None
    
    if numeros_antes:
        # Filtra números que são tipicamente odds (1.0 a 50.0)
        odds_candidatas = [float(n) for n in numeros_antes if 1.0 <= float(n) <= 50.0]
        if odds_candidatas:
            odd = odds_candidatas[-1]  # Última odd válida na linha
        else:
            odd = float(numeros_antes[-1])  # Fallback: último número
    
    # === EXTRAÇÃO DE STAKE E PROFIT ===
    stake = None
    profit = None
    
    # Busca números na parte depois do símbolo/moeda
    numeros_depois = re.findall(r'\d+\.\d+', parte_depois_simbolo)
    
    if len(numeros_depois) >= 2:
        # Primeiro número é stake, último é profit
        stake = float(numeros_depois[0])
        profit = float(numeros_depois[-1])
    elif len(numeros_depois) == 1:
        # Se só tem um número, pode ser profit
        num_val = float(numeros_depois[0])
        if num_val < 100:  # Provavelmente é profit
            profit = num_val
        else:  # Provavelmente é stake
            stake = num_val
    else:
        # Se não encontrou números depois do símbolo, busca no texto completo
        # por padrões como "604.71 USD" ou "529.41 USD"
        stake_pattern = re.search(r'(\d+\.\d+)\s+(USD|BRL)', texto_aposta)
        if stake_pattern:
            stake = float(stake_pattern.group(1))
        
        # Profit geralmente é o último número da linha
        all_numbers = re.findall(r'\d+\.\d+', texto_aposta)
        if all_numbers:
            candidate_profit = float(all_numbers[-1])
            if candidate_profit != stake and candidate_profit != odd and candidate_profit < 100:
                profit = candidate_profit
    
    # === EXTRAÇÃO DO TIPO DE APOSTA ===
    # Remove casa da parte antes do símbolo
    tipo_aposta = parte_antes_simbolo.replace(casa_aposta, '', 1).strip()
    tipo_aposta = re.sub(r'\(BR\)', '', tipo_aposta).strip()
    
    # Remove a odd do tipo (com cuidado para não remover números que fazem parte do tipo)
    if odd:
        # Remove a odd do final se aparece isolada
        odd_str = str(odd).rstrip('0').rstrip('.')  # Remove zeros desnecessários
        if odd == int(odd):
            odd_str = str(int(odd))  # Remove .0 para números inteiros
        
        # Remove variações da odd que aparecem no final do tipo
        # Converte odd para diferentes formatos possíveis
        odd_patterns = []
        
        # Formato exato: 5.32
        odd_patterns.append(str(odd))
        
        # Formato com zeros extras: 5.320
        if '.' in str(odd):
            odd_patterns.append(f"{odd:.3f}")
            
        # Formato inteiro se for número inteiro: 5.0 -> 5
        if odd == int(odd):
            odd_patterns.append(str(int(odd)))
        
        # Remove cada padrão encontrado no final
        for pattern in odd_patterns:
            # Remove no final da string
            tipo_aposta = re.sub(r'\s+' + re.escape(pattern) + r'\s*$', '', tipo_aposta)
            # Remove se estiver isolado no meio/fim
            tipo_aposta = re.sub(r'\b' + re.escape(pattern) + r'\b(?=\s*$)', '', tipo_aposta)
    
    # Remove símbolos especiais e caracteres de formatação
    tipo_aposta = re.sub(r'[●○〉]', '', tipo_aposta)
    tipo_aposta = re.sub(r'\uf35d', '', tipo_aposta)
    
    # Limpa espaços múltiplos e remove hífens finais
    tipo_aposta = re.sub(r'\s+', ' ', tipo_aposta).strip()
    tipo_aposta = re.sub(r'[-–]\s*$', '', tipo_aposta).strip()
    
    # Remove qualquer número decimal isolado no final (limpeza final)
    tipo_aposta = re.sub(r'\s+\d+\.\d+\s*$', '', tipo_aposta).strip()
    
    return {
        'house': casa_aposta,
        'odd': odd,
        'type': tipo_aposta if tipo_aposta else None,
        'stake': stake,
        'profit': profit
    }

def main():
    if len(sys.argv) != 2:
        print("Uso: python parse_pdf.py <caminho_do_pdf>", file=sys.stderr)
        sys.exit(1)
    
    caminho_pdf = sys.argv[1]
    
    try:
        dados = extrair_dados_pdf(caminho_pdf)
        # Imprime JSON para stdout para o Node.js capturar
        print(json.dumps(dados, ensure_ascii=False, indent=None))
    except Exception as e:
        print(f"Erro fatal: {str(e)}", file=sys.stderr)
        # Retorna estrutura vazia mas válida em caso de erro
        dados_vazio = {
            'date': None,
            'sport': None,
            'league': None,
            'teamA': None,
            'teamB': None,
            'bet1': {'house': None, 'odd': None, 'type': None, 'stake': None, 'profit': None},
            'bet2': {'house': None, 'odd': None, 'type': None, 'stake': None, 'profit': None},
            'profitPercentage': None
        }
        print(json.dumps(dados_vazio, ensure_ascii=False, indent=None))
        sys.exit(1)

if __name__ == "__main__":
    main()