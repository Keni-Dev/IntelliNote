// Lightweight production-ready SVG math renderer
// Supports a focused subset of LaTeX constructs used across algebra, calculus,
// trigonometry, physics and basic statistics: fractions, superscripts/subscripts,
// sqrt, common functions and Greek letters. Rendered output is an SVG element
// or string; helper converts SVG to a data URL for fabric.js integration.

const SVG_NS = 'http://www.w3.org/2000/svg';

const GREEK = {
  'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
  'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'iota': 'ι', 'kappa': 'κ', 'lambda': 'λ',
  'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'pi': 'π', 'rho': 'ρ', 'sigma': 'σ', 'tau': 'τ',
  'phi': 'φ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω', 'Gamma': 'Γ', 'Delta': 'Δ', 'Pi': 'Π',
  'Sigma': 'Σ', 'Theta': 'Θ', 'Lambda': 'Λ', 'Omega': 'Ω'
};

// Options and defaults
const DEFAULTS = {
  fontFamily: 'Gochi Hand, Kalam, "Architects Daughter", cursive, sans-serif',
  fontSize: 48,
  color: '#111827',
  strokeWidth: 3, // used for fraction bars and rule thickness
  padding: 8
};

// Basic recursive parser for a small subset of LaTeX-like syntax
function parseLatex(input) {
  let i = 0;

  function skipSpaces() {
    while (i < input.length && /\s/.test(input[i])) i++;
  }

  function parseUntil(delims) {
    skipSpaces();
    if (input[i] === '{') return parseGroup();
    let start = i;
    while (i < input.length && !delims.includes(input[i])) i++;
    return { type: 'text', value: input.slice(start, i) };
  }

  function parseGroup() {
    // assumes current char is '{'
    i++; // consume '{'
    const nodes = [];
    while (i < input.length && input[i] !== '}') {
      nodes.push(parseToken());
    }
    i++; // consume '}'
    return { type: 'group', children: nodes };
  }

  function parseCommand() {
    // current char is '\\'
    i++; // consume '\\'
    const nameStart = i;
    while (i < input.length && /[a-zA-Z]/.test(input[i])) i++;
    const cmd = input.slice(nameStart, i);
    if (cmd === 'frac') {
      // expect {num}{den}
      const num = parseGroup();
      const den = parseGroup();
      return { type: 'frac', num, den };
    }
    if (cmd === 'sqrt') {
      const rad = input[i] === '{' ? parseGroup() : parseUntil([' ', '+', '-', '/', ')']);
      return { type: 'sqrt', rad };
    }
    // greek letters or functions (sin,cos,..)
    if (GREEK[cmd]) return { type: 'text', value: GREEK[cmd] };
    return { type: 'text', value: cmd.replace(/\\/, '') };
  }

  function parseToken() {
    skipSpaces();
    if (i >= input.length) return null;
    const ch = input[i];
    if (ch === '{') return parseGroup();
    if (ch === '\\') return parseCommand();
    if (ch === '^' || ch === '_') {
      i++; // consume
      let target = input[i] === '{' ? parseGroup() : { type: 'text', value: input[i++] };
      return { type: ch === '^' ? 'sup' : 'sub', child: target };
    }
    // plain text until special char
    let start = i;
    while (i < input.length && !/[\\^_{}]/.test(input[i])) i++;
    return { type: 'text', value: input.slice(start, i) };
  }

  const nodes = [];
  while (i < input.length) {
    const t = parseToken();
    if (t) nodes.push(t);
  }
  return { type: 'root', children: nodes };
}

