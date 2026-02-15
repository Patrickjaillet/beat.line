export const bossFragment = `
uniform float uTime;
uniform vec3 uColor;
uniform float uHit;
varying vec2 vUv;
varying vec3 vPos;
void main() {
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 baseColor = uColor * (0.5 + 0.5 * sin(uTime * 3.0));
    baseColor += vec3(noise * 0.2);
    
    float rim = 1.0 - dot(normalize(vPos), vec3(0.0, 0.0, 1.0));
    vec3 finalColor = baseColor + rim * 0.5;
    
    // Hit Flash (Mix with Red)
    finalColor = mix(finalColor, vec3(1.0, 0.0, 0.0), uHit * 0.8);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;