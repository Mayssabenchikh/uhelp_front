'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Ticket,
  Plus,
  MessageCircle,
  HelpCircle,
  CreditCard,
  Crown,
  User,
  LogOut,
  MessageCircle as Logo,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/Context'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
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
      href: '/clientdashboard', 
      exact: true 
    },
    { 
      id: 'tickets', 
      label: 'My Tickets', 
      icon: Ticket, 
      href: '/clientdashboard/tickets' 
    },
    { 
      id: 'create-ticket', 
      label: 'Create Ticket', 
      icon: Plus, 
      href: '/clientdashboard/create-ticket' 
    },
    { 
      id: 'live-chat', 
      label: 'Live Chat', 
      icon: MessageCircle, 
      href: '/clientdashboard/live-chat' 
    },
    { 
      id: 'faq', 
      label: 'FAQ', 
      icon: HelpCircle, 
      href: '/clientdashboard/faq' 
    },
    { 
      id: 'billing', 
      label: 'Billing', 
      icon: CreditCard, 
      href: '/clientdashboard/billing' 
    },
    { 
      id: 'subscription', 
      label: 'Subscription', 
      icon: Crown, 
      href: '/clientdashboard/subscription' 
    },
    { 
      id: 'account', 
      label: 'My account', 
      icon: User, 
      href: '/clientdashboard/account' 
    },
  ]

  const isActiveRoute = (href: string, exact = false) => {
    if (!pathname) return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const getHeaderContent = () => {
    const userName = isMounted && user?.name ? user.name : 'client'
    
    // Check for ticket detail page
    if (pathname?.match(/^\/clientdashboard\/tickets\/[^/]+$/)) {
      const ticketId = pathname.split('/').pop()
      return { 
        title: `Ticket Responses`, 
        subtitle: `All responses for ticket` 
      }
    }
    
    switch (pathname) {
      case '/clientdashboard':
        return { 
          title: `Hello ${userName}!`, 
          subtitle: "Here's an overview of your activity and important information." 
        }
      case '/clientdashboard/tickets':
        return { 
          title: 'My Tickets', 
          subtitle: 'View and manage your support tickets.' 
        }
      case '/clientdashboard/create-ticket':
        return { 
          title: 'Create New Ticket', 
          subtitle: 'Submit a new support request to our team.' 
        }
      case '/clientdashboard/live-chat':
        return { 
          title: 'Live Chat', 
          subtitle: 'Get instant help from our support team.' 
        }
      case '/clientdashboard/faq':
        return { 
          title: 'Frequently Asked Questions', 
          subtitle: 'Find quick answers to common questions.' 
        }
      case '/clientdashboard/billing':
        return { 
          title: 'Billing', 
          subtitle: 'Manage your invoices and payment methods.' 
        }
      case '/clientdashboard/subscription':
        return { 
          title: 'Subscription', 
          subtitle: 'Manage your subscription plan and features.' 
        }
      case '/clientdashboard/account':
        return { 
          title: 'Account Settings', 
          subtitle: 'Update your personal information and preferences.' 
        }
      default:
        return { 
          title: `Hello ${userName}!`, 
          subtitle: "Here's an overview of your activity and important information." 
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
          <Link href="/clientdashboard" className="flex items-center gap-2">
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
                {isMounted && user?.name ? user.name : 'client '}
              </p>
              <p className="text-cyan-100 text-sm font-medium">
                {isMounted && (user?.role || 'Client')}
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
                        : "text-cyan-100 hover:bg-white hover:bg-opacity-15 hover:text-cyan-600"
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-cyan-100 hover:bg-white hover:bg-opacity-15 hover:text-cyan-600"
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