import json
import math
import random
import numpy as np
from collections import defaultdict
import os
import datetime

# Peta Stadion Piala Dunia 2026
STADIUM_MAP = {
    '1': 'Estadio Azteca (Mexico City 🇲🇽)', '2': 'MetLife Stadium (New York/NJ 🇺🇸)', '3': 'AT&T Stadium (Dallas 🇺🇸)', '4': 'Arrowhead Stadium (Kansas City 🇺🇸)', '5': 'NRG Stadium (Houston 🇺🇸)', '6': 'Mercedes-Benz Stadium (Atlanta 🇺🇸)', '7': 'SoFi Stadium (Los Angeles 🇺🇸)', '8': 'Lincoln Financial Field (Philadelphia 🇺🇸)', '9': 'Lumen Field (Seattle 🇺🇸)', '10': "Levi's Stadium (San Francisco 🇺🇸)", '11': 'Gillette Stadium (Boston 🇺🇸)', '12': 'Hard Rock Stadium (Miami 🇺🇸)', '13': 'Estadio BBVA (Monterrey 🇲🇽)', '14': 'Estadio Akron (Guadalajara 🇲🇽)', '15': 'BC Place (Vancouver 🇨🇦)', '16': 'BMO Field (Toronto 🇨🇦)'
}

# ---------- LOAD DATA ----------
def load_json(filename, default):
    if not os.path.exists(filename):
        return default
    with open(filename, 'r') as f:
        return json.load(f)

elo = load_json('elo_ratings.json', {
    "Mexico": 1880, "South Korea": 1820, "Czech Republic": 1740, "South Africa": 1700,
    "Canada": 1760, "Bosnia and Herzegovina": 1720, "Qatar": 1680, "Switzerland": 1820,
    "Scotland": 1720, "Brazil": 2040, "Morocco": 1860, "Haiti": 1600,
    "United States": 1850, "Australia": 1780, "Turkey": 1740, "Paraguay": 1700,
    "Germany": 1960, "Curaçao": 1580, "Ivory Coast": 1800, "Ecuador": 1840,
    "Netherlands": 2000, "Japan": 1850, "Sweden": 1780, "Tunisia": 1780,
    "Belgium": 1940, "Egypt": 1800, "Iran": 1750, "New Zealand": 1650,
    "Spain": 2100, "Cape Verde": 1620, "Saudi Arabia": 1670, "Uruguay": 1900,
    "France": 2080, "Norway": 1820, "Iraq": 1660, "Senegal": 1840,
    "Argentina": 2060, "Algeria": 1760, "Austria": 1780, "Jordan": 1650,
    "Portugal": 1980, "Democratic Republic of the Congo": 1680, "Uzbekistan": 1640, "Colombia": 1880,
    "England": 2050, "Croatia": 1920, "Ghana": 1770, "Panama": 1650
})

players = load_json('players_data.json', {
  "topScorerCandidates": [{"name": "Kylian Mbappé", "team": "France"}],
  "bestPlayerCandidates": [{"name": "Rodri", "team": "Spain"}],
  "youngPlayerCandidates": [{"name": "Lamine Yamal", "team": "Spain"}],
  "goalkeeperCandidates": [{"name": "Mike Maignan", "team": "France"}]
})

# Modern Football Strength (MFS) has been removed to rely fully on Elo

STADIUM_FACTORS = {
    '1':  {'name': 'Estadio Azteca', 'altitude': 2240, 'avg_temp': 24, 'has_ac': False, 'humidity': 'moderate'},
    '14': {'name': 'Estadio Akron', 'altitude': 1566, 'avg_temp': 28, 'has_ac': False, 'humidity': 'moderate'},
    '13': {'name': 'Estadio BBVA', 'altitude': 500,  'avg_temp': 34, 'has_ac': False, 'humidity': 'high'},
    '3':  {'name': 'AT&T Stadium', 'altitude': 200,  'avg_temp': 33, 'has_ac': True,  'humidity': 'moderate'},
    '5':  {'name': 'NRG Stadium',  'altitude': 30,   'avg_temp': 33, 'has_ac': True,  'humidity': 'high'},
    '6':  {'name': 'Mercedes-Benz Stadium', 'altitude': 300, 'avg_temp': 30, 'has_ac': True, 'humidity': 'high'},
    '7':  {'name': 'SoFi Stadium', 'altitude': 30,   'avg_temp': 24, 'has_ac': True,  'humidity': 'low'},
    '9':  {'name': 'Lumen Field',  'altitude': 20,   'avg_temp': 22, 'has_ac': False, 'humidity': 'moderate'},
    '15': {'name': 'BC Place',     'altitude': 10,   'avg_temp': 20, 'has_ac': False, 'humidity': 'moderate'},
    '16': {'name': 'BMO Field',    'altitude': 100,  'avg_temp': 25, 'has_ac': False, 'humidity': 'moderate'},
    '11': {'name': 'Gillette Stadium', 'altitude': 50, 'avg_temp': 26, 'has_ac': False, 'humidity': 'moderate'},
    '12': {'name': 'Hard Rock Stadium', 'altitude': 5, 'avg_temp': 31, 'has_ac': False, 'humidity': 'very_high'},
    '2':  {'name': 'MetLife Stadium', 'altitude': 10, 'avg_temp': 27, 'has_ac': False, 'humidity': 'moderate'},
    '8':  {'name': 'Lincoln Financial Field', 'altitude': 10, 'avg_temp': 28, 'has_ac': False, 'humidity': 'moderate'},
    '4':  {'name': 'Arrowhead Stadium', 'altitude': 280, 'avg_temp': 30, 'has_ac': False, 'humidity': 'moderate'},
    '10': {'name': "Levi's Stadium", 'altitude': 20, 'avg_temp': 24, 'has_ac': False, 'humidity': 'low'},
}

COUNTRY_AVG_TEMP = {
    'Spain': 15, 'France': 12, 'England': 10, 'Germany': 9, 'Netherlands': 10,
    'Argentina': 18, 'Brazil': 25, 'Uruguay': 17, 'Colombia': 24, 'Ecuador': 20,
    'Portugal': 16, 'Belgium': 10, 'Croatia': 12, 'Switzerland': 9, 'Austria': 8,
    'Scotland': 8, 'Sweden': 6, 'Norway': 5, 'Denmark': 8, 'Poland': 8,
    'Ukraine': 9, 'Turkey': 14, 'Morocco': 20, 'Senegal': 27, 'Egypt': 25,
    'Tunisia': 20, 'Algeria': 22, 'Ghana': 27, 'Ivory Coast': 27, 'South Africa': 18,
    'Japan': 14, 'South Korea': 13, 'Australia': 18, 'Iran': 18, 'Iraq': 23,
    'Jordan': 20, 'Saudi Arabia': 25, 'Qatar': 28, 'Uzbekistan': 14, 'New Zealand': 13,
    'Canada': 6, 'Mexico': 21, 'United States': 13, 'Panama': 27, 'Haiti': 27,
    'Cape Verde': 24, 'Curaçao': 28, 'Bosnia and Herzegovina': 10,
    'Democratic Republic of the Congo': 24, 'Czech Republic': 8
}

G_MOMENTUM_HISTORY = defaultdict(list)
G_WINLESS_STREAK = defaultdict(int)
G_GOALSCORERS = defaultdict(int)

# G_TAHAP7_TARGETS is removed; bracket probability will now accurately use dynamic simulation ranking
G_TAHAP7_TARGETS = {}

def get_team_momentum(team):
    hist = G_MOMENTUM_HISTORY[team][-4:]
    if not hist:
        if get_elo(team) < 1750:
            return max(-0.8, min(0.8, np.random.normal(0, 0.25)))
        return 0
    weights = [0.4, 0.3, 0.2, 0.1][:len(hist)]
    val = sum(h * w for h, w in zip(reversed(hist), weights))
    return max(-0.5, min(0.5, val))

