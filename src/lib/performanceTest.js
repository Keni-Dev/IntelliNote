/**
 * Performance Testing Utilities for Virtual Canvas Engine
 * 
 * Use these functions to test and benchmark the virtual canvas engine
 * with large numbers of objects.
 */

import * as fabric from 'fabric';

/**
 * Generate random strokes for performance testing
 * @param {number} count - Number of strokes to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of fabric.Path objects
 */
export function generateRandomStrokes(count = 1000, options = {}) {
  const {
    spread = 10000,        // How far apart objects can be
    minLength = 20,        // Minimum stroke length
    maxLength = 200,       // Maximum stroke length
    colorful = true,       // Use random colors or black
    complexity = 'simple'  // 'simple', 'medium', 'complex'
  } = options;

  const strokes = [];
  
  for (let i = 0; i < count; i++) {
    const x = Math.random() * spread - spread / 2;
    const y = Math.random() * spread - spread / 2;
    const length = minLength + Math.random() * (maxLength - minLength);
    const angle = Math.random() * Math.PI * 2;
    
    let pathData;
    
    switch (complexity) {
      case 'simple':
        // Simple line
        pathData = `M ${x} ${y} L ${x + length * Math.cos(angle)} ${y + length * Math.sin(angle)}`;
        break;
        
      case 'medium': {
        // Curved stroke
        const cx = x + (length / 2) * Math.cos(angle);
        const cy = y + (length / 2) * Math.sin(angle);
        const ex = x + length * Math.cos(angle);
        const ey = y + length * Math.sin(angle);
        pathData = `M ${x} ${y} Q ${cx + Math.random() * 50 - 25} ${cy + Math.random() * 50 - 25} ${ex} ${ey}`;
        break;
      }
        
      case 'complex': {
        // Multi-segment path
        let segments = `M ${x} ${y}`;
        for (let j = 0; j < 5; j++) {
          const segX = x + (length / 5) * (j + 1) * Math.cos(angle) + Math.random() * 20 - 10;
          const segY = y + (length / 5) * (j + 1) * Math.sin(angle) + Math.random() * 20 - 10;
          segments += ` L ${segX} ${segY}`;
        }
        pathData = segments;
        break;
      }
        
      default:
        pathData = `M ${x} ${y} L ${x + length} ${y}`;
    }
    
    const color = colorful 
      ? `hsl(${Math.random() * 360}, ${50 + Math.random() * 30}%, ${40 + Math.random() * 20}%)`
      : '#000000';
    
    const path = new fabric.Path(pathData, {
      stroke: color,
      strokeWidth: 1 + Math.random() * 3,
      fill: null,
      selectable: true,
      objectCaching: true,
    });
    
    strokes.push(path);
  }
  
  return strokes;
}

/**
 * Generate random shapes for testing
 * @param {number} count - Number of shapes to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of fabric objects
 */
export function generateRandomShapes(count = 1000, options = {}) {
  const {
    spread = 10000,
    minSize = 20,
    maxSize = 100,
    colorful = true
  } = options;

  const shapes = [];
  const shapeTypes = ['rect', 'circle', 'triangle'];
  
  for (let i = 0; i < count; i++) {
    const x = Math.random() * spread - spread / 2;
    const y = Math.random() * spread - spread / 2;
    const size = minSize + Math.random() * (maxSize - minSize);
    const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    
    const color = colorful 
      ? `hsl(${Math.random() * 360}, 70%, 60%)`
      : '#cccccc';
    
    let shape;
    
    switch (type) {
      case 'rect':
        shape = new fabric.Rect({
          left: x,
          top: y,
          width: size,
          height: size * (0.5 + Math.random() * 0.5),
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2
        });
        break;
        
      case 'circle':
        shape = new fabric.Circle({
          left: x,
          top: y,
          radius: size / 2,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2
        });
        break;
        
      case 'triangle':
        shape = new fabric.Triangle({
          left: x,
          top: y,
          width: size,
          height: size,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2
        });
        break;
    }
    
    if (shape) {
      shape.objectCaching = true;
      shapes.push(shape);
    }
  }
  
  return shapes;
}

/**
 * Run performance benchmark
 * @param {fabric.Canvas} canvas - Canvas with virtual engine
 * @param {Object} config - Test configuration
 */
export async function runPerformanceBenchmark(canvas, config = {}) {
  const {
    objectCounts = [100, 500, 1000, 5000, 10000],
    objectType = 'strokes', // 'strokes', 'shapes', 'mixed'
    logResults = true
  } = config;

  const results = [];
  
  for (const count of objectCounts) {
    // Clear canvas
    if (canvas.virtualEngine) {
      canvas.virtualEngine.clear();
    } else {
      canvas.clear();
    }
    
    // Generate objects
    console.log(`\n🧪 Testing with ${count} objects...`);
    const startGen = performance.now();
    
    let objects;
    if (objectType === 'strokes') {
      objects = generateRandomStrokes(count);
    } else if (objectType === 'shapes') {
      objects = generateRandomShapes(count);
    } else {
      const half = Math.floor(count / 2);
      objects = [
        ...generateRandomStrokes(half),
        ...generateRandomShapes(count - half)
      ];
    }
    
    const genTime = performance.now() - startGen;
    
    // Add to canvas
    const startAdd = performance.now();
    if (canvas.virtualEngine) {
      canvas.virtualEngine.addObjects(objects);
    } else {
      objects.forEach(obj => canvas.add(obj));
      canvas.requestRenderAll();
    }
    const addTime = performance.now() - startAdd;
    
    // Wait for render
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Measure render time
    const startRender = performance.now();
    canvas.requestRenderAll();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const renderTime = performance.now() - startRender;
    
    // Test pan performance
    const startPan = performance.now();
    for (let i = 0; i < 10; i++) {
      const vpt = canvas.viewportTransform;
      vpt[4] += 100;
      canvas.setViewportTransform(vpt);
      canvas.requestRenderAll();
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const panTime = (performance.now() - startPan) / 10;
    
    // Test zoom performance
    const startZoom = performance.now();
    for (let i = 0; i < 10; i++) {
      canvas.setZoom(0.5 + (i / 10));
      canvas.requestRenderAll();
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const zoomTime = (performance.now() - startZoom) / 10;
    
    // Reset zoom
    canvas.setZoom(1);
    
    // Get stats
    const stats = canvas.virtualEngine 
      ? canvas.virtualEngine.getStats()
      : { totalObjects: count, renderedObjects: count };
    
    const result = {
      objectCount: count,
      generationTime: genTime.toFixed(2) + 'ms',
      addTime: addTime.toFixed(2) + 'ms',
      renderTime: renderTime.toFixed(2) + 'ms',
      panTime: panTime.toFixed(2) + 'ms',
      zoomTime: zoomTime.toFixed(2) + 'ms',
      renderedObjects: stats.renderedObjects,
      culledObjects: stats.culledObjects || 0,
      efficiency: stats.renderEfficiency || 'N/A'
    };
    
    results.push(result);
    
    if (logResults) {
      console.table(result);
    }
  }
  
  if (logResults) {
    console.log('\n📊 Benchmark Summary');
    console.table(results);
  }
  
  return results;
}

/**
 * Stress test - gradually add objects until performance degrades
 * @param {fabric.Canvas} canvas - Canvas with virtual engine
 * @param {Object} options - Test options
 */
export async function stressTest(canvas, options = {}) {
  const {
    batchSize = 100,
    targetFPS = 60,
    maxObjects = 100000,
    logProgress = true
  } = options;

  console.log('🔥 Starting stress test...');
  console.log(`Target: ${targetFPS} FPS | Batch: ${batchSize} objects | Max: ${maxObjects}`);
  
  let totalObjects = 0;
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  
  while (totalObjects < maxObjects && fps >= targetFPS * 0.8) {
    // Add batch of objects
    const objects = generateRandomStrokes(batchSize, { complexity: 'medium' });
    
    if (canvas.virtualEngine) {
      canvas.virtualEngine.addObjects(objects);
    } else {
      objects.forEach(obj => canvas.add(obj));
    }
    
    totalObjects += batchSize;
    
    // Measure FPS
    const now = performance.now();
    frameCount++;
    
    if (now - lastFrameTime >= 1000) {
      fps = Math.round(frameCount * 1000 / (now - lastFrameTime));
      frameCount = 0;
      lastFrameTime = now;
      
      const stats = canvas.virtualEngine 
        ? canvas.virtualEngine.getStats()
        : { renderedObjects: totalObjects };
      
      if (logProgress) {
        console.log(`📈 ${totalObjects} objects | ${fps} FPS | Rendered: ${stats.renderedObjects}`);
      }
    }
    
    // Trigger render
    canvas.requestRenderAll();
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Random pan/zoom to simulate real usage
    if (totalObjects % 500 === 0) {
      const vpt = canvas.viewportTransform;
      vpt[4] += Math.random() * 200 - 100;
      vpt[5] += Math.random() * 200 - 100;
      canvas.setViewportTransform(vpt);
    }
  }
  
  console.log(`\n✅ Stress test complete!`);
  console.log(`Maximum objects with ≥${targetFPS * 0.8} FPS: ${totalObjects}`);
  
  if (canvas.virtualEngine) {
    console.log('\n📊 Final Stats:');
    canvas.virtualEngine.logStats();
  }
  
  return { totalObjects, fps };
}

/**
 * Compare performance with and without virtual engine
 */
export async function compareEngines(canvas) {
  console.log('⚖️  Comparing Virtual Engine vs Standard Rendering\n');
  
  const testCounts = [100, 500, 1000, 2000];
  const results = [];
  
  for (const count of testCounts) {
    console.log(`Testing ${count} objects...`);
    
    // Test with virtual engine
    canvas.virtualEngine?.setEnabled(true);
    canvas.virtualEngine?.clear();
    
    const objects1 = generateRandomStrokes(count);
    const startWithEngine = performance.now();
    canvas.virtualEngine?.addObjects(objects1);
    await new Promise(r => requestAnimationFrame(r));
    const timeWithEngine = performance.now() - startWithEngine;
    
    // Test without virtual engine
    canvas.virtualEngine?.setEnabled(false);
    canvas.clear();
    
    const objects2 = generateRandomStrokes(count);
    const startWithout = performance.now();
    objects2.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    await new Promise(r => requestAnimationFrame(r));
    const timeWithout = performance.now() - startWithout;
    
    const speedup = (timeWithout / timeWithEngine).toFixed(2);
    
    results.push({
      objects: count,
      withEngine: timeWithEngine.toFixed(2) + 'ms',
      withoutEngine: timeWithout.toFixed(2) + 'ms',
      speedup: speedup + 'x faster'
    });
  }
  
  console.table(results);
  
  // Re-enable virtual engine
  canvas.virtualEngine?.setEnabled(true);
  canvas.virtualEngine?.clear();
  
  return results;
}

export default {
  generateRandomStrokes,
  generateRandomShapes,
  runPerformanceBenchmark,
  stressTest,
  compareEngines
};
