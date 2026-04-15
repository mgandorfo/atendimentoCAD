'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FolderOpen,
  Settings,
  BarChart3,
  UserCog,
  Building2,
  Wrench,
  ChevronRight,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/atendimentos', label: 'Atendimentos', icon: ClipboardList },
  { href: '/beneficiarios', label: 'Beneficiários', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
]

const adminItems = [
  { href: '/setores', label: 'Setores', icon: FolderOpen },
  { href: '/servicos', label: 'Serviços', icon: Wrench },
  { href: '/usuarios', label: 'Usuários', icon: UserCog },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isAdmin } = useAuth()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">CAD Atendimento</p>
          <p className="text-xs text-slate-400 mt-0.5">Cadastro Único</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Administração
              </p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User profile + Logout */}
      <div className="px-4 py-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 uppercase shrink-0">
            {profile?.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Carregando...'}</p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair do sistema
        </button>
      </div>
    </aside>
  )
}
