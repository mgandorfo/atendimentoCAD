'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { BeneficiarioForm } from '@/components/beneficiarios/beneficiario-form'
import type { Beneficiario } from '@/lib/types'
import { formatCPF, formatPhone } from '@/lib/format'
import { Plus, Search, Pencil, Trash2, Loader2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { useDebounce } from '@/hooks/use-debounce'

export default function BeneficiariosPage() {
  const { isAdmin } = useAuth()
  const supabase = createClient()
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Beneficiario | null>(null)
  const [deleting, setDeleting] = useState<Beneficiario | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 15

  const fetchBeneficiarios = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('beneficiarios')
      .select('*', { count: 'exact' })
      .order('nome')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (debouncedSearch) {
      query = query.or(`nome.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch.replace(/\D/g, '')}%`)
    }

    const { data, count, error } = await query
    if (!error) {
      setBeneficiarios(data ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [debouncedSearch, page, supabase])

  useEffect(() => { fetchBeneficiarios() }, [fetchBeneficiarios])

  async function handleDelete() {
    if (!deleting) return
    const { error } = await supabase.from('beneficiarios').delete().eq('id', deleting.id)
    if (error) {
      toast.error('Erro ao excluir beneficiário')
    } else {
      toast.success('Beneficiário excluído')
      fetchBeneficiarios()
    }
    setDeleting(null)
  }

  function openEdit(b: Beneficiario) {
    setEditing(b)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <Header title="Beneficiários" />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="pl-9 h-9"
            />
          </div>
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Beneficiário
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <UserCheck className="w-4 h-4" />
          <span>{total.toLocaleString('pt-BR')} beneficiário{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Nome</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">CPF</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Telefone</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Bairro</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Cidade</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : beneficiarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum beneficiário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                beneficiarios.map(b => (
                  <TableRow key={b.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium text-sm">{b.nome}</TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">{formatCPF(b.cpf)}</TableCell>
                    <TableCell className="text-sm text-gray-600 hidden md:table-cell">{b.telefone ? formatPhone(b.telefone) : '—'}</TableCell>
                    <TableCell className="text-sm text-gray-600 hidden lg:table-cell">{b.bairro || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-600 hidden lg:table-cell">{b.cidade || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(b)}>
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

        {/* Pagination */}
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Beneficiário' : 'Novo Beneficiário'}</DialogTitle>
          </DialogHeader>
          <BeneficiarioForm
            beneficiario={editing}
            onSuccess={() => { closeForm(); fetchBeneficiarios() }}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Beneficiário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.nome}</strong>? Esta ação não pode ser desfeita.
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
