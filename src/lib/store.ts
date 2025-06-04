import type { AIService } from './ai/models/ai-types'
import type { FHEService } from './fhe'
import { create } from 'zustand'
import { createMentalHealthChat } from './chat/mentalHealthChat'
import { devtools } from 'zustand/middleware'
import { persist } from 'zustand/middleware'

interface StoreState {
  // Security settings
  securityLevel: 'standard' | 'hipaa' | 'maximum'
  encryptionEnabled: boolean
  fheInitialized: boolean

  // AI service
  aiService: AIService

  // FHE Service
  fheService: FHEService | null

  // Mental Health Chat
  mentalHealthChat: ReturnType<typeof createMentalHealthChat> | null
  mentalHealthAnalysisEnabled: boolean
  expertGuidanceEnabled: boolean

  // Actions
  setSecurityLevel: (level: 'standard' | 'hipaa' | 'maximum') => void
  setEncryptionEnabled: (enabled: boolean) => void
  setFHEInitialized: (initialized: boolean) => void
  setAIService: (service: AIService) => void
  initializeMentalHealthChat: () => ReturnType<
    typeof createMentalHealthChat
  > | null
  configureMentalHealthAnalysis: (
    enableAnalysis: boolean,
    useExpertGuidance: boolean,
  ) => void
}

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        securityLevel: 'hipaa',
        encryptionEnabled: true,
        fheInitialized: false,
        aiService: null as unknown as AIService,
        fheService: null,
        mentalHealthChat: null,
        mentalHealthAnalysisEnabled: true,
        expertGuidanceEnabled: true,

        // Actions
        setSecurityLevel: (level) => set({ securityLevel: level }),
        setEncryptionEnabled: (enabled) => set({ encryptionEnabled: enabled }),
        setFHEInitialized: (initialized) =>
          set({ fheInitialized: initialized }),
        setAIService: (service) => set({ aiService: service }),
        initializeMentalHealthChat: () => {
          if (get().fheService) {
            const mentalHealthChat = createMentalHealthChat(
              get().fheService as FHEService,
              {
                enableAnalysis: get().mentalHealthAnalysisEnabled,
                useExpertGuidance: get().expertGuidanceEnabled,
              },
            )
            set({ mentalHealthChat })
            return mentalHealthChat
          }
          return null
        },
        configureMentalHealthAnalysis: (
          enableAnalysis: boolean,
          useExpertGuidance: boolean,
        ) => {
          set({
            mentalHealthAnalysisEnabled: enableAnalysis,
            expertGuidanceEnabled: useExpertGuidance,
          })

          const { mentalHealthChat } = get()
          if (mentalHealthChat) {
            mentalHealthChat.configure({
              enableAnalysis,
              useExpertGuidance,
            })
          }
        },
      }),
      {
        name: 'therapy-state',
        partialize: (state) => ({
          // Save these settings to localStorage
          securityLevel: state.securityLevel,
          encryptionEnabled: state.encryptionEnabled,
          mentalHealthAnalysisEnabled: state.mentalHealthAnalysisEnabled,
          expertGuidanceEnabled: state.expertGuidanceEnabled,
        }),
      },
    ),
  ),
)
