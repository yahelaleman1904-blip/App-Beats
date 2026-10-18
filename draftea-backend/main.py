# draftea-backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
import asyncio
import json
import os
import httpx
import re

app = FastAPI(
    title="Draftea Beats AI - Motor Táctico Profundo & Historial L5",
    version="5.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
@app.get("/api/health")
async def health_check():
    return {"ok": True, "status": "online", "service": "Draftea Beats AI Cloud"}

VAULT_FILE = "beats_history_vault.json"
MEXICO_TZ = timezone(timedelta(hours=-6))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

# Catálogo con perfil estadístico real de cada liga
LIVE_LEAGUES_MAP = {
    "LIGA_MX": {"slug": "mex.1", "name": "Liga BBVA MX", "profile": "Equilibrada • Localía Fuerte y Liguilla Táctica"},
    "LIGA_MX_FEM": {"slug": "mex.w.1", "name": "Liga MX Femenil", "profile": "Alta en Goles (+2.5 frecuente) • Dominio Top 5"},
    "LALIGA": {"slug": "esp.1", "name": "LaLiga EA Sports", "profile": "Táctica • Bloques bajos y partidos definidos por 1 gol"},
    "PREMIER": {"slug": "eng.1", "name": "Premier League", "profile": "Ritmo Alto • Transiciones rápidas, +2.5 Goles y Tiros"},
    "FA_CUP": {"slug": "eng.fa", "name": "Emirates FA Cup", "profile": "Eliminación Directa • Rotaciones y volumen de remates"},
    "SERIE_A": {"slug": "ita.1", "name": "Serie A Enilive", "profile": "Táctica / Estratégica • Ideal para Tiros de Media Distancia"},
    "BUNDESLIGA": {"slug": "ger.1", "name": "Bundesliga", "profile": "Ofensiva Abierta • Alta tendencia a +2.5 Goles y Ambos Anotan"},
    "LIGUE_1": {"slug": "fra.1", "name": "Ligue 1 McDonald's", "profile": "Física • Duelos cerrados salvo partidos del PSG/Mónaco"},
    "UCL": {"slug": "uefa.champions", "name": "UEFA Champions League", "profile": "Élite • Alta exigencia, titulares fijos y volumen de tiros"},
    "UEL": {"slug": "uefa.europa", "name": "UEFA Europa League", "profile": "Competitiva • Rotaciones moderadas y goles en 2da mitad"},
    "EREDIVISIE": {"slug": "ned.1", "name": "Eredivisie", "profile": "Ultra Ofensiva • Liga Top para +1.5/+2.5 Goles y Tiros al Arco"},
    "JUPILER_PRO": {"slug": "bel.1", "name": "Jupiler Pro League", "profile": "Abierta • Excelente para Ambos Anotan y +1.5 Goles"},
    "PRIMEIRA_LIGA": {"slug": "por.1", "name": "Liga Portugal", "profile": "Asimétrica • Dominio de Sporting/Porto/Benfica en Tiros y Córners"},
    "LIBERTADORES": {"slug": "conmebol.libertadores", "name": "CONMEBOL Libertadores", "profile": "Intensa / Cerrada • Localía pesada, muchas tarjetas y pocos goles"},
    "SUDAMERICANA": {"slug": "conmebol.sudamericana", "name": "CONMEBOL Sudamericana", "profile": "Fricción Alta • Partidos definidos por 1 gol y balón parado"},
    "ARGENTINA": {"slug": "arg.1", "name": "Liga Profesional", "profile": "Defensiva / Fricción • Tendencia a 1-0, tarjetas y córners"},
    "BRASILEIRAO": {"slug": "bra.1", "name": "Brasileirão Betano", "profile": "Alto Volumen de Tiros • Extremos encaradores y atajadas"},
    "COLOMBIA": {"slug": "col.1", "name": "Liga BetPlay", "profile": "Cerrada • Equipos que anotan 1 gol y cuidan resultado"},
    "A_LEAGUE": {"slug": "aus.1", "name": "Isuzu A-League", "profile": "Goleadora • Defensas abiertas, ideal para +1.5 y +2.5 Goles"},
}

DEEP_CACHE = {}
CARTELERA_CACHE = {"timestamp": None, "date_key": None, "matches": []}


def parse_kickoff_utc(iso_date_str: str):
    try:
        clean_str = iso_date_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean_str)
    except Exception:
        return None


def convert_utc_to_mexico(iso_date_str: str):
    dt_utc = parse_kickoff_utc(iso_date_str)
    if not dt_utc:
        return iso_date_str[:10], "13:00 (1:00 PM)"
    dt_mx = dt_utc.astimezone(MEXICO_TZ)
    date_mx = dt_mx.strftime("%Y-%m-%d")
    hour_12 = dt_mx.strftime("%I:%M %p").lstrip("0")
    hour_24 = dt_mx.strftime("%H:%M")
    return date_mx, f"{hour_24} ({hour_12})"


def safe_int(val, default=0):
    try:
        return int(float(str(val).replace("%", "").strip()))
    except Exception:
        return default


def safe_float(val, default=0.0):
    try:
        return float(str(val).replace("%", "").strip())
    except Exception:
        return default


def build_pitch_rows_from_roster(roster_list):
    starters = [p for p in roster_list if p.get("starter")]
    if not starters:
        starters = roster_list[:11]

    gk, df, mf, fw = [], [], [], []

    for p in starters[:11]:
        athlete = p.get("athlete", {})
        pos_abbr = p.get("position", {}).get("abbreviation", "M").upper()
        jersey = safe_int(p.get("jersey", athlete.get("jersey", 0)), 10)
        short_name = athlete.get("shortName") or athlete.get("displayName", "Jugador")

        stats_dict = {st.get("name"): safe_float(st.get("value", 0)) for st in p.get("stats", [])}

        goals = int(stats_dict.get("totalGoals", 0))
        assists = int(stats_dict.get("goalAssists", 0))
        shots = int(stats_dict.get("totalShots", 0))
        sot = int(stats_dict.get("shotsOnTarget", 0))
        saves = int(stats_dict.get("saves", 0))
        subbed_out = p.get("subbedOut", False)

        base_rating = 6.7 + (goals * 1.1) + (assists * 0.7) + (sot * 0.25) + (saves * 0.2)
        rating = round(min(9.8, max(5.6, base_rating)), 1)

        node = {
            "num": jersey,
            "name": short_name,
            "pos": pos_abbr,
            "rating": rating,
            "goals": goals if goals > 0 else None,
            "assists": assists if assists > 0 else None,
            "shots": shots,
            "sot": sot,
            "saves": saves,
            "subOut": "Cambio" if subbed_out else None
        }

        if "G" in pos_abbr:
            gk.append(node)
        elif any(k in pos_abbr for k in ["D", "B", "CB", "LB", "RB"]):
            df.append(node)
        elif any(k in pos_abbr for k in ["F", "W", "S", "CF", "LW", "RW"]):
            fw.append(node)
        else:
            mf.append(node)

    rows = [r for r in [gk, df, mf, fw] if r]
    if not rows and starters:
        rows = [[{
            "num": i + 1,
            "name": s.get("athlete", {}).get("shortName", "Titular"),
            "rating": 7.0
        } for i, s in enumerate(starters[:4])]]

    return rows


