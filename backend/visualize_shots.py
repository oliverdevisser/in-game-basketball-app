#This file likely unnecessary, but I'm keeping it for now
#If I need to determine the zones in the backend, I can use this file and continue, but I want to
#plot the shots as well in the frontend so I will have to pass them anyways, will determine zones there


import os
from lxml import etree
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Arc, Path, PathPatch
import numpy as np
from matplotlib.widgets import RadioButtons

DATA_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'pbp_snap_shot')

# Constants matching CourtStage.jsx
PAINT = {
    'rect_top_y': 172,
    'rect_bottom_y': 328,
    'rect_right_x': 70,
    'arc_center_y': 250,
    'arc_radius': (328 - 172) / 2
}

THREE_POINT = {
    'arc_top_baseline_y': 32,
    'arc_bottom_baseline_y': 467,
    'arc_start_x': 150,
    'corner_width': 150
}

def draw_court(ax=None, color='black', lw=2, outer_lines=False):
    if ax is None:
        ax = plt.gca()

    # Basketball hoop
    hoop = Circle((0, 0), radius=7.5, linewidth=lw, color=color, fill=False)

    # Backboard
    backboard = Rectangle((-30, -7.5), 60, -1, linewidth=lw, color=color)

    # Paint area
    outer_box = Rectangle((-80, -47.5), 160, 190, linewidth=lw, color=color, fill=False)
    inner_box = Rectangle((-60, -47.5), 120, 190, linewidth=lw, color=color, fill=False)

    # Free throw arcs
    top_free_throw = Arc((0, 142.5), 120, 120, theta1=0, theta2=180, linewidth=lw, color=color, fill=False)
    bottom_free_throw = Arc((0, 142.5), 120, 120, theta1=180, theta2=0, linewidth=lw, color=color, linestyle='dashed')
    
    # Restricted zone
    restricted = Arc((0, 0), 80, 80, theta1=0, theta2=180, linewidth=lw, color=color)

    # Three point line
    corner_three_a = Rectangle((-220, -47.5), 0, 140, linewidth=lw, color=color)
    corner_three_b = Rectangle((220, -47.5), 0, 140, linewidth=lw, color=color)
    three_arc = Arc((0, 0), 475, 475, theta1=22, theta2=158, linewidth=lw, color=color)

    # Center court
    center_outer_arc = Arc((0, 422.5), 120, 120, theta1=180, theta2=0, linewidth=lw, color=color)
    center_inner_arc = Arc((0, 422.5), 40, 40, theta1=180, theta2=0, linewidth=lw, color=color)

    court_elements = [hoop, backboard, outer_box, inner_box, top_free_throw,
                     bottom_free_throw, restricted, corner_three_a,
                     corner_three_b, three_arc, center_outer_arc,
                     center_inner_arc]

    if outer_lines:
        outer_lines = Rectangle((-250, -47.5), 500, 470, linewidth=lw, color=color, fill=False)
        court_elements.append(outer_lines)

    for element in court_elements:
        ax.add_patch(element)

    return ax

