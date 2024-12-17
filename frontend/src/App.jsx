import React, { useEffect, useState } from 'react';
import './App.css'; // Create this for layout and no scroll
import TopBanner from './components/TopBanner';

function App() {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [boxscoreData, setBoxscoreData] = useState(null);
  const [lineupsData, setLineupsData] = useState(null);
  const [pbpData, setPbpData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5002/snapshots')
      .then(res => res.json())
      .then(data => setSnapshots(data.snapshots || []))
      .catch(console.error);
  }, []);

  const handleSnapshotChange = (e) => {
    const snap = e.target.value;
    setSelectedSnapshot(snap);
    setSelectedGame('');
    setBoxscoreData(null);
    setLineupsData(null);
    setPbpData(null);

    if (snap) {
      fetch(`http://localhost:5002/games?snapshot=${snap}`)
        .then(res => res.json())
        .then(data => setGames(data.games || []))
        .catch(console.error);
    } else {
      setGames([]);
    }
  };

  const handleGameChange = (e) => {
    const gameId = e.target.value;
    setSelectedGame(gameId);
    setBoxscoreData(null);
    setLineupsData(null);
    setPbpData(null);

    if (gameId && selectedSnapshot) {
      // Fetch boxscore
      fetch(`http://localhost:5002/boxscore?snapshot=${selectedSnapshot}&game_id=${gameId}`)
        .then(res => res.json())
        .then(data => setBoxscoreData(data))
        .catch(console.error);

      // Fetch lineups
      fetch(`http://localhost:5002/lineups?snapshot=${selectedSnapshot}&game_id=${gameId}`)
        .then(res => res.json())
        .then(data => setLineupsData(data.lineups))
        .catch(console.error);

      // Fetch pbp
      fetch(`http://localhost:5002/pbp?snapshot=${selectedSnapshot}&game_id=${gameId}`)
        .then(res => res.json())
        .then(data => setPbpData(data.pbp))
        .catch(console.error);
    }
  };

  // Render UI
  // Layout (CSS Grid):
  // top: scoreboard
  // left: team A stats
  // right: team B stats
  // center: lineup or shot chart
  // bottom: run tracker

  // Determine teams and basic info from boxscoreData if available
  const teamA = boxscoreData?.teams?.[0]; // you'd structure boxscore JSON accordingly
  const teamB = boxscoreData?.teams?.[1];

  return (
    <div className="app-container">
      <div className="controls">
        <h1>In-Game Data Visualization</h1>
        <div>
          <label>Snapshot: </label>
          <select onChange={handleSnapshotChange} value={selectedSnapshot}>
            <option value="">--Select Snapshot--</option>
            {snapshots.map(snap => (
              <option key={snap} value={snap}>{snap}</option>
            ))}
          </select>
        </div>
        {selectedSnapshot && (
          <div>
            <label>Game: </label>
            <select onChange={handleGameChange} value={selectedGame}>
              <option value="">--Select Game--</option>
              {games.map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {boxscoreData && (
        <div className="grid-container">
          <TopBanner gameData={boxscoreData} />
          {/* Left Panel: Team A stats */}
          <div className="left-panel">
            <h2>{teamA?.team_name}</h2>
            {/* Display shooting efficiencies */}
            <div>FG%: {teamA?.fg_pct}</div>
            <div>3PT%: {teamA?.three_pct}</div>
            <div>FT%: {teamA?.ft_pct}</div>

            {/* Rebounds, turnovers, advanced stats */}
            <div>Reb: {teamA?.rebounds}</div>
            <div>TO: {teamA?.turnovers}</div>
            <div>Paint Pts: {teamA?.points_in_paint}</div>
            <div>Fast Break: {teamA?.fast_break_points}</div>

            {/* Player Efficiency Badges */}
            <h3>Key Players</h3>
            {teamA?.players?.slice(0,3).map(player => (
              <div key={player.person_id}>
                {player.first_name} {player.last_name}
                {/* Conditionally show badges */}
                {player.fg_pct > 0.5 && <span>🔥</span>}
                {player.fouls >= 3 && <span>⚠️</span>}
              </div>
            ))}
          </div>

          {/* Center: Lineup or Shot Chart */}
          <div className="center-area">
            {/* If you choose lineup visualization */}
            {lineupsData && (
              <div className="lineup-visual">
                <h3>On-Court Lineup</h3>
                {/* A simple text representation, later replaced with a half-court diagram */}
                <ul>
                  {lineupsData.currentLineupTeamA?.map(p => (
                    <li key={p.person_id}>{p.jersey_number} {p.last_name}</li>
                  ))}
                  <br />
                  {lineupsData.currentLineupTeamB?.map(p => (
                    <li key={p.person_id}>{p.jersey_number} {p.last_name}</li>
                  ))}
                </ul>
                <p>Stint Duration: {lineupsData.stint_duration}s</p>
                <p>Stint +/-: {lineupsData.stint_plusminus}</p>
              </div>
            )}

            {/* If you choose shot chart instead:
               Replace the above with a zone efficiency display */}
            {/* Example:
            {pbpData && (
              <div className="shot-chart">
                <h3>Shot Chart (Zone)</h3>
                <div>Paint: SDC {pbpData.sdc_paint_pct}% vs SLC {pbpData.slc_paint_pct}%</div>
                <div>Midrange: SDC {pbpData.sdc_mid_pct}% vs SLC {pbpData.slc_mid_pct}%</div>
                <div>3PT: SDC {pbpData.sdc_three_pct}% vs SLC {pbpData.slc_three_pct}%</div>
              </div>
            )}
            */}
          </div>

          {/* Right Panel: Team B stats */}
          <div className="right-panel">
            <h2>{teamB?.team_name}</h2>
            <div>FG%: {teamB?.fg_pct}</div>
            <div>3PT%: {teamB?.three_pct}</div>
            <div>FT%: {teamB?.ft_pct}</div>
            <div>Reb: {teamB?.rebounds}</div>
            <div>TO: {teamB?.turnovers}</div>
            <div>Paint Pts: {teamB?.points_in_paint}</div>
            <div>Fast Break: {teamB?.fast_break_points}</div>

            <h3>Key Players</h3>
            {teamB?.players?.slice(0,3).map(player => (
              <div key={player.person_id}>
                {player.first_name} {player.last_name}
                {player.fg_pct > 0.5 && <span>🔥</span>}
                {player.fouls >= 3 && <span>⚠️</span>}
              </div>
            ))}
          </div>

          {/* Bottom: Momentum/Run Tracker */}
          <div className="bottom-tracker">
            <h4>Run Tracker</h4>
            {/* Simple placeholder: e.g., "Longest Run: ... " */}
            <p>Longest Run: {pbpData?.longest_run_team} {pbpData?.longest_run_points}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
