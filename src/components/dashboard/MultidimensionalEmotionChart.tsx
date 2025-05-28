import React, { useRef, useState, useEffect, useMemo } from 'react'

import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import { Color, Object3D } from 'three'
import * as THREE from 'three'
import type { EmotionData } from '../../hooks/useMultidimensionalEmotions'
import { Box, CircularProgress, Typography } from '@mui/material'

// Create our own OrbitControls component
const OrbitControls = (props: any) => {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>()

  useEffect(() => {
    // Dynamically import OrbitControls
    const importOrbitControls = async () => {
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls'
      )
      const controls = new OrbitControls(camera, gl.domElement)

      // Apply props
      Object.entries(props).forEach(([key, value]) => {
        if (key !== 'ref' && key !== 'args') {
          controls[key] = value
        }
      })

      if (controlsRef.current) {
        controlsRef.current = controls
      }

      return () => {
        controls.dispose()
      }
    }

    importOrbitControls()
  }, [camera, gl, props])

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  })

  return null
}

// Simple Text component to replace drei's Text
const Text = ({
  children,
  position,
  fontSize = 0.1,
  color = 'white',
  anchorX = 'center',
}: {
  children: React.ReactNode
  position: [number, number, number]
  fontSize?: number
  color?: string
  anchorX?: string
}) => {
  return (
    <sprite position={position} scale={[fontSize * 10, fontSize * 5, 1]}>
      <spriteMaterial attach="material" args={[{ transparent: true }]}>
        <canvasTexture
          attach="map"
          args={[createTextCanvas(String(children), color, anchorX)]}
        />
      </spriteMaterial>
    </sprite>
  )
}

// Helper function to create text canvas
const createTextCanvas = (
  text: string,
  color = 'white',
  anchorX = 'center',
) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    return canvas
  }

  canvas.width = 256
  canvas.height = 128

  context.fillStyle = 'rgba(0,0,0,0)'
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.font = '24px Arial'
  context.fillStyle = color
  context.textAlign = anchorX as CanvasTextAlign
  context.textBaseline = 'middle'
  context.fillText(
    text,
    anchorX === 'left' ? 0 : canvas.width / 2,
    canvas.height / 2,
  )

  return canvas
}

// Extend with orbit controls
extend({ OrbitControls })

interface MultidimensionalEmotionChartProps {
  emotionData: EmotionData[]
  isLoading: boolean
}

// Helper to map PAD values to colors
const mapToColor = (valence: number, arousal: number): string => {
  // Red for negative valence & high arousal (anger, fear)
  // Green for positive valence & high arousal (excitement, joy)
  // Blue for positive valence & low arousal (content, relaxed)
  // Purple for negative valence & low arousal (sadness, boredom)

  const r = Math.round(255 * (1 - valence))
  const g = Math.round(255 * (valence > 0.5 ? 1 : 0.3))
  const b = Math.round(255 * (arousal < 0.5 ? 1 : 0.3))

  return `rgb(${r}, ${g}, ${b})`
}

// FPS counter for monitoring performance
const FPSCounter = () => {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  const prevTime = useRef(performance.now())

  useFrame(() => {
    frames.current++
    const time = performance.now()

    if (time >= prevTime.current + 1000) {
      setFps(Math.round((frames.current * 1000) / (time - prevTime.current)))
      prevTime.current = time
      frames.current = 0
    }
  })

  return (
    <Text
      position={[-1.2, 1.2, 0]}
      fontSize={0.08}
      color="white"
      anchorX="left"
    >
      FPS: {fps}
    </Text>
  )
}

// Controls component optimized with throttled updates
const Controls = () => {
  return (
    <OrbitControls
      enableZoom={true}
      enablePan={true}
      enableRotate={true}
      zoomSpeed={0.5}
      panSpeed={0.5}
      rotateSpeed={0.5}
    />
  )
}

