/**
 * Robust Equal Sign Detection
 * Scale-independent detection that works at any zoom level
 */

/**
 * Get bounding box from points
 */
const getBoundingBox = (points) => {
  if (!points || points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

/**
 * Check if a stroke is horizontal based on aspect ratio
 * @param {Object} bbox - Bounding box
 * @param {number} minAspectRatio - Minimum width/height ratio (default 3:1)
 * @returns {boolean}
 */
const isHorizontalStroke = (bbox, minAspectRatio = 3) => {
  if (!bbox || bbox.height === 0) return false;
  const aspectRatio = bbox.width / bbox.height;
  return aspectRatio >= minAspectRatio;
};

/**
 * Calculate horizontal overlap between two strokes
 * @returns {number} - Overlap distance in pixels
 */
const getHorizontalOverlap = (bbox1, bbox2) => {
  const overlapStart = Math.max(bbox1.minX, bbox2.minX);
  const overlapEnd = Math.min(bbox1.maxX, bbox2.maxX);
  return Math.max(0, overlapEnd - overlapStart);
};

/**
 * Calculate vertical spacing between two strokes
 * @returns {number} - Gap distance in pixels
 */
const getVerticalSpacing = (bbox1, bbox2) => {
  const topBox = bbox1.minY < bbox2.minY ? bbox1 : bbox2;
  const bottomBox = bbox1.minY < bbox2.minY ? bbox2 : bbox1;
  return bottomBox.minY - topBox.maxY;
};

/**
 * Check if two strokes are properly aligned horizontally
 * @param {number} minOverlapPercent - Minimum overlap percentage (default 60%)
 */
const areStrokesAligned = (bbox1, bbox2, minOverlapPercent = 60) => {
  const overlap = getHorizontalOverlap(bbox1, bbox2);
  const minWidth = Math.min(bbox1.width, bbox2.width);
  const overlapPercent = (overlap / minWidth) * 100;
  return overlapPercent >= minOverlapPercent;
};

/**
 * Main equal sign detection function
 * @param {Array} strokes - Array of stroke objects with points
 * @param {Object} options - Detection options
 * @returns {Object|null} - Detection result or null
 */
export const detectEqualSign = (strokes, options = {}) => {
  const {
    minAspectRatio = 2.5,        // Minimum width/height for horizontal line
    minOverlapPercent = 60,       // Minimum horizontal overlap percentage
    minWidthRatio = 0.65,         // Minimum width similarity ratio
    minSpacingRatio = 0.4,        // Minimum spacing (relative to line thickness)
    maxSpacingRatio = 3.5,        // Maximum spacing (relative to line thickness)
    minLengthRatio = 2,           // Minimum line length (relative to thickness)
    ignoreSpacing = true,         // Disable spacing check by default
    debug = false,
  } = options;

  // Must have exactly 2 strokes for an equal sign
  if (!strokes || strokes.length !== 2) {
    if (debug) console.log('[EqualSign] Invalid stroke count:', strokes?.length);
    return null;
  }

  // Extract points and calculate bounding boxes
  const stroke1 = strokes[0];
  const stroke2 = strokes[1];
  
  const points1 = stroke1.points || stroke1.strokePoints || [];
  const points2 = stroke2.points || stroke2.strokePoints || [];

  if (points1.length === 0 || points2.length === 0) {
    if (debug) console.log('[EqualSign] Empty stroke points');
    return null;
  }

  const bbox1 = stroke1.bounds || stroke1.features?.bounds || getBoundingBox(points1);
  const bbox2 = stroke2.bounds || stroke2.features?.bounds || getBoundingBox(points2);

  if (debug) {
    console.log('[EqualSign] Bbox1:', bbox1);
    console.log('[EqualSign] Bbox2:', bbox2);
  }

  // Check 1: Both strokes must be horizontal
  const horizontal1 = isHorizontalStroke(bbox1, minAspectRatio);
  const horizontal2 = isHorizontalStroke(bbox2, minAspectRatio);

  if (!horizontal1 || !horizontal2) {
    if (debug) {
      const ar1 = bbox1.width / bbox1.height;
      const ar2 = bbox2.width / bbox2.height;
      console.log('[EqualSign] FAIL: Not horizontal. AR1:', ar1.toFixed(2), 'AR2:', ar2.toFixed(2), 'Need >=', minAspectRatio);
    }
    return null;
  }

  // Check 2: Similar widths
  const widthRatio = Math.min(bbox1.width, bbox2.width) / Math.max(bbox1.width, bbox2.width);
  
  if (widthRatio < minWidthRatio) {
    if (debug) {
      console.log('[EqualSign] FAIL: Width mismatch. Ratio:', widthRatio.toFixed(2), 'Need >=', minWidthRatio);
    }
    return null;
  }

  // Check 3: Horizontal alignment (overlap)
  const aligned = areStrokesAligned(bbox1, bbox2, minOverlapPercent);
  
  if (!aligned) {
    const overlap = getHorizontalOverlap(bbox1, bbox2);
    const minWidth = Math.min(bbox1.width, bbox2.width);
    const overlapPercent = (overlap / minWidth) * 100;
    if (debug) {
      console.log('[EqualSign] FAIL: Poor alignment. Overlap:', overlapPercent.toFixed(1) + '%', 'Need >=', minOverlapPercent + '%');
    }
    return null;
  }

  // Check 4: Vertical spacing (gap between lines)
  // Spacing should be relative to BOTH the line thickness AND length
  // Longer lines naturally have more space between them
  const spacing = getVerticalSpacing(bbox1, bbox2);
  const avgHeight = (bbox1.height + bbox2.height) / 2;
  const avgWidth = (bbox1.width + bbox2.width) / 2;
  
  // Calculate adaptive spacing thresholds based on line length
  // Length factor: inverse relationship for short lines, scale up for long lines
  // Very short lines (<60px): use factor 1.5-2.0 (MORE tolerance)
  // Medium lines (60-100px): use factor 1.0 (standard)
  // Long lines (>100px): scale up to 2.5 (even more tolerance)
  let lengthFactor;
  if (avgWidth < 60) {
    // Short lines: 40px→2.0, 50px→1.75, 60px→1.5
    lengthFactor = 1.5 + (60 - avgWidth) / 40;
  } else if (avgWidth <= 100) {
    // Medium lines: linear from 1.5 at 60px to 1.0 at 100px
    lengthFactor = 1.5 - (avgWidth - 60) / 80;
  } else {
    // Long lines: scale up from 1.0 at 100px to 2.5 at 200px+
    lengthFactor = Math.min(2.5, 1.0 + (avgWidth - 100) / 100);
  }
  
  const adaptiveMinSpacing = minSpacingRatio * lengthFactor;
  const adaptiveMaxSpacing = maxSpacingRatio * lengthFactor;
  
  const spacingRatio = spacing / avgHeight;

  // Check spacing only if not disabled
  if (!ignoreSpacing && (spacingRatio < adaptiveMinSpacing || spacingRatio > adaptiveMaxSpacing)) {
    if (debug) {
      console.log('[EqualSign] FAIL: Spacing issue. Ratio:', spacingRatio.toFixed(2), 
                  'Need', adaptiveMinSpacing.toFixed(2), '-', adaptiveMaxSpacing.toFixed(2),
                  `(length factor: ${lengthFactor.toFixed(2)})`);
    }
    return null;
  }

  // Check 5: Lines must be sufficiently long (not just dots)
  const lengthCheck1 = bbox1.width > avgHeight * minLengthRatio;
  const lengthCheck2 = bbox2.width > avgHeight * minLengthRatio;

  if (!lengthCheck1 || !lengthCheck2) {
    if (debug) {
      console.log('[EqualSign] FAIL: Lines too short. Need width >', (avgHeight * minLengthRatio).toFixed(1) + 'px');
    }
    return null;
  }

  // Calculate combined bounds
  const combinedBounds = {
    minX: Math.min(bbox1.minX, bbox2.minX),
    maxX: Math.max(bbox1.maxX, bbox2.maxX),
    minY: Math.min(bbox1.minY, bbox2.minY),
    maxY: Math.max(bbox1.maxY, bbox2.maxY),
  };
  combinedBounds.width = combinedBounds.maxX - combinedBounds.minX;
  combinedBounds.height = combinedBounds.maxY - combinedBounds.minY;
  combinedBounds.centerX = (combinedBounds.minX + combinedBounds.maxX) / 2;
  combinedBounds.centerY = (combinedBounds.minY + combinedBounds.maxY) / 2;

  // Calculate confidence score (0-1)
  const aspectScore1 = Math.min(1, (bbox1.width / bbox1.height) / 10); // Max score at 10:1 ratio
  const aspectScore2 = Math.min(1, (bbox2.width / bbox2.height) / 10);
  const widthScore = widthRatio;
  const overlapScore = Math.min(1, (getHorizontalOverlap(bbox1, bbox2) / Math.min(bbox1.width, bbox2.width)));
  
  // Adaptive optimal spacing based on line length
  const optimalSpacing = 1.5 * lengthFactor; // Longer lines = expect more spacing
  const spacingScore = Math.max(0, 1 - Math.abs(spacingRatio - optimalSpacing) / 3);
  
  const confidence = (aspectScore1 + aspectScore2 + widthScore + overlapScore + spacingScore) / 5;

  if (debug) {
    console.log('[EqualSign] ✓ DETECTED! Confidence:', confidence.toFixed(2));
  }

  return {
    strokes: [stroke1, stroke2],
    bounds: combinedBounds,
    position: { x: combinedBounds.centerX, y: combinedBounds.centerY },
    confidence: Math.max(0.55, Math.min(1, confidence)),
    measurements: {
      aspectRatio1: bbox1.width / bbox1.height,
      aspectRatio2: bbox2.width / bbox2.height,
      widthRatio,
      overlapPercent: (getHorizontalOverlap(bbox1, bbox2) / Math.min(bbox1.width, bbox2.width)) * 100,
      spacing,
      spacingRatio,
      avgWidth,
      lengthFactor,
      adaptiveMinSpacing: minSpacingRatio * lengthFactor,
      adaptiveMaxSpacing: maxSpacingRatio * lengthFactor,
    },
  };
};

/**
 * Group strokes into potential equal sign pairs based on spatial proximity
 * This prevents multiple equal signs from being detected as one
 * @param {Array} strokes - All available strokes
 * @param {Object} options - Grouping options
 * @returns {Array} - Array of stroke groups (each group is [stroke1, stroke2])
 */
export const groupStrokesForEqualSign = (strokes, options = {}) => {
  const {
    maxHorizontalDistance = 200,  // Max horizontal distance between pair members
    maxVerticalDistance = 100,    // Max vertical distance between pair members
    minAspectRatio = 2.5,         // Only consider horizontal strokes
    debug = false,
  } = options;

  if (!strokes || strokes.length < 2) {
    return [];
  }

  // Extract bounding boxes for all strokes
  const strokesWithBounds = strokes.map((stroke) => {
    const points = stroke.points || stroke.strokePoints || [];
    const bbox = stroke.bounds || stroke.features?.bounds || getBoundingBox(points);
    return { stroke, bbox };
  }).filter(({ bbox }) => bbox && bbox.width > 0 && bbox.height > 0);

  // Filter to only horizontal strokes
  const horizontalStrokes = strokesWithBounds.filter(({ bbox }) => {
    return isHorizontalStroke(bbox, minAspectRatio);
  });

  if (horizontalStrokes.length < 2) {
    if (debug) console.log('[GroupStrokes] Not enough horizontal strokes:', horizontalStrokes.length);
    return [];
  }

  // Sort by vertical position (top to bottom)
  horizontalStrokes.sort((a, b) => a.bbox.centerY - b.bbox.centerY);

  const groups = [];
  const used = new Set();

  // For each stroke, try to find its closest neighbor
  for (let i = 0; i < horizontalStrokes.length; i++) {
    if (used.has(i)) continue;

    const stroke1 = horizontalStrokes[i];
    let bestMatch = null;
    let bestScore = -Infinity;

    // Look for the best matching stroke below this one
    for (let j = i + 1; j < horizontalStrokes.length; j++) {
      if (used.has(j)) continue;

      const stroke2 = horizontalStrokes[j];

      // Calculate distances
      const horizontalDist = Math.abs(stroke1.bbox.centerX - stroke2.bbox.centerX);
      const verticalDist = Math.abs(stroke1.bbox.centerY - stroke2.bbox.centerY);

      // Skip if too far apart
      if (horizontalDist > maxHorizontalDistance || verticalDist > maxVerticalDistance) {
        continue;
      }

      // Check if they could form an equal sign
      const overlap = getHorizontalOverlap(stroke1.bbox, stroke2.bbox);
      const minWidth = Math.min(stroke1.bbox.width, stroke2.bbox.width);
      const overlapPercent = (overlap / minWidth) * 100;

      // Require at least 40% overlap to be considered for grouping
      if (overlapPercent < 40) {
        continue;
      }

      // Score based on proximity and alignment (prefer closer, better aligned pairs)
      const proximityScore = 1 / (verticalDist + 1); // Closer = better
      const alignmentScore = overlapPercent / 100;   // More overlap = better
      const widthRatio = Math.min(stroke1.bbox.width, stroke2.bbox.width) / 
                        Math.max(stroke1.bbox.width, stroke2.bbox.width);
      const widthScore = widthRatio; // Similar width = better

      const score = proximityScore * 2 + alignmentScore + widthScore;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = j;
      }
    }

    // If we found a match, create a group
    if (bestMatch !== null) {
      groups.push([stroke1.stroke, horizontalStrokes[bestMatch].stroke]);
      used.add(i);
      used.add(bestMatch);

      if (debug) {
        console.log('[GroupStrokes] Paired stroke', i, 'with', bestMatch, 'score:', bestScore.toFixed(2));
      }
    }
  }

  if (debug) {
    console.log('[GroupStrokes] Found', groups.length, 'potential equal sign pairs from', strokes.length, 'strokes');
  }

  return groups;
};

/**
 * Detect equal signs from a collection of strokes
 * Handles multiple equal signs by grouping strokes first
 * @param {Array} strokes - All strokes to analyze
 * @param {Object} options - Detection options
 * @returns {Array} - Array of detection results (can be multiple equal signs)
 */
export const detectEqualSigns = (strokes, options = {}) => {
  const { debug = false } = options;

  // Group strokes into pairs
  const groups = groupStrokesForEqualSign(strokes, options);

  if (groups.length === 0) {
    if (debug) console.log('[DetectEqualSigns] No stroke pairs found');
    return [];
  }

  // Try to detect equal sign in each group
  const detections = groups
    .map((group) => detectEqualSign(group, options))
    .filter(Boolean);

  if (debug) {
    console.log('[DetectEqualSigns] Detected', detections.length, 'equal signs from', groups.length, 'pairs');
  }

  return detections;
};

/**
 * Detect the most recent equal sign (closest to the last drawn stroke)
 * @param {Array} strokes - All strokes (assumed sorted by creation time)
 * @param {Object} options - Detection options
 * @returns {Object|null} - Most recent equal sign detection or null
 */
export const detectMostRecentEqualSign = (strokes, options = {}) => {
  const { debug = false } = options;

  if (!strokes || strokes.length < 2) {
    return null;
  }

  // Get the most recent strokes (last 10 or so)
  const recentCount = Math.min(10, strokes.length);
  const recentStrokes = strokes.slice(-recentCount);

  // Group and detect
  const groups = groupStrokesForEqualSign(recentStrokes, options);
  
  if (groups.length === 0) {
    if (debug) console.log('[MostRecent] No pairs in recent strokes');
    return null;
  }

  // Try each group, prioritize the one with the newest strokes
  let bestDetection = null;
  let newestTimestamp = -Infinity;

  for (const group of groups) {
    const detection = detectEqualSign(group, options);
    if (!detection) continue;

    // Find the newest stroke in this group
    const groupTimestamp = Math.max(
      group[0].createdAt || 0,
      group[1].createdAt || 0
    );

    if (groupTimestamp > newestTimestamp) {
      newestTimestamp = groupTimestamp;
      bestDetection = detection;
    }
  }

  if (debug && bestDetection) {
    console.log('[MostRecent] Found most recent equal sign at timestamp:', newestTimestamp);
  }

  return bestDetection;
};

/**
 * Lenient equal sign detection for less strict matching
 * Useful when standard detection is too strict
 */
export const detectEqualSignLenient = (strokes, options = {}) => {
  return detectEqualSign(strokes, {
    minAspectRatio: 2.0,          // More lenient aspect ratio
    minOverlapPercent: 50,         // Less overlap required
    minWidthRatio: 0.55,          // Allow more width difference
    minSpacingRatio: 0.3,         // Closer lines OK
    maxSpacingRatio: 4.5,         // Further apart OK
    minLengthRatio: 1.5,          // Shorter lines OK
    ...options,
  });
};
