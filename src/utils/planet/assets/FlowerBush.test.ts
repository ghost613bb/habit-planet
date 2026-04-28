import { describe, expect, it } from 'vitest'
import { Group, Mesh, MeshLambertMaterial } from 'three'

import { createFlowerBushInstance, preloadFlowerBushTemplate } from './FlowerBush'

function collectRoleColors(root: Group, role: string) {
  const colors: string[] = []
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const anyRole = (obj.userData?.flowerBushRole as string | undefined) ?? ''
    if (anyRole !== role) return
    const mat = obj.material
    if (!(mat instanceof MeshLambertMaterial)) return
    colors.push(`#${mat.color.getHexString()}`)
  })
  return colors
}

describe('FlowerBush', () => {
  it('preload 返回可用模板', async () => {
    const template = await preloadFlowerBushTemplate()
    expect(template).toBeInstanceOf(Group)
    expect(template.children.length).toBeGreaterThan(0)
  })

  it('单个花丛模板包含 5 朵花', async () => {
    await preloadFlowerBushTemplate()
    const flowerBush = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'pink' })
    const centers = collectRoleColors(flowerBush, 'center')
    expect(centers.length).toBe(5)
  })

  it('createFlowerBushInstance 可按 targetHeight 缩放', async () => {
    await preloadFlowerBushTemplate()
    const a = createFlowerBushInstance({ targetHeight: 0.4, paletteVariant: 'pink' })
    const b = createFlowerBushInstance({ targetHeight: 0.8, paletteVariant: 'pink' })
    expect(a.scale.y).toBeLessThan(b.scale.y)
  })

  it('不同 paletteVariant 的花瓣/花蕊颜色应不同（叶子保持统一绿色）', async () => {
    await preloadFlowerBushTemplate()
    const pink = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'pink' })
    const yellow = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'yellow' })
    const blue = createFlowerBushInstance({ targetHeight: 0.6, paletteVariant: 'blue' })

    const pinkPetals = collectRoleColors(pink, 'petal')
    const yellowPetals = collectRoleColors(yellow, 'petal')
    const bluePetals = collectRoleColors(blue, 'petal')
    expect(pinkPetals.length).toBeGreaterThan(0)
    expect(yellowPetals.length).toBeGreaterThan(0)
    expect(bluePetals.length).toBeGreaterThan(0)
    expect(pinkPetals.join(',')).not.toBe(yellowPetals.join(','))
    expect(pinkPetals.join(',')).not.toBe(bluePetals.join(','))

    const pinkCenters = collectRoleColors(pink, 'center')
    const yellowCenters = collectRoleColors(yellow, 'center')
    const blueCenters = collectRoleColors(blue, 'center')
    expect(pinkCenters.length).toBeGreaterThan(0)
    expect(yellowCenters.length).toBeGreaterThan(0)
    expect(blueCenters.length).toBeGreaterThan(0)
    expect(pinkCenters.join(',')).not.toBe(yellowCenters.join(','))
    expect(pinkCenters.join(',')).not.toBe(blueCenters.join(','))

    const pinkLeaves = collectRoleColors(pink, 'leaf')
    const yellowLeaves = collectRoleColors(yellow, 'leaf')
    const blueLeaves = collectRoleColors(blue, 'leaf')
    expect(pinkLeaves.length).toBeGreaterThan(0)
    expect(yellowLeaves.join(',')).toBe(pinkLeaves.join(','))
    expect(blueLeaves.join(',')).toBe(pinkLeaves.join(','))
  })
})
