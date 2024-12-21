import xml.etree.ElementTree as ET
import os
from shapely.geometry import Point, Polygon, MultiPolygon
import numpy as np

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


# Define your zones
def define_zones():
    """Define court zones using the same coordinates as CourtStage.jsx"""
    
    # Calculate arc points for three point line (same as in CourtStage.jsx)
    sx = 150  # THREE_POINT.arcStartX
    sy = 32   # THREE_POINT.arcStartY
    ex = 150  # THREE_POINT.arcStartX
    ey = 467  # THREE_POINT.arcBottomBaselineY
    
    # Calculate arc points for wing zones (1/3 and 2/3 along the arc)
    dx = ex - sx
    dy = ey - sy
    dist = np.sqrt(dx * dx + dy * dy)
    R = (dist / 2) * 1.055  # Same radius factor as frontend
    
    # Calculate arc center
    mx = (sx + ex) / 2
    my = (sy + ey) / 2
    px = -dy
    py = dx
    pl = np.sqrt(px * px + py * py)
    px /= pl
    py /= pl
    h = np.sqrt(R * R - (dist / 2) * (dist / 2))
    cx = mx + px * h
    cy = my + py * h
    
    # Calculate top third point
    angle_top = np.arctan2(sy - cy, sx - cx) + (np.arctan2(ey - cy, ex - cx) - np.arctan2(sy - cy, sx - cx)) / 3
    top_third_x = cx + R * np.cos(angle_top)
    top_third_y = cy + R * np.sin(angle_top)
    
    # Calculate bottom third point
    angle_bottom = np.arctan2(sy - cy, sx - cx) + 2 * (np.arctan2(ey - cy, ex - cx) - np.arctan2(sy - cy, sx - cx)) / 3
    bottom_third_x = cx + R * np.cos(angle_bottom)
    bottom_third_y = cy + R * np.sin(angle_bottom)

    # Define zones with arc points
    wing_three1 = Polygon([
        (150, 32),         # Bottom left
        (150, 0),          # Top left
        (500, 0),          # Top right
        (500, 32),         # Bottom right
        (top_third_x, top_third_y)  # Arc point
    ])

    wing_three2 = Polygon([

        (150, 467),        # Top left
        (bottom_third_x, bottom_third_y),  # Arc point
        (500, 467),        # Top right
        (500, 500),        # Bottom right
        (150, 500)        # Bottom left
    ])

    top_key_three = Polygon([
        (top_third_x, top_third_y),    # Top arc point
        (bottom_third_x, bottom_third_y),  # Bottom arc point
        (500, 467),              # bottom right
        (500, 32)         # Top right
        
    ])

    # Other zones remain the same
    paint_zone = Polygon([
        (0, 172),      # Top left
        (70, 172),     # Top right
        (70, 328),     # Bottom right
        (0, 328)       # Bottom left
    ])

    midrange1 = Polygon([
        (0, 328),          # Top left
        (70, 328),         # Top right
        (150, 467),        # Bottom right
        (0, 467)           # Bottom left
    ])

    midrange2 = Polygon([
        (70, 172),         # Top left
        (150, 32),         # Top right
        (150, 467),        # Bottom right
        (70, 328)          # Bottom left
    ])

    midrange3 = Polygon([
        (0, 32),           # Top left
        (150, 32),         # Top right
        (70, 172),         # Bottom right
        (0, 172)           # Bottom left
    ])

    corner_three1 = Polygon([
        (0, 467),          # Top left
        (150, 467),        # Top right
        (150, 500),        # Bottom right
        (0, 500)           # Bottom left
    ])

    corner_three2 = Polygon([
        (0, 0),            # Top left
        (150, 0),          # Top right
        (150, 32),         # Bottom right
        (0, 32)            # Bottom left
    ])

    return {
        'paint': paint_zone,
        'midRange1': midrange1,
        'midRange2': midrange2,
        'midRange3': midrange3,
        'cornerThree1': corner_three1,
        'cornerThree2': corner_three2,
        'wingThree1': wing_three1,
        'wingThree2': wing_three2,
        'topKeyThree': top_key_three
    }


