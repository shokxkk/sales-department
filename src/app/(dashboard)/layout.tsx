'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  HelpCircle,
  Building2,
  CreditCard,
  ShieldCheck,
  Activity,
  ChevronLeft,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Wifi,
  Zap,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp, useTheme, useLanguage } from '@/components/providers/app-provider'
import { NerionLogo } from '@/components/ui/nerion-logo'

import type { LucideIcon } from 'lucide-react'

interface NavItemConfig {
  href: string
  key: 'dashboard' | 'audits' | 'team' | 'problems' | 'reports' | 'settings' | 'help'
  icon: LucideIcon
  color?: string
  badge?: number
}

// Only show Dashboard, Audits, Settings, Help in sidebar
const NAV_CONFIG: NavItemConfig[] = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard, color: 'primary' },
  { href: '/audits',    key: 'audits',    icon: ClipboardList,   color: 'blue'    },
  { href: '/settings',  key: 'settings',  icon: Settings,        color: 'yellow'  },
  { href: '/help',      key: 'help',      icon: HelpCircle,      color: 'blue'    },
]

const ADMIN_NAV_ITEMS = [
  { href: '/admin/companies', key: 'companies', icon: Building2   },
  { href: '/admin/tariffs',   key: 'tariffs',   icon: CreditCard  },
  { href: '/admin/checklist', key: 'checklist', icon: ShieldCheck },
  { href: '/admin/monitor',   key: 'monitor',   icon: Activity    },
]

const COLOR_MAP: Record<string, string> = {
  primary: 'text-primary bg-primary/15 border-primary/25 shadow-[0_0_16px_var(--glow-primary-sm)]',
  blue:    'text-blue-400 bg-blue-500/15 border-blue-500/25 shadow-[0_0_16px_rgba(59,130,246,0.12)]',
  purple:  'text-purple-400 bg-purple-500/15 border-purple-500/25 shadow-[0_0_16px_rgba(168,85,247,0.12)]',
  red:     'text-red-400 bg-red-500/15 border-red-500/25 shadow-[0_0_16px_rgba(239,68,68,0.12)]',
  green:   'text-green-400 bg-green-500/15 border-green-500/25 shadow-[0_0_16px_rgba(34,197,94,0.12)]',
  yellow:  'text-yellow-400 bg-yellow-500/15 border-yellow-500/25 shadow-[0_0_16px_rgba(234,179,8,0.12)]',
}

const ICON_COLOR_MAP: Record<string, string> = {
  primary: 'text-primary',
  blue:    'text-blue-400',
  purple:  'text-purple-400',
  red:     'text-red-400',
  green:   'text-green-400',
  yellow:  'text-yellow-400',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  const [userInfo, setUserInfo] = useState<{
    name: string
    email: string
    role: string
    companyId: string | null
  } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => d.success && setUserInfo(d.user))
      .catch(() => {})
  }, [])

  const isSuperAdmin = userInfo?.role === 'SUPER_ADMIN'

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(language === 'uz' ? 'Tizimdan chiqdingiz' : 'Вы успешно вышли из системы')
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none">
      {/* Brand & Logo: NERION */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 relative overflow-hidden',
        'border-b border-[hsl(var(--sidebar-border))]'
      )}>
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <NerionLogo size={32} showText={!collapsed} />
        </Link>
      </div>

      {/* System Status Tag */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-primary/5 border border-primary/15">
            <Wifi size={11} className="text-primary animate-pulse" />
            <span className="text-[10px] text-primary/80 font-mono font-bold uppercase tracking-wider">
              {t.brand.status}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {NAV_CONFIG.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const colorClass = item.color ? ICON_COLOR_MAP[item.color] : 'text-muted-foreground'
          const activeColorClass = item.color ? COLOR_MAP[item.color] : ''
          const label = t.nav[item.key]
          const subLabel = t.nav[`${item.key}Sub` as keyof typeof t.nav]

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{ animationDelay: `${idx * 30}ms` }}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 animate-slide-in relative',
                isActive
                  ? cn('border', activeColorClass, 'nav-active-glow')
                  : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))] hover:border-border/50'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-current opacity-80" />
              )}
              <item.icon
                size={18}
                className={cn(
                  'flex-shrink-0 transition-all duration-200',
                  isActive ? colorClass : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{label}</span>
                  {!isActive && subLabel && (
                    <span className="block text-[10px] text-muted-foreground/60 font-normal leading-none mt-0.5 truncate">
                      {subLabel}
                    </span>
                  )}
                </div>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* SuperAdmin Section */}
        {isSuperAdmin && (
          <>
            <div className="py-2">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {!collapsed && (
              <p className="text-[9px] font-bold text-primary/60 uppercase tracking-[0.15em] px-3 pb-1 flex items-center gap-1.5">
                <Zap size={10} className="text-primary" />
                {t.nav.admin}
              </p>
            )}

            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all border',
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border-orange-500/20'
                      : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))]'
                  )}
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{t.nav[item.key as keyof typeof t.nav]}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User & Footer */}
      <div className="px-3 py-3 border-t border-[hsl(var(--sidebar-border))] space-y-2">
        {userInfo && !collapsed && (
          <div className="px-3 py-2 rounded-xl bg-muted/40 border border-border/40 relative overflow-hidden">
            <p className="text-xs font-bold text-foreground truncate">{userInfo.name}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{userInfo.email}</p>
            <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mt-1.5 inline-block uppercase tracking-wider">
              {userInfo.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 font-semibold"
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && t.nav.logout}
        </button>

        {!collapsed && (
          <p className="text-center text-[9px] text-muted-foreground/40 font-mono pt-1">
            {t.brand.version}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full max-w-full bg-background text-foreground flex overflow-x-hidden relative print:bg-white">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 lg:hidden print:hidden',
          'bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]',
          'transform transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10 p-1"
        >
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col relative z-30 transition-all duration-300 flex-shrink-0 print:hidden',
          'bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]',
          'scan-overlay',
          collapsed ? 'w-[64px]' : 'w-[230px]'
        )}
      >
        <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full">
          <SidebarContent />
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-full top-16 -ml-3 w-6 h-6 rounded-full bg-[hsl(var(--sidebar-bg))] border border-[hsl(var(--sidebar-border))] flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all z-40 shadow-md"
        >
          <ChevronLeft
            size={12}
            className={cn('text-muted-foreground transition-transform duration-300', collapsed && 'rotate-180')}
          />
        </button>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden relative">
        {/* Top Header */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/60 bg-card/40 backdrop-blur-xl w-full print:hidden relative">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent pointer-events-none" />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                placeholder={t.header.search}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Header Controls: Language, Theme, Live Tag, Notifications */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Language Switcher Pill: RU / UZ */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted/50 border border-border/50">
              <button
                onClick={() => setLanguage('ru')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                  language === 'ru'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Русский язык"
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('uz')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                  language === 'uz'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="O‘zbek tili"
              >
                UZ
              </button>
            </div>

            {/* Theme Toggle: Dark / Light */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all active:scale-95"
              title={theme === 'dark' ? t.header.themeLight : t.header.themeDark}
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-yellow-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon size={15} className="text-blue-500 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* AI Status tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-green-500/10 border border-green-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">
                {t.header.aiLive}
              </span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border/40">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--glow-primary)]" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <div className="p-4 sm:p-6 w-full max-w-[1700px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
