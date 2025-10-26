const EPSILON = 1e-6;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const distance = (a, b) => Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0));

const mergeBounds = (boundsList = []) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  boundsList.forEach((bounds) => {
    if (!bounds) {
      return;
    }
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
};

const inflateBounds = (bounds, padding) => {
  if (!bounds) {
    return null;
  }
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
    centerX: bounds.centerX,
    centerY: bounds.centerY,
  };
};

const boundsOverlap = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
};

const normalizePoint = (point) => {
  if (!point) {
    return null;
  }
  if (Array.isArray(point)) {
    return {
      x: Number(point[0]) || 0,
      y: Number(point[1]) || 0,
      pressure: point[2] !== undefined ? Number(point[2]) : undefined,
    };
  }
  return {
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
    pressure: point.pressure !== undefined ? Number(point.pressure) : undefined,
  };
};

const computeTurnAngle = (a, b, c) => {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;
  return Math.atan2(cross, dot);
};

const angleSimilarity = (angleA, angleB) => {
  const delta = Math.abs(angleA - angleB) % (Math.PI * 2);
  const shortest = delta > Math.PI ? (Math.PI * 2) - delta : delta;
  return 1 - clamp01(shortest / (Math.PI / 2));
};

const vectorAngle = (start, end) => Math.atan2((end.y ?? 0) - (start.y ?? 0), (end.x ?? 0) - (start.x ?? 0));

class StrokeAnalyzer {
  constructor(options = {}) {
    this.debug = !!options.debug;
  }

  analyzeStroke(pathPoints = []) {
    const points = (Array.isArray(pathPoints) ? pathPoints : [])
      .map(normalizePoint)
      .filter(Boolean);

    if (points.length < 2) {
      return {
        bounds: mergeBounds(),
        direction: 'unknown',
        shape: 'dot',
        length: 0,
        curvature: 0,
        chordLength: 0,
        pointCount: points.length,
        closed: false,
        start: points[0] || null,
        end: points[points.length - 1] || null,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let length = 0;
    let totalCurvature = 0;
    let pressureSum = 0;
    let pressureCount = 0;

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);

      if (i > 0) {
        length += distance(points[i - 1], p);
      }

      if (p.pressure !== undefined) {
        pressureSum += p.pressure;
        pressureCount += 1;
      }

      if (i > 0 && i < points.length - 1) {
        totalCurvature += Math.abs(computeTurnAngle(points[i - 1], p, points[i + 1]));
      }
    }

    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 0;
      maxY = 0;
    }

    const width = Math.max(0, maxX - minX);
    const height = Math.max(0, maxY - minY);
    const bounds = {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2,
    };

    const start = points[0];
    const end = points[points.length - 1];
    const chordLength = distance(start, end);

    const curvature = points.length > 2 ? totalCurvature / Math.PI : 0;
    const straightness = 1 - Math.min(1, curvature);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let direction = 'diagonal';
    if (curvature > 1.2) {
      direction = 'curved';
    } else if (absDx > absDy * 1.5) {
      direction = 'horizontal';
    } else if (absDy > absDx * 1.5) {
      direction = 'vertical';
    }

    const closed = chordLength < Math.min(width, height) * 0.35;

    let shape = 'complex';
    if (straightness > 0.75) {
      shape = 'line';
    } else if (closed && curvature > 1.2) {
      if (Math.abs(width - height) <= Math.max(width, height) * 0.4) {
        shape = 'circle';
      } else {
        shape = 'loop';
      }
    } else if (!closed && curvature > 0.45) {
      shape = 'arc';
    }

    const averagePressure = pressureCount > 0 ? pressureSum / pressureCount : undefined;

