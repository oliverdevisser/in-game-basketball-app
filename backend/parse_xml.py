# backend/parse_xml.py
import os
from lxml import etree
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

DATA_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'pbp_snap_shot')

def list_snapshots():
    logger.debug(f"Looking for snapshots in: {DATA_ROOT}")
    try:
        snapshots = [d for d in os.listdir(DATA_ROOT) if os.path.isdir(os.path.join(DATA_ROOT, d))]
        logger.debug(f"Found snapshots: {snapshots}")
        # Convert underscores to spaces and title-case for display
        return sorted([snapshot.replace('_', ' ').title() for snapshot in snapshots])
    except Exception as e:
        logger.error(f"Error listing snapshots: {e}")
        return []

def list_games(snapshot):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    snapshot_dir = os.path.join(DATA_ROOT, snapshot_dir_name)
    if not os.path.exists(snapshot_dir):
        return []
    # find all *game_info.xml to get game_ids
    game_ids = []
    for f in os.listdir(snapshot_dir):
        if f.endswith("_game_info.xml"):
            game_id = f.split("_")[0]
            game_ids.append(game_id)
    return sorted(game_ids)

def parse_game_info(snapshot, game_id):
    filename = f"{game_id}_game_info.xml"
    file_path = os.path.join(DATA_ROOT, snapshot, filename)
    if not os.path.isfile(file_path):
        return None

    tree = etree.parse(file_path)
    root = tree.getroot()

    game_info = {}
    home_team = root.find(".//Home_team")
    visitor_team = root.find(".//Visitor_team")

    if home_team is not None:
        game_info['home_city'] = home_team.get('Team_city', '')
        game_info['home_name'] = home_team.get('Team_name', '')
        game_info['home_abr'] = home_team.get('Team_abr', '')
        game_info['home_id'] = home_team.get('Team_id', '')

    if visitor_team is not None:
        game_info['visitor_city'] = visitor_team.get('Team_city', '')
        game_info['visitor_name'] = visitor_team.get('Team_name', '')
        game_info['visitor_abr'] = visitor_team.get('Team_abr', '')
        game_info['visitor_id'] = visitor_team.get('Team_id', '')

    return game_info

def parse_boxscore(snapshot, game_id):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    filename = f"{game_id}_boxscore.xml"
    file_path = os.path.join(DATA_ROOT, snapshot_dir_name, filename)
    if not os.path.isfile(file_path):
        return None

    tree = etree.parse(file_path)
    root = tree.getroot()

    # Get game info
    game_info = parse_game_info(snapshot_dir_name, game_id)

    player_stats = []
    team_map = {}

    for player in root.xpath(".//Player_stats"):
        team_city = player.get('Team_city', '')
        team_name = player.get('Team_name', '')
        full_team_name = f"{team_city} {team_name}".strip()

        fg_attempted = int(player.get("FG_attempted", "0"))
        fg_made = int(player.get("FG_made", "0"))
        fg_pct = (fg_made / fg_attempted) if fg_attempted > 0 else 0.0
        fouls = int(player.get("Fouls", "0"))

        player_entry = {
            "person_id": player.get("Person_id"),
            "first_name": player.get('First_name', ''),
            "last_name": player.get('Last_name', ''),
            "team_name": full_team_name,
            "points": int(player.get("Points", "0")),
            "rebounds": int(player.get("Total_rebounds", "0")),
            "assists": int(player.get("Assists", "0")),
            "fg_made": fg_made,
            "fg_attempted": fg_attempted,
            "fg_pct": fg_pct,
            "fouls": fouls,
            "starter": player.get("starter") == "1"
        }

        player_stats.append(player_entry)
        if full_team_name not in team_map:
            team_map[full_team_name] = {"players": []}
        team_map[full_team_name]["players"].append(player_entry)

    team_stats = []
    for team in root.xpath(".//Team_stats"):
        team_city = team.get('Team_city', '')
        tname = team.get('Team_name', '')
        full_team_name = f"{team_city} {tname}".strip()

        fg_made = int(team.get("FG_made", "0"))
        fg_attempted = int(team.get("FG_attempted", "0"))
        fg_pct = fg_made / fg_attempted if fg_attempted > 0 else 0.0

        three_made = int(team.get("Three_made", "0"))
        three_att = int(team.get("Three_attempted", "0"))
        three_pct = three_made / three_att if three_att > 0 else 0.0

        ft_made = int(team.get("FT_made", "0"))
        ft_att = int(team.get("FT_attempted", "0"))
        ft_pct = ft_made / ft_att if ft_att > 0 else 0.0

        stats = {
            "team_name": full_team_name,
            "points": int(team.get("Points", "0")),
            "rebounds": int(team.get("Total_rebounds", "0")),
            "assists": int(team.get("Assists", "0")),
            "fg_pct": fg_pct,
            "three_pct": three_pct,
            "ft_pct": ft_pct,
            "turnovers": int(team.get("TotalTurnovers", "0")),
            "points_in_paint": int(team.get("PointsInThePaint", "0")),
            "fast_break_points": int(team.get("FastBreakPoints", "0")),
            "full_timeouts": int(team.get("FullTimeoutsRemaining", "0")),
            "short_timeouts": int(team.get("ShortTimeoutsRemaining", "0")),
            "team_fouls": int(team.get("Team_Fouls", "0")),
            "technical_fouls": int(team.get("TechnicalFouls", "0")),
            "flagrant_fouls": int(team.get("FlagrantFouls", "0")),
        }

        team_stats.append(stats)
        if full_team_name in team_map:
            team_map[full_team_name].update(stats)
        else:
            team_map[full_team_name] = stats

    teams = list(team_map.values())

    return {
        "game_id": game_id,
        "snapshot": snapshot,
        "game_info": game_info,
        "players": player_stats,
        "teams": teams,
    }