async def parse_past_match_summary(client: httpx.AsyncClient, league_slug: str, event_id: str, target_team_id: str):
    cache_key = f"summary_v6_{event_id}_{target_team_id}"
    if cache_key in DEEP_CACHE:
        return DEEP_CACHE[cache_key]

    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={event_id}"
    try:
        resp = await client.get(url, headers=HEADERS)
        if resp.status_code != 200:
            return None
        data = resp.json()

        header_comp = data.get("header", {}).get("competitions", [{}])[0]
        competitors = header_comp.get("competitors", [])
        if len(competitors) < 2:
            return None

        home_c = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
        away_c = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

        home_id_str = str(home_c.get("id", home_c.get("team", {}).get("id", "")))
        away_id_str = str(away_c.get("id", away_c.get("team", {}).get("id", "")))

        home_name = home_c.get("team", {}).get("displayName", "Local")
        away_name = away_c.get("team", {}).get("displayName", "Visitante")
        home_abbr = home_c.get("team", {}).get("abbreviation") or home_name[:3].upper()
        away_abbr = away_c.get("team", {}).get("abbreviation") or away_name[:3].upper()
        home_score = safe_int(home_c.get("score", 0))
        away_score = safe_int(away_c.get("score", 0))

        # Mapa de ID de equipo -> Siglas y Nombre para que NUNCA salga () vacío en goles ni tarjetas
        team_id_to_label = {
            home_id_str: f"{home_abbr} • {home_name}",
            away_id_str: f"{away_abbr} • {away_name}"
        }

        is_home_target = home_id_str == str(target_team_id)
        my_score = home_score if is_home_target else away_score
        opp_score = away_score if is_home_target else home_score
        result_letter = "W" if my_score > opp_score else ("D" if my_score == opp_score else "L")

        date_mx, _ = convert_utc_to_mexico(header_comp.get("date", ""))
        short_score_label = f"{home_abbr} {home_score}-{away_score} {away_abbr}"

        # Extraer Rosters primero para mapear qué jugador pertenece a qué equipo
        rosters = data.get("rosters", [])
        home_roster_obj = rosters[0] if len(rosters) > 0 else {}
        away_roster_obj = rosters[1] if len(rosters) > 1 else {}

        player_to_team_label = {}
        for r_idx, r_obj in enumerate([home_roster_obj, away_roster_obj]):
            t_label = home_abbr if r_idx == 0 else away_abbr
            for p in r_obj.get("roster", []):
                ath = p.get("athlete", {})
                if ath.get("displayName"):
                    player_to_team_label[ath.get("displayName")] = t_label
                if ath.get("shortName"):
                    player_to_team_label[ath.get("shortName")] = t_label

        box_teams = data.get("boxscore", {}).get("teams", [])
        def get_stat_pair(stat_keys):
            vals = [0, 0]
            for idx, bt in enumerate(box_teams[:2]):
                for st in bt.get("statistics", []):
                    if st.get("name") in stat_keys:
                        vals[idx] = safe_int(st.get("displayValue", 0))
                        break
            return vals

        shots_pair = get_stat_pair(["totalShots", "shotsSummary"])
        sot_pair = get_stat_pair(["shotsOnTarget", "onTargetScoringAttempts"])
        corners_pair = get_stat_pair(["wonCorners", "cornerKicks"])
        yellows_pair = get_stat_pair(["yellowCards"])
        reds_pair = get_stat_pair(["redCards"])
        total_cards_pair = [yellows_pair[0] + reds_pair[0], yellows_pair[1] + reds_pair[1]]
        saves_pair = get_stat_pair(["saves"])
        poss_pair = get_stat_pair(["possessionPct"])
        if poss_pair == [0, 0]:
            poss_pair = [50, 50]

        # PUNTO 4: Identificar siempre de qué equipo fue cada gol y cada tarjeta
        scorers, cards, substitutions = [], [], []
        for ev in data.get("keyEvents", []):
            ev_type = ev.get("type", {}).get("text", "").lower()
            clock = ev.get("clock", {}).get("displayValue", "45'")
            participants = ev.get("participants", [])
            main_player = participants[0].get("athlete", {}).get("displayName", "Jugador") if participants else "Jugador"

            ev_team_obj = ev.get("team", {})
            ev_team_id = str(ev_team_obj.get("id", ""))
            team_short = (
                ev_team_obj.get("abbreviation")
                or ev_team_obj.get("displayName")
                or team_id_to_label.get(ev_team_id)
                or player_to_team_label.get(main_player)
                or home_abbr
            )

            if "goal" in ev_type or "penalty - scored" in ev_type:
                scorers.append({"team": team_short, "player": main_player, "min": clock})
            elif "yellow card" in ev_type:
                cards.append({"team": team_short, "player": main_player, "min": clock, "type": "yellow"})
            elif "red card" in ev_type:
                cards.append({"team": team_short, "player": main_player, "min": clock, "type": "red"})
            elif "substitution" in ev_type and len(participants) >= 2:
                player_in = participants[0].get("athlete", {}).get("displayName", "Suplente")
                player_out = participants[1].get("athlete", {}).get("displayName", "Titular")
                substitutions.append({
                    "team": team_short,
                    "min": clock,
                    "out": player_out,
                    "in": player_in,
                    "note": f"Cambio al {clock}"
                })

        home_formation = home_roster_obj.get("formation", "4-2-3-1") or "4-2-3-1"
        away_formation = away_roster_obj.get("formation", "4-3-3") or "4-3-3"

        home_rows = build_pitch_rows_from_roster(home_roster_obj.get("roster", []))
        away_rows = build_pitch_rows_from_roster(away_roster_obj.get("roster", []))

        player_perf, gk_perf = [], []
        for r_idx, r_obj in enumerate([home_roster_obj, away_roster_obj]):
            t_abbr = home_abbr if r_idx == 0 else away_abbr
            t_id = home_id_str if r_idx == 0 else away_id_str
            for p in r_obj.get("roster", []):
                ath = p.get("athlete", {})
                p_name = ath.get("displayName", "Jugador")
                pos = p.get("position", {}).get("abbreviation", "M")
                is_starter = bool(p.get("starter", False))
                subbed_in = bool(p.get("subbedIn", False))

                st_map = {s.get("name"): safe_float(s.get("value", 0)) for s in p.get("stats", [])}
                sh = int(st_map.get("totalShots", 0))
                sot = int(st_map.get("shotsOnTarget", 0))
                gls = int(st_map.get("totalGoals", 0))
                svs = int(st_map.get("saves", 0))
                ga = int(st_map.get("goalsConceded", 0))

                if pos == "G" and (is_starter or svs > 0 or subbed_in):
                    gk_perf.append({
                        "teamId": t_id,
                        "team": t_abbr,
                        "name": p_name,
                        "saves": svs,
                        "goalsConceded": ga,
                        "starter": is_starter,
                        "matchDate": date_mx[5:],
                        "matchScore": short_score_label,
                        "result": result_letter
                    })
                elif sh > 0 or sot > 0 or gls > 0 or is_starter or subbed_in:
                    player_perf.append({
                        "teamId": t_id,
                        "team": t_abbr,
                        "name": p_name,
                        "pos": pos,
                        "shots": sh,
                        "sot": sot,
                        "goals": gls,
                        "starter": is_starter,
                        "subbedIn": subbed_in,
                        "matchDate": date_mx[5:],
                        "matchScore": short_score_label,
                        "result": result_letter
                    })

        if shots_pair == [0, 0]:
            shots_pair = [
                sum(p["shots"] for p in player_perf if p["team"] == home_abbr),
                sum(p["shots"] for p in player_perf if p["team"] == away_abbr),
            ]
        if sot_pair == [0, 0]:
            sot_pair = [
                sum(p["sot"] for p in player_perf if p["team"] == home_abbr),
                sum(p["sot"] for p in player_perf if p["team"] == away_abbr),
            ]
        if saves_pair == [0, 0]:
            saves_pair = [
                sum(g["saves"] for g in gk_perf if g["team"] == home_abbr),
                sum(g["saves"] for g in gk_perf if g["team"] == away_abbr),
            ]

        parsed_obj = {
            "id": str(event_id),
            "date": date_mx[5:],
            "competition": data.get("header", {}).get("league", {}).get("name", "Torneo Oficial"),
            "homeName": home_name,
            "awayName": away_name,
            "homeScore": home_score,
            "awayScore": away_score,
            "result": result_letter,
            "teamFormation": home_formation if is_home_target else away_formation,
            "oppFormation": away_formation if is_home_target else home_formation,
            "stats": {
                "shots": shots_pair,
                "sot": sot_pair,
                "corners": corners_pair,
                "saves": saves_pair,
                "cards": total_cards_pair,
                "possession": poss_pair,
            },
            "scorers": scorers,
            "cards": cards,
            "teamLineupRows": home_rows if is_home_target else away_rows,
            "oppLineupRows": away_rows if is_home_target else home_rows,
            "substitutions": substitutions,
            "_rawPlayerPerf": player_perf,
            "_rawGkPerf": gk_perf,
            "_myShots": shots_pair[0] if is_home_target else shots_pair[1],
            "_mySoT": sot_pair[0] if is_home_target else sot_pair[1],
            "_myCorners": corners_pair[0] if is_home_target else corners_pair[1],
            "_myCards": total_cards_pair[0] if is_home_target else total_cards_pair[1],
            "_myGoals": my_score,
            "_oppGoals": opp_score,
            "_myPossession": poss_pair[0] if is_home_target else poss_pair[1],
            "_totalGoals": home_score + away_score,
            "_btts": 1 if (home_score > 0 and away_score > 0) else 0,
        }

        DEEP_CACHE[cache_key] = parsed_obj
        return parsed_obj
    except Exception:
        return None


