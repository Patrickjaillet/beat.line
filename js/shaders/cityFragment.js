export const cityFragment = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    // Scroll horizontally
    uv.x += uTime * 0.02;

    // Layer 1: Far Buildings
    vec2 grid1 = floor(uv * vec2(10.0, 1.0));
    float h1 = random(vec2(grid1.x, 0.0)) * 0.3 + 0.1;
    float b1 = step(uv.y, h1);

    // Layer 2: Near Buildings
    vec2 uv2 = uv + vec2(0.5, 0.0); // Offset
    vec2 grid2 = floor(uv2 * vec2(15.0, 1.0));
    float h2 = random(vec2(grid2.x, 1.0)) * 0.4 + 0.1;
    float b2 = step(uv.y, h2);

    // Windows (Procedural)
    vec2 winGrid = fract(uv2 * vec2(15.0, 40.0));
    float win = step(0.4, winGrid.x) * step(0.4, winGrid.y) * step(winGrid.x, 0.8) * step(winGrid.y, 0.8);
    float lit = step(0.8, random(floor(uv2 * vec2(15.0, 40.0)) + floor(uTime * 2.0))); // Blinking
    
    vec3 color = vec3(0.0);
    color += uColor * 0.1 * b1; // Far buildings dim
    color += vec3(0.05) * b2; // Near buildings dark body
    color += uColor * 2.0 * b2 * win * lit; // Windows
    
    gl_FragColor = vec4(color, 1.0);
}
`;