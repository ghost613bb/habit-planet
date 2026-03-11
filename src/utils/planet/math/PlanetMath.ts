import { Vector3, Quaternion } from 'three';

// 简单的种子随机数生成器，确保每次生成的位置一致
export class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  // 0 to 1
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  // min to max
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
}

// 辅助函数：获取星球表面坐标和旋转（支持非均匀缩放）
// 修正：由于 displacementScale 设置为 0.3，导致地表高度增加，物体需要相应提升高度
// DisplacementMap 默认会向外挤出，最大挤出量约为 displacementScale
// 我们取一个较小值，宁可让物体稍微陷入地下（自然），也不要悬空（穿帮）
const surfaceOffset = 0.05; 
// 基础压扁比例 (原 0.92)
const baseScaleY = 0.92
// 顶部额外压扁比例 (使上部更平坦)
const topFlattenScale = 0.80 

export const getSurfaceTransform = (normal: Vector3, radius: number) => {
  // 1. 计算变形后的表面点
  // 先获取标准球体上的点 (radius + surfaceOffset 确保在地面之上)
  const pos = normal.clone().normalize().multiplyScalar(radius + surfaceOffset)
  
  // 应用与几何体相同的变形逻辑
  let yScale = baseScaleY
  if (pos.y > 0) {
    yScale *= topFlattenScale
  }
  pos.y *= yScale
  
  // 2. 计算该点的切面法线
  // 对于缩放球体 (x, y*s, z)，法线是 (x, y/s, z)
  // 这里 s = yScale
  const surfaceNormal = new Vector3(pos.x, pos.y / (yScale * yScale), pos.z).normalize()
  
  const quaternion = new Quaternion()
  quaternion.setFromUnitVectors(new Vector3(0, 1, 0), surfaceNormal)
  
  return { pos, quaternion }
}
