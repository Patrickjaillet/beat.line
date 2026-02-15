export const monolithFragment = `
uniform float uTime;
uniform float uBass;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vPos;

void main() {
    // Procedural Grid Pattern
    vec2 grid = fract(vUv * 20.0);
    float line = step(0.9, grid.x) + step(0.9, grid.y);
    
    // Vertical Data Flow
    float flow = step(0.5, fract(vUv.y * 5.0 - uTime * 2.0));
    
    // Bass Reaction (Pulse)
    float pulse = smoothstep(0.0, 1.0, sin(vUv.y * 10.0 + uTime * 5.0) * uBass);
    
    vec3 color = uColor * (line * 0.5 + flow * 0.2 + pulse);
    
    // Fade out at bottom
    float alpha = smoothstep(0.0, 0.2, vUv.y);
    
    gl_FragColor = vec4(color, alpha);
}
`;