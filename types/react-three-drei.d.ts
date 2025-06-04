declare module '@react-three/drei' {
  import type * as React from 'react'
  import * as THREE from 'three'

  export const OrbitControls: React.FC<any>
  export const Text: React.FC<{
    children: React.ReactNode
    position?: [number, number, number]
    color?: string
    fontSize?: number
    [key: string]: any
  }>
}
