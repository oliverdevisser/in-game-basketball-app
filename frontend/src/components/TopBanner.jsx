import React from 'react';
import './TopBanner.css';

const TopBanner = ({ gameData }) => {
  const { teams, current_period, game_clock } = gameData;
  const [teamA, teamB] = teams || [];

  const getTimeoutDisplay = (team) => {
    const full = team?.full_timeouts || 0;
    const short = team?.short_timeouts || 0;
    return `TO: ${full + short}`;
  };

  const getFoulDisplay = (team) => {
    const fouls = team?.current_quarter_fouls || 0;
    const bonusStatus = team?.bonus_status;
    return (
      <div className="foul-status">
        <span className="team-stat">Fouls: {fouls}</span>
        {bonusStatus && <span className={`bonus-indicator ${bonusStatus === 'Bonus+' ? 'bonus-plus' : 'bonus'}`}>
          {bonusStatus}
        </span>}
      </div>
    );
  };

  return (
    <div className="top-banner">
      <div className="scoreboard">
        {/* Team A */}
        <div className="team-section">
          <div className="team-info">
            <div className="team-name-row">
              <span className="team-name">{teamA?.team_name}</span>
              {teamA?.technical_fouls > 0 && <span className="foul-indicator technical">T</span>}
              {teamA?.flagrant_fouls > 0 && <span className="foul-indicator flagrant">F</span>}
            </div>
            <div className="team-stats-row">
              {getFoulDisplay(teamA)}
              <span className="team-stat">{getTimeoutDisplay(teamA)}</span>
            </div>
          </div>
          <div className="score">{teamA?.points}</div>
        </div>

        {/* Game Info */}
        <div className="game-info">
          <div className="period">Q{current_period}</div>
          <div className="game-clock">{game_clock}</div>
          <div className="possession-arrow">⟩</div>
        </div>

        {/* Team B */}
        <div className="team-section">
          <div className="score">{teamB?.points}</div>
          <div className="team-info">
            <div className="team-name-row">
              <span className="team-name">{teamB?.team_name}</span>
              {teamB?.technical_fouls > 0 && <span className="foul-indicator technical">T</span>}
              {teamB?.flagrant_fouls > 0 && <span className="foul-indicator flagrant">F</span>}
            </div>
            <div className="team-stats-row">
              {getFoulDisplay(teamB)}
              <span className="team-stat">{getTimeoutDisplay(teamB)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBanner; 