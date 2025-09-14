import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Bind Pusher to window for Echo
;(globalThis as any).Pusher = Pusher

let echoInstance: Echo<any> | null = null

export function getEcho(): Echo<any> {
  if (echoInstance) return echoInstance

  const key = process.env.NEXT_PUBLIC_REVERB_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || 'local'
  const host = process.env.NEXT_PUBLIC_REVERB_HOST || process.env.NEXT_PUBLIC_PUSHER_HOST || '127.0.0.1'
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || process.env.NEXT_PUBLIC_PUSHER_PORT || 8080)
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || process.env.NEXT_PUBLIC_PUSHER_SCHEME || 'http'

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: any, options: any) => {
      return {
        authorize: (socketId: string, callback: Function) => {
          // Get token from multiple possible locations
          const token = typeof window !== 'undefined' 
            ? localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('auth_token')
            : null

          console.log('Echo auth - Token found:', !!token) // Debug log
          console.log('Echo auth - Channel:', channel.name) // Debug log

          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/broadcasting/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
            credentials: 'include',
          })
            .then(async (res) => {
              console.log('Echo auth response status:', res.status) // Debug log
              if (!res.ok) {
                const errorText = await res.text()
                console.error('Echo auth error:', errorText) // Debug log
                throw new Error(errorText)
              }
              return res.json()
            })
            .then((data) => {
              console.log('Echo auth success:', data) // Debug log
              callback(false, data)
            })
            .catch((error) => {
              console.error('Echo auth failed:', error) // Debug log
              callback(true, error)
            })
        },
      }
    },
  } as any)

  return echoInstance
}

export function disconnectEcho() {
  if (echoInstance) {
    try { echoInstance.disconnect() } catch {}
    echoInstance = null
  }
}
