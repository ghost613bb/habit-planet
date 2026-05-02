import { Group } from 'three'
import { describe, expect, it } from 'vitest'

import { CharacterLayer } from './CharacterLayer'

function createLayer() {
  const parentGroup = new Group()

  return new CharacterLayer({
    parentGroup,
    planetRadius: 3,
  })
}

describe('角色图层中的蝴蝶', () => {
  it('第 46 天起不会再显示叶片样式的飞鸟占位', async () => {
    const layer = createLayer()
    const birds = (layer as any).birds as Group[]

    expect(birds).toHaveLength(0)

    layer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    expect(birds.every((item) => item.visible === false)).toBe(true)
  })
})
