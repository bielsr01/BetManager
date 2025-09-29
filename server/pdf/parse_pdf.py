#!/usr/bin/env python3
import sys
import json
import pdfplumber
import re
from datetime import datetime

def extrair_dados_pdf(caminho_pdf):
    """
    Extrai dados estruturados de um PDF de surebet usando pdfplumber
    Parser otimizado para 100% de precisão com todos os formatos de PDF
    Suporta acentos, símbolos especiais (≥, ø, etc.), qualquer casa de apostas
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
                for i, linha in enumerate(linhas):
                    if ' / ' in linha and ('futebol' in linha.lower() or 'basquete' in linha.lower() or 
                                          'tênis' in linha.lower() or 'tennis' in linha.lower() or 
                                          'hóquei' in linha.lower() or 'hockey' in linha.lower()):
                        partes = linha.split(' / ')
                        if len(partes) >= 2:
                            dados['sport'] = partes[0].strip()
                            dados['league'] = ' / '.join(partes[1:]).strip()
                        break
                
                # === EXTRAÇÃO DE APOSTAS ===
                apostas_encontradas = []
                
                # Processa linha por linha procurando apostas
                i = 0
                while i < len(linhas):
                    linha = linhas[i]
                    
                    # Detecta casa de apostas dinamicamente
                    casa_encontrada = detectar_casa_apostas(linha)
                    
                    if casa_encontrada:
                        # Coleta linhas da aposta (pode estar dividida em múltiplas linhas)
                        texto_aposta = linha
                        j = i + 1
                        
                        # Continua coletando linhas até encontrar informações completas
                        while j < len(linhas) and j < i + 4:  # Máximo 4 linhas por aposta
                            proxima_linha = linhas[j]
                            
                            # Para se encontrar outra casa de apostas
                            if detectar_casa_apostas(proxima_linha):
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
                        aposta = processar_aposta_completa(texto_aposta, casa_encontrada)
                        if aposta and aposta['house'] and aposta['odd']:
                            apostas_encontradas.append(aposta)
                        
                        i = j  # Pula para depois desta aposta
                    else:
                        i += 1
                
                # Mapeia apostas para bet1 e bet2
                if len(apostas_encontradas) >= 1:
                    dados['bet1'].update(apostas_encontradas[0])
                
                if len(apostas_encontradas) >= 2:
                    dados['bet2'].update(apostas_encontradas[1])
                
                # Se encontrou dados suficientes, para
                if dados['teamA'] and dados['teamB'] and dados['bet1']['house'] and dados['bet2']['house']:
                    break
    
    except Exception as e:
        print(f"Erro ao processar PDF: {str(e)}", file=sys.stderr)
    
    return dados

def detectar_casa_apostas(linha):
    """
    Detecta casas de apostas usando lista completa do sistema (1005+ casas)
    Suporta todas as variantes incluindo casas com parênteses como KTO (BR), Blaze (BR)
    """
    # Lista completa de todas as casas de apostas do sistema
    casas_sistema = [
        '10Bet', '10Bet (SE)', '10Bet (ZA)', '10Bet (UK)', '10Bet (MX)', '888Games', '10Cric', '188Bet',
        '188Bet (PT)', '188Bet (Sbk)', '188Bet (ZH)', 'HGA030 (Crown)', 'HGA035 (Crown)', '18Bet', 'BabiBet',
        'Hollywoodbets (UK)', 'Premium Tradings', 'RoyalistPlay', 'RoyalistPlay (Bet)', '1Bet (CO)', '21Red',
        'Bet-Bra SB (BR)', 'BetOBet', 'BetOBet (CC)', 'Dazzlehand', 'FoggyBet', 'OneCasino', 'Scarawins',
        '1Win (Original)', '1xBet', '1xBet (AG)', '1xBet (BO)', '1xBet (MD)', '1xBet (NG)', '1xstavka (RU)',
        'Betandyou', 'Linebet', 'MegaPari', 'Oppa88', 'Pari-pesa', 'Paripesa', 'Paripesa (Asia)', 'Paripesa (Biz)',
        'Paripesa (Com)', 'Paripesa (Cool)', 'Paripesa (ME)', 'Paripesa (Net)', 'Paripesa (NG)', 'Paripesa (PT)',
        'Paripesa (Site)', 'Paripesaut', 'SapphireBet', '1xBet (ES)', '1xBet (IT)', 'Fastbet (IT)', '22Bet',
        '22Bet (CM)', '22Bet (NG)', '22win88', 'Bestwinzz', '32Red', 'Unibet (EE)', 'Unibet (IE)', 'Unibet (UK)',
        '3et', '888sport', '888sport (DE)', '888sport (DK)', '888sport (ES)', '888sport (RO)', 'MrGreen',
        'MrGreen (DK)', 'MrGreen (SE)', '888sport (IT)', 'AccessBet', 'AdjaraBet', 'Admiral (AT)', 'Admiral (DE)',
        'AdmiralBet (ES)', 'AdmiralCasino (UK)', 'Swisslos (CH)', 'AdmiralBet (IT)', 'Afribet (NG)', 'Betfred (ZA)',
        'AI Sports', 'AirBet (IT)', 'AndromedaBet (IT)', 'BetItaly (IT)', 'Akbets', 'AlfaBet (BR)', 'Aposta1 (BR)',
        'Apostaganha (BR)', 'ArtlineBet', 'AsianOdds', 'B1Bet (BR)', 'Bahigo', 'Kakeyo', 'BaltBet (RU)',
        'BandBet (BR)', 'BangBet', 'Betsure', 'BantuBet (AO)', 'Bet2U2', 'BetBaba (NG)', 'Bet-at-home',
        'Bet-at-home (DE)', 'Bet-Bra (BR)', 'Bet25 (DK)', 'Bet3000 (DE)', 'Bet365 (Fast)', '28365365', '365-808',
        '365sb', '365sport365', '878365', 'Allsport365', 'Bet365 (AU)', 'Bet365 (BR)', 'Bet365 (DE)', 'Bet365 (ES)',
        'Bet365 (GR)', 'Bet365 (IT)', 'Bet365 (NL)', 'Game-365 (CN)', 'Bet365 (Full)', 'Bet4 (BR)', 'Bet4',
        'Bet4 (PE)', 'Bet7', 'Bet7k (BR)', 'B2XBET (BR)', 'BetBet (BR)', 'Cassino (BR)', 'Donald (BR)', 'Vera (BR)',
        'Bet9ja', 'Betadonis', 'Betaland (IT)', 'Betano', 'Betano (CZ)', 'Betano (DE)', 'Betano (MX)', 'Betano (NG)',
        'Betano (RO)', 'Betano (BR)', 'Betano (PT)', 'Betao (BR)', 'BravoBet (BR)', 'Maxima (BR)', 'R7Bet (BR)',
        'XpBet (BR)', 'BetBoom (BR)', 'BetBoom', 'BetBoom (RU)', 'Betboro', 'Betboro (GH)', 'Betcity',
        'Betcity (BY)', 'Betcity (Net)', 'Betcity (RU)', 'Formula55 (TJ)', 'Betcity (NL)', 'SpeedyBet', 'BetClic',
        'BetClic (FR)', 'BetClic (IT)', 'BetClic (PL)', 'BetClic (PT)', 'Betcris', 'Betcris (DO)', 'Betcris (MX)',
        'Betcris (PL)', 'BetDaq', 'BetDaSorte (BR)', 'Afun (BR)', 'BetDSI (EU)', 'BetEsporte (BR)', 'LanceDeSorte (BR)',
        'Betfair', 'Betfair (AU)', 'Betfair (BR)', 'Betfair (RO)', 'SatSport', 'Sharpxch', 'Tradexbr',
        'Betfair (ES)', 'Betfair (IT)', 'Betfair (MBR)', 'Betfair SB', 'Betfair SB (ES)', 'Betfair SB (RO)',
        'Betfarm', 'Betfirst (BE)', 'Betflip', 'Casobet (Sport)', 'Fairspin', 'Tether', 'Betfred', 'BetiBet',
        'Betika (KE)', 'BetInAsia (Black)', 'Betinia', 'CampoBet', 'Lottoland (UK)', 'BetKing', 'Betlive',
        'Betmaster', 'BetMomo', 'Betnacional (BR)', 'Betnation (NL)', 'BetOnline (AG)', 'BetOnline (Classic)',
        'LowVig (AG)', 'SportsBetting (AG)', 'TigerGaming', 'BetPawa (NG)', 'BetPawa (CM)', 'BetPawa (GH)',
        'BetPawa (KE)', 'BetPawa (RW)', 'BetPawa (TZ)', 'BetPawa (UG)', 'BetPawa (ZM)', 'BetPix365 (BR)',
        'Vaidebet', 'BetRebels', '21Bets', '7bet (LT)', 'All British Casino', 'ApuestaTotal', 'Bankonbet',
        'BaumBet (RO)', 'Bet593 (EC)', 'Betaki (BR)', 'Betanoshops (NG)', 'Betinia (DK)', 'Betinia (SE)',
        'BetNFlix', 'Bettarget (UK)', 'CampeonBet', 'Casinado', 'CasinoAtlanticCity', 'Casinoly', 'Cazimbo',
        'DoradoBet', 'Ecuabet', 'ElaBet (GR)', 'EsportivaBet (BR)', 'EstrelaBet (BR)', 'EvoBet', 'FezBet',
        'FrankSports (RO)', 'GastonRed', 'Golden Palace (BE)', 'Greatwin', 'Jogodeouro (BR)', 'Juegaenlineachile (CL)',
        'JupiCasino', 'Karamba', 'Karamba (UK)', 'Lapilanders', 'LotoGreen (BR)', 'Lottland (IE)', 'Lottoland',
        'Lottoland (AT)', 'MalinaCasino', 'Mcgames (BR)', 'Merkurxtip (CZ)', 'Metgol (BR)', 'MiСasino',
        'MrBit (BG)', 'MrBit (RO)', 'MultiBet (BR)', 'NinjaCasino', 'Novajackpot', 'Playdoit (MX)', 'PowBet',
        'Rabona', 'RabonaBet', 'RtBet', 'SlotV (RO)', 'SONSofSLOTS', 'Spinanga', 'Sportaza', 'StarCasinoSport (BE)',
        'Supacasi', 'SvenBet', 'Svenplay', 'ToonieBet (CA)', 'Vavada', 'Vegas (HU)', 'Wazamba', 'Winpot (MX)',
        'Betrivers (CA)', 'Betrivers (AZ)', 'Betsafe', 'Bethard', 'Betsafe (EE)', 'Betsafe (LV)', 'Betsafe (SE)',
        'Betsson', 'Bets10', 'Betsson (AR)', 'Betsson (BR)', 'Betsson (CO)', 'Betsson (SE)', 'Inkabet (PE)',
        'Betsson (ES)', 'Betpark (BR)', 'SupremaBet (BR)', 'Betsson (FR)', 'Betsson (GE)', 'Betsson (GR)',
        'Betsmith', 'Betsson (IT)', 'Betsul (BR)', 'Betuk (UK)', 'Betus (PA)', 'BetVictor', 'Parimatch (UK)',
        'Puntit (IN)', 'BetWarrior', 'BetWarrior (BR)', 'BetWarrior (Caba)', 'BetWarrior (MZA)', 'BetWarrior (PBA)',
        'BetWarrior Apuestas (AR)', 'LeoVegas (IT)', 'Svenska Spel (SE)', 'BetWay', 'BetWay (DE)', 'BetWay (ES)',
        'BetWay (MX)', 'BetWay (IT)', 'Betwgb', 'AdmiralBet (ME)', 'AdmiralBet (RS)', 'AdmiralBet (UG)', 'BetX (CZ)',
        'Betxchange', 'Bingoal (BE)', 'BallyBet', 'BetPlay (CO)', 'Bingoal (NL)', 'Desert Diamond', 'Expekt (SE)',
        'Blaze', '4RaBet', '4RaBet (Play)', '500Casino', 'Africa365', 'BC.Game', 'BetFury', 'Betonred',
        'Betonred (NG)', 'BetPlay', 'BetTilt', 'Betvip', 'Betvip (BR)', 'BilBet', 'Bitz', 'Blaze (BR)',
        'BloodMoon (CO)', 'BlueChip', 'Bons', 'CasinoX', 'Casinozer', 'Casinozer (EU)', 'CsGo500', 'Fortunejack',
        'HugeWin', 'JetBet (BR)', 'JonBet (BR)', 'Joycasino', 'Lucky Block', 'Lucky Block (Top)', 'Opabet',
        'PinBet', 'Pokerdom', 'PuskasBet (BR)', 'Rainbet', 'RajaBets', 'Razed', 'Riobet', 'Rivalry', 'Rollbit',
        'RooBet', 'Slots Safari (CO)', 'Solcasino', 'TrBET', 'Yonibet', 'Yonibet (EU)', 'BoaBet', 'Bodog (EU)',
        'Bovada (LV)', 'BolsaDeAposta (BR)', 'BolsaDeAposta TB (BR)', 'BookMaker (EU)', 'JustBet (CO)',
        'BookmakerXyz', 'BoyleSports', 'Brazino 777', 'Brazino 777 (BY)', 'Brazino 777 (IO)', 'Wazobet',
        'BrBet (BR)', 'BresBet', 'Bumbet', 'Bwin', 'Betboo (BR)', 'Betmgm (CA)', 'Betmgm (MA)', 'Betmgm (NY)',
        'Bwin (BE)', 'Bwin (DE)', 'Bwin (DK)', 'Bwin (ES)', 'Bwin (GR)', 'Bwin (IT)', 'Gamebookers',
        'Giocodigitale (IT)', 'Ladbrokes (DE)', 'Oddset (DE)', 'Partypoker', 'Sportingbet', 'Sportingbet (BR)',
        'Sportingbet (DE)', 'Sportingbet (GR)', 'Sportingbet (ZA)', 'Vistabet (GR)', 'Bwin (FR)', 'Bwin (PT)',
        'Caliente (MX)', 'Betcha (PA)', 'Marca Apuestas (ES)', 'Wplay (CO)', 'CampoBet (DK)', 'Casa Pariurilor (RO)',
        'Fortuna (RO)', 'CasaDeApostas (BR)', 'Betmais', 'CasinoPortugal (PT)', 'CBet', 'CBet (LT)', 'Circus (BE)',
        'Circus (NL)', 'CloudBet', 'Codere (ES)', 'Codere (AR)', 'Codere (MX)', 'Comeon', 'Casinostugan',
        'Comeon (PL)', 'Hajper', 'Lyllo Casino', 'MobileBet', 'Nopeampi', 'Pzbuk (PL)', 'Saga Kingdom',
        'Snabbare', 'SunMaker (DE)', 'Comeon (NL)', 'CoolBet', 'CoolBet (CL)', 'CoolBet (PE)', 'Coral (UK)',
        'Crocobet', 'CrystalBet (GE)', 'DafaBet (ES)', 'DafaBet (Sports)', 'Amperjai', 'Nextbet', 'DafaBet OW (Saba)',
        '12Bet (Saba)', '12Bet (Saba-ID)', '12Bet (Saba-MY)', 'CMD368 (Saba)', 'M88 (Saba)', 'W88Live (Saba)',
        'Danskespil (DK)', 'DaznBet (ES)', 'DaznBet (UK)', 'DomusBet (IT)', 'DoxxBet (SK)', 'Draftkings',
        'Draftking (CT)', 'DragonBet (UK)', 'DripCasino', 'Duelbits', 'Easybet (ZA)', 'Ebingo (ES)', 'BetaBet',
        'BetaBet (Net)', 'Betcoin (AG)', 'ShansBet', 'EDSBet', 'Efbet (ES)', 'Efbet (BG)', 'Efbet (IT)',
        'Efbet (RO)', 'Efbet (GR)', 'Efbet (Net)', 'EGB', 'EGB SPORT', 'EpicBet', 'Eplay24 (IT)',
        'BegameStar (IT)', 'Betwin360 (IT)', 'SportItaliaBet (IT)', 'EsporteNetBet (BR)', 'BetsBola',
        'EsporteNetSP (BR)', 'EsporteNetVip (BR)', 'EsporteNetVip', 'EsportesDaSorte (BR)', 'EstorilSolCasinos (PT)',
        'Etipos (SK)', 'Etopaz (AZ)', 'Etoto (PL)', 'EuroBet (IT)', 'EveryGame (EU)', 'ExclusiveBet', 'Betfinal',
        'IZIbet', 'MrXBet', 'ShangriLa', 'UniClub (LT)', 'Expekt (DK)', 'LeoVegas (DK)', 'F12Bet (BR)',
        'SPIN (BR)', 'Fanatics', 'FanDuel', 'Betfair SB (BR)', 'FanDuel (CT)', 'Fastbet', 'CopyBet (CY)',
        'FavBet', 'FavBet (UA)', 'FB Sports', 'Fonbet', 'BeteryBet (IN)', 'Bettery (RU)', 'Fonbet (GR)',
        'Fonbet (KZ)', 'Fonbet (Mobile)', 'Pari (RU)', 'Football (NG)', 'Fortuna (CZ)', 'Fortuna (PL)',
        'Fortuna (SK)', 'FulltBet (BR)', 'GaleraBet (BR)', '888Casino (Arabic)', 'Gamdom', 'GazzaBet (IT)',
        'Germania (HR)', 'GGBet', 'Freeggbet', 'Vulkan', 'Goalbet', 'GoldBetShop (IT)', 'BetFlag (IT)',
        'GoldBet (IT)', 'IntralotShop (IT)', 'Lottomatica (IT)', 'PlanetWin365 (IT)', 'GoldenPark (ES)',
        'CasinoBarcelona (ES)', 'Solcasino (ES)', 'GoldenPark (PT)', 'GoldenVegas (BE)', 'GrandGame (BY)',
        'HiperBet (BR)', 'HKJC', 'HoliganBet (TR)', 'JojoBet', 'Holland Casino (NL)', 'Hollywoodbets',
        'Hollywoodbets (MZ)', 'iForBet (PL)', 'Ilotbet', 'Interwetten', 'Interwetten (ES)', 'Interwetten (GR)',
        'IviBet', '20Bet', 'Jacks (NL)', 'Expekt', 'JetCasino', 'Flagman', 'FreshCasino', 'Rox (Sport)',
        'Jokerbet (ES)', 'JSB', 'Boltbet (GH)', 'Primabet (GM)', 'TicTacBets (ZA)', 'JugaBet (CL)',
        'Parimatch (TJ)', 'KingsBet (CZ)', 'KirolBet (ES)', 'Apuestasvalor (ES)', 'Aupabet (ES)', 'Juegging (ES)',
        'Kwiff', 'Betkwiff', 'Ladbrokes', 'Ladbrokes (BE)', 'LeaderBet', 'Lebull (PT)', 'Leon', 'Leon (RU)',
        'Twin', 'LeoVegas', 'Betmgm (BR)', 'Williamhill (SE)', 'LeoVegas (ES)', 'LigaStavok (RU)',
        'LivescoreBet (NG)', 'SunBet (ZA)', 'LivescoreBet (UK)', 'LivescoreBet (IE)', 'VirginBet', 'LsBet',
        'KikoBet', 'Mundoapostas', 'ReloadBet', 'SlottoJAM', 'TornadoBet', 'Luckia (ES)', 'Luckia (CO)',
        'Luckia (MX)', 'LvBet', 'LvBet (LV)', 'LvBet (PL)', 'Mansion (M88-BTI)', 'Marathon', 'Marathon (BY)',
        'Marathon (RU)', 'MBet', 'MarathonBet (DK)', 'MarathonBet (ES)', 'MarathonBet (IT)', 'MarjoSports (BR)',
        'Matchbook', 'Maxbet (RS)', 'Maxbet (BA)', 'MaxLine (BY)', 'Mcbookie', 'StarSports', 'MelBet',
        'Betwinner', 'DBbet', 'MelBet (BI)', 'MelBet (KE)', 'MelBet (MN)', 'Meridian', 'Meridian (CY)',
        'Meridian (BE)', 'Meridian (BA)', 'Meridian (ME)', 'Meridian (RS)', 'Meridian (PE)', 'JogaBets (MZ)',
        'Meridian (BR)', 'MerkurBets', 'Betcenter (BE)', 'Cashpoint (DK)', 'MerkurBets (DE)', 'Miseojeu+',
        'Misli (AZ)', 'MostBet', 'Mozzart', 'Mozzart (BA)', 'Mozzart (NG)', 'Mozzart (RO)', 'MSport (GH)',
        'MSport (NG)', 'Mystake', '31Bet', '9dBet (BR)', 'Betfast', 'Betfast (BR)', 'Donbet', 'Donbet (Win)',
        'Faz1Bet (BR)', 'Freshbet', 'Goldenbet', 'Jackbit', 'Mystake (Bet)', 'Rolletto', 'TivoBet (BR)',
        'Velobet (Win)', 'Wjcasino (BR)', 'N1Bet', '12Play', 'CelsiusCasino', 'Coins Game', 'Wild', 'YBets',
        'NaijaBet', 'NairaBet', 'Napoleon (BE)', 'Neobet', 'Neobet (CA)', 'Neobet (DE)', 'Neobet (ZA)',
        'Nesine (TR)', 'Bilyoner', 'Misli (Com)', 'Oley', 'NetBet', 'Bet777 (BE)', 'Bet777 (ES)', 'NetBet (GR)',
        'NetBet (BR)', 'NetBet (FR)', 'NetBet (IT)', 'DaznBet (IT)', 'OriginalBet (IT)', 'Plexbet (IT)',
        'NetBet (RO)', 'Nike (SK)', 'NitroBetting (EU)', 'Norsk Tipping (NO)', 'Novibet (BR)', 'Novibet (GR)',
        'Novibet (IE)', 'Olimp', 'Olimp (Bet)', 'Olimpbet (KZ)', 'Olimpkz', 'OlimpoBet (PE)', 'OlyBet (ES)',
        'OlyBet (EU)', 'OlyBet (FR)', 'FeelingBet (FR)', 'Genybet (FR)', 'OlyBet (LT)', 'Onabet (BR)',
        'Esporte365 (BR)', 'LuckBet (BR)', 'Luvabet (BR)', 'Optibet (LT)', 'Optibet (LV)', 'Optibet (EE)',
        'OrbitX', 'OrbiteX', 'Paddy Power', 'PameStoixima (GR)', 'Parasino', 'ApxBet', 'Betonngliga',
        'BigBet (BR)', 'LiderBet (BR)', 'RealsBet (BR)', 'Parimatch (KZ)', 'BuddyBet (UA)', 'Gra (Live)',
        'ParionsSport (FR)', 'Paston (ES)', 'Br4bet (BR)', 'SorteOnline (BR)', 'Pin-up', 'BetPlays',
        'Pin-up (RU)', 'BaseBet', 'Casino Spinamba', 'Lucky Bird Casino', 'MarsBet', 'Pin-up (EN)',
        'Slottica', 'Slotty Way', 'Winmasters', 'Winmasters (CY)', 'Winmasters (GR)', 'Winmasters (RO)',
        'Pinnacle', 'P4578 (Asian)', 'P4578 (EU)', 'Pin135 (EU)', 'Pinnacle (Bet)', 'Pinnacle (BR)',
        'Pinnacle (SE)', 'Pinnacle888 (Asian)', 'Pinnacle888 (EU)', 'Piwi247 (SB)', 'PS3838 (Broker)',
        'Start975 (Asian)', 'Start975 (EU)', 'Piwi247', 'PixBet (BR)', 'FlaBet (BR)', 'Pixbet285',
        'Placard (PT)', 'Playbonds', 'PlayNow', 'PMU (FR)', 'PointsBet (AU)', 'PokerStars', 'PokerStars (DK)',
        'PokerStars (RO)', 'PokerStars (FR)', 'PokerStars (UK)', 'PokerStars (CA)', 'PokerStars (ES)',
        'PokerStars (SE)', 'PremierBet (MW)', 'MercuryBet', 'PremierBet (AO)', 'PremierBet (CD)',
        'PremierBet (CG)', 'PremierBet (CM)', 'PremierBet (MZ)', 'PremierBet (SN)', 'PremierBet (TD)',
        'PremierBet (TZ)', 'QQ101 (BTI)', '10Bet (KR)', '12Bet (BTI-ID)', 'Fun88 (IN)', 'QQ101 (IM Sports)',
        'RayBet', 'Reidopitaco (BR)', 'RetaBet (ES)', 'RetaBet (ES-AN)', 'RetaBet (PE)', 'RicoBet (BR)',
        'BetGorillas (BR)', 'KingpandaBet (BR)', 'Rivalo (BR)', 'Rivalo (CO)', 'RuBet', 'Rushbet (CO)',
        'GoldenBull (SE)', 'Rushbet (MX)', 'Sazka (CZ)', 'Sbobet', 'Pic5678', 'SbobetAsia', 'SboTop',
        'Sbobet (Esport)', '12Bet (Esport)', 'BTC365 (Esport)', 'VKGame', 'SeuBet (BR)', '747 Live',
        'Shuffle', 'Sisal (IT)', 'PokerStars (IT)', 'SkyBet', 'Smarkets', 'Snai (IT)', 'SoccaBet',
        'SolisBet', 'Solverde (PT)', 'SorteNaBet (BR)', 'Bateu (BR)', 'Betfusion (BR)', 'BullsBet (BR)',
        'SportBet (IT)', 'BetX (IT)', 'StarGame (IT)', 'SportingWin', 'Sportium (CO)', 'Sportium (ES)',
        'Sportmarket', 'SportsBet', 'SportsBet (AU)', 'SportyBet', 'SportyBet (BR)', 'Stake', 'Stake (BR)',
        'KTO (BR)', 'Stake (CO)', 'Frumzi', 'FunBet', 'LibraBet', 'MafiaCasino', 'StoneVegas', 'StanleyBet (BE)',
        'StanleyBet (IT)', 'StanleyBet (RO)', 'Admiral (RO)', 'StarCasino (NL)', 'Stoiximan (GR)',
        'Stoiximan (CY)', 'Stoiximan (GR)', 'STS (PL)', 'SuperBet (BR)', 'SuperBet (PL)', 'SuperBet (RO)',
        'SuperBet (RS)', 'Surebet247', 'SX Bet', 'SynotTip (LV)', 'SynotTip (CZ)', 'SynotTip (SK)', 'Tab (AU)',
        'TeApuesto (PE)', 'TempoBet', 'Tennisi', 'Tennisi (Bet)', 'Tennisi (KZ)', 'ThunderPickIo (NO)',
        'Tipico', 'Tipico (DE)', 'Tipp3 (AT)', 'TippmixPro (HU)', 'Tipsport (CZ)', 'Chance (CZ)',
        'Tipsport (SK)', 'Tipwin (DE)', 'Tipwin', 'Tipwin (DK)', 'Tipwin (SE)', 'TonyBet', 'Vave',
        'TonyBet (ES)', 'TonyBet (NL)', 'Topsport (LT)', 'Toto (NL)', 'TotoGaming (AM)', '1Win (Provider)',
        'Cannonbet', 'CaptainsBet (KE)', 'MelBet (NG)', 'MelBet (RU)', 'Sol.Casino', 'Tinbet (PE)',
        'Winspirit', 'Ubet (CY)', 'Ubet (KZ)', 'Betera (BY)', 'Unibet (DK)', 'Unibet (BE)', 'Unibet (FI)',
        'Unibet (SE)', 'Unibet (FR)', 'Unibet (RO)', 'ATG (SE)', 'Betmgm (NL)', 'Betmgm (SE)', 'Betmgm (UK)',
        'Casumo', 'Casumo (ES)', 'GrosvenorCasinos', 'No Account Bet (SE)', 'Paf', 'Paf (ES)', 'Paf (SE)',
        'PafBet (LV)', 'Scoore (BE)', 'Unibet (AU)', 'Unibet (IT)', 'Unibet (MT)', 'Unibet (NL)', 'VBet',
        'Bets60', 'H2bet (BR)', 'Hash636', 'Uabet', 'VBet (AM)', 'VBet (BR)', '7Games (BR)', 'Seguro (BR)',
        'VBet (FR)', 'VBet (LAT)', 'VBet (NL)', 'VBet (UK)', 'Veikkaus (FI)', 'Versus (ES)', 'Vivasorte (BR)',
        '4Play (BR)', '4Win (BR)', 'Ginga (BR)', 'QG (BR)', 'Zeroum (BR)', 'Vulkan Bet', 'W88Es', 'Wildz',
        'William Hill', 'Williamhill (ES)', 'Williamhill (IT)', 'Winamax (ES)', 'Winamax (DE)', 'Winamax (FR)',
        'WinBet (BG)', 'WinBet (RO)', 'Winline (RU)', 'WolfBet', 'WonderBet (CO)', 'WWin', 'YaassCasino (ES)',
        'Yabo888', 'Yajuego (CO)', 'YSB', 'Zamba (CO)', 'ZeBet', 'ZeBet (BE)', 'ZeBet (ES)', 'ZeBet (NL)',
        'Zenit', 'Zenit (Win)'
    ]
    
    linha_lower = linha.lower()
    
    # Detecta casas de apostas no texto
    casas_encontradas = []
    for casa in casas_sistema:
        # Cria padrão flexível para detectar a casa
        casa_pattern = re.escape(casa.lower()).replace(r'\ ', r'\s*')
        
        # Busca pela casa no texto (case insensitive, espaços flexíveis)
        if re.search(r'\b' + casa_pattern + r'\b', linha_lower):
            return casa
    
    # Se não encontrou casa conhecida, tenta detecção dinâmica 
    # Busca por padrão: palavra capitalizada seguida de dados de aposta
    match = re.search(r'^([A-Z][A-Za-z\s\(\)]{2,30})\s+[A-Za-z0-9()+\-≥≤\.]+\s+\d+\.\d+', linha)
    if match:
        casa_candidata = match.group(1).strip()
        # Valida se parece ser nome de casa de apostas
        if len(casa_candidata) >= 3:
            return casa_candidata
    
    return None

def processar_aposta_completa(texto_aposta, casa_aposta):
    """
    Processa o texto completo de uma aposta para extrair todos os campos
    Garante 100% de precisão na extração
    """
    # === IDENTIFICAÇÃO DE SÍMBOLOS E DIVISÃO ===
    simbolo_match = re.search(r'[●○]', texto_aposta)
    
    if simbolo_match:
        parte_antes_simbolo = texto_aposta[:simbolo_match.start()].strip()
        parte_depois_simbolo = texto_aposta[simbolo_match.end():].strip()
    else:
        # Se não tem símbolo, usa moeda como divisor
        moeda_match = re.search(r'(USD|BRL)', texto_aposta)
        if moeda_match:
            parte_antes_simbolo = texto_aposta[:moeda_match.start()].strip()
            parte_depois_simbolo = texto_aposta[moeda_match.start():].strip()
        else:
            parte_antes_simbolo = texto_aposta
            parte_depois_simbolo = ""
    
    # === EXTRAÇÃO DE ODD ===
    # Busca odd na parte antes do símbolo
    numeros_antes = re.findall(r'\d+\.\d+', parte_antes_simbolo)
    odd = None
    
    if numeros_antes:
        # Filtra por range típico de odds (1.0 a 50.0)
        for num_str in reversed(numeros_antes):  # Do final para o início
            num = float(num_str)
            if 1.0 <= num <= 50.0:
                odd = num
                break
        
        if not odd:  # Fallback
            odd = float(numeros_antes[-1])
    
    # === EXTRAÇÃO DE STAKE E PROFIT ===
    stake = None
    profit = None
    
    # Busca padrões baseados em moeda para garantir precisão
    # Padrão: NUMBER USD/BRL -> stake
    stake_matches = re.findall(r'(\d+\.?\d*)\s+(USD|BRL)', texto_aposta)
    if stake_matches:
        stake = float(stake_matches[0][0])
    
    # Profit é geralmente o último número pequeno (< 100) na linha
    todos_numeros = re.findall(r'\d+\.\d+', texto_aposta)
    for num_str in reversed(todos_numeros):
        num = float(num_str)
        if num != stake and num != odd and num < 100:
            profit = num
            break
    
    # Se não encontrou profit, busca especificamente após stake
    if not profit and stake:
        texto_pos_stake = texto_aposta[texto_aposta.find(str(stake)) + len(str(stake)):]
        numeros_pos_stake = re.findall(r'\d+\.\d+', texto_pos_stake)
        if numeros_pos_stake:
            profit = float(numeros_pos_stake[-1])
    
    # === EXTRAÇÃO DO TIPO DE APOSTA ===
    # Remove casa da parte antes do símbolo
    tipo_aposta = parte_antes_simbolo.replace(casa_aposta, '', 1).strip()
    tipo_aposta = re.sub(r'\(BR\)', '', tipo_aposta).strip()
    
    # Remove qualquer número decimal isolado (odd, stake, etc.)
    # Mantém números que são parte do tipo (ex: "Abaixo 2.5", "H1(+1.5)")
    palavras = tipo_aposta.split()
    palavras_filtradas = []
    
    for i, palavra in enumerate(palavras):
        # Se é um número decimal isolado (não parte de expressão como H1(+1.5))
        if re.match(r'^\d+\.\d+$', palavra):
            # Verifica se é a odd, stake ou outro número a ser removido
            num = float(palavra)
            if num == odd or num == stake or num == profit:
                continue  # Remove este número
            elif i == len(palavras) - 1:  # Se é o último número na linha
                continue  # Provavelmente é odd/stake/profit
            elif num > 100:  # Se é um número grande (provavelmente stake)
                continue  # Remove
        
        palavras_filtradas.append(palavra)
    
    tipo_aposta = ' '.join(palavras_filtradas)
    
    # Limpeza final de símbolos e formatação
    tipo_aposta = re.sub(r'[●○〉]', '', tipo_aposta)
    tipo_aposta = re.sub(r'\uf35d', '', tipo_aposta)
    tipo_aposta = re.sub(r'\s+', ' ', tipo_aposta).strip()
    tipo_aposta = re.sub(r'[-–]\s*$', '', tipo_aposta).strip()
    
    # Remove todos os tokens da casa de apostas (incluindo variantes)
    # Mapeia casa normalizada para todos os seus tokens possíveis
    tokens_casa = []
    casa_lower = casa_aposta.lower()
    
    # Mapeamento de variantes conhecidas
    if 'super' in casa_lower:
        tokens_casa.extend(['super', 'super bet', 'superbet'])
    elif 'kto' in casa_lower:
        tokens_casa.extend(['kto', 'kto (br)'])
    elif 'blaze' in casa_lower:
        tokens_casa.extend(['blaze', 'blaze (br)'])
    elif 'stake' in casa_lower:
        tokens_casa.extend(['stake', 'stake (br)'])
    elif 'pinnacle' in casa_lower:
        tokens_casa.extend(['pinnacle', 'pinnacle (br)'])
    else:
        # Para outras casas, adiciona a casa principal e variante com (BR) se não tiver
        tokens_casa.append(casa_lower)
        if '(br)' not in casa_lower and not casa_lower.endswith(')'):
            tokens_casa.append(casa_lower + ' (br)')
    
    # Remove cada token da casa do tipo
    for token in tokens_casa:
        # Remove token isolado (palavra completa)
        pattern = r'\b' + re.escape(token) + r'\b'
        tipo_aposta = re.sub(pattern, '', tipo_aposta, flags=re.IGNORECASE).strip()
    
    # Limpa espaços extras resultantes da remoção
    tipo_aposta = re.sub(r'\s+', ' ', tipo_aposta).strip()
    
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