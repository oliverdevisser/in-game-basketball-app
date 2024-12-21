#This file likely unnecessary, but I'm keeping it for now
#More for testing shooting charts
#resource: http://savvastjortjoglou.com/nba-shot-sharts.html

import os
from lxml import etree
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Arc, Path, PathPatch
import numpy as np
from matplotlib.widgets import RadioButtons
from matplotlib.image import imread
from parse_pbp_shots import define_zones, transform_coordinates
from shapely.geometry import Point, Polygon
import xml.etree.ElementTree as ET


DATA_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'pbp_snap_shot')
COURT_IMAGE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'src', 'assets', 'clippers-court2.png')

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

def plot_zones_and_court():
    plt.figure(figsize=(20, 10))
    ax = plt.gca()
    
    # Load and display court image
    court_img = imread(COURT_IMAGE)
    ax.imshow(court_img, extent=[0, 1000, 500, 0])
    
    # Get zones from define_zones()
    zones = define_zones()
    
    # Plot each zone with different colors and thicker borders
    zone_colors = {
        'paint': 'red',
        'midRange1': 'green',
        'midRange2': 'green',
        'midRange3': 'green',
        'cornerThree1': 'yellow',
        'cornerThree2': 'yellow',
        'wingThree1': 'yellow',
        'wingThree2': 'yellow',
        'topKeyThree': 'yellow'
    }
    
    # Plot each zone
    for zone_name, zone_shape in zones.items():
        try:
            if zone_shape and not zone_shape.is_empty:
                if hasattr(zone_shape, 'exterior'):
                    x, y = zone_shape.exterior.xy
                    plt.fill(x, y, alpha=0.3, fc=zone_colors[zone_name], 
                            ec='black', linewidth=2, label=zone_name)  # Added black edge color and thicker line
                    
                    try:
                        centroid = zone_shape.centroid
                        if not centroid.is_empty:
                            plt.text(centroid.x, centroid.y, zone_name, 
                                   horizontalalignment='center',
                                   verticalalignment='center',
                                   fontsize=8)
                    except Exception as e:
                        print(f"Could not add label for {zone_name}: {e}")
        except Exception as e:
            print(f"Error plotting zone {zone_name}: {e}")
    
    # Mirror zones to right side
    for zone_name, zone_shape in zones.items():
        try:
            if zone_shape and not zone_shape.is_empty and hasattr(zone_shape, 'exterior'):
                x, y = zone_shape.exterior.xy
                mirrored_x = [1000 - xi for xi in x]
                plt.fill(mirrored_x, y, alpha=0.3, fc=zone_colors[zone_name],
                        ec='black', linewidth=2)  # Added black edge color and thicker line
        except Exception as e:
            print(f"Error mirroring zone {zone_name}: {e}")
    
    # Calculate the three point arc circle parameters (same as in define_zones)
    sx = 150  # THREE_POINT.arcStartX
    sy = 32   # THREE_POINT.arcStartY
    ex = 150  # THREE_POINT.arcStartX
    ey = 467  # THREE_POINT.arcBottomBaselineY
    
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

    # Add paint arc circle (centered at x=70, y=250)
    paint_circle = Circle((70, 250), 78, fill=False, linestyle='--', color='black', linewidth=2)
    ax.add_patch(paint_circle)
    # Mirror paint arc circle
    paint_circle_mirror = Circle((1000-70, 250), 78, fill=False, linestyle='--', color='black', linewidth=2)
    ax.add_patch(paint_circle_mirror)
    
    # Add three point arc circle using the calculated center and radius
    three_point_circle = Circle((cx, cy), R, fill=False, linestyle='--', color='black', linewidth=2)
    ax.add_patch(three_point_circle)
    # Mirror three point arc circle
    three_point_circle_mirror = Circle((1000-cx, cy), R, fill=False, linestyle='--', color='black', linewidth=2)
    ax.add_patch(three_point_circle_mirror)
    
    # Create Shapely circle objects for zone checking
    paint_circle = Point(70, 250).buffer(78)
    three_point_circle = Point(cx, cy).buffer(R)
    
    # Get actual shots from pbp data
    base_dir = os.path.join(DATA_ROOT, 'middle_of_third')
    game_id = '2052400190'
    shots = []

    # Process all quarters
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
                        # Get original coordinates and transform them
                        orig_x = int(event.get('LocationX'))
                        orig_y = int(event.get('LocationY'))
                        locX, locY = transform_coordinates(orig_x, orig_y)
                        made = (msg_type == '1')
                        
                        shots.append({
                            'x': locX,
                            'y': locY,
                            'made': made,
                            'player': event.get('Last_name'),
                            'period': int(event.get('Period')),
                            'game_clock': event.get('Game_clock')
                        })

    # Plot each shot with its zone number
    for shot in shots:
        zone_num, zone_name = determine_shot_zone(shot['x'], shot['y'], zones, paint_circle, three_point_circle)
        color = 'green' if shot['made'] else 'red'
        plt.text(shot['x'], shot['y'], str(zone_num), 
                color=color, fontsize=12, fontweight='bold',
                ha='center', va='center',
                bbox=dict(facecolor='white', alpha=0.7, edgecolor='none'))
        print(f"Shot by {shot['player']} at Q{shot['period']} {shot['game_clock']} ({shot['x']}, {shot['y']}) "
              f"is in zone {zone_num} ({zone_name}) - {'MADE' if shot['made'] else 'MISSED'}")
    
    # Set the correct aspect ratio and limits
    ax.set_xlim(0, 1000)
    ax.set_ylim(500, 0)
    ax.set_aspect('equal')
    
    # Add legend
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    
    # Remove axes
    plt.axis('off')
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    plot_zones_and_court() 