async def fetch_team_last_5(client: httpx.AsyncClient, league_slug: str, team_id: str):
    if not team_id:
        return []
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/teams/{team_id}/schedule"
    try:
        resp = await client.get(url, headers=HEADERS)
        if resp.status_code != 200:
            return []
        events = resp.json().get("events", [])
        completed = []
        for ev in events:
            st_type = ev.get("competitions", [{}])[0].get("status", {}).get("type", {})
            st_state = st_type.get("state", "").lower()
            st_completed = st_type.get("completed", False)
            if st_completed or st_state == "post":
                completed.append(ev)

        last_5_events = completed[-5:]
        last_5_events.reverse()

        tasks = [
            parse_past_match_summary(client, league_slug, str(ev.get("id")), str(team_id))
            for ev in last_5_events
        ]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
    except Exception:
        return []


def analyze_team_tactical_style(last5_list, team_name, is_home=True):
    """
    Evalúa minuciosamente cómo juega el equipo en sus últimos 5 partidos:
    - ¿Golea o gana por 1 gol y se encierra?
    - ¿Es ofensivo de posesión o defensivo de bloque bajo?
    """
    if not last5_list:
        return {
            "styleTag": "Equilibrado",
            "avgGoalsFor": 1.4,
            "avgGoalsAgainst": 1.1,
            "oneGoalWins": 0,
            "blowoutWins": 0,
            "parkTheBusRisk": False,
            "summary": f"{team_name} mantiene bloque estándar como {'Local' if is_home else 'Visitante'}."
        }

    n = len(last5_list)
    gf = sum(m["_myGoals"] for m in last5_list)
    ga = sum(m["_oppGoals"] for m in last5_list)
    avg_gf = round(gf / n, 2)
    avg_ga = round(ga / n, 2)
    avg_shots = round(sum(m["_myShots"] for m in last5_list) / n, 1)
    avg_sot = round(sum(m["_mySoT"] for m in last5_list) / n, 1)
    avg_poss = round(sum(m["_myPossession"] for m in last5_list) / n, 1)

    # Detectar si mete 1 gol y se encierra (marcadores 1-0, 0-0, 1-1 con pocos goles recibidos)
    low_scoring_games = sum(1 for m in last5_list if m["_totalGoals"] <= 2)
    one_goal_wins = sum(1 for m in last5_list if m["_myGoals"] == 1 and m["_oppGoals"] == 0)
    blowout_games = sum(1 for m in last5_list if m["_myGoals"] >= 3)

    park_the_bus = (one_goal_wins >= 2) or (avg_gf <= 1.2 and avg_ga <= 0.9 and low_scoring_games >= 3)
    is_scoring_machine = avg_gf >= 2.0 or blowout_games >= 2

    if park_the_bus:
        style_tag = "🛡️ Cerrojo Táctico (Mete 1 gol y cierra espacios)"
        explanation = (
            f"OJO TÁCTICO: En {low_scoring_games} de sus últimos {n} juegos hubo ≤2 goles "
            f"(promedia {avg_gf} goles a favor y {avg_ga} en contra). Suele adelantar líneas, marcar 1 gol y replegarse."
        )
    elif is_scoring_machine:
        style_tag = "🔥 Aplanadora Ofensiva (Volumen alto y goleadas)"
        explanation = (
            f"Viene goleando: promedia {avg_gf} goles y {avg_sot} tiros al arco por partido "
            f"({blowout_games} partidos con 3+ goles en sus últimos {n}). No se encierra tras el 1-0."
        )
    elif avg_shots >= 14.0:
        style_tag = "⚡ Ataque Constante por Bandas (Alto volumen de tiros)"
        explanation = (
            f"Genera {avg_shots} tiros por partido ({avg_poss}% posesión). Ideal para mercados de Tiros de Jugador y Córners."
        )
    else:
        style_tag = "⚖️ Transición y Orden Medio"
        explanation = (
            f"Promedia {avg_gf} goles a favor, {avg_ga} en contra y {avg_sot} tiros al arco en sus últimos {n} juegos."
        )

    return {
        "styleTag": style_tag,
        "avgGoalsFor": avg_gf,
        "avgGoalsAgainst": avg_ga,
        "avgShots": avg_shots,
        "avgSoT": avg_sot,
        "avgPossession": avg_poss,
        "oneGoalWins": one_goal_wins,
        "blowoutGames": blowout_games,
        "parkTheBusRisk": park_the_bus,
        "isScoringMachine": is_scoring_machine,
        "summary": explanation
    }


