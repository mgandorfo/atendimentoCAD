'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AtendimentoForm } from '@/components/atendimentos/atendimento-form'
import type { Atendimento } from '@/lib/types'
import { Plus, Search, Pencil, Trash2, Loader2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDebounce } from '@/hooks/use-debounce'

export default function AtendimentosPage() {
  const { isAdmin, user, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterSetor, setFilterSetor] = useState('todos')
  const [filterPeriodo, setFilterPeriodo] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Atendimento | null>(null)
  const [deleting, setDeleting] = useState<Atendimento | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [statusList, setStatusList] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([])
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([])
  const PAGE_SIZE = 15

  useEffect(() => {
    loadFilters()
  }, [])

  async function loadFilters() {
    const [{ data: s }, { data: st }, { data: p }] = await Promise.all([
      supabase.from('status_atendimento').select('id, nome, cor').order('ordem'),
      supabase.from('setores').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ])
    setStatusList(s ?? [])
    setSetores(st ?? [])
    setProfiles(p ?? [])
  }

  const fetchAtendimentos = useCallback(async () => {
    if (authLoading) return
    setLoading(true)
    const today = new Date()

    let query = supabase
      .from('atendimentos')
      .select(`
        id, data_atendimento, observacoes, created_at, servidor_id,
        beneficiario:beneficiarios(id, nome, cpf),
        setor:setores(id, nome),
        servico:servicos(id, nome),
        status:status_atendimento(id, nome, cor)
      `, { count: 'exact' })
      .order('data_atendimento', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (!isAdmin) query = query.eq('servidor_id', user?.id)

    if (filterStatus !== 'todos') query = query.eq('status_id', filterStatus)
    if (filterSetor !== 'todos') query = query.eq('setor_id', filterSetor)
    if (filterPeriodo === 'hoje') {
      query = query.eq('data_atendimento', format(today, 'yyyy-MM-dd'))
    } else if (filterPeriodo === 'mes') {
      const start = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
      const end = format(today, 'yyyy-MM-dd')
      query = query.gte('data_atendimento', start).lte('data_atendimento', end)
    } else if (filterPeriodo === 'semana') {
      const start = format(new Date(today.getTime() - 7 * 86400000), 'yyyy-MM-dd')
      query = query.gte('data_atendimento', start)
    }

    const { data, count, error } = await query
    if (error) {
      console.error('Erro ao buscar atendimentos:', error.message, error.code, error.details, error.hint)
    } else {
      setAtendimentos((data as any[]) ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [debouncedSearch, filterStatus, filterSetor, filterPeriodo, page, isAdmin, user, authLoading, supabase])

  useEffect(() => { fetchAtendimentos() }, [fetchAtendimentos])

  async function handleDelete() {
    if (!deleting) return
    const { error } = await supabase.from('atendimentos').delete().eq('id', deleting.id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Atendimento excluído'); fetchAtendimentos() }
    setDeleting(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <Header title="Atendimentos" />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar beneficiário..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                className="pl-9 h-9 w-52"
              />
            </div>
            <Select value={filterPeriodo} onValueChange={v => { setFilterPeriodo(v ?? 'todos'); setPage(0) }}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Últimos 7 dias</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v ?? 'todos'); setPage(0) }}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {statusList.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSetor} onValueChange={v => { setFilterSetor(v ?? 'todos'); setPage(0) }}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Setores</SelectItem>
                {setores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Atendimento
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          {total.toLocaleString('pt-BR')} atendimento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </p>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Data</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Beneficiário</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Serviço</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Setor</TableHead>
                {isAdmin && <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden xl:table-cell">Servidor</TableHead>}
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : atendimentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum atendimento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                atendimentos.map(a => (
                  <TableRow key={a.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                      {format(new Date(a.data_atendimento + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{(a.beneficiario as any)?.nome}</TableCell>
                    <TableCell className="text-sm text-gray-600 hidden md:table-cell">{(a.servico as any)?.nome}</TableCell>
                    <TableCell className="text-sm text-gray-600 hidden lg:table-cell">{(a.setor as any)?.nome}</TableCell>
                    {isAdmin && <TableCell className="text-sm text-gray-600 hidden xl:table-cell">{profiles.find(p => p.id === (a as any).servidor_id)?.full_name ?? '—'}</TableCell>}
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: `${(a.status as any)?.cor}20`, color: (a.status as any)?.cor, borderColor: `${(a.status as any)?.cor}40` }}
                        className="text-xs font-medium border"
                      >
                        {(a.status as any)?.nome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(a); setShowForm(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {(isAdmin || (a as any).servidor_id === user?.id) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(a)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Atendimento' : 'Novo Atendimento'}</DialogTitle>
          </DialogHeader>
          <AtendimentoForm
            atendimento={editing}
            onSuccess={() => { closeForm(); fetchAtendimentos() }}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma a exclusão deste atendimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
