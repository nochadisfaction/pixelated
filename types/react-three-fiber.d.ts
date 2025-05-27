declare module '@react-three/fiber' {
  import type * as THREE from 'three'
  import type * as React from 'react'

  export const Canvas: React.FC<any>
  export function useFrame(callback: (state: any, delta: number) => void): void
  export function extend(objects: Record<string, any>): void
  export function useThree(): {
    camera: THREE.Camera
    scene: THREE.Scene
    gl: THREE.WebGLRenderer
    size: { width: number; height: number }
    viewport: { width: number; height: number }
    [key: string]: any
  }
}
