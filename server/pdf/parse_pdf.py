#!/usr/bin/env python3
import sys
import json
import pdfplumber
import re
from datetime import datetime

def extrair_dados_pdf(caminho_pdf):
    """
    Extrai dados estruturados de um PDF de surebet usando pdfplumber
    Retorna dados no formato OCRResult esperado pelo sistema
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
            # Processa apenas as primeiras 3 páginas para performance
            for i, pagina in enumerate(pdf.pages[:3]):
                texto = pagina.extract_text()
                if not texto:
                    continue
                
                linhas = texto.split('\n')
                
                # Extrai informações básicas do evento
                for j, linha in enumerate(linhas):
                    linha = linha.strip()
                    
                    # Busca data/hora do evento
                    if 'Evento' in linha or any(palavra in linha.lower() for palavra in ['data', 'horário', 'hora']):
                        # Tenta extrair data/hora entre parênteses ou após dois pontos
                        match_data = re.search(r'\(([^)]+)\)', linha)
                        if not match_data:
                            match_data = re.search(r':\s*(.+)', linha)
                        
                        if match_data:
                            data_str = match_data.group(1).strip()
                            # Tenta converter para formato ISO
                            try:
                                # Assume formato brasileiro DD/MM/YYYY HH:MM
                                if '/' in data_str and ':' in data_str:
                                    dt = datetime.strptime(data_str, '%d/%m/%Y %H:%M')
                                    dados['date'] = dt.strftime('%Y-%m-%dT%H:%M')
                            except:
                                pass
                    
                    # Busca times (linha com " - " ou " x ")
                    if ' - ' in linha or ' x ' in linha.lower():
                        separador = ' - ' if ' - ' in linha else ' x '
                        times = linha.split(separador)
                        if len(times) >= 2:
                            dados['teamA'] = times[0].strip()
                            dados['teamB'] = times[1].strip()
                    
                    # Busca esporte e liga (linha com " / " ou próxima linha após times)
                    if ' / ' in linha:
                        partes = linha.split(' / ')
                        if len(partes) >= 2:
                            dados['sport'] = partes[0].strip()
                            dados['league'] = partes[1].strip()
                    
                    # Busca porcentagem de lucro
                    if '%' in linha and 'ROI' not in linha.upper():
                        match_percent = re.search(r'(\d+(?:\.\d+)?)\s*%', linha)
                        if match_percent:
                            dados['profitPercentage'] = float(match_percent.group(1))

                # Extrai dados da tabela
                tabelas = pagina.extract_tables()
                if tabelas:
                    for tabela in tabelas:
                        if not tabela or len(tabela) < 2:
                            continue
                        
                        # Identifica cabeçalho da tabela
                        cabecalho = None
                        dados_tabela = tabela
                        
                        # Se primeira linha contém "Chance", "Casa", "Odd", etc., é cabeçalho
                        primeira_linha = [str(cell).lower() if cell else '' for cell in tabela[0]]
                        if any(palavra in ' '.join(primeira_linha) for palavra in ['chance', 'casa', 'odd', 'stake', 'lucro']):
                            cabecalho = tabela[0]
                            dados_tabela = tabela[1:]
                        
                        # Processa linhas de dados
                        apostas_encontradas = []
                        for linha in dados_tabela:
                            if not linha or len(linha) < 3:
                                continue
                            
                            # Filtra linhas vazias ou irrelevantes
                            linha_limpa = [str(cell).strip() if cell else '' for cell in linha]
                            if not any(linha_limpa):
                                continue
                            
                            # Mapeia colunas baseado no cabeçalho ou posição
                            aposta = {
                                'casa_aposta': linha_limpa[0] if len(linha_limpa) > 0 else '',
                                'tipo_aposta': linha_limpa[1] if len(linha_limpa) > 1 else '',
                                'odd': linha_limpa[2] if len(linha_limpa) > 2 else '',
                                'valor_aposta': linha_limpa[3] if len(linha_limpa) > 3 else '',
                                'lucro': linha_limpa[4] if len(linha_limpa) > 4 else '',
                            }
                            
                            # Valida se é uma linha de aposta válida
                            if aposta['casa_aposta'] and (aposta['odd'] or aposta['tipo_aposta']):
                                apostas_encontradas.append(aposta)
                        
                        # Mapeia para formato esperado (bet1, bet2)
                        if len(apostas_encontradas) >= 1:
                            bet1 = apostas_encontradas[0]
                            dados['bet1']['house'] = bet1['casa_aposta']
                            dados['bet1']['type'] = bet1['tipo_aposta']
                            
                            # Converte odd para float se possível
                            try:
                                if bet1['odd']:
                                    dados['bet1']['odd'] = float(bet1['odd'].replace(',', '.'))
                            except:
                                pass
                            
                            # Converte stake para float se possível
                            try:
                                if bet1['valor_aposta']:
                                    valor_limpo = re.sub(r'[^\d,.]', '', bet1['valor_aposta'])
                                    dados['bet1']['stake'] = float(valor_limpo.replace(',', '.'))
                            except:
                                pass
                            
                            # Converte profit para float se possível
                            try:
                                if bet1['lucro']:
                                    lucro_limpo = re.sub(r'[^\d,.]', '', bet1['lucro'])
                                    dados['bet1']['profit'] = float(lucro_limpo.replace(',', '.'))
                            except:
                                pass
                        
                        if len(apostas_encontradas) >= 2:
                            bet2 = apostas_encontradas[1]
                            dados['bet2']['house'] = bet2['casa_aposta']
                            dados['bet2']['type'] = bet2['tipo_aposta']
                            
                            # Converte odd para float se possível
                            try:
                                if bet2['odd']:
                                    dados['bet2']['odd'] = float(bet2['odd'].replace(',', '.'))
                            except:
                                pass
                            
                            # Converte stake para float se possível
                            try:
                                if bet2['valor_aposta']:
                                    valor_limpo = re.sub(r'[^\d,.]', '', bet2['valor_aposta'])
                                    dados['bet2']['stake'] = float(valor_limpo.replace(',', '.'))
                            except:
                                pass
                            
                            # Converte profit para float se possível
                            try:
                                if bet2['lucro']:
                                    lucro_limpo = re.sub(r'[^\d,.]', '', bet2['lucro'])
                                    dados['bet2']['profit'] = float(lucro_limpo.replace(',', '.'))
                            except:
                                pass
                
                # Se encontramos dados suficientes, interrompe o loop de páginas
                if dados['bet1']['house'] and dados['bet2']['house']:
                    break
    
    except Exception as e:
        # Em caso de erro, retorna estrutura vazia mas válida
        print(f"Erro ao processar PDF: {str(e)}", file=sys.stderr)
    
    return dados

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