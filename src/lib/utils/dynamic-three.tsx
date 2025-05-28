/**
 * Dynamic imports for Three.js modules
 * 
 * This file provides dynamic import functions for Three.js modules to reduce initial bundle size
 * and address chunk size warnings.
 */

import React, { useState, useEffect, Suspense } from 'react';

// Loading component for Three.js visualizations
export const ThreeDLoading = () => (
  <div className="flex items-center justify-center p-8 min-h-[400px] bg-slate-50 rounded-lg">
    <div className="flex flex-col items-center gap-2">
      <div className="h-10 w-10 border-4 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent rounded-full animate-spin"></div>
      <div className="text-sm text-slate-500">Loading 3D visualization...</div>
    </div>
  </div>
);

// Dynamic import for core Three.js module
export const loadThreeCore = async () => {
  return import('three');
};

// Dynamic import for Three.js controls
export const loadThreeControls = async () => {
  return import('three/examples/jsm/controls/OrbitControls');
};

// Dynamic import for Three.js loaders
export const loadThreeLoaders = async () => {
  return import('three/examples/jsm/loaders/GLTFLoader');
};

// React hook for using Three.js with dynamic loading
export const useThree = () => {
  const [three, setThree] = useState<any>(null);
  const [controls, setControls] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadModules = async () => {
      try {
        const [threeModule, controlsModule] = await Promise.all([
          loadThreeCore(),
          loadThreeControls()
        ]);
        
        if (isMounted) {
          setThree(threeModule);
          setControls(controlsModule);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load Three.js modules'));
          setLoading(false);
        }
      }
    };
    
    loadModules();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  return { three, controls, loading, error };
};

// Lazy-loaded Three.js components
export const ThreeScene = React.lazy(() => import('../../components/three/ThreeScene'));
export const EmotionParticle = React.lazy(() => import('../../components/three/custom/EmotionParticle'));
export const SpinningGlobe = React.lazy(() => import('../../components/three/SpinningGlobe'));
export const MultidimensionalEmotionChart = React.lazy(() => import('../../components/three/MultidimensionalEmotionChart'));
export const Particle = React.lazy(() => import('../../components/three/Particle'));

// Dynamic Three.js scene component
export const DynamicThreeScene = (props: any) => (
  <Suspense fallback={<ThreeDLoading />}>
    <ThreeScene {...props} />
  </Suspense>
);

// Dynamic emotion particle component
export const DynamicEmotionParticle = (props: any) => (
  <Suspense fallback={<ThreeDLoading />}>
    <EmotionParticle {...props} />
  </Suspense>
);

// Dynamic spinning globe component
export const DynamicSpinningGlobe = (props: any) => (
  <Suspense fallback={<ThreeDLoading />}>
    <SpinningGlobe {...props} />
  </Suspense>
);

// Dynamic multidimensional emotion chart component
export const DynamicMultidimensionalEmotionChart = (props: any) => (
  <Suspense fallback={<ThreeDLoading />}>
    <MultidimensionalEmotionChart {...props} />
  </Suspense>
);

// Dynamic particle component
export const DynamicParticle = (props: any) => (
  <Suspense fallback={<ThreeDLoading />}>
    <Particle {...props} />
  </Suspense>
); 