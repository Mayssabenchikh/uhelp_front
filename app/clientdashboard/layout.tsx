'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
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
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/Context'
import LanguageSelector from '../../components/LanguageSelector'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAppContext()
  const { t } = useTranslation()

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
      label: t('nav.dashboard'), 
      icon: LayoutDashboard, 
      href: '/clientdashboard', 
      exact: true 
    },
    { 
      id: 'tickets', 
      label: t('nav.tickets'), 
      icon: Ticket, 
      href: '/clientdashboard/tickets' 
    },
    { 
      id: 'create-ticket', 
      label: t('nav.createTicket'), 
      icon: Plus, 
      href: '/clientdashboard/create-ticket' 
    },
    { 
      id: 'live-chat', 
      label: t('nav.liveChat'), 
      icon: MessageCircle, 
      href: '/clientdashboard/live-chat' 
    },
    { 
      id: 'faq', 
      label: t('nav.faq'), 
      icon: HelpCircle, 
      href: '/clientdashboard/faq' 
    },
    { 
      id: 'billing', 
      label: t('nav.billing'), 
      icon: CreditCard, 
      href: '/clientdashboard/billing' 
    },
    { 
      id: 'subscription', 
      label: t('nav.subscription'), 
      icon: Crown, 
      href: '/clientdashboard/subscription' 
    },
    { 
      id: 'account', 
      label: t('nav.account'), 
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
    const userName = isMounted && user?.name ? user.name : t('common.client')
    
    // Check for ticket detail page
    if (pathname?.match(/^\/clientdashboard\/tickets\/[^/]+$/)) {
      const ticketId = pathname.split('/').pop()
      return { 
        title: t('tickets.responses'), 
        subtitle: t('tickets.allResponsesFor') 
      }
    }
    
    switch (pathname) {
      case '/clientdashboard':
        return { 
          title: t('dashboard.hello', { name: userName }), 
          subtitle: t('dashboard.welcomeMessage') 
        }
      case '/clientdashboard/tickets':
        return { 
          title: t('nav.tickets'), 
          subtitle: t('tickets.viewAndManage') 
        }
      case '/clientdashboard/create-ticket':
        return { 
          title: t('nav.createTicket'), 
          subtitle: t('tickets.submitNewRequest') 
        }
      case '/clientdashboard/live-chat':
        return { 
          title: t('nav.liveChat'), 
          subtitle: t('chat.getInstantHelp') 
        }
      case '/clientdashboard/faq':
        return { 
          title: t('nav.faq'), 
          subtitle: t('faq.findQuickAnswers') 
        }
      case '/clientdashboard/billing':
        return { 
          title: t('nav.billing'), 
          subtitle: t('billing.manageInvoices') 
        }
      case '/clientdashboard/subscription':
        return { 
          title: t('nav.subscription'), 
          subtitle: t('subscription.managePlan') 
        }
      case '/clientdashboard/account':
        return { 
          title: t('nav.account'), 
          subtitle: t('account.updateInfo') 
        }
      default:
        return { 
          title: t('dashboard.hello', { name: userName }), 
          subtitle: t('dashboard.welcomeMessage') 
        }
    }
  }

  const headerContent = getHeaderContent()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-gradient-to-b from-cyan-400 via-cyan-500 to-teal-500 text-white transition-transform duration-300 z-50",
        "lg:relative lg:translate-x-0",
        "fixed inset-y-0 left-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close button for mobile */}
        <div className="lg:hidden absolute top-4 right-4">
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

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
                {isMounted && user?.name ? user.name : t('common.client', { defaultValue: 'Client' })}
              </p>
              <p className="text-cyan-100 text-sm font-medium">
                {isMounted && (user?.role) ? user.role : t('common.client', { defaultValue: 'Client' })}
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
                <span className="font-medium">{t('nav.logout')}</span>
              </button>
            </li>
             {/* Language Selector */}
            <li className="pt-2">
              <LanguageSelector variant="minimal" />
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/clientdashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
              <Logo className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">UHelp</h1>
          </Link>
          <LanguageSelector variant="icon-only" />
        </div>

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