import React from 'react';
import './TopBanner.css';

const TopBanner = ({ gameData }) => {
  const { teams } = gameData;
  const [teamA, teamB] = teams || [];

  const getTimeoutDisplay = (team) => {
    const full = team?.full_timeouts || 0;
    const short = team?.short_timeouts || 0;
    return `TO: ${full + short}`;  // Sum of full and short timeouts
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
              <span className="team-stat">Fouls: {teamA?.team_fouls}</span>
              <span className="team-stat">{getTimeoutDisplay(teamA)}</span>
            </div>
          </div>
          <div className="score">{teamA?.points}</div>
        </div>

        {/* Game Info */}
        <div className="game-info">
          <div className="period">Q3</div>
          <div className="game-clock">1:00</div>
          {/* Only show possession arrow if we have that information */}
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
              <span className="team-stat">Fouls: {teamB?.team_fouls}</span>
              <span className="team-stat">{getTimeoutDisplay(teamB)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBanner; 