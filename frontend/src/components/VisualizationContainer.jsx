import React, { useState, useEffect } from 'react';
import LineupVisual from './LineupVisual';
import CourtStage from './CourtStage';
import './VisualizationContainer.css';

const VisualizationContainer = ({ lineupsData, snapshot, gameId, selectedPlayer }) => {
    const [displayMode, setDisplayMode] = useState('lineup');
    const [boxscoreData, setBoxscoreData] = useState(null);

    useEffect(() => {
        if (snapshot && gameId) {
            fetch(`http://localhost:5002/boxscore?snapshot=${snapshot}&game_id=${gameId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.teams && data.teams.length >= 2) {
                        setBoxscoreData(data);
                    }
                })
                .catch(error => {
                    console.error('Error fetching boxscore data:', error);
                });
        }
    }, [snapshot, gameId]);

    useEffect(() => {
        if (selectedPlayer) {
            setDisplayMode('shooting');
        }
    }, [selectedPlayer]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="visualization-container">
            <div className="visualization-content">
                {displayMode === 'lineup' ? (
                    <LineupVisual lineupsData={lineupsData} />
                ) : (
                    boxscoreData && (
                        <CourtStage
                            lineupsData={lineupsData}
                            snapshot={snapshot}
                            gameId={gameId}
                            displayMode="shooting"
                            boxscoreData={boxscoreData}
                            selectedPlayer={selectedPlayer}
                        />
                    )
                )}
            </div>

            <div className="bottom-controls">
                <div className="team-stint-info">
                    <div className="team-label">{lineupsData?.teamA?.team_name || "Team A"}</div>
                    {displayMode === 'lineup' ? (
                        <>
                            <div className="stat-row">
                                <div className="stint-duration">Overall +/-: +24</div>
                                <div className="efficiency positive">PPP: 1.15 (+0.08 vs team)</div>
                            </div>
                            <div className="stat-row">
                                <div className="stint-plusminus positive">Current Run: +8</div>
                                <div className="efficiency negative">PAPP: 1.02 (-0.05 vs team)</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="stat-row">
                                <div className="stint-duration">Last 10min: 52.5%</div>
                                <div className="efficiency positive">Overall: 48.8%</div>
                            </div>
                            <div className="stat-row">
                                <div className="stint-plusminus">3PT: 38.5% | MID: 45.2% | PAINT: 65.2%</div>
                                <div className="efficiency">3PT: 35.5% | MID: 42.2% | PAINT: 62.1%</div>
                            </div>
                        </>
                    )}
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
                    <div className="team-label">{lineupsData?.teamB?.team_name || "Team B"}</div>
                    {displayMode === 'lineup' ? (
                        <>
                            <div className="stat-row-reverse">
                                <div className="stint-duration">Overall +/-: -12</div>
                                <div className="efficiency negative">PPP: 0.98 (-0.12 vs team)</div>
                            </div>
                            <div className="stat-row-reverse">
                                <div className="stint-plusminus negative">Current Run: -8</div>
                                <div className="efficiency positive">PAPP: 0.95 (+0.07 vs team)</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="stat-row-reverse">
                                <div className="stint-duration">Last 10min: 48.2%</div>
                                <div className="efficiency negative">Overall: 45.5%</div>
                            </div>
                            <div className="stat-row-reverse">
                                <div className="stint-plusminus">3PT: 32.5% | MID: 41.2% | PAINT: 58.8%</div>
                                <div className="efficiency">3PT: 31.2% | MID: 40.5% | PAINT: 55.5%</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualizationContainer; 