export const matrixFragment = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    
    // Grid setup
    float cols = 60.0;
    float rows = 30.0;
    
    vec2 ipos = floor(vec2(uv.x * cols, uv.y * rows));
    
    // Random speed and offset per column
    float speed = 2.0 + random(vec2(ipos.x, 0.0)) * 3.0;
    float offset = random(vec2(ipos.x, 1.0)) * 10.0;
    
    // Calculate vertical position of the "head" (falling down)
    float t = uTime * speed + offset;
    
    // Distance from head (wrapping)
    // 1.0 - uv.y makes it go from top (1) to bottom (0) visually in standard UVs if we map height
    float dist = fract(1.0 - uv.y + t); 
    
    // Trail fade
    float brightness = 1.0 - dist;
    brightness = pow(brightness, 15.0); // Short bright trail
    
    // Character shape (random blinking glyphs)
    float charSeed = floor(uTime * 10.0 + ipos.y);
    float glyph = step(0.5, random(vec2(ipos.x, ipos.y + charSeed)));
    
    vec3 color = vec3(0.0, 1.0, 0.2) * brightness * glyph;
    if (dist < 0.05) color = vec3(0.8, 1.0, 0.8) * glyph; // White head
    
    gl_FragColor = vec4(color, brightness);
}
`;