    return {
      bounds,
      direction,
      shape,
      length,
      curvature,
      chordLength,
      pointCount: points.length,
      closed,
      straightness,
      start,
      end,
      points,
      averagePressure,
      angle: vectorAngle(start, end),
    };
  }

  groupStrokes(strokes = [], maxDistance = 32) {
    if (!Array.isArray(strokes) || !strokes.length) {
      return [];
    }

    const annotated = strokes
      .map((stroke) => {
        if (!stroke) {
          return null;
        }
        if (!stroke.points && Array.isArray(stroke.strokePoints)) {
          stroke.points = stroke.strokePoints;
        }
        const features = stroke.features || this.analyzeStroke(stroke.points || []);
        stroke.features = features;
        stroke.bounds = stroke.bounds || features.bounds;
        return stroke;
      })
      .filter(Boolean);

    const groups = [];
    const visited = new Set();
    let groupIndex = 0;

    const centers = annotated.map((stroke) => ({
      x: stroke.features?.bounds.centerX ?? 0,
      y: stroke.features?.bounds.centerY ?? 0,
    }));

    const getNeighbors = (source, sourceIndex) => {
      const neighbors = [];
      const sourceBounds = inflateBounds(source.bounds, maxDistance);
      const sourceCenter = centers[sourceIndex];

      annotated.forEach((candidate, idx) => {
        if (visited.has(candidate) || candidate === source) {
          return;
        }
        const candidateBounds = inflateBounds(candidate.bounds, maxDistance);
        if (boundsOverlap(sourceBounds, candidateBounds)) {
          neighbors.push(candidate);
          return;
        }
        const center = centers[idx];
        const centerDistance = distance(sourceCenter, center);
        const size = Math.max(candidate.bounds.width, candidate.bounds.height, source.bounds.width, source.bounds.height);
        if (centerDistance <= maxDistance + size * 0.5) {
          neighbors.push(candidate);
        }
      });
      return neighbors;
    };

  annotated.forEach((stroke) => {
      if (visited.has(stroke)) {
        return;
      }
      visited.add(stroke);
      const queue = [stroke];
      const group = [];

      while (queue.length) {
        const current = queue.pop();
        group.push(current);
        const currentIndex = annotated.indexOf(current);
        getNeighbors(current, currentIndex).forEach((candidate) => {
          if (visited.has(candidate)) {
            return;
          }
          visited.add(candidate);
          queue.push(candidate);
        });
      }

      const groupBounds = mergeBounds(group.map((item) => item.bounds));
      groups.push({
        id: `stroke-group-${groupIndex += 1}`,
        strokes: group,
        bounds: groupBounds,
        center: { x: groupBounds.centerX, y: groupBounds.centerY },
      });
    });

    return groups;
  }

  detectSymbol(strokeGroup) {
    if (!strokeGroup) {
      return { symbol: null, confidence: 0, analysis: null };
    }

    const strokes = Array.isArray(strokeGroup) ? strokeGroup : strokeGroup.strokes;
    if (!Array.isArray(strokes) || !strokes.length) {
      return { symbol: null, confidence: 0, analysis: null };
    }

    const featuresList = strokes.map((stroke) => {
      if (!stroke.features) {
        stroke.features = this.analyzeStroke(stroke.points || stroke.strokePoints || []);
      }
      return stroke.features;
    });

    const groupBounds = mergeBounds(featuresList.map((f) => f.bounds));
    const strokeCount = strokes.length;
    const totalCurvature = featuresList.reduce((sum, feature) => sum + (feature.curvature || 0), 0);
    const longestStroke = featuresList.reduce((best, feature) => {
      if (!best || feature.length > best.length) {
        return feature;
      }
      return best;
    }, null);

    const closedStrokeCount = featuresList.filter((feature) => feature.closed).length;

    const start = longestStroke?.start || featuresList[0]?.start || { x: groupBounds.minX, y: groupBounds.minY };
    const end = longestStroke?.end || featuresList[0]?.end || { x: groupBounds.maxX, y: groupBounds.maxY };

    const width = groupBounds.width || EPSILON;
    const height = groupBounds.height || EPSILON;

    const startRel = {
      x: (start.x - groupBounds.minX) / width,
      y: (start.y - groupBounds.minY) / height,
    };
    const endRel = {
      x: (end.x - groupBounds.minX) / width,
      y: (end.y - groupBounds.minY) / height,
    };

    const hasHorizontalLine = featuresList.some((feature) => feature.shape === 'line' && feature.direction === 'horizontal');
    const hasVerticalLine = featuresList.some((feature) => feature.shape === 'line' && feature.direction === 'vertical');
    const hasDiagonalLine = featuresList.some((feature) => feature.shape === 'line' && feature.direction === 'diagonal');

    const softLinearity = (feature) => clamp01(feature.straightness ?? (1 - feature.curvature));

    const scoreMinus = () => {
      if (strokeCount !== 1) {
        return 0;
      }
      const feature = featuresList[0];
      const horizontalAlignment = Math.abs(feature.end.y - feature.start.y) / (Math.abs(feature.end.x - feature.start.x) + Math.abs(feature.end.y - feature.start.y) + EPSILON);
      const linearity = softLinearity(feature);
      return clamp01(linearity * (1 - horizontalAlignment));
    };

    const scorePlus = () => {
      if (strokeCount !== 2) {
        return 0;
      }
      const [a, b] = featuresList;
      const horizontal = [a, b].filter((feature) => feature.shape === 'line' && feature.direction === 'horizontal');
      const vertical = [a, b].filter((feature) => feature.shape === 'line' && feature.direction === 'vertical');
      if (horizontal.length !== 1 || vertical.length !== 1) {
        return 0;
      }
      const centerDistance = distance(
        { x: horizontal[0].bounds.centerX, y: horizontal[0].bounds.centerY },
        { x: vertical[0].bounds.centerX, y: vertical[0].bounds.centerY }
      );
      const alignmentScore = clamp01(1 - (centerDistance / Math.max(width, height, 1)));
      const angleScore = clamp01(angleSimilarity(horizontal[0].angle, vertical[0].angle + Math.PI / 2));
      return clamp01((softLinearity(horizontal[0]) + softLinearity(vertical[0])) * 0.5 * (0.6 + 0.4 * alignmentScore * angleScore));
    };

    const scoreTimes = () => {
      if (strokeCount !== 2) {
        return 0;
      }
      const [a, b] = featuresList;
      if (softLinearity(a) < 0.6 || softLinearity(b) < 0.6) {
        return 0;
      }
      if (a.direction !== 'diagonal' || b.direction !== 'diagonal') {
        return 0;
      }
      const angleScore = clamp01(angleSimilarity(a.angle, b.angle + Math.PI / 2));
      return clamp01(angleScore * 0.8 + 0.2);
    };

    const scoreEquals = () => {
      if (strokeCount !== 2) {
        return 0;
      }
      const horizontalLines = featuresList.filter((feature) => feature.shape === 'line' && feature.direction === 'horizontal');
      if (horizontalLines.length !== 2) {
        return 0;
      }
      const [top, bottom] = horizontalLines.sort((a, b) => a.bounds.centerY - b.bounds.centerY);
      const verticalGap = Math.abs(top.bounds.centerY - bottom.bounds.centerY);
      const overlap = Math.max(0, Math.min(top.bounds.maxX, bottom.bounds.maxX) - Math.max(top.bounds.minX, bottom.bounds.minX));
      const widthScale = Math.max(width, top.bounds.width, bottom.bounds.width, 1);
      const gapScore = clamp01(1 - (verticalGap / widthScale) * 1.2);
      const overlapScore = clamp01(overlap / widthScale);
      const linearityScore = (softLinearity(top) + softLinearity(bottom)) * 0.5;
      return clamp01(linearityScore * (0.35 + 0.65 * gapScore * overlapScore));
    };

    const scoreDivide = () => {
      if (strokeCount !== 3) {
        return 0;
      }
      const horizontalLines = featuresList.filter((feature) => feature.shape === 'line' && feature.direction === 'horizontal');
      if (horizontalLines.length !== 1) {
        return 0;
      }
      const dots = featuresList.filter((feature) => feature.bounds.width < width * 0.5 && feature.bounds.height < height * 0.5 && feature.length < Math.max(width, height) * 0.8);
      if (dots.length !== 2) {
        return 0;
      }
      const [dotA, dotB] = dots.sort((a, b) => a.bounds.centerY - b.bounds.centerY);
      const line = horizontalLines[0];
      const verticalAlignment = clamp01(1 - Math.abs(line.bounds.centerY - (dotA.bounds.centerY + dotB.bounds.centerY) / 2) / Math.max(height, 1));
      return clamp01((softLinearity(line) * 0.6) + (verticalAlignment * 0.4));
    };

    const scoreZero = () => {
      if (!closedStrokeCount) {
        return 0;
      }
      const aspect = height / (width + EPSILON);
      const aspectScore = clamp01(1 - Math.abs(aspect - 1));
      const closureScore = clamp01(closedStrokeCount / strokeCount);
      return clamp01(0.6 * closureScore + 0.4 * aspectScore);
    };

    const scoreOne = () => {
      if (strokeCount > 2) {
        return 0;
      }
      const verticalLines = featuresList.filter((feature) => feature.direction === 'vertical');
      if (!verticalLines.length) {
        return 0;
      }
      const mainLine = verticalLines[0];
      const alignment = Math.abs(mainLine.bounds.centerX - groupBounds.centerX) / Math.max(width, 1);
      return clamp01(softLinearity(mainLine) * (1 - alignment));
    };

    const scoreTwo = () => {
      if (closedStrokeCount) {
        return 0;
      }
      const curvatureScore = clamp01(totalCurvature / 1.5);
      const directionScore = startRel.x < 0.4 && endRel.x > 0.6 ? 0.7 : 0.2;
      return clamp01(0.5 * curvatureScore + 0.5 * directionScore);
    };

    const scoreThree = () => {
      if (closedStrokeCount) {
        return 0;
      }
      const curvatureScore = clamp01(totalCurvature / 2);
      const verticalSpan = Math.abs(endRel.y - startRel.y);
      const spanScore = clamp01(1 - verticalSpan);
      return clamp01(0.6 * curvatureScore + 0.4 * spanScore);
    };

    const scoreFour = () => {
      if (strokeCount < 2 || strokeCount > 3) {
        return 0;
      }
      if (!hasVerticalLine) {
        return 0;
      }
      if (!hasHorizontalLine && !hasDiagonalLine) {
        return 0;
      }
      return clamp01((hasDiagonalLine ? 0.5 : 0.3) + (hasHorizontalLine ? 0.5 : 0));
    };

    const scoreFive = () => {
      if (closedStrokeCount) {
        return 0;
      }
      const horizontalTop = featuresList.find((feature) => feature.shape === 'line' && feature.direction === 'horizontal' && feature.bounds.centerY - groupBounds.minY < height * 0.4);
      const curvatureScore = clamp01(totalCurvature / 1.6);
      const topScore = horizontalTop ? 0.6 : 0.2;
      return clamp01(0.4 * curvatureScore + topScore);
    };

    const scoreSix = () => {
      if (!closedStrokeCount) {
        return 0;
      }
      const curvatureScore = clamp01(totalCurvature / 1.6);
      const startHigher = startRel.y < endRel.y ? 0.6 : 0.2;
      return clamp01(0.6 * curvatureScore + 0.4 * startHigher);
    };

    const scoreSeven = () => {
      if (strokeCount > 2) {
        return 0;
      }
      if (!hasHorizontalLine || !hasDiagonalLine) {
        return 0;
      }
      return clamp01(softLinearity(longestStroke || featuresList[0]));
    };

    const scoreEight = () => {
      if (strokeCount < 1) {
        return 0;
      }
      if (closedStrokeCount >= 2) {
        return 0.8;
      }
      const curvatureScore = clamp01(totalCurvature / 2.5);
      return curvatureScore;
    };

    const scoreNine = () => {
      if (!closedStrokeCount) {
        return 0;
      }
      const curvatureScore = clamp01(totalCurvature / 1.6);
      const endHigher = endRel.y < startRel.y ? 0.6 : 0.3;
      return clamp01(0.6 * curvatureScore + 0.4 * endHigher);
    };

    const candidates = [
      { symbol: '-', score: scoreMinus() },
      { symbol: '+', score: scorePlus() },
      { symbol: '×', score: scoreTimes() },
      { symbol: '=', score: scoreEquals() },
      { symbol: '÷', score: scoreDivide() },
      { symbol: '0', score: scoreZero() },
      { symbol: '1', score: scoreOne() },
      { symbol: '2', score: scoreTwo() },
      { symbol: '3', score: scoreThree() },
      { symbol: '4', score: scoreFour() },
      { symbol: '5', score: scoreFive() },
      { symbol: '6', score: scoreSix() },
      { symbol: '7', score: scoreSeven() },
      { symbol: '8', score: scoreEight() },
      { symbol: '9', score: scoreNine() },
    ];

    const best = candidates.reduce((winner, candidate) => {
      if (!winner || candidate.score > winner.score) {
        return candidate;
      }
      return winner;
    }, null);

    if (!best || best.score < 0.18) {
      return {
        symbol: null,
        confidence: best ? Math.min(0.25, best.score) : 0,
        analysis: {
          bounds: groupBounds,
          strokeCount,
          totalCurvature,
          closedStrokeCount,
          features: featuresList,
        },
      };
    }

    return {
      symbol: best.symbol,
      confidence: clamp01(best.score),
      analysis: {
        bounds: groupBounds,
        strokeCount,
        totalCurvature,
        closedStrokeCount,
        features: featuresList,
      },
    };
  }
}

export default StrokeAnalyzer;
export {
  mergeBounds,
  inflateBounds,
  boundsOverlap,
  distance,
};
