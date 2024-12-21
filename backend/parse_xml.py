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
        return sorted([snapshot.replace('_', ' ').title() for snapshot in snapshots])
    except Exception as e:
        logger.error(f"Error listing snapshots: {e}")
        return []

def list_games(snapshot):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    snapshot_dir = os.path.join(DATA_ROOT, snapshot_dir_name)
    if not os.path.exists(snapshot_dir):
        return []
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

    # Get game info first
    game_info = parse_game_info(snapshot_dir_name, game_id)
    if not game_info:
        return None

    home_team_id = game_info.get('home_id')
    visitor_team_id = game_info.get('visitor_id')

    period_info = root.find(".//Period_time")
    current_period = int(period_info.get("Period", "1")) if period_info is not None else 1
    game_clock = period_info.get("Game_clock", "0:00") if period_info is not None else "0:00"

    quarter_fouls = {
        home_team_id: 0,
        visitor_team_id: 0
    }

    pbp_filename = f"{game_id}_pbp_Q{current_period}.xml"
    pbp_path = os.path.join(DATA_ROOT, snapshot_dir_name, pbp_filename)
    if os.path.exists(pbp_path):
        pbp_tree = etree.parse(pbp_path)
        pbp_root = pbp_tree.getroot()
        for event in pbp_root.xpath(".//Event_pbp"):
            if event.get("Msg_type") == "6":
                team_id = event.get("Team_id")
                if team_id in quarter_fouls:
                    quarter_fouls[team_id] += 1

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
            "jersey_number": player.get('Jersey_number', ''),
            "team_name": full_team_name,
            "points": int(player.get("Points", "0")),
            "total_rebounds": int(player.get("Total_rebounds", "0")),
            "assists": int(player.get("Assists", "0")),
            "fg_made": fg_made,
            "fg_attempted": fg_attempted,
            "fg_pct": fg_pct,
            "fouls": fouls,
            "starter": player.get("starter") == "1",
            # oncourt means currently on court at snapshot
            "oncourt": player.get("OnCrt") == "1",
            "minutes": int(player.get("Minutes", "0")),
            "seconds": int(player.get("Seconds", "0")),
            "plusminus": int(player.get("PlusMinus", "0"))
        }

        player_stats.append(player_entry)
        if full_team_name not in team_map:
            team_map[full_team_name] = {"players": []}
        team_map[full_team_name]["players"].append(player_entry)

    team_stats = []
    for team in root.xpath(".//Team_stats"):
        team_id = team.get('Team_id', '')
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
            "team_id": team_id,
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
            "current_quarter_fouls": quarter_fouls.get(team_id, 0),
            "bonus_status": "Bonus+" if quarter_fouls.get(team_id, 0) >= 5 else "Bonus" if quarter_fouls.get(team_id, 0) >= 4 else ""
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
        "current_period": current_period,
        "game_clock": game_clock,
        "players": player_stats,
        "teams": teams,
    }