def parse_lineups(snapshot, game_id):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    filename = f"{game_id}_roster_lineup.xml"
    file_path = os.path.join(DATA_ROOT, snapshot_dir_name, filename)
    if not os.path.isfile(file_path):
        return {"lineups": {}}

    tree = etree.parse(file_path)
    root = tree.getroot()

    # Map person_id -> player info
    person_map = {}
    for person in root.xpath(".//Msg_person_info"):
        pid = person.get("Person_id")
        first_name = person.get("First_name", "")
        last_name = person.get("Last_name", "")
        jersey = person.get("Jersey_number", "")
        person_map[pid] = {
            "person_id": pid,
            "first_name": first_name,
            "last_name": last_name,
            "jersey_number": jersey
        }

    # Get the last Msg_game_lineup
    lineups = root.xpath(".//Msg_game_lineup")
    if not lineups:
        return {"lineups": {}}

    current_lineup = lineups[-1]

    home_ids = [
        current_lineup.get("Home_forward_1_id"),
        current_lineup.get("Home_forward_2_id"),
        current_lineup.get("Home_center_id"),
        current_lineup.get("Home_guard_1_id"),
        current_lineup.get("Home_guard_2_id")
    ]
    visitor_ids = [
        current_lineup.get("Visitor_forward_1_id"),
        current_lineup.get("Visitor_forward_2_id"),
        current_lineup.get("Visitor_center_id"),
        current_lineup.get("Visitor_guard_1_id"),
        current_lineup.get("Visitor_guard_2_id")
    ]

    currentLineupTeamA = [person_map[pid] for pid in home_ids if pid in person_map]
    currentLineupTeamB = [person_map[pid] for pid in visitor_ids if pid in person_map]

    # Placeholder values for stint data
    stint_duration = 120  # seconds placeholder
    stint_plusminus = +5  # placeholder

    return {
        "currentLineupTeamA": currentLineupTeamA,
        "currentLineupTeamB": currentLineupTeamB,
        "stint_duration": stint_duration,
        "stint_plusminus": stint_plusminus
    }

