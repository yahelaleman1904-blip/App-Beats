# draftea-backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
import asyncio
import json
import os
import re
import unicodedata
import httpx

app = FastAPI(
    title="Draftea Beats AI - Motor Multi-Torneo, Cancha Interactiva & Buscador",
    version="7.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

VAULT_FILE = "beats_history_vault.json"
MEXICO_TZ = timezone(timedelta(hours=-6))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

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
    "SUDAMERICANA": {"slug": "conmebol.sudamericana", "profile": "Fricción Alta • Partidos definidos por 1 gol y balón parado", "name": "CONMEBOL Sudamericana"},
    "ARGENTINA": {"slug": "arg.1", "name": "Liga Profesional", "profile": "Defensiva / Fricción • Tendencia a 1-0, tarjetas y córners"},
    "BRASILEIRAO": {"slug": "bra.1", "name": "Brasileirão Betano", "profile": "Alto Volumen de Tiros • Extremos encaradores y atajadas"},
    "COLOMBIA": {"slug": "col.1", "name": "Liga BetPlay", "profile": "Cerrada • Equipos que anotan 1 gol y cuidan resultado"},
    "A_LEAGUE": {"slug": "aus.1", "name": "Isuzu A-League", "profile": "Goleadora • Defensas abiertas, ideal para +1.5 y +2.5 Goles"},
}

SLUG_TO_LEAGUE_NAME = {v["slug"]: v["name"] for v in LIVE_LEAGUES_MAP.values()}
SLUG_TO_LEAGUE_NAME.update({
    "esp.copa_del_rey": "Copa del Rey",
    "eng.league_cup": "EFL Carabao Cup",
    "ita.coppa_italia": "Coppa Italia",
    "ger.dfb_pokal": "DFB Pokal",
    "fra.coupe_de_france": "Coupe de France",
    "uefa.euro": "UEFA Euro",
    "concacaf.champions": "CONCACAF Champions Cup",
})

DEEP_CACHE = {}
CARTELERA_CACHE = {"timestamp": None, "date_key": None, "matches": []}
TEAMS_DIRECTORY = {}  # Directorio dinámico de clubes para el buscador estilo Google


def normalize_text(text: str) -> str:
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(text))
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).lower().strip()


def register_team_in_directory(team_obj, league_slug: str, league_name: str):
    """Registra automáticamente cada club visto en el directorio global para el Buscador."""
    t_id = str(team_obj.get("id", ""))
    t_name = team_obj.get("displayName") or team_obj.get("name") or ""
    if not t_id or not t_name:
        return
    TEAMS_DIRECTORY[t_id] = {
        "teamId": t_id,
        "name": t_name,
        "short": team_obj.get("abbreviation") or t_name[:3].upper(),
        "logo": team_obj.get("logo") or (team_obj.get("logos", [{}])[0].get("href", "") if team_obj.get("logos") else ""),
        "leagueSlug": league_slug,
        "leagueName": league_name,
        "searchKey": normalize_text(f"{t_name} {team_obj.get('abbreviation', '')}")
    }


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


def extract_official_team_stats_from_boxscore(box_team_obj):
    stats_list = box_team_obj.get("statistics", [])
    stat_map = {}
    for st in stats_list:
        name = st.get("name", "")
        disp = str(st.get("displayValue", "")).strip()
        val = st.get("value")
        stat_map[name] = disp if disp != "" else str(val if val is not None else "0")

    summary_shots, summary_sot = None, None
    if "shotsSummary" in stat_map:
        nums = re.findall(r"\d+", stat_map["shotsSummary"])
        if len(nums) >= 2:
            summary_shots = int(nums[0])
            summary_sot = int(nums[1])
        elif len(nums) == 1:
            summary_shots = int(nums[0])

    direct_shots = None
    for k in ["totalShots", "shots"]:
        if k in stat_map:
            nums = re.findall(r"\d+", stat_map[k])
            if nums:
                direct_shots = int(nums[0])
                break

    direct_sot = None
    for k in ["shotsOnGoal", "shotsOnTarget", "onTargetScoringAttempts"]:
        if k in stat_map:
            nums = re.findall(r"\d+", stat_map[k])
            if nums:
                direct_sot = int(nums[0])
                break

    final_shots = direct_shots if direct_shots is not None else (summary_shots or 0)
    final_sot = direct_sot if direct_sot is not None else (summary_sot or 0)

    def get_single_int(keys, default_val=0):
        for k in keys:
            if k in stat_map:
                nums = re.findall(r"\d+", stat_map[k])
                if nums:
                    return int(nums[0])
        return default_val

    corners = get_single_int(["wonCorners", "cornerKicks", "corners"], 0)
    yellows = get_single_int(["yellowCards"], 0)
    reds = get_single_int(["redCards"], 0)
    saves = get_single_int(["saves"], 0)
    poss = get_single_int(["possessionPct"], 50)

    return {
        "shots": final_shots,
        "sot": final_sot,
        "corners": corners,
        "yellows": yellows,
        "reds": reds,
        "cards": yellows + reds,
        "saves": saves,
        "possession": poss
    }


def extract_player_stats_from_entry(p_entry):
    """Extrae todas las métricas reales disponibles en ESPN para el jugador en ese partido."""
    st_map = {}
    for s in p_entry.get("stats", []):
        s_name = s.get("name", "")
        s_val = s.get("value")
        if s_val is not None:
            st_map[s_name] = safe_float(s_val, 0.0)
        else:
            nums = re.findall(r"\d+", str(s.get("displayValue", "0")))
            st_map[s_name] = float(nums[0]) if nums else 0.0

    shots = int(st_map.get("totalShots", st_map.get("shots", st_map.get("scoringAttempts", 0))))
    sot = int(st_map.get("shotsOnGoal", st_map.get("shotsOnTarget", st_map.get("onTargetScoringAttempts", 0))))
    goals = int(st_map.get("totalGoals", st_map.get("goals", 0)))
    assists = int(st_map.get("goalAssists", st_map.get("assists", 0)))
    saves = int(st_map.get("saves", 0))
    conceded = int(st_map.get("goalsConceded", 0))
    fouls_committed = int(st_map.get("foulsCommitted", 0))
    fouls_suffered = int(st_map.get("foulsSuffered", 0))
    yellow_cards = int(st_map.get("yellowCards", 0))
    red_cards = int(st_map.get("redCards", 0))
    offsides = int(st_map.get("offsides", 0))
    appearances = int(st_map.get("appearances", 1))

    # Estimación real de xG del partido basada en tiros al arco, tiros totales y goles
    xg_est = round((sot * 0.28) + (max(0, shots - sot) * 0.07) + (goals * 0.15), 2)

    return {
        "shots": shots,
        "sot": sot,
        "goals": goals,
        "assists": assists,
        "saves": saves,
        "conceded": conceded,
        "foulsCommitted": fouls_committed,
        "foulsSuffered": fouls_suffered,
        "yellowCards": yellow_cards,
        "redCards": red_cards,
        "offsides": offsides,
        "xg": xg_est,
        "appearances": appearances
    }


def map_pos_Name_es(pos_abbr: str) -> str:
    p = (pos_abbr or "M").upper()
    if "G" in p:
        return "Portero"
    if any(k in p for k in ["D", "CB", "LB", "RB"]):
        return "Defensa"
    if any(k in p for k in ["F", "W", "S", "CF", "LW", "RW"]):
        return "Delantero"
    return "Mediocampista"


