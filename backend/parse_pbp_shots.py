import xml.etree.ElementTree as ET
import os

DATA_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'pbp_snap_shot')

def transform_coordinates(x, y):
    """
    Transform coordinates from XML data system to frontend coordinate system.
    
    XML system:
        X: -250 to 250 (out of bounds lines, baseline at 0)
        Y: -47.5 to 422.5 (out of bounds lines, basket at 0)
    
    Frontend system:
        Width: 500 (baseline at 500)
        Height: 500 (basket at 500)
    """
    # Transform X: from [-250, 250] to [0, 500]
    # First normalize to [0, 500] range
    new_y = (x + 250) * (500 / 500)
    
    # Transform Y: from [-47.5, 422.5] to [500, 0]
    # First normalize to [0, 470] range, then scale to 500 and invert
    new_x = (y + 47.5) * (500 / 470)
    
    return new_x, new_y

def parse_pbp_shots(xml_path):
    """
    Parse shots from all available quarters of play-by-play data.
    The xml_path parameter will be used as a base to find other quarter files.
    """
    # Get the base path and game ID from the provided xml_path
    base_dir = os.path.dirname(xml_path)
    game_id = os.path.basename(xml_path).split('_')[0]
    
    shots = []
    three_pt_makes = []  # Track 3pt makes with time
    
    # Try to process Q1 through Q4 (and potential OT periods)
    for quarter in range(1, 11):  # Up to 6 OT periods (Q1-Q4 + 6OT)
        quarter_file = os.path.join(base_dir, f"{game_id}_pbp_Q{quarter}.xml")
        
        if not os.path.exists(quarter_file):
            continue  # Skip if this quarter's file doesn't exist
            
        tree = ET.parse(quarter_file)
        root = tree.getroot()

        for game in root.findall('.//Game'):
            for pbp in game.findall('.//Msg_play_by_play'):
                for event in pbp.findall('.//Event_pbp'):
                    msg_type = event.get('Msg_type')
                    if msg_type in ['1', '2']:  # made or missed shot
                        # Extract relevant fields
                        player = event.get('Last_name')
                        player_id = event.get('Person_id')
                        team_abbr = event.get('Team_abr')
                        team_id = event.get('Team_id')
                        period = int(event.get('Period'))
                        game_clock = event.get('Game_clock')
                        
                        # Get original coordinates and transform them
                        orig_x = int(event.get('LocationX'))
                        orig_y = int(event.get('LocationY'))
                        locX, locY = transform_coordinates(orig_x, orig_y)
                        
                        pts = int(event.get('Pts', 0))
                        made = (msg_type == '1') and (pts > 0)

                        # Track 3pt makes with time
                        if made and pts == 3:
                            three_pt_makes.append({
                                'player': player,
                                'team': team_abbr,
                                'time': f"Q{period} {game_clock}"
                            })

                        # Store the shot with transformed coordinates
                        shots.append({
                            "player": player,
                            "player_id": player_id,
                            "team_abbr": team_abbr,
                            "team_id": team_id,
                            "period": period,
                            "game_clock": game_clock,
                            "locationX": locX,
                            "locationY": locY,
                            "made": made,
                            "points": pts
                        })

    # Calculate shooting statistics
    total_shots = len(shots)
    made_shots = sum(1 for shot in shots if shot['made'])
    fg_pct = (made_shots / total_shots * 100) if total_shots > 0 else 0

    # Two-point shots
    two_pt_shots = [shot for shot in shots if shot['points'] == 2]
    two_pt_made = sum(1 for shot in two_pt_shots if shot['made'])

    # Three-point shots
    three_pt_shots = [shot for shot in shots if shot['points'] == 3]
    three_pt_made = sum(1 for shot in three_pt_shots if shot['made'])

    # Print statistics
    print("\nShooting Statistics (All Quarters):")
    print(f"Total Shots: {total_shots}")
    print(f"Made Shots: {made_shots}")
    print(f"FG%: {fg_pct:.1f}%")
    print("\n2-Point Shots:")
    print(f"Made: {two_pt_made}")
    print("\n3-Point Shots:")
    print(f"Made: {three_pt_made}")
    
    # Print 3pt makes with time
    if three_pt_makes:
        print("\n3-Point Makes Timeline:")
        for shot in sorted(three_pt_makes, key=lambda x: (int(x['time'][1]), x['time'][3:]), reverse=True):
            print(f"{shot['time']} - {shot['player']} ({shot['team']})")

    return {"shots": shots}
