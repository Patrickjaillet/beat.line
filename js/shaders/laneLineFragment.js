export const laneLineFragment = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uColorblind;
varying vec2 vUv;

vec3 applyColorblind(vec3 c) {
    vec3 outColor;
    outColor.r = dot(c, vec3(0.567, 0.433, 0.0));
    outColor.g = dot(c, vec3(0.558, 0.442, 0.0));
    outColor.b = dot(c, vec3(0.0,   0.242, 0.758));
    return outColor;
}

void main() {
    // Define the width of the border (e.g., 5% on each side)
    float edgeWidth = 0.15;
    
    // Calculate a factor that is 1.0 at the very edge and fades to 0.0
    float leftEdge = 1.0 - smoothstep(0.0, edgeWidth, vUv.x);
    float rightEdge = smoothstep(1.0 - edgeWidth, 1.0, vUv.x);
    float edgeFactor = max(leftEdge, rightEdge);

    // Mix the lane color with black based on the edge factor
    vec3 finalColor = mix(uColor, vec3(0.0, 0.0, 0.0), edgeFactor);

    if (uColorblind > 0.5) {
        finalColor = applyColorblind(finalColor);
    }
    
    // Apply the overall opacity
    gl_FragColor = vec4(finalColor, uOpacity);
}
`;