def draw_zones(ax):
    """Draw all shooting zones on the court"""
    
    # Paint Zone (red)
    paint_rect = Rectangle((-PAINT['rect_right_x'], PAINT['rect_top_y']), 
                         2*PAINT['rect_right_x'], 
                         PAINT['rect_bottom_y']-PAINT['rect_top_y'],
                         facecolor='red', alpha=0.3)
    ax.add_patch(paint_rect)
    
    # Paint Arc
    paint_arc = Arc((0, PAINT['arc_center_y']), 
                   2*PAINT['arc_radius'], 2*PAINT['arc_radius'],
                   theta1=0, theta2=180,
                   facecolor='red', alpha=0.3)
    ax.add_patch(paint_arc)

    # Mid-Range Zones (green)
    # Mid-Range 1 (bottom)
    midrange1 = Rectangle((-PAINT['rect_right_x'], PAINT['rect_bottom_y']),
                        2*PAINT['rect_right_x'],
                        THREE_POINT['arc_bottom_baseline_y']-PAINT['rect_bottom_y'],
                        facecolor='green', alpha=0.3)
    ax.add_patch(midrange1)

    # Mid-Range 2 (middle)
    vertices = [
        (-PAINT['rect_right_x'], PAINT['rect_top_y']),
        (-THREE_POINT['arc_start_x'], THREE_POINT['arc_top_baseline_y']),
        (-THREE_POINT['arc_start_x'], THREE_POINT['arc_bottom_baseline_y']),
        (-PAINT['rect_right_x'], PAINT['rect_bottom_y'])
    ]
    midrange2 = plt.Polygon(vertices, facecolor='green', alpha=0.3)
    ax.add_patch(midrange2)
    # Mirror to right side
    vertices_right = [(-x, y) for x, y in vertices]
    midrange2_right = plt.Polygon(vertices_right, facecolor='green', alpha=0.3)
    ax.add_patch(midrange2_right)

    # Mid-Range 3 (top)
    midrange3 = Rectangle((-PAINT['rect_right_x'], THREE_POINT['arc_top_baseline_y']),
                        2*PAINT['rect_right_x'],
                        PAINT['rect_top_y']-THREE_POINT['arc_top_baseline_y'],
                        facecolor='green', alpha=0.3)
    ax.add_patch(midrange3)

    # Three Point Zones (yellow)
    # Corner Three 1 (bottom)
    corner_three1 = Rectangle((-THREE_POINT['corner_width'], THREE_POINT['arc_bottom_baseline_y']),
                           2*THREE_POINT['corner_width'], 100,
                           facecolor='yellow', alpha=0.3)
    ax.add_patch(corner_three1)

    # Corner Three 2 (top)
    corner_three2 = Rectangle((-THREE_POINT['corner_width'], -100),
                           2*THREE_POINT['corner_width'],
                           THREE_POINT['arc_top_baseline_y']+100,
                           facecolor='yellow', alpha=0.3)
    ax.add_patch(corner_three2)

    # Wing Three 1 & 2 and Top Key Three
    three_arc = Arc((0, 0), 475, 475,
                   theta1=22, theta2=158,
                   facecolor='yellow', alpha=0.3)
    ax.add_patch(three_arc)

def collect_shot_data():
    shots = []
    
    for snapshot in os.listdir(DATA_ROOT):
        snapshot_path = os.path.join(DATA_ROOT, snapshot)
        if not os.path.isdir(snapshot_path):
            continue
            
        for filename in os.listdir(snapshot_path):
            if '_pbp_Q' in filename and filename.endswith('.xml'):
                file_path = os.path.join(snapshot_path, filename)
                
                tree = etree.parse(file_path)
                root = tree.getroot()
                
                for event in root.xpath(".//Event_pbp"):
                    if event.get("Msg_type") in ["1", "2"]:  # 1=made shot, 2=missed shot
                        shot = {
                            'x': int(event.get("LocationX", "0")),
                            'y': int(event.get("LocationY", "0")),
                            'made': event.get("Msg_type") == "1",
                            'team_id': event.get("Team_id"),
                            'player_id': event.get("Person_id"),
                            'period': int(event.get("Period", "1")),
                            'game_clock': event.get("Game_clock"),
                            'game_id': filename.split('_')[0]
                        }
                        shots.append(shot)
    
    return pd.DataFrame(shots)

