export const warpFragment = `
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

void main() {
    vec2 uv = vUv - 0.5;
    float len = length(uv);
    
    // Radial waves moving inwards/outwards
    float wave = sin(len * 40.0 - uTime * 20.0);
    
    // Color shift (Chromatic Aberration style)
    vec3 color = vec3(0.0);
    color.r = smoothstep(0.0, 0.1, wave);
    color.b = smoothstep(0.0, 0.1, sin(len * 40.0 - uTime * 20.0 + 0.5));
    color.g = 0.0;
    
    // Vignette mask (only visible at edges)
    float mask = smoothstep(0.3, 0.7, len);
    
    gl_FragColor = vec4(color, mask * uIntensity * 0.3);
}
`;
