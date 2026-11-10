/**
 * SkSL runtime shaders (compiled by Skia on every platform, including
 * CanvasKit on the web). All three share the same uniform block so the
 * canvas can swap worlds without changing code paths:
 *
 *   uRes      canvas size in px
 *   uTime     seconds
 *   uBreath   smoothed exhale strength 0..1 (brightens / speeds things up)
 *   uBloom    1 right after a "big moment", decays to 0
 *   uProgress 0..1 through the session (sky: time of day)
 *   uCalm     0..1 calm meter (nebula: palette shifts from violet to teal)
 *   uScroll   world scroll in px (parallax)
 *   uDetail   1 = full effect, 0 = cheap version for old tablets
 */

const COMMON = `
uniform float2 uRes;
uniform float uTime;
uniform float uBreath;
uniform float uBloom;
uniform float uProgress;
uniform float uCalm;
uniform float uScroll;
uniform float uDetail;
uniform float uCamera;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + float2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}
float vignette(float2 uv) {
  float2 d = (uv - 0.5) * float2(1.0, 1.25);
  return 1.0 - 0.22 * dot(d, d) * 2.0;
}
`;

/** Underwater pond for the youngest: bright, caustic ripples that shimmer with every puff. */
export const POND_SHADER = `${COMMON}
half4 main(float2 p) {
  float2 uv = p / uRes;
  float t = uTime;
  float3 top = float3(0.40, 0.88, 0.96);
  float3 bottom = float3(0.03, 0.22, 0.52);
  float3 col = mix(top, bottom, smoothstep(0.0, 1.0, uv.y * 1.05));

  // Caustics: two warped sine fields multiplied.
  float2 q = float2(uv.x * 6.0 + uScroll * 0.0009, uv.y * 4.0);
  float c1 = sin(q.x * 2.0 + t * 1.1 + sin(q.y * 1.5 + t * 0.7));
  float c2 = sin(q.y * 2.3 - t * 0.9 + sin(q.x * 1.7 - t * 0.5));
  float ca = 0.5 + 0.5 * c1 * c2;
  ca = ca * ca * ca;
  float strength = (0.22 + 0.40 * uBreath) * (1.0 - uv.y * 0.6);
  col += float3(0.6, 0.9, 1.0) * ca * strength;

  if (uDetail > 0.5) {
    // Soft light rays from the surface.
    float ray = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float ang = uv.x * 3.0 + fi * 1.7 - uv.y * 1.1 + t * (0.12 + fi * 0.05);
      ray += (0.5 + 0.5 * sin(ang * 5.0)) * (0.5 + 0.5 * sin(ang * 2.1 + fi));
    }
    ray = ray / 3.0;
    ray = ray * ray * (1.0 - uv.y) * 0.45;
    col += float3(0.7, 0.95, 1.0) * ray;
    // Sandy floor glow with drifting noise.
    float floorN = fbm(float2(uv.x * 5.0 + uScroll * 0.0015, uv.y * 3.0));
    col += float3(0.25, 0.22, 0.12) * smoothstep(0.82, 1.0, uv.y) * (0.6 + 0.4 * floorN);
  }

  col += float3(1.0, 0.85, 0.55) * uBloom * 0.4 * (1.0 - length(uv - 0.5));
  col *= vignette(uv);
  return half4(half3(col), mix(1.0, 0.42, uCamera));
}`;