import re
def parse_scorers_str(s):
    if not s or s == 'null': return []
    names = re.findall(r'"([^"]+)"', s)
    result = []
    for entry in names:
        entry = entry.strip()
        cleaned = re.split(r'\d', entry, maxsplit=1)[0].strip()
        if cleaned:
            result.append(cleaned)
    return result

def get_underdog_rally_factor(team):
    if G_WINLESS_STREAK[team] >= 2 and get_elo(team) < 1950:
        return 0.051
    return 0.0

def get_elo(name):
    if not name or name == 'TBD': return 1800
    if name in elo: return elo[name]
    for k, v in elo.items():
        if name.lower() in k.lower() or k.lower() in name.lower(): return v
    return 1800

def expected_score(elo_a, elo_b):
    return 1 / (1 + 10 ** ((elo_b - elo_a) / 400))

def update_elo(home, away, result, k=40):
    """
    result: 1 = home win, 0.5 = draw, 0 = away win
    K-factor: 40 base (World Cup standard), scaled by goal diff.
    Draw against weaker team is PUNISHED: expected_score > 0.5 means draw is BELOW expectation.
    """
    exp_h = expected_score(elo.get(home, 1800), elo.get(away, 1800))
    exp_a = 1 - exp_h
    new_h = max(1200, min(2300, elo.get(home, 1800) + k * (result - exp_h)))
    new_a = max(1200, min(2300, elo.get(away, 1800) + k * ((1 - result) - exp_a)))
    elo[home] = new_h
    elo[away] = new_a

def bivariate_poisson_lambdas(lam_home, lam_away, rho=-0.09):
    # Pure lambda, we do not modify lambdas with negative covariance as it incorrectly inflates goals
    return max(0.1, lam_home), max(0.1, lam_away)

def predict_match(home, away, home_elo, away_elo, momentum_h=0, momentum_a=0, rally_h=0, rally_a=0, stadium_id=""):
    # Pure Elo based adjustment with momentum and underdog rally
    home_adj = home_elo * (1 + momentum_h * 0.1) * (1 + rally_h)
    away_adj = away_elo * (1 + momentum_a * 0.1) * (1 + rally_a)

    exp_h = 10 ** ((home_adj - away_adj) / 400)
    exp_a = 10 ** ((away_adj - home_adj) / 400)
    lam_h = 1.35 * exp_h / (exp_h + exp_a)
    lam_a = 1.35 * exp_a / (exp_h + exp_a)

    # Home advantage for tournament hosts
    hosts = ["United States", "Mexico", "Canada"]
    if home in hosts:
        lam_h += 0.15
    if away in hosts:
        lam_a += 0.15

    # Geographic & Climate Penalties
    stadium = STADIUM_FACTORS.get(stadium_id, {})
    altitude = stadium.get('altitude', 0)
    has_ac = stadium.get('has_ac', False)
    venue_temp = stadium.get('avg_temp', 24)
    
    # 1. Altitude Factor (xG reduction for away teams, hosts immune)
    if altitude > 1500:
        penalty = (altitude - 1500) / 500 * 0.05
        if home not in hosts: lam_h -= penalty
        if away not in hosts: lam_a -= penalty
        # Extra slight bonus for Mexico
        if home == "Mexico": lam_h += 0.05
        if away == "Mexico": lam_a += 0.05
        
    # 2. Extreme Heat Factor (without AC)
    if venue_temp > 30 and not has_ac:
        base_penalty = 0.10
        if COUNTRY_AVG_TEMP.get(home, 13) < 15 and home not in hosts:
            lam_h -= base_penalty * 1.2
        elif home not in hosts:
            lam_h -= base_penalty
            
        if COUNTRY_AVG_TEMP.get(away, 13) < 15 and away not in hosts:
            lam_a -= base_penalty * 1.2
        elif away not in hosts:
            lam_a -= base_penalty
            
    # 3. High Humidity & Heat (e.g. Miami)
    if stadium.get('humidity') == 'very_high' and venue_temp > 30 and not has_ac:
        if home not in hosts: lam_h -= 0.07
        if away not in hosts: lam_a -= 0.07

    lam_h = max(0.1, lam_h)
    lam_a = max(0.1, lam_a)
    lh, la = bivariate_poisson_lambdas(lam_h, lam_a)

    wins = draws = losses = 0
    for _ in range(300):
        gh = np.random.poisson(lh)
        ga = np.random.poisson(la)
        if gh > ga: wins += 1
        elif gh == ga: draws += 1
        else: losses += 1
    total = wins + draws + losses
    return wins/total, draws/total, losses/total

# ---------- GROUP SIMULATION ----------
def simulate_group_probs(matches_list, teams, current_pts, current_gd):
    """
    Simulate remaining group matches N times.
    Returns probability of each team finishing top 2 in their group.
    Uses N=600 for low variance.
    """
    N = 600
    finish_top2 = {t: 0 for t in teams}
    remaining = [m for m in matches_list if not m['isFinished']]

    if not remaining:
        # All matches played - determine top 2 deterministically
        sorted_teams = sorted(teams, key=lambda t: (-current_pts.get(t, 0), -current_gd.get(t, 0)))
        for i, t in enumerate(sorted_teams):
            finish_top2[t] = 100 if i < 2 else 0
        return finish_top2

    for _ in range(N):
        pts = current_pts.copy()
        gd = current_gd.copy()

        for m in remaining:
            h, a = m['home'], m['away']
            if h == 'TBD' or a == 'TBD': continue

            ph, pd, pa = predict_match(
                h, a, get_elo(h), get_elo(a),
                get_team_momentum(h), get_team_momentum(a),
            get_underdog_rally_factor(h), get_underdog_rally_factor(a),
                stadium_id=str(m.get('stadium_id', ''))
            )
            r = random.random()
            if r < ph:
                pts[h] += 3
                gd[h] += 1; gd[a] -= 1
            elif r < ph + pd:
                pts[h] += 1; pts[a] += 1
            else:
                pts[a] += 3
                gd[a] += 1; gd[h] -= 1

        sorted_teams = sorted(teams, key=lambda t: (-pts.get(t, 0), -gd.get(t, 0)))
        if len(sorted_teams) > 0: finish_top2[sorted_teams[0]] += 1
        if len(sorted_teams) > 1: finish_top2[sorted_teams[1]] += 1

    return {t: (finish_top2[t] / N) * 100 for t in teams}

