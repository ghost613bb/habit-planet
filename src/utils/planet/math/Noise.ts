import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

// --- 辅助函数：纹理生成 ---
// 使用 Canvas 2D 生成噪点纹理，用于给 3D 物体增加粗糙质感
export function createNoiseTexture(baseColorHex: string, noiseAmount = 15) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.fillStyle = baseColorHex
  ctx.fillRect(0, 0, size, size)

  const img = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseAmount
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n))
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n))
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n))
  }
  ctx.putImageData(img, 0, 0)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.needsUpdate = true
  return tex
}
