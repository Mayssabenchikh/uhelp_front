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
        try {
          channelRef.current.unsubscribe()
        } catch (error) {
          console.warn('Error unsubscribing from previous channel:', error)
        }
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
        // Check if Echo instance is still available and connected
        if (echoRef.current && echoRef.current.connector && echoRef.current.connector.pusher) {
          const pusher = echoRef.current.connector.pusher
          const state = pusher.connection?.state
          
          // Only attempt unsubscribe if connection is not closing/closed
          if (state && state !== 'disconnected' && state !== 'disconnecting') {
            channelRef.current.unsubscribe()
          } else {
            console.log('WebSocket connection is closing/closed, skipping unsubscribe')
          }
        } else {
          // If no pusher instance, try to unsubscribe anyway but catch errors
          channelRef.current.unsubscribe()
        }
      } catch (error) {
        // Only log as warning since this is expected during cleanup
        if (error instanceof Error && error.message.includes('CLOSING or CLOSED')) {
          console.log('WebSocket is already in CLOSING or CLOSED state.')
        } else {
          console.warn('Error unsubscribing:', error)
        }
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
      // Unsubscribe from channel first
      unsubscribe()
      
      // Then disconnect Echo if needed
      if (echoRef.current) {
        try {
          // Small delay to allow unsubscribe to complete
          setTimeout(() => {
            disconnectEcho()
          }, 100)
        } catch (error) {
          console.warn('Error disconnecting Echo:', error)
        }
        echoRef.current = null
      }
    }
  }, [unsubscribe])

  return {
    sendTypingIndicator,
    unsubscribe
  }
}
