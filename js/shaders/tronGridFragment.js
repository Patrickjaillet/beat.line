export const tronGridFragment = `
varying vec2 vUv;
uniform float uTime;
uniform float uBeat;
uniform vec3 uColor;

// Fonction pour dessiner une grille
float grid(vec2 uv, float res, float width) {
    vec2 grid_uv = fract(uv * res);
    vec2 grid_dist = min(grid_uv, 1.0 - grid_uv);
    float grid_line = min(grid_dist.x, grid_dist.y);
    return 1.0 - smoothstep(width - 0.01, width + 0.01, grid_line);
}

void main() {
    vec2 uv = vUv;
    
    // Fait défiler la grille vers le joueur
    uv.y += uTime * 0.2;

    // Combine une grille principale et une grille secondaire
    float grid_major = grid(uv, 5.0, 0.01);
    float grid_minor = grid(uv, 20.0, 0.005);
    float grid_value = grid_major * 1.5 + grid_minor * 0.7;
    
    // Ajoute une onde de pulsation qui se déplace sur la grille
    float pulse_wave = smoothstep(0.9, 1.0, fract(uv.y * 5.0 - uTime * 2.0));
    pulse_wave *= (1.0 - fract(uv.y * 5.0));
    
    vec3 color = uColor * (grid_value + pulse_wave * uBeat * 1.2);
    
    // Ajoute un effet de scanlines horizontales
    color *= 0.8 + 0.2 * sin(vUv.y * 1000.0);
    
    // --- CORRECTION DU FADE ---
    // Avant : smoothstep(0.6, 0.9, vUv.y) -> Visible seulement au fond (0.9)
    // Maintenant : 1.0 - smoothstep(...) -> Visible devant, s'efface au fond
    float horizon_fade = 1.0 - smoothstep(0.7, 1.0, vUv.y); 
    // -------------------------
    
    gl_FragColor = vec4(color * horizon_fade, horizon_fade);
}
`;