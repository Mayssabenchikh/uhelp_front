// hooks/useChatConnection.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getEcho, disconnectEcho } from '@/lib/echo'
import type { ChatMessage } from '@/types'

interface UseChatConnectionProps {
  conversationId: number | null
  onMessageReceived: (message: ChatMessage) => void
  onUserTyping?: (data: { user_id: number; user_name: string }) => void
}

export function useChatConnection({ 
  conversationId, 
  onMessageReceived, 
  onUserTyping 
}: UseChatConnectionProps) {
  const channelRef = useRef<any>(null)
  const echoRef = useRef<any>(null)

  const subscribeToConversation = useCallback((id: number) => {
    try {
      console.log(`Subscribing to conversation ${id}`)
      
      const echo = getEcho()
      echoRef.current = echo
      
      // Unsubscribe from previous channel
      if (channelRef.current) {
        console.log('Unsubscribing from previous channel')
        channelRef.current.unsubscribe()
      }

      // Subscribe to new channel
      const channel = echo.private(`conversation.${id}`)
      channelRef.current = channel

      // Listen for new messages
      channel.listen('ChatMessageSent', (payload: any) => {
        console.log('New message received:', payload)
        
        const message: ChatMessage = {
          id: payload.id,
          conversation_id: payload.conversation_id,
          user_id: payload.user_id,
          user: {
            id: payload.user.id,
            name: payload.user.name,
            email: payload.user.email || null,
            avatar: payload.user.profile_photo || null
          },
          message: payload.body,
          attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
          created_at: payload.created_at,
        }
        
        onMessageReceived(message)
      })

      // Listen for typing indicators (optional)
      if (onUserTyping) {
        channel.listen('UserTyping', (payload: any) => {
          console.log('User typing:', payload)
          onUserTyping({
            user_id: payload.user_id,
            user_name: payload.user_name
          })
        })
      }

      // Listen for connection events
      channel.subscribed(() => {
        console.log(`Successfully subscribed to conversation.${id}`)
      })

      channel.error((error: any) => {
        console.error(`Error subscribing to conversation.${id}:`, error)
      })

    } catch (error) {
      console.error('Failed to subscribe to conversation:', error)
    }
  }, [onMessageReceived, onUserTyping])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('Unsubscribing from chat channel')
      try {
        channelRef.current.unsubscribe()
      } catch (error) {
        console.warn('Error unsubscribing:', error)
      }
      channelRef.current = null
    }
  }, [])

  const sendTypingIndicator = useCallback((conversationId: number) => {
    if (channelRef.current) {
      try {
        channelRef.current.whisper('typing', {
          user_id: Date.now(), // Replace with actual user ID
          timestamp: Date.now()
        })
      } catch (error) {
        console.warn('Failed to send typing indicator:', error)
      }
    }
  }, [])

  // Subscribe when conversationId changes
  useEffect(() => {
    if (conversationId) {
      subscribeToConversation(conversationId)
    } else {
      unsubscribe()
    }

    return () => {
      unsubscribe()
    }
  }, [conversationId, subscribeToConversation, unsubscribe])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe()
      if (echoRef.current) {
        try {
          disconnectEcho()
        } catch (error) {
          console.warn('Error disconnecting Echo:', error)
        }
      }
    }
  }, [unsubscribe])

  return {
    sendTypingIndicator,
    unsubscribe
  }
}
