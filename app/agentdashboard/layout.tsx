'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Ticket,
  Clock,
  CheckCircle,
  MessageCircle,
  User,
  LogOut,
  MessageCircle as Logo,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/Context'

interface AgentLayoutProps {
  children: React.ReactNode
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAppContext()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      href: '/agentdashboard', 
      exact: true 
    },
    { 
      id: 'my-tickets', 
      label: 'My Tickets', 
      icon: Ticket, 
      href: '/agentdashboard/my-tickets' 
    },
    { 
      id: 'available-tickets', 
      label: 'Available Tickets', 
      icon: Clock, 
      href: '/agentdashboard/available-tickets' 
    },
    { 
      id: 'resolved-tickets', 
      label: 'Resolved Tickets', 
      icon: CheckCircle, 
      href: '/agentdashboard/resolved-tickets' 
    },
    { 
      id: 'client-chat', 
      label: 'Client Chat', 
      icon: MessageCircle, 
      href: '/agentdashboard/client-chat' 
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: User, 
      href: '/agentdashboard/profile' 
    },
  ]

  const isActiveRoute = (href: string, exact = false) => {
    if (!pathname) return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const getHeaderContent = () => {
    const userName = isMounted && user?.name ? user.name : 'Agent'
    
    // Check for ticket detail page
    if (pathname?.match(/^\/agentdashboard\/(my-tickets|available-tickets|resolved-tickets)\/[^/]+$/)) {
      const ticketId = pathname.split('/').pop()
      return { 
        title: `Ticket Details`, 
        subtitle: `Managing ticket ${ticketId}` 
      }
    }
    
    switch (pathname) {
      case '/agentdashboard':
        return { 
          title: `Welcome, ${userName}!`, 
          subtitle: "Here's your support dashboard overview and ticket metrics." 
        }
      case '/agentdashboard/my-tickets':
        return { 
          title: 'My Tickets', 
          subtitle: 'Manage assigned tickets and track your progress.' 
        }
      case '/agentdashboard/available-tickets':
        return { 
          title: 'Available Tickets', 
          subtitle: 'Take charge of new tickets ' 
        }
      case '/agentdashboard/resolved-tickets':
        return { 
          title: 'Resolved Tickets', 
          subtitle: 'Review your completed tickets and customer feedback' 
        }
      case '/agentdashboard/client-chat':
        return { 
          title: 'Client Chat', 
          subtitle: 'Communicate directly with clients in real-time.' 
        }
      case '/agentdashboard/profile':
        return { 
          title: 'My Profile', 
          subtitle: 'Manage your personal information and preferences' 
        }
      default:
        return { 
          title: `Welcome, ${userName}!`, 
          subtitle: "Here's your support dashboard overview and ticket metrics." 
        }
    }
  }

  const headerContent = getHeaderContent()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-cyan-400 via-cyan-500 to-teal-500 text-white">
        {/* Logo */}
        <div className="p-6 border-b border-cyan-300">
          <Link href="/agentdashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Logo className="w-6 h-6 text-cyan-500" />
            </div>
            <h1 className="text-2xl font-bold">UHelp</h1>
          </Link>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-cyan-300">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gray-300 rounded-full overflow-hidden border-2 border-white">
              <img
                src={
                  isMounted && (user?.avatar || user?.profile_photo_url)
                    ? (user.avatar || user.profile_photo_url)
                    : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
                }
                alt={isMounted && user?.name ? user.name : 'User avatar'}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-lg">
                {isMounted && user?.name ? user.name : 'Agent'}
              </p>
              <p className="text-cyan-100 text-sm font-medium">
  {isMounted && user?.role ? user.role : 'Agent'}
</p>

            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href, item.exact)
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-white bg-opacity-20 text-white font-semibold shadow-md" 
                        : "text-cyan-100 hover:bg-white hover:bg-opacity-15 hover:text-cyan-500"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
            
            {/* Logout Button */}
            <li className="pt-2">
              <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-cyan-100 hover:bg-white hover:bg-opacity-15 hover:text-cyan-500"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-8 py-6">
            <div className="max-w-7xl">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {headerContent.title}
              </h1>
              <p className="text-gray-600 text-lg">
                {headerContent.subtitle}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}