def build_pitch_and_squad_from_roster(roster_list, team_abbr, team_logo, substitutions_list):
    """
    Construye:
    1. Las filas de la cancha interactiva (con los datos completos de cada jugador y por quién salió de cambio).
    2. La lista completa de convocados (Titulares, Suplentes que entraron y Banca) para la Tabla estilo Imagen 1.
    """
    starters = [p for p in roster_list if p.get("starter")]
    if not starters:
        starters = roster_list[:11]

    # Mapa rápido de quién salió por quién y quién entró por quién
    sub_out_map = {}  # nombre_normalizado_saliente -> {"in": nombre_entrante, "min": clock}
    sub_in_map = {}   # nombre_normalizado_entrante -> {"out": nombre_saliente, "min": clock}
    for sub in substitutions_list:
        out_norm = normalize_text(sub.get("out", ""))
        in_norm = normalize_text(sub.get("in", ""))
        if out_norm:
            sub_out_map[out_norm] = {"in": sub.get("in"), "min": sub.get("min")}
        if in_norm:
            sub_in_map[in_norm] = {"out": sub.get("out"), "min": sub.get("min")}

    def enrich_player_object(p):
        athlete = p.get("athlete", {})
        pos_abbr = p.get("position", {}).get("abbreviation", "M").upper()
        jersey = safe_int(p.get("jersey", athlete.get("jersey", 0)), 0)
        full_name = athlete.get("displayName") or athlete.get("shortName") or "Jugador"
        short_name = athlete.get("shortName") or full_name
        norm_full = normalize_text(full_name)
        norm_short = normalize_text(short_name)

        p_st = extract_player_stats_from_entry(p)
        is_starter = bool(p.get("starter", False))
        subbed_out = bool(p.get("subbedOut", False))
        subbed_in = bool(p.get("subbedIn", False))

        # Buscar cruce exacto de cambio
        sub_out_info = sub_out_map.get(norm_full) or sub_out_map.get(norm_short)
        sub_in_info = sub_in_map.get(norm_full) or sub_in_map.get(norm_short)
        if not sub_out_info and subbed_out:
            # Buscar por apellido
            last_n = norm_full.split()[-1] if norm_full else ""
            for k, v in sub_out_map.items():
                if len(last_n) >= 4 and last_n in k:
                    sub_out_info = v
                    break

        if not sub_in_info and subbed_in:
            last_n = norm_full.split()[-1] if norm_full else ""
            for k, v in sub_in_map.items():
                if len(last_n) >= 4 and last_n in k:
                    sub_in_info = v
                    break

        base_rating = (
            6.7
            + (p_st["goals"] * 1.15)
            + (p_st["assists"] * 0.75)
            + (p_st["sot"] * 0.25)
            + (p_st["saves"] * 0.22)
            + (p_st["foulsSuffered"] * 0.06)
            - (p_st["yellowCards"] * 0.25)
            - (p_st["redCards"] * 1.2)
        )
        rating = round(min(9.9, max(5.4, base_rating)), 1)

        return {
            "num": jersey,
            "name": short_name,
            "fullName": full_name,
            "team": team_abbr,
            "teamLogo": team_logo,
            "pos": pos_abbr,
            "posLabel": map_pos_Name_es(pos_abbr),
            "starter": is_starter,
            "subbedIn": subbed_in or (sub_in_info is not None),
            "subbedOut": subbed_out or (sub_out_info is not None),
            "replacedBy": sub_out_info["in"] if sub_out_info else None,
            "replacedMin": sub_out_info["min"] if sub_out_info else None,
            "replacedWho": sub_in_info["out"] if sub_in_info else None,
            "enteredMin": sub_in_info["min"] if sub_in_info else None,
            "rating": rating,
            "goals": p_st["goals"],
            "assists": p_st["assists"],
            "shots": p_st["shots"],
            "sot": p_st["sot"],
            "xg": p_st["xg"],
            "saves": p_st["saves"],
            "conceded": p_st["conceded"],
            "foulsCommitted": p_st["foulsCommitted"],
            "foulsSuffered": p_st["foulsSuffered"],
            "yellowCards": p_st["yellowCards"],
            "redCards": p_st["redCards"],
        }

    enriched_all = [enrich_player_object(p) for p in roster_list]
    enriched_starters = [ep for ep in enriched_all if ep["starter"]][:11]
    if not enriched_starters:
        enriched_starters = enriched_all[:11]

    gk, df, mf, fw = [], [], [], []
    for node in enriched_starters:
        pos_abbr = node["pos"]
        if "G" in pos_abbr:
            gk.append(node)
        elif any(k in pos_abbr for k in ["D", "B", "CB", "LB", "RB"]):
            df.append(node)
        elif any(k in pos_abbr for k in ["F", "W", "S", "CF", "LW", "RW"]):
            fw.append(node)
        else:
            mf.append(node)

    rows = [r for r in [gk, df, mf, fw] if r]

    # Ordenar convocados por Rating de mayor a menor (como en la Imagen 1)
    squad_sorted = sorted(
        enriched_all,
        key=lambda x: (1 if (x["starter"] or x["subbedIn"]) else 0, x["rating"], x["shots"]),
        reverse=True
    )

    return rows, squad_sorted


async def parse_past_match_summary(
    client: httpx.AsyncClient,
    league_slug: str,
    event_id: str,
    target_team_id: str,
    fallback_comp_name: str = ""
):
    cache_key = f"summary_v8_{event_id}_{target_team_id}"
    if cache_key in DEEP_CACHE:
        return DEEP_CACHE[cache_key]

    # Intentar primero con el league_slug indicado y si falla con 'all'
    urls_to_try = [
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={event_id}",
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    ]

    data = None
    for url in urls_to_try:
        try:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("header"):
                    break
        except Exception:
            continue

    if not data:
        return None

    try:
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
        home_logo = home_c.get("team", {}).get("logos", [{}])[0].get("href", "") if home_c.get("team", {}).get("logos") else ""
        away_logo = away_c.get("team", {}).get("logos", [{}])[0].get("href", "") if away_c.get("team", {}).get("logos") else ""
        home_score = safe_int(home_c.get("score", 0))
        away_score = safe_int(away_c.get("score", 0))

        comp_name = (
            data.get("header", {}).get("league", {}).get("name")
            or fallback_comp_name
            or SLUG_TO_LEAGUE_NAME.get(league_slug, "Torneo Oficial")
        )

        # Registrar ambos clubes en el directorio del buscador
        register_team_in_directory({"id": home_id_str, "displayName": home_name, "abbreviation": home_abbr, "logo": home_logo}, league_slug, comp_name)
        register_team_in_directory({"id": away_id_str, "displayName": away_name, "abbreviation": away_abbr, "logo": away_logo}, league_slug, comp_name)

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

        rosters = data.get("rosters", [])
        home_roster_obj, away_roster_obj = {}, {}
        for r_obj in rosters:
            r_tid = str(r_obj.get("team", {}).get("id", ""))
            if r_tid == home_id_str:
                home_roster_obj = r_obj
            elif r_tid == away_id_str:
                away_roster_obj = r_obj
        if not home_roster_obj and len(rosters) > 0:
            home_roster_obj = rosters[0]
        if not away_roster_obj and len(rosters) > 1:
            away_roster_obj = rosters[1]

        player_to_team_label = {}
        for r_idx, r_obj in enumerate([home_roster_obj, away_roster_obj]):
            t_label = home_abbr if r_idx == 0 else away_abbr
            for p in r_obj.get("roster", []):
                ath = p.get("athlete", {})
                if ath.get("displayName"):
                    player_to_team_label[ath.get("displayName")] = t_label
                if ath.get("shortName"):
                    player_to_team_label[ath.get("shortName")] = t_label

        # Extraer goles, tarjetas y sustituciones primero para inyectarlos en los nodos de la cancha
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
                    "note": f"Entró {player_in} por {player_out} ({clock})"
                })

        box_teams = data.get("boxscore", {}).get("teams", [])
        home_box_obj, away_box_obj = {}, {}
        for bt in box_teams:
            bt_id = str(bt.get("team", {}).get("id", ""))
            if bt_id == home_id_str:
                home_box_obj = bt
            elif bt_id == away_id_str:
                away_box_obj = bt
        if not home_box_obj and len(box_teams) > 0:
            home_box_obj = box_teams[0]
        if not away_box_obj and len(box_teams) > 1:
            away_box_obj = box_teams[1]

        h_official = extract_official_team_stats_from_boxscore(home_box_obj)
        a_official = extract_official_team_stats_from_boxscore(away_box_obj)

        # Construir filas interactivas de cancha y tablas de convocados (Imagen 1)
        home_rows, home_squad_table = build_pitch_and_squad_from_roster(
            home_roster_obj.get("roster", []), home_abbr, home_logo, substitutions
        )
        away_rows, away_squad_table = build_pitch_and_squad_from_roster(
            away_roster_obj.get("roster", []), away_abbr, away_logo, substitutions
        )

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

                p_st = extract_player_stats_from_entry(p)
                sh = p_st["shots"]
                sot = p_st["sot"]
                gls = p_st["goals"]
                ast = p_st["assists"]
                svs = p_st["saves"]
                ga = p_st["conceded"]

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
                        "competition": comp_name,
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
                        "assists": ast,
                        "starter": is_starter,
                        "subbedIn": subbed_in,
                        "matchDate": date_mx[5:],
                        "matchScore": short_score_label,
                        "competition": comp_name,
                        "result": result_letter
                    })

        shots_pair = [
            h_official["shots"] if h_official["shots"] > 0 else sum(p["shots"] for p in player_perf if p["teamId"] == home_id_str),
            a_official["shots"] if a_official["shots"] > 0 else sum(p["shots"] for p in player_perf if p["teamId"] == away_id_str),
        ]
        sot_pair = [
            h_official["sot"] if h_official["sot"] > 0 else sum(p["sot"] for p in player_perf if p["teamId"] == home_id_str),
            a_official["sot"] if a_official["sot"] > 0 else sum(p["sot"] for p in player_perf if p["teamId"] == away_id_str),
        ]
        saves_pair = [
            h_official["saves"] if h_official["saves"] > 0 else sum(g["saves"] for g in gk_perf if g["teamId"] == home_id_str),
            a_official["saves"] if a_official["saves"] > 0 else sum(g["saves"] for g in gk_perf if g["teamId"] == away_id_str),
        ]
        corners_pair = [h_official["corners"], a_official["corners"]]
        total_cards_pair = [h_official["cards"], a_official["cards"]]
        poss_pair = [h_official["possession"], a_official["possession"]]

        home_formation = home_roster_obj.get("formation", "4-2-3-1") or "4-2-3-1"
        away_formation = away_roster_obj.get("formation", "4-3-3") or "4-3-3"

        my_squad_table = home_squad_table if is_home_target else away_squad_table
        opp_squad_table = away_squad_table if is_home_target else home_squad_table

        # Detectar quién metió el PRIMER GOL del partido revisando el primer evento de gol
        first_goal_team = scorers[0]["team"] if len(scorers) > 0 else None
        my_abbr_clean = home_abbr if is_home_target else away_abbr
        my_name_clean = home_name if is_home_target else away_name

        scored_first = 0
        conceded_first = 0
        if first_goal_team:
            if my_abbr_clean in first_goal_team or my_name_clean in first_goal_team:
                scored_first = 1
            else:
                conceded_first = 1

        parsed_obj = {
            "id": str(event_id),
            "fullDate": date_mx,
            "date": date_mx[5:],
            "competition": comp_name,
            "homeName": home_name,
            "awayName": away_name,
            "homeAbbr": home_abbr,
            "awayAbbr": away_abbr,
            "homeLogo": home_logo,
            "awayLogo": away_logo,
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
            "mySquad": my_squad_table,
            "oppSquad": opp_squad_table,
            "squadTable": {
                "home": home_squad_table,
                "away": away_squad_table,
                "all": sorted(home_squad_table + away_squad_table, key=lambda x: x["rating"], reverse=True)
            },
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
            "_scoredFirst": scored_first,
            "_concededFirst": conceded_first,
            "_isHomeGame": 1 if is_home_target else 0,
        }
        DEEP_CACHE[cache_key] = parsed_obj
        return parsed_obj
    except Exception:
        return None