def parse_lineups(snapshot, game_id):
    def clock_to_seconds(clock_str):
        try:
            if ':' in clock_str:
                m, s = clock_str.split(':')
                return int(m) * 60 + float(s)
            return float(clock_str)
        except:
            return 0

    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    filename = f"{game_id}_roster_lineup.xml"
    file_path = os.path.join(DATA_ROOT, snapshot_dir_name, filename)
    if not os.path.isfile(file_path):
        return {"lineups": {}}

    # Get current period and game clock from boxscore
    boxscore_data = parse_boxscore(snapshot, game_id)
    if not boxscore_data:
        return {"lineups": {}}

    current_period = boxscore_data.get("current_period", 1)
    current_game_clock = boxscore_data.get("game_clock", "0:00")
    current_time_seconds = clock_to_seconds(current_game_clock)

    # Initialize player stint times with None (to differentiate from substituted players)
    player_stint_times = {}
    
    # Get period start time (12:00 for regular quarters, 5:00 for OT)
    period_start_seconds = 720 if current_period <= 4 else 300

    # Process PBP to track all substitutions
    pbp_filename = f"{game_id}_pbp_Q{current_period}.xml"
    pbp_path = os.path.join(DATA_ROOT, snapshot_dir_name, pbp_filename)
    
    # Get initial lineup from roster_lineup.xml
    tree = etree.parse(file_path)
    root = tree.getroot()
    
    # Get all players info
    person_map = {}
    for person in root.xpath(".//Msg_person_info"):
        pid = person.get("Person_id")
        person_map[pid] = {
            "person_id": pid,
            "first_name": person.get("First_name", ""),
            "last_name": person.get("Last_name", ""),
            "jersey_number": person.get("Jersey_number", ""),
            "onCourtTime": 0  # Will be updated later
        }

    # Get initial lineup for the current period
    lineups = root.xpath(".//Msg_game_lineup")
    if lineups:
        current_lineup = lineups[-1]
        initial_players = [
            current_lineup.get("Home_guard_1_id"), current_lineup.get("Home_guard_2_id"),
            current_lineup.get("Home_forward_1_id"), current_lineup.get("Home_forward_2_id"),
            current_lineup.get("Home_center_id"),
            current_lineup.get("Visitor_guard_1_id"), current_lineup.get("Visitor_guard_2_id"),
            current_lineup.get("Visitor_forward_1_id"), current_lineup.get("Visitor_forward_2_id"),
            current_lineup.get("Visitor_center_id")
        ]
        # Initialize stint times for initial lineup players
        for pid in initial_players:
            if pid:
                player_stint_times[pid] = period_start_seconds
                person_map[pid]["onCourtTime"] = period_start_seconds - current_time_seconds

    # Initialize team player lists
    team_a_players = []
    team_b_players = []

    # Get current scores and team IDs from boxscore
    team_a_score = boxscore_data["teams"][0]["points"]
    team_b_score = boxscore_data["teams"][1]["points"]

    # Find team IDs from Team_stats in boxscore
    team_a_id = None
    team_b_id = None
    
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    boxscore_filename = f"{game_id}_boxscore.xml"
    boxscore_path = os.path.join(DATA_ROOT, snapshot_dir_name, boxscore_filename)
    
    if os.path.exists(boxscore_path):
        boxscore_tree = etree.parse(boxscore_path)
        boxscore_root = boxscore_tree.getroot()
        
        for team in boxscore_root.xpath(".//Team_stats"):
            team_id = team.get('Team_id')
            team_city = team.get('Team_city', '')
            team_name = team.get('Team_name', '')
            full_team_name = f"{team_city} {team_name}".strip()
            
            if full_team_name == boxscore_data["teams"][0]["team_name"]:
                team_a_id = team_id
            elif full_team_name == boxscore_data["teams"][1]["team_name"]:
                team_b_id = team_id

    print(f"Found team IDs - Team A: {team_a_id}, Team B: {team_b_id}")

    # Track scores and lineup times separately for each team
    team_data = {
        "teamA": {
            "last_sub_score": 0,
            "lineup_start_time": period_start_seconds,
            "team_id": team_a_id,
            "team_name": boxscore_data["teams"][0]["team_name"]
        },
        "teamB": {
            "last_sub_score": 0,
            "lineup_start_time": period_start_seconds,
            "team_id": team_b_id,
            "team_name": boxscore_data["teams"][1]["team_name"]
        }
    }
    print(f"Team data initialized: {team_data}")

    # Process substitutions from PBP to find when current lineup was formed
    if os.path.exists(pbp_path):
        pbp_tree = etree.parse(pbp_path)
        pbp_root = pbp_tree.getroot()
        
        for event in pbp_root.xpath(".//Event_pbp"):
            if event.get("Msg_type") == "8":  # Substitution
                game_clock = event.get("Game_clock", "0:00")
                event_time = clock_to_seconds(game_clock)
                home_score = int(event.get("Home_score", "0"))
                visitor_score = int(event.get("Visitor_score", "0"))
                
                # Player coming in (Person_id2)
                player_in_id = event.get("Person_id2")
                if player_in_id and player_in_id in person_map:
                    player_stint_times[player_in_id] = event_time
                    # Calculate and update their stint time
                    stint_time = event_time - current_time_seconds
                    person_map[player_in_id]["onCourtTime"] = stint_time
                    print(f"Player {player_in_id} ({person_map[player_in_id]['last_name']}) entered at {event_time}, stint time: {stint_time}")

                # Player going out (Person_id)
                player_out_id = event.get("Person_id")
                if player_out_id:
                    # Clear the stint time for the player going out
                    if player_out_id in player_stint_times:
                        del player_stint_times[player_out_id]
                        if player_out_id in person_map:
                            person_map[player_out_id]["onCourtTime"] = 0
                            print(f"Player {player_out_id} ({person_map[player_out_id]['last_name']}) exited at {event_time}")

                # Get the team making the substitution
                sub_team_id = event.get("Team_id")
                print(sub_team_id)
                
                # Update the appropriate team's data
                if sub_team_id == team_data["teamA"]["team_id"]:
                    team_data["teamA"]["lineup_start_time"] = event_time
                    team_data["teamA"]["last_sub_score"] = home_score
                    print(f"Team A lineup start time updated to {event_time}, last sub score: {home_score}")
                elif sub_team_id == team_data["teamB"]["team_id"]:
                    team_data["teamB"]["lineup_start_time"] = event_time
                    team_data["teamB"]["last_sub_score"] = visitor_score
                    print(f"Team B lineup start time updated to {event_time}, last sub score: {visitor_score}")

    # Calculate stint duration and plus/minus for current lineup
    stint_duration_a = team_data["teamA"]["lineup_start_time"] - current_time_seconds
    stint_duration_b = team_data["teamB"]["lineup_start_time"] - current_time_seconds

    # Calculate plus/minus for each team's current lineup
    team_a_plusminus = (team_a_score - team_data["teamA"]["last_sub_score"]) - (team_b_score - team_data["teamB"]["last_sub_score"])
    team_b_plusminus = (team_b_score - team_data["teamB"]["last_sub_score"]) - (team_a_score - team_data["teamA"]["last_sub_score"])

    print(f"Team A stint duration: {stint_duration_a}, plus/minus: {team_a_plusminus}")
    print(f"Team B stint duration: {stint_duration_b}, plus/minus: {team_b_plusminus}")

    # Populate team players lists
    for player in boxscore_data["players"]:
        if player["oncourt"]:
            pid = player["person_id"]
            if pid in person_map:
                player_data = person_map[pid]
                # Determine which team the player belongs to
                if player["team_name"] == boxscore_data["teams"][0]["team_name"]:
                    team_a_players.append(player_data)
                else:
                    team_b_players.append(player_data)

    # Debug logging
    print(f"\nCurrent game clock: {current_game_clock} ({current_time_seconds} seconds)")
    print("On-court players and their stint times:")
    for player in boxscore_data["players"]:
        if player["oncourt"]:
            print(f"Player {player['jersey_number']} ({player['last_name']}): {person_map[player['person_id']]['onCourtTime']} seconds")

    return {
        "currentLineupTeamA": team_a_players,
        "currentLineupTeamB": team_b_players,
        "teamA": {
            "stint_duration": stint_duration_a,
            "stint_plusminus": team_a_plusminus
        },
        "teamB": {
            "stint_duration": stint_duration_b,
            "stint_plusminus": team_b_plusminus
        }
    }