def point_in_zone(x, y, zone_name):
    """Check if a point (x,y) is within a specific zone"""
    
    if zone_name == "paint":
        # Check rectangle part
        in_rect = (abs(x) <= PAINT['rect_right_x'] and 
                  PAINT['rect_top_y'] <= y <= PAINT['rect_bottom_y'])
        
        # Check arc part if not in rectangle
        if not in_rect:
            dx = abs(x) - PAINT['rect_right_x']
            dy = y - PAINT['arc_center_y']
            in_arc = (dx*dx + dy*dy <= PAINT['arc_radius']*PAINT['arc_radius'] and
                     PAINT['rect_top_y'] <= y <= PAINT['rect_bottom_y'])
            return in_arc
        return True
        
    elif zone_name == "midRange1":
        return (abs(x) <= PAINT['rect_right_x'] and
                PAINT['rect_bottom_y'] <= y <= THREE_POINT['arc_bottom_baseline_y'])
                
    elif zone_name == "midRange2":
        if not (PAINT['rect_right_x'] <= abs(x) <= THREE_POINT['arc_start_x']):
            return False
        if not (PAINT['rect_top_y'] <= y <= PAINT['rect_bottom_y']):
            return False
        # Make sure point is not in paint zone
        return not point_in_zone(x, y, "paint")
        
    elif zone_name == "midRange3":
        return (abs(x) <= PAINT['rect_right_x'] and
                THREE_POINT['arc_top_baseline_y'] <= y <= PAINT['rect_top_y'])
                
    elif zone_name == "cornerThree1":
        return (abs(x) <= THREE_POINT['corner_width'] and
                y >= THREE_POINT['arc_bottom_baseline_y'])
                
    elif zone_name == "cornerThree2":
        return (abs(x) <= THREE_POINT['corner_width'] and
                y <= THREE_POINT['arc_top_baseline_y'])
                
    elif zone_name == "wingThree1":
        if y > THREE_POINT['arc_top_baseline_y']:
            return False
        if abs(x) < THREE_POINT['corner_width']:
            return False
        # Check if beyond three point line
        dx = abs(x)
        dy = y - PAINT['arc_center_y']
        return (dx*dx + dy*dy >= 475*475/4)
        
    elif zone_name == "wingThree2":
        if y < THREE_POINT['arc_bottom_baseline_y']:
            return False
        if abs(x) < THREE_POINT['corner_width']:
            return False
        # Check if beyond three point line
        dx = abs(x)
        dy = y - PAINT['arc_center_y']
        return (dx*dx + dy*dy >= 475*475/4)
        
    elif zone_name == "topKeyThree":
        if abs(x) < THREE_POINT['corner_width']:
            return False
        if y < THREE_POINT['arc_top_baseline_y'] or y > THREE_POINT['arc_bottom_baseline_y']:
            return False
        # Check if beyond three point line
        dx = abs(x)
        dy = y - PAINT['arc_center_y']
        return (dx*dx + dy*dy >= 475*475/4)
    
    return False

def plot_shots():
    df = collect_shot_data()
    
    # Add zone classification to dataframe
    df['zone'] = df.apply(lambda row: next(
        (zone for zone in [
            "paint", "midRange1", "midRange2", "midRange3",
            "cornerThree1", "cornerThree2", "wingThree1",
            "wingThree2", "topKeyThree"
        ] if point_in_zone(row['x'], row['y'], zone)), 
        "unknown"
    ), axis=1)
    
    # Create figure and axes
    fig = plt.figure(figsize=(15, 10))
    ax = plt.subplot2grid((1, 4), (0, 0), colspan=3)
    
    # Create radio buttons for zone selection
    rax = plt.subplot2grid((1, 4), (0, 3))
    zones = ['all', 'paint', 'midRange1', 'midRange2', 'midRange3',
             'cornerThree1', 'cornerThree2', 'wingThree1', 'wingThree2', 'topKeyThree']
    radio = RadioButtons(rax, zones)
    
    def update_plot(zone):
        ax.clear()
        draw_zones(ax)
        draw_court(ax, outer_lines=True)
        
        # Filter shots based on selected zone
        if zone != 'all':
            plot_df = df[df['zone'] == zone]
        else:
            plot_df = df
            
        # Plot shots
        made_shots = plot_df[plot_df['made']]
        missed_shots = plot_df[~plot_df['made']]
        
        ax.scatter(made_shots['x'], made_shots['y'], 
                  c='green', alpha=0.6, label='Made', marker='o', s=100)
        ax.scatter(missed_shots['x'], missed_shots['y'],
                  c='red', alpha=0.6, label='Missed', marker='x', s=100)
        
        # Update stats
        total_shots = len(plot_df)
        made_shots_count = len(made_shots)
        fg_pct = (made_shots_count / total_shots * 100) if total_shots > 0 else 0
        
        # Clear previous text by setting new text in a fixed position
        ax.text(-280, -80, 
                f'Zone: {zone}\n'
                f'Total Shots: {total_shots}\n'
                f'Made Shots: {made_shots_count}\n'
                f'FG%: {fg_pct:.1f}%',
                fontsize=10,
                bbox=dict(facecolor='white', alpha=0.8))
        
        ax.set_xlim(300, -300)
        ax.set_ylim(-100, 500)
        ax.axis('off')
        plt.draw()
    
    # Connect the radio buttons to the update function
    radio.on_clicked(update_plot)
    
    # Initial plot
    update_plot('all')
    
    plt.tight_layout()
    plt.show()
    
    # Print zone distribution
    print("\nShots by Zone:")
    zone_stats = df['zone'].value_counts()
    print(zone_stats)
    
    # Print coordinate ranges
    print("\nCoordinate Ranges:")
    print(f"X: {df['x'].min()} to {df['x'].max()}")
    print(f"Y: {df['y'].min()} to {df['y'].max()}")

if __name__ == "__main__":
    plot_shots() 