// Render AST to SVG elements. Uses measurement by temporarily appending to DOM
function renderNodeToSVG(node, ctx) {
  const { svg, opts } = ctx;
  switch (node.type) {
    case 'root':
    case 'group': {
      const g = document.createElementNS(SVG_NS, 'g');
      (node.children || []).forEach(child => {
        const childEl = renderNodeToSVG(child, ctx);
        if (childEl) g.appendChild(childEl);
      });
      return g;
    }
    case 'text': {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('fill', opts.color);
      text.setAttribute('font-family', opts.fontFamily);
      text.setAttribute('font-size', opts.fontSize);
      text.setAttribute('dominant-baseline', 'alphabetic');
      text.textContent = node.value;
      return text;
    }
    case 'sup': {
      const g = document.createElementNS(SVG_NS, 'g');
      const t = renderNodeToSVG(node.child, ctx);
      // scale for superscript
      t.setAttribute('font-size', Math.round(opts.fontSize * 0.6));
      t.setAttribute('dy', -opts.fontSize * 0.45);
      g.appendChild(t);
      return g;
    }
    case 'sub': {
      const g = document.createElementNS(SVG_NS, 'g');
      const t = renderNodeToSVG(node.child, ctx);
      t.setAttribute('font-size', Math.round(opts.fontSize * 0.6));
      t.setAttribute('dy', opts.fontSize * 0.25);
      g.appendChild(t);
      return g;
    }
    case 'frac': {
      const g = document.createElementNS(SVG_NS, 'g');
      // numerator
      const num = renderNodeToSVG(node.num, ctx);
      num.setAttribute('font-size', Math.round(opts.fontSize * 0.8));
      // denominator
      const den = renderNodeToSVG(node.den, ctx);
      den.setAttribute('font-size', Math.round(opts.fontSize * 0.8));

      // Temporarily append to measure widths
      g.appendChild(num);
      g.appendChild(den);
      svg.appendChild(g);
      // measure bboxes
      const numBox = num.getBBox();
      const denBox = den.getBBox();
      const width = Math.max(numBox.width, denBox.width);

      // Clear group and rebuild properly
      g.innerHTML = '';

      // Position numerator centered
      num.setAttribute('x', 0);
      num.setAttribute('y', 0);
      num.setAttribute('text-anchor', 'middle');
      num.setAttribute('transform', `translate(${width / 2}, ${-opts.fontSize * 0.25})`);

      // Fraction bar
      const line = document.createElementNS(SVG_NS, 'rect');
      const barHeight = Math.max(1, Math.round(opts.strokeWidth));
      line.setAttribute('x', 0);
      line.setAttribute('y', -opts.fontSize * 0.05);
      line.setAttribute('width', width);
      line.setAttribute('height', barHeight);
      line.setAttribute('fill', opts.color);

      // Denominator positioned below bar
      den.setAttribute('x', 0);
      den.setAttribute('y', 0);
      den.setAttribute('text-anchor', 'middle');
      den.setAttribute('transform', `translate(${width / 2}, ${opts.fontSize * 0.9})`);

      g.appendChild(num);
      g.appendChild(line);
      g.appendChild(den);

      return g;
    }
    case 'sqrt': {
      const g = document.createElementNS(SVG_NS, 'g');
      const rad = renderNodeToSVG(node.rad, ctx);
      rad.setAttribute('font-size', Math.round(opts.fontSize * 0.9));
      // Simple square root symbol using path
      const path = document.createElementNS(SVG_NS, 'path');
      const h = opts.fontSize;
      const pathD = `M0 ${h * 0.6} l${h * 0.15} ${-h * 0.4} l${h * 0.12} ${h * 0.4} l${h * 0.6} 0`;
      path.setAttribute('d', pathD);
      path.setAttribute('stroke', opts.color);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', Math.max(1, opts.strokeWidth));

      g.appendChild(path);
      g.appendChild(rad);
      return g;
    }
    default:
      return null;
  }
}

function createSVGRoot(width, height) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.display = 'block';
  return svg;
}

function measureRendered(node, opts) {
  // Create a temporary SVG to measure bbox sizes
  const tmpSvg = createSVGRoot(1000, 200, opts);
  tmpSvg.setAttribute('style', 'position:absolute;left:-9999px;top:-9999px;');
  document.body.appendChild(tmpSvg);
  const ctx = { svg: tmpSvg, opts };
  const el = renderNodeToSVG(node, ctx);
  tmpSvg.appendChild(el);
  const box = el.getBBox();
  document.body.removeChild(tmpSvg);
  return box;
}

function renderMathToSVG(latex, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const ast = parseLatex(latex);

  // Estimate size by measuring the AST rendered in a temporary SVG
  const estimated = measureRendered(ast, opts);
  const w = Math.ceil(estimated.width + opts.padding * 2);
  const h = Math.ceil(estimated.height + opts.padding * 2 + opts.fontSize);

  const svg = createSVGRoot(w, h, opts);
  const mainGroup = document.createElementNS(SVG_NS, 'g');
  mainGroup.setAttribute('transform', `translate(${opts.padding}, ${opts.padding + opts.fontSize})`);

  const ctx = { svg, group: mainGroup, opts };
  const content = renderNodeToSVG(ast, ctx);
  mainGroup.appendChild(content);
  svg.appendChild(mainGroup);
  return svg;
}

function svgToDataURL(svg) {
  const serializer = new XMLSerializer();
  const str = serializer.serializeToString(svg);
  const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  return encoded;
}

export default {
  renderMathToSVG,
  svgToDataURL,
  DEFAULTS
};
