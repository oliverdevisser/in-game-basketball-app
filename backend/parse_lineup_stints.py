from lxml import etree
import os
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
from pathlib import Path

# Define data root path - going up one directory from backend to find data folder
DATA_ROOT = Path(__file__).parent.parent / "data"
print(f"Data root path: {DATA_ROOT}")  # Debug print to verify path

# Data Classes for Type Hints
@dataclass
class PlayerStint:
    """
    Track individual player stint statistics
    """
    player_id: str
    start_time: str
    period: int
    end_time: Optional[str] = None
    plus_minus: int = 0
    fg_made: int = 0
    fg_attempted: int = 0
    turnovers: int = 0
    fouls: int = 0
    duration: float = 0

@dataclass
class LineupStats:
    """
    Track statistics for a specific 5-player lineup
    """
    players: Set[str]
    points_for: int = 0
    points_against: int = 0
    possessions_for: int = 0
    possessions_against: int = 0
    minutes_played: float = 0
    shot_data: List[Dict] = field(default_factory=list)

@dataclass
class TeamStats:
    """
    Track overall team statistics
    """
    team_id: str
    points: int = 0
    possessions: int = 0
    fg_made: int = 0
    fg_attempted: int = 0
    current_lineup: Set[str] = field(default_factory=set)

class LineupTracker:
    def __init__(self, game_id: str, snapshot: str, home_team_id: str, away_team_id: str, verbose: bool = False):
        self.game_id = game_id
        self.snapshot = snapshot
        self.home_team_id = home_team_id
        self.away_team_id = away_team_id
        self.verbose = verbose  # Add verbose flag
        
        # Core tracking dictionaries
        self.current_lineups: Dict[str, Set[str]] = {
            home_team_id: set(),
            away_team_id: set()
        }
        
        # Historical tracking
        self.lineup_history: Dict[str, LineupStats] = {}
        self.player_stint_history: Dict[str, List[PlayerStint]] = {}
        self.player_stints: Dict[str, PlayerStint] = {}  # Current stints
        
        # Team stats
        self.team_stats: Dict[str, TeamStats] = {
            home_team_id: TeamStats(home_team_id),
            away_team_id: TeamStats(away_team_id)
        }
        
        # Game state
        self.current_period: int = 1
        self.current_game_clock: str = "12:00"
        self.current_run: Dict[str, int] = {
            home_team_id: 0,
            away_team_id: 0
        }

    @staticmethod
    def clock_to_seconds(clock_str: str) -> float:
        """Convert game clock string to seconds"""
        try:
            if ':' in clock_str:
                m, s = clock_str.split(':')
                return int(m) * 60 + float(s)
            return float(clock_str)
        except:
            return 0

    def initialize_player_stint(self, player_id: str, game_clock: str, period: int) -> None:
        """
        Start tracking a new stint for a player when they enter the game
        
        Args:
            player_id: Player's unique identifier
            game_clock: Current game clock time (MM:SS)
            period: Current period number
        """
        self.player_stints[player_id] = PlayerStint(
            player_id=player_id,
            start_time=game_clock,
            period=period
        )

    def end_player_stint(self, player_id: str, game_clock: str) -> None:
        """
        End a player's current stint and store it in history
        
        Args:
            player_id: Player's unique identifier
            game_clock: Time player exited game
        """
        if player_id in self.player_stints:
            stint = self.player_stints[player_id]
            stint.end_time = game_clock
            stint.duration = self.clock_to_seconds(stint.start_time) - self.clock_to_seconds(game_clock)
            
            if player_id not in self.player_stint_history:
                self.player_stint_history[player_id] = []
            self.player_stint_history[player_id].append(stint)
            del self.player_stints[player_id]

    def get_lineup_key(self, team_id: str) -> str:
        """
        Generate a consistent key for a lineup regardless of player order
        
        Args:
            team_id: Team identifier
            
        Returns:
            Sorted string of player IDs joined by '-'
        """
        players = sorted(list(self.current_lineups[team_id]))
        return f"{team_id}-{'_'.join(players)}"

    def update_lineup_tracking(self, team_id: str, player_in_id: str, player_out_id: str, game_clock: str) -> None:
        """
        Update lineup tracking when substitution occurs
        
        Args:
            team_id: Team making substitution
            player_in_id: Player entering game
            player_out_id: Player leaving game
            game_clock: Current game clock
        """
        # Update current lineup
        self.current_lineups[team_id].remove(player_out_id)
        self.current_lineups[team_id].add(player_in_id)
        
        # Get or create lineup stats
        lineup_key = self.get_lineup_key(team_id)
        if lineup_key not in self.lineup_history:
            self.lineup_history[lineup_key] = LineupStats(
                players=self.current_lineups[team_id].copy()
            )

    def track_points_scored(self, team_id: str, points: int, opponent_id: str) -> None:
        """
        Track points scored and update run counter
        
        Args:
            team_id: Scoring team's ID
            points: Number of points scored
            opponent_id: Opposing team's ID
        """
        # Update run counter
        self.current_run[team_id] += points
        self.current_run[opponent_id] = 0
        
        # Update lineup stats
        lineup_key = self.get_lineup_key(team_id)
        opp_lineup_key = self.get_lineup_key(opponent_id)
        
        self.lineup_history[lineup_key].points_for += points
        self.lineup_history[opp_lineup_key].points_against += points

    def calculate_lineup_efficiency(self, lineup_key: str) -> Dict[str, float]:
        """
        Calculate efficiency metrics for a lineup
        
        Args:
            lineup_key: Unique lineup identifier
            
        Returns:
            Dict containing PPP (points per possession) and 
            PAPP (points allowed per possession)
        """
        stats = self.lineup_history[lineup_key]
        ppp = stats.points_for / stats.possessions_for if stats.possessions_for > 0 else 0
        papp = stats.points_against / stats.possessions_against if stats.possessions_against > 0 else 0
        
        return {
            "ppp": ppp,
            "papp": papp,
            "net_rating": ppp - papp
        }

    def initialize_from_files(self) -> None:
        """Initialize tracker with starting lineups"""
        # Get current period from boxscore
        boxscore = self.load_boxscore()
        self.current_period = int(boxscore.get("current_period", "1"))
        
        # Load initial lineups
        lineups = self.load_lineups()
        
        # Track all players that appear in lineups
        all_players = set()
        for team_id, team_data in lineups.items():
            for player in team_data["players"]:
                all_players.add(player["person_id"])
                
        # Initialize stint history for all players
        for player_id in all_players:
            if player_id not in self.player_stint_history:
                self.player_stint_history[player_id] = []
                
        # Initialize current lineups
        for team_id, team_data in lineups.items():
            current_players = set()
            for player in team_data["players"]:
                if player.get("on_court"):
                    player_id = player["person_id"]
                    current_players.add(player_id)
                    # Initialize stint for players on court
                    self.initialize_player_stint(player_id, "12:00", self.current_period)
                    
            self.current_lineups[team_id] = current_players

    def _load_roster_lineup(self) -> Optional[Dict]:
        """Load and parse roster_lineup.xml"""
        snapshot_dir = self.snapshot.lower().replace(' ', '_')
        filename = f"{self.game_id}_roster_lineup.xml"
        file_path = DATA_ROOT / "pbp_snap_shot" / snapshot_dir / filename
        
        if not file_path.exists():
            print(f"Roster file not found: {file_path}")
            return None
        
        try:
            tree = etree.parse(str(file_path))
            root = tree.getroot()
            
            # Get initial lineup for current period
            lineups = root.xpath(".//Msg_game_lineup")
            if not lineups:
                print("No lineup data found")
                return None
            
            current_lineup = lineups[-1]  # Get most recent lineup
            
            # Initialize home team lineup
            home_players = [
                current_lineup.get("Home_guard_1_id"),
                current_lineup.get("Home_guard_2_id"),
                current_lineup.get("Home_forward_1_id"),
                current_lineup.get("Home_forward_2_id"),
                current_lineup.get("Home_center_id")
            ]
            
            # Initialize away team lineup
            away_players = [
                current_lineup.get("Visitor_guard_1_id"),
                current_lineup.get("Visitor_guard_2_id"),
                current_lineup.get("Visitor_forward_1_id"),
                current_lineup.get("Visitor_forward_2_id"),
                current_lineup.get("Visitor_center_id")
            ]
            
            # Store current lineups
            self.current_lineups[self.home_team_id] = {pid for pid in home_players if pid}
            self.current_lineups[self.away_team_id] = {pid for pid in away_players if pid}
            
            print("\nInitial Lineups:")
            print(f"Home Team ({self.home_team_id}): {self.current_lineups[self.home_team_id]}")
            print(f"Away Team ({self.away_team_id}): {self.current_lineups[self.away_team_id]}")
            
            # Initialize stint tracking for all players
            period_start = "12:00" if self.current_period <= 4 else "5:00"
            
            for player_id in self.current_lineups[self.home_team_id]:
                self.initialize_player_stint(player_id, period_start, self.current_period)
                print(f"Initialized stint for home player: {player_id}")
            
            for player_id in self.current_lineups[self.away_team_id]:
                self.initialize_player_stint(player_id, period_start, self.current_period)
                print(f"Initialized stint for away player: {player_id}")
            
            return {"success": True}
            
        except Exception as e:
            print(f"Error loading roster file: {e}")
            return None

    def _load_boxscore(self) -> Optional[Dict]:
        """Load and parse boxscore.xml for current game state"""
        snapshot_dir = self.snapshot.lower().replace(' ', '_')
        filename = f"{self.game_id}_boxscore.xml"
        file_path = DATA_ROOT / "pbp_snap_shot" / snapshot_dir / filename
        
        if not file_path.exists():
            print(f"Boxscore file not found: {file_path}")
            return None
        
        try:
            tree = etree.parse(str(file_path))
            root = tree.getroot()
            
            # Get current period and game clock
            period_info = root.xpath(".//Period_time")[0]
            self.current_period = int(period_info.get("Period", "1"))
            self.current_game_clock = period_info.get("Game_clock", "12:00")
            
            print(f"\nGame State from Boxscore:")
            print(f"Period: {self.current_period}")
            print(f"Game Clock: {self.current_game_clock}")
            
            return {"success": True}
            
        except Exception as e:
            print(f"Error loading boxscore file: {e}")
            return None

    def process_pbp_events(self):
        """Process play-by-play events to track lineups and stats"""
        events = self.load_pbp_events()
        
        for event in events:
            # Update game clock
            self.current_game_clock = event.get("Game_clock", self.current_game_clock)
            
            msg_type = event.get("Msg_type")
            team_id = event.get("Team_id")
            player_id = event.get("Person_id")
            
            # Initialize player if not seen before
            if player_id and player_id not in self.player_stint_history:
                self.player_stint_history[player_id] = []
                
            # Process event based on type
            if msg_type == "8":  # Substitution
                player_in_id = event.get("Person1")
                player_out_id = event.get("Person2")
                
                # Initialize players if not seen before
                for pid in [player_in_id, player_out_id]:
                    if pid and pid not in self.player_stint_history:
                        self.player_stint_history[pid] = []
                        
                self._handle_substitution(team_id, player_in_id, player_out_id)

    def _handle_substitution(self, team_id: str, player_in_id: str, player_out_id: str) -> None:
        """Handle substitution event"""
        # End stint for player going out
        self.end_player_stint(player_out_id, self.current_game_clock)
        
        # Start stint for player coming in
        self.initialize_player_stint(player_in_id, self.current_game_clock, self.current_period)
        
        # Update lineup tracking
        self.update_lineup_tracking(team_id, player_in_id, player_out_id, self.current_game_clock)

    def _handle_made_shot(self, event: etree._Element) -> None:
        """Handle made shot event"""
        try:
            team_id = event.get("Team_id")
            player_id = event.get("Person_id")
            points = int(event.get("Pts", "2"))
            opponent_id = self.away_team_id if team_id == self.home_team_id else self.home_team_id
            
            # Update player stats
            if player_id in self.player_stints:
                self.player_stints[player_id].fg_made += 1
                self.player_stints[player_id].fg_attempted += 1
            
            # Get lineup keys
            scoring_lineup_key = self.get_lineup_key(team_id)
            opposing_lineup_key = self.get_lineup_key(opponent_id)
            
            # Ensure both lineups exist in history
            if scoring_lineup_key not in self.lineup_history:
                self.lineup_history[scoring_lineup_key] = LineupStats(
                    players=self.current_lineups[team_id].copy()
                )
            if opposing_lineup_key not in self.lineup_history:
                self.lineup_history[opposing_lineup_key] = LineupStats(
                    players=self.current_lineups[opponent_id].copy()
                )
            
            # Update lineup stats
            self.lineup_history[scoring_lineup_key].points_for += points
            self.lineup_history[opposing_lineup_key].points_against += points
            self.lineup_history[scoring_lineup_key].possessions_for += 1
            
            # Update run counter
            self.current_run[team_id] += points
            self.current_run[opponent_id] = 0
            
            if self.verbose:
                print(f"Made shot by {player_id} ({points} points)")
                print(f"Current run - {team_id}: {self.current_run[team_id]}")
            
        except Exception as e:
            if self.verbose:
                print(f"Error handling made shot: {e}")

    def _handle_missed_shot(self, event: etree._Element) -> None:
        """Handle missed shot event"""
        team_id = event.get("Team_id")
        player_id = event.get("Person_id")
        
        # Update player stats - increment attempts only
        if player_id in self.player_stints:
            self.player_stints[player_id].fg_attempted += 1
        
        # Update possession counter
        lineup_key = self.get_lineup_key(team_id)
        if lineup_key in self.lineup_history:
            self.lineup_history[lineup_key].possessions_for += 1
            if self.verbose:
                print(f"Possession ended - missed shot by {player_id}")

    def _handle_turnover(self, event: etree._Element) -> None:
        """Handle turnover event"""
        team_id = event.get("Team_id")
        player_id = event.get("Person_id")
        
        # Update player stats
        if player_id in self.player_stints:
            self.player_stints[player_id].turnovers += 1
            if self.verbose:
                print(f"Turnover by {player_id}")
        
        # Update possession counter
        lineup_key = self.get_lineup_key(team_id)
        if lineup_key in self.lineup_history:
            self.lineup_history[lineup_key].possessions_for += 1

    def _handle_foul(self, event: etree._Element) -> None:
        """Handle foul event"""
        team_id = event.get("Team_id")
        player_id = event.get("Person_id")
        action_type = event.get("Action_type")
        
        # Update player stats
        if player_id in self.player_stints:
            self.player_stints[player_id].fouls += 1
            if self.verbose:
                print(f"Foul by {player_id} (Type: {action_type})")

    # Add methods for part 3 - Efficiency Calculations

    def calculate_all_lineup_efficiencies(self) -> Dict[str, Dict[str, float]]:
        """
        Calculate efficiency metrics for all lineups
        
        Returns:
            Dict mapping lineup_key to efficiency metrics
        """
        efficiencies = {}
        for lineup_key in self.lineup_history:
            efficiencies[lineup_key] = self.calculate_lineup_efficiency(lineup_key)
            if self.verbose:
                print(f"\nEfficiency metrics for lineup {lineup_key}:")
                print(f"PPP: {efficiencies[lineup_key]['ppp']:.2f}")
                print(f"PAPP: {efficiencies[lineup_key]['papp']:.2f}")
                print(f"Net Rating: {efficiencies[lineup_key]['net_rating']:.2f}")
        
        return efficiencies

    def rank_lineups_by_metric(self, metric: str = "net_rating", min_possessions: int = 5) -> List[Tuple[str, float]]:
        """
        Rank all lineups by specified metric
        
        Args:
            metric: Metric to rank by ('net_rating', 'ppp', or 'papp')
            min_possessions: Minimum possessions for lineup to be included
            
        Returns:
            List of (lineup_key, metric_value) tuples, sorted by metric
        """
        ranked_lineups = []
        
        for lineup_key, lineup in self.lineup_history.items():
            # Check minimum possession requirement
            if lineup.possessions_for < min_possessions:
                continue
            
            efficiency = self.calculate_lineup_efficiency(lineup_key)
            ranked_lineups.append((lineup_key, efficiency[metric]))
        
        # Sort by metric value (descending)
        ranked_lineups.sort(key=lambda x: x[1], reverse=True)
        
        if self.verbose:
            print(f"\nLineups ranked by {metric}:")
            for lineup_key, value in ranked_lineups[:5]:  # Show top 5
                print(f"Lineup: {lineup_key}, {metric}: {value:.2f}")
        
        return ranked_lineups

    def calculate_total_minutes(self, player_id: str) -> str:
        """Calculate total minutes played across all stints"""
        total_seconds = sum(
            self.clock_to_seconds(stint.start_time) - self.clock_to_seconds(stint.end_time or self.current_game_clock)
            for stint in self.player_stint_history.get(player_id, [])
        )
        minutes = int(total_seconds // 60)
        seconds = int(total_seconds % 60)
        return f"{minutes}:{seconds:02d}"

    def generate_lineup_report(self) -> Dict:
        """Generate comprehensive lineup report"""
        efficiencies = self.calculate_all_lineup_efficiencies()
        
        # Ensure all players have stats
        all_players = set()
        for team_id, players in self.current_lineups.items():
            all_players.update(players)
        
        return {
            "currentLineups": self.current_lineups,
            "lineupStats": {
                # ... existing lineup stats ...
            },
            "playerStats": {
                player_id: {
                    "currentStint": self.get_current_stint_stats(player_id),
                    "totalStats": self.get_total_stats(player_id)
                }
                for player_id in all_players  # Use all_players instead of player_stint_history
            },
            "currentRun": self.current_run
        }

    def print_event_summary(self, event: etree._Element) -> None:
        """Print detailed summary of event processing"""
        if not self.verbose:
            return
        
        event_type = event.get("Msg_type")
        game_clock = event.get("Game_clock")
        team_id = event.get("Team_id")
        
        print(f"\nProcessing Event:")
        print(f"Time: {game_clock}")
        print(f"Team: {team_id}")
        
        if event_type == "8":  # Substitution
            print(f"Type: Substitution")
            print(f"Player Out: {event.get('Person_id')} ({event.get('Last_name')})")
            print(f"Player In: {event.get('Person_id2')} ({event.get('Last_name2')})")
            
        elif event_type in ["1", "2"]:  # Shot
            print(f"Type: {'Made' if event_type == '1' else 'Missed'} Shot")
            print(f"Player: {event.get('Person_id')} ({event.get('Last_name')})")
            if event_type == "1":
                print(f"Points: {event.get('Pts')}")
                
        elif event_type == "5":  # Turnover
            print(f"Type: Turnover")
            print(f"Player: {event.get('Person_id')} ({event.get('Last_name')})")
            
        elif event_type == "6":  # Foul
            print(f"Type: Foul")
            print(f"Player: {event.get('Person_id')} ({event.get('Last_name')})")

    def print_lineup_summary(self) -> None:
        """Print summary of current lineups and their stats"""
        if not self.verbose:
            return
        
        print("\nCurrent Lineup Summary:")
        for team_id, players in self.current_lineups.items():
            print(f"\nTeam {team_id}:")
            print("Players on court:")
            for player_id in players:
                stint = self.player_stints.get(player_id)
                if stint:
                    print(f"  {player_id}: +/-={stint.plus_minus}, FGM/A={stint.fg_made}/{stint.fg_attempted}")
                    
            lineup_key = self.get_lineup_key(team_id)
            if lineup_key in self.lineup_history:
                stats = self.lineup_history[lineup_key]
                print(f"Lineup Stats:")
                print(f"  Points For: {stats.points_for}")
                print(f"  Points Against: {stats.points_against}")
                print(f"  Possessions: {stats.possessions_for}")

    def print_efficiency_summary(self) -> None:
        """Print detailed efficiency metrics for all lineups"""
        if not self.verbose:
            return
        
        print("\nLineup Efficiency Summary:")
        efficiencies = self.calculate_all_lineup_efficiencies()
        
        for lineup_key, metrics in efficiencies.items():
            print(f"\nLineup: {lineup_key}")
            stats = self.lineup_history[lineup_key]
            print(f"Minutes: {stats.minutes_played:.1f}")
            print(f"Points For/Against: {stats.points_for}/{stats.points_against}")
            print(f"Possessions For/Against: {stats.possessions_for}/{stats.possessions_against}")
            print(f"PPP: {metrics['ppp']:.2f}")
            print(f"PAPP: {metrics['papp']:.2f}")
            print(f"Net Rating: {metrics['net_rating']:.2f}")

    # Add these methods to the LineupTracker class

    def verify_with_pbp(self) -> None:
        """Verify our tracking matches the play-by-play data"""
        if not self.verbose:
            return
        
        print("\nVerification with PBP Data:")
        print("==========================")
        
        # Load PBP file
        snapshot_dir = self.snapshot.lower().replace(' ', '_')
        filename = f"{self.game_id}_pbp_Q{self.current_period}.xml"
        file_path = DATA_ROOT / "pbp_snap_shot" / snapshot_dir / filename
        
        tree = etree.parse(str(file_path))
        root = tree.getroot()
        
        # Track actual scores
        actual_scores = {
            self.home_team_id: 0,
            self.away_team_id: 0
        }
        
        for event in root.xpath(".//Event_pbp"):
            if event.get("Msg_type") == "1":  # Made shot
                team_id = event.get("Team_id")
                points = int(event.get("Pts", "2"))
                actual_scores[team_id] += points
        
        # Compare with our tracking
        print("\nScoring Comparison:")
        for team_id in [self.home_team_id, self.away_team_id]:
            tracked_points = sum(
                stats.points_for 
                for key, stats in self.lineup_history.items() 
                if key.startswith(team_id)
            )
            print(f"\nTeam {team_id}:")
            print(f"Actual points from PBP: {actual_scores[team_id]}")
            print(f"Tracked points: {tracked_points}")
            if actual_scores[team_id] != tracked_points:
                print("WARNING: Point tracking mismatch!")

    def verify_lineup_changes(self) -> None:
        """Verify all lineup changes were tracked correctly"""
        if not self.verbose:
            return
        
        print("\nLineup Change Verification:")
        print("=========================")
        
        # Check all lineups have 5 players
        for team_id, players in self.current_lineups.items():
            print(f"\nTeam {team_id} current lineup size: {len(players)}")
            if len(players) != 5:
                print(f"WARNING: Invalid lineup size for {team_id}")
                print(f"Current players: {players}")
        
        # Check all lineup keys in history are valid
        for lineup_key in self.lineup_history:
            team_id = lineup_key.split('-')[0]
            players = lineup_key.split('-')[1].split('_')
            print(f"\nLineup {lineup_key}:")
            print(f"Number of players: {len(players)}")
            if len(players) != 5:
                print(f"WARNING: Invalid number of players in key")
                print(f"Players: {players}")

    def verify_possessions(self) -> None:
        """Verify possession counts are accurate"""
        if not self.verbose:
            return
        
        print("\nPossession Verification:")
        print("======================")
        
        for lineup_key, stats in self.lineup_history.items():
            points = stats.points_for
            poss = stats.possessions_for
            if poss > 0:
                ppp = points/poss
                print(f"\nLineup {lineup_key}:")
                print(f"Points: {points}")
                print(f"Possessions: {poss}")
                print(f"Points per possession: {ppp:.2f}")
                if ppp > 3:
                    print("WARNING: Unusually high points per possession")
                if poss > 50:
                    print("WARNING: Unusually high possession count")

    def run_all_verifications(self) -> None:
        """Run all verification checks"""
        print("\nRunning All Verifications")
        print("========================")
        self.verify_with_pbp()
        self.verify_lineup_changes()
        self.verify_possessions()

    def calculate_stint_duration(self, start_time: str, current_time: str) -> str:
        """Calculate duration of current stint in MM:SS format"""
        start_seconds = self.clock_to_seconds(start_time)
        current_seconds = self.clock_to_seconds(current_time)
        
        # Calculate duration in seconds
        duration_seconds = start_seconds - current_seconds
        
        # Convert to MM:SS format
        minutes = int(duration_seconds // 60)
        seconds = int(duration_seconds % 60)
        
        return f"{minutes}:{seconds:02d}"

# Add this method to create a new tracker instance and initialize it
def create_lineup_tracker(game_id: str, snapshot: str, home_team_id: str, away_team_id: str, verbose: bool = False) -> LineupTracker:
    """
    Create and initialize a new LineupTracker instance
    
    Args:
        game_id: Game identifier
        snapshot: Snapshot name
        home_team_id: Home team identifier
        away_team_id: Away team identifier
    
    Returns:
        Initialized LineupTracker instance
    """
    tracker = LineupTracker(game_id, snapshot, home_team_id, away_team_id, verbose)
    tracker.initialize_from_files()
    return tracker

"""
   
2. Process Play-by-Play Events:
   for each event in pbp_xml:
       if event is substitution:
           - End stint for player going out
           - Start stint for player coming in
           - Update lineup tracking
           - Check if new lineup exists in history
           
       if event is made shot:
           - Update player stats (FGM, FGA)
           - Update lineup points
           - Update run counter
           - Update possession counter
           
       if event is missed shot:
           - Update player stats (FGA)
           
       if event is turnover:
           - Update player stats
           - Update possession counter
           
       if event is foul:
           - Update player stats
           
3. Calculate Efficiency:
   for each lineup in lineup_history:
       - Calculate PPP
       - Calculate PAPP
       - Calculate net rating
       - Store metrics for ranking
       
4. Generate Output:
   return {
       "currentLineups": {team_id: current players},
       "lineupStats": {lineup_key: efficiency metrics},
       "playerStints": {player_id: stint history},
       "currentRun": {team_id: points streak}
   }
"""


# Test implementation of part 1
if __name__ == "__main__":
    print("\nTesting Lineup Tracking Implementation")
    print("=====================================")
    
    # Create and initialize tracker
    tracker = create_lineup_tracker(
        game_id="2052400190",
        snapshot="middle_of_third",
        home_team_id="1612709903",
        away_team_id="1612709924",
        verbose=True
    )
    
    # Process events and track lineups
    print("\nStep 2: Processing Play-by-Play Events")
    print("=====================================")
    tracker.process_pbp_events()
    
    # Calculate and display efficiency metrics
    print("\nStep 3: Calculating Lineup Efficiencies")
    print("=====================================")
    efficiencies = tracker.calculate_all_lineup_efficiencies()
    
    # Generate final report
    print("\nFinal Report")
    print("===========")
    report = tracker.generate_lineup_report()
    
    print("\nSummary Statistics:")
    print(f"Number of lineups tracked: {len(report['lineupStats'])}")
    print(f"Number of players with stint data: {len(report['playerStats'])}")
    print(f"Current scoring runs: {report['currentRun']}")

    tracker.run_all_verifications()