// Axes component optimized with better geometry
const Axes = () => {
  return (
    <group>
      {/* X-axis (Valence) */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[[-1.2, 0, 0, 1.2, 0, 0], 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          attach="material"
          args={[{ color: 'red', linewidth: 2 }]}
        />
      </line>
      <mesh position={[1.3, 0, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial attach="material" args={[{ color: 'red' }]} />
      </mesh>
      <Text position={[1.4, 0.1, 0]} fontSize={0.1} color="white">
        Valence
      </Text>

      {/* Y-axis (Arousal) */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[[0, -1.2, 0, 0, 1.2, 0], 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          attach="material"
          args={[{ color: 'green', linewidth: 2 }]}
        />
      </line>
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial attach="material" args={[{ color: 'green' }]} />
      </mesh>
      <Text position={[0.1, 1.4, 0]} fontSize={0.1} color="white">
        Arousal
      </Text>

      {/* Z-axis (Dominance) */}
      <line>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            args={[[0, 0, -1.2, 0, 0, 1.2], 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          attach="material"
          args={[{ color: 'blue', linewidth: 2 }]}
        />
      </line>
      <mesh position={[0, 0, 1.3]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial attach="material" args={[{ color: 'blue' }]} />
      </mesh>
      <Text position={[0, 0.1, 1.4]} fontSize={0.1} color="white">
        Dominance
      </Text>
    </group>
  )
}

// Grid component
const Grid = () => {
  return (
    <group>
      {/* XZ plane (bottom) */}
      <gridHelper args={[2, 10, 'gray', 'gray']} rotation={[0, 0, 0]} />

      {/* XY plane (back) */}
      <gridHelper
        args={[2, 10, 'gray', 'gray']}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -1]}
      />

      {/* YZ plane (side) */}
      <gridHelper
        args={[2, 10, 'gray', 'gray']}
        rotation={[0, 0, Math.PI / 2]}
        position={[-1, 0, 0]}
      />
    </group>
  )
}

// Optimized point cloud using instanced rendering for emotion data
const EmotionPoints = ({ emotionData }: { emotionData: EmotionData[] }) => {
  const instanceRef = useRef<typeof THREE.InstancedMesh>(null)
  const tempObject = useMemo(() => new Object3D(), [])
  const tempColor = useMemo(() => new Color(), [])

  // Custom GPU tier detection since useDetectGPU is not available
  const [gpuTier, setGpuTier] = useState(2) // Default to medium tier

  useEffect(() => {
    // Simple check based on device pixel ratio and navigator info
    const pixelRatio = window.devicePixelRatio || 1
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (isMobile && pixelRatio < 2) {
      setGpuTier(0) // Low tier for mobile with low pixel ratio
    } else if (isMobile || pixelRatio < 2) {
      setGpuTier(1) // Medium tier for mobile or low pixel ratio
    } else {
      setGpuTier(2) // High tier for desktop with high pixel ratio
    }
  }, [])

  // Point size based on estimated GPU tier
  const pointSize = useMemo(() => {
    return gpuTier < 2 ? 0.03 : 0.04
  }, [gpuTier])

  useEffect(() => {
    if (!instanceRef.current || emotionData.length === 0) {
      return
    }

    // Update all instances at once
    emotionData.forEach((point, i) => {
      // Map PAD values to positions in range [-1, 1]
      const x = point.valence * 2 - 1 // valence maps to x-axis
      const y = point.arousal * 2 - 1 // arousal maps to y-axis
      const z = point.dominance * 2 - 1 // dominance maps to z-axis

      tempObject.position.set(x, y, z)
      tempObject.updateMatrix()

      instanceRef.current!.setMatrixAt(i, tempObject.matrix)
      instanceRef.current!.setColorAt(
        i,
        tempColor.set(mapToColor(point.valence, point.arousal)),
      )
    })

    instanceRef.current.instanceMatrix.needsUpdate = true
    if (instanceRef.current.instanceColor) {
      instanceRef.current.instanceColor.needsUpdate = true
    }
  }, [emotionData, tempColor, tempObject])

  return emotionData.length > 0 ? (
    <THREE.InstancedMesh
      ref={instanceRef}
      args={[undefined, undefined, emotionData.length]}
      frustumCulled={true}
    >
      <THREE.SphereGeometry args={[pointSize, 8, 8]} />
      <THREE.MeshBasicMaterial
        args={[{ vertexColors: true, transparent: true, opacity: 0.8 }]}
      />
    </THREE.InstancedMesh>
  ) : null
}

// Optimized connection lines with less geometry for better performance
const EmotionConnections = ({
  emotionData,
}: {
  emotionData: EmotionData[]
}) => {
  const connectionRef = useRef<any>(null)

  // Only render connections when we have enough data
  // and reduce detail based on data size for performance
  const positions = useMemo(() => {
    if (emotionData.length <= 1) {
      return new Float32Array(0)
    }

    // For large datasets, skip some points to improve performance
    const skipFactor = emotionData.length > 200 ? 2 : 1
    const effectiveLength = Math.ceil(emotionData.length / skipFactor)
    const linePositions = new Float32Array((effectiveLength - 1) * 6)

    for (
      let i = 0, j = 0;
      i < emotionData.length - skipFactor;
      i += skipFactor, j++
    ) {
      const current = emotionData[i]
      const next = emotionData[i + skipFactor]

      if (!next) {
        continue
      }

      // Map PAD values to positions in range [-1, 1]
      const x1 = current.valence * 2 - 1
      const y1 = current.arousal * 2 - 1
      const z1 = current.dominance * 2 - 1

      const x2 = next.valence * 2 - 1
      const y2 = next.arousal * 2 - 1
      const z2 = next.dominance * 2 - 1

      // Add line from current to next
      linePositions[j * 6] = x1
      linePositions[j * 6 + 1] = y1
      linePositions[j * 6 + 2] = z1

      linePositions[j * 6 + 3] = x2
      linePositions[j * 6 + 4] = y2
      linePositions[j * 6 + 5] = z2
    }

    return linePositions
  }, [emotionData])

  return (
    <THREE.Line ref={connectionRef}>
      <THREE.BufferGeometry>
        <THREE.BufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </THREE.BufferGeometry>
      <THREE.LineBasicMaterial
        attach="material"
        args={[
          {
            color: 'white',
            transparent: true,
            opacity: 0.4,
            linewidth: 1,
          },
        ]}
      />
    </THREE.Line>
  )
}

// Adaptive scene that adjusts detail level based on device capabilities
const AdaptiveScene = ({ emotionData }: { emotionData: EmotionData[] }) => {
  const [gpuTier, setGpuTier] = useState(2) // Default to medium tier

  useEffect(() => {
    // Simple check based on device pixel ratio and navigator info
    const pixelRatio = window.devicePixelRatio || 1
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (isMobile && pixelRatio < 2) {
      setGpuTier(0) // Low tier for mobile with low pixel ratio
    } else if (isMobile || pixelRatio < 2) {
      setGpuTier(1) // Medium tier for mobile or low pixel ratio
    } else {
      setGpuTier(2) // High tier for desktop with high pixel ratio
    }
  }, [])

  // Adjust detail level based on GPU capability
  const detailLevel = useMemo(() => {
    if (gpuTier < 1) {
      return 'low'
    }
    if (gpuTier < 2) {
      return 'medium'
    }
    return 'high'
  }, [gpuTier])

  return (
    <>
      {/* Always show axes and FPS counter */}
      <Axes />
      <FPSCounter />

      {/* Only show grid on medium and high detail levels */}
      {detailLevel !== 'low' && <Grid />}

      {/* Always show points, but with different detail levels */}
      <EmotionPoints emotionData={emotionData} />

      {/* Only show connections on high detail level or when we have few points */}
      {(detailLevel === 'high' || emotionData.length < 100) && (
        <EmotionConnections emotionData={emotionData} />
      )}
    </>
  )
}

const MultidimensionalEmotionChart: React.FC<
  MultidimensionalEmotionChartProps
> = ({ emotionData, isLoading }) => {
  // Use pixel ratio based on device capabilities
  const [pixelRatio, setPixelRatio] = useState(1.5)
  const [gpuTier, setGpuTier] = useState(2) // Default to medium tier

  useEffect(() => {
    // Simple check based on device pixel ratio and navigator info
    const pixelRatio = window.devicePixelRatio || 1
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (isMobile && pixelRatio < 2) {
      setGpuTier(0) // Low tier for mobile with low pixel ratio
    } else if (isMobile || pixelRatio < 2) {
      setGpuTier(1) // Medium tier for mobile or low pixel ratio
    } else {
      setGpuTier(2) // High tier for desktop with high pixel ratio
    }
  }, [])

  // Set appropriate pixel ratio based on estimated GPU capabilities
  useEffect(() => {
    if (gpuTier < 1) {
      setPixelRatio(1)
    } else if (gpuTier < 2) {
      setPixelRatio(1.5)
    } else {
      setPixelRatio(window.devicePixelRatio)
    }
  }, [gpuTier])

  // Memoize the initial camera position to prevent unnecessary recalculations
  const cameraPosition = useMemo(() => [1.5, 1.5, 1.5], [])

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          width: '100%',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading emotional data...</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '400px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '4px',
      }}
    >
      <Canvas
        dpr={pixelRatio}
        camera={{ position: cameraPosition, fov: 60 }}
        gl={{
          antialias: gpuTier > 1,
          alpha: true,
          precision: gpuTier < 2 ? 'mediump' : 'highp',
          powerPreference: 'high-performance',
        }}
        frameloop={emotionData.length > 0 ? 'demand' : 'never'}
      >
        <color attach="background" args={[0, 0, 0]} />
        <Controls />
        <AdaptiveScene emotionData={emotionData} />
      </Canvas>
    </Box>
  )
}

export default MultidimensionalEmotionChart
