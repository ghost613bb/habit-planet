import { defineStore } from 'pinia'
import {
  getDefaultCampfirePlacementDebugState,
  resolveCampfirePlacementDebugState,
} from '@/utils/planet/layers/campfirePlacement'

type QualityTierLabel = 'tier-0' | 'tier-1' | 'tier-2'

const defaultCampfireDebugState = getDefaultCampfirePlacementDebugState()

export const usePlanetDebugStore = defineStore('planetDebug', {
  state: () => ({
    advancedOpen: false,
    qualityTierLabel: 'tier-1' as QualityTierLabel,
    customDayCount: 1,
    campfireDebugEnabled: defaultCampfireDebugState.enabled,
    campfireDebugPhi: defaultCampfireDebugState.phi,
    campfireDebugTheta: defaultCampfireDebugState.theta,
  }),
  getters: {
    stageShortcuts: () => [
      { label: '阶段 1', dayCount: 1 },
      { label: '阶段 2', dayCount: 4 },
      { label: '阶段 3', dayCount: 11 },
      { label: '阶段 4', dayCount: 22 },
      { label: '阶段 5', dayCount: 46 },
      { label: '阶段 6', dayCount: 91 },
    ],
    qualityText: (state) => {
      if (state.qualityTierLabel === 'tier-0') return '低配降级'
      if (state.qualityTierLabel === 'tier-2') return '增强显示'
      return '默认均衡'
    },
  },
  actions: {
    toggleAdvanced() {
      this.advancedOpen = !this.advancedOpen
    },
    setQualityTier(label: QualityTierLabel) {
      this.qualityTierLabel = label
    },
    setCustomDayCount(dayCount: number) {
      const safeDayCount = Number.isFinite(dayCount) ? Math.floor(dayCount) : 1
      this.customDayCount = Math.max(1, safeDayCount)
    },
    setCampfireDebugEnabled(enabled: boolean) {
      this.campfireDebugEnabled = enabled
    },
    setCampfireDebugPhi(phi: number) {
      const nextState = resolveCampfirePlacementDebugState({
        enabled: true,
        phi,
        theta: this.campfireDebugTheta,
      })
      this.campfireDebugPhi = nextState.phi
    },
    setCampfireDebugTheta(theta: number) {
      const nextState = resolveCampfirePlacementDebugState({
        enabled: true,
        phi: this.campfireDebugPhi,
        theta,
      })
      this.campfireDebugTheta = nextState.theta
    },
    resetCampfireDebugPlacement() {
      this.campfireDebugPhi = defaultCampfireDebugState.phi
      this.campfireDebugTheta = defaultCampfireDebugState.theta
    },
  },
})
