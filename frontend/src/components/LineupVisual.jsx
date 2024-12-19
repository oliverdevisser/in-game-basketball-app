import React, { useRef, useEffect, useState } from 'react';
import CourtStage from './CourtStage';
import './LineupVisual.css';

const LineupVisual = ({ lineupsData, snapshot, gameId }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [displayMode, setDisplayMode] = useState('lineup');

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const containerHeight = containerRef.current.offsetHeight - 60;
                setDimensions({ width: containerWidth, height: containerHeight });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    if (!lineupsData || !lineupsData.currentLineupTeamA || !lineupsData.currentLineupTeamB) {
        return (
            <div className="lineup-visual-container">
                <div className="loading-message">Loading lineup data...</div>
            </div>
        );
    }

    const { currentLineupTeamA, currentLineupTeamB, teamA, teamB } = lineupsData;

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="lineup-visual-container" ref={containerRef}>
            <div className="court-container">
                <CourtStage 
                    displayMode={displayMode}
                    lineupsData={lineupsData}
                    snapshot={snapshot}
                    gameId={gameId}
                />
            </div>

            <div className="lineup-stats">
                <div className="team-stint-info">
                    <div className="team-label">Left Team</div>
                    <div className="stint-duration">
                        Lineup Duration: {formatDuration(teamA.stint_duration)}
                    </div>
                    <div className={`stint-plusminus ${teamA.stint_plusminus > 0 ? 'positive' : 'negative'}`}>
                        Stint +/-: {teamA.stint_plusminus > 0 ? `+${teamA.stint_plusminus}` : teamA.stint_plusminus}
                    </div>
                </div>

                <div className="visualization-controls">
                    <div className="toggle-buttons">
                        <button
                            className={`toggle-button ${displayMode === 'lineup' ? 'active' : ''}`}
                            onClick={() => setDisplayMode('lineup')}
                        >
                            Lineup Chart
                        </button>
                        <button
                            className={`toggle-button ${displayMode === 'shooting' ? 'active' : ''}`}
                            onClick={() => setDisplayMode('shooting')}
                        >
                            Shooting Chart
                        </button>
                    </div>
                </div>

                <div className="team-stint-info">
                    <div className="team-label">Right Team</div>
                    <div className="stint-duration">
                        Lineup Duration: {formatDuration(teamB.stint_duration)}
                    </div>
                    <div className={`stint-plusminus ${teamB.stint_plusminus > 0 ? 'positive' : 'negative'}`}>
                        Stint +/-: {teamB.stint_plusminus > 0 ? `+${teamB.stint_plusminus}` : teamB.stint_plusminus}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LineupVisual;
