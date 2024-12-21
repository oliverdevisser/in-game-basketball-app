import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image, Line, Path, Group, Circle, Text, Rect } from 'react-konva';
import useImage from 'use-image';
import courtImgShots from '../assets/clippers-court2.png';
import courtImgLineup from '../assets/clippers-court2-og.png';


const COURT_WIDTH = 1000;
const COURT_HEIGHT = 500;

// Constants for shared coordinates
const PAINT = {
    rectTopY: 172,
    rectBottomY: 328,
    rectRightX: 70,
    arcCenterY: 250,
    fill: 'rgba(255, 0, 0, 0.4)',
    stroke: 'black',
    arcRadius: (328 - 172) / 2,
    startAngle: -90,
    endAngle: 90,
};

const THREE_POINT = {
    arcTopBaselineY: 32,
    arcBottomBaselineY: 467,
    arcStartX: 150,
    arcStartY: 32,
    arcEndY: 467,
    arcCenterY: (467 - 32) / 2 + 32,
    arcRadius: (467 - 32) / 2,
    cornerWidth: 150,  // Width of corner three area
};

const generatePaintShape = () => {
    const { rectTopY, rectBottomY, rectRightX, arcRadius, startAngle, endAngle } = PAINT;
    let points = [];
    points.push(0, rectTopY);
    points.push(rectRightX, rectTopY);
    points.push(...generateArcPoints(rectRightX, PAINT.arcCenterY, arcRadius, startAngle, endAngle));
    points.push(0, rectBottomY);
    return points;
};

const generateMidRange1Shape = () => {
    const points = [];
    // Start at top left (baseline and paint)
    points.push(0, PAINT.rectBottomY);
    // Go to top right (start of paint arc)
    points.push(PAINT.rectRightX, PAINT.rectBottomY);
    // Go to bottom right (start of 3pt arc)
    points.push(THREE_POINT.arcStartX, THREE_POINT.arcBottomBaselineY);
    // Go to bottom left (3pt line and baseline)
    points.push(0, THREE_POINT.arcBottomBaselineY);
    // Go back to start
    points.push(0, PAINT.rectBottomY);
    return points;
};


const mirrorPoints = (pointsOrPath) => {
    if (Array.isArray(pointsOrPath)) {
        // Handle array of points
        return pointsOrPath.map((value, index) => {
            if (index % 2 === 0) {
                // Mirror x coordinates
                return COURT_WIDTH - value;
            }
            return value;
        });
    } else if (typeof pointsOrPath === 'string') {
        // Handle SVG path data
        const commands = pointsOrPath.match(/[MLA]\s*[^MLAZ]*/g); // Match path commands and their arguments
        if (!commands) return pointsOrPath;

        return commands
            .map((segment) => {
                const command = segment[0]; // Extract command (M, L, A)
                const args = segment.slice(1).trim().split(/[ ,]+/).map(Number); // Split arguments

                switch (command) {
                    case 'M': // Move to
                    case 'L': // Line to
                        if (args.length >= 2) {
                            const [x, y] = args;
                            return `${command} ${COURT_WIDTH - x},${y}`;
                        }
                        break;

                    case 'A': // Arc
                        if (args.length >= 7) {
                            const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x2, y2] = args;
                            const mirroredX2 = COURT_WIDTH - x2;
                            const newSweepFlag = sweepFlag === 0 ? 1 : 0; // Flip the sweep flag to reverse arc direction
                            return `${command} ${rx},${ry},${xAxisRotation},${largeArcFlag},${newSweepFlag},${mirroredX2},${y2}`;
                        }
                        break;

                    case 'Z': // Close path
                        return 'Z';

                    default:
                        return segment; // Preserve unknown commands
                }

                return segment; // Fallback for malformed segments
            })
            .join(' ');
    }
    return pointsOrPath; // Return input if not a valid format
};


//path arc functions
function generateArcPath(sx, sy, ex, ey, radiusFactor) {
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const R = (dist / 2) * radiusFactor;
    const h = Math.sqrt(R * R - (dist / 2) * (dist / 2));

    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    let px = -dy;
    let py = dx;
    const pl = Math.sqrt(px * px + py * py);
    px /= pl;
    py /= pl;

    const cx = mx + px * h;
    const cy = my + py * h;

    const angleStart = Math.atan2(sy - cy, sx - cx) * (180 / Math.PI);
    const angleEnd = Math.atan2(ey - cy, ex - cx) * (180 / Math.PI);

    const largeArcFlag = Math.abs(angleEnd - angleStart) > 180 ? 1 : 0;

    return `A ${R} ${R} 0 ${largeArcFlag} 1 ${ex} ${ey}`;
}

function generateArcPointsPath(cx, cy, r, startAngleDeg, endAngleDeg) {
    const startX = cx + r * Math.cos((startAngleDeg * Math.PI) / 180);
    const startY = cy + r * Math.sin((startAngleDeg * Math.PI) / 180);
    const endX = cx + r * Math.cos((endAngleDeg * Math.PI) / 180);
    const endY = cy + r * Math.sin((endAngleDeg * Math.PI) / 180);

    const largeArcFlag = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;

    return `A ${r} ${r} 0 ${largeArcFlag} 0 ${endX} ${endY}`;
}


