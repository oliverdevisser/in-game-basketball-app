import pytest
from datetime import datetime
from ..parse_lineup_stints import LineupTracker

# Sample real data from the XMLs
SAMPLE_SUBSTITUTION = {
    "Event_num": "53",
    "Period": "1",
    "Game_clock": "7:48",
    "Msg_type": "8",  # Substitution
    "Team_id": "1612709903",
    "Last_name": "Williams",
    "Person_id": "1642262",  # Player going out
    "Last_name2": "Jones Garcia",
    "Person_id2": "1642357",  # Player coming in
}

SAMPLE_SHOT_MADE = {
    "Event_num": "13",
    "Period": "1",
    "Game_clock": "11:33",
    "Msg_type": "1",  # Made shot
    "Team_id": "1612709903",
    "Last_name": "Tshiebwe",
    "Person_id": "1631131",
    "Pts": "2",
    "Home_score": "0",
    "Visitor_score": "0"
}

SAMPLE_TURNOVER = {
    "Event_num": "22",
    "Period": "1",
    "Game_clock": "10:19",
    "Msg_type": "5",  # Turnover
    "Team_id": "1612709903",
    "Last_name": "Collier",
    "Person_id": "1642268",
    "Last_name2": "Christie",
    "Person_id2": "1642353"
}

SAMPLE_FOUL = {
    "Event_num": "32",
    "Period": "1", 
    "Game_clock": "9:32",
    "Msg_type": "6",  # Foul
    "Team_id": "1612709903",
    "Last_name": "Kinsey",
    "Person_id": "1641795",
    "Last_name2": "Harkless",
    "Person_id2": "1641989"
}

# Initial lineup from roster_lineup.xml
INITIAL_LINEUP_HOME = {
    "Home_forward_1_id": "1631131",
    "Home_forward_2_id": "1641795", 
    "Home_center_id": "1642262",
    "Home_guard_1_id": "1642268",
    "Home_guard_2_id": "1642271"
}

INITIAL_LINEUP_AWAY = {
    "Visitor_forward_1_id": "1630539",
    "Visitor_forward_2_id": "1641787",
    "Visitor_center_id": "1641989",
    "Visitor_guard_1_id": "1642353",
    "Visitor_guard_2_id": "1642484"
}

