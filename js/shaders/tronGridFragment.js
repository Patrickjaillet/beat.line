export const tronGridFragment = `
uniform float uTime;
uniform float uBeat;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
    // Infinite Grid Logic
    // Align grid with world units (1 unit = 1 lane width approx)
    vec2 uv = vWorldPos.xz;
    
    // Scroll grid to match note speed (30 units/s)
    // Moving towards camera (+Z) means texture moves -Z (decreasing Y in UV)
    uv.y -= uTime * 30.0; 
    
    // Anti-aliased grid lines
    vec2 grid = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
    float line = min(grid.x, grid.y);
    float gridIntensity = 1.0 - min(line, 1.0);
    
    // Dark PBR-like base with high emissive lines
    vec3 baseColor = vec3(0.005, 0.005, 0.01); 
    vec3 neonColor = uColor * 2.0; // Boost for bloom
    
    vec3 finalColor = mix(baseColor, neonColor, gridIntensity);
    finalColor += neonColor * gridIntensity * uBeat * 0.5; // Beat pulse
    
    // Highlight the main track area (Lanes are between x = -2 and x = 2)
    float trackMask = step(abs(vWorldPos.x), 2.0);
    finalColor += neonColor * 0.1 * trackMask * (1.0 - gridIntensity); 

    // Distance Fog
    float alpha = smoothstep(50.0, 10.0, length(vWorldPos.xz - vec2(0.0, 6.0)));
    gl_FragColor = vec4(finalColor, alpha);
}
`;