export const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform float uAudio;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
    vec3 color = vec3(0.0);
    
    float explosionTime = 18.0;
    float tExp = max(0.0, uTime - explosionTime);
    
    // --- CINEMATIC CAMERA ---
    // Orbit camera: Rotate world around the bike
    float camRot = sin(uTime * 0.5) * 0.8; // Yaw (Left/Right sway)
    float camPitch = cos(uTime * 0.3) * 0.05; // Pitch (Up/Down tilt)
    
    float horizon = -0.05 + camPitch;
    float fov = 0.7;
    vec2 sunPos = vec2(-camRot * 1.5, horizon + 0.3);
    
    float pivotZ = 6.0;
    float bikeZ = 6.0;
    float bikeX = sin(uTime * 1.5) * 1.5; 
    
    // --- SKY ---
    if (uv.y > horizon) {
        // Background Gradient (Deep Purple to Black)
        color = mix(vec3(0.05, 0.0, 0.1), vec3(0.0, 0.0, 0.05), (uv.y - horizon) * 2.0);
        
        // Stars
        vec2 starUV = uv;
        starUV.x += camRot * 0.5; // Parallax effect for stars
        float stars = step(0.995, random(starUV + uTime * 0.005));
        color += vec3(stars) * (0.5 + 0.5 * sin(uTime * 3.0));

        // Retro Sun
        // Sun moves opposite to camera rotation to simulate distance
        float sunDist = length(uv - sunPos);
        float sunSize = 0.25 + uAudio * 0.05; // Pulse with bass
        
        if (sunDist < sunSize) {
            // Sun Gradient (Yellow to Magenta)
            vec3 sunColor = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.5), (uv.y - sunPos.y + sunSize) / (2.0 * sunSize));
            
            // Horizontal Bands (Blinds effect)
            float bands = sin(uv.y * 100.0 - uTime * 2.0);
            float bandMask = step(0.0, bands);
            
            color += sunColor * bandMask;
            color += vec3(1.0, 0.0, 0.8) * 0.2; // Inner Glow
        }
        
        // Sun Glow Halo
        color += vec3(1.0, 0.2, 0.6) * (0.02 / (abs(sunDist - sunSize) + 0.01));
    } 
    // --- FLOOR (GRID + BIKE) ---
    else {
        // 3D Projection
        float z = fov / (horizon - uv.y);
        float x = uv.x * z;
        
        // Rotate (x, z) around (0, pivotZ)
        float s = sin(camRot);
        float c = cos(camRot);
        
        float rx = x;
        float rz = z - pivotZ;
        
        float rotX = rx * c - rz * s;
        float rotZ = rx * s + rz * c;
        
        x = rotX;
        z = rotZ + pivotZ;

        // Speed
        float speed = 10.0;
        float groundT = uTime * speed;
        
        // --- BIKE LOGIC ---
        // Trail Logic (History)
        // Calculate position based on time delay relative to distance behind bike
        float distBehind = bikeZ - z; 
        float historyTime = uTime - (distBehind / speed);
        float trailX = sin(historyTime * 1.5) * 1.5;
        
        // --- GRID ---
        vec2 gridUV = vec2(x, z + groundT);
        vec2 grid = abs(fract(gridUV) - 0.5);
        float line = smoothstep(0.45, 0.48, max(grid.x, grid.y));
        
        // Grid Color
        vec3 gridColor = vec3(0.0, 0.8, 1.0) * line * z * 0.5;
        
        // Motion Blur / Speed Streaks
        float streaks = step(0.95, fract(x * 2.0 + sin(z * 0.1) + uTime * 20.0));
        gridColor += vec3(0.5, 0.9, 1.0) * streaks * 0.2 * z;
        
        // --- DRAW TRAIL ---
        // Draw trail where z < bikeZ (between camera and bike)
        if (z < bikeZ && z > 0.5) {
            float trailWidth = 0.15;
            float dist = abs(x - trailX);
            float mask = smoothstep(trailWidth, trailWidth - 0.01, dist);
            
            // Glass Effect
            // 1. Bright Rim (Edges)
            float rim = smoothstep(trailWidth - 0.04, trailWidth, dist) * mask;
            
            // 2. Glass Body (Semi-transparent Cyan with vertical banding)
            float banding = step(0.9, sin(z * 40.0 + uTime * 10.0)); // Refraction lines
            vec3 glassColor = vec3(0.0, 0.9, 1.0) * (0.3 + banding * 0.4);
            
            vec3 trailColor = glassColor * mask;
            trailColor += vec3(1.0) * rim * 2.0; // Add white rim
            
            // Mix with grid (Additive)
            gridColor = mix(gridColor, trailColor, mask * smoothstep(0.0, 2.0, z));
        }
        
        // --- DRAW BIKE ---
        // Bike is at specific Z depth. We approximate drawing it by checking Z proximity.
        if (tExp > 0.0) {
            // EXPLOSION LOGIC
            vec2 bikePos = vec2(bikeX, bikeZ);
            float dist = distance(vec2(x, z), bikePos);
            
            // Expanding Shockwave
            float waveRadius = tExp * 30.0;
            float wave = smoothstep(2.0, 0.0, abs(dist - waveRadius));
            
            // Core Fireball
            float core = exp(-dist * 0.5) * exp(-tExp * 5.0);
            
            gridColor += vec3(1.0, 0.4, 0.1) * core * 20.0; // Bright Orange Core
            gridColor += vec3(1.0, 0.9, 0.8) * wave * 5.0 * exp(-tExp * 2.0); // Shockwave Ring
        } else {
            float bikeDepth = 0.5; // Length of bike
            if (abs(z - bikeZ) < bikeDepth) {
                float bikeWidth = 0.2;
                float bikeMask = smoothstep(bikeWidth, 0.0, abs(x - bikeX));
                gridColor += vec3(1.0, 0.6, 0.0) * bikeMask * 5.0; // Bright Orange Bike Engine
            }
        }
        
        // Fog (Fade to horizon color)
        float fog = smoothstep(0.0, 20.0, z);
        color = mix(gridColor, vec3(0.05, 0.0, 0.1), fog);
    }
    
    // --- SPARKS ---
    if (tExp == 0.0) {
    for (float i = 0.0; i < 15.0; i++) {
        float t = fract(uTime * 2.0 + i * 0.123);
        float life = 1.0 - t;
        
        float r1 = random(vec2(i, 0.1));
        float r2 = random(vec2(i, 0.2));
        
        // Origin from past bike position to simulate trail emission
        float pastBikeX = sin((uTime - t * 0.1) * 1.5) * 1.5;
        
        vec3 vel = vec3((r1 - 0.5) * 3.0, 2.0 + r2 * 3.0, -2.0 - r2 * 5.0);
        vec3 p = vec3(pastBikeX, 0.1, bikeZ) + vel * t;
        p.y -= 6.0 * t * t; // Gravity
        
        if (p.y > 0.0) {
            // Rotate spark to match camera orbit
            float s = sin(camRot); float c = cos(camRot);
            float rx = p.x * c - (p.z - pivotZ) * s;
            float rz = p.x * s + (p.z - pivotZ) * c + pivotZ;
            
            if (rz > 1.0) {
                vec2 spUv = vec2(rx / rz, horizon - (1.0 - p.y) * fov / rz);
                color += vec3(1.0, 0.8, 0.3) * (0.002 / length(uv - spUv)) * life * 0.8;
            }
        }
    }
    }
    
    // --- ANAMORPHIC LENS FLARE ---
    float flareY = abs(uv.y - sunPos.y);
    float flareX = abs(uv.x - sunPos.x);
    float flare = 0.0005 / (flareY + 0.0005); // Thin horizontal beam
    flare *= smoothstep(1.2, 0.0, flareX); // Horizontal fade
    color += vec3(0.0, 0.8, 1.0) * flare * 0.3; // Cyan flare
    
    // Vignette & Scanlines
    color *= 1.0 - dot(uv, uv) * 0.4;
    color *= 0.9 + 0.1 * sin(gl_FragCoord.y * 0.5 + uTime * 10.0);
    
    // Screen Flash on Explosion
    color += vec3(1.0, 0.8, 0.5) * exp(-tExp * 5.0) * step(0.001, tExp);

    gl_FragColor = vec4(color, 1.0);
}
`;