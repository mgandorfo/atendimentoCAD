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
import type { Setor } from '@/lib/types'
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

export default function SetoresPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Setor | null>(null)
  const [deleting, setDeleting] = useState<Setor | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) { router.push('/dashboard'); return }
    fetchSetores()
  }, [isAdmin])

  async function fetchSetores() {
    setLoading(true)
    const { data } = await supabase.from('setores').select('*').order('nome')
    setSetores(data ?? [])
    setLoading(false)
  }

  function openEdit(s: Setor) {
    setEditing(s)
    setForm({ nome: s.nome, descricao: s.descricao ?? '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm({ nome: '', descricao: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('setores').update({ nome: form.nome, descricao: form.descricao || null }).eq('id', editing.id)
        if (error) throw error
        toast.success('Setor atualizado!')
      } else {
        const { error } = await supabase.from('setores').insert({ nome: form.nome, descricao: form.descricao || null })
        if (error) throw error
        toast.success('Setor criado!')
      }
      closeForm()
      fetchSetores()
    } catch {
      toast.error('Erro ao salvar setor')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(s: Setor) {
    await supabase.from('setores').update({ ativo: !s.ativo }).eq('id', s.id)
    fetchSetores()
  }

  async function handleDelete() {
    if (!deleting) return
    const { error } = await supabase.from('setores').delete().eq('id', deleting.id)
    if (error) toast.error('Erro ao excluir setor (pode ter vínculos)')
    else { toast.success('Setor excluído'); fetchSetores() }
    setDeleting(null)
  }

  return (
    <div>
      <Header title="Setores" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{setores.length} setor{setores.length !== 1 ? 'es' : ''} cadastrado{setores.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-brand-green hover:bg-brand-dark">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Setor
          </Button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Nome</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Descrição</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-green mx-auto" />
                </TableCell></TableRow>
              ) : setores.map(s => (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-sm">{s.nome}</TableCell>
                  <TableCell className="text-sm text-gray-500 hidden md:table-cell">{s.descricao || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? 'default' : 'secondary'} className={s.ativo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                      {s.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAtivo(s)} title={s.ativo ? 'Desativar' : 'Ativar'}>
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
          <DialogHeader><DialogTitle>{editing ? 'Editar Setor' : 'Novo Setor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
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
            <AlertDialogTitle>Excluir Setor</AlertDialogTitle>
            <AlertDialogDescription>Excluir <strong>{deleting?.nome}</strong>? Isso pode falhar se houver serviços ou atendimentos vinculados.</AlertDialogDescription>
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
