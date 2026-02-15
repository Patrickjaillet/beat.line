export const bossVertex = `
varying vec2 vUv;
varying vec3 vPos;
uniform float uTime;
void main() {
    vUv = uv;
    vec3 pos = position;
    pos += normal * sin(pos.x * 10.0 + uTime) * 0.5;
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;