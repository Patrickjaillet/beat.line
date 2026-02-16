export const shibuyaNightFragment = `
varying vec2 vUv;
uniform float uTime;
uniform float uKick;
uniform vec3 uColor;
uniform vec2 uResolution;

float hash1(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float line(vec2 uv, float y, float width, float blur) {
    return smoothstep(width - blur, width, abs(uv.y - y));
}

vec3 neon(float glow) {
    return uColor * glow + pow(glow, 20.0) * vec3(1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    vec2 originalUv = uv;
    
    vec3 col = vec3(0.0);
    
    // Background Gradient
    col += vec3(0.0, 0.01, 0.05) * (1.0 - length(uv));

    // Rain
    float t = uTime * 2.0;
    vec2 rainUv = uv * vec2(1.0, 1.0) + vec2(0.0, t * 0.1);
    float rain = 0.0;
    for(float i = 0.0; i < 5.0; i++) {
        float h = hash1(floor(rainUv * 10.0) + i);
        float r = fract(rainUv.y * 10.0 + h * 10.0);
        float d = fract(rainUv.x * 10.0 + h * 10.0);
        rain += smoothstep(0.0, 0.1, r) * smoothstep(0.9, 1.0, r) * smoothstep(0.0, 0.01, abs(d-0.5));
    }
    col += vec3(0.5, 0.7, 1.0) * rain * 0.3;

    // Neon Lines (buildings)
    uv.y += 0.5;
    for(float i = 0.0; i < 10.0; i++) {
        float h = hash1(vec2(i));
        float y = mix(-0.5, 1.5, h);
        float speed = mix(0.1, 0.3, hash1(vec2(i, i)));
        y = fract(y + uTime * speed);
        
        float width = mix(0.001, 0.005, h);
        float intensity = mix(0.1, 1.0, h);
        
        float l = line(uv, y, width, 0.01);
        col += neon(l * intensity * (0.5 + uKick * 0.5));
    }

    // Ground Reflection
    uv = originalUv;
    if(uv.y < 0.0) {
        uv.y = -uv.y;
        uv.y -= 0.5;
        
        // Distort reflection
        uv.x += sin(uv.y * 20.0 + uTime) * 0.02;

        for(float i = 0.0; i < 10.0; i++) {
            float h = hash1(vec2(i));
            float y = mix(-0.5, 1.5, h);
            float speed = mix(0.1, 0.3, hash1(vec2(i, i)));
            y = fract(y + uTime * speed);
            
            float width = mix(0.001, 0.005, h);
            float intensity = mix(0.1, 1.0, h);
            
            float l = line(uv, y, width, 0.01);
            col += neon(l * intensity * (0.5 + uKick * 0.5)) * 0.5; // Reflection is dimmer
        }
    }

    // Vignette & vertical fade to keep gameplay area clear
    float vignette = smoothstep(1.0, 0.3, length(originalUv));
    float verticalFade = smoothstep(-0.1, 0.2, originalUv.y);
    col *= vignette * verticalFade;

    gl_FragColor = vec4(col, 1.0);
}
`;