import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image } from 'react-konva';
import useImage from 'use-image';
import courtImg from '../assets/clippers-court2-og.png';
import './LineupVisual.css';
import PlayerJersey from './PlayerJersey';

const COURT_WIDTH = 1000;
const COURT_HEIGHT = 500;

const LineupVisual = ({ lineupsData }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [courtImage] = useImage(courtImg);
    const [isStageReady, setIsStageReady] = useState(false);
    const [apiData, setApiData] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({ width: clientWidth, height: clientHeight });
                if (clientWidth > 0 && clientHeight > 0) {
                    setIsStageReady(true);
                }
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const fetchLineupData = async () => {
            try {
                setIsLoading(true);
                const gameId = "2052400190";
                const snapshot = "middle_of_third";

                console.log('Fetching from:', `http://localhost:5002/api/lineup-data/${gameId}/${snapshot}`);

                const response = await fetch(
                    `http://localhost:5002/api/lineup-data/${gameId}/${snapshot}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('API Response:', data);
                setApiData(data);
            } catch (error) {
                console.error('Error fetching lineup data:', error);
                setApiError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLineupData();
    }, []);

    const getPlayerStats = (playerId) => {
        // Debug logging
        console.log('API playerStats keys:', Object.keys(apiData?.playerStats || {}));
        console.log('Looking for player:', playerId);

        if (!apiData || !apiData.playerStats || !apiData.playerStats[playerId]) {
            console.log('Missing stats for player:', playerId, 'Available players:', Object.keys(apiData?.playerStats || {}));
            return {
                plusMinus: "FIX",
                shotsMade: "FIX",
                shotsAttempted: "FIX",
                currentRun: "FIX",
                stintDuration: "FIX",
                turnovers: "FIX",
                fouls: "FIX",
                totalMinutes: "FIX",
                totalPlusMinus: "FIX",
                totalFgm: "FIX",
                totalFga: "FIX",
                totalTurnovers: "FIX",
                totalFouls: "FIX"
            };
        }

        const playerData = apiData.playerStats[playerId];
        const currentStint = playerData.currentStint;
        const totalStats = playerData.totalStats;

        // Get current run safely
        let currentRun = "FIX";
        if (apiData.currentLineups &&
            apiData.currentLineups.home &&
            apiData.currentLineups.away &&
            apiData.currentRun) {
            const isHomeTeam = apiData.currentLineups.home.players.includes(playerId);
            const teamId = isHomeTeam ?
                apiData.currentLineups.home.teamId :
                apiData.currentLineups.away.teamId;

            currentRun = apiData.currentRun[teamId] || "FIX";
        }

        return {
            // Current stint stats
            plusMinus: currentStint.plusMinus,
            shotsMade: currentStint.fgm,
            shotsAttempted: currentStint.fga,
            stintDuration: currentStint.stintDuration,
            turnovers: currentStint.turnovers,
            fouls: currentStint.fouls,
            // Total stats
            totalMinutes: totalStats.minutes,
            totalPlusMinus: totalStats.plusMinus,
            totalFgm: totalStats.fgm,
            totalFga: totalStats.fga,
            totalTurnovers: totalStats.turnovers,
            totalFouls: totalStats.fouls,
            // Current run
            currentRun
        };
    };

    const renderPlayerJersey = (pos, i, isTeamA) => {
        console.log('Rendering jersey for player:', pos.player);
        return (
            <PlayerJersey
                key={`team${isTeamA ? 'A' : 'B'}-${i}`}
                player={pos.player}
                x={pos.x}
                y={pos.y}
                isTeamA={isTeamA}
                stats={getPlayerStats(pos.player.person_id)}
            />
        );
    };

    if (!lineupsData || !lineupsData.currentLineupTeamA || !lineupsData.currentLineupTeamB || !courtImage || !isStageReady || isLoading) {
        return (
            <div className="lineup-visual-container" ref={containerRef}>
                <div className="loading-message">
                    {isLoading ? "Loading lineup stats..." : "Loading..."}
                </div>
            </div>
        );
    }

    const { currentLineupTeamA, currentLineupTeamB } = lineupsData;
    const scale = Math.min(dimensions.width / COURT_WIDTH, dimensions.height / COURT_HEIGHT);

    if (dimensions.width === 0 || dimensions.height === 0) {
        return (
            <div className="lineup-visual-container" ref={containerRef}>
                <div className="loading-message">Loading dimensions...</div>
            </div>
        );
    }

    // Function to calculate player positions in a star formation
    const getPlayerPositions = (players, isTeamA) => {
        const positions = [];
        // Base position (center of the formation)
        const baseX = isTeamA ? COURT_WIDTH * 0.25 : COURT_WIDTH * 0.75 - 80;
        const baseY = COURT_HEIGHT * 0.4;

        // Formation spacing
        const RADIUS_X = 220;  // Horizontal spread
        const RADIUS_Y = 160;  // Reduced vertical spread
        const CENTER_OFFSET = 80;  // Increased offset towards center

        // Calculate positions in a star pattern, rotated 90 degrees
        const formationPositions = [
            // Point player (closest to center)
            {
                offsetX: isTeamA ? CENTER_OFFSET : -CENTER_OFFSET,
                offsetY: 0
            },
            // Top and bottom players (reduced vertical spread)
            {
                offsetX: isTeamA ? -RADIUS_X / 2 + 50 : RADIUS_X / 2 - 50,
                offsetY: -RADIUS_Y
            },
            {
                offsetX: isTeamA ? -RADIUS_X / 2 + 50 : RADIUS_X / 2 - 50,
                offsetY: RADIUS_Y
            },
            // Wing players (spread wider horizontally)
            {
                offsetX: isTeamA ? -RADIUS_X : RADIUS_X,
                offsetY: -RADIUS_Y / 2
            },
            {
                offsetX: isTeamA ? -RADIUS_X : RADIUS_X,
                offsetY: RADIUS_Y / 2
            }
        ];

        // Map players to positions
        players.forEach((player, index) => {
            if (index < 5) {
                const position = formationPositions[index];
                positions.push({
                    x: baseX + position.offsetX,
                    y: baseY + position.offsetY,
                    player: player
                });
            }
        });

        return positions;
    };

    return (
        <div className="lineup-visual-container" ref={containerRef}>
            <div className="court-container" style={{ width: '100%', height: '100%' }}>
                <Stage
                    width={COURT_WIDTH * scale}
                    height={COURT_HEIGHT * scale}
                    scale={{ x: scale, y: scale }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <Layer>
                        <Image
                            image={courtImage}
                            width={COURT_WIDTH}
                            height={COURT_HEIGHT}
                            x={0}
                            y={0}
                        />

                        {/* Team A Players with API stats */}
                        {getPlayerPositions(currentLineupTeamA, true).map((pos, i) =>
                            renderPlayerJersey(pos, i, true)
                        )}

                        {/* Team B Players with API stats */}
                        {getPlayerPositions(currentLineupTeamB, false).map((pos, i) =>
                            renderPlayerJersey(pos, i, false)
                        )}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};

export default LineupVisual;
