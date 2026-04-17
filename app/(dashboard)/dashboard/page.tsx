'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  ClipboardList,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function DashboardPage() {
  const { isAdmin, isExterno, isRecepcionista, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, hoje: 0, mes: 0, beneficiarios: 0 })
  const [byServico, setByServico] = useState<{ name: string; value: number }[]>([])
  const [byStatus, setByStatus] = useState<{ name: string; value: number; cor: string }[]>([])
  const [byDay, setByDay] = useState<{ date: string; total: number }[]>([])
  const [byServidor, setByServidor] = useState<{ name: string; total: number }[]>([])

  useEffect(() => {
    if (authLoading) return
    if (isExterno) { router.replace('/relatorios'); return }
    if (isRecepcionista) { router.replace('/atendimentos'); return }
    fetchDashboardData()
  }, [authLoading, isAdmin, isExterno, isRecepcionista, user])

  async function fetchDashboardData() {
    if (!user && !isAdmin) { setLoading(false); return }
    setLoading(true)
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
    const last30 = format(subDays(today, 29), 'yyyy-MM-dd')

    let query = supabase.from('atendimentos').select(`
      id, data_atendimento, servidor_id,
      servico:servicos(nome),
      status:status_atendimento(nome, cor)
    `)

    if (!isAdmin) query = query.eq('servidor_id', user?.id)

    const { data: atendimentos } = await query

    if (atendimentos) {
      const total = atendimentos.length
      const hoje = atendimentos.filter(a => a.data_atendimento === todayStr).length
      const mes = atendimentos.filter(a => a.data_atendimento >= monthStart).length

      // By servico
      const servicoMap: Record<string, number> = {}
      atendimentos.forEach(a => {
        const name = (a.servico as any)?.nome ?? 'N/A'
        servicoMap[name] = (servicoMap[name] || 0) + 1
      })
      setByServico(Object.entries(servicoMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8))

      // By status
      const statusMap: Record<string, { count: number; cor: string }> = {}
      atendimentos.forEach(a => {
        const name = (a.status as any)?.nome ?? 'N/A'
        const cor = (a.status as any)?.cor ?? '#6B7280'
        if (!statusMap[name]) statusMap[name] = { count: 0, cor }
        statusMap[name].count++
      })
      setByStatus(Object.entries(statusMap).map(([name, { count, cor }]) => ({ name, value: count, cor })))

      // By day (last 30)
      const dayMap: Record<string, number> = {}
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(today, 29 - i), 'yyyy-MM-dd')
        dayMap[d] = 0
      }
      atendimentos.filter(a => a.data_atendimento >= last30).forEach(a => {
        dayMap[a.data_atendimento] = (dayMap[a.data_atendimento] || 0) + 1
      })
      setByDay(Object.entries(dayMap).map(([date, total]) => ({
        date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        total
      })))

      // By servidor (admin only) — busca nomes separadamente
      if (isAdmin) {
        const { data: profData } = await supabase.from('profiles').select('id, full_name')
        const profMap: Record<string, string> = {}
        profData?.forEach(p => { profMap[p.id] = p.full_name })
        const servidorMap: Record<string, number> = {}
        atendimentos.forEach(a => {
          const name = profMap[a.servidor_id] ?? 'N/A'
          servidorMap[name] = (servidorMap[name] || 0) + 1
        })
        setByServidor(Object.entries(servidorMap).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total))
      }

      setStats({ total, hoje, mes, beneficiarios: 0 })
    }

    // Total beneficiários
    const { count } = await supabase.from('beneficiarios').select('*', { count: 'exact', head: true })
    setStats(s => ({ ...s, beneficiarios: count ?? 0 }))

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const statCards = [
    { title: 'Total de Atendimentos', value: stats.total, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Atendimentos Hoje', value: stats.hoje, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Atendimentos no Mês', value: stats.mes, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Beneficiários Cadastrados', value: stats.beneficiarios, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="border border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{card.value.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Line chart - atendimentos por dia */}
          <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Atendimentos — últimos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie - por status */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {byStatus.map((entry, index) => (
                      <Cell key={index} fill={entry.cor || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className={`grid gap-4 ${isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Bar - por serviço */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Atendimentos por Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byServico} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar - por servidor (admin only) */}
          {isAdmin && byServidor.length > 0 && (
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Atendimentos por Servidor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byServidor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