class TestLineupTracker:
    @pytest.fixture
    def tracker(self):
        return LineupTracker(
            game_id="2052400190",
            snapshot="middle_of_third",
            home_team_id="1612709903",
            away_team_id="1612709924"
        )

    def test_initialize_lineups(self, tracker):
        """Test that initial lineups are properly set"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Verify home team lineup
        assert len(tracker.current_lineups["1612709903"]) == 5
        assert "1631131" in tracker.current_lineups["1612709903"]
        
        # Verify away team lineup
        assert len(tracker.current_lineups["1612709924"]) == 5
        assert "1642484" in tracker.current_lineups["1612709924"]

    def test_track_substitution(self, tracker):
        """Test substitution handling"""
        # Initialize with starting lineups
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Process substitution
        tracker.track_substitution(SAMPLE_SUBSTITUTION)
        
        # Verify player was subbed out
        assert "1642262" not in tracker.current_lineups["1612709903"]
        # Verify player was subbed in
        assert "1642357" in tracker.current_lineups["1612709903"]
        # Verify stint time was recorded for subbed out player
        assert tracker.player_stints["1642262"].end_time == "7:48"

    def test_track_scoring_run(self, tracker):
        """Test scoring run tracking"""
        # Process consecutive made shots
        tracker.track_shot(SAMPLE_SHOT_MADE)  # Home team scores
        
        # Verify run counter
        assert tracker.current_run["1612709903"] == 2
        assert tracker.current_run["1612709924"] == 0

    def test_lineup_efficiency(self, tracker):
        """Test lineup efficiency calculations"""
        # Initialize lineup
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        lineup_key = tracker.get_lineup_key("1612709903")
        
        # Add some stats
        tracker.lineup_history[lineup_key].points_for = 10
        tracker.lineup_history[lineup_key].points_against = 4
        tracker.lineup_history[lineup_key].possessions_for = 5
        tracker.lineup_history[lineup_key].possessions_against = 5
        
        efficiency = tracker.get_lineup_efficiency(lineup_key)
        assert efficiency["ppp"] == 2.0  # 10 points / 5 possessions
        assert efficiency["papp"] == 0.8  # 4 points / 5 possessions

    def test_player_stint_stats(self, tracker):
        """Test individual player stint stat tracking"""
        # Initialize player stint
        player_id = "1631131"  # Tshiebwe
        tracker.initialize_player_stint(player_id, "12:00")  # Start of period
        
        # Add some events
        tracker.track_shot(SAMPLE_SHOT_MADE)  # Made shot
        tracker.track_turnover(SAMPLE_TURNOVER)  # Turnover
        tracker.track_foul(SAMPLE_FOUL)  # Foul
        
        stats = tracker.get_player_stint_stats(player_id)
        assert stats["points"] == 2
        assert stats["fg_made"] == 1
        assert stats["fg_attempted"] == 1

    def test_lineup_comparison(self, tracker):
        """Test comparing lineup stats to team averages"""
        # Initialize lineup
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        lineup_key = tracker.get_lineup_key("1612709903")
        
        # Add lineup and team stats
        tracker.lineup_history[lineup_key].points_for = 20
        tracker.lineup_history[lineup_key].possessions_for = 10
        tracker.team_stats["1612709903"].points = 100
        tracker.team_stats["1612709903"].possessions = 60
        
        comparison = tracker.get_lineup_comparison(lineup_key)
        assert comparison["ppp_vs_team"] == 0.33  # (2.0 - 1.67) PPP difference 

    def test_possession_tracking(self, tracker):
        """Test possession counting logic"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        lineup_key = tracker.get_lineup_key("1612709903")
        
        # Shot made should end possession
        tracker.track_shot(SAMPLE_SHOT_MADE)
        assert tracker.lineup_history[lineup_key].possessions_for == 1
        
        # Turnover should end possession
        tracker.track_turnover(SAMPLE_TURNOVER)
        assert tracker.lineup_history[lineup_key].possessions_for == 2

    def test_scoring_run_reset(self, tracker):
        """Test that scoring runs reset when other team scores"""
        # Home team scores
        tracker.track_shot(SAMPLE_SHOT_MADE)
        assert tracker.current_run["1612709903"] == 2
        
        # Away team scores
        away_shot = SAMPLE_SHOT_MADE.copy()
        away_shot["Team_id"] = "1612709924"
        tracker.track_shot(away_shot)
        
        # Run should reset
        assert tracker.current_run["1612709903"] == 0
        assert tracker.current_run["1612709924"] == 2

    def test_lineup_key_generation(self, tracker):
        """Test that lineup keys are consistent regardless of player order"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Get key for current lineup
        key1 = tracker.get_lineup_key("1612709903")
        
        # Shuffle players and get key again
        tracker.current_lineups["1612709903"] = set([
            "1642271", "1642268", "1642262", "1641795", "1631131"
        ])
        key2 = tracker.get_lineup_key("1612709903")
        
        assert key1 == key2  # Keys should match regardless of order

    def test_player_stint_duration(self, tracker):
        """Test calculation of stint duration"""
        player_id = "1631131"
        tracker.initialize_player_stint(player_id, "12:00")
        
        # Simulate substitution at 7:48
        sub = SAMPLE_SUBSTITUTION.copy()
        sub["Person_id"] = player_id
        sub["Game_clock"] = "7:48"
        tracker.track_substitution(sub)
        
        stint = tracker.player_stints[player_id]
        assert stint.duration == 252  # 4:12 = 252 seconds

    def test_multiple_stints(self, tracker):
        """Test tracking multiple stints for same player"""
        player_id = "1631131"
        
        # First stint
        tracker.initialize_player_stint(player_id, "12:00")
        sub_out = SAMPLE_SUBSTITUTION.copy()
        sub_out["Person_id"] = player_id
        sub_out["Game_clock"] = "8:00"
        tracker.track_substitution(sub_out)
        
        # Second stint
        sub_in = SAMPLE_SUBSTITUTION.copy()
        sub_in["Person_id2"] = player_id
        sub_in["Game_clock"] = "6:00"
        tracker.track_substitution(sub_in)
        
        stints = tracker.get_player_stint_history(player_id)
        assert len(stints) == 2
        assert stints[0].duration == 240  # 4 minutes
        assert stints[1].start_time == "6:00"

    def test_lineup_validation(self, tracker):
        """Test that lineups always have exactly 5 players"""
        with pytest.raises(ValueError):
            # Try to initialize with 4 players
            bad_lineup = INITIAL_LINEUP_HOME.copy()
            del bad_lineup["Home_guard_2_id"]
            tracker.initialize_lineups(bad_lineup, INITIAL_LINEUP_AWAY)

    def test_game_clock_conversion(self, tracker):
        """Test conversion between game clock string and seconds"""
        assert tracker.clock_to_seconds("12:00") == 720
        assert tracker.clock_to_seconds("1:30") == 90
        assert tracker.clock_to_seconds("0:45.5") == 45.5

    def test_possession_end_detection(self, tracker):
        """Test different ways possessions can end"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        lineup_key = tracker.get_lineup_key("1612709903")
        
        # Shot made ends possession
        tracker.track_shot(SAMPLE_SHOT_MADE)
        possessions = tracker.lineup_history[lineup_key].possessions_for
        
        # Turnover ends possession
        tracker.track_turnover(SAMPLE_TURNOVER)
        assert tracker.lineup_history[lineup_key].possessions_for == possessions + 1
        
        # Offensive foul ends possession
        offensive_foul = SAMPLE_FOUL.copy()
        offensive_foul["Action_type"] = "2"  # Offensive foul
        tracker.track_foul(offensive_foul)
        assert tracker.lineup_history[lineup_key].possessions_for == possessions + 2

    def test_shot_location_tracking(self, tracker):
        """Test tracking shot locations for shot charts"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        lineup_key = tracker.get_lineup_key("1612709903")
        
        # Add shot with location
        shot_with_location = SAMPLE_SHOT_MADE.copy()
        shot_with_location["LocationX"] = "100"
        shot_with_location["LocationY"] = "50"
        
        tracker.track_shot(shot_with_location)
        
        shot_data = tracker.lineup_history[lineup_key].shot_data[-1]
        assert shot_data["x"] == 100
        assert shot_data["y"] == 50
        assert shot_data["made"] is True

    def test_lineup_chemistry(self, tracker):
        """Test tracking which players work well together"""
        # Initialize two different lineups
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Track performance of player pair
        player1 = "1631131"
        player2 = "1641795"
        
        chemistry = tracker.get_player_pair_stats(player1, player2)
        assert "minutes_together" in chemistry
        assert "net_rating" in chemistry
        assert "ppp_together" in chemistry

    def test_hot_hand_detection(self, tracker):
        """Test detecting when a player is 'hot'"""
        player_id = "1631131"
        tracker.initialize_player_stint(player_id, "12:00")
        
        # Simulate making several shots in a row
        made_shot = SAMPLE_SHOT_MADE.copy()
        made_shot["Person_id"] = player_id
        
        for _ in range(3):  # Make 3 shots in a row
            tracker.track_shot(made_shot)
            
        assert tracker.is_player_hot(player_id) is True

    def test_lineup_fatigue(self, tracker):
        """Test tracking lineup fatigue based on time played"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Simulate lineup playing for 8 minutes straight
        tracker.update_lineup_time("8:00", "0:00")
        
        fatigue = tracker.get_lineup_fatigue("1612709903")
        assert fatigue > 0  # Should indicate some fatigue

    def test_momentum_shifts(self, tracker):
        """Test detecting momentum shifts in the game"""
        # Track series of events
        events = [
            (SAMPLE_SHOT_MADE, "1612709903"),  # Home team scores
            (SAMPLE_TURNOVER, "1612709924"),   # Away team turnover
            (SAMPLE_SHOT_MADE, "1612709903")   # Home team scores again
        ]
        
        for event, team_id in events:
            event["Team_id"] = team_id
            tracker.track_event(event)
            
        momentum = tracker.get_momentum_score()
        assert momentum["1612709903"] > momentum["1612709924"]

    def test_defensive_impact(self, tracker):
        """Test tracking defensive impact of lineups"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        lineup_key = tracker.get_lineup_key("1612709903")
        
        # Track defensive events
        tracker.track_block({"Person_id": "1631131"})
        tracker.track_steal({"Person_id": "1631131"})
        tracker.track_defensive_stop(lineup_key)
        
        defense = tracker.get_defensive_rating(lineup_key)
        assert "stops_percentage" in defense
        assert "opponent_fg_percentage" in defense

    def test_lineup_compatibility(self, tracker):
        """Test analyzing if players should play together"""
        player1 = "1631131"
        player2 = "1641795"
        
        compatibility = tracker.analyze_player_compatibility(player1, player2)
        assert "spacing_rating" in compatibility
        assert "defensive_rating" in compatibility
        assert "assist_chemistry" in compatibility

    def test_period_transition(self, tracker):
        """Test handling transition between periods"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # End of first period
        tracker.handle_period_end(1)
        
        # Start of second period
        new_lineup_home = INITIAL_LINEUP_HOME.copy()
        new_lineup_away = INITIAL_LINEUP_AWAY.copy()
        tracker.handle_period_start(2, new_lineup_home, new_lineup_away)
        
        # Verify stint times reset properly
        for player_id in tracker.player_stints:
            assert tracker.player_stints[player_id].period == 2

    def test_clutch_performance(self, tracker):
        """Test tracking performance in clutch situations"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Simulate clutch situation (last 5 minutes, close game)
        tracker.set_game_situation(period=4, game_clock="4:59", score_diff=3)
        
        # Track clutch shot
        clutch_shot = SAMPLE_SHOT_MADE.copy()
        tracker.track_shot(clutch_shot)
        
        clutch_stats = tracker.get_clutch_stats("1612709903")
        assert "clutch_fg_percentage" in clutch_stats
        assert "clutch_plus_minus" in clutch_stats

    def test_zone_detection(self, tracker):
        """Test detecting if team is playing zone defense"""
        tracker.initialize_lineups(INITIAL_LINEUP_HOME, INITIAL_LINEUP_AWAY)
        
        # Track defensive positions
        positions = [
            {"x": 100, "y": 50, "player_id": "1631131"},
            {"x": 150, "y": 50, "player_id": "1641795"},
            # ... more positions
        ]
        
        tracker.update_defensive_positions(positions)
        is_zone = tracker.detect_zone_defense("1612709903")
        assert isinstance(is_zone, bool)