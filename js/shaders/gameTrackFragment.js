export const gameTrackFragment = `
uniform float uTime;
uniform float uBeat;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    
    // Scrolling Grid
    float speed = 5.0;
    float scroll = uTime * speed;
    
    // Lane Dividers (4 Lanes)
    // Map UV x (0..1) to 4 lanes. Dividers at 0.25, 0.5, 0.75
    float lineWidth = 0.01;
    float vLine = step(abs(uv.x - 0.0), lineWidth * 2.0) +
                  step(abs(uv.x - 0.25), lineWidth) +
                  step(abs(uv.x - 0.50), lineWidth) +
                  step(abs(uv.x - 0.75), lineWidth) +
                  step(abs(uv.x - 1.0), lineWidth * 2.0);
    
    // Horizontal Beat Lines
    float hLine = step(0.95, fract(uv.y * 20.0 + scroll));
    
    // Combine & Glow
    vec3 color = uColor * (vLine + hLine * 0.5);
    color *= (1.0 + uBeat * 0.5); // Pulse on beat
    
    // Distance Fog (Fade out at top of UV)
    float alpha = smoothstep(1.0, 0.2, uv.y);
    gl_FragColor = vec4(color, alpha);
}
`;