/** Sky for kids: a day that passes from dawn to starry night across the session. */
export const SKY_SHADER = `${COMMON}
half4 main(float2 p) {
  float2 uv = p / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float s1 = smoothstep(0.0, 0.35, uProgress);
  float s2 = smoothstep(0.35, 0.72, uProgress);
  float s3 = smoothstep(0.72, 1.0, uProgress);

  float3 dawnTop = float3(0.42, 0.52, 0.95);
  float3 dawnBot = float3(1.00, 0.76, 0.62);
  float3 dayTop  = float3(0.28, 0.60, 0.98);
  float3 dayBot  = float3(0.78, 0.92, 1.00);
  float3 goldTop = float3(0.36, 0.32, 0.72);
  float3 goldBot = float3(1.00, 0.62, 0.42);
  float3 nightTop = float3(0.03, 0.05, 0.22);
  float3 nightBot = float3(0.16, 0.20, 0.48);
  float3 top = mix(mix(mix(dawnTop, dayTop, s1), goldTop, s2), nightTop, s3);
  float3 bot = mix(mix(mix(dawnBot, dayBot, s1), goldBot, s2), nightBot, s3);
  float3 col = mix(top, bot, smoothstep(0.0, 1.0, uv.y));

  // Sun travels along an arc; moon appears at night.
  float2 sunPos = float2(0.12 + 0.76 * uProgress, 0.78 - 0.62 * sin(uProgress * 3.14159));
  float sd = length((uv - sunPos) * float2(aspect, 1.0));
  float sun = smoothstep(0.075, 0.06, sd);
  float glow = exp(-sd * 3.5) * 0.7;
  float3 sunCol = mix(float3(1.0, 0.96, 0.82), float3(1.0, 0.62, 0.38), s2);
  col = mix(col, sunCol, sun * (1.0 - s3));
  col += sunCol * glow * (1.0 - s3);
  float2 moonPos = float2(0.80, 0.20);
  float md = length((uv - moonPos) * float2(aspect, 1.0));
  float md2 = length((uv - moonPos - float2(0.022, -0.012)) * float2(aspect, 1.0));
  float moon = smoothstep(0.062, 0.058, md) * (1.0 - smoothstep(0.062, 0.058, md2));
  col += float3(0.95, 0.97, 1.0) * (moon + exp(-md * 8.0) * 0.25) * s3;

  // Clouds: two fbm layers with parallax; wind (breath) stretches them.
  float2 c1uv = float2(uv.x * aspect * 1.6 + uScroll * 0.00030 + t * 0.012, uv.y * 1.9 + 0.3);
  float n1 = fbm(c1uv + float2(uBreath * 0.25, 0.0));
  float cloud1 = smoothstep(0.50, 0.70, n1);
  float3 cloudCol = mix(float3(1.0, 1.0, 1.0), float3(0.55, 0.60, 0.85), s3) * (0.9 + 0.1 * n1);
  col = mix(col, cloudCol, cloud1 * 0.85 * (1.0 - uv.y * 0.5));
  if (uDetail > 0.5) {
    float2 c2uv = float2(uv.x * aspect * 2.8 + uScroll * 0.00075 + t * 0.03, uv.y * 3.2 + 7.0);
    float n2 = fbm(c2uv + float2(uBreath * 0.5, 0.0));
    float cloud2 = smoothstep(0.55, 0.75, n2);
    col = mix(col, cloudCol * 1.02, cloud2 * 0.6);
    // Wind streaks while blowing.
    float streak = vnoise(float2(uv.x * 4.0 + t * 3.0 + uScroll * 0.003, uv.y * 60.0));
    col += float3(1.0) * uBreath * 0.10 * smoothstep(0.62, 0.92, streak);
  }

  col += float3(1.0, 0.92, 0.70) * uBloom * 0.45 * (1.0 - length(uv - 0.5));
  col *= vignette(uv);
  return half4(half3(col), mix(1.0, 0.42, uCamera));
}`;

/** Nebula for teens: domain-warped fbm gas that turns from violet to teal as the calm meter fills. */
export const NEBULA_SHADER = `${COMMON}
half4 main(float2 p) {
  float2 uv = p / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float2 q = float2(uv.x * aspect, uv.y) * 1.5 + float2(uScroll * 0.00022 + t * 0.015, 0.0);

  float3 base = mix(float3(0.03, 0.01, 0.07), float3(0.01, 0.03, 0.09), uCalm);
  float3 c1 = mix(float3(0.50, 0.10, 0.55), float3(0.05, 0.42, 0.62), uCalm);
  float3 c2 = mix(float3(0.95, 0.32, 0.55), float3(0.30, 0.85, 0.95), uCalm);
  float3 c3 = float3(0.90, 0.85, 1.00);
  float3 col = base;

  if (uDetail > 0.5) {
    float2 w = float2(fbm(q + float2(0.0, t * 0.04)), fbm(q + float2(5.2, 1.3) - t * 0.03));
    float n = fbm(q + 1.6 * w);
    float n2 = fbm(q * 2.1 - w + float2(t * 0.02, 0.0));
    col = mix(col, c1, smoothstep(0.32, 0.72, n) * 0.9);
    col = mix(col, c2, smoothstep(0.52, 0.88, n2) * 0.65);
    float core = smoothstep(0.62, 0.95, n * n2 * 1.7);
    col += c3 * core * core * (0.35 + 0.65 * uBreath);
  } else {
    float n = fbm(q);
    col = mix(col, c1, smoothstep(0.35, 0.75, n) * 0.9);
    col = mix(col, c2, smoothstep(0.6, 0.9, n) * 0.5);
  }
  col *= 0.85 + 0.35 * uBreath;

  // Tiny twinkling stars on a hash grid.
  float2 g = p / 18.0;
  float2 cell = floor(g);
  float h = hash(cell);
  float2 cp = fract(g) - 0.5;
  float sd = length(cp);
  float twinkle = 0.55 + 0.45 * sin(t * 2.5 + h * 60.0);
  float star = step(0.965, h) * smoothstep(0.30, 0.02, sd) * twinkle;
  col += float3(0.9, 0.95, 1.0) * star;

  col += float3(0.8, 0.9, 1.0) * uBloom * 0.55 * exp(-length(uv - 0.5) * 2.2);
  col *= vignette(uv);
  return half4(half3(col), mix(1.0, 0.42, uCamera));
}`;

export const SHADER_BY_WORLD = {
  pond: POND_SHADER,
  sky: SKY_SHADER,
  nebula: NEBULA_SHADER,
} as const;