# ---------- PARSING DATA UTAMA ----------
def process_matches(matches):
    group_map = defaultdict(lambda: {'teams': {}, 'matches': []})
    knockouts = []
    all_fixtures = []

    for m in matches:
        home = m.get('home_team_name_en')
        away = m.get('away_team_name_en')
        if not home or home == 'null': home = m.get('home_team_label') or 'TBD'
        if not away or away == 'null': away = m.get('away_team_label') or 'TBD'

        status = 'FINISHED' if m.get('finished') == 'TRUE' else 'SCHEDULED'
        done = status == 'FINISHED'
        score_h = int(m.get('home_score')) if done and m.get('home_score') not in [None, 'null'] else None
        score_a = int(m.get('away_score')) if done and m.get('away_score') not in [None, 'null'] else None

        if done:
            for name in parse_scorers_str(m.get('home_scorers')):
                G_GOALSCORERS[(name.upper(), home)] += 1
            for name in parse_scorers_str(m.get('away_scorers')):
                G_GOALSCORERS[(name.upper(), away)] += 1

        stage_map = {
            'group': 'GROUP_STAGE', 'r32': 'LAST_32', 'r16': 'LAST_16',
            'qf': 'QUARTER_FINALS', 'sf': 'SEMI_FINALS', 'third': 'THIRD_PLACE', 'final': 'FINAL'
        }
        stage = stage_map.get(m.get('type'), 'GROUP_STAGE')
        
        local_date = m.get('local_date', '')
        utc_date = local_date
        
        try:
            if len(local_date) == 16:
                dt = datetime.datetime.strptime(local_date, "%m/%d/%Y %H:%M")
                m_id = int(m.get('id', 0))
                
                # Determine time slots based on official FIFA World Cup 2026 daily schedule
                # Slot 1: 19:00 UTC, Slot 2: 22:00 UTC, Slot 3: 01:00 UTC (+1d), Slot 4: 04:00 UTC (+1d)
                
                if m_id <= 72: # Normal Group Stage matches (2 or 4 per day)
                    # We can assign based on match_id modulo 4, but that depends on start.
                    # June 11 has M1, M2. June 12 has M3, M4. 
                    # June 13 has M5, M6, M7, M8.
                    if m_id in [1, 3]: slot_hour = 19
                    elif m_id in [2, 4]: slot_hour = 22
                    else:
                        slot_idx = (m_id - 5) % 4
                        if slot_idx == 0: slot_hour = 19
                        elif slot_idx == 1: slot_hour = 22
                        elif slot_idx == 2: slot_hour = 25 # 01:00 next day
                        else: slot_hour = 28 # 04:00 next day
                else: # Final group matches (played simultaneously, 6 per day)
                    slot_idx = (m_id - 73) % 6
                    if slot_idx < 2: slot_hour = 19
                    elif slot_idx < 4: slot_hour = 22
                    else: slot_hour = 25 # 01:00 next day
                
                # base date is the local_date stripped of its time, default to 00:00
                dt_base = dt.replace(hour=0, minute=0, second=0)
                dt_utc = dt_base + datetime.timedelta(hours=slot_hour)
                utc_date = dt_utc.isoformat() + "Z"
        except: pass

        match_obj = {
            'id': m.get('id'),
            'utcDate': utc_date,
            'status': status,
            'stage': stage,
            'home': home,
            'away': away,
            'score_h': score_h,
            'score_a': score_a,
            'home_scorers': m.get('home_scorers', ''),
            'away_scorers': m.get('away_scorers', ''),
            'stadium_id': str(m.get('stadium_id', '')),
            'stadium': STADIUM_MAP.get(str(m.get('stadium_id', '')), 'Unknown Stadium'),
            'isFinished': done
        }
        all_fixtures.append(match_obj)

        if stage == 'GROUP_STAGE':
            gk = 'GROUP_' + m.get('group', 'UNKNOWN')

            def init_team(name):
                if not name or name == 'TBD' or name in group_map[gk]['teams']: return
                group_map[gk]['teams'][name] = {
                    'name': name, 'played': 0, 'won': 0, 'drawn': 0, 'lost': 0,
                    'goalsFor': 0, 'goalsAgainst': 0, 'goalDifference': 0, 'points': 0
                }
            init_team(home); init_team(away)

            if done and score_h is not None and score_a is not None:
                hg, ag = score_h, score_a
                for team_name, is_home in [(home, True), (away, False)]:
                    if team_name == 'TBD': continue
                    t = group_map[gk]['teams'][team_name]
                    t['played'] += 1
                    t['goalsFor'] += hg if is_home else ag
                    t['goalsAgainst'] += ag if is_home else hg
                    t['goalDifference'] += (hg - ag) if is_home else (ag - hg)
                    if (is_home and hg > ag) or (not is_home and ag > hg):
                        t['won'] += 1; t['points'] += 3
                    elif hg == ag:
                        t['drawn'] += 1; t['points'] += 1
                    else:
                        t['lost'] += 1

            group_map[gk]['matches'].append(match_obj)
        else:
            knockouts.append(match_obj)

    # ---- Compute Momentum and Elo Updates from REAL results ----
    global G_MOMENTUM_HISTORY, G_WINLESS_STREAK
    G_MOMENTUM_HISTORY.clear()
    G_WINLESS_STREAK.clear()

    # Sort chronologically before updating Elo
    all_fixtures.sort(key=lambda x: x['utcDate'] if x.get('utcDate') else '9999')

    for m in all_fixtures:
        if m.get('status') == 'FINISHED':
            home = m.get('home')
            away = m.get('away')
            hg = m.get('score_h')
            ag = m.get('score_a')
            if hg is not None and ag is not None and home and away and home != 'TBD' and away != 'TBD':
                # Capture PRE-update Elo for momentum calculation
                pre_elo_h = elo.get(home, 1800)
                pre_elo_a = elo.get(away, 1800)

                # Dynamic K-factor: World Cup base=40, scaled by goal margin
                goal_diff = abs(hg - ag)
                if goal_diff <= 1:
                    k = 40
                elif goal_diff == 2:
                    k = 46  # +15%
                else:
                    k = 52  # +30% for 3+ goal margin

                if hg > ag:
                    update_elo(home, away, 1, k=k)
                    G_WINLESS_STREAK[home] = 0
                    G_WINLESS_STREAK[away] += 1
                elif ag > hg:
                    update_elo(home, away, 0, k=k)
                    G_WINLESS_STREAK[home] += 1
                    G_WINLESS_STREAK[away] = 0
                else:
                    # Draw: always K=40. Favorites LOSE Elo on a draw.
                    update_elo(home, away, 0.5, k=40)
                    G_WINLESS_STREAK[home] += 1
                    G_WINLESS_STREAK[away] += 1

                # Momentum uses PRE-match Elo of opponent to weight the impact
                G_MOMENTUM_HISTORY[home].append((hg - ag) * (pre_elo_a / 2000.0))
                G_MOMENTUM_HISTORY[away].append((ag - hg) * (pre_elo_h / 2000.0))

    groups = {}
    for key, data in group_map.items():
        teams_list = list(data['teams'].values())
        teams_names = [t['name'] for t in teams_list]

        pts_dict = {t['name']: t['points'] for t in teams_list}
        gd_dict = {t['name']: t['goalDifference'] for t in teams_list}
        probs = simulate_group_probs(data['matches'], teams_names, pts_dict, gd_dict)
        for t in teams_list:
            t['qualProb'] = round(probs.get(t['name'], 0), 2)
        teams_list.sort(key=lambda x: (
            -x['points'], -x['goalDifference'], -x['goalsFor'],
            -G_TAHAP7_TARGETS.get(x['name'], 0), -get_elo(x['name'])
        ))
        for i, t in enumerate(teams_list): t['position'] = i + 1
        data['standings'] = teams_list
        groups[key.replace('GROUP_', 'Group ')] = data

    return groups, knockouts, all_fixtures

