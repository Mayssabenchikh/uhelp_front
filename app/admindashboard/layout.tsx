'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/Context'
import toast from 'react-hot-toast'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAppContext()

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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admindashboard', exact: true },
    { id: 'profile', label: 'Profile', icon: User, href: '/admindashboard/profile' },
    { id: 'global-tickets', label: 'Global Tickets', icon: Ticket, href: '/admindashboard/globaltickets' },
    { id: 'trashed-tickets', label: 'Trashed Tickets', icon: Trash2, href: '/admindashboard/trashedtickets' },
    { id: 'users', label: 'Users', icon: Users, href: '/admindashboard/users' },
    { id: 'live-chat', label: 'Live Chat', icon: MessageCircle, href: '/admindashboard/livechat' },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: '/admindashboard/reports' },
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
        return { title: `Welcome back, ${userName}!`, subtitle: "Here's what's happening with your helpdesk today.", showSearch: false, searchPlaceholder: 'Search tickets, users...' }
      case '/admindashboard/profile':
        return { title: `Profile Settings`, subtitle: 'Manage your personal information and account settings.', showSearch: false, searchPlaceholder: '' }
      case '/admindashboard/globaltickets':
        return { title: `All Tickets`, subtitle: 'View and manage all support tickets in the system.', showSearch: true, searchPlaceholder: 'Search tickets by ID, customer, subject...' }
      case '/admindashboard/trashedtickets':
        return { title: `Trashed Tickets`, subtitle: 'Manage deleted tickets - restore or permanently remove', showSearch: false, searchPlaceholder: '' }
      case '/admindashboard/users':
        return { title: `User Management`, subtitle: 'Manage user accounts, roles and permissions.', showSearch: false, searchPlaceholder: ''}
      case '/admindashboard/livechat':
        return { title: `Live Chat`, subtitle: 'Monitor and join active customer conversations.',  showSearch: false, searchPlaceholder: ''}
      case '/admindashboard/livechat':
      case '/admindashboard/reports':
        return { title: `Analytics & Reports`, subtitle: 'View detailed reports and performance metrics.', showSearch: true, searchPlaceholder: 'Search reports...' }
      default:
        return { title: `Welcome back, ${userName}!`, subtitle: "Here's what's happening with your helpdesk today.", showSearch: true, searchPlaceholder: 'Search...' }
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

    toast.success('Export terminé !');

  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de l’export');
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
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-cyan-400 to-cyan-500 text-white">
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
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 ">
        <header className="bg-white shadow-sm p-6 border-b">
          {isUsersPage ? (
            <div>
              <div className="flex items-center justify-between ">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                  <p className="text-gray-600">Manage system users, roles, and permissions</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    onClick={handleExportClick}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() => router.push('/admindashboard/users/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                  >
                    <Plus className="w-4 h-4" />
                    Add User
                  </button>
                </div>
              </div>
            </div>
          ) : isGlobalTickets ? (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Global Tickets</h1>
                <p className="text-gray-600">Manage all support tickets across your organization</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleExportClick} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button onClick={() => router.push('/admindashboard/tickets/new')} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
                  <Plus className="w-4 h-4" />
                  New Ticket
                </button>
              </div>
            </div>
          ) : isTrashedTickets ? (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trashed Tickets</h1>
                <p className="text-gray-600">Manage deleted tickets - restore or permanently remove</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleAutoCleanOld} 
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Auto-Clean Old
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{headerContent.title}</h2>
                <p className="text-gray-600 mt-1">{headerContent.subtitle}</p>
              </div>
              {headerContent.showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={headerContent.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleHeaderSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              )}
            </div>
          )}
        </header>

        <main key={pathname} className="p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