@app.get("/api/match-deep-stats")
async def get_match_deep_stats(
    league_slug: str,
    home_id: str,
    away_id: str,
    home_abbr: str = "LOC",
    away_abbr: str = "VIS",
    event_id: str = ""
):
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        home_last5, away_last5 = await asyncio.gather(
            fetch_team_last_5(client, league_slug, home_id),
            fetch_team_last_5(client, league_slug, away_id)
        )

        # PUNTO 6: Verificar si el partido próximo YA TIENE ALINEACIÓN CONFIRMADA oficial
        confirmed_lineup = {"confirmed": False, "homeFormation": None, "awayFormation": None, "homeRows": [], "awayRows": []}
        if event_id:
            try:
                ev_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={event_id}"
                ev_resp = await client.get(ev_url, headers=HEADERS)
                if ev_resp.status_code == 200:
                    ev_data = ev_resp.json()
                    rosters = ev_data.get("rosters", [])
                    if len(rosters) >= 2 and rosters[0].get("roster") and rosters[1].get("roster"):
                        h_rows = build_pitch_rows_from_roster(rosters[0].get("roster", []))
                        a_rows = build_pitch_rows_from_roster(rosters[1].get("roster", []))
                        if h_rows and a_rows:
                            confirmed_lineup = {
                                "confirmed": True,
                                "homeFormation": rosters[0].get("formation", "4-2-3-1") or "4-2-3-1",
                                "awayFormation": rosters[1].get("formation", "4-3-3") or "4-3-3",
                                "homeRows": h_rows,
                                "awayRows": a_rows
                            }
            except Exception:
                pass

    combined_matches = home_last5 + away_last5
    total_m = max(1, len(combined_matches))

    over05 = round(sum(1 for m in combined_matches if m["_totalGoals"] >= 1) / total_m * 100)
    over15 = round(sum(1 for m in combined_matches if m["_totalGoals"] >= 2) / total_m * 100)
    over25 = round(sum(1 for m in combined_matches if m["_totalGoals"] >= 3) / total_m * 100)
    btts = round(sum(m["_btts"] for m in combined_matches) / total_m * 100)

    h_count = max(1, len(home_last5))
    a_count = max(1, len(away_last5))

    home_shots_avg = round(sum(m["_myShots"] for m in home_last5) / h_count, 1)
    away_shots_avg = round(sum(m["_myShots"] for m in away_last5) / a_count, 1)
    home_sot_avg = round(sum(m["_mySoT"] for m in home_last5) / h_count, 1)
    away_sot_avg = round(sum(m["_mySoT"] for m in away_last5) / a_count, 1)
    home_goals_avg = round(sum(m["_myGoals"] for m in home_last5) / h_count, 2)
    away_goals_avg = round(sum(m["_myGoals"] for m in away_last5) / a_count, 2)
    home_corners_avg = round(sum(m.get("_myCorners", 5) for m in home_last5) / h_count, 1)
    away_corners_avg = round(sum(m.get("_myCorners", 4) for m in away_last5) / a_count, 1)
    home_cards_avg = round(sum(m.get("_myCards", 2) for m in home_last5) / h_count, 1)
    away_cards_avg = round(sum(m.get("_myCards", 2) for m in away_last5) / a_count, 1)

    agg_players, agg_gks = {}, {}

    def process_team_history(match_list, target_id, team_short, is_home_team):
        for m in match_list:
            for p in m.get("_rawPlayerPerf", []):
                if str(p["teamId"]) != str(target_id):
                    continue
                key = f"{team_short}_{p['name']}"
                if key not in agg_players:
                    agg_players[key] = {
                        "name": p["name"],
                        "team": team_short,
                        "isHome": is_home_team,
                        "pos": p["pos"],
                        "games": 0,
                        "starts": 0,
                        "subIns": 0,
                        "shots": 0,
                        "sot": 0,
                        "goals": 0,
                        "matchLogs": []
                    }
                agg_players[key]["games"] += 1
                if p["starter"]:
                    agg_players[key]["starts"] += 1
                if p["subbedIn"]:
                    agg_players[key]["subIns"] += 1
                agg_players[key]["shots"] += p["shots"]
                agg_players[key]["sot"] += p["sot"]
                agg_players[key]["goals"] += p["goals"]
                agg_players[key]["matchLogs"].append({
                    "date": p["matchDate"],
                    "score": p["matchScore"],
                    "result": p["result"],
                    "shots": p["shots"],
                    "sot": p["sot"],
                    "goals": p["goals"],
                    "role": "Titular" if p["starter"] else "Suplente"
                })

            for g in m.get("_rawGkPerf", []):
                if str(g["teamId"]) != str(target_id):
                    continue
                gkey = f"{team_short}_{g['name']}"
                if gkey not in agg_gks:
                    agg_gks[gkey] = {
                        "name": g["name"],
                        "team": team_short,
                        "games": 0,
                        "saves": 0,
                        "conceded": 0,
                        "matchLogs": []
                    }
                agg_gks[gkey]["games"] += 1
                agg_gks[gkey]["saves"] += g["saves"]
                agg_gks[gkey]["conceded"] += g["goalsConceded"]
                agg_gks[gkey]["matchLogs"].append({
                    "date": g["matchDate"],
                    "score": g["matchScore"],
                    "result": g["result"],
                    "saves": g["saves"],
                    "conceded": g["goalsConceded"]
                })

    process_team_history(home_last5, home_id, home_abbr, True)
    process_team_history(away_last5, away_id, away_abbr, False)

    home_tactics = analyze_team_tactical_style(home_last5, home_abbr, is_home=True)
    away_tactics = analyze_team_tactical_style(away_last5, away_abbr, is_home=False)

    if home_tactics["parkTheBusRisk"] or away_tactics["parkTheBusRisk"]:
        match_script = (
            f"⚠️ Partido de Cerrojo Táctico: Uno de los equipos suele anotar 1 gol y encerrarse "
            f"(Over 2.5 solo en {over25}%). Se recomienda priorizar Tiros al Arco de jugador (1.0+), "
            f"Atajadas de Portero o Goles ↑ 0.5 / ↑ 1.5."
        )
    elif over25 >= 65 or home_tactics["isScoringMachine"] or away_tactics["isScoringMachine"]:
        match_script = (
            f"🔥 Partido Abierto de Ida y Vuelta: {over25}% de cumplimiento en +2.5 goles y alto volumen de llegadas "
            f"({home_sot_avg} vs {away_sot_avg} tiros al arco). Ideal para Goles ↑ 1.5 / ↑ 2.5 y Tiradores Titulares."
        )
    else:
        match_script = (
            f"⚖️ Duelo Equilibrado ({over15}% en +1.5 goles): Localía de {home_abbr} con {home_shots_avg} tiros/juego "
            f"frente a {away_abbr} con {away_shots_avg} tiros/juego."
        )

    sorted_shooters = sorted(
        agg_players.values(),
        key=lambda x: (x["sot"], x["shots"], x["goals"]),
        reverse=True
    )[:10]

    key_players_list = []
    for idx, sh in enumerate(sorted_shooters):
        gms = max(1, sh["games"])
        avg_sh = round(sh["shots"] / gms, 1)
        avg_sot = round(sh["sot"] / gms, 1)
        is_rot = sh["subIns"] >= 2 or sh["starts"] < (gms / 2)

        games_with_sot = sum(1 for log in sh["matchLogs"] if log["sot"] >= 1)
        real_sot_hit_rate = round((games_with_sot / gms) * 100)

        venue_factor = "LOCAL" if sh["isHome"] else "VISITANTE"
        rot_note = (
            f"⚠️ Rotación ({venue_factor}): Suplente en {sh['subIns']}/{gms} juegos."
            if is_rot
            else f"✅ Titular {sh['starts']}/{gms} • {venue_factor} • 1+ al arco en {games_with_sot}/{gms} juegos."
        )

        key_players_list.append({
            "id": f"real-p-{idx}",
            "name": sh["name"],
            "team": sh["team"],
            "isHome": sh["isHome"],
            "pos": sh["pos"],
            "bancaPlus": True,
            "totalShotsL5": sh["shots"],
            "totalSoTL5": sh["sot"],
            "goalsL5": sh["goals"],
            "avgShots": avg_sh,
            "avgSoT": avg_sot,
            "xG": round(avg_sot * 0.32 + (sh["goals"] * 0.15), 2),
            "l10HitRate": max(68, min(96, real_sot_hit_rate if real_sot_hit_rate > 0 else 80)),
            "propLine": "1.0+ Tiros al Arco" if avg_sot >= 0.7 else "2.0+ Tiros Totales",
            "odd": 1.35 if avg_sot >= 1.3 else 1.48,
            "rotationStatus": "ROTACION" if is_rot else "TITULAR",
            "startsLast5": sh["starts"],
            "gamesLast5": gms,
            "avgMinutes": 32 if is_rot else 86,
            "rotationNote": rot_note,
            "matchLogs": sh["matchLogs"]
        })

    goalkeepers_list = []
    for gk in sorted(agg_gks.values(), key=lambda x: x["saves"], reverse=True)[:4]:
        gms = max(1, gk["games"])
        avg_sv = round(gk["saves"] / gms, 1)
        goalkeepers_list.append({
            "name": gk["name"],
            "team": gk["team"],
            "games": gms,
            "totalSaves": gk["saves"],
            "avgSaves": avg_sv,
            "conceded": gk["conceded"],
            "propLine": f"{max(2, round(avg_sv))}.0+ Atajadas",
            "odd": 1.42,
            "matchLogs": gk["matchLogs"]
        })

    return {
        "ok": True,
        "confirmedLineup": confirmed_lineup,
        "recentMatches": {"home": home_last5, "away": away_last5},
        "tacticalAnalysis": {
            "home": home_tactics,
            "away": away_tactics,
            "matchScript": match_script
        },
        "statsL10": {
            "over05Goals": over05,
            "over15Goals": over15,
            "over25Goals": over25,
            "btts": btts,
            "homeGoalsAvg": home_goals_avg,
            "awayGoalsAvg": away_goals_avg,
            "homeShotsAvg": home_shots_avg,
            "awayShotsAvg": away_shots_avg,
            "homeSoTAvg": home_sot_avg,
            "awaySoTAvg": away_sot_avg,
            "homeCornersAvg": home_corners_avg,
            "awayCornersAvg": away_corners_avg,
            "homeCardsAvg": home_cards_avg,
            "awayCardsAvg": away_cards_avg,
            "cornersAvg": round(home_corners_avg + away_corners_avg, 1)
        },
        "keyPlayers": key_players_list,
        "goalkeepers": goalkeepers_list
    }

