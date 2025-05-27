import { getLogger } from '../logging'
import { WebSocketService } from './WebSocketService'

const logger = getLogger({ prefix: 'WebRTCSignaling' })

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  sessionId: string
  userId: string
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | null
}

class WebRTCSignalingService {
  private static instance: WebRTCSignalingService
  private wsService: WebSocketService
  private messageHandlers: Map<string, (message: SignalingMessage) => void>

  private constructor() {
    this.wsService = WebSocketService.getInstance()
    this.messageHandlers = new Map()

    // Listen for WebRTC signaling messages
    this.wsService.on('webrtc', this.handleSignalingMessage.bind(this))
  }

  public static getInstance(): WebRTCSignalingService {
    if (!WebRTCSignalingService.instance) {
      WebRTCSignalingService.instance = new WebRTCSignalingService()
    }
    return WebRTCSignalingService.instance
  }

  /**
   * Send an offer to a peer
   */
  public async sendOffer(
    sessionId: string,
    userId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      await this.wsService.send('webrtc', {
        type: 'offer',
        sessionId,
        userId,
        data: offer,
      })
      logger.debug('Sent offer', { sessionId, userId })
    } catch (error) {
      logger.error('Failed to send offer', { error, sessionId, userId })
      throw error
    }
  }

  /**
   * Send an answer to a peer
   */
  public async sendAnswer(
    sessionId: string,
    userId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      await this.wsService.send('webrtc', {
        type: 'answer',
        sessionId,
        userId,
        data: answer,
      })
      logger.debug('Sent answer', { sessionId, userId })
    } catch (error) {
      logger.error('Failed to send answer', { error, sessionId, userId })
      throw error
    }
  }

  /**
   * Send an ICE candidate to a peer
   */
  public async sendIceCandidate(
    sessionId: string,
    userId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    try {
      await this.wsService.send('webrtc', {
        type: 'ice-candidate',
        sessionId,
        userId,
        data: candidate,
      })
      logger.debug('Sent ICE candidate', { sessionId, userId })
    } catch (error) {
      logger.error('Failed to send ICE candidate', { error, sessionId, userId })
      throw error
    }
  }

  /**
   * Register a handler for signaling messages for a specific session
   */
  public onMessage(
    sessionId: string,
    handler: (message: SignalingMessage) => void,
  ): () => void {
    this.messageHandlers.set(sessionId, handler)
    return () => this.messageHandlers.delete(sessionId)
  }

  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(message: SignalingMessage): void {
    const handler = this.messageHandlers.get(message.sessionId)
    if (handler) {
      try {
        handler(message)
      } catch (error) {
        logger.error('Error in signaling message handler', {
          error,
          sessionId: message.sessionId,
        })
      }
    }
  }
}

export const signalingService = WebRTCSignalingService.getInstance()