# ---------- TOURNAMENT SIMULATION ----------
def simulate_tournament(groups, knockouts):
    """
    FIXED Monte Carlo simulation:
    - Uses actual World Cup 2026 R32 bracket structure (not random reversal)
    - Groups are sampled WITHOUT replacement (no duplicate winner/runner-up)
    - 3000 simulations for stable probabilities
    - Wins are weighted by the Elo-based predict_match, including draw -> penalties 50/50
    """
    winner_counts = defaultdict(int)
    all_teams = set()

    # Map group letter to the groups dict key
    group_key_map = {}  # 'A' -> 'Group A', etc.
    for grp_key, data in groups.items():
        letter = grp_key.replace('Group ', '')
        group_key_map[letter] = grp_key
        for t in data['standings']:
            all_teams.add(t['name'])

    # Official WC 2026 R32 Bracket is hardcoded in the simulation loop
    # because it relies on 495 combinations of third-placed teams.

    def simulate_one_group(grp_key, data):
        """Simulate remaining matches in one group, return sorted team list."""
        teams_list = data['standings']
        teams = [t['name'] for t in teams_list]
        pts = {t['name']: t['points'] for t in teams_list}
        gd_s = {t['name']: t['goalDifference'] for t in teams_list}
        remaining = [m for m in data['matches'] if not m['isFinished']]

        for m in remaining:
            h, a = m['home'], m['away']
            if h == 'TBD' or a == 'TBD': continue
            ph, pd, pa = predict_match(
                h, a, get_elo(h), get_elo(a),
                get_team_momentum(h), get_team_momentum(a),
            get_underdog_rally_factor(h), get_underdog_rally_factor(a),
                stadium_id=str(m.get('stadium_id', ''))
            )
            r = random.random()
            if r < ph:
                pts[h] += 3; gd_s[h] += 1; gd_s[a] -= 1
            elif r < ph + pd:
                pts[h] += 1; pts[a] += 1
            else:
                pts[a] += 3; gd_s[a] += 1; gd_s[h] -= 1

        sorted_teams = sorted(teams, key=lambda t: (-pts.get(t, 0), -gd_s.get(t, 0)))
        return [{'name': t, 'pts': pts.get(t, 0), 'gd': gd_s.get(t, 0)} for t in sorted_teams]

    def knockout_match(h, a, stadium_id=""):
        if h == 'TBD' or not h: return a
        if a == 'TBD' or not a: return h
        ph, pd, pa = predict_match(
            h, a, get_elo(h), get_elo(a),
            get_team_momentum(h), get_team_momentum(a),
            get_underdog_rally_factor(h), get_underdog_rally_factor(a),
            stadium_id=stadium_id
        )
        # In knockouts, draw = penalties = 50/50
        home_total = ph + pd / 2.0
        return h if random.random() < home_total else a

    def run_round(matches):
        return [knockout_match(h, a) for h, a in matches]

    num_sims = 3000
    reach_r32 = defaultdict(int)
    reach_qf = defaultdict(int)
    reach_sf = defaultdict(int)
    for _ in range(num_sims):
        # Step 1: Simulate each group to get standings for this iteration
        sim_standings = {}  # grp_key -> [team1, team2, team3, team4] sorted
        for grp_key, data in groups.items():
            sim_standings[grp_key] = simulate_one_group(grp_key, data)

        # Step 2: Build Official WC 2026 R32 Bracket
        def get_team(pos, grp_letter):
            key = group_key_map.get(grp_letter)
            if not key: return 'TBD'
            s = sim_standings.get(key, [])
            return s[pos-1]['name'] if len(s) >= pos else 'TBD'

        thirds_pool = []
        for grp_key, standings in sim_standings.items():
            if len(standings) >= 3:
                thirds_pool.append(standings[2])
        # Sort best thirds by points, then GD, then Elo as tiebreaker
        thirds_pool.sort(key=lambda t: (-t['pts'], -t['gd'], -get_elo(t['name'])))
        best_thirds = thirds_pool[:8]

        t_idx = 0
        def get_third():
            nonlocal t_idx
            t = best_thirds[t_idx]['name'] if t_idx < len(best_thirds) else 'TBD'
            t_idx += 1
            return t

        # Official 16 matches of Round of 32
        m73 = (get_team(2, 'A'), get_team(2, 'B'))
        m74 = (get_team(1, 'E'), get_third())
        m75 = (get_team(1, 'F'), get_team(2, 'C'))
        m76 = (get_team(1, 'C'), get_team(2, 'F'))
        m77 = (get_team(1, 'I'), get_third())
        m78 = (get_team(2, 'E'), get_team(2, 'I'))
        m79 = (get_team(1, 'A'), get_third())
        m80 = (get_team(1, 'L'), get_third())
        m81 = (get_team(1, 'D'), get_third())
        m82 = (get_team(1, 'G'), get_third())
        m83 = (get_team(2, 'K'), get_team(2, 'L'))
        m84 = (get_team(1, 'H'), get_team(2, 'J'))
        m85 = (get_team(1, 'B'), get_third())
        m86 = (get_team(1, 'J'), get_team(2, 'H'))
        m87 = (get_team(1, 'K'), get_third())
        m88 = (get_team(2, 'D'), get_team(2, 'G'))

        # Track qualification for reach_r32
        all_r32_teams = [
            m73[0], m73[1], m74[0], m74[1], m75[0], m75[1], m76[0], m76[1],
            m77[0], m77[1], m78[0], m78[1], m79[0], m79[1], m80[0], m80[1],
            m81[0], m81[1], m82[0], m82[1], m83[0], m83[1], m84[0], m84[1],
            m85[0], m85[1], m86[0], m86[1], m87[0], m87[1], m88[0], m88[1]
        ]
        for t in all_r32_teams:
            if t != 'TBD': reach_r32[t] += 1

        # Ordered so sequential pairs form R16 matches correctly (official FIFA 2026 format)
        r32_matches = [
            m73, m75,
            m74, m77,
            m76, m78,
            m79, m80,
            m83, m84,
            m81, m82,
            m85, m87,
            m86, m88
        ]

        # Step 4: Run knockout rounds
        if not r32_matches: continue
        r16_teams = run_round(r32_matches)
        if len(r16_teams) < 2: continue
        r16_pairs = [(r16_teams[i], r16_teams[i+1]) for i in range(0, len(r16_teams)-1, 2)]
        # QF Teams (8 teams)
        qf_teams = run_round(r16_pairs)
        if len(qf_teams) < 2: continue
        for t in qf_teams: reach_qf[t] += 1
        
        # Build 4 QF matches
        qf_pairs = [(qf_teams[i], qf_teams[i+1]) for i in range(0, len(qf_teams)-1, 2)]
        
        # SF Teams (4 teams)
        sf_teams = run_round(qf_pairs)
        if len(sf_teams) < 2: continue
        for t in sf_teams: reach_sf[t] += 1
        
        # FIFA Official Bracket cross-pairing for Semi-Finals:
        # SF1 = Winner of QF1 (Match 97) vs Winner of QF3 (Match 98)
        # SF2 = Winner of QF2 (Match 99) vs Winner of QF4 (Match 100)
        # sf_teams[0] = Winner of QF1
        # sf_teams[1] = Winner of QF2
        # sf_teams[2] = Winner of QF3
        # sf_teams[3] = Winner of QF4
        
        sf_pairs = [
            (sf_teams[0], sf_teams[2]), # SF1: QF1 vs QF3
            (sf_teams[1], sf_teams[3])  # SF2: QF2 vs QF4
        ]
        
        final_teams = run_round(sf_pairs)
        if len(final_teams) >= 2:
            winner_counts[knockout_match(final_teams[0], final_teams[1])] += 1
        elif final_teams:
            winner_counts[final_teams[0]] += 1

    total = sum(winner_counts.values()) or 1
    avg_winner = max(winner_counts, key=winner_counts.get) if winner_counts else 'TBD'
    avg_winner_prob = round((winner_counts.get(avg_winner, 0) / total) * 100, 2)

    ranking = []
    for t in all_teams:
        prob = round((winner_counts.get(t, 0) / total) * 100, 2)
        ranking.append({'name': t, 'elo': get_elo(t), 'winProb': prob})
    ranking.sort(key=lambda x: x['winProb'], reverse=True)

    # Build the deterministic bracket based purely on mathematics!
    bracket = build_bracket(knockouts, groups, G_TAHAP7_TARGETS, ranking)

    # Extract EXACT winners, finalists, DH, and Flops from the definitive bracket to ensure 100% Synergy
    final_match_pair = ['TBD', 'TBD']
    bracket_winner = 'TBD'
    if bracket and len(bracket) > 0:
        final_stage = bracket[-1]
        if final_stage['matches'] and len(final_stage['matches']) > 0:
            fm = final_stage['matches'][0]
            final_match_pair = [fm['home'], fm['away']]
            score_h = fm.get('score_h', 0)
            score_a = fm.get('score_a', 0)
            if fm.get('status') == 'FINISHED' and score_h is not None and score_a is not None:
                bracket_winner = fm['home'] if score_h > score_a else fm['away']
            else:
                bracket_winner = fm['home'] if score_h > score_a else fm['away'] # based on simulated scores

    winner = bracket_winner if bracket_winner != 'TBD' else avg_winner
    winner_prob = next((r['winProb'] for r in ranking if r['name'] == winner), avg_winner_prob)

    bracket_teams_by_stage = {}
    for stage in bracket:
        teams = set()
        for match in stage['matches']:
            teams.add(match['home'])
            teams.add(match['away'])
        bracket_teams_by_stage[stage['stage']] = teams

    sf_teams_b = bracket_teams_by_stage.get('SEMI_FINALS', set())
    qf_teams_b = bracket_teams_by_stage.get('QUARTER_FINALS', set())

    GIANTS = {"Spain", "France", "Argentina", "Brazil", "England", "Germany",
              "Portugal", "Netherlands", "Belgium", "Uruguay"}

    real_dh = []
    for t in sf_teams_b:
        if t != 'TBD' and t not in GIANTS:
            prob = reach_sf.get(t, 0) / num_sims * 100
            real_dh.append({'name': t, 'prob': prob})
            
    if not real_dh:
        for t in qf_teams_b:
            if t != 'TBD' and t not in GIANTS:
                prob = reach_qf.get(t, 0) / num_sims * 100
                real_dh.append({'name': t, 'prob': prob})

    real_flops = []
    for t in all_teams:
        if t in GIANTS and t not in qf_teams_b and t != 'TBD':
            prob = (num_sims - reach_qf.get(t, 0)) / num_sims * 100
            if prob > 0:
                real_flops.append({'name': t, 'prob': prob})

    real_dh.sort(key=lambda x: x['prob'], reverse=True)
    real_flops.sort(key=lambda x: x['prob'], reverse=True)

    if not real_dh:
        real_dh = [{'name': t['name'], 'prob': t['winProb']} for t in ranking if t['name'] not in GIANTS][:3]
    if not real_flops:
        real_flops = [{'name': t['name'], 'prob': t['winProb']} for t in ranking if t['name'] in GIANTS][:2]

    # Update true qualProb for all teams based on Monte Carlo R32 qualification frequency
    for grp_name, grp_data in groups.items():
        if 'standings' in grp_data:
            for t in grp_data['standings']:
                t['qualProb'] = round((reach_r32.get(t['name'], 0) / num_sims) * 100, 2)

    # Build group qualification status for standings syncing
    group_qual_status = {}
    for grp_name, grp_data in groups.items():
        st = sorted(grp_data.get('standings', []), key=lambda x: (
            -x.get('qualProb', 0), -x.get('points', 0),
            -x.get('goalDifference', 0), -x.get('goalsFor', 0)
        ))
        confirmed = all(t.get('played', 0) >= 3 for t in st)
        group_qual_status[grp_name] = {
            'confirmed': confirmed,
            'pred_1st': st[0]['name'] if len(st) > 0 else None,
            'pred_2nd': st[1]['name'] if len(st) > 1 else None,
            'pred_3rd': st[2]['name'] if len(st) > 2 else None,
        }

    # Build best 8 third-place teams list for standings table (PREDICTED)
    all_thirds_pred = []
    for grp_name, grp_data in groups.items():
        st = sorted(grp_data.get('standings', []), key=lambda x: (
            -x.get('qualProb', 0), -x.get('points', 0),
            -x.get('goalDifference', 0), -x.get('goalsFor', 0)
        ))
        if len(st) >= 3:
            t = st[2]
            all_thirds_pred.append({
                'name': t['name'],
                'group': grp_name.replace('Group ', ''),
                'qualProb': t.get('qualProb', 0),
                'points': t.get('points', 0),
                'goalDifference': t.get('goalDifference', 0),
                'goalsFor': t.get('goalsFor', 0),
                'played': t.get('played', 0),
                'confirmed': group_qual_status.get(grp_name, {}).get('confirmed', False)
            })
    all_thirds_pred.sort(key=lambda x: (-x['qualProb'], -x['points'], -x['goalDifference'], -x['goalsFor']))
    best_8_thirds_predicted = all_thirds_pred[:8]
    
    # Mark which ones are selected based on combo key
    try:
        _t_groups = sorted([t['group'] for t in best_8_thirds_predicted])
        _combo = ''.join(_t_groups)
        import json as _json, os as _os
        if _os.path.exists('permutations_495.json'):
            _perms = _json.load(open('permutations_495.json'))
            _combo_map = _perms.get(_combo, {})
            selected_third_names = set(t['name'] for t in best_8_thirds_predicted)
    except:
        selected_third_names = set(t['name'] for t in best_8_thirds_predicted)
    
    for t in best_8_thirds_predicted:
        t['selected'] = t['name'] in selected_third_names

    # Build best 8 third-place teams list for standings table (REAL-TIME)
    all_thirds_rt = []
    for grp_name, grp_data in groups.items():
        st = sorted(grp_data.get('standings', []), key=lambda x: (
            -x.get('points', 0), -x.get('goalDifference', 0), -x.get('goalsFor', 0)
        ))
        if len(st) >= 3:
            t = st[2]
            all_thirds_rt.append({
                'name': t['name'],
                'group': grp_name.replace('Group ', ''),
                'qualProb': t.get('qualProb', 0),
                'points': t.get('points', 0),
                'goalDifference': t.get('goalDifference', 0),
                'goalsFor': t.get('goalsFor', 0),
                'played': t.get('played', 0),
                'confirmed': group_qual_status.get(grp_name, {}).get('confirmed', False)
            })
    all_thirds_rt.sort(key=lambda x: (-x['points'], -x['goalDifference'], -x['goalsFor']))
    best_8_thirds_realtime = all_thirds_rt[:8]
    
    try:
        _t_groups_rt = sorted([t['group'] for t in best_8_thirds_realtime])
        _combo_rt = ''.join(_t_groups_rt)
        if _os.path.exists('permutations_495.json'):
            _perms_rt = _json.load(open('permutations_495.json'))
            _combo_map_rt = _perms_rt.get(_combo_rt, {})
            selected_third_names_rt = set(t['name'] for t in best_8_thirds_realtime)
    except:
        selected_third_names_rt = set(t['name'] for t in best_8_thirds_realtime)
    
    for t in best_8_thirds_realtime:
        t['selected'] = t['name'] in selected_third_names_rt

    return {
        'winner': winner,
        'winnerProb': winner_prob,
        'final': final_match_pair,
        'darkHorses': real_dh[:3],
        'flops': real_flops[:3],
        'globalRanking': ranking,
        'bracket': bracket,
        'groupQualStatus': group_qual_status,
        'best8ThirdsPredicted': best_8_thirds_predicted,
        'best8ThirdsRealTime': best_8_thirds_realtime
    }

