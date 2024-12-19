import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image, Line, Path, Group, Circle, Text } from 'react-konva';
import useImage from 'use-image';
import courtImg from '../assets/clippers-court2.png';

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


// Creates an arc passing through two given points (sx, sy) and (ex, ey) with a specified radiusFactor.
// radiusFactor determines how "curved" the arc is. For example, radiusFactor = 1 would create a semicircle
// spanning the line segment between the two points. Greater values produce a larger radius arc.
function generateArcFromTwoPoints(sx, sy, ex, ey, radiusFactor, step = 5) {
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const R = (dist / 2) * radiusFactor;
    const h = Math.sqrt(R * R - (dist / 2) * (dist / 2));

    // Midpoint of line segment
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    // Perp direction
    let px = -dy;
    let py = dx;
    const pl = Math.sqrt(px * px + py * py);
    px /= pl;
    py /= pl;

    // Choose arc direction: here we assume arc bulges "upwards"
    // Flip the sign of h if you want it to bulge the other way
    const cx = mx + px * h;
    const cy = my + py * h;

    const angleStart = Math.atan2(sy - cy, sx - cx) * (180 / Math.PI);
    const angleEnd = Math.atan2(ey - cy, ex - cx) * (180 / Math.PI);

    let startAngle = angleStart;
    let endAngle = angleEnd;
    if (endAngle < startAngle) {
        endAngle += 360;
    }

    const points = [];
    for (let angle = startAngle; angle <= endAngle; angle += step) {
        const rad = (angle * Math.PI) / 180;
        const x = cx + R * Math.cos(rad);
        const y = cy + R * Math.sin(rad);
        points.push(x, y);
    }
    // Ensure end angle point is included
    if (endAngle % step !== 0) {
        const rad = (endAngle * Math.PI) / 180;
        points.push(cx + R * Math.cos(rad), cy + R * Math.sin(rad));
    }

    return points;
}



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


