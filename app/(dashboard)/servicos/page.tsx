'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Servico, Setor } from '@/lib/types'
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

export default function ServicosPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Servico | null>(null)
  const [deleting, setDeleting] = useState<Servico | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', setor_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) { router.push('/dashboard'); return }
    fetchData()
  }, [isAdmin])

  async function fetchData() {
    setLoading(true)
    const [{ data: sv }, { data: st }] = await Promise.all([
      supabase.from('servicos').select('*, setor:setores(id, nome)').order('nome'),
      supabase.from('setores').select('*').eq('ativo', true).order('nome'),
    ])
    setServicos((sv as any[]) ?? [])
    setSetores(st ?? [])
    setLoading(false)
  }

  function openEdit(s: Servico) {
    setEditing(s)
    setForm({ nome: s.nome, descricao: s.descricao ?? '', setor_id: s.setor_id ?? '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm({ nome: '', descricao: '', setor_id: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { nome: form.nome, descricao: form.descricao || null, setor_id: form.setor_id || null }
    try {
      if (editing) {
        const { error } = await supabase.from('servicos').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Serviço atualizado!')
      } else {
        const { error } = await supabase.from('servicos').insert(payload)
        if (error) throw error
        toast.success('Serviço criado!')
      }
      closeForm()
      fetchData()
    } catch {
      toast.error('Erro ao salvar serviço')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(s: Servico) {
    await supabase.from('servicos').update({ ativo: !s.ativo }).eq('id', s.id)
    fetchData()
  }

  async function handleDelete() {
    if (!deleting) return
    const { error } = await supabase.from('servicos').delete().eq('id', deleting.id)
    if (error) toast.error('Erro ao excluir serviço (pode ter vínculos)')
    else { toast.success('Serviço excluído'); fetchData() }
    setDeleting(null)
  }

  return (
    <div>
      <Header title="Serviços" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{servicos.length} serviço{servicos.length !== 1 ? 's' : ''} cadastrado{servicos.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-brand-green hover:bg-brand-dark">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Serviço
          </Button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Nome</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Setor</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Descrição</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-green mx-auto" />
                </TableCell></TableRow>
              ) : servicos.map(s => (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">{s.nome}</TableCell>
                  <TableCell className="text-sm text-gray-500 hidden md:table-cell">
                    {(s.setor as any)?.nome ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 hidden lg:table-cell">{s.descricao || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? 'default' : 'secondary'} className={s.ativo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                      {s.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAtivo(s)}>
                        {s.ativo ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Setor</Label>
              <Select value={form.setor_id} onValueChange={v => setForm(f => ({ ...f, setor_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-brand-green hover:bg-brand-dark" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : (editing ? 'Atualizar' : 'Criar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>Excluir <strong>{deleting?.nome}</strong>?</AlertDialogDescription>
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