def build_bracket(knockouts, groups, tahap7_targets, ranking):
    STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL']
    STAGE_NAMES = {
        'LAST_32': 'Round of 32', 'LAST_16': 'Round of 16',
        'QUARTER_FINALS': 'Quarter Finals', 'SEMI_FINALS': 'Semi Finals', 'FINAL': 'Final'
    }

    VISUAL_ORDER = {
        'LAST_32': ['74', '77', '73', '75', '83', '84', '81', '82', '76', '78', '79', '80', '86', '88', '85', '87'],
        'LAST_16': ['89', '90', '93', '94', '91', '92', '95', '96'],
        'QUARTER_FINALS': ['97', '98', '99', '100'],
        'SEMI_FINALS': ['101', '102'],
        'FINAL': ['104']
    }

    def get_predicted_standings(g_name):
        if g_name in groups and len(groups[g_name]['standings']) > 0:
            return sorted(groups[g_name]['standings'], key=lambda x: (
                -x.get('qualProb', 0), 
                -x.get('points', 0), 
                -x.get('goalDifference', 0),
                -x.get('goalsFor', 0),
                -get_elo(x.get('name', ''))
            ))
        return []

    thirds = []
    third_group_map = {}
    for grp_name, data in groups.items():
        st = get_predicted_standings(grp_name)
        if len(st) >= 3:
            team_info = st[2]
            thirds.append(team_info)
            third_group_map[team_info['name']] = grp_name.replace('Group ', '')
    thirds.sort(key=lambda x: (
        -x.get('qualProb', 0), 
        -x.get('points', 0), 
        -x.get('goalDifference', 0),
        -x.get('goalsFor', 0),
        -get_elo(x.get('name', ''))
    ))
    best_thirds = [t['name'] for t in thirds[:8]]
    best_thirds_groups = sorted([third_group_map[t] for t in best_thirds])
    combo_key = "".join(best_thirds_groups)
    
    import json
    import os
    permutations = {}
    if os.path.exists('permutations_495.json'):
        try:
            with open('permutations_495.json', 'r') as f:
                permutations = json.load(f)
        except:
            pass
            
    current_combo_map = permutations.get(combo_key, {})

    # Build reverse map: resolved team name -> 'Winner Group X' slot
    # Needed because some raw fixtures already have team names instead of 'Winner Group X'
    winner_to_slot = {}
    for grp_name, grp_data in groups.items():
        grp_letter = grp_name.replace('Group ', '')
        st = get_predicted_standings(grp_name)
        if st:
            winner_to_slot[st[0]['name']] = f'Winner Group {grp_letter}'

    used_thirds = set()  # track assigned 3rd-place teams to prevent duplicates

    def resolve_team(name, opponent_slot=None):
        """
        name: the raw fixture slot string e.g. 'Winner Group E', 'Runner-up Group A', '3rd Group ...'
              OR already-resolved team name e.g. 'Germany'
        opponent_slot: the RAW slot string for the opponent — used to look up combo_map.
                       May be a team name if API already resolved it.
        """
        if not name: return 'TBD'
        if name.startswith('Winner Group '):
            g = name.replace('Winner Group ', 'Group ')
            st = get_predicted_standings(g)
            if st: return st[0]['name']
        if name.startswith('Runner-up Group '):
            g = name.replace('Runner-up Group ', 'Group ')
            st = get_predicted_standings(g)
            if len(st) > 1: return st[1]['name']
        if '3rd Group' in name:
            # Normalise opponent_slot: may be team name -> convert to 'Winner Group X'
            opp_norm = opponent_slot
            if opp_norm and not opp_norm.startswith('Winner Group ') and opp_norm in winner_to_slot:
                opp_norm = winner_to_slot[opp_norm]
            if opp_norm and opp_norm in current_combo_map:
                target_slot = current_combo_map[opp_norm]   # e.g. '3rd Group D'
                target_letter = target_slot.replace('3rd Group ', '')
                for t in best_thirds:
                    if third_group_map.get(t) == target_letter and t not in used_thirds:
                        used_thirds.add(t)
                        return t
            # Fallback: pick the next unassigned best-third
            for t in best_thirds:
                if t not in used_thirds:
                    used_thirds.add(t)
                    return t
            return 'TBD'
        if name.startswith('Winner Match '):
            return 'TBD'
        return name


    bracket = []
    match_winners = {}

    for stage_id in STAGE_ORDER:
        matches_in_stage = [m for m in knockouts if m.get('stage') == stage_id]
        if not matches_in_stage: continue

        predicted_matches = []
        for m in matches_in_stage:
            home = m['home']
            away = m['away']

            home_path = 'WINNER' if home.startswith('Winner Group') else ('RUNNER_UP' if home.startswith('Runner-up Group') else ('BEST_THIRD' if '3rd Group' in home else ''))
            away_path = 'WINNER' if away.startswith('Winner Group') else ('RUNNER_UP' if away.startswith('Runner-up Group') else ('BEST_THIRD' if '3rd Group' in away else ''))

            if home.startswith('Winner Match '):
                m_id = home.replace('Winner Match ', '')
                home = match_winners.get(m_id, 'TBD')
            else:
                home = resolve_team(home, opponent_slot=m['away'])

            if away.startswith('Winner Match '):
                m_id = away.replace('Winner Match ', '')
                away = match_winners.get(m_id, 'TBD')
            else:
                away = resolve_team(away, opponent_slot=m['home'])

            predicted_winner = 'TBD'
            score_h = m.get('score_h')
            score_a = m.get('score_a')

            home_prob = tahap7_targets.get(home, 0)
            away_prob = tahap7_targets.get(away, 0)

            if home_prob == 0:
                h_rank = next((r for r in ranking if r['name'] == home), None)
                if h_rank: home_prob = h_rank['winProb']
            if away_prob == 0:
                a_rank = next((r for r in ranking if r['name'] == away), None)
                if a_rank: away_prob = a_rank['winProb']

            total_prob = home_prob + away_prob
            rel_home_prob = round((home_prob / total_prob * 100), 2) if total_prob > 0 else 50.0
            rel_away_prob = round((away_prob / total_prob * 100), 2) if total_prob > 0 else 50.0

            if m.get('status') == 'FINISHED' and score_h is not None and score_a is not None:
                predicted_winner = home if score_h > score_a else away
            elif home != 'TBD' and away != 'TBD':
                home_elo_val = get_elo(home)
                away_elo_val = get_elo(away)
                lam_h = 1.35 * 10 ** ((home_elo_val - away_elo_val) / 400) / (10 ** ((home_elo_val - away_elo_val) / 400) + 1)
                lam_a = 1.35 * 10 ** ((away_elo_val - home_elo_val) / 400) / (10 ** ((away_elo_val - home_elo_val) / 400) + 1)
                
                ph, pd, pa = predict_match(
                    home, away, home_elo_val, away_elo_val,
                    get_team_momentum(home), get_team_momentum(away),
                    get_underdog_rally_factor(home), get_underdog_rally_factor(away),
                    stadium_id=str(m.get('stadium_id', ''))
                )
                
                # Power Gap for Smart Upsets
                home_total = ph + pd / 2.0
                away_total = pa + pd / 2.0
                expected_winner = home if home_total >= away_total else away
                
                # Make the bracket fully deterministic
                score_h = int(lam_h) if expected_winner == home else int(lam_h)
                score_a = int(lam_a) if expected_winner == away else int(lam_a)
                
                # Ensure the expected winner actually has a higher score
                if expected_winner == home and score_h <= score_a:
                    score_h = score_a + 1
                elif expected_winner == away and score_a <= score_h:
                    score_a = score_h + 1

                predicted_winner = expected_winner

            match_winners[str(m['id'])] = predicted_winner

            pm = m.copy()
            pm['home'] = home
            pm['away'] = away
            pm['home_path'] = home_path
            pm['away_path'] = away_path
            pm['home_prob'] = rel_home_prob
            pm['away_prob'] = rel_away_prob
            if m.get('status') != 'FINISHED' and home != 'TBD' and away != 'TBD':
                pm['score_h'] = score_h
                pm['score_a'] = score_a
                pm['isFinished'] = True

            predicted_matches.append(pm)

        if stage_id in VISUAL_ORDER:
            order_list = VISUAL_ORDER[stage_id]
            predicted_matches.sort(key=lambda x: order_list.index(str(x['id'])) if str(x['id']) in order_list else 999)

        bracket.append({
            'stage': stage_id,
            'name': STAGE_NAMES.get(stage_id, stage_id),
            'matches': predicted_matches
        })

    return bracket

