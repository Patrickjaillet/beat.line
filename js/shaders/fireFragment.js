export const fireFragment = `
uniform float uTime;
uniform float uIntensity; // 0.0 to 1.0
varying vec2 vUv;

// Simple pseudo-random noise
float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float smoothNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
        value += amplitude * smoothNoise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    // Fire Logic
    vec2 uv = vUv;
    float fire = fbm(vec2(uv.x * 10.0, uv.y * 5.0 - uTime * 4.0));
    
    // Mask for sides (Left < 0.15, Right > 0.85)
    float sideMask = smoothstep(0.2, 0.0, uv.x) + smoothstep(0.8, 1.0, uv.x);
    
    // Vertical fade (stronger at bottom)
    float verticalMask = smoothstep(1.0, 0.0, uv.y);
    
    // Combine
    float alpha = fire * sideMask * verticalMask * uIntensity;
    
    // Color Gradient (Orange/Red to Yellow)
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), fire);
    
    gl_FragColor = vec4(color, alpha);
}
`;