const CourtStage = ({ displayMode, lineupsData, snapshot, gameId }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [courtImage] = useImage(courtImg);
    const [shots, setShots] = useState([]);

    // Add useEffect to fetch shots when in shooting mode
    useEffect(() => {
        if (displayMode === 'shooting' && snapshot && gameId) {
            fetch(`http://localhost:5002/api/shots?snapshot=${snapshot}&game_id=${gameId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.shots) {
                        setShots(data.shots);
                    }
                })
                .catch(error => {
                    console.error('Error fetching shots:', error);
                });
        }
    }, [displayMode, snapshot, gameId]);

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

    if (!dimensions.width || !dimensions.height) {
        return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
    }

    const scale = Math.min(dimensions.width / COURT_WIDTH, dimensions.height / COURT_HEIGHT);

    // Function to calculate player positions
    const getPlayerPositions = (players, isTeamA) => {
        const positions = [];
        const baseX = isTeamA ? COURT_WIDTH * 0.25 : COURT_WIDTH * 0.75;
        const spacing = 80;  // Vertical spacing between players
        const startY = COURT_HEIGHT * 0.2;  // Start from 20% down the court

        players.forEach((player, index) => {
            positions.push({
                x: baseX + (index % 2) * 60 - 30,  // Stagger players left/right
                y: startY + Math.floor(index / 2) * spacing,
                player: player
            });
        });

        return positions;
    };

    // Function to format stint time
    const formatStintTime = (seconds) => {
        if (!seconds && seconds !== 0) return '';
        const mins = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.floor(Math.abs(seconds) % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const paintPoints = generatePaintShape();
    const midRange1Points = generateMidRange1Shape();
    // const midRange2Points = generateMidRange2Shape();
    const midRange2Points = generateMidRange2Shapepath();
    const midRange3Points = generateMidRange3Shape();

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <Stage
                width={COURT_WIDTH * scale}
                height={COURT_HEIGHT * scale}
                scale={{ x: scale, y: scale }}
            >
                <Layer>
                    {courtImage && <Image image={courtImage} width={COURT_WIDTH} height={COURT_HEIGHT} />}

                    {displayMode === 'shooting' && (
                        <>
                            {/* Paint */}
                            <Line
                                points={paintPoints}
                                closed={true}
                                fill={PAINT.fill}
                                stroke={PAINT.stroke}
                                strokeWidth={1}
                            />
                            {/* Mid-range zones */}
                            <Line
                                points={midRange1Points}
                                closed={true}
                                fill="rgba(0, 255, 0, 0.3)"
                                stroke="black"
                                strokeWidth={1}
                            />
                            <Path
                                data={midRange2Points}
                                fill="rgba(0, 255, 0, 0.3)"
                                stroke="black"
                                strokeWidth={1}
                            />

                            <Line
                                points={midRange3Points}
                                closed={true}
                                fill="rgba(0, 255, 0, 0.3)"
                                stroke="black"
                                strokeWidth={1}
                            />
                            {/* New three-point zones */}
                            <Line points={generateCornerThree1Shape()} closed={true} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Line points={generateCornerThree2Shape()} closed={true} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Path data={generateWingThree1Shape()} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Path data={generateWingThree2Shape()} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Path data={generateTopKeyThreeShape()} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            {/* Mirror all zones to right side */}
                            <Line
                                points={mirrorPoints(paintPoints)}
                                closed={true}
                                fill={PAINT.fill}
                                stroke={PAINT.stroke}
                                strokeWidth={1}
                            />
                            <Line
                                points={mirrorPoints(midRange1Points)}
                                closed={true}
                                fill="rgba(0, 255, 0, 0.3)"
                                stroke="black"
                                strokeWidth={1}
                            />
                            <Path
                                data={mirrorPoints(midRange2Points)}
                                fill="rgba(0, 255, 0, 0.3)"
                                stroke="black"
                                strokeWidth={1}
                            />
                            <Line
                                points={mirrorPoints(midRange3Points)}
                                closed={true}
                                fill="rgba(0, 255, 0, 0.3)"
                                stroke="black"
                                strokeWidth={1}
                            />
                            <Line points={mirrorPoints(generateCornerThree1Shape())} closed={true} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Line points={mirrorPoints(generateCornerThree2Shape())} closed={true} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Path data={mirrorPoints(generateWingThree1Shape())} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Path data={mirrorPoints(generateWingThree2Shape())} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />
                            <Path data={mirrorPoints(generateTopKeyThreeShape())} fill="rgba(255, 255, 0, 0.3)" stroke="black" strokeWidth={1} />

                            {/* Add shot markers */}
                            {shots.map((shot, index) => (
                                <Group key={index} x={shot.locationX} y={shot.locationY}>
                                    {shot.made ? (
                                        // Made shot - green circle
                                        <Circle
                                            radius={5}
                                            fill="green"
                                            opacity={0.8}
                                        />
                                    ) : (
                                        // Missed shot - red X
                                        <>
                                            <Line
                                                points={[-5, -5, 5, 5]}
                                                stroke="red"
                                                strokeWidth={2}
                                                opacity={0.8}
                                            />
                                            <Line
                                                points={[-5, 5, 5, -5]}
                                                stroke="red"
                                                strokeWidth={2}
                                                opacity={0.8}
                                            />
                                        </>
                                    )}
                                </Group>
                            ))}
                        </>
                    )}

                    {displayMode === 'lineup' && lineupsData && (
                        <>
                            {/* Team A Players */}
                            {getPlayerPositions(lineupsData.currentLineupTeamA, true).map((pos, i) => (
                                <Group key={`teamA-${i}`} x={pos.x} y={pos.y}>
                                    <Circle
                                        radius={20}
                                        fill="#2c5282"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                    <Text
                                        text={pos.player.jersey_number}
                                        fill="white"
                                        fontSize={16}
                                        fontStyle="bold"
                                        align="center"
                                        verticalAlign="middle"
                                        width={40}
                                        height={40}
                                        offsetX={20}
                                        offsetY={20}
                                    />
                                    <Text
                                        text={formatStintTime(pos.player.onCourtTime)}
                                        fill="black"
                                        fontSize={12}
                                        align="center"
                                        width={60}
                                        offsetX={30}
                                        y={25}
                                    />
                                </Group>
                            ))}

                            {/* Team B Players */}
                            {getPlayerPositions(lineupsData.currentLineupTeamB, false).map((pos, i) => (
                                <Group key={`teamB-${i}`} x={pos.x} y={pos.y}>
                                    <Circle
                                        radius={20}
                                        fill="#e53e3e"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                    <Text
                                        text={pos.player.jersey_number}
                                        fill="white"
                                        fontSize={16}
                                        fontStyle="bold"
                                        align="center"
                                        verticalAlign="middle"
                                        width={40}
                                        height={40}
                                        offsetX={20}
                                        offsetY={20}
                                    />
                                    <Text
                                        text={formatStintTime(pos.player.onCourtTime)}
                                        fill="black"
                                        fontSize={12}
                                        align="center"
                                        width={60}
                                        offsetX={30}
                                        y={25}
                                    />
                                </Group>
                            ))}
                        </>
                    )}
                </Layer>
            </Stage>
        </div>
    );
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

export default CourtStage;