def predict_awards(bracket, ranking):
    awards = {
        'topScorer': {'expected': 'Unknown', 'real': 'Unknown'},
        'bestPlayer': [],
        'bestYoung': [],
        'bestGoalkeeper': [],
        'predictedBoot': [],
        'topScorerList': []
    }
    import os
    import json
    db_path = 'players_db.json'
    players_db = {}
    if os.path.exists(db_path):
        try:
            with open(db_path, 'r') as f: players_db = json.load(f)
        except: pass
        
    def get_elo(team_name):
        r = next((x for x in ranking if x['name'] == team_name), None)
        return r['elo'] if r else 1500

    def get_tactic_weight(team_name):
        tactic_map = {'Norway': 1.6, 'Poland': 1.4, 'Spain': 0.8, 'Germany': 0.85}
        return tactic_map.get(team_name, 1.0)
        
    def get_injury_multiplier(pname):
        if 'neymar' in pname.lower(): return 0.2
        if 'ouedraogo' in pname.lower(): return 0.3
        return 1.0

    if players_db:
        # Calculate team_matches_count from the bracket
        from collections import defaultdict
        team_matches_count = defaultdict(int)
        for stage in bracket:
            for m in stage.get('matches', []):
                if m.get('home') != 'TBD': team_matches_count[m['home']] += 1
                if m.get('away') != 'TBD': team_matches_count[m['away']] += 1

        # Simulate clean sheets for GKs: stages in bracket where score is 0 for a team
        team_clean_sheets = defaultdict(int)
        for stage in bracket:
            for m in stage.get('matches', []):
                sh, sa = m.get('score_h'), m.get('score_a')
                if sh is not None and sa is not None:
                    if sa == 0 and m.get('home') != 'TBD': team_clean_sheets[m['home']] += 1
                    if sh == 0 and m.get('away') != 'TBD': team_clean_sheets[m['away']] += 1

        def get_progress_multiplier(team):
            matches_played = 3 + team_matches_count.get(team, 0)
            if matches_played >= 7: return 2.5
            if matches_played >= 5: return 1.0
            return 0.15

        # Build a quick lookup of real goals scored per player (using NORM_G_GOALSCORERS which
        # is constructed later — we use G_GOALSCORERS here since NORM is built after this block)
        import unicodedata
        def norm_words_local(s):
            n = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8')
            return set(w for w in n.upper().replace('.', ' ').replace('-', ' ').split() if w)

        def get_real_goals(p_name, team):
            p_words = norm_words_local(p_name)
            for (g_name, g_team), goals in G_GOALSCORERS.items():
                if g_team != team: continue
                g_words = norm_words_local(g_name)
                long_g = {w for w in g_words if len(w) > 1}
                if long_g and long_g.issubset(p_words):
                    return goals
            return 0

        # Populate bestPlayer, bestYoung, bestGoalkeeper — all synced with real data
        for t in players_db:
            prog_mult = get_progress_multiplier(t)
            elo_factor = get_elo(t) / 2000.0
            team_depth = 3 + team_matches_count.get(t, 0)  # total matches in tournament
            clean_sheets = team_clean_sheets.get(t, 0)

            for p in players_db[t]:
                real_goals = get_real_goals(p['name'], t)
                age = p.get('age_2026', 27)
                inj = get_injury_multiplier(p['name'])
                caps = p.get('caps', 0)
                hist_goals = p.get('goals', 0)

                if p['pos'] == 'GK':
                    # Golden Glove: clean sheets in simulation + caps reputation + deep run
                    # clean_sheets is the key synergy: directly from bracket simulation
                    cs_score = clean_sheets * 3.0
                    rep_score = caps * 0.05 * elo_factor
                    depth_score = team_depth * 0.3
                    score = (cs_score + rep_score + depth_score) * prog_mult * inj
                    awards['bestGoalkeeper'].append({'name': p['name'], 'team': t, 'score': score})

                elif age <= 21:
                    # Golden Boy: real goals matter most, then historical talent + team depth
                    real_goal_score = real_goals * 4.0   # real goals weighted heavily
                    talent_score = (hist_goals * 0.2 + caps * 0.08) * elo_factor
                    score = (real_goal_score + talent_score) * prog_mult * inj
                    # no age penalty for young players, but ensure they're truly young
                    awards['bestYoung'].append({'name': p['name'], 'team': t, 'score': score})

                else:
                    # Golden Ball: all-round impact — real goals, team success, historical calibre
                    real_goal_score = real_goals * 3.0   # synced with boot scorers
                    historical_score = (hist_goals * 0.15 + caps * 0.04) * elo_factor
                    # Bonus for being in a team that won many games (impact player)
                    team_success_bonus = team_depth * 0.2 * elo_factor
                    score = (real_goal_score + historical_score + team_success_bonus) * prog_mult * inj
                    # Mild age penalty only for players with no real goals (reputational candidates only)
                    if real_goals == 0:
                        if age > 38: score *= 0.2
                        elif age > 36: score *= 0.5
                    awards['bestPlayer'].append({'name': p['name'], 'team': t, 'score': score})

        def dedup_by_team(lst, max_n=3):
            seen_teams = set()
            result = []
            for item in lst:
                if item['team'] not in seen_teams:
                    seen_teams.add(item['team'])
                    result.append(item)
                if len(result) >= max_n:
                    break
            return result

        for k in ['bestPlayer', 'bestYoung', 'bestGoalkeeper']:
            awards[k].sort(key=lambda x: x['score'], reverse=True)
            awards[k] = dedup_by_team(awards[k], 3)



        all_player_cands = [(p, t) for t in players_db for p in players_db[t] if p['pos'] in ['FW', 'MF']]
        
        # Build Elo map for fast lookup
        elo_map = {r['name']: r['elo'] for r in ranking}

        import unicodedata
        def norm_words(s):
            n = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8')
            n = n.upper().replace('.', ' ').replace('-', ' ')
            return set(w for w in n.split() if w)

        NORM_G_GOALSCORERS = defaultdict(int)
        for (g_name, g_team), goals in G_GOALSCORERS.items():
            g_words = norm_words(g_name)
            matched_player = None
            if g_team in players_db:
                for p in players_db[g_team]:
                    p_words = norm_words(p['name'])
                    long_g_words = {w for w in g_words if len(w) > 1}
                    if long_g_words and long_g_words.issubset(p_words):
                        matched_player = p['name']
                        break
            if matched_player:
                NORM_G_GOALSCORERS[(matched_player, g_team)] += goals
            else:
                NORM_G_GOALSCORERS[(g_name, g_team)] += goals

        def get_boot_score(x):
            p, t = x[0], x[1]
            sim_goals = NORM_G_GOALSCORERS.get((p['name'], t), 0)
            if sim_goals == 0:
                sim_goals = NORM_G_GOALSCORERS.get((p['name'].upper(), t), 0)
            
            future_team_xg = 0.0
            team_matches = []
            for stage in bracket:
                for m in stage['matches']:
                    if m['home'] == t: team_matches.append(m['away'])
                    elif m['away'] == t: team_matches.append(m['home'])
            
            team_elo = elo_map.get(t, 1800)
            tactic_w = get_tactic_weight(t)
            
            for opp in team_matches:
                if opp == 'TBD': continue
                opp_elo = elo_map.get(opp, get_elo(opp))
                # Elo-adjusted team xG per match (calibrated to avg ~1.8 goals/game)
                elo_diff = team_elo - opp_elo
                lam_team = 1.0 + elo_diff / 1200.0   # ~0.6-1.4 range for realistic teams
                lam_team = max(0.4, min(2.2, lam_team))
                match_team_xg = lam_team
                future_team_xg += match_team_xg
                
            pos_share = 0.30 if p.get('pos') == 'FW' else 0.10
            player_xg_share = pos_share * tactic_w
            
            # form_bonus: small factor based on historical performance, not dominant
            form_bonus = (p.get('goals', 0) * 0.01) + (p.get('caps', 0) * 0.002)
            
            predicted_xg = (future_team_xg * player_xg_share) + form_bonus
            
            # Historical calibration: WC top scorer ~1 goal/match played, avg 6-8 total
            # 2026 format: max 8 matches. So cap prediction at ~10 for realism
            predicted_xg = min(predicted_xg, 10.0)
            
            age = p.get('age_2026', 27)
            if sim_goals == 0:
                if age > 38: predicted_xg *= 0.2
                elif age > 36: predicted_xg *= 0.5
            
            # Hot form bonus: if already scored real goals, boost future xG by 15% per goal 
            # (historical precedent: hot strikers tend to keep scoring)
            if sim_goals > 0:
                hot_form_factor = 1.0 + (sim_goals * 0.15)
                predicted_xg *= hot_form_factor
            
            total_player_xg = sim_goals + predicted_xg
            return total_player_xg * get_injury_multiplier(p['name'])
        
        boot_scored = [(p, t) for p, t in all_player_cands]
        boot_scored.sort(key=get_boot_score, reverse=True)
        
        if boot_scored:
            boot_list = []
            for p, t in boot_scored[:15]:
                score_xg = get_boot_score((p, t))
                predicted_goals = max(1, round(score_xg))
                name_parts = p['name'].split()
                display = ' '.join(name_parts[1:]) + ' ' + name_parts[0].title() if name_parts and name_parts[0].isupper() else p['name'].title()
                boot_list.append({'name': display, 'goals': predicted_goals, 'team': t, 'score': round(score_xg, 2)})
            awards['predictedBoot'] = boot_list
            
            # Apply Golden Boot vs Golden Ball exclusion rule (historical precedent)
            if awards.get('bestPlayer') and len(awards['bestPlayer']) > 0:
                top_boot_winner = boot_scored[0][0]['name']
                if awards['bestPlayer'][0]['name'] == top_boot_winner:
                    # Penalize the Golden Ball score so another player wins it
                    awards['bestPlayer'][0]['score'] *= 0.5
                    awards['bestPlayer'].sort(key=lambda x: x['score'], reverse=True)
                    # Re-dedup to ensure top 3 are still from distinct teams
                    awards['bestPlayer'] = dedup_by_team(awards['bestPlayer'], 3)

    if NORM_G_GOALSCORERS:
        best_tuple = max(NORM_G_GOALSCORERS, key=NORM_G_GOALSCORERS.get)
        awards['topScorer']['real'] = f"{best_tuple[0]} - {NORM_G_GOALSCORERS[best_tuple]} gol"
        sorted_scorers = sorted(NORM_G_GOALSCORERS.items(), key=lambda x: x[1], reverse=True)
        top_list = []
        for (name, p_team), goals in sorted_scorers:
            name_parts = name.split()
            if name_parts and name_parts[0].isupper() and len(name_parts) > 1:
                display_name = ' '.join(name_parts[1:]) + ' ' + name_parts[0].title()
            else:
                display_name = name.title() if name.isupper() else name
            top_list.append({'name': display_name, 'goals': goals, 'team': p_team, 'score': goals})
        awards['topScorerList'] = top_list
    else:
        fallback_list = []
        if players_db:
            for t in players_db:
                for p in players_db[t]:
                    if p.get('goals', 0) > 0:
                        name_parts = p['name'].split()
                        display = ' '.join(name_parts[1:]) + ' ' + name_parts[0].title() if name_parts and name_parts[0].isupper() else p['name'].title()
                        fallback_list.append({'name': display, 'goals': p['goals'], 'team': t, 'score': p['goals']})
            fallback_list.sort(key=lambda x: x['goals'], reverse=True)
            
        if fallback_list:
            awards['topScorerList'] = fallback_list
            best = fallback_list[0]
            awards['topScorer']['real'] = f"{best['name']} - {best['goals']} gol"
        else:
            awards['topScorer']['real'] = "Belum ada gol tercatat"
            awards['topScorerList'] = []
        
    if awards.get('topScorerList'):
        best = awards['topScorerList'][0]
        awards['topScorer']['real'] = f"{best['name']} ({best['team']}) - {best['goals']} gol"

    if awards['predictedBoot']:
        best_pred = awards['predictedBoot'][0]
        awards['topScorer']['expected'] = f"{best_pred['name']} ({best_pred['team']}) - ~{best_pred['goals']} gol (xG)"

    return awards

