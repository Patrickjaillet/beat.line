export const c64TronFragment = `
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uGameTexture;
varying vec2 vUv;

// C64 Palette
vec3 colBlack = vec3(0.0);
vec3 colBlue = vec3(0.22, 0.19, 0.56);
vec3 colCyan = vec3(0.44, 0.77, 0.79);
vec3 colYellow = vec3(0.73, 0.76, 0.45);
vec3 colLightBlue = vec3(0.50, 0.45, 0.85);

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    uv.y = 1.0 - uv.y; // Fix inverted display
    
    // --- VHS TRACKING DISTORTION ---
    // Rolling horizontal bar of distortion
    float tracking = fract(uTime * 0.1); 
    float trackMask = smoothstep(tracking - 0.05, tracking, uv.y) * (1.0 - smoothstep(tracking, tracking + 0.05, uv.y));
    float tNoise = random(vec2(uv.y * 10.0, uTime));
    uv.x += (tNoise - 0.5) * 0.1 * trackMask; // Horizontal shear in the tracking bar
    
    // 1. CRT Distortion (Curvature)
    vec2 centered = uv - 0.5;
    float r2 = dot(centered, centered);
    uv = centered * (1.0 + 0.15 * r2) + 0.5;
    
    // Black border for out of bounds
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // 2. Pixelation (Low Res 320x200 style)
    vec2 lowRes = vec2(320.0, 200.0);
    vec2 pixelUV = floor(uv * lowRes) / lowRes;
    
    vec3 color = colBlack; 
    
    // --- SNAKE GAME LOGIC ---
    
    // Sample game state from texture
    // Texture is 32x20. Values: 0.0=Empty, 0.5=Snake, 1.0=Food
    float val = texture2D(uGameTexture, uv).r;
    
    // Background Grid
    vec2 gridUV = fract(uv * vec2(32.0, 20.0));
    if (gridUV.x < 0.05 || gridUV.y < 0.05) color = colBlue * 0.2;
    else color = colBlue * 0.05;
    
    if (val > 0.8) {
        color = colYellow; // Food
    } else if (val > 0.4) {
        color = colCyan; // Snake
    }
    
    // --- BURN-IN EFFECT ---
    // Simulate ghosting of static UI elements (Score, Status)
    float burn = 0.0;
    // Top Left Score Box
    if (uv.y > 0.05 && uv.y < 0.15 && uv.x > 0.1 && uv.x < 0.35) burn += 0.1;
    // Top Right High Score Box
    if (uv.y > 0.05 && uv.y < 0.15 && uv.x > 0.65 && uv.x < 0.9) burn += 0.1;
    // Bottom "CREDITS"
    if (uv.y > 0.85 && uv.y < 0.95 && uv.x > 0.6) burn += 0.1;
    // Center "INSERT COIN" ghost
    if (abs(uv.y - 0.5) < 0.05 && abs(uv.x - 0.5) < 0.2) burn += 0.05;
    
    // Apply faint phosphor ghost (greenish tint)
    color += vec3(0.1, 0.3, 0.1) * burn * 0.3;

    // 3. Scanlines & Vignette
    float scan = sin(uv.y * lowRes.y * 3.14159 * 2.0) * 0.1 + 0.9;
    color *= scan;
    
    float vignette = smoothstep(0.8, 0.2, length(centered));
    color *= vignette;
    
    // --- VHS CHROMATIC NOISE ---
    // Random RGB noise
    vec3 noiseVec = vec3(random(uv + uTime), random(uv + uTime + 1.0), random(uv + uTime + 2.0));
    
    color = mix(color, noiseVec, trackMask * 0.5); // Heavy noise in tracking bar
    color += (noiseVec - 0.5) * 0.08; // Global subtle chromatic grain
    
    // 4. Screen Flicker (Old Monitor effect)
    float flicker = 0.97 + 0.03 * sin(uTime * 110.0);
    if (random(vec2(uTime, 0.0)) > 0.95) flicker *= 0.9; // Occasional dip
    color *= flicker;

    gl_FragColor = vec4(color, 1.0);
}
`;