def parse_pbp(snapshot, game_id):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
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

    last_home_score, last_visitor_score = 0,0
    current_run_team = None
    current_run_points = 0
    longest_run_points = 0
    longest_run_team = None

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

        # Runs
        if home_score != last_home_score or visitor_score != last_visitor_score:
            diff_home = home_score - last_home_score
            diff_visitor = visitor_score - last_visitor_score
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

        # Shots
        msg_type = evt.get("Msg_type")
        if msg_type in ["1","2"]:
            locX = int(evt.get("LocationX","0"))
            locY = int(evt.get("LocationY","0"))
            zone = classify_zone(locX, locY)
            off_team_id = evt.get("Offensive_Team_id","")
            if off_team_id == home_team_id:
                shooter = "home"
            elif off_team_id == visitor_team_id:
                shooter = "visitor"
            else:
                continue
            att_key = f"{shooter}_{zone}_att"
            made_key = f"{shooter}_{zone}_made"
            zone_stats[att_key] += 1
            if msg_type == "1": 
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

def parse_shot_chart(snapshot, game_id):
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    
    # Get current period from boxscore
    boxscore_data = parse_boxscore(snapshot, game_id)
    if not boxscore_data:
        return None
        
    current_period = boxscore_data.get("current_period", 1)
    
    # Initialize shot zones
    shot_zones = {
        "teamA": {
            "paint": {"made": 0, "attempts": 0},
            "midrange": {"made": 0, "attempts": 0},
            "three": {"made": 0, "attempts": 0}
        },
        "teamB": {
            "paint": {"made": 0, "attempts": 0},
            "midrange": {"made": 0, "attempts": 0},
            "three": {"made": 0, "attempts": 0}
        }
    }
    
    # Get team IDs for mapping shots to teams
    team_a_id = boxscore_data["teams"][0].get("team_id")
    team_b_id = boxscore_data["teams"][1].get("team_id")
    
    # Process shots from PBP
    pbp_filename = f"{game_id}_pbp_Q{current_period}.xml"
    pbp_path = os.path.join(DATA_ROOT, snapshot_dir_name, pbp_filename)
    
    if os.path.exists(pbp_path):
        pbp_tree = etree.parse(pbp_path)
        pbp_root = pbp_tree.getroot()
        
        for event in pbp_root.xpath(".//Event_pbp"):
            if event.get("Msg_type") in ["1", "2"]:  # Shot attempts (made or missed)
                team_id = event.get("Team_id")
                team_key = "teamA" if team_id == team_a_id else "teamB"
                
                # Determine shot zone
                x = int(event.get("LocationX", "0"))
                y = int(event.get("LocationY", "0"))
                
                # Simple zone classification
                if abs(x) < 40 and abs(y) < 40:
                    zone = "paint"
                elif abs(x) > 80 or abs(y) > 80:
                    zone = "three"
                else:
                    zone = "midrange"
                
                # Update shot counts
                shot_zones[team_key][zone]["attempts"] += 1
                if event.get("Msg_type") == "1":  # Made shot
                    shot_zones[team_key][zone]["made"] += 1
    
    return shot_zones

