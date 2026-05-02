import type { AssetDescriptor, PlanetStageIndex } from '../types'

type StageManifestEntry = {
  cameraPreset: string
  layers: string[]
  heroIds: string[]
}

type HabitPlanetManifest = {
  stages: Record<PlanetStageIndex, StageManifestEntry>
  assets: AssetDescriptor[]
}

export const habitPlanetManifest: HabitPlanetManifest = {
  stages: {
    1: {
      cameraPreset: 'seed',
      layers: ['terrain', 'vegetation'],
      heroIds: ['sprout'],
    },
    2: {
      cameraPreset: 'campfire',
      layers: ['terrain', 'vegetation', 'fx'],
      heroIds: ['campfire'],
    },
    3: {
      cameraPreset: 'shelter',
      layers: ['terrain', 'vegetation', 'structure'],
      heroIds: [],
    },
    4: {
      cameraPreset: 'home',
      layers: ['terrain', 'vegetation', 'structure', 'character', 'fx'],
      heroIds: ['hut-full', 'windmill', 'rabbit'],
    },
    5: {
      cameraPreset: 'flourish',
      layers: ['terrain', 'vegetation', 'structure', 'character', 'fx'],
      heroIds: ['swing'],
    },
    6: {
      cameraPreset: 'finale',
      layers: ['terrain', 'vegetation', 'structure', 'character', 'fx', 'finale'],
      heroIds: ['life-tree'],
    },
  },
  assets: [
    { id: 'sprout', scope: 'hero', stages: [1], preloadAt: [1], source: 'existing-reuse', degradeTo: null },
    { id: 'campfire', scope: 'hero', stages: [2], preloadAt: [2], source: 'required-model', degradeTo: null },
    { id: 'hut-full', scope: 'hero', stages: [4, 5, 6], preloadAt: [3, 4], source: 'required-model', degradeTo: null },
    { id: 'windmill', scope: 'hero', stages: [4, 5, 6], preloadAt: [4], source: 'required-model', degradeTo: null },
    { id: 'rabbit', scope: 'hero', stages: [4, 5], preloadAt: [4], source: 'required-model', degradeTo: null },
    { id: 'swing', scope: 'hero', stages: [5, 6], preloadAt: [5], source: 'procedural-kitbash', degradeTo: null },
    { id: 'butterfly-fx', scope: 'optional-fx', stages: [5, 6], preloadAt: [5], source: 'procedural-fx', degradeTo: null },
    { id: 'life-tree', scope: 'hero', stages: [6], preloadAt: [5, 6], source: 'required-model', degradeTo: null },
    { id: 'stardust-fx', scope: 'optional-fx', stages: [6], preloadAt: [6], source: 'procedural-fx', degradeTo: null },
  ],
}