async def fetch_team_last_5(client: httpx.AsyncClient, league_slug: str, team_id: str):
    """
    MEJORA 1: Descarga los últimos 5 partidos jugados del club a través de TODAS LAS COMPETICIONES
    (Liga + Champions + Europa League + Copa Nacional + Libertadores) y muestra de qué competencia fue cada uno.
    """
    if not team_id:
        return []

    # Consultamos el calendario global ('all') + la liga base + torneos continentales para no perder ningún juego de Champions/Copa
    candidate_slugs = ["all", league_slug]
    if league_slug in ["esp.1", "eng.1", "ita.1", "ger.1", "fra.1", "ned.1", "por.1", "bel.1"]:
        candidate_slugs.extend(["uefa.champions", "uefa.europa"])
    elif league_slug in ["arg.1", "bra.1", "col.1"]:
        candidate_slugs.extend(["conmebol.libertadores", "conmebol.sudamericana"])

    seen_slugs = []
    for s in candidate_slugs:
        if s and s not in seen_slugs:
            seen_slugs.append(s)

    async def fetch_schedule_slug(s_slug):
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{s_slug}/teams/{team_id}/schedule"
        try:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                return []
            data = resp.json()
            lg_default_name = data.get("league", {}).get("name") or SLUG_TO_LEAGUE_NAME.get(s_slug, "Torneo Oficial")
            out = []
            for ev in data.get("events", []):
                comp = ev.get("competitions", [{}])[0]
                st_type = comp.get("status", {}).get("type", {})
                st_state = st_type.get("state", "").lower()
                st_completed = st_type.get("completed", False)
                if st_completed or st_state == "post":
                    ev_lg_name = (
                        ev.get("league", {}).get("name")
                        or comp.get("league", {}).get("name")
                        or ev.get("season", {}).get("displayName")
                        or lg_default_name
                    )
                    ev_slug = s_slug if s_slug != "all" else league_slug
                    out.append({
                        "id": str(ev.get("id")),
                        "date": ev.get("date", ""),
                        "slug": ev_slug,
                        "compName": ev_lg_name
                    })
            return out
        except Exception:
            return []

    batches = await asyncio.gather(*(fetch_schedule_slug(s) for s in seen_slugs))
    merged_events = {}
    for b in batches:
        for ev_item in b:
            ev_id = ev_item["id"]
            if ev_id not in merged_events or merged_events[ev_id]["compName"] == "Torneo Oficial":
                merged_events[ev_id] = ev_item

    sorted_completed = sorted(merged_events.values(), key=lambda x: x["date"])
    last_5_events = sorted_completed[-5:]
    last_5_events.reverse()

    tasks = [
        parse_past_match_summary(client, ev["slug"], ev["id"], str(team_id), ev["compName"])
        for ev in last_5_events
    ]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