# Determine which zone a shot is in
def determine_zone(x, y, zones):
    """Determine which zone a shot is in"""
    point = Point(x, y)
    
    # Print point location and found zone for debugging
    print(f"\nChecking point ({x}, {y})")
    
    for zone_name, zone_shape in zones.items():
        if zone_shape.contains(point):
            print(f"Point is in zone: {zone_name}")
            return zone_name
            
    print("Point is in unknown zone")
    return 'unknown'

def determine_shot_zone(x, y, zones, paint_circle, three_point_circle):
    """
    Determine which zone a shot belongs to, following the priority order:
    1. Paint (rectangle or circle)
    2. MidRange3
    3. MidRange1
    4. CornerThree1 & CornerThree2
    5. MidRange2 (anything left in 3pt circle)
    6. WingThree1, WingThree2, TopKeyThree
    """
    point = Point(x, y)
    
    # 1. Check Paint Zone (including circle)
    if zones['paint'].contains(point) or paint_circle.contains(point):
        return 1, 'paint'
        
    # 2. Check MidRange3
    if zones['midRange3'].contains(point):
        return 2, 'midRange3'
        
    # 3. Check MidRange1
    if zones['midRange1'].contains(point):
        return 3, 'midRange1'
        
    # 4. Check Corner Threes
    if zones['cornerThree1'].contains(point):
        return 4, 'cornerThree1'
    if zones['cornerThree2'].contains(point):
        return 5, 'cornerThree2'
        
    # 5. Check if in three point circle (MidRange2)
    if three_point_circle.contains(point):
        return 6, 'midRange2'
        
    # 6. Check remaining three point zones
    if zones['wingThree1'].contains(point):
        return 7, 'wingThree1'
    if zones['wingThree2'].contains(point):
        return 8, 'wingThree2'
    if zones['topKeyThree'].contains(point):
        return 9, 'topKeyThree'
        
    return 0, 'unknown'









def parse_pbp_shots(xml_path):
    """Parse shots from all available quarters of play-by-play data."""
    base_dir = os.path.dirname(xml_path)
    game_id = os.path.basename(xml_path).split('_')[0]
    
    shots = []
    zones = define_zones()
    
    # Calculate circles for zone detection
    sx = 150  # THREE_POINT.arcStartX
    sy = 32   # THREE_POINT.arcStartY
    ex = 150  # THREE_POINT.arcStartX
    ey = 467  # THREE_POINT.arcBottomBaselineY
    
    dx = ex - sx
    dy = ey - sy
    dist = np.sqrt(dx * dx + dy * dy)
    R = (dist / 2) * 1.055
    
    mx = (sx + ex) / 2
    my = (sy + ey) / 2
    px = -dy
    py = dx
    pl = np.sqrt(px * px + py * py)
    px /= pl
    py /= pl
    h = np.sqrt(R * R - (dist / 2) * (dist / 2))
    cx = mx + px * h
    cy = my + py * h
    
    paint_circle = Point(70, 250).buffer(78)
    three_point_circle = Point(cx, cy).buffer(R)

    # Process all quarters
    for quarter in range(1, 11):
        quarter_file = os.path.join(base_dir, f"{game_id}_pbp_Q{quarter}.xml")
        
        if not os.path.exists(quarter_file):
            continue
            
        tree = ET.parse(quarter_file)
        root = tree.getroot()

        for game in root.findall('.//Game'):
            for pbp in game.findall('.//Msg_play_by_play'):
                for event in pbp.findall('.//Event_pbp'):
                    msg_type = event.get('Msg_type')
                    if msg_type in ['1', '2']:
                        # Extract fields
                        player = event.get('Last_name')
                        player_id = event.get('Person_id')
                        team_abbr = event.get('Team_abr')
                        team_id = event.get('Team_id')
                        period = int(event.get('Period'))
                        game_clock = event.get('Game_clock')
                        
                        # Transform coordinates
                        orig_x = int(event.get('LocationX'))
                        orig_y = int(event.get('LocationY'))
                        locX, locY = transform_coordinates(orig_x, orig_y)
                        
                        # Determine zone
                        zone_num, zone_name = determine_shot_zone(locX, locY, zones, paint_circle, three_point_circle)
                        
                        pts = int(event.get('Pts', 0))
                        made = (msg_type == '1') and (pts > 0)

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
                            "points": pts,
                            "zone": zone_name,
                            "zone_number": zone_num
                        })

    return {"shots": shots}