function generateMidRange2Shapepath() {
    const pathCommands = [];

    // Start at paint top-right corner
    pathCommands.push(`M ${PAINT.rectRightX} ${PAINT.rectTopY}`);

    // Line to three-point line start
    pathCommands.push(`L ${THREE_POINT.arcStartX} ${THREE_POINT.arcStartY}`);

    // Create arc along the three-point line
    const threePtArcPath = generateArcPath(
        THREE_POINT.arcStartX,
        THREE_POINT.arcStartY,
        THREE_POINT.arcStartX,
        THREE_POINT.arcBottomBaselineY,
        1.055 // radiusFactor for the curvature
    );
    pathCommands.push(threePtArcPath);

    // Line to paint bottom-right corner
    pathCommands.push(`L ${PAINT.rectRightX} ${PAINT.rectBottomY}`);

    // Follow the paint arc back up to the paint top-right corner
    const paintArcPath = generateArcPointsPath(
        PAINT.rectRightX,
        PAINT.arcCenterY,
        PAINT.arcRadius,
        90,
        -90
    );
    pathCommands.push(paintArcPath);

    // Close the path
    pathCommands.push('Z');

    return pathCommands.join(' ');
}


const generateMidRange3Shape = () => {
    const points = [];
    // Start at bottom left (baseline and paint)
    points.push(0, PAINT.rectTopY);
    // Go to paint arc start
    points.push(PAINT.rectRightX, PAINT.rectTopY);
    // Go to three point line
    points.push(THREE_POINT.arcStartX, THREE_POINT.arcTopBaselineY);
    // Go to baseline
    points.push(0, THREE_POINT.arcTopBaselineY);
    return points;
};