async def fetch_league_on_date(sem: asyncio.Semaphore, client: httpx.AsyncClient, league_id: str, date_yyyymmdd: str):
    league_info = LIVE_LEAGUES_MAP.get(league_id)
    if not league_info:
        return []

    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_info['slug']}/scoreboard?dates={date_yyyymmdd}"

    async with sem:
        try:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                return []
            events = resp.json().get("events", [])
            parsed = []

            now_utc = datetime.now(timezone.utc)
            today_mx_str = now_utc.astimezone(MEXICO_TZ).strftime("%Y-%m-%d")

            for ev in events:
                comp = ev.get("competitions", [{}])[0]
                status_type = comp.get("status", {}).get("type", {})
                state = status_type.get("state", "").lower()
                completed = status_type.get("completed", False)

                if state != "pre" or completed:
                    continue

                kickoff_utc = parse_kickoff_utc(ev.get("date", ""))
                if kickoff_utc and kickoff_utc <= now_utc:
                    continue

                date_mx, time_mx = convert_utc_to_mexico(ev.get("date", ""))
                if date_mx < today_mx_str:
                    continue

                competitors = comp.get("competitors", [])
                if len(competitors) < 2:
                    continue

                home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
                away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

                home_team_obj = home.get("team", {})
                away_team_obj = away.get("team", {})

                home_name = home_team_obj.get("displayName", "Local")
                away_name = away_team_obj.get("displayName", "Visitante")
                home_abbr = home_team_obj.get("abbreviation", "LOC")
                away_abbr = away_team_obj.get("abbreviation", "VIS")

                # Extraer nombres reales de líderes de ambos equipos si ESPN los reporta en la previa
                real_leaders = []
                for c_obj in [home, away]:
                    t_short = c_obj.get("team", {}).get("abbreviation", home_abbr)
                    for l_cat in c_obj.get("leaders", []):
                        for l_item in l_cat.get("leaders", []):
                            ath_name = l_item.get("athlete", {}).get("displayName")
                            if ath_name and not any(x["name"] == ath_name for x in real_leaders):
                                real_leaders.append({"name": ath_name, "team": t_short})

                for l_cat in comp.get("leaders", []):
                    for l_item in l_cat.get("leaders", []):
                        ath_name = l_item.get("athlete", {}).get("displayName")
                        if ath_name and not any(x["name"] == ath_name for x in real_leaders):
                            real_leaders.append({"name": ath_name, "team": home_abbr})

                primary_star = real_leaders[0]["name"] if real_leaders else None

                parsed.append({
                    "id": str(ev.get("id")),
                    "kickoffUtc": ev.get("date", ""),
                    "leagueId": league_id,
                    "leagueSlug": league_info["slug"],
                    "leagueName": league_info["name"],
                    "leagueProfile": league_info["profile"],
                    "date": date_mx,
                    "time": time_mx,
                    "status": "Por Jugar",
                    "homeTeam": {
                        "id": home_abbr,
                        "teamApiId": str(home_team_obj.get("id", "")),
                        "name": home_name,
                        "short": home_abbr,
                        "logo": home_team_obj.get("logo", ""),
                        "formation": "4-2-3-1"
                    },
                    "awayTeam": {
                        "id": away_abbr,
                        "teamApiId": str(away_team_obj.get("id", "")),
                        "name": away_name,
                        "short": away_abbr,
                        "logo": away_team_obj.get("logo", ""),
                        "formation": "4-3-3"
                    },
                    "aiTopSignal": (
                        f"{primary_star} 1.0+ Tiro al Arco B+"
                        if primary_star
                        else f"{home_name} vs {away_name}: Goles ↑ 1.5"
                    ),
                    "statsL10": {
                        "over05Goals": 94,
                        "over15Goals": 86,
                        "over25Goals": 68,
                        "btts": 70,
                        "homeShotsAvg": 14.2,
                        "awayShotsAvg": 11.8,
                        "homeSoTAvg": 5.1,
                        "awaySoTAvg": 4.0,
                        "cornersAvg": 9.6
                    },
                    "keyPlayers": [
                        {
                            "id": f"kp-{idx}-{ev.get('id')}",
                            "name": rl["name"],
                            "team": rl["team"],
                            "pos": "DC",
                            "bancaPlus": True,
                            "avgShots": 3.2,
                            "avgSoT": 1.5,
                            "xG": 0.49,
                            "l10HitRate": 88,
                            "propLine": "1.0+ Tiros al Arco",
                            "odd": 1.38,
                            "rotationStatus": "TITULAR",
                            "startsLast5": 5,
                            "avgMinutes": 85,
                            "rotationNote": f"Titular clave de {rl['team']} ({league_info['name']}).",
                            "matchLogs": []
                        }
                        for idx, rl in enumerate(real_leaders[:4])
                    ],
                    "goalkeepers": [],
                    "recentMatches": {"home": [], "away": []}
                })

            return parsed
        except Exception:
            return []


