'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Download, Search, Loader2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { formatCPF } from '@/lib/format'
import { toast } from 'sonner'

interface AtendimentoRow {
  id: string
  data_atendimento: string
  observacoes: string | null
  beneficiario: { nome: string; cpf: string }
  servidor: { full_name: string }
  setor: { nome: string }
  servico: { nome: string }
  status: { nome: string; cor: string }
}

function getDefaultDates() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    dataInicio: `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`,
    dataFim: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  }
}

export default function RelatoriosPage() {
  const { isAdmin, isExterno, user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AtendimentoRow[]>([])
  const [searched, setSearched] = useState(false)
  const [filters, setFilters] = useState(() => ({
    ...getDefaultDates(),
    status_id: 'todos',
    setor_id: 'todos',
    servidor_id: 'todos',
  }))
  const [statusList, setStatusList] = useState<{ id: string; nome: string }[]>([])
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([])
  const [servidores, setServidores] = useState<{ id: string; full_name: string }[]>([])
  const [filtersLoaded, setFiltersLoaded] = useState(false)

  async function loadFilters() {
    if (filtersLoaded) return
    const [{ data: s }, { data: st }, { data: sv }] = await Promise.all([
      supabase.from('status_atendimento').select('id, nome').order('ordem'),
      supabase.from('setores').select('id, nome').order('nome'),
      isAdmin
        ? supabase.from('profiles').select('id, full_name').order('full_name')
        : isExterno
          ? supabase.rpc('get_profiles_list')
          : Promise.resolve({ data: [] }),
    ])
    setStatusList(s ?? [])
    setSetores(st ?? [])
    setServidores((sv as any[]) ?? [])
    setFiltersLoaded(true)
  }

  async function handleSearch() {
    await loadFilters()
    setLoading(true)
    let query = supabase
      .from('atendimentos')
      .select(`
        id, data_atendimento, observacoes, servidor_id,
        beneficiario:beneficiarios(nome, cpf),
        setor:setores(nome),
        servico:servicos(nome),
        status:status_atendimento(nome, cor)
      `)
      .gte('data_atendimento', filters.dataInicio)
      .lte('data_atendimento', filters.dataFim)
      .order('data_atendimento', { ascending: false })

    if (!isAdmin && !isExterno) query = query.eq('servidor_id', user?.id)
    else if (filters.servidor_id !== 'todos') query = query.eq('servidor_id', filters.servidor_id)

    if (filters.status_id !== 'todos') query = query.eq('status_id', filters.status_id)
    if (filters.setor_id !== 'todos') query = query.eq('setor_id', filters.setor_id)

    const { data, error } = await query
    if (error) toast.error('Erro ao buscar dados')
    else setResults((data as any[]) ?? [])
    setSearched(true)
    setLoading(false)
  }

  function exportCSV() {
    if (!results.length) return
    const header = ['Data', 'Beneficiário', 'CPF', 'Setor', 'Serviço', 'Servidor', 'Status', 'Observações']
    const rows = results.map(a => [
      format(new Date(a.data_atendimento + 'T12:00:00'), 'dd/MM/yyyy'),
      a.beneficiario?.nome ?? '',
      formatCPF(a.beneficiario?.cpf ?? ''),
      a.setor?.nome ?? '',
      a.servico?.nome ?? '',
      servidores.find(s => s.id === (a as any).servidor_id)?.full_name ?? '',
      a.status?.nome ?? '',
      (a.observacoes ?? '').replace(/[\n\r,]/g, ' '),
    ])
    const csv = [header, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_atendimentos_${filters.dataInicio}_${filters.dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${results.length} registros exportados`)
  }

  return (
    <div>
      <Header title="Relatórios" />
      <div className="p-6 space-y-6">
        {/* Filtros */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Filtros do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Data Início</Label>
                <Input type="date" value={filters.dataInicio} onChange={e => setFilters(f => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim</Label>
                <Input type="date" value={filters.dataFim} onChange={e => setFilters(f => ({ ...f, dataFim: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Select value={filters.setor_id} onValueChange={v => setFilters(f => ({ ...f, setor_id: v ?? 'todos' }))} onOpenChange={() => loadFilters()}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Setores</SelectItem>
                    {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filters.status_id} onValueChange={v => setFilters(f => ({ ...f, status_id: v ?? 'todos' }))} onOpenChange={() => loadFilters()}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    {statusList.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(isAdmin || isExterno) && (
                <div className="space-y-1.5">
                  <Label>Servidor</Label>
                  <Select value={filters.servidor_id} onValueChange={v => setFilters(f => ({ ...f, servidor_id: v ?? 'todos' }))} onOpenChange={() => loadFilters()}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Servidores</SelectItem>
                      {servidores.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <Button onClick={handleSearch} className="bg-brand-green hover:bg-brand-dark" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Buscando...</> : <><Search className="mr-2 h-4 w-4" />Gerar Relatório</>}
              </Button>
              {results.length > 0 && (
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV ({results.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {results.length} registro{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase">Data</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase">Beneficiário</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden sm:table-cell">CPF</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Serviço</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Setor</TableHead>
                    {(isAdmin || isExterno) && <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden xl:table-cell">Servidor</TableHead>}
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(isAdmin || isExterno) ? 7 : 6} className="text-center py-10 text-gray-400 text-sm">
                        Nenhum atendimento encontrado para os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : results.map(a => (
                    <TableRow key={a.id} className="hover:bg-gray-50 text-sm">
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {format(new Date(a.data_atendimento + 'T12:00:00'), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{a.beneficiario?.nome}</TableCell>
                      <TableCell className="text-gray-500 font-mono hidden sm:table-cell">{formatCPF(a.beneficiario?.cpf ?? '')}</TableCell>
                      <TableCell className="text-gray-600 hidden md:table-cell">{a.servico?.nome}</TableCell>
                      <TableCell className="text-gray-600 hidden lg:table-cell">{a.setor?.nome}</TableCell>
                      {(isAdmin || isExterno) && <TableCell className="text-gray-600 hidden xl:table-cell">{servidores.find(s => s.id === (a as any).servidor_id)?.full_name ?? '—'}</TableCell>}
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: `${a.status?.cor}20`, color: a.status?.cor, borderColor: `${a.status?.cor}40` }}
                          className="text-xs font-medium border"
                        >
                          {a.status?.nome}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
