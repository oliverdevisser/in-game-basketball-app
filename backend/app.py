# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from parse_xml import list_snapshots, list_games, parse_boxscore, parse_lineups, parse_pbp, parse_shot_chart, parse_shot_zones
from parse_pbp_shots import parse_pbp_shots
import os

app = Flask(__name__)
CORS(app)

# Add this line to define DATA_ROOT
DATA_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'pbp_snap_shot')

@app.route('/snapshots', methods=['GET'])
def get_snapshots():
    try:
        snaps = list_snapshots()
        return jsonify({"snapshots": snaps})
    except Exception as e:
        print(f"Error in get_snapshots: {e}")
        return jsonify({"error": str(e), "snapshots": []}), 500

@app.route('/games', methods=['GET'])
def get_games():
    snapshot = request.args.get('snapshot')
    if not snapshot:
        return jsonify({"error": "Please provide a snapshot parameter"}), 400
    try:
        games = list_games(snapshot)
        return jsonify({"games": games})
    except Exception as e:
        print(f"Error in get_games: {e}")
        return jsonify({"error": str(e), "games": []}), 500

@app.route('/boxscore', methods=['GET'])
def get_boxscore():
    snapshot = request.args.get('snapshot')
    game_id = request.args.get('game_id')
    if not snapshot or not game_id:
        return jsonify({"error": "Please provide snapshot and game_id parameters"}), 400

    try:
        data = parse_boxscore(snapshot, game_id)
        if data is None:
            return jsonify({"error": "No boxscore found"}), 404
        return jsonify(data)
    except Exception as e:
        print(f"Error in get_boxscore: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/lineups', methods=['GET'])
def get_lineups():
    snapshot = request.args.get('snapshot')
    game_id = request.args.get('game_id')
    if not snapshot or not game_id:
        return jsonify({"error": "Please provide snapshot and game_id parameters"}), 400

    try:
        lineups = parse_lineups(snapshot, game_id)
        return jsonify({"lineups": lineups})
    except Exception as e:
        print(f"Error in get_lineups: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/pbp', methods=['GET'])
def get_pbp():
    snapshot = request.args.get('snapshot')
    game_id = request.args.get('game_id')
    if not snapshot or not game_id:
        return jsonify({"error": "Please provide snapshot and game_id parameters"}), 400

    try:
        pbp_data = parse_pbp(snapshot, game_id)
        return jsonify({"pbp": pbp_data})
    except Exception as e:
        print(f"Error in get_pbp: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/shot-chart', methods=['GET'])
def get_shot_chart():
    snapshot = request.args.get('snapshot')
    game_id = request.args.get('game_id')
    if not snapshot or not game_id:
        return jsonify({"error": "Please provide snapshot and game_id parameters"}), 400

    try:
        shot_data = parse_shot_chart(snapshot, game_id)
        return jsonify({"shot_chart": shot_data})
    except Exception as e:
        print(f"Error in get_shot_chart: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/shot-zones', methods=['GET'])
def get_shot_zones():
    snapshot = request.args.get('snapshot')
    game_id = request.args.get('game_id')
    period = request.args.get('period')
    
    if not snapshot or not game_id:
        return jsonify({"error": "Please provide snapshot and game_id parameters"}), 400

    try:
        period = int(period) if period else None
        shot_data = parse_shot_zones(snapshot, game_id, period)
        if shot_data is None:
            return jsonify({"error": "No shot data found"}), 404
        return jsonify({"shot_zones": shot_data})
    except Exception as e:
        print(f"Error in get_shot_zones: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/shots', methods=['GET'])
def get_shots():
    snapshot = request.args.get('snapshot')
    game_id = request.args.get('game_id')
    
    if not snapshot or not game_id:
        return jsonify({"error": "Please provide snapshot and game_id parameters"}), 400
        
    try:
        # Get the actual file path for the current period from boxscore
        boxscore_data = parse_boxscore(snapshot, game_id)
        if not boxscore_data:
            return jsonify({"error": "No boxscore found"}), 404
            
        current_period = boxscore_data.get("current_period", 1)
        
        # Construct the path to the pbp file
        snapshot_dir_name = snapshot.lower().replace(' ', '_')
        pbp_filename = f"{game_id}_pbp_Q{current_period}.xml"
        pbp_path = os.path.join(DATA_ROOT, snapshot_dir_name, pbp_filename)
        
        if not os.path.exists(pbp_path):
            return jsonify({"error": "PBP file not found"}), 404
            
        shots = parse_pbp_shots(pbp_path)
        return jsonify(shots)
        
    except Exception as e:
        print(f"Error in get_shots: {e}")
        return jsonify({"error": str(e)}), 500
# current plan:
# {
#   "player": "Tshiebwe",
#   "player_id": "1631131",
#   "team_abbr": "SLC",
#   "team_id": "1612709903",
#   "period": 1,
#   "game_clock": "11:33",
#   "locationX": 11,
#   "locationY": 45,
#   "made": true, 
#   "points": 2
# }

if __name__ == '__main__':
    # Use the port you prefer, just ensure frontend matches
    app.run(host='0.0.0.0', port=5002, debug=True)
