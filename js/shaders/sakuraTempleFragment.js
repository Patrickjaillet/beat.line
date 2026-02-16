export const sakuraTempleFragment = `
varying vec2 vUv;
uniform float uTime;
uniform float uKick;
uniform vec3 uColor;
uniform vec2 uResolution;

float hash1(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdPagoda(vec2 p) {
    float roof1 = sdBox(p - vec2(0.0, 0.4), vec2(0.3, 0.02));
    float roof2 = sdBox(p - vec2(0.0, 0.2), vec2(0.25, 0.02));
    float roof3 = sdBox(p - vec2(0.0, 0.0), vec2(0.2, 0.02));
    float body = sdBox(p - vec2(0.0, 0.2), vec2(0.1, 0.2));
    return min(min(roof1, roof2), min(roof3, body));
}

float sdTorii(vec2 p) {
    float base1 = sdBox(p - vec2(-0.3, 0.0), vec2(0.03, 0.3));
    float base2 = sdBox(p - vec2(0.3, 0.0), vec2(0.03, 0.3));
    float top1 = sdBox(p - vec2(0.0, 0.3), vec2(0.4, 0.03));
    float top2 = sdBox(p - vec2(0.0, 0.2), vec2(0.35, 0.02));
    return min(min(base1, base2), min(top1, top2));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    
    // Background sky gradient
    vec3 col = vec3(0.05, 0.0, 0.1) + vec3(0.2, 0.1, 0.3) * (1.0 - uv.y);

    // Moon
    float moonGlow = 0.01 / (length(uv - vec2(0.5, 0.5)));
    col += vec3(1.0, 0.9, 0.8) * moonGlow * (0.8 + uKick * 0.2);

    // Mountains / Ground
    float ground = smoothstep(0.0, -0.1, uv.y + 0.2);
    col = mix(col, vec3(0.01), ground);

    // Pagoda silhouette
    float pagoda = smoothstep(0.0, 0.01, sdPagoda(uv - vec2(-0.4, -0.1)));
    col = mix(col, vec3(0.0), pagoda);

    // Torii gate silhouette
    float torii = smoothstep(0.0, 0.01, sdTorii(uv - vec2(0.3, -0.05)));
    col = mix(col, vec3(0.0), torii);

    // Lanterns
    vec2 lanternPos1 = vec2(0.1, -0.1);
    float lantern1 = 0.001 / length(uv - lanternPos1);
    col += uColor * lantern1 * (0.5 + uKick);

    vec2 lanternPos2 = vec2(0.5, -0.15);
    float lantern2 = 0.001 / length(uv - lanternPos2);
    col += uColor * lantern2 * (0.5 + uKick);

    // Falling Sakura Petals
    float t = uTime;
    for(float i = 0.0; i < 20.0; i++) {
        float id = i / 20.0;
        float h = hash1(vec2(id));
        
        vec2 p_uv = uv;
        p_uv.x += sin(t * 0.2 + h * 10.0) * 0.2; // Sway
        p_uv.y += fract(t * 0.1 + h); // Fall
        
        float p_size = mix(0.005, 0.01, hash1(vec2(id, id)));
        float p_dist = length(fract(p_uv * 20.0) - 0.5);
        
        float petal = smoothstep(p_size, 0.0, p_dist);
        
        vec3 petalColor = mix(vec3(1.0, 0.7, 0.8), uColor, hash1(vec2(id, 2.0)));
        float petalFade = smoothstep(-0.2, 0.1, p_uv.y); // Fade out petals at the bottom
        col += petalColor * petal * (0.5 + uKick) * petalFade;
    }

    // Vignette
    col *= smoothstep(1.2, 0.5, length(uv));

    gl_FragColor = vec4(col, 1.0);
}
`;