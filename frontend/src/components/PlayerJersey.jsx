import React, { useState, useEffect } from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import { Tooltip } from '@mui/material';

const PlayerJersey = ({ player, x, y, isTeamA, stats }) => {
    console.log('Jersey stats for player:', player.person_id, stats); // Debug stats
    const [showDetails, setShowDetails] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Adjusted dimensions - slightly taller
    const JERSEY_WIDTH = 110;
    const JERSEY_HEIGHT = 140;  // Increased from 130
    const SLEEVE_WIDTH = 35;
    const SLEEVE_HEIGHT = 38;   // Slightly increased to match new height

    // Colors remain the same
    const borderColor = isTeamA ? "#2c5282" : "#e53e3e";
    const backgroundColor = "white";
    const textColor = "#1a202c";
    const labelColor = "#718096";

    // Adjust vertical spacing - slightly increased gaps
    const HEADER_Y = 6;
    const STATS_START_Y = 35;
    const LINE_HEIGHT = 20;     // Increased from 18 to give more breathing room

    useEffect(() => {
        // Small delay to ensure Stage is ready
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    if (!isReady) return null;

    return (
        <Group>
            {/* Main Jersey Body */}
            <Rect
                x={x}
                y={y}
                width={JERSEY_WIDTH}
                height={JERSEY_HEIGHT}
                fill={backgroundColor}
                stroke={borderColor}
                strokeWidth={2}
                cornerRadius={8}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.3}
            />

            {/* Sleeves */}
            <Line
                points={[
                    x - SLEEVE_WIDTH, y + 12,
                    x, y,
                    x, y + SLEEVE_HEIGHT,
                    x - SLEEVE_WIDTH, y + SLEEVE_HEIGHT + 12
                ]}
                closed={true}
                fill={backgroundColor}
                stroke={borderColor}
                strokeWidth={2}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.3}
            />
            <Line
                points={[
                    x + JERSEY_WIDTH + SLEEVE_WIDTH, y + 12,
                    x + JERSEY_WIDTH, y,
                    x + JERSEY_WIDTH, y + SLEEVE_HEIGHT,
                    x + JERSEY_WIDTH + SLEEVE_WIDTH, y + SLEEVE_HEIGHT + 12
                ]}
                closed={true}
                fill={backgroundColor}
                stroke={borderColor}
                strokeWidth={2}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.3}
            />

            {/* Jersey Number */}
            <Text
                x={x}
                y={y + HEADER_Y}
                width={JERSEY_WIDTH}
                text={player.jersey_number}
                fontSize={28}
                fill={textColor}
                align="center"
                fontStyle="bold"
                fontFamily="system-ui, -apple-system"
            />

            {/* Stats Container - more compact spacing */}
            <Group y={y + STATS_START_Y}>
                {/* Column Headers */}
                <Group>
                    <Text x={x + 8} text="stint" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                    <Text x={x + 65} text="total" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                </Group>

                {/* Stats with reduced vertical spacing */}
                <Group y={12}>
                    {/* Minutes */}
                    <Group>
                        <Text x={x + 8} text={stats.stintDuration} fontSize={14} fill={textColor} fontFamily="system-ui" />
                        <Text x={x + 45} text="min" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                        <Text x={x + 65} text={stats.totalMinutes} fontSize={12} fill={textColor} fontFamily="system-ui" />
                    </Group>

                    {/* Plus/Minus */}
                    <Group y={LINE_HEIGHT}>
                        <Text x={x + 8} text={`+/-: ${stats.plusMinus}`} fontSize={14} fill={textColor} fontFamily="system-ui" />
                        <Text x={x + 45} text="+/-" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                        <Text x={x + 65} text={stats.totalPlusMinus} fontSize={12} fill={textColor} fontFamily="system-ui" />
                    </Group>

                    {/* Field Goals */}
                    <Group y={LINE_HEIGHT * 2}>
                        <Text x={x + 8} text={`${stats.shotsMade}/${stats.shotsAttempted}`} fontSize={14} fill={textColor} fontFamily="system-ui" />
                        <Text x={x + 45} text="fg" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                        <Text x={x + 65} text={`${stats.totalFgm}/${stats.totalFga}`} fontSize={12} fill={textColor} fontFamily="system-ui" />
                    </Group>

                    {/* Turnovers */}
                    <Group y={LINE_HEIGHT * 3}>
                        <Text x={x + 8} text={stats.turnovers} fontSize={14} fill={textColor} fontFamily="system-ui" />
                        <Text x={x + 45} text="to" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                        <Text x={x + 65} text={stats.totalTurnovers} fontSize={12} fill={textColor} fontFamily="system-ui" />
                    </Group>

                    {/* Fouls */}
                    <Group y={LINE_HEIGHT * 4}>
                        <Text x={x + 8} text={stats.fouls} fontSize={14} fill={textColor} fontFamily="system-ui" />
                        <Text x={x + 45} text="pf" fontSize={8} fill={labelColor} fontFamily="system-ui" />
                        <Text x={x + 65} text={stats.totalFouls} fontSize={12} fill={textColor} fontFamily="system-ui" />
                    </Group>
                </Group>
            </Group>
        </Group>
    );
};

export default PlayerJersey; 