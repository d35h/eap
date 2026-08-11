// A refractive sphere drawn with a single fullscreen fragment shader.
//
// CSS gradients cannot produce this: the sphere needs a real surface normal to
// derive a fresnel rim and to bend the background behind it. That is what makes
// the eye read "glass ball" instead of "blurry circle". Everything here is one
// draw call of two triangles - no geometry, no library.

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

// -- value noise + fbm, used for the drifting light behind the sphere ---------
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.58;
  // Three octaves only, and a gentle lacunarity: the reference is all
  // large soft masses. More octaves just add grain the blur would eat.
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 1.86; a *= 0.46; }
  return v;
}

// The platform's gold against a deep green, the palette the site already uses.
vec3 palette(float t) {
  vec3 ink   = vec3(0.035, 0.040, 0.048);
  vec3 green = vec3(0.114, 0.196, 0.157);
  vec3 gold  = vec3(0.718, 0.565, 0.310);
  vec3 pale  = vec3(0.906, 0.855, 0.702);
  vec3 c = mix(ink, green, smoothstep(0.05, 0.45, t));
  c = mix(c, gold, smoothstep(0.42, 0.78, t));
  c = mix(c, pale, smoothstep(0.80, 1.0, t));
  return c;
}

// Slow-moving field the sphere sits in and refracts.
// Measured against the reference: its frame-to-frame luma difference averages
// ~30/255 over half a second. Drifting the field slowly enough to be tasteful
// still has to be fast enough to be *seen* - the first pass was ~10x too slow.
vec3 field(vec2 p) {
  float t = u_time * 0.62;
  // Two layers pulling against each other so the masses fold rather than slide.
  float n = fbm(p * 0.85 + vec2(t, -t * 0.62));
  n += 0.34 * fbm(p * 1.7 - vec2(t * 0.83, t * 1.15));
  // Bias upward: outside the glass the field is the bright part of the frame.
  return palette(clamp(n * 0.95, 0.0, 1.0));
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

  vec3 col = field(uv);

  // Sphere sits right of centre with its left limb crossing the frame.
  vec2 c = vec2(0.46 + 0.022 * sin(u_time * 0.17), -0.02 + 0.018 * cos(u_time * 0.13));
  float r = 0.92;
  vec2 d = uv - c;
  float dist = length(d);

  if (dist < r) {
    // Surface normal of a sphere seen head-on.
    vec2 s = d / r;
    vec3 n = vec3(s, sqrt(max(0.0, 1.0 - dot(s, s))));

    // Refraction: bend the sampled field toward the centre by the surface slope.
    vec2 bent = uv + n.xy * 0.34 * (1.0 - n.z);
    // Slow rotation of what the glass transmits - this is most of the visible
    // life in the sphere, since translation alone reads as a moving backdrop.
    vec3 inside = field(rot(u_time * 0.11) * (bent - c) * 1.18 + c);

    // Glass darkens what it transmits, and the core more than the edge.
    inside *= 0.09 + 0.34 * (1.0 - n.z);

    // Fresnel: grazing angles reflect, which is the bright limb.
    float fres = pow(1.0 - n.z, 2.1);

    // Thin-film style shift so the rim is not a flat gold line.
    vec3 rim = palette(0.55 + 0.42 * sin(atan(s.y, s.x) * 1.6 + u_time * 0.32));
    inside += rim * fres * 1.85;

    // A soft specular highlight up-left, matching the site's light direction.
    float spec = pow(max(0.0, dot(normalize(n), normalize(vec3(-0.5, 0.5, 0.7)))), 14.0);
    inside += vec3(0.95, 0.90, 0.78) * spec * 0.28;

    // Antialias the silhouette.
    float edge = smoothstep(r, r - 0.02, dist);
    col = mix(col, inside, edge);
  }

  // Vignette, then grain to stop the wide gradients banding.
  col *= 1.0 - 0.30 * smoothstep(0.45, 1.35, length(uv));
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.010;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader: ${log}`);
  }
  return sh;
}

/**
 * Draws the orb into `canvas`. Returns a teardown function, or null when WebGL
 * is unavailable - callers fall back to the CSS gradient in that case.
 */
export function startOrb(canvas, { still = false } = {}) {
  const gl =
    canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) ||
    canvas.getContext('experimental-webgl');
  if (!gl) return null;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch {
    return null;
  }

  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uTime = gl.getUniformLocation(program, 'u_time');

  // Full device pixel ratio is wasted on a blurred gradient and costs fill rate.
  const DPR_CAP = 1.5;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };

  let raf = 0;
  let running = true;
  const start = performance.now();

  const draw = (t) => {
    resize();
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  if (still) {
    draw(0);
  } else {
    const loop = () => {
      if (!running) return;
      draw((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // Off-screen frames are wasted work on a screen nobody is looking at.
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (running && !still) {
      raf = requestAnimationFrame(function again() {
        if (!running) return;
        draw((performance.now() - start) / 1000);
        raf = requestAnimationFrame(again);
      });
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', resize);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
