export type StageTwoDay = 4 | 5 | 6 | 7 | 8 | 9 | 10

export type StageTwoVegetationTuning = {
  grassPatchCount: number
  bushCount: number
  treeCount: number
  treeScaleSet: [number, number, number]
  grassPatchScale: number
  bushScale: number
}

export type StageTwoTerrainTuning = {
  grassOverlay: {
    strength: number
    radius: number
    feather: number
    topStart: number
    topEnd: number
    irregularity: number
    color: string
  }
  rockCount: number
  groundTint: string
}

export type StageTwoDayTuning = {
  vegetation: StageTwoVegetationTuning
  terrain: StageTwoTerrainTuning
}

export const STAGE_TWO_DAY_TUNING: Record<StageTwoDay, StageTwoDayTuning> = {
  4: {
    vegetation: {
      grassPatchCount: 26,
      bushCount: 2,
      treeCount: 0,
      treeScaleSet: [0.78, 0.74, 0.72],
      grassPatchScale: 0.505,
      bushScale: 1.18,
    },
    terrain: {
      grassOverlay: {
        strength: 0.9,
        radius: 1.92,
        feather: 0.78,
        topStart: 0.3,
        topEnd: 0.9,
        irregularity: 0.1,
        color: '#4b8534',
      },
      rockCount: 5,
      groundTint: '#6f7d52',
    },
  },
  5: {
    vegetation: {
      grassPatchCount: 36,
      bushCount: 3,
      treeCount: 1,
      treeScaleSet: [0.82, 0.76, 0.72],
      grassPatchScale: 0.515,
      bushScale: 1.22,
    },
    terrain: {
      grassOverlay: {
        strength: 0.92,
        radius: 2.08,
        feather: 0.86,
        topStart: 0.24,
        topEnd: 0.9,
        irregularity: 0.105,
        color: '#4b8534',
      },
      rockCount: 6,
      groundTint: '#748357',
    },
  },
  6: {
    vegetation: {
      grassPatchCount: 46,
      bushCount: 4,
      treeCount: 1,
      treeScaleSet: [0.9, 0.78, 0.74],
      grassPatchScale: 0.525,
      bushScale: 1.26,
    },
    terrain: {
      grassOverlay: {
        strength: 0.93,
        radius: 2.22,
        feather: 0.92,
        topStart: 0.2,
        topEnd: 0.88,
        irregularity: 0.115,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#79895c',
    },
  },
  7: {
    vegetation: {
      grassPatchCount: 58,
      bushCount: 4,
      treeCount: 2,
      treeScaleSet: [0.96, 0.82, 0.76],
      grassPatchScale: 0.535,
      bushScale: 1.28,
    },
    terrain: {
      grassOverlay: {
        strength: 0.94,
        radius: 2.34,
        feather: 0.98,
        topStart: 0.16,
        topEnd: 0.88,
        irregularity: 0.125,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#7d8f60',
    },
  },
  8: {
    vegetation: {
      grassPatchCount: 70,
      bushCount: 5,
      treeCount: 2,
      treeScaleSet: [1, 0.88, 0.78],
      grassPatchScale: 0.545,
      bushScale: 1.32,
    },
    terrain: {
      grassOverlay: {
        strength: 0.95,
        radius: 2.44,
        feather: 1.02,
        topStart: 0.12,
        topEnd: 0.88,
        irregularity: 0.13,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#809562',
    },
  },
  9: {
    vegetation: {
      grassPatchCount: 84,
      bushCount: 5,
      treeCount: 2,
      treeScaleSet: [1.04, 0.94, 0.82],
      grassPatchScale: 0.555,
      bushScale: 1.34,
    },
    terrain: {
      grassOverlay: {
        strength: 0.96,
        radius: 2.52,
        feather: 1.06,
        topStart: 0.09,
        topEnd: 0.88,
        irregularity: 0.138,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#849a65',
    },
  },
  10: {
    vegetation: {
      grassPatchCount: 98,
      bushCount: 5,
      treeCount: 2,
      treeScaleSet: [1.08, 1, 0.9],
      grassPatchScale: 0.565,
      bushScale: 1.36,
    },
    terrain: {
      grassOverlay: {
        strength: 0.97,
        radius: 2.6,
        feather: 1.1,
        topStart: 0.06,
        topEnd: 0.88,
        irregularity: 0.145,
        color: '#4b8534',
      },
      rockCount: 7,
      groundTint: '#86a95d',
    },
  },
}

export function getStageTwoDay(dayCount: number): StageTwoDay {
  const safeDay = Math.max(4, Math.min(10, Math.floor(dayCount)))
  return safeDay as StageTwoDay
}

export function getStageTwoDayTuning(dayCount: number): StageTwoDayTuning {
  return STAGE_TWO_DAY_TUNING[getStageTwoDay(dayCount)]
}
