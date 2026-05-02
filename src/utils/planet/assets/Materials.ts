import { Color, MeshStandardMaterial, MeshLambertMaterial, Vector2 } from 'three';

type PlanetGrassOverlayOptions = {
  strength?: number
  radius?: number
  feather?: number
  topStart?: number
  topEnd?: number
  irregularity?: number
  color?: string
}

const planetGrassOverlayState = {
  strength: 0,
  radius: 0.92,
  feather: 0.2,
  topStart: 0.72,
  topEnd: 0.9,
  irregularity: 0.08,
  color: new Color('#4b8534'),
}

function syncPlanetGrassOverlayUniforms(material: MeshStandardMaterial) {
  const shader = material.userData.planetGrassOverlayShader
  if (!shader) return

  shader.uniforms.uPlanetGrassStrength.value = planetGrassOverlayState.strength
  shader.uniforms.uPlanetGrassRadius.value = planetGrassOverlayState.radius
  shader.uniforms.uPlanetGrassFeather.value = planetGrassOverlayState.feather
  shader.uniforms.uPlanetGrassTopStart.value = planetGrassOverlayState.topStart
  shader.uniforms.uPlanetGrassTopEnd.value = planetGrassOverlayState.topEnd
  shader.uniforms.uPlanetGrassIrregularity.value = planetGrassOverlayState.irregularity
  shader.uniforms.uPlanetGrassColor.value.copy(planetGrassOverlayState.color)
}

function configurePlanetGrassOverlay(material: MeshStandardMaterial) {
  if (material.userData.planetGrassOverlayConfigured) {
    return
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlanetGrassStrength = { value: planetGrassOverlayState.strength }
    shader.uniforms.uPlanetGrassRadius = { value: planetGrassOverlayState.radius }
    shader.uniforms.uPlanetGrassFeather = { value: planetGrassOverlayState.feather }
    shader.uniforms.uPlanetGrassTopStart = { value: planetGrassOverlayState.topStart }
    shader.uniforms.uPlanetGrassTopEnd = { value: planetGrassOverlayState.topEnd }
    shader.uniforms.uPlanetGrassIrregularity = { value: planetGrassOverlayState.irregularity }
    shader.uniforms.uPlanetGrassColor = { value: planetGrassOverlayState.color.clone() }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPlanetLocalPosition;`,
      )
      .replace(
        '#include <displacementmap_vertex>',
        `#include <displacementmap_vertex>
vPlanetLocalPosition = transformed;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPlanetLocalPosition;
uniform float uPlanetGrassStrength;
uniform float uPlanetGrassRadius;
uniform float uPlanetGrassFeather;
uniform float uPlanetGrassTopStart;
uniform float uPlanetGrassTopEnd;
uniform float uPlanetGrassIrregularity;
uniform vec3 uPlanetGrassColor;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec3 grassDirection = normalize(vPlanetLocalPosition);
float grassTopMask = smoothstep(uPlanetGrassTopStart, uPlanetGrassTopEnd, grassDirection.y);
vec2 grassXZ = vPlanetLocalPosition.xz;
float grassNoise = sin(grassXZ.x * 7.0) * sin(grassXZ.y * 6.0) * uPlanetGrassIrregularity;
float grassRadius = uPlanetGrassRadius + grassNoise;
float grassRadial = length(grassXZ);
float grassRadialMask = 1.0 - smoothstep(grassRadius, grassRadius + uPlanetGrassFeather, grassRadial);
float grassMask = clamp(uPlanetGrassStrength * grassTopMask * grassRadialMask, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, uPlanetGrassColor, grassMask);`,
      )

    material.userData.planetGrassOverlayShader = shader
    syncPlanetGrassOverlayUniforms(material)
  }

  material.customProgramCacheKey = () => 'planet-grass-overlay-v1'
  material.userData.planetGrassOverlayConfigured = true
}

export function setPlanetGrassOverlay(options: PlanetGrassOverlayOptions) {
  if (options.strength != null) planetGrassOverlayState.strength = options.strength
  if (options.radius != null) planetGrassOverlayState.radius = options.radius
  if (options.feather != null) planetGrassOverlayState.feather = options.feather
  if (options.topStart != null) planetGrassOverlayState.topStart = options.topStart
  if (options.topEnd != null) planetGrassOverlayState.topEnd = options.topEnd
  if (options.irregularity != null) planetGrassOverlayState.irregularity = options.irregularity
  if (options.color != null) planetGrassOverlayState.color.set(options.color)

  syncPlanetGrassOverlayUniforms(mats.planet)
}

export function resetPlanetGrassOverlay() {
  setPlanetGrassOverlay({
    strength: 0,
    radius: 0.92,
    feather: 0.2,
    topStart: 0.72,
    topEnd: 0.9,
    irregularity: 0.08,
    color: '#4b8534',
  })
}

export function getPlanetGrassOverlayState() {
  return {
    ...planetGrassOverlayState,
    color: `#${planetGrassOverlayState.color.getHexString()}`,
  }
}

// --- 材质定义 ---
export const mats = {
  // 星球用 Lambert 替代 Standard，去掉 PBR 计算，帧率提升明显
  // displacementMap 仍然有效，Lambert 支持置换贴图
  planet: new MeshStandardMaterial({
    displacementScale: 0.3,
    color: 0xC4A484,
    roughness: 1.0,
    normalScale: new Vector2(1.5, 1.5),
  }),
  grass: new MeshLambertMaterial({ color: '#6b7045' }),
  houseBody: new MeshLambertMaterial({ color: '#f5deb3' }),
  houseRoof: new MeshLambertMaterial({ color: '#e07a5f' }),
  door: new MeshLambertMaterial({ color: 0x8b4513 }),
  window: new MeshLambertMaterial({ color: 0x444444, emissive: 0x000000 }),
  trunk: new MeshLambertMaterial({ color: '#5a3a2a' }),
  leaves1: new MeshLambertMaterial({ color: 0x88dd88, flatShading: true }),
  leaves2: new MeshLambertMaterial({ color: 0x55aa55, flatShading: true }),
  animalPink: new MeshLambertMaterial({ color: 0xffb7b2 }),
  rock: new MeshLambertMaterial({ color: 0x808080 }),
  ring: new MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    side: 2,
    roughness: 0.5,
    metalness: 0.1,
  }),
  blade: new MeshLambertMaterial({ color: 0xffffff }),
  rockInstanced: new MeshLambertMaterial({
    color: 0x767676,
    flatShading: true,
  }),
  grassInstanced: new MeshLambertMaterial({
    color: 0x7e885d,
    flatShading: true,
    side: 2,
  }),
  flowerPetal: new MeshLambertMaterial({
    color: 0x195cac,
    flatShading: true,
    side: 2,
  }),
}

configurePlanetGrassOverlay(mats.planet)
