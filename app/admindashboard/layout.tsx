'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Search,
  LayoutDashboard,
  User,
  Ticket,
  Trash2,
  Users,
  MessageCircle,
  BarChart3,
  LogOut,
  Download,
  Plus,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/Context'
import LanguageSelector from '@/components/LanguageSelector'
import toast from 'react-hot-toast'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAppContext()
  const { t } = useTranslation()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setSearchTerm('')
  }, [pathname])

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, href: '/admindashboard', exact: true },
    { id: 'profile', label: t('nav.profile'), icon: User, href: '/admindashboard/profile' },
    { id: 'global-tickets', label: t('nav.globalTickets'), icon: Ticket, href: '/admindashboard/globaltickets' },
    { id: 'trashed-tickets', label: t('nav.trashedTickets'), icon: Trash2, href: '/admindashboard/trashedtickets' },
    { id: 'users', label: t('nav.users'), icon: Users, href: '/admindashboard/users' },
    { id: 'live-chat', label: t('nav.liveChat'), icon: MessageCircle, href: '/admindashboard/livechat' },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3, href: '/admindashboard/reports' },
  ]

  const isActiveRoute = (href: string, exact = false) => {
    if (!pathname) return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const isUsersPage = pathname === '/admindashboard/users'
  const isGlobalTickets = pathname === '/admindashboard/globaltickets'
  const isTrashedTickets = pathname === '/admindashboard/trashedtickets'

  const getHeaderContent = () => {
    const userName = isMounted && user?.name ? user.name : 'Admin'
    switch (pathname) {
      case '/admindashboard':
        return { title: t('dashboard.welcome', { name: userName }), subtitle: t('dashboard.subtitle'), showSearch: false, searchPlaceholder: t('dashboard.searchTickets') }
      case '/admindashboard/profile':
        return { title: t('profile.profileSettings'), subtitle: t('profile.personalInfo'), showSearch: false, searchPlaceholder: '' }
      case '/admindashboard/globaltickets':
        return { title: t('nav.globalTickets'), subtitle: t('tickets.viewAndManage'), showSearch: true, searchPlaceholder: t('dashboard.searchTickets') }
      case '/admindashboard/trashedtickets':
        return { title: t('nav.trashedTickets'), subtitle: t('dashboard.viewAll'), showSearch: false, searchPlaceholder: '' }
      case '/admindashboard/users':
        return { title: t('users.userManagement'), subtitle: t('users.manageUsers'), showSearch: false, searchPlaceholder: ''}
      case '/admindashboard/livechat':
        return { title: t('nav.liveChat'), subtitle: t('chat.monitorAndJoin'),  showSearch: false, searchPlaceholder: ''}
      case '/admindashboard/reports':
        return { title: t('nav.reports'), subtitle: t('reports.viewMetrics'),  showSearch: false, searchPlaceholder: '' }
      default:
        return { title: t('dashboard.welcome', { name: userName }), subtitle: t('dashboard.subtitle'), showSearch: true, searchPlaceholder: t('actions.search') }
    }
  }

  const headerContent = getHeaderContent()

  const handleHeaderSearchChange = (value: string) => {
    setSearchTerm(value)
    if (isGlobalTickets && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalTicketsSearch', { detail: { term: value } }))
    }
  }

const handleExportClick = async () => {
  if (!isUsersPage) {
    router.push('/admindashboard/users');
    return;
  }

  try {
    // Remplace par ton URL d'API Laravel
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/users/export`;

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Erreur HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;

    // Nom du fichier depuis la réponse ou par défaut
    const contentDisposition = res.headers.get('Content-Disposition');
    let fileName = 'users_export.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match && match[1]) fileName = match[1];
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success(t('notifications.exportSuccess', { defaultValue: 'Export terminé !' }));

  } catch (err) {
    console.error(err);
    toast.error(t('notifications.exportError', { defaultValue: 'Erreur lors de l\u2019export' }));
  }
};


  const handleAutoCleanOld = () => {
    if (isTrashedTickets && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trashedTicketsAutoClean'))
      toast.success('Auto-clean lancé…')
      return
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-gradient-to-b from-cyan-400 to-cyan-500 text-white transition-transform duration-300 z-50",
        "lg:relative lg:translate-x-0",
        "fixed inset-y-0 left-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close button for mobile */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 border-b border-cyan-300">
          <Link href="/admindashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-cyan-500" />
            </div>
            <h1 className="text-xl font-bold">UHelp</h1>
          </Link>
        </div>

        <div className="p-6 border-b border-cyan-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden">
              <img
                src={
                  isMounted && (user?.avatar || user?.profile_photo_url)
                    ? (user.avatar || user.profile_photo_url)
                    : "https://images.unsplash.com/photo-1494790108755-2616b75c7e90?w=150&h=150&fit=crop&crop=face"
                }
                alt={isMounted && user?.name ? user.name : 'User avatar'}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold">{isMounted && user?.name ? user.name : 'Admin'}</p>
              <p className="text-cyan-100 text-sm">{isMounted && (user?.role || (user?.roles && user.roles[0]?.name)) ? (user.role ?? user.roles[0].name) : 'Admin'}</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href, item.exact)
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive ? "bg-white bg-opacity-20 text-white font-medium" : "text-cyan-100 hover:bg-white hover:bg-opacity-10"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-cyan-100 hover:bg-white hover:bg-opacity-10">
                <LogOut className="w-5 h-5" />
                {t('nav.logout')}
              </button>
            </li>
          </ul>
          
          {/* Language Selector in Sidebar */}
          <div className="mt-4 px-4">
            <LanguageSelector 
              variant="minimal" 
              className="w-full justify-between bg-white bg-opacity-10 border-cyan-300 text-white hover:bg-opacity-20" 
            />
          </div>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/admindashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">UHelp</h1>
          </Link>
          <LanguageSelector variant="icon-only" />
        </div>

        <header className="bg-white shadow-sm p-4 sm:p-6 border-b">
          {isUsersPage ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('nav.users')}</h1>
                  <p className="text-sm sm:text-base text-gray-600">{t('users.manageUsers')}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <button
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    onClick={handleExportClick}
                  >
                    <Download className="w-4 h-4" />
                    {t('actions.export')}
                  </button>
                  <button
                    onClick={() => router.push('/admindashboard/users/new')}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('actions.addUser')}</span>
                    <span className="sm:hidden">{t('actions.add')}</span>
                  </button>
                </div>
              </div>
            </div>
            ) : pathname === '/admindashboard/livechat' ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('nav.liveChat')}</h1>
                  <p className="text-sm sm:text-base text-gray-600">{t('chat.monitorAndJoin')}</p>
                </div>
                <div>
                  <button
                    onClick={() => window.location.href = '/admindashboard/livechat/create'}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('actions.newConversation')}</span>
                    <span className="sm:hidden">{t('actions.new')}</span>
                  </button>
                </div>
              </div>

          ) : isGlobalTickets ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('nav.globalTickets')}</h1>
                <p className="text-sm sm:text-base text-gray-600">{t('tickets.viewAndManage')}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button onClick={handleExportClick} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  <Download className="w-4 h-4" />
                  {t('actions.export')}
                </button>
                <button onClick={() => router.push('/admindashboard/tickets/new')} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('actions.newTicket')}</span>
                  <span className="sm:hidden">{t('actions.new')}</span>
                </button>
              </div>
            </div>
          ) : isTrashedTickets ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('nav.trashedTickets')}</h1>
                <p className="text-sm sm:text-base text-gray-600">{t('dashboard.viewAll')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleAutoCleanOld} 
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('actions.autoClean', { defaultValue: 'Auto-Clean Old' })}</span>
                  <span className="sm:hidden">{t('actions.clean', { defaultValue: 'Clean' })}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{headerContent.title}</h2>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">{headerContent.subtitle}</p>
              </div>
              {headerContent.showSearch && (
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={headerContent.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleHeaderSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              )}
            </div>
          )}
        </header>

        <main key={pathname} className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
