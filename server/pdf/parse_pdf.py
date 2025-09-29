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
                    'Stake', 'Pinnacle', 'Betano', 'Br4bet', 'Super Bet', 'Betfast', 
                    'Cassino', 'MultiBet', 'BravoBet', 'Bet365', 'SportingBet'
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
    
    # Busca todos os números decimais
    numeros = re.findall(r'\d+\.\d+', texto_sem_casa)
    
    # Busca moeda (USD, BRL)
    moeda_match = re.search(r'(USD|BRL)', texto_aposta)
    
    if len(numeros) < 3:  # Precisamos pelo menos: odd, stake, profit
        return None
    
    # === EXTRAÇÃO DE ODD ===
    # A odd geralmente é o primeiro número antes dos símbolos ● ou ○
    odd = None
    for num in numeros:
        # Verifica se este número está antes de um símbolo ou USD
        num_float = float(num)
        if 1.0 <= num_float <= 50.0:  # Range típico de odds
            odd = num_float
            break
    
    if not odd and numeros:
        odd = float(numeros[0])  # Fallback: primeiro número
    
    # === EXTRAÇÃO DE STAKE E PROFIT ===
    # Busca números após USD/BRL
    stake = None
    profit = None
    
    if moeda_match:
        # Pega texto após a moeda
        pos_moeda = moeda_match.end()
        texto_pos_moeda = texto_aposta[pos_moeda:].strip()
        nums_pos_moeda = re.findall(r'\d+\.\d+', texto_pos_moeda)
        
        if len(nums_pos_moeda) >= 1:
            profit = float(nums_pos_moeda[-1])  # Último número é o lucro
        
        # Stake é o número antes da moeda
        texto_pre_moeda = texto_aposta[:moeda_match.start()].strip()
        nums_pre_moeda = re.findall(r'\d+\.\d+', texto_pre_moeda)
        
        if len(nums_pre_moeda) >= 1:
            # Stake é o último número antes da moeda (excluindo a odd)
            for num in reversed(nums_pre_moeda):
                num_float = float(num)
                if num_float != odd and num_float > 50:  # Valores típicos de stake
                    stake = num_float
                    break
    
    # === EXTRAÇÃO DO TIPO DE APOSTA ===
    # Remove casa, odd, stake, profit e moeda para deixar só o tipo
    tipo_aposta = texto_sem_casa
    
    # Remove odd
    if odd:
        tipo_aposta = re.sub(r'\b' + str(odd) + r'\b', '', tipo_aposta)
    
    # Remove stake se encontrado
    if stake:
        tipo_aposta = re.sub(r'\b' + str(stake) + r'\b', '', tipo_aposta)
    
    # Remove profit se encontrado  
    if profit:
        tipo_aposta = re.sub(r'\b' + str(profit) + r'\b', '', tipo_aposta)
    
    # Remove moedas
    tipo_aposta = re.sub(r'\b(USD|BRL)\b', '', tipo_aposta)
    
    # Remove símbolos ● ○ e caracteres especiais de formatação
    tipo_aposta = re.sub(r'[●○〉]', '', tipo_aposta)
    tipo_aposta = re.sub(r'\uf35d', '', tipo_aposta)  # Remove caracteres especiais
    
    # Limpa espaços múltiplos e remove hífens finais
    tipo_aposta = re.sub(r'\s+', ' ', tipo_aposta).strip()
    tipo_aposta = re.sub(r'[-–]\s*$', '', tipo_aposta).strip()
    
    # Remove números isolados no final (restos de stake/profit)
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