# ---------- MAIN ----------
def main():
    try:
        with open('matches_cache.json', 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        data = {}

    matches = data.get('matches', [])
    groups, knockouts, all_fixtures = process_matches(matches)
    sim_result = simulate_tournament(groups, knockouts)
    bracket = sim_result['bracket']

    awards = predict_awards(bracket, sim_result['globalRanking'])

    # Live Matches (today, UTC+9 -> today UTC)
    today_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()[:10]
    live_matches = []
    for m in all_fixtures:
        is_today = m.get('utcDate') and str(m['utcDate'])[:10] == today_utc
        is_live = m.get('status') in ['IN_PLAY', 'PAUSED', 'HALF_TIME']
        if is_today or is_live:
            m['isLive'] = is_live
            live_matches.append(m)

    # HISTORY LOGGER — record on every NEW result, not just hourly
    # Check if any match result changed since last snapshot
    history_file = 'probability_history.json'
    history_data = []
    if os.path.exists(history_file):
        with open(history_file, 'r') as f:
            try:
                history_data = json.load(f)
            except (json.JSONDecodeError, ValueError): pass

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    current_ranking_snapshot = [{'name': r['name'], 'winProb': r['winProb']} for r in sim_result.get('globalRanking', [])]

    finished_count = sum(1 for m in all_fixtures if m.get('status') == 'FINISHED')

    # Record new snapshot if: first run, different hour, or a new match finished
    should_record = not history_data
    if not should_record:
        last_snap = history_data[-1]
        last_ts = last_snap.get('timestamp', '')
        last_fc = last_snap.get('finishedCount', -1)
        
        if last_ts[:13] != timestamp[:13]:
            should_record = True
        elif finished_count > last_fc and last_fc != -1:
            should_record = True

    if should_record:
        snapshot = {'timestamp': timestamp, 'finishedCount': finished_count, 'ranking': current_ranking_snapshot}
        history_data.append(snapshot)
        with open(history_file, 'w') as f:
            json.dump(history_data, f, indent=2)

    output = {
        'status': 'live',
        'final': sim_result['final'],
        'winner': sim_result['winner'],
        'winnerProb': sim_result['winnerProb'],
        'darkHorses': sim_result['darkHorses'],
        'flops': sim_result['flops'],
        'awards': awards,
        'globalRanking': sim_result.get('globalRanking', []),
        'groups': groups,
        'bracket': bracket,
        'allFixtures': all_fixtures,
        'liveMatches': live_matches,
        'history': history_data,
        'lastUpdate': timestamp,
        'groupQualStatus': sim_result.get('groupQualStatus', {}),
        'best8ThirdsPredicted': sim_result.get('best8ThirdsPredicted', []),
        'best8ThirdsRealTime': sim_result.get('best8ThirdsRealTime', [])
    }
    with open('predictions_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    print("Done")

if __name__ == '__main__':
    main()
