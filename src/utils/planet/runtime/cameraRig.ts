export type CameraRigPreset = {
  azimuth: number
  polar: number
  distance: number
  targetY: number
}

type CameraRigDelta = {
  azimuth: number
  polar: number
  distance: number
}

export function createCameraRig(initialPreset?: Partial<CameraRigPreset>) {
  let preset: CameraRigPreset = {
    azimuth: 0,
    polar: 1.1,
    distance: 12,
    targetY: 0.4,
    ...initialPreset,
  }

  let userDelta: CameraRigDelta = {
    azimuth: 0,
    polar: 0,
    distance: 0,
  }

  return {
    setPreset(next: Partial<CameraRigPreset>) {
      preset = {
        ...preset,
        ...next,
      }
    },
    setUserDelta(next: Partial<CameraRigDelta>) {
      userDelta = {
        ...userDelta,
        ...next,
      }
    },
    resetUserDelta() {
      userDelta = {
        azimuth: 0,
        polar: 0,
        distance: 0,
      }
    },
    resolve() {
      return {
        azimuth: preset.azimuth + userDelta.azimuth,
        polar: preset.polar + userDelta.polar,
        distance: preset.distance + userDelta.distance,
        targetY: preset.targetY,
      }
    },
  }
}
