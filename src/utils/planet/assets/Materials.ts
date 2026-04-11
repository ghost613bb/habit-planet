import { MeshStandardMaterial, MeshLambertMaterial, Vector2 } from 'three';

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
  rabbit: new MeshLambertMaterial({ color: 0xffb7b2 }),
  bear: new MeshLambertMaterial({ color: 0xffffff }),
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
    color: 0x8b7e66,
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
