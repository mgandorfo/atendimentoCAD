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

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'entrevistador'] },
  { href: '/atendimentos', label: 'Atendimentos', icon: ClipboardList, roles: ['admin', 'entrevistador', 'recepcionista'] },
  { href: '/beneficiarios', label: 'Beneficiários', icon: Users, roles: ['admin', 'entrevistador', 'recepcionista'] },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'entrevistador', 'externo'] },
]

const adminItems = [
  { href: '/setores', label: 'Setores', icon: FolderOpen },
  { href: '/servicos', label: 'Serviços', icon: Wrench },
  { href: '/usuarios', label: 'Usuários', icon: UserCog },
]

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  entrevistador: 'Entrevistador',
  recepcionista: 'Recepcionista',
  externo: 'Externo',
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isAdmin } = useAuth()
  const navItems = allNavItems.filter(item => item.roles.includes(profile?.role ?? ''))
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r" style={{ backgroundColor: '#005429', borderColor: '#004020' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: '#004020' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: '#00883A' }}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">CAD Atendimento</p>
          <p className="text-xs mt-0.5" style={{ color: '#7fc99a' }}>Cadastro Único</p>
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
                  ? 'border'
                  : 'hover:text-white hover:bg-white/10'
              )}
              style={active
                ? { backgroundColor: 'rgba(0,136,58,0.25)', color: '#a8f0bc', borderColor: 'rgba(0,136,58,0.4)' }
                : { color: '#7fc99a' }
              }
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
              <p className="px-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: '#5aaa78' }}>
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
                      ? 'border'
                      : 'hover:text-white hover:bg-white/10'
                  )}
                  style={active
                    ? { backgroundColor: 'rgba(0,136,58,0.25)', color: '#a8f0bc', borderColor: 'rgba(0,136,58,0.4)' }
                    : { color: '#7fc99a' }
                  }
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
      <div className="px-4 py-4 border-t space-y-3" style={{ borderColor: '#004020' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold uppercase shrink-0" style={{ backgroundColor: 'rgba(0,136,58,0.4)', color: '#a8f0bc' }}>
            {profile?.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Carregando...'}</p>
            <p className="text-xs" style={{ color: '#7fc99a' }}>{roleLabels[profile?.role ?? ''] ?? profile?.role ?? ''}</p>
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