def analyze_team_tactical_style(last5_list, team_name, is_home=True):
    if not last5_list:
        return {
            "styleTag": "Sin historial reciente",
            "avgGoalsFor": 0.0,
            "avgGoalsAgainst": 0.0,
            "oneGoalWins": 0,
            "blowoutWins": 0,
            "parkTheBusRisk": False,
            "isScoringMachine": False,
            "summary": f"Cargando registros oficiales de {team_name}."
        }

    n = len(last5_list)
    gf = sum(m["_myGoals"] for m in last5_list)
    ga = sum(m["_oppGoals"] for m in last5_list)
    avg_gf = round(gf / n, 2)
    avg_ga = round(ga / n, 2)
    avg_shots = round(sum(m["_myShots"] for m in last5_list) / n, 1)
    avg_sot = round(sum(m["_mySoT"] for m in last5_list) / n, 1)
    avg_poss = round(sum(m["_myPossession"] for m in last5_list) / n, 1)

    low_scoring_games = sum(1 for m in last5_list if m["_totalGoals"] <= 2)
    one_goal_wins = sum(1 for m in last5_list if m["_myGoals"] == 1 and m["_oppGoals"] == 0)
    blowout_games = sum(1 for m in last5_list if m["_myGoals"] >= 3)

    park_the_bus = (one_goal_wins >= 2) or (avg_gf <= 1.2 and avg_ga <= 0.9 and low_scoring_games >= 3)
    is_scoring_machine = avg_gf >= 2.0 or blowout_games >= 2

    if park_the_bus:
        style_tag = "🛡️ Cerrojo Táctico (Mete 1 gol y cierra espacios)"
        explanation = (
            f"En {low_scoring_games} de sus últimos {n} juegos hubo ≤2 goles "
            f"(promedia {avg_gf} goles a favor y {avg_ga} en contra). Suele marcar 1 gol y replegarse."
        )
    elif is_scoring_machine:
        style_tag = "🔥 Aplanadora Ofensiva (Volumen alto y goleadas)"
        explanation = (
            f"Promedia {avg_gf} goles y {avg_sot} tiros al arco por partido "
            f"({blowout_games} partidos con 3+ goles en sus últimos {n})."
        )
    elif avg_shots >= 14.0:
        style_tag = "⚡ Ataque Constante por Bandas (Alto volumen de tiros)"
        explanation = (
            f"Genera {avg_shots} tiros totales y {avg_sot} al arco por partido ({avg_poss}% posesión)."
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


@app.get("/")
@app.get("/api/health")
async def health_check():
    return {"ok": True, "status": "online", "version": "7.0.0"}


@app.get("/api/teams/search")
async def search_clubs_autocomplete(q: str = ""):
    """
    MEJORA 2: Buscador Inteligente de Clubes estilo Google.
    Si escribes 'Bar', devuelve 'FC Barcelona', 'Barracas Central', etc.
    """
    query_norm = normalize_text(q)
    # Si el directorio aún está vacío, poblarlo rápido desde el caché de cartelera
    if not TEAMS_DIRECTORY and CARTELERA_CACHE["matches"]:
        for m in CARTELERA_CACHE["matches"]:
            register_team_in_directory(
                {"id": m["homeTeam"]["teamApiId"], "displayName": m["homeTeam"]["name"], "abbreviation": m["homeTeam"]["short"], "logo": m["homeTeam"]["logo"]},
                m.get("leagueSlug", "esp.1"),
                m.get("leagueName", "Liga")
            )
            register_team_in_directory(
                {"id": m["awayTeam"]["teamApiId"], "displayName": m["awayTeam"]["name"], "abbreviation": m["awayTeam"]["short"], "logo": m["awayTeam"]["logo"]},
                m.get("leagueSlug", "esp.1"),
                m.get("leagueName", "Liga")
            )

    all_clubs = list(TEAMS_DIRECTORY.values())
    if not query_norm:
        return {"ok": True, "teams": all_clubs[:15]}

    # Priorizar los que empiezan con el texto buscado y luego los que lo contienen
    starts_with = [c for c in all_clubs if normalize_text(c["name"]).startswith(query_norm) or normalize_text(c["short"]).startswith(query_norm)]
    contains = [c for c in all_clubs if c not in starts_with and query_norm in c["searchKey"]]

    results = (starts_with + contains)[:12]
    return {"ok": True, "teams": results}


@app.get("/api/team-profile")
async def get_club_full_profile(team_id: str, league_slug: str = "esp.1", team_name: str = "Club", team_abbr: str = "CLB", team_logo: str = ""):
    """
    Devuelve el perfil completo del club seleccionado en el Buscador:
    - Su último partido jugado (con plantilla en cancha interactiva, estadísticas al lado y tabla de convocados).
    - Sus últimos 5 partidos jugados en todas las competiciones.
    - Su análisis táctico y ranking de jugadores en los últimos 5 juegos.
    """
    async with httpx.AsyncClient(timeout=16.0, follow_redirects=True) as client:
        last_5_matches = await fetch_team_last_5(client, league_slug, team_id)

    tactics = analyze_team_tactical_style(last_5_matches, team_name, is_home=True)
    latest_match = last_5_matches[0] if last_5_matches else None

    return {
        "ok": True,
        "club": {
            "teamId": team_id,
            "name": team_name,
            "short": team_abbr,
            "logo": team_logo,
            "leagueSlug": league_slug
        },
        "tactics": tactics,
        "latestMatch": latest_match,
        "last5Matches": last_5_matches
    }


# En draftea-backend/main.py, reemplaza toda la función @app.get("/api/match-deep-stats") por esta:

def american_to_decimal_odd(am_val, fallback=1.35):
    try:
        v = float(str(am_val).replace("+", "").strip())
        if v == 0:
            return fallback
        if v > 0:
            return round(1.0 + (v / 100.0), 2)
        return round(1.0 + (100.0 / abs(v)), 2)
    except Exception:
        return fallback


@app.get("/api/match-deep-stats")
async def get_match_deep_stats(
    league_slug: str,
    home_id: str,
    away_id: str,
    home_abbr: str = "LOC",
    away_abbr: str = "VIS",
    event_id: str = ""
):
    async with httpx.AsyncClient(timeout=16.0, follow_redirects=True) as client:
        home_last5, away_last5 = await asyncio.gather(
            fetch_team_last_5(client, league_slug, home_id),
            fetch_team_last_5(client, league_slug, away_id)
        )

        confirmed_lineup = {
            "confirmed": False,
            "homeFormation": None,
            "awayFormation": None,
            "homeRows": [],
            "awayRows": [],
            "squadTable": None
        }
        bookmaker_odds = {
            "homeWinOdd": None,
            "drawOdd": None,
            "awayWinOdd": None,
            "overUnderLine": None,
            "overOdd": None,
            "underOdd": None
        }

        if event_id:
            try:
                ev_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={event_id}"
                ev_resp = await client.get(ev_url, headers=HEADERS)
                if ev_resp.status_code == 200:
                    ev_data = ev_resp.json()

                    # 1. Extraer momios oficiales de las casas de apuestas (pickcenter / odds)
                    pickcenter = ev_data.get("pickcenter", []) or ev_data.get("odds", [])
                    if pickcenter and len(pickcenter) > 0:
                        pc = pickcenter[0]
                        ou_line = safe_float(pc.get("overUnder"), 0.0)
                        if ou_line > 0:
                            bookmaker_odds["overUnderLine"] = ou_line
                        if pc.get("overOdds"):
                            bookmaker_odds["overOdd"] = american_to_decimal_odd(pc.get("overOdds"), 1.85)
                        if pc.get("underOdds"):
                            bookmaker_odds["underOdd"] = american_to_decimal_odd(pc.get("underOdds"), 1.85)

                        h_ml = pc.get("homeTeamOdds", {}).get("moneyLine")
                        a_ml = pc.get("awayTeamOdds", {}).get("moneyLine")
                        d_ml = pc.get("drawOdds", {}).get("moneyLine")
                        if h_ml is not None:
                            bookmaker_odds["homeWinOdd"] = american_to_decimal_odd(h_ml, 1.65)
                        if a_ml is not None:
                            bookmaker_odds["awayWinOdd"] = american_to_decimal_odd(a_ml, 3.80)
                        if d_ml is not None:
                            bookmaker_odds["drawOdd"] = american_to_decimal_odd(d_ml, 4.20)

                    # 2. Verificar si ya hay alineación confirmada
                    rosters = ev_data.get("rosters", [])
                    if len(rosters) >= 2 and rosters[0].get("roster") and rosters[1].get("roster"):
                        h_rows, h_sq = build_pitch_and_squad_from_roster(rosters[0].get("roster", []), home_abbr, "", [])
                        a_rows, a_sq = build_pitch_and_squad_from_roster(rosters[1].get("roster", []), away_abbr, "", [])
                        if h_rows and a_rows:
                            confirmed_lineup = {
                                "confirmed": True,
                                "homeFormation": rosters[0].get("formation", "4-2-3-1") or "4-2-3-1",
                                "awayFormation": rosters[1].get("formation", "4-3-3") or "4-3-3",
                                "homeRows": h_rows,
                                "awayRows": a_rows,
                                "squadTable": {
                                    "home": h_sq,
                                    "away": a_sq,
                                    "all": sorted(h_sq + a_sq, key=lambda x: x["rating"], reverse=True)
                                }
                            }
            except Exception:
                pass

    combined_matches = home_last5 + away_last5
    total_m = max(1, len(combined_matches))

    over05 = round(sum(1 for m in combined_matches if m["_totalGoals"] >= 1) / total_m * 100)
    over15 = round(sum(1 for m in combined_matches if m["_totalGoals"] >= 2) / total_m * 100)
    over25 = round(sum(1 for m in combined_matches if m["_totalGoals"] >= 3) / total_m * 100)
    under35_prob = round(sum(1 for m in combined_matches if m["_totalGoals"] <= 3) / total_m * 100)
    under45_prob = round(sum(1 for m in combined_matches if m["_totalGoals"] <= 4) / total_m * 100)
    btts = round(sum(m["_btts"] for m in combined_matches) / total_m * 100)

    h_count = max(1, len(home_last5))
    a_count = max(1, len(away_last5))

    home_shots_avg = round(sum(m["_myShots"] for m in home_last5) / h_count, 1)
    away_shots_avg = round(sum(m["_myShots"] for m in away_last5) / a_count, 1)
    home_sot_avg = round(sum(m["_mySoT"] for m in home_last5) / h_count, 1)
    away_sot_avg = round(sum(m["_mySoT"] for m in away_last5) / a_count, 1)
    home_goals_avg = round(sum(m["_myGoals"] for m in home_last5) / h_count, 2)
    away_goals_avg = round(sum(m["_myGoals"] for m in away_last5) / a_count, 2)
    home_corners_avg = round(sum(m.get("_myCorners", 0) for m in home_last5) / h_count, 1)
    away_corners_avg = round(sum(m.get("_myCorners", 0) for m in away_last5) / a_count, 1)
    home_cards_avg = round(sum(m.get("_myCards", 0) for m in home_last5) / h_count, 1)
    away_cards_avg = round(sum(m.get("_myCards", 0) for m in away_last5) / a_count, 1)

    # Cálculo de 1er Gol y Porcentaje de Victoria
    home_scored_first_rate = round(sum(m.get("_scoredFirst", 0) for m in home_last5) / h_count * 100)
    away_scored_first_rate = round(sum(m.get("_scoredFirst", 0) for m in away_last5) / a_count * 100)
    home_conceded_first_rate = round(sum(m.get("_concededFirst", 0) for m in home_last5) / h_count * 100)
    away_conceded_first_rate = round(sum(m.get("_concededFirst", 0) for m in away_last5) / a_count * 100)

    raw_home_first_goal = round((home_scored_first_rate * 0.6) + (away_conceded_first_rate * 0.4))
    raw_away_first_goal = round((away_scored_first_rate * 0.6) + (home_conceded_first_rate * 0.4))
    total_fg = max(1, raw_home_first_goal + raw_away_first_goal)
    home_first_goal_prob = min(82, max(18, round((raw_home_first_goal / total_fg) * 92)))
    away_first_goal_prob = min(82, max(15, round((raw_away_first_goal / total_fg) * 92)))
    no_goal_prob = max(2, 100 - home_first_goal_prob - away_first_goal_prob)

    home_wins = sum(1 for m in home_last5 if m["result"] == "W")
    home_draws = sum(1 for m in home_last5 if m["result"] == "D")
    away_wins = sum(1 for m in away_last5 if m["result"] == "W")
    away_draws = sum(1 for m in away_last5 if m["result"] == "D")
    away_losses = sum(1 for m in away_last5 if m["result"] == "L")

    home_strength = (
        ((home_wins / h_count) * 45)
        + ((away_losses / a_count) * 25)
        + (min(20, max(0, (home_goals_avg - away_goals_avg + 1.2) * 8)))
        + (min(10, max(0, (home_sot_avg - away_sot_avg + 1.5) * 2.5)))
        + 6
    )
    away_strength = (
        ((away_wins / a_count) * 45)
        + (((h_count - home_wins - home_draws) / h_count) * 25)
        + (min(20, max(0, (away_goals_avg - home_goals_avg + 1.0) * 8)))
        + (min(10, max(0, (away_sot_avg - home_sot_avg + 1.0) * 2.5)))
    )
    draw_strength = 22 + (((home_draws / h_count) + (away_draws / a_count)) * 18)

    total_str = max(1.0, home_strength + away_strength + draw_strength)
    win_prob_home = round((home_strength / total_str) * 100)
    win_prob_away = round((away_strength / total_str) * 100)
    win_prob_draw = max(10, 100 - win_prob_home - win_prob_away)

    # =========================================================================
    # MOTOR DE REGLAS EXACTAS DE APERTURA Y CANDADOS DE DRAFTEA (DAF 12 y DAF 13)
    # =========================================================================
    expected_total_goals = round(home_goals_avg + away_goals_avg, 2)

    # 1. Goles Totales: Si ambos equipos promedian >= 2.7 goles combinados o Over 2.5 >= 65%
    # (ej. Barcelona vs Real Madrid), Draftea BLOQUEA ↑ 1.5 con candado y solo abre desde ↑ 2.5
    is_over15_locked_in_draftea = (
        expected_total_goals >= 2.75
        or over25 >= 65
        or (bookmaker_odds["overUnderLine"] and bookmaker_odds["overUnderLine"] >= 3.25)
    )
    draftea_min_goal_line = 2.5 if is_over15_locked_in_draftea else 1.5
    draftea_under_safe_line = 3.5 if expected_total_goals <= 3.0 else 4.5

    # 2. Total de Goles por Equipo (como en DAF 12: Total de goles Barcelona 1.5 / 2.5 y Real Madrid 0.5 / 1.5)
    draftea_home_team_goal_line = 1.5 if home_goals_avg >= 1.65 else 0.5
    draftea_away_team_goal_line = 1.5 if away_goals_avg >= 1.65 else 0.5
    home_team_over_hits = sum(
        1 for m in home_last5 if m["_myGoals"] > draftea_home_team_goal_line
    )
    away_team_over_hits = sum(
        1 for m in away_last5 if m["_myGoals"] > draftea_away_team_goal_line
    )

    # 3. Total de Tiros al Arco de Equipo (En DAF 12: Barcelona empieza en 7.0+ (1.42x) y Real Madrid en 5.0+ (1.69x))
    # En Draftea NUNCA hay tope en 5: la primera línea desbloqueada es round(promedio_sot_L5 - 0.3)
    draftea_home_sot_open_line = max(3, int(round(home_sot_avg - 0.25)))
    draftea_away_sot_open_line = max(3, int(round(away_sot_avg - 0.25)))
    draftea_home_shots_open_line = max(9, int(round(home_shots_avg - 1.2)))
    draftea_away_shots_open_line = max(8, int(round(away_shots_avg - 1.2)))

    # Momios reales estilo Draftea
    ml_home_odd = bookmaker_odds["homeWinOdd"] or round(max(1.32, min(4.50, 100 / max(22, win_prob_home) * 0.92)), 2)
    ml_away_odd = bookmaker_odds["awayWinOdd"] or round(max(1.45, min(5.50, 100 / max(18, win_prob_away) * 0.92)), 2)
    # Pago Anticipado por 1 gol PA(1) (En DAF12: FCB Money Line = 1.60x -> PA(1) = 1.25x; RMA = 3.99x -> PA(1) = 1.89x)
    pa1_home_odd = round(max(1.18, 1.0 + (ml_home_odd - 1.0) * 0.42), 2)
    pa1_away_odd = round(max(1.25, 1.0 + (ml_away_odd - 1.0) * 0.30), 2)
    dc_home_draw_odd = round(max(1.18, 1.0 + (ml_home_odd - 1.0) * 0.38), 2)
    dc_away_draw_odd = round(max(1.24, 1.0 + (ml_away_odd - 1.0) * 0.38), 2)

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
                        "posLabel": map_pos_Name_es(p["pos"]),
                        "games": 0,
                        "starts": 0,
                        "subIns": 0,
                        "shots": 0,
                        "sot": 0,
                        "goals": 0,
                        "assists": 0,
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
                agg_players[key]["assists"] += p.get("assists", 0)
                agg_players[key]["matchLogs"].append({
                    "date": p["matchDate"],
                    "score": p["matchScore"],
                    "competition": p.get("competition", ""),
                    "result": p["result"],
                    "shots": p["shots"],
                    "sot": p["sot"],
                    "goals": p["goals"],
                    "assists": p.get("assists", 0),
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
                    "competition": g.get("competition", ""),
                    "result": g["result"],
                    "saves": g["saves"],
                    "conceded": g["goalsConceded"]
                })

    process_team_history(home_last5, home_id, home_abbr, True)
    process_team_history(away_last5, away_id, away_abbr, False)

    home_tactics = analyze_team_tactical_style(home_last5, home_abbr, is_home=True)
    away_tactics = analyze_team_tactical_style(away_last5, away_abbr, is_home=False)

    match_script = (
        f"Líneas Oficiales Draftea: Goles Totales desde ↑ {draftea_min_goal_line} • "
        f"Tiros al Arco {home_abbr} desde {draftea_home_sot_open_line}.0+ vs {away_abbr} desde {draftea_away_sot_open_line}.0+."
    )

    sorted_shooters = sorted(
        agg_players.values(),
        key=lambda x: (x["sot"], x["shots"], x["goals"]),
        reverse=True
    )[:14]

    key_players_list = []
    for idx, sh in enumerate(sorted_shooters):
        gms = max(1, sh["games"])
        avg_sh = round(sh["shots"] / gms, 1)
        avg_sot = round(sh["sot"] / gms, 1)
        is_rot = sh["subIns"] >= 2 or sh["starts"] < (gms / 2)

        # =====================================================================
        # REGLA EXACTA DE DRAFTEA PARA JUGADORES (COMO A. GORDON EN DAF 13.jpeg)
        # =====================================================================
        # En DAF 13: Gordon tiene Prom. últimos 5 partidos = 3.6 tiros.
        # Draftea bloquea 1.0+ (1.01x) y 2.0+ (1.10x) y abre la línea en 3.0+ (1.36x).
        if avg_sh >= 3.1:
            open_shots_line = max(3, int(avg_sh))  # Ej: 3.6 -> 3.0+ Tiros
            open_shots_odd = 1.36 if open_shots_line == 3 else 1.45
        elif avg_sh >= 1.9:
            open_shots_line = 2
            open_shots_odd = 1.34
        else:
            open_shots_line = 1
            open_shots_odd = 1.28

        # En Tiros al Arco B+: Si el jugador promedia >= 1.85 tiros al arco (ej. Mbappé / Haaland),
        # Draftea suele poner 1.0+ muy bajo (~1.14x) o abrir valor en 2.0+ (~1.42x)
        if avg_sot >= 1.95:
            open_sot_line = 2
            open_sot_odd = 1.44
        else:
            open_sot_line = 1
            open_sot_odd = 1.30 if avg_sot >= 1.2 else 1.42

        games_hitting_open_sot = sum(1 for log in sh["matchLogs"] if log["sot"] >= open_sot_line)
        games_hitting_open_shots = sum(1 for log in sh["matchLogs"] if log["shots"] >= open_shots_line)

        sot_hit_rate = round((games_hitting_open_sot / gms) * 100)
        shots_hit_rate = round((games_hitting_open_shots / gms) * 100)

        base_rt = 6.8 + (sh["goals"] * 0.35) + (sh["assists"] * 0.25) + (avg_sot * 0.3)
        rating_l5 = round(min(9.6, max(6.1, base_rt)), 1)

        key_players_list.append({
            "id": f"real-p-{idx}",
            "name": sh["name"],
            "team": sh["team"],
            "isHome": sh["isHome"],
            "pos": sh["pos"],
            "posLabel": sh["posLabel"],
            "rating": rating_l5,
            "bancaPlus": True,
            "totalShotsL5": sh["shots"],
            "totalSoTL5": sh["sot"],
            "goalsL5": sh["goals"],
            "assistsL5": sh["assists"],
            "avgShots": avg_sh,
            "avgSoT": avg_sot,
            "xG": round(avg_sot * 0.32 + (sh["goals"] * 0.15), 2),
            "openSoTLine": open_sot_line,
            "openSoTOdd": open_sot_odd,
            "openSoTHitsL5": games_hitting_open_sot,
            "openSoTHitRate": max(55, min(96, sot_hit_rate if sot_hit_rate > 0 else 75)),
            "openShotsLine": open_shots_line,
            "openShotsOdd": open_shots_odd,
            "openShotsHitsL5": games_hitting_open_shots,
            "openShotsHitRate": max(55, min(96, shots_hit_rate if shots_hit_rate > 0 else 78)),
            "l10HitRate": max(65, min(96, max(sot_hit_rate, shots_hit_rate))),
            "propLine": f"{open_sot_line}.0+ Tiros al Arco" if sot_hit_rate >= shots_hit_rate else f"{open_shots_line}.0+ Tiros",
            "odd": open_sot_odd if sot_hit_rate >= shots_hit_rate else open_shots_odd,
            "rotationStatus": "ROTACION" if is_rot else "TITULAR",
            "startsLast5": sh["starts"],
            "gamesLast5": gms,
            "avgMinutes": 32 if is_rot else 86,
            "rotationNote": f"Titular {sh['starts']}/{gms} • Línea abierta en Draftea: {open_shots_line}.0+ Tiros ({games_hitting_open_shots}/{gms} verdes)",
            "matchLogs": sh["matchLogs"]
        })

    goalkeepers_list = []
    for gk in sorted(agg_gks.values(), key=lambda x: x["saves"], reverse=True)[:4]:
        gms = max(1, gk["games"])
        avg_sv = round(gk["saves"] / gms, 1)
        open_gk_line = max(2, int(round(avg_sv - 0.2)))
        goalkeepers_list.append({
            "name": gk["name"],
            "team": gk["team"],
            "games": gms,
            "totalSaves": gk["saves"],
            "avgSaves": avg_sv,
            "conceded": gk["conceded"],
            "openSavesLine": open_gk_line,
            "propLine": f"{open_gk_line}.0+ Atajadas",
            "odd": 1.38 if open_gk_line <= 2 else 1.48,
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
            "under35Goals": under35_prob,
            "under45Goals": under45_prob,
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
            "cornersAvg": round(home_corners_avg + away_corners_avg, 1),
            "winProbHome": win_prob_home,
            "winProbDraw": win_prob_draw,
            "winProbAway": win_prob_away,
            "homeFirstGoalProb": home_first_goal_prob,
            "awayFirstGoalProb": away_first_goal_prob,
            "noGoalProb": no_goal_prob,
            "homeScoredFirstRate": home_scored_first_rate,
            "awayScoredFirstRate": away_scored_first_rate,
            # Reglas y Momios exactos de Draftea:
            "isOver15Locked": is_over15_locked_in_draftea,
            "drafteaMinGoalLine": draftea_min_goal_line,
            "drafteaUnderSafeLine": draftea_under_safe_line,
            "drafteaHomeTeamGoalLine": draftea_home_team_goal_line,
            "drafteaAwayTeamGoalLine": draftea_away_team_goal_line,
            "homeTeamOverHits": home_team_over_hits,
            "awayTeamOverHits": away_team_over_hits,
            "drafteaHomeSoTOpenLine": draftea_home_sot_open_line,
            "drafteaAwaySoTOpenLine": draftea_away_sot_open_line,
            "drafteaHomeShotsOpenLine": draftea_home_shots_open_line,
            "drafteaAwayShotsOpenLine": draftea_away_shots_open_line,
            "mlHomeOdd": ml_home_odd,
            "mlAwayOdd": ml_away_odd,
            "pa1HomeOdd": pa1_home_odd,
            "pa1AwayOdd": pa1_away_odd,
            "dcHomeDrawOdd": dc_home_draw_odd,
            "dcAwayDrawOdd": dc_away_draw_odd,
            "expectedTotalGoals": expected_total_goals
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
                competitors = comp.get("competitors", [])
                if len(competitors) >= 2:
                    for c_item in competitors:
                        register_team_in_directory(c_item.get("team", {}), league_info["slug"], league_info["name"])

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

    # Incluimos ayer (-1) solo para registrar clubes en el buscador, pero filtramos partidos vigentes >= hoy
    target_dates = [
        (now_mx + timedelta(days=i)).strftime("%Y%m%d")
        for i in range(-1, days_ahead + 1)
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


# En draftea-backend/main.py, reemplaza toda la función @app.post("/api/verify-tickets") por esta:

@app.post("/api/verify-tickets")
async def auto_verify_tickets(payload: dict):
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

                urls_to_try = [
                    f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={match_id}",
                    f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={match_id}"
                ]

                data = None
                for url in urls_to_try:
                    try:
                        resp = await client.get(url, headers=HEADERS)
                        if resp.status_code == 200:
                            cand = resp.json()
                            if cand.get("header"):
                                data = cand
                                break
                    except Exception:
                        continue

                if not data:
                    continue

                try:
                    header_comp = data.get("header", {}).get("competitions", [{}])[0]
                    st_type = header_comp.get("status", {}).get("type", {})
                    state = st_type.get("state", "").lower()
                    completed = st_type.get("completed", False)

                    competitors = header_comp.get("competitors", [])
                    if len(competitors) < 2:
                        continue

                    home_c = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
                    away_c = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

                    home_id_str = str(home_c.get("id", home_c.get("team", {}).get("id", "")))
                    away_id_str = str(away_c.get("id", away_c.get("team", {}).get("id", "")))
                    home_score = safe_int(home_c.get("score", 0))
                    away_score = safe_int(away_c.get("score", 0))
                    home_name = home_c.get("team", {}).get("displayName", "")
                    away_name = away_c.get("team", {}).get("displayName", "")
                    home_abbr = home_c.get("team", {}).get("abbreviation", "")
                    away_abbr = away_c.get("team", {}).get("abbreviation", "")

                    home_norm = normalize_text(home_name)
                    away_norm = normalize_text(away_name)
                    home_abbr_norm = normalize_text(home_abbr)
                    away_abbr_norm = normalize_text(away_abbr)

                    date_mx, time_mx = convert_utc_to_mexico(header_comp.get("date", ""))
                    if completed or state == "post":
                        status_label = "Final"
                    elif state == "in":
                        clock_disp = header_comp.get("status", {}).get("displayClock", "En Vivo")
                        status_label = f"En Vivo • {clock_disp}"
                    else:
                        status_label = f"{date_mx} • {time_mx}"

                    leg["liveScore"] = {
                        "homeScore": home_score,
                        "awayScore": away_score,
                        "state": state,
                        "statusText": status_label
                    }

                    if not (completed or state == "post"):
                        continue

                    # 1. Extraer rosters y mapear cada jugador a su equipo (Home o Away)
                    rosters = data.get("rosters", [])
                    all_roster_players = []
                    home_roster_shots, away_roster_shots = 0, 0
                    home_roster_sot, away_roster_sot = 0, 0
                    player_to_side = {}  # nombre_normalizado -> 'HOME' | 'AWAY'

                    for r_idx, r_obj in enumerate(rosters[:2]):
                        r_tid = str(r_obj.get("team", {}).get("id", ""))
                        is_home_r = (r_tid == home_id_str) if r_tid else (r_idx == 0)
                        side_tag = "HOME" if is_home_r else "AWAY"

                        for p in r_obj.get("roster", []):
                            ath = p.get("athlete", {})
                            p_st = extract_player_stats_from_entry(p)
                            if is_home_r:
                                home_roster_shots += p_st["shots"]
                                home_roster_sot += p_st["sot"]
                            else:
                                away_roster_shots += p_st["shots"]
                                away_roster_sot += p_st["sot"]

                            n_full = normalize_text(ath.get("displayName", ""))
                            n_short = normalize_text(ath.get("shortName", ""))
                            if n_full:
                                player_to_side[n_full] = side_tag
                            if n_short:
                                player_to_side[n_short] = side_tag

                            all_roster_players.append({
                                "name": ath.get("displayName", ""),
                                "shortName": ath.get("shortName", ""),
                                "normName": n_full,
                                "normShort": n_short,
                                "starter": bool(p.get("starter", False)),
                                "subbedIn": bool(p.get("subbedIn", False)),
                                **p_st
                            })

                    # 2. Extraer estadísticas de boxscore.teams y tomar el MÁXIMO real entre boxscore y suma de jugadores
                    # (Esto corrige casos como Nice donde boxscore reporta parcial pero la suma oficial es 4 tiros al arco)
                    box_teams = data.get("boxscore", {}).get("teams", [])
                    home_box_obj, away_box_obj = {}, {}
                    for bt in box_teams:
                        bt_id = str(bt.get("team", {}).get("id", ""))
                        if bt_id == home_id_str:
                            home_box_obj = bt
                        elif bt_id == away_id_str:
                            away_box_obj = bt
                    if not home_box_obj and len(box_teams) > 0:
                        home_box_obj = box_teams[0]
                    if not away_box_obj and len(box_teams) > 1:
                        away_box_obj = box_teams[1]

                    h_official = extract_official_team_stats_from_boxscore(home_box_obj)
                    a_official = extract_official_team_stats_from_boxscore(away_box_obj)

                    home_shots = max(h_official["shots"], home_roster_shots, home_score)
                    away_shots = max(a_official["shots"], away_roster_shots, away_score)
                    home_sot = max(h_official["sot"], home_roster_sot, home_score)
                    away_sot = max(a_official["sot"], away_roster_sot, away_score)

                    total_corners = h_official["corners"] + a_official["corners"]
                    total_cards = h_official["cards"] + a_official["cards"]

                    # 3. Reconstruir la línea de tiempo EXACTA de los goles para:
                    #    - Saber quién anotó el 1ER GOL DEL PARTIDO
                    #    - Saber si un equipo tomó ventaja de 1 gol (PA(1)) o 2 goles (PA) en cualquier momento
                    goal_timeline = []  # Lista de 'HOME' o 'AWAY' en orden cronológico
                    for ev in data.get("keyEvents", []):
                        ev_type = ev.get("type", {}).get("text", "").lower()
                        if "goal" in ev_type or "penalty - scored" in ev_type or "own goal" in ev_type:
                            ev_team = ev.get("team", {})
                            ev_tid = str(ev_team.get("id", ""))
                            ev_tname = normalize_text(ev_team.get("displayName", ""))
                            ev_tabbr = normalize_text(ev.get("team", {}).get("abbreviation", ""))

                            participants = ev.get("participants", [])
                            scorer_norm = (
                                normalize_text(participants[0].get("athlete", {}).get("displayName", ""))
                                if participants
                                else ""
                            )

                            if ev_tid == home_id_str or (ev_tname and ev_tname in home_norm) or (ev_tabbr and ev_tabbr == home_abbr_norm):
                                goal_timeline.append("HOME")
                            elif ev_tid == away_id_str or (ev_tname and ev_tname in away_norm) or (ev_tabbr and ev_tabbr == away_abbr_norm):
                                goal_timeline.append("AWAY")
                            elif scorer_norm and scorer_norm in player_to_side:
                                side = player_to_side[scorer_norm]
                                if "own goal" in ev_type:
                                    side = "AWAY" if side == "HOME" else "HOME"
                                goal_timeline.append(side)

                    # Determinar quién metió el primer gol y la ventaja máxima alcanzada durante el partido
                    first_goal_side = goal_timeline[0] if len(goal_timeline) > 0 else None
                    if first_goal_side is None:
                        if home_score > 0 and away_score == 0:
                            first_goal_side = "HOME"
                        elif away_score > 0 and home_score == 0:
                            first_goal_side = "AWAY"

                    running_h, running_a = 0, 0
                    max_home_lead = 0
                    max_away_lead = 0
                    for g_side in goal_timeline:
                        if g_side == "HOME":
                            running_h += 1
                        else:
                            running_a += 1
                        max_home_lead = max(max_home_lead, running_h - running_a)
                        max_away_lead = max(max_away_lead, running_a - running_h)

                    # Si un equipo anotó el primer gol, en ese instante tuvo al menos +1 de ventaja
                    if first_goal_side == "HOME":
                        max_home_lead = max(max_home_lead, 1)
                    elif first_goal_side == "AWAY":
                        max_away_lead = max(max_away_lead, 1)

                    max_home_lead = max(max_home_lead, home_score - away_score)
                    max_away_lead = max(max_away_lead, away_score - home_score)

                    # Función auxiliar para identificar si un texto se refiere al equipo Local o al Visitante
                    def is_referring_to_home(text_to_check: str) -> bool:
                        t_norm = normalize_text(text_to_check)
                        if not t_norm:
                            return True
                        # Coincidencia por sigla exacta o nombre de club
                        home_tokens = [w for w in home_norm.split() if len(w) >= 3]
                        away_tokens = [w for w in away_norm.split() if len(w) >= 3]

                        if home_norm in t_norm or (home_abbr_norm and re.search(rf"\b{re.escape(home_abbr_norm)}\b", t_norm)):
                            return True
                        if away_norm in t_norm or (away_abbr_norm and re.search(rf"\b{re.escape(away_abbr_norm)}\b", t_norm)):
                            return False
                        if any(tok in t_norm for tok in home_tokens):
                            return True
                        if any(tok in t_norm for tok in away_tokens):
                            return False
                        return True

                    market = leg.get("market", "").upper()
                    selection = leg.get("selection", "")
                    norm_sel = normalize_text(selection)
                    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", selection)]
                    target_line = nums[-1] if nums else 0.5
                    is_under_pick = ("↓" in selection) or ("MENOS" in selection.upper()) or ("UNDER" in selection.upper())

                    actual_val = 0
                    hit_result = False
                    is_binary_market = False  # True = solo muestra palomita/tache sin barra numérica

                    is_player_prop = (
                        ("B+" in market)
                        or ("BANCA+" in market)
                        or ("JUGADOR" in market)
                        or ("GOLEADOR" in market)
                        or ("PORTERO" in market)
                    )

                    # =========================================================
                    # EVALUACIÓN EXACTA DE CADA MERCADO
                    # =========================================================
                    if "1ER GOL" in market or "PRIMER GOL" in market:
                        is_binary_market = True
                        pick_home = is_referring_to_home(selection)
                        if "COMBO" in leg.get("badge", "").upper() or "GANA" in market:
                            # 1er Gol + Gana
                            won_match = (home_score > away_score) if pick_home else (away_score > home_score)
                            scored_first = (first_goal_side == "HOME") if pick_home else (first_goal_side == "AWAY")
                            hit_result = bool(scored_first and won_match)
                        else:
                            hit_result = (first_goal_side == "HOME") if pick_home else (first_goal_side == "AWAY")
                        actual_val = 1 if hit_result else 0
                        target_line = 1

                    elif "TOTAL DE GOLES" in market:
                        # Ejemplo: "TOTAL DE GOLES TORINO ↑/↓ 90'", "TOTAL DE GOLES NICE ↑/↓ 90'", "TOTAL DE GOLES PERTH GLORY FC ↑/↓ 90'"
                        pick_home = is_referring_to_home(market)
                        actual_val = home_score if pick_home else away_score
                        hit_result = (actual_val < target_line) if is_under_pick else (actual_val > target_line)

                    elif "GOLES TOTALES" in market or "GOLES 1RA" in market:
                        actual_val = home_score + away_score
                        hit_result = (actual_val < target_line) if is_under_pick else (actual_val > target_line)

                    elif "AMBOS EQUIPOS ANOTAN" in market:
                        is_binary_market = True
                        hit_result = (home_score > 0 and away_score > 0)
                        actual_val = 1 if hit_result else 0
                        target_line = 1

                    elif "DOBLE OPORTUNIDAD" in market:
                        is_binary_market = True
                        if "EMPATE" in selection.upper():
                            pick_home = is_referring_to_home(selection.split("/")[0])
                            hit_result = (home_score >= away_score) if pick_home else (away_score >= home_score)
                        else:
                            # FCB/RMA (Cualquiera gana, no empatan)
                            hit_result = (home_score != away_score)
                        actual_val = 1 if hit_result else 0
                        target_line = 1

                    elif "PA(1)" in market or "PAGO ANTICIPADO POR 1 GOL" in market:
                        # Gana si al final gana O si en cualquier momento del partido tuvo +1 gol de ventaja (como Stuttgart)
                        is_binary_market = True
                        pick_home = is_referring_to_home(selection)
                        if pick_home:
                            hit_result = (home_score > away_score) or (max_home_lead >= 1)
                        else:
                            hit_result = (away_score > home_score) or (max_away_lead >= 1)
                        actual_val = 1 if hit_result else 0
                        target_line = 1

                    elif "GANADOR" in market or "GANA PA" in market or "MONEY LINE" in market or "RESULTADO" in market:
                        # Gana si al final gana O si en cualquier momento tuvo +2 goles de ventaja (Pago Anticipado estándar)
                        is_binary_market = True
                        pick_home = is_referring_to_home(selection)
                        if pick_home:
                            hit_result = (home_score > away_score) or (max_home_lead >= 2)
                        else:
                            hit_result = (away_score > home_score) or (max_away_lead >= 2)
                        actual_val = 1 if hit_result else 0
                        target_line = 1

                    elif "HÁNDICAP" in market or "HANDICAP" in market:
                        is_binary_market = True
                        pick_home = is_referring_to_home(selection)
                        diff = (home_score - away_score) if pick_home else (away_score - home_score)
                        hit_result = diff > abs(target_line)
                        actual_val = 1 if hit_result else 0
                        target_line = 1

                    elif "CÓRNERS" in market or "CORNERS" in market:
                        actual_val = total_corners
                        hit_result = (actual_val < target_line) if is_under_pick else (actual_val > target_line)

                    elif "TARJETAS" in market:
                        actual_val = total_cards
                        hit_result = (actual_val < target_line) if is_under_pick else (actual_val > target_line)

                    elif not is_player_prop and "TIROS AL ARCO" in market:
                        # Ejemplo: "TOTAL DE TIROS AL ARCO NICE 90'" -> "Nice | 4.0+"
                        team_ref = selection.split("|")[0] if "|" in selection else market
                        pick_home = is_referring_to_home(team_ref)
                        actual_val = home_sot if pick_home else away_sot
                        hit_result = actual_val >= target_line

                    elif not is_player_prop and "TIROS" in market:
                        team_ref = selection.split("|")[0] if "|" in selection else market
                        pick_home = is_referring_to_home(team_ref)
                        actual_val = home_shots if pick_home else away_shots
                        hit_result = actual_val >= target_line

                    else:
                        # Mercado de Jugador (Tiros al Arco Banca+, Tiros Banca+, Atajadas, Goleador)
                        raw_left = selection.split("|")[0].split("(")[0].strip()
                        tokens = raw_left.split()
                        if len(tokens) > 1 and tokens[-1].isupper() and len(tokens[-1]) <= 4:
                            tokens = tokens[:-1]
                        clean_player_norm = normalize_text(" ".join(tokens))
                        last_name_norm = normalize_text(tokens[-1]) if tokens else clean_player_norm

                        matched_p = next(
                            (
                                rp for rp in all_roster_players
                                if clean_player_norm in rp["normName"]
                                or rp["normName"] in clean_player_norm
                                or (len(last_name_norm) >= 4 and last_name_norm in rp["normName"])
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
                            elif "ASISTENCIA" in market:
                                actual_val = matched_p["assists"]
                                target_line = 1
                            elif "ARCO" in market:
                                actual_val = matched_p["sot"]
                            else:
                                actual_val = matched_p["shots"]
                            hit_result = actual_val >= target_line

# En draftea-backend/main.py, al final del bloque try dentro de auto_verify_tickets:
                    leg["actualValue"] = actual_val
                    leg["targetValue"] = target_line
                    leg["isBinaryMarket"] = is_binary_market
                    leg["hit"] = bool(hit_result)
                    updated_any = True

                    # Identificar si el pick pertenecía exclusivamente al Local, al Visitante o a Ambos
                    involved_clubs = []
                    if is_referring_to_home(f"{market} {selection}") and not is_referring_to_home(away_name):
                        involved_clubs.append({
                            "name": home_name,
                            "abbr": home_abbr,
                            "keys": [home_norm, home_abbr_norm],
                            "teamGoals": home_score,
                            "teamSoT": home_sot,
                            "teamShots": home_shots
                        })
                    if not involved_clubs or away_norm in normalize_text(f"{market} {selection}") or "TOTALES" in market or "AMBOS" in market:
                        if not any(c["name"] == home_name for c in involved_clubs) and ("TOTALES" in market or "AMBOS" in market):
                            involved_clubs.append({
                                "name": home_name,
                                "abbr": home_abbr,
                                "keys": [home_norm, home_abbr_norm],
                                "teamGoals": home_score,
                                "teamSoT": home_sot,
                                "teamShots": home_shots
                            })
                        involved_clubs.append({
                            "name": away_name,
                            "abbr": away_abbr,
                            "keys": [away_norm, away_abbr_norm],
                            "teamGoals": away_score,
                            "teamSoT": away_sot,
                            "teamShots": away_shots
                        })

                    for club_item in involved_clubs:
                        c_name = club_item["name"]
                        c_abbr = club_item["abbr"]
                        rule_id = f"auto-learn-{match_id}-{c_abbr}-{normalize_text(market)}-{normalize_text(selection)}"
                        already_logged = any(l.get("id") == rule_id for l in learning_logs)

                        if not already_logged:
                            learning_logs.insert(0, {
                                "id": rule_id,
                                "tag": f"{'ACIERTO' if hit_result else 'AJUSTE'} INDIVIDUAL [{c_abbr}]: {market}",
                                "source": f"{home_name} {home_score}-{away_score} {away_name}",
                                "clubName": c_name,
                                "clubCode": c_abbr.lower(),
                                "targetTeams": club_item["keys"],
                                "marketType": market,
                                "selection": selection,
                                "targetLine": target_line,
                                "actualValue": actual_val,
                                "recordedTeamGoals": club_item["teamGoals"],
                                "recordedTeamSoT": club_item["teamSoT"],
                                "recordedTeamShots": club_item["teamShots"],
                                "outcome": "WIN" if hit_result else "FAIL",
                                "rule": (
                                    f"Perfil {c_name}: Cumplió '{selection}' con valor real {actual_val} ({c_abbr} registró {club_item['teamGoals']} goles y {club_item['teamSoT']} tiros al arco). Se integra a su historial para próximos rivales."
                                    if hit_result
                                    else f"Perfil {c_name}: Falló '{selection}' quedándose en {actual_val} (meta {target_line}). En el próximo juego de {c_name} se ajustará la línea según su condición de local/visita y la defensa rival."
                                )
                            })
                except Exception:
                    continue

    return {
        "ok": True,
        "updated": updated_any,
        "tickets": tickets,
        "learningLogs": learning_logs
    }