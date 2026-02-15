export const gameBgFragment = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    
    // Deep Space Gradient
    vec3 color = mix(vec3(0.0), uColor * 0.2, smoothstep(-0.5, 0.5, uv.y));
    
    // Stars
    float stars = step(0.998, fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453));
    color += vec3(stars) * (0.5 + 0.5 * sin(uTime * 2.0 + uv.x * 10.0));
    
    // Digital Horizon Line
    float horizon = 1.0 - smoothstep(0.0, 0.02, abs(uv.y));
    color += uColor * horizon;

    gl_FragColor = vec4(color, 1.0);
}
`;