# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from parse_xml import list_snapshots, list_games, parse_boxscore, parse_lineups, parse_pbp

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    # Use the port you prefer, just ensure frontend matches
    app.run(host='0.0.0.0', port=5002, debug=True)
