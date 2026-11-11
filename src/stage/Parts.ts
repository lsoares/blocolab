import * as THREE from 'three'
import type { Spot } from './Grid.ts'

const placementLook = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })

const erasureLook = new THREE.MeshBasicMaterial({ color: '#ff4d4d', transparent: true, opacity: 0.35 })

const paints = new Map<string, THREE.MeshLambertMaterial>()

export function paint(color: string) {
  const known = paints.get(color)
  if (known) return known
  const made = new THREE.MeshLambertMaterial({ color })
  paints.set(color, made)
  return made
}

export function part(geometry: THREE.BufferGeometry, color: string, position: [number, number, number]) {
  const mesh = new THREE.Mesh(geometry, paint(color))
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function box(size: [number, number, number], color: string, position: [number, number, number]) {
  return part(new THREE.BoxGeometry(...size), color, position)
}

export function lyingCylinder(radius: number, length: number, color: string, position: [number, number, number]) {
  const mesh = part(new THREE.CylinderGeometry(radius, radius, length, 24), color, position)
  mesh.rotation.z = Math.PI / 2
  return mesh
}

export function standingCylinder(radius: number, height: number, color: string, position: [number, number, number]) {
  return part(new THREE.CylinderGeometry(radius, radius, height, 24), color, position)
}

export function disposeChildrenOf(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child)
    child.traverse((part) => {
      if (part instanceof THREE.Mesh || part instanceof THREE.LineSegments) part.geometry.dispose()
    })
  }
}

export function showAsGhost(model: THREE.Object3D) {
  model.traverse((part) => {
    if (part instanceof THREE.Mesh) Object.assign(part, { material: placementLook, castShadow: false })
  })
}

export function createErasureMarker({ x, z }: Spot) {
  const marker = new THREE.Group().add(
    new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.5, 0.96), erasureLook),
    new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.5, 0.96)),
      new THREE.LineBasicMaterial({ color: '#7a0000' }),
    ),
    createCross(),
  )
  marker.position.set(x + 0.5, 0.25, z + 0.5)
  return marker
}

function createCross() {
  const top = 0.27
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-0.48, top, -0.48, 0.48, top, 0.48, -0.48, top, 0.48, 0.48, top, -0.48], 3),
    ),
    new THREE.LineBasicMaterial({ color: '#7a0000' }),
  )
}
