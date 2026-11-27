// Where each of the 54 stickers sits in 3D space and which way it faces.
// The data comes from cubeMoves.js, so the 3D view and the move logic
// can never disagree about the cube's orientation.
//
// Coordinates: x is right, y is up, z is toward the viewer.
// Each piece position has coordinates in -1, 0, 1.
// The list is in U, R, F, D, L, B order, nine stickers per face (0-8).
import { FACELETS } from './cubeMoves.js'
import { FACE_IDS } from './cubeValidator.js'

export function getStickerPlacements() {
  return FACELETS.map((facelet, flatIndex) => ({
    flatIndex,
    faceId: FACE_IDS[Math.floor(flatIndex / 9)],
    index: flatIndex % 9,
    position: [...facelet.position],
    normal: [...facelet.normal],
  }))
}