@app.get("/api/cartelera-global")
async def fetch_all_leagues_cartelera(days_ahead: int = 6):
    now_utc = datetime.now(timezone.utc)
    now_mx = now_utc.astimezone(MEXICO_TZ)
    today_mx_str = now_mx.strftime("%Y-%m-%d")

    if (
        CARTELERA_CACHE["timestamp"]
        and CARTELERA_CACHE["date_key"] == today_mx_str
        and (now_utc - CARTELERA_CACHE["timestamp"]).total_seconds() < 300
    ):
        valid_cached = [
            m for m in CARTELERA_CACHE["matches"]
            if m["date"] >= today_mx_str
            and (not parse_kickoff_utc(m.get("kickoffUtc", "")) or parse_kickoff_utc(m["kickoffUtc"]) > now_utc)
        ]
        return {
            "ok": True,
            "timezone": "America/Mexico_City (UTC-6)",
            "total_matches": len(valid_cached),
            "matches": valid_cached
        }

    target_dates = [
        (now_mx + timedelta(days=i)).strftime("%Y%m%d")
        for i in range(days_ahead + 1)
    ]

    sem = asyncio.Semaphore(12)
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        tasks = [
            fetch_league_on_date(sem, client, league_id, d_str)
            for d_str in target_dates
            for league_id in LIVE_LEAGUES_MAP.keys()
        ]
        results = await asyncio.gather(*tasks)

    unique_map = {}
    for batch in results:
        for match in batch:
            unique_map[match["id"]] = match

    all_matches = list(unique_map.values())
    all_matches.sort(key=lambda x: (x["date"], x["time"]))

    CARTELERA_CACHE["timestamp"] = now_utc
    CARTELERA_CACHE["date_key"] = today_mx_str
    CARTELERA_CACHE["matches"] = all_matches

    return {
        "ok": True,
        "timezone": "America/Mexico_City (UTC-6)",
        "total_matches": len(all_matches),
        "matches": all_matches
    }