const generateArcPoints = (cx, cy, r, startAngleDeg, endAngleDeg) => {
    const points = [];
    const step = 5;
    for (let angle = startAngleDeg; angle <= endAngleDeg; angle += step) {
        const rad = (angle * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        points.push(x, y);
    }
    if (endAngleDeg % step !== 0) {
        const rad = (endAngleDeg * Math.PI) / 180;
        points.push(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
    }
    return points;
};

const generateCornerThree1Shape = () => {
    const points = [];
    // Bottom corner three
    points.push(0, THREE_POINT.arcBottomBaselineY);
    points.push(THREE_POINT.cornerWidth, THREE_POINT.arcBottomBaselineY);
    points.push(THREE_POINT.cornerWidth, COURT_HEIGHT);
    points.push(0, COURT_HEIGHT);
    return points;
};

const generateCornerThree2Shape = () => {
    const points = [];
    // Top corner three
    points.push(0, THREE_POINT.arcTopBaselineY);
    points.push(THREE_POINT.cornerWidth, THREE_POINT.arcTopBaselineY);
    points.push(THREE_POINT.cornerWidth, 0);
    points.push(0, 0);
    return points;
};

function generateWingThree1Shape() {
    // Start at the top-left of the wing
    const startX = THREE_POINT.cornerWidth;
    const startY = THREE_POINT.arcTopBaselineY;

    // The arc endpoints and parameters (same as midrange 2 arc):
    const sx = THREE_POINT.arcStartX;
    const sy = THREE_POINT.arcStartY;
    const ex = THREE_POINT.arcStartX;
    const ey = THREE_POINT.arcBottomBaselineY;
    const radiusFactor = 1.055;

    // Calculate the arc center and angles, just like generateArcPath
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const R = (dist / 2) * radiusFactor;
    const h = Math.sqrt(R * R - (dist / 2) * (dist / 2));
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    // Perp direction
    let px = -dy;
    let py = dx;
    const pl = Math.sqrt(px * px + py * py);
    px /= pl;
    py /= pl;

    // Arc center
    const cx = mx + px * h;
    const cy = my + py * h;

    const angleStart = Math.atan2(sy - cy, sx - cx) * (180 / Math.PI);
    const angleEnd = Math.atan2(ey - cy, ex - cx) * (180 / Math.PI);
    let startAngle = angleStart;
    let endAngle = angleEnd;
    if (endAngle < startAngle) {
        endAngle += 360;
    }

    // We want to go 1/3 along the arc
    const partialAngleDeg = startAngle + (endAngle - startAngle) / 3;
    const partialAngleRad = (partialAngleDeg * Math.PI) / 180;

    // Compute the partial endpoint along the arc
    const partialX = cx + R * Math.cos(partialAngleRad);
    const partialY = cy + R * Math.sin(partialAngleRad);

    // Determine flags for the arc
    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    const sweepFlag = 1; // same direction as original arc

    // Now define the path:
    const pathCommands = [];

    // Move to start
    pathCommands.push(`M ${startX} ${startY}`);

    // Line to arc start
    pathCommands.push(`L ${sx} ${sy}`);

    // Arc to 1/3 point
    pathCommands.push(`A ${R} ${R} 0 ${largeArcFlag} ${sweepFlag} ${partialX} ${partialY}`);

    // Extend out perpendicularly from the arc
    const halfwayX = COURT_WIDTH / 2;

    // Radius direction (from center to the partial point)
    let rx = partialX - cx;
    let ry = partialY - cy;

    // Determine which direction to extend. We assume we want to go towards the half-court line at halfwayX.
    // If partialX < halfwayX, we want to increase x, so if rx is negative (pointing left), we flip it:
    if ((partialX < halfwayX && rx < 0) || (partialX > halfwayX && rx > 0)) {
        rx = -rx;
        ry = -ry;
    }

    // Now find t such that partialX + t*rx = halfwayX
    const t = (halfwayX - partialX) / rx;
    const outY = partialY + t * ry;

    pathCommands.push(`L ${halfwayX} ${outY}`);

    pathCommands.push(`L ${halfwayX} 0`);  // Go up to top of court
    pathCommands.push(`L ${THREE_POINT.cornerWidth} 0`);  // Go left at top of court
    pathCommands.push(`L ${startX} ${startY}`);  // Back to start

    // Close path
    pathCommands.push('Z');

    return pathCommands.join(' ');
}

const generateWingThree2Shape = () => {
    // Start at the bottom-left of the wing
    const startX = THREE_POINT.cornerWidth;
    const startY = THREE_POINT.arcBottomBaselineY;

    // The arc endpoints and parameters (same as midrange 2 arc):
    const sx = THREE_POINT.arcStartX;
    const sy = THREE_POINT.arcStartY;
    const ex = THREE_POINT.arcStartX;
    const ey = THREE_POINT.arcBottomBaselineY;
    const radiusFactor = 1.055;

    // Calculate the arc center and angles, just like generateArcPath
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const R = (dist / 2) * radiusFactor;
    const h = Math.sqrt(R * R - (dist / 2) * (dist / 2));
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    // Perp direction
    let px = -dy;
    let py = dx;
    const pl = Math.sqrt(px * px + py * py);
    px /= pl;
    py /= pl;

    // Arc center
    const cx = mx + px * h;
    const cy = my + py * h;

    const angleStart = Math.atan2(sy - cy, sx - cx) * (180 / Math.PI);
    const angleEnd = Math.atan2(ey - cy, ex - cx) * (180 / Math.PI);
    let startAngle = angleStart;
    let endAngle = angleEnd;
    if (endAngle < startAngle) {
        endAngle += 360;
    }

    // For the bottom shape, we want to take the arc from the bottom going upward 1/3 of the way.
    // The original arc goes from startAngle (top) to endAngle (bottom).
    // For the bottom shape, we reverse the logic: 1/3 along the arc from the bottom side.
    const partialAngleDeg = endAngle - (endAngle - startAngle) / 3;
    const partialAngleRad = (partialAngleDeg * Math.PI) / 180;

    // Compute the partial endpoint along the arc
    const partialX = cx + R * Math.cos(partialAngleRad);
    const partialY = cy + R * Math.sin(partialAngleRad);

    // Determine flags for the arc
    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    const sweepFlag = 0; // same direction as original arc

    // Now define the path:
    const pathCommands = [];

    // Move to start
    pathCommands.push(`M ${startX} ${startY}`);

    // Line to arc bottom start
    pathCommands.push(`L ${sx} ${ey}`);

    // Arc to 1/3 point
    pathCommands.push(`A ${R} ${R} 0 ${largeArcFlag} ${sweepFlag} ${partialX} ${partialY}`);

    // Extend out perpendicularly from the arc to the half-court line
    const halfwayX = COURT_WIDTH / 2;

    // Radius direction (from center to the partial point)
    let rx = partialX - cx;
    let ry = partialY - cy;

    // Determine which direction to extend. We assume we want to go towards the half-court line at halfwayX.
    if ((partialX < halfwayX && rx < 0) || (partialX > halfwayX && rx > 0)) {
        rx = -rx;
        ry = -ry;
    }

    // Now find t such that partialX + t*rx = halfwayX
    const t = (halfwayX - partialX) / rx;
    const outY = partialY + t * ry;

    pathCommands.push(`L ${halfwayX} ${outY}`);

    // From the half-court line, go down to bottom of court
    pathCommands.push(`L ${halfwayX} ${COURT_HEIGHT}`);

    // Go left to THREE_POINT.cornerWidth at bottom
    pathCommands.push(`L ${THREE_POINT.cornerWidth} ${COURT_HEIGHT}`);

    // Back to start
    pathCommands.push(`L ${startX} ${startY}`);

    // Close path
    pathCommands.push('Z');

    return pathCommands.join(' ');
};


const generateTopKeyThreeShape = () => {
    // Arc parameters (same as midrange 2 arc and the wing shapes)
    const sx = THREE_POINT.arcStartX;
    const sy = THREE_POINT.arcStartY;
    const ex = THREE_POINT.arcStartX;
    const ey = THREE_POINT.arcBottomBaselineY;
    const radiusFactor = 1.055;

    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const R = (dist / 2) * radiusFactor;
    const h = Math.sqrt(R * R - (dist / 2) * (dist / 2));
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    // Perp direction
    let px = -dy;
    let py = dx;
    const pl = Math.sqrt(px * px + py * py);
    px /= pl;
    py /= pl;

    // Arc center
    const cx = mx + px * h;
    const cy = my + py * h;

    const angleStart = Math.atan2(sy - cy, sx - cx) * (180 / Math.PI);
    const angleEnd = Math.atan2(ey - cy, ex - cx) * (180 / Math.PI);
    let startAngle = angleStart;
    let endAngle = angleEnd;
    if (endAngle < startAngle) {
        endAngle += 360;
    }

    // The top 1/3 endpoint from WingThree1:
    const partialAngleDegTop = startAngle + (endAngle - startAngle) / 3;
    // The bottom 1/3 endpoint from WingThree2:
    const partialAngleDegBottom = endAngle - (endAngle - startAngle) / 3;

    const partialAngleTopRad = (partialAngleDegTop * Math.PI) / 180;
    const partialAngleBottomRad = (partialAngleDegBottom * Math.PI) / 180;

    // Compute the endpoints of the top key arc
    const topKeyStartX = cx + R * Math.cos(partialAngleTopRad);
    const topKeyStartY = cy + R * Math.sin(partialAngleTopRad);
    const topKeyEndX = cx + R * Math.cos(partialAngleBottomRad);
    const topKeyEndY = cy + R * Math.sin(partialAngleBottomRad);

    // Determine arc flags
    // This arc segment is definitely less than 180 degrees, so largeArcFlag = 0
    const largeArcFlag = 0;
    // The arc goes top to bottom, same direction as original (sy to ey), which used sweepFlag = 1
    const sweepFlag = 1;

    // We'll extend perpendicularly from both arc endpoints to the half-court line
    const halfwayX = COURT_WIDTH / 2;

    function findPerpendicularExtension(x, y) {
        let rx = x - cx;
        let ry = y - cy;

        // Ensure we go toward the half-court line
        if ((x < halfwayX && rx < 0) || (x > halfwayX && rx > 0)) {
            rx = -rx;
            ry = -ry;
        }

        // Solve for t: x + t*rx = halfwayX
        const t = (halfwayX - x) / rx;
        const outY = y + t * ry;
        return outY;
    }

    const outYStart = findPerpendicularExtension(topKeyStartX, topKeyStartY);
    const outYEnd = findPerpendicularExtension(topKeyEndX, topKeyEndY);

    // Now define the path:
    const pathCommands = [];

    // Move to the start of the top key arc
    pathCommands.push(`M ${topKeyStartX} ${topKeyStartY}`);

    // Arc to the end of the top key arc
    pathCommands.push(`A ${R} ${R} 0 ${largeArcFlag} ${sweepFlag} ${topKeyEndX} ${topKeyEndY}`);

    // From the arc end, go out perpendicularly to the halfway line
    pathCommands.push(`L ${halfwayX} ${outYEnd}`);

    // Now go along the halfway line up to the perpendicular from the top arc start point
    pathCommands.push(`L ${halfwayX} ${outYStart}`);

    // Then back from the halfway line down to the start of the arc
    pathCommands.push(`L ${topKeyStartX} ${topKeyStartY}`);

    // Close the path
    pathCommands.push('Z');

    return pathCommands.join(' ');
};

// First, let's define zone center positions for stats display
const ZONE_POSITIONS = {
    paint: { x: 50, y: 250 },
    midRange1: { x: 50, y: 400 },
    midRange2: { x: 200, y: 250 },
    midRange3: { x: 50, y: 100 },
    cornerThree1: { x: 50, y: 483 },
    cornerThree2: { x: 50, y: 17 },
    wingThree1: { x: 275, y: 50 },
    wingThree2: { x: 275, y: 440 },
    topKeyThree: { x: 350, y: 250 }
};

const CourtStage = ({ displayMode, lineupsData, snapshot, gameId, boxscoreData, selectedPlayer }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    // Load both images
    const [courtImageShots] = useImage(courtImgShots);
    const [courtImageLineup] = useImage(courtImgLineup);
    const [shots, setShots] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [zoneStats, setZoneStats] = useState({});

    // Add effect to reset zone selection when switching between players/teams
    useEffect(() => {
        setSelectedZone(null);
    }, [selectedPlayer]);

    // Move all useEffects to the top, before any conditional returns
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({ width: clientWidth, height: clientHeight });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (displayMode === 'shooting' && snapshot && gameId) {
            fetch(`http://localhost:5002/api/shots?snapshot=${snapshot}&game_id=${gameId}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    console.log('Received shot data:', data);
                    if (data.shots) {
                        console.log('Individual shots:', data.shots.map(shot => ({
                            team_id: shot.team_id,
                            locationX: shot.locationX,
                            locationY: shot.locationY,
                            made: shot.made
                        })));
                        setShots(data.shots);
                    }
                })
                .catch(error => {
                    console.error('Error fetching shots:', error.message);
                });
        }
    }, [displayMode, snapshot, gameId]);

    useEffect(() => {
        if (shots.length > 0) {
            const stats = calculateZoneStats(shots, selectedPlayer);
            setZoneStats(stats);
        }
    }, [shots, selectedPlayer]);

    // Early returns after all hooks
    if (!dimensions.width || !dimensions.height) {
        return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
    }

    if (!lineupsData || !lineupsData.teamA || !lineupsData.teamB) {
        console.log('Waiting for lineup data...');
        return <div ref={containerRef} style={{ width: '100%', height: '100%' }}>Loading lineup data...</div>;
    }

    const teamAId = boxscoreData.teams[0].team_id;
    const teamBId = boxscoreData.teams[1].team_id;

    const scale = Math.min(dimensions.width / COURT_WIDTH, dimensions.height / COURT_HEIGHT);

    // Function to determine if a shot should be mirrored
    const shouldMirrorShot = (shot) => {
        if (!teamBId) {
            console.log('No team B ID available');
            return false;
        }

        console.log('Shot mirroring check:', {
            shot_team_id: shot.team_id,
            teamAId,
            teamBId,
            willMirror: shot.team_id === teamBId
        });

        // Mirror shots if the shooting team is teamB (right side)
        return shot.team_id === teamBId;
    };

    // Function to get shot coordinates
    const getShotCoordinates = (shot) => {
        if (!shot) {
            console.log('No shot data provided');
            return { x: 0, y: 0 };
        }

        const shouldMirror = shouldMirrorShot(shot);
        const coords = shouldMirror ? {
            x: COURT_WIDTH - shot.locationX,
            y: shot.locationY
        } : {
            x: shot.locationX,
            y: shot.locationY
        };

        console.log('Shot coordinates:', {
            original: { x: shot.locationX, y: shot.locationY },
            mirrored: shouldMirror,
            final: coords,
            teamA_id: lineupsData.teamA?.team_id,
            teamB_id: lineupsData.teamB?.team_id
        });

        return coords;
    };

    const paintPoints = generatePaintShape();
    const midRange1Points = generateMidRange1Shape();
    // const midRange2Points = generateMidRange2Shape();
    const midRange2Points = generateMidRange2Shapepath();
    const midRange3Points = generateMidRange3Shape();

    // Function to calculate stats for each zone
    const calculateZoneStats = (shots, selectedPlayer) => {
        const stats = {};
        const baseZones = ['paint', 'midRange1', 'midRange2', 'midRange3', 'cornerThree1',
            'cornerThree2', 'wingThree1', 'wingThree2', 'topKeyThree'];

        // Filter shots by player if one is selected
        const filteredShots = selectedPlayer && selectedPlayer !== 'TEAM'
            ? shots.filter(shot => shot.player_id === selectedPlayer)
            : shots;

        // Process each zone for both teams
        baseZones.forEach(zone => {
            // Team A zones (left side)
            const teamAZone = `teamA_${zone}`;
            const teamAShots = filteredShots.filter(shot =>
                shot.zone === zone && shot.team_id === teamAId
            );
            const teamAMade = teamAShots.filter(shot => shot.made).length;
            stats[teamAZone] = {
                made: teamAMade,
                attempts: teamAShots.length,
                percentage: teamAShots.length > 0 ? (teamAMade / teamAShots.length) * 100 : 0
            };

            // Team B zones (right side)
            const teamBZone = `teamB_${zone}`;
            const teamBShots = filteredShots.filter(shot =>
                shot.zone === zone && shot.team_id === teamBId
            );
            const teamBMade = teamBShots.filter(shot => shot.made).length;
            stats[teamBZone] = {
                made: teamBMade,
                attempts: teamBShots.length,
                percentage: teamBShots.length > 0 ? (teamBMade / teamBShots.length) * 100 : 0
            };
        });
        return stats;
    };

    // Function to get color based on shooting percentage
    const getZoneColor = (percentage, isSelected, zoneStats) => {
        // Show gray for no attempts, regardless of team/player view
        if (!zoneStats?.attempts) {
            return `rgba(128, 128, 128, ${isSelected ? 0.5 : 0.3})`; // gray for no shots attempted
        }

        const baseOpacity = isSelected ? 0.5 : 0.3;
        const opacityBoost = isSelected ? 0.3 : 0.2;

        // Color scale from cold (yellow) to neutral (red) to hot (purple)
        if (percentage < 33.3) {
            return `rgba(255, 255, 0, ${baseOpacity + (percentage / 33.3) * opacityBoost})`; // cold (yellow)
        }
        if (percentage < 66.6) {
            return `rgba(255, 0, 0, ${baseOpacity + ((percentage - 33.3) / 33.3) * opacityBoost})`; // neutral (red)
        }
        return `rgba(128, 0, 128, ${baseOpacity + ((percentage - 66.6) / 33.3) * opacityBoost})`; // hot (purple)
    };

    // Function to handle zone clicks
    const handleZoneClick = (zoneName, teamId) => {
        const fullZoneName = `team${teamId === teamAId ? 'A' : 'B'}_${zoneName}`;
        setSelectedZone(selectedZone === fullZoneName ? null : fullZoneName);
    };

    // Component to display zone statistics (always visible)
    const ZoneStatsDisplay = ({ stats, x, y, zoneName, teamId, isSelected }) => {
        if (!stats) return null;

        const BOX_WIDTH = 45;
        const BOX_HEIGHT = 35;

        const madeAttempts = stats.attempts > 0 ? `${stats.made}/${stats.attempts}` : '0/0';
        const percentage = stats.attempts > 0 ? `${stats.percentage.toFixed(1)}%` : '~';

        return (
            <Group
                x={x}
                y={y}
                onClick={() => handleZoneClick(zoneName, teamId)}
                onTap={() => handleZoneClick(zoneName, teamId)}
            >
                <Rect
                    width={BOX_WIDTH}
                    height={BOX_HEIGHT}
                    offsetX={BOX_WIDTH / 2}
                    offsetY={BOX_HEIGHT / 2}
                    fill="white"
                    opacity={isSelected ? 0.7 : 0.5}
                    cornerRadius={5}
                />
                {/* Made/Attempts text (smaller) */}
                <Text
                    text={madeAttempts}
                    fontSize={10}  // Smaller font for made/attempts
                    fontStyle="bold"
                    fill="black"
                    align="center"
                    verticalAlign="middle"
                    width={BOX_WIDTH}
                    height={BOX_HEIGHT / 2}  // Use top half of box
                    offsetX={BOX_WIDTH / 2}
                    offsetY={BOX_HEIGHT / 2}  // Adjusted: removed +2
                    padding={2}
                />
                {/* Percentage text (larger) */}
                <Text
                    text={percentage}
                    fontSize={12}  // Larger font for percentage
                    fontStyle="bold"
                    fill="black"
                    align="center"
                    verticalAlign="middle"
                    width={BOX_WIDTH}
                    height={BOX_HEIGHT / 2}  // Use bottom half of box
                    offsetX={BOX_WIDTH / 2}
                    offsetY={BOX_HEIGHT / 2 - 12}  // Adjusted: changed from -8 to -12
                    padding={2}
                />
            </Group>
        );
    };

    // Component for the shooting efficiency legend
    const ShootingLegend = () => {
        const LEGEND_WIDTH = 120;  // Narrower width
        const LEGEND_HEIGHT = 120;  // Slightly shorter
        const BOX_SIZE = 15;  // Smaller boxes
        const BOX_SPACING = 22;  // Less spacing between items
        const TEXT_OFFSET = 25;  // Less offset for text

        return (
            <Group
                x={(COURT_WIDTH - LEGEND_WIDTH) / 2}  // Center horizontally
                y={COURT_HEIGHT - LEGEND_HEIGHT - 5}  // Closer to bottom
            >
                <Rect
                    width={LEGEND_WIDTH}
                    height={LEGEND_HEIGHT}
                    fill="white"
                    opacity={0.9}
                    cornerRadius={5}
                />
                <Text
                    text="Shooting Efficiency"
                    width={LEGEND_WIDTH}
                    align="center"
                    y={5}
                    fontSize={12}  // Smaller title
                    fontStyle="bold"
                />

                {/* Vertical layout of boxes and labels */}
                {[
                    { text: "No Shots", color: "rgba(128, 128, 128, 0.5)" },
                    { text: "Cold", color: "rgba(255, 255, 0, 0.5)" },
                    { text: "Neutral", color: "rgba(255, 0, 0, 0.5)" },
                    { text: "Hot", color: "rgba(128, 0, 128, 0.5)" }
                ].map((item, index) => (
                    <Group key={index}>
                        {/* Box on left */}
                        <Rect
                            width={BOX_SIZE}
                            height={BOX_SIZE}
                            x={10}  // Less padding from left
                            y={30 + (BOX_SPACING * index)}  // Start closer to title
                            fill={item.color}
                        />
                        {/* Label on right */}
                        <Text
                            text={item.text}
                            x={10 + TEXT_OFFSET}
                            y={30 + (BOX_SPACING * index) + BOX_SIZE / 2 - 5}
                            fontSize={10}  // Smaller text
                            fontStyle="bold"
                        />
                    </Group>
                ))}
            </Group>
        );
    };

    // Update getVisibleShots to show all shots by default
    const getVisibleShots = (shots, selectedZone, selectedPlayer) => {
        let filteredShots = shots;

        // If no player is selected or TEAM is selected, show all shots
        if (selectedPlayer && selectedPlayer !== 'TEAM') {
            filteredShots = shots.filter(shot => shot.player_id === selectedPlayer);
        }

        // Then filter by zone if one is selected
        if (selectedZone) {
            const [teamPrefix, zoneName] = selectedZone.split('_');
            const teamId = teamPrefix === 'teamA' ? teamAId : teamBId;

            filteredShots = filteredShots.filter(shot =>
                shot.zone === zoneName &&
                shot.team_id === teamId
            );
        }

        return filteredShots;
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <Stage
                width={COURT_WIDTH * scale}
                height={COURT_HEIGHT * scale}
                scale={{ x: scale, y: scale }}
            >
                <Layer>
                    {/* Use different court image based on display mode */}
                    {displayMode === 'shooting' ? (
                        courtImageShots && <Image image={courtImageShots} width={COURT_WIDTH} height={COURT_HEIGHT} />
                    ) : (
                        courtImageLineup && <Image image={courtImageLineup} width={COURT_WIDTH} height={COURT_HEIGHT} />
                    )}

                    {displayMode === 'shooting' && (
                        <>
                            {/* Team A (left) zones */}
                            {/* Paint */}
                            <Line
                                points={paintPoints}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamA_paint?.percentage,
                                    selectedZone === 'teamA_paint',
                                    zoneStats.teamA_paint
                                )}
                                stroke={PAINT.stroke}
                                strokeWidth={1}
                                onClick={() => handleZoneClick('paint', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_paint}
                                x={ZONE_POSITIONS.paint.x}
                                y={ZONE_POSITIONS.paint.y}
                                zoneName="paint"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_paint'}
                            />

                            {/* Mid-range zones */}
                            <Line
                                points={midRange1Points}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamA_midRange1?.percentage,
                                    selectedZone === 'teamA_midRange1',
                                    zoneStats.teamA_midRange1
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('midRange1', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_midRange1}
                                x={ZONE_POSITIONS.midRange1.x}
                                y={ZONE_POSITIONS.midRange1.y}
                                zoneName="midRange1"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_midRange1'}
                            />

                            <Path
                                data={midRange2Points}
                                fill={getZoneColor(
                                    zoneStats.teamA_midRange2?.percentage,
                                    selectedZone === 'teamA_midRange2',
                                    zoneStats.teamA_midRange2
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('midRange2', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_midRange2}
                                x={ZONE_POSITIONS.midRange2.x}
                                y={ZONE_POSITIONS.midRange2.y}
                                zoneName="midRange2"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_midRange2'}
                            />

                            <Line
                                points={midRange3Points}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamA_midRange3?.percentage,
                                    selectedZone === 'teamA_midRange3',
                                    zoneStats.teamA_midRange3
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('midRange3', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_midRange3}
                                x={ZONE_POSITIONS.midRange3.x}
                                y={ZONE_POSITIONS.midRange3.y}
                                zoneName="midRange3"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_midRange3'}
                            />

                            {/* Three-point zones */}
                            <Line
                                points={generateCornerThree1Shape()}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamA_cornerThree1?.percentage,
                                    selectedZone === 'teamA_cornerThree1',
                                    zoneStats.teamA_cornerThree1
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('cornerThree1', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_cornerThree1}
                                x={ZONE_POSITIONS.cornerThree1.x}
                                y={ZONE_POSITIONS.cornerThree1.y}
                                zoneName="cornerThree1"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_cornerThree1'}
                            />

                            <Line
                                points={generateCornerThree2Shape()}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamA_cornerThree2?.percentage,
                                    selectedZone === 'teamA_cornerThree2',
                                    zoneStats.teamA_cornerThree2
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('cornerThree2', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_cornerThree2}
                                x={ZONE_POSITIONS.cornerThree2.x}
                                y={ZONE_POSITIONS.cornerThree2.y}
                                zoneName="cornerThree2"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_cornerThree2'}
                            />

                            <Path
                                data={generateWingThree1Shape()}
                                fill={getZoneColor(
                                    zoneStats.teamA_wingThree1?.percentage,
                                    selectedZone === 'teamA_wingThree1',
                                    zoneStats.teamA_wingThree1
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('wingThree1', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_wingThree1}
                                x={ZONE_POSITIONS.wingThree1.x}
                                y={ZONE_POSITIONS.wingThree1.y}
                                zoneName="wingThree1"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_wingThree1'}
                            />

                            <Path
                                data={generateWingThree2Shape()}
                                fill={getZoneColor(
                                    zoneStats.teamA_wingThree2?.percentage,
                                    selectedZone === 'teamA_wingThree2',
                                    zoneStats.teamA_wingThree2
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('wingThree2', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_wingThree2}
                                x={ZONE_POSITIONS.wingThree2.x}
                                y={ZONE_POSITIONS.wingThree2.y}
                                zoneName="wingThree2"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_wingThree2'}
                            />

                            <Path
                                data={generateTopKeyThreeShape()}
                                fill={getZoneColor(
                                    zoneStats.teamA_topKeyThree?.percentage,
                                    selectedZone === 'teamA_topKeyThree',
                                    zoneStats.teamA_topKeyThree
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('topKeyThree', teamAId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamA_topKeyThree}
                                x={ZONE_POSITIONS.topKeyThree.x}
                                y={ZONE_POSITIONS.topKeyThree.y}
                                zoneName="topKeyThree"
                                teamId={teamAId}
                                isSelected={selectedZone === 'teamA_topKeyThree'}
                            />

                            {/* Team B (right) zones */}
                            {/* Paint */}
                            <Line
                                points={mirrorPoints(paintPoints)}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamB_paint?.percentage,
                                    selectedZone === 'teamB_paint',
                                    zoneStats.teamB_paint
                                )}
                                stroke={PAINT.stroke}
                                strokeWidth={1}
                                onClick={() => handleZoneClick('paint', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_paint}
                                x={COURT_WIDTH - ZONE_POSITIONS.paint.x - 20}
                                y={ZONE_POSITIONS.paint.y}
                                zoneName="paint"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_paint'}
                            />

                            {/* Mid-range zones */}
                            <Line
                                points={mirrorPoints(midRange1Points)}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamB_midRange1?.percentage,
                                    selectedZone === 'teamB_midRange1',
                                    zoneStats.teamB_midRange1
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('midRange1', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_midRange1}
                                x={COURT_WIDTH - ZONE_POSITIONS.midRange1.x - 20}
                                y={ZONE_POSITIONS.midRange1.y}
                                zoneName="midRange1"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_midRange1'}
                            />

                            <Path
                                data={mirrorPoints(midRange2Points)}
                                fill={getZoneColor(
                                    zoneStats.teamB_midRange2?.percentage,
                                    selectedZone === 'teamB_midRange2',
                                    zoneStats.teamB_midRange2
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('midRange2', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_midRange2}
                                x={COURT_WIDTH - ZONE_POSITIONS.midRange2.x - 20}
                                y={ZONE_POSITIONS.midRange2.y}
                                zoneName="midRange2"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_midRange2'}
                            />

                            <Line
                                points={mirrorPoints(midRange3Points)}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamB_midRange3?.percentage,
                                    selectedZone === 'teamB_midRange3',
                                    zoneStats.teamB_midRange3
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('midRange3', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_midRange3}
                                x={COURT_WIDTH - ZONE_POSITIONS.midRange3.x - 20}
                                y={ZONE_POSITIONS.midRange3.y}
                                zoneName="midRange3"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_midRange3'}
                            />

                            {/* Three-point zones */}
                            <Line
                                points={mirrorPoints(generateCornerThree1Shape())}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamB_cornerThree1?.percentage,
                                    selectedZone === 'teamB_cornerThree1',
                                    zoneStats.teamB_cornerThree1
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('cornerThree1', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_cornerThree1}
                                x={COURT_WIDTH - ZONE_POSITIONS.cornerThree1.x - 20}
                                y={ZONE_POSITIONS.cornerThree1.y}
                                zoneName="cornerThree1"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_cornerThree1'}
                            />

                            <Line
                                points={mirrorPoints(generateCornerThree2Shape())}
                                closed={true}
                                fill={getZoneColor(
                                    zoneStats.teamB_cornerThree2?.percentage,
                                    selectedZone === 'teamB_cornerThree2',
                                    zoneStats.teamB_cornerThree2
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('cornerThree2', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_cornerThree2}
                                x={COURT_WIDTH - ZONE_POSITIONS.cornerThree2.x - 20}
                                y={ZONE_POSITIONS.cornerThree2.y}
                                zoneName="cornerThree2"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_cornerThree2'}
                            />

                            <Path
                                data={mirrorPoints(generateWingThree1Shape())}
                                fill={getZoneColor(
                                    zoneStats.teamB_wingThree1?.percentage,
                                    selectedZone === 'teamB_wingThree1',
                                    zoneStats.teamB_wingThree1
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('wingThree1', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_wingThree1}
                                x={COURT_WIDTH - ZONE_POSITIONS.wingThree1.x - 20}
                                y={ZONE_POSITIONS.wingThree1.y}
                                zoneName="wingThree1"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_wingThree1'}
                            />

                            <Path
                                data={mirrorPoints(generateWingThree2Shape())}
                                fill={getZoneColor(
                                    zoneStats.teamB_wingThree2?.percentage,
                                    selectedZone === 'teamB_wingThree2',
                                    zoneStats.teamB_wingThree2
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('wingThree2', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_wingThree2}
                                x={COURT_WIDTH - ZONE_POSITIONS.wingThree2.x - 20}
                                y={ZONE_POSITIONS.wingThree2.y}
                                zoneName="wingThree2"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_wingThree2'}
                            />

                            <Path
                                data={mirrorPoints(generateTopKeyThreeShape())}
                                fill={getZoneColor(
                                    zoneStats.teamB_topKeyThree?.percentage,
                                    selectedZone === 'teamB_topKeyThree',
                                    zoneStats.teamB_topKeyThree
                                )}
                                stroke="black"
                                strokeWidth={1}
                                onClick={() => handleZoneClick('topKeyThree', teamBId)}
                            />
                            <ZoneStatsDisplay
                                stats={zoneStats.teamB_topKeyThree}
                                x={COURT_WIDTH - ZONE_POSITIONS.topKeyThree.x - 20}
                                y={ZONE_POSITIONS.topKeyThree.y}
                                zoneName="topKeyThree"
                                teamId={teamBId}
                                isSelected={selectedZone === 'teamB_topKeyThree'}
                            />

                            {/* Updated shot markers */}
                            {getVisibleShots(shots, selectedZone, selectedPlayer).map((shot, index) => {
                                const coords = getShotCoordinates(shot);
                                return (
                                    <Group key={index} x={coords.x} y={coords.y}>
                                        {shot.made ? (
                                            <Circle radius={5} fill="green" opacity={0.8} />
                                        ) : (
                                            <>
                                                <Line points={[-5, -5, 5, 5]} stroke="red" strokeWidth={2} opacity={0.8} />
                                                <Line points={[-5, 5, 5, -5]} stroke="red" strokeWidth={2} opacity={0.8} />
                                            </>
                                        )}
                                    </Group>
                                );
                            })}

                            {/* Add the legend */}
                            <ShootingLegend />
                        </>
                    )}
                </Layer>
            </Stage>
        </div>
    );
};


export default CourtStage;
