export const loadingFragment = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

#define PI 3.14159265359

// Pseudo-random
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Hexagon SDF
float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1, 1.73)));
    c = max(c, p.x);
    return c;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
    vec3 color = vec3(0.0);
    
    // 1. Background Gradient (Deep Blue to Purple)
    color = mix(vec3(0.0, 0.05, 0.2), vec3(0.1, 0.0, 0.2), length(uv));
    
    // 2. Rotating Sunburst
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float rays = sin(angle * 12.0 + uTime * 0.5) * 0.5 + 0.5;
    rays += sin(angle * 20.0 - uTime * 1.0) * 0.3;
    color += vec3(0.0, 0.5, 1.0) * rays * 0.1 * smoothstep(0.0, 1.0, radius);
    
    // 3. Hexagon Grid / Particles
    vec2 hexUV = uv * 5.0;
    hexUV.y += uTime * 0.5; // Move up
    hexUV.x += sin(hexUV.y * 0.5 + uTime) * 0.5; // Wavy movement
    
    vec2 gv = fract(hexUV) - 0.5;
    vec2 id = floor(hexUV);
    
    float dist = hexDist(gv);
    float size = random(id) * 0.4; // Random size
    float blink = sin(uTime * 3.0 + random(id) * 10.0) * 0.5 + 0.5; // Blinking
    
    float hex = smoothstep(size, size - 0.05, dist);
    
    // Random Colors for particles (Cyan, Magenta, Yellow)
    vec3 pColor = vec3(0.0);
    float rnd = random(id + 1.0);
    if (rnd < 0.33) pColor = vec3(0.0, 1.0, 1.0); // Cyan
    else if (rnd < 0.66) pColor = vec3(1.0, 0.0, 1.0); // Magenta
    else pColor = vec3(1.0, 1.0, 0.0); // Yellow
    
    color += pColor * hex * blink * 0.6;
    
    // 4. Vignette & Scanlines
    color *= 1.0 - dot(uv, uv) * 0.6;
    color *= 0.9 + 0.1 * sin(gl_FragCoord.y * 0.5 + uTime * 10.0);

    gl_FragColor = vec4(color, 1.0);
}
`;