def parse_pbp(snapshot, game_id):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    # Determine home/visitor teams
    ginfo = parse_game_info(snapshot_dir_name, game_id)
    if not ginfo:
        return {}

    home_team_id = ginfo.get('home_id')
    visitor_team_id = ginfo.get('visitor_id')

    quarters = ['Q1','Q2','Q3','Q4','Q5']
    events = []
    for q in quarters:
        filename = f"{game_id}_pbp_{q}.xml"
        file_path = os.path.join(DATA_ROOT, snapshot_dir_name, filename)
        if os.path.isfile(file_path):
            tree = etree.parse(file_path)
            root = tree.getroot()
            for evt in root.xpath(".//Event_pbp"):
                events.append(evt)

    # Longest run calculation
    last_home_score, last_visitor_score = 0,0
    current_run_team = None
    current_run_points = 0
    longest_run_points = 0
    longest_run_team = None

    # Zone stats
    zone_stats = {
        "home_paint_att":0,"home_paint_made":0,
        "home_mid_att":0,"home_mid_made":0,
        "home_three_att":0,"home_three_made":0,
        "visitor_paint_att":0,"visitor_paint_made":0,
        "visitor_mid_att":0,"visitor_mid_made":0,
        "visitor_three_att":0,"visitor_three_made":0
    }

    def classify_zone(x,y):
        if abs(x)<100 and abs(y)<100:
            return "paint"
        elif abs(x)<200 and abs(y)<200:
            return "mid"
        else:
            return "three"

    for evt in events:
        home_score = int(evt.get("Home_score","0"))
        visitor_score = int(evt.get("Visitor_score","0"))

        # Check if scoring occurred
        if home_score != last_home_score or visitor_score != last_visitor_score:
            diff_home = home_score - last_home_score
            diff_visitor = visitor_score - last_visitor_score
            # Determine which team scored
            scoring_team = None
            scoring_points = 0
            if diff_home > 0:
                scoring_team = "home"
                scoring_points = diff_home
            elif diff_visitor > 0:
                scoring_team = "visitor"
                scoring_points = diff_visitor

            if scoring_team:
                if scoring_team != current_run_team:
                    current_run_team = scoring_team
                    current_run_points = scoring_points
                else:
                    current_run_points += scoring_points
                if current_run_points > longest_run_points:
                    longest_run_points = current_run_points
                    longest_run_team = current_run_team

        last_home_score, last_visitor_score = home_score, visitor_score

        # Shot attempts: msg_type=1 (made), msg_type=2 (miss)
        msg_type = evt.get("Msg_type")
        if msg_type in ["1","2"]:
            # Attempt
            locX = int(evt.get("LocationX","0"))
            locY = int(evt.get("LocationY","0"))
            zone = classify_zone(locX, locY)
            off_team_id = evt.get("Offensive_Team_id","")

            if off_team_id == home_team_id:
                shooter = "home"
            elif off_team_id == visitor_team_id:
                shooter = "visitor"
            else:
                # Unknown team or no offensive team, skip
                continue

            att_key = f"{shooter}_{zone}_att"
            made_key = f"{shooter}_{zone}_made"
            zone_stats[att_key] += 1
            if msg_type == "1": # made shot
                zone_stats[made_key] += 1

    def pct(made,att):
        return round((made/att)*100,1) if att>0 else 0.0

    home_paint_pct = pct(zone_stats["home_paint_made"], zone_stats["home_paint_att"])
    home_mid_pct = pct(zone_stats["home_mid_made"], zone_stats["home_mid_att"])
    home_three_pct = pct(zone_stats["home_three_made"], zone_stats["home_three_att"])

    visitor_paint_pct = pct(zone_stats["visitor_paint_made"], zone_stats["visitor_paint_att"])
    visitor_mid_pct = pct(zone_stats["visitor_mid_made"], zone_stats["visitor_mid_att"])
    visitor_three_pct = pct(zone_stats["visitor_three_made"], zone_stats["visitor_three_att"])

    pbp_data = {
        "longest_run_team": "Home" if longest_run_team == "home" else "Visitor",
        "longest_run_points": longest_run_points,
        "home_paint_pct": home_paint_pct,
        "home_mid_pct": home_mid_pct,
        "home_three_pct": home_three_pct,
        "visitor_paint_pct": visitor_paint_pct,
        "visitor_mid_pct": visitor_mid_pct,
        "visitor_three_pct": visitor_three_pct
    }

    return pbp_data
