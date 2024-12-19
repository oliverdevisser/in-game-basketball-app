import React, { useEffect, useState } from 'react';
import './App.css'; // Uses the same CSS provided
import TopBanner from './components/TopBanner';
import TeamPanel from './components/TeamPanel';
import LineupVisual from './components/LineupVisual';

function App() {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [boxscoreData, setBoxscoreData] = useState(null);
  const [lineupsData, setLineupsData] = useState(null);
  const [pbpData, setPbpData] = useState(null);

  const [showFullScreen, setShowFullScreen] = useState(false);

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
        .then(data => {
          setBoxscoreData(data);
          if (data && data.game_info) {
            setShowFullScreen(true);
          }
        })
        .catch(console.error);

      // Fetch lineups
      fetch(`http://localhost:5002/lineups?snapshot=${selectedSnapshot}&game_id=${gameId}`)
        .then(res => res.json())
        .then(data => {
          console.log('Lineup data received:', data); // Debug log
          setLineupsData(data.lineups); // Note: we're setting data.lineups directly
        })
        .catch(console.error);

      // Fetch pbp
      fetch(`http://localhost:5002/pbp?snapshot=${selectedSnapshot}&game_id=${gameId}`)
        .then(res => res.json())
        .then(data => setPbpData(data))
        .catch(console.error);
    }
  };

  const teamA = boxscoreData?.teams?.[0];
  const teamB = boxscoreData?.teams?.[1];

  return (
    <div className="app-container">
      {!showFullScreen && (
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
      )}

      {showFullScreen && boxscoreData && (
        <div className="grid-container">
          <TopBanner gameData={boxscoreData} />
          <TeamPanel 
            teamData={teamA} 
            onPlayerSelect={(playerId, selected) => {
              console.log(`Player ${playerId} ${selected ? 'selected' : 'unselected'}`);
            }}
          />
          <div className="center-area">
            {lineupsData && (
              <LineupVisual 
                lineupsData={lineupsData}
                snapshot={selectedSnapshot}
                gameId={selectedGame}
              />
            )}
          </div>
          <TeamPanel 
            teamData={teamB}
            onPlayerSelect={(playerId, selected) => {
              console.log(`Player ${playerId} ${selected ? 'selected' : 'unselected'}`);
            }}
          />
          {/* If you implement a bottom tracker later, you can place it here */}
        </div>
      )}
    </div>
  );
}

export default App;
