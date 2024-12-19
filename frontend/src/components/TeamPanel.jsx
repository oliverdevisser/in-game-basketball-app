import React from 'react';
import './TeamPanel.css';

const TeamPanel = ({ teamData, onPlayerSelect }) => {
  // Helper function to determine player icons
  const getPlayerIcons = (player) => {
    const icons = [];
    
    // Hot shooter icon (FG% > 50% with min 5 attempts)
    if (player.fg_pct > 0.5 && player.fg_attempted >= 5) {
      icons.push("🔥");
    }
    
    // Rebounder icon (5+ rebounds)
    if (player.total_rebounds >= 5) {
      icons.push("💪");
    }
    
    // Foul trouble icon
    if (player.fouls >= 4) {
      icons.push("⚠️");
    }
    
    // Playmaker icon (5+ assists)
    if (player.assists >= 5) {
      icons.push("👀");
    }

    return icons.join('');
  };

  // Sort players by minutes played
  const sortedPlayers = [...(teamData.players || [])].sort((a, b) => 
    (b.minutes * 60 + b.seconds) - (a.minutes * 60 + a.seconds)
  );

  return (
    <div className="team-panel">
      <div className="box-score-container">
        <table className="box-score-table">
          <thead>
            <tr>
              <th className="checkbox-col"></th>
              <th className="number-col">#</th>
              <th className="stat-col">MIN</th>
              <th className="stat-col">PTS</th>
              <th className="stat-col">AST</th>
              <th className="stat-col">REB</th>
              <th className="stat-col">F</th>
              <th className="stat-col">FG%</th>
              <th className="stat-col">+/-</th>
            </tr>
          </thead>
          <tbody>
            {/* Team Totals Row */}
            <tr className="team-totals">
              <td></td>
              <td>Team</td>
              <td>-</td>
              <td>{teamData.points}</td>
              <td>{teamData.assists}</td>
              <td>{teamData.rebounds}</td>
              <td>{teamData.team_fouls}</td>
              <td>{(teamData.fg_pct * 100).toFixed(1)}</td>
              <td>-</td>
            </tr>
            {/* Player Rows */}
            {sortedPlayers.map(player => (
              <tr key={player.person_id} className={player.oncourt ? 'on-court' : ''}>
                <td className="checkbox-col">
                  <input 
                    type="checkbox" 
                    onChange={(e) => onPlayerSelect(player.person_id, e.target.checked)}
                  />
                </td>
                <td className="number-col" title={`${player.first_name} ${player.last_name}`}>
                  {player.jersey_number}{getPlayerIcons(player)}
                </td>
                <td>{player.minutes}:{String(player.seconds).padStart(2, '0')}</td>
                <td>{player.points}</td>
                <td>{player.assists}</td>
                <td>{player.total_rebounds}</td>
                <td className={player.fouls >= 4 ? 'foul-warning' : ''}>{player.fouls}</td>
                <td>{((player.fg_made / player.fg_attempted) * 100 || 0).toFixed(1)}</td>
                <td className={player.plusminus > 0 ? 'positive' : player.plusminus < 0 ? 'negative' : ''}>
                  {player.plusminus > 0 ? `+${player.plusminus}` : player.plusminus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamPanel; 