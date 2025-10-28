/**
 * HTML to Fabric Image Converter
 * 
 * Converts HTML elements (like KaTeX-rendered math) to fabric.js Image objects
 * This allows HTML-rendered content to be added to the canvas as erasable, movable objects
 */

import * as fabric from 'fabric';

/**
 * Convert an HTML element to a fabric.js Image object
 * 
 * @param {HTMLElement} htmlElement - The HTML element to convert
 * @param {Object} options - Fabric.js object options
 * @returns {Promise<fabric.Image>} Promise that resolves to fabric.Image object
 */
export async function htmlToFabricImage(htmlElement, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas to render the HTML
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      // Get the bounding box of the element
      const bbox = htmlElement.getBoundingClientRect();
      const width = Math.ceil(bbox.width) || 200;
      const height = Math.ceil(bbox.height) || 60;
      
      // Set canvas size with high DPI for crisp rendering
      const scale = window.devicePixelRatio || 2;
      tempCanvas.width = width * scale;
      tempCanvas.height = height * scale;
      tempCanvas.style.width = `${width}px`;
      tempCanvas.style.height = `${height}px`;
      ctx.scale(scale, scale);
      
      // Create SVG with embedded HTML
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 16px;">
              ${htmlElement.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;
      
      // Create an image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Draw to canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Create fabric image from canvas
        const dataUrl = tempCanvas.toDataURL('image/png');
        fabric.Image.fromURL(dataUrl, (fabricImg) => {
          fabricImg.set({
            selectable: true,
            evented: true,
            erasable: true,
            ...options
          });
          
          // Clean up
          URL.revokeObjectURL(url);
          resolve(fabricImg);
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Render React component to HTML and then to fabric.js Image
 * 
 * @param {React.Element} reactElement - React component to render
 * @param {Object} options - Fabric.js object options
 * @returns {Promise<fabric.Image>} Promise that resolves to fabric.Image object
 */
export async function reactToFabricImage(reactElement, options = {}) {
  const { createRoot } = await import('react-dom/client');
  
  return new Promise((resolve, reject) => {
    try {
      // Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      // Render React component
      const root = createRoot(container);
      root.render(reactElement);
      
      // Wait for rendering to complete
      setTimeout(async () => {
        try {
          // Convert to fabric image
          const fabricImg = await htmlToFabricImage(container.firstChild, options);
          
          // Clean up
          root.unmount();
          document.body.removeChild(container);
          
          resolve(fabricImg);
        } catch (error) {
          // Clean up on error
          root.unmount();
          document.body.removeChild(container);
          reject(error);
        }
      }, 100);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Simpler approach: Convert HTML string to data URL and create fabric Image
 * This is more reliable but requires the HTML to be already styled
 * 
 * @param {string} htmlString - HTML string with inline styles
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {Object} options - Fabric.js object options
 * @returns {Promise<fabric.Image>} Promise that resolves to fabric.Image object
 */
export async function htmlStringToFabricImage(htmlString, width, height, options = {}) {
  return new Promise((resolve) => {
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${htmlString}
          </div>
        </foreignObject>
      </svg>
    `;
    
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    fabric.Image.fromURL(url, (img) => {
      img.set({
        selectable: true,
        evented: true,
        erasable: true,
        ...options
      });
      
      URL.revokeObjectURL(url);
      resolve(img);
    }, { crossOrigin: 'anonymous' });
  });
}