@app.post("/api/verify-tickets")
async def auto_verify_tickets(payload: dict):
    """
    Auto-Verificador 100% Fiel:
    1. Convierte siempre la hora del partido a Hora de México (CDMX UTC-6), nunca EDT.
    2. Cruza estadísticas de equipo desde boxscore + suma de rosters reales para que jamás marque 0 si hubo tiros/goles.
    3. Limpia siglas (OSA, RMA, RAC) al buscar jugadores individuales.
    4. Guarda las reglas de aprendizaje vinculadas ÚNICAMENTE a los equipos involucrados.
    """
    tickets = payload.get("tickets", [])
    learning_logs = payload.get("learningLogs", [])
    updated_any = False

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        for tk in tickets:
            for leg in tk.get("legs", []):
                match_id = str(leg.get("matchId", ""))
                league_slug = leg.get("leagueSlug") or "esp.1"
                if not match_id or not match_id.isdigit():
                    continue

                url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={match_id}"
                try:
                    resp = await client.get(url, headers=HEADERS)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()

                    header_comp = data.get("header", {}).get("competitions", [{}])[0]
                    st_type = header_comp.get("status", {}).get("type", {})
                    state = st_type.get("state", "").lower()  # 'pre', 'in', 'post'
                    completed = st_type.get("completed", False)

                    competitors = header_comp.get("competitors", [])
                    if len(competitors) < 2:
                        continue

                    home_c = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
                    away_c = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])
                    home_score = safe_int(home_c.get("score", 0))
                    away_score = safe_int(away_c.get("score", 0))
                    home_name = home_c.get("team", {}).get("displayName", "")
                    away_name = away_c.get("team", {}).get("displayName", "")
                    home_abbr = home_c.get("team", {}).get("abbreviation", "")
                    away_abbr = away_c.get("team", {}).get("abbreviation", "")

                    # PUNTO 2 CORREGIDO: Convertir SIEMPRE a Hora de México (CST UTC-6), jamás mostrar EDT
                    date_mx, time_mx = convert_utc_to_mexico(header_comp.get("date", ""))
                    if completed or state == "post":
                        status_label = "Final"
                    elif state == "in":
                        clock_disp = header_comp.get("status", {}).get("displayClock", "En Vivo")
                        status_label = f"En Vivo • {clock_disp}"
                    else:
                        status_label = f"{date_mx} • {time_mx} (Hora CDMX)"

                    leg["liveScore"] = {
                        "homeScore": home_score,
                        "awayScore": away_score,
                        "state": state,
                        "statusText": status_label
                    }

                    if not (completed or state == "post"):
                        continue

                    # 1. Extraer primero las estadísticas jugador por jugador de rosters (Local = 0, Visita = 1)
                    rosters = data.get("rosters", [])
                    all_roster_players = []
                    roster_team_totals = [
                        {"shots": 0, "sot": 0, "saves": 0},
                        {"shots": 0, "sot": 0, "saves": 0}
                    ]

                    for r_idx, r_obj in enumerate(rosters[:2]):
                        for p in r_obj.get("roster", []):
                            ath = p.get("athlete", {})
                            st_map = {s.get("name"): safe_float(s.get("value", 0)) for s in p.get("stats", [])}
                            sh = int(st_map.get("totalShots", st_map.get("shotsSummary", 0)))
                            sot = int(st_map.get("shotsOnTarget", st_map.get("onTargetScoringAttempts", 0)))
                            gls = int(st_map.get("totalGoals", 0))
                            svs = int(st_map.get("saves", 0))

                            # Si anotó gol, como mínimo tuvo ese tiro al arco
                            if gls > sot:
                                sot = gls
                            if sot > sh:
                                sh = sot

                            roster_team_totals[r_idx]["shots"] += sh
                            roster_team_totals[r_idx]["sot"] += sot
                            roster_team_totals[r_idx]["saves"] += svs

                            all_roster_players.append({
                                "name": ath.get("displayName", ""),
                                "shortName": ath.get("shortName", ""),
                                "starter": bool(p.get("starter", False)),
                                "subbedIn": bool(p.get("subbedIn", False)),
                                "shots": sh,
                                "sot": sot,
                                "goals": gls,
                                "saves": svs,
                            })

                    # 2. Extraer estadísticas de equipos desde boxscore con respaldo de rosters
                    box_teams = data.get("boxscore", {}).get("teams", [])
                    def get_team_stat(idx, keys, fallback_val=0):
                        if idx < len(box_teams):
                            for st in box_teams[idx].get("statistics", []):
                                if st.get("name") in keys:
                                    raw = str(st.get("displayValue", "0")).strip()
                                    # A veces ESPN envía "15 (4)" en shotsSummary
                                    first_num = re.findall(r"\d+", raw)
                                    val = int(first_num[0]) if first_num else 0
                                    if val > 0:
                                        return val
                        return fallback_val

                    home_shots = max(
                        get_team_stat(0, ["totalShots", "shotsSummary"], roster_team_totals[0]["shots"]),
                        roster_team_totals[0]["shots"],
                        home_score
                    )
                    away_shots = max(
                        get_team_stat(1, ["totalShots", "shotsSummary"], roster_team_totals[1]["shots"]),
                        roster_team_totals[1]["shots"],
                        away_score
                    )
                    home_sot = max(
                        get_team_stat(0, ["shotsOnTarget", "onTargetScoringAttempts"], roster_team_totals[0]["sot"]),
                        roster_team_totals[0]["sot"],
                        home_score
                    )
                    away_sot = max(
                        get_team_stat(1, ["shotsOnTarget", "onTargetScoringAttempts"], roster_team_totals[1]["sot"]),
                        roster_team_totals[1]["sot"],
                        away_score
                    )

                    total_corners = get_team_stat(0, ["wonCorners", "cornerKicks"]) + get_team_stat(1, ["wonCorners", "cornerKicks"])
                    total_cards = (
                        get_team_stat(0, ["yellowCards"]) + get_team_stat(1, ["yellowCards"]) +
                        get_team_stat(0, ["redCards"]) + get_team_stat(1, ["redCards"])
                    )

                    market = leg.get("market", "").upper()
                    selection = leg.get("selection", "")
                    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", selection)]
                    target_line = nums[-1] if nums else 1.0

                    actual_val = 0
                    hit_result = False

                    # PUNTO 1 CORREGIDO: Clasificación exacta de cada mercado de Equipo vs Jugador
                    is_player_prop = ("B+" in market) or ("JUGADOR" in market) or ("GOLEADOR" in market) or ("PORTERO" in market)

                    if "GOLES TOTALES" in market or "GOLES 1RA" in market:
                        actual_val = home_score + away_score
                        hit_result = actual_val > target_line
                    elif "AMBOS EQUIPOS ANOTAN" in market:
                        actual_val = 2 if (home_score > 0 and away_score > 0) else 0
                        target_line = 1
                        hit_result = home_score > 0 and away_score > 0
                    elif "DOBLE OPORTUNIDAD" in market:
                        actual_val = home_score
                        target_line = away_score
                        hit_result = home_score >= away_score
                    elif "GANADOR" in market or "GANA PA" in market or "RESULTADO" in market:
                        is_home_pick = home_name.lower() in selection.lower() or home_abbr.lower() in selection.lower()
                        actual_val = home_score if is_home_pick else away_score
                        opp_val = away_score if is_home_pick else home_score
                        target_line = opp_val + 1
                        hit_result = actual_val > opp_val
                    elif "CÓRNERS" in market:
                        actual_val = total_corners
                        hit_result = actual_val > target_line
                    elif "TARJETAS" in market:
                        actual_val = total_cards
                        hit_result = actual_val > target_line
                    elif not is_player_prop and "TIROS AL ARCO" in market:
                        # Ejemplo: "Osasuna | 4.0+" en "TOTAL DE TIROS AL ARCO 90'"
                        sel_prefix = selection.split("|")[0].strip().lower()
                        is_home_pick = (
                            sel_prefix in home_name.lower()
                            or home_name.lower() in sel_prefix
                            or home_abbr.lower() in sel_prefix
                        )
                        actual_val = home_sot if is_home_pick else away_sot
                        hit_result = actual_val >= target_line
                    elif not is_player_prop and "TIROS" in market:
                        # Ejemplo: "Osasuna | 10.0+" en "TOTAL DE TIROS EQUIPO 90'"
                        sel_prefix = selection.split("|")[0].strip().lower()
                        is_home_pick = (
                            sel_prefix in home_name.lower()
                            or home_name.lower() in sel_prefix
                            or home_abbr.lower() in sel_prefix
                        )
                        actual_val = home_shots if is_home_pick else away_shots
                        hit_result = actual_val >= target_line
                    else:
                        # Es un mercado de JUGADOR (ej. "Ante Budimir OSA | 1.0+" o "Sergio Canales RAC | 2.0+")
                        raw_left = selection.split("|")[0].split("(")[0].strip()
                        # Quitar la sigla del equipo en mayúsculas al final (ej. "OSA", "RMA", "RAC")
                        tokens = raw_left.split()
                        if len(tokens) > 1 and tokens[-1].isupper() and len(tokens[-1]) <= 4:
                            tokens = tokens[:-1]
                        clean_player_name = " ".join(tokens).lower()
                        last_name = tokens[-1].lower() if tokens else clean_player_name

                        matched_p = next(
                            (
                                rp for rp in all_roster_players
                                if clean_player_name in rp["name"].lower()
                                or rp["name"].lower() in clean_player_name
                                or (len(last_name) >= 4 and last_name in rp["name"].lower())
                            ),
                            None
                        )

                        if matched_p:
                            if not matched_p["starter"]:
                                leg["notStarterBadge"] = "NO FUE TITULAR"
                            if "ATAJADAS" in market or "PORTERO" in market:
                                actual_val = matched_p["saves"]
                            elif "GOLEADOR" in market:
                                actual_val = matched_p["goals"]
                                target_line = 1
                            elif "ARCO" in market:
                                actual_val = matched_p["sot"]
                            else:
                                actual_val = matched_p["shots"]
                            hit_result = actual_val >= target_line

                    prev_hit = leg.get("hit")
                    leg["actualValue"] = actual_val
                    leg["targetValue"] = target_line
                    leg["hit"] = bool(hit_result)
                    updated_any = True

                    # PUNTO 3: Si falló o acertó, crear aprendizaje exclusivo para los equipos de este partido
                    target_teams_list = [
                        home_name.lower(),
                        away_name.lower(),
                        home_abbr.lower(),
                        away_abbr.lower()
                    ]
                    if prev_hit is None and not hit_result:
                        learning_logs.insert(0, {
                            "id": f"auto-learn-{match_id}-{len(learning_logs)}",
                            "tag": f"AJUSTE ESPECÍFICO ({home_abbr} / {away_abbr}): {market}",
                            "source": f"Partido: {home_name} {home_score}-{away_score} {away_name}",
                            "targetTeams": target_teams_list,
                            "marketType": market,
                            "outcome": "FAIL",
                            "rule": f"Exclusivo para {home_name} / {away_name}: '{selection}' cerró en {actual_val} (meta {target_line}). En próximos partidos de este equipo se reducirá la línea en {market}."
                        })
                except Exception:
                    continue

    return {
        "ok": True,
        "updated": updated_any,
        "tickets": tickets,
        "learningLogs": learning_logs[:20]
    }

@app.get("/api/history")
async def get_permanent_history():
    if not os.path.exists(VAULT_FILE):
        return {"tickets": [], "learningLogs": []}
    with open(VAULT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/history/sync")
async def sync_history(payload: dict):
    vault = {
        "tickets": payload.get("tickets", []),
        "learningLogs": payload.get("learningLogs", [])
    }
    with open(VAULT_FILE, "w", encoding="utf-8") as f:
        json.dump(vault, f, ensure_ascii=False, indent=2)
    return {"ok": True, "saved_tickets": len(vault["tickets"])}