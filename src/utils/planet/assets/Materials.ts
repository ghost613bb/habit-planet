import { MeshStandardMaterial, Vector2 } from 'three';
import { createNoiseTexture } from '../math/Noise';

// --- 材质定义 ---
// 优化：将 createNoiseTexture 替换为纯色，或者将其延迟加载。
// 由于 getImageData 和 putImageData 在初始化时同步执行会阻塞主线程长达数百毫秒（导致 Long Task），
// 在不严重影响视觉效果的情况下，直接使用纯色替代动态生成的噪点贴图可以完全消除这部分卡顿。
export const mats = {
  planet: new MeshStandardMaterial({
    // map 和 displacementMap 将在 TIFF 加载完成后设置
    displacementScale: 0.3, // 凹凸程度，根据需要微调
    color: 0xC4A484, // 浅褐棕色 (Light Brown / Sandy Brown)
    roughness: 1.0, // 范围0-0.1
    normalScale: new Vector2(1.5, 1.5),
  }),
  grass: new MeshStandardMaterial({ color: '#6b7045', roughness: 0.9 }),
  houseBody: new MeshStandardMaterial({ color: '#f5deb3', roughness: 0.8 }),
  houseRoof: new MeshStandardMaterial({ color: '#e07a5f', roughness: 0.7 }),
  door: new MeshStandardMaterial({ color: 0x8b4513 }),
  window: new MeshStandardMaterial({ color: 0x444444, emissive: 0x000000 }),
  trunk: new MeshStandardMaterial({ color: '#5a3a2a', roughness: 1.0 }),
  leaves1: new MeshStandardMaterial({ color: 0x88dd88, roughness: 0.9, flatShading: true }),
  leaves2: new MeshStandardMaterial({ color: 0x55aa55, roughness: 0.9, flatShading: true }),
  rabbit: new MeshStandardMaterial({ color: 0xffb7b2, roughness: 0.7 }),
  bear: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  rock: new MeshStandardMaterial({ color: 0x808080, roughness: 0.9 }),
  ring: new MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    side: 2,
    roughness: 0.5,
    metalness: 0.1,
  }),
  blade: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  
  // 额外材质 (之前在函数内定义的)
  rockInstanced: new MeshStandardMaterial({
    color: 0x8b7e66, // 泥土色
    roughness: 0.9,
    flatShading: true
  }),
  grassInstanced: new MeshStandardMaterial({
    color: 0x7e885d, // 苔藓绿 (Moss Green) - 枯黄与暗绿的中间色
    roughness: 0.9,
    flatShading: true,
    side: 2 // DoubleSide
  }),
  flowerPetal: new MeshStandardMaterial({
    color: 0x195cac, // 蓝紫色 (Blue Violet)
    roughness: 0.8,
    flatShading: true,
    side: 2
  })
}