def parse_shot_zones(snapshot, game_id, period=None):
    """
    Parse shot data and classify into zones for both teams.
    
    Args:
        snapshot (str): Snapshot name
        game_id (str): Game ID
        period (int, optional): Specific period to analyze. If None, analyzes all periods.
    
    Returns:
        dict: Shot data organized by team and zone with makes/attempts/percentages
    """
    snapshot_dir_name = snapshot.lower().replace(' ', '_')
    
    # Get team info from boxscore
    boxscore_data = parse_boxscore(snapshot, game_id)
    if not boxscore_data:
        return None
        
    team_a_id = boxscore_data["teams"][0].get("team_id")
    team_b_id = boxscore_data["teams"][1].get("team_id")
    
    # Initialize shot data structure
    shot_data = {
        "teamA": {
            "name": boxscore_data["teams"][0]["team_name"],
            "zones": {
                "paint": {"made": 0, "attempts": 0},
                "midRange1": {"made": 0, "attempts": 0},
                "midRange2": {"made": 0, "attempts": 0},
                "midRange3": {"made": 0, "attempts": 0},
                "cornerThree1": {"made": 0, "attempts": 0},
                "cornerThree2": {"made": 0, "attempts": 0},
                "wingThree1": {"made": 0, "attempts": 0},
                "wingThree2": {"made": 0, "attempts": 0},
                "topKeyThree": {"made": 0, "attempts": 0}
            }
        },
        "teamB": {
            "name": boxscore_data["teams"][1]["team_name"],
            "zones": {
                "paint": {"made": 0, "attempts": 0},
                "midRange1": {"made": 0, "attempts": 0},
                "midRange2": {"made": 0, "attempts": 0},
                "midRange3": {"made": 0, "attempts": 0},
                "cornerThree1": {"made": 0, "attempts": 0},
                "cornerThree2": {"made": 0, "attempts": 0},
                "wingThree1": {"made": 0, "attempts": 0},
                "wingThree2": {"made": 0, "attempts": 0},
                "topKeyThree": {"made": 0, "attempts": 0}
            }
        }
    }
    
    def classify_shot_zone(x, y):
        """Classify shot location based on coordinates"""
        # Paint zone
        if abs(x) <= 70 and 172 <= y <= 328:
            return "paint"
            
        # Corner threes
        if abs(x) <= 150:
            if y <= 32:
                return "cornerThree2"
            elif y >= 467:
                return "cornerThree1"
                
        # Wing and top threes
        if abs(x) >= 150:
            if y <= 32:
                return "wingThree1"
            elif y >= 467:
                return "wingThree2"
            else:
                return "topKeyThree"
                
        # Mid-range zones
        if 70 <= abs(x) <= 150:
            if y <= 172:
                return "midRange3"
            elif y >= 328:
                return "midRange1"
            else:
                return "midRange2"
                
        return "midRange2"  # Default case
    
    # Process shots from PBP data
    periods = [period] if period else range(1, 5)
    for current_period in periods:
        pbp_filename = f"{game_id}_pbp_Q{current_period}.xml"
        pbp_path = os.path.join(DATA_ROOT, snapshot_dir_name, pbp_filename)
        
        if os.path.exists(pbp_path):
            pbp_tree = etree.parse(pbp_path)
            pbp_root = pbp_tree.getroot()
            
            for event in pbp_root.xpath(".//Event_pbp"):
                if event.get("Msg_type") in ["1", "2"]:  # Shot attempts (made=1 or missed=2)
                    team_id = event.get("Team_id")
                    team_key = "teamA" if team_id == team_a_id else "teamB"
                    
                    x = int(event.get("LocationX", "0"))
                    y = int(event.get("LocationY", "0"))
                    
                    zone = classify_shot_zone(x, y)
                    shot_data[team_key]["zones"][zone]["attempts"] += 1
                    
                    if event.get("Msg_type") == "1":  # Made shot
                        shot_data[team_key]["zones"][zone]["made"] += 1
    
    # Calculate percentages
    for team in ["teamA", "teamB"]:
        for zone in shot_data[team]["zones"]:
            attempts = shot_data[team]["zones"][zone]["attempts"]
            if attempts > 0:
                pct = (shot_data[team]["zones"][zone]["made"] / attempts) * 100
                shot_data[team]["zones"][zone]["percentage"] = round(pct, 1)
            else:
                shot_data[team]["zones"][zone]["percentage"] = 0.0
    
    return shot_data
 