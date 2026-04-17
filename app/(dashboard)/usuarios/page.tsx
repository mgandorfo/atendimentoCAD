'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Profile } from '@/lib/types'
import { Plus, Pencil, Loader2, Shield, User as UserIcon, UserCheck, Eye } from 'lucide-react'
import { toast } from 'sonner'

export default function UsuariosPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', matricula: '', role: 'entrevistador' as 'admin' | 'entrevistador' | 'recepcionista' | 'externo' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) { router.push('/dashboard'); return }
    fetchUsers()
  }, [isAdmin])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data ?? [])
    setLoading(false)
  }

  function openEdit(u: Profile) {
    setEditing(u)
    setForm({ email: '', password: '', full_name: u.full_name, matricula: u.matricula ?? '', role: u.role })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm({ email: '', password: '', full_name: '', matricula: '', role: 'entrevistador' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        // Update profile fields
        const { error } = await supabase.from('profiles').update({
          full_name: form.full_name,
          matricula: form.matricula || null,
          role: form.role,
        }).eq('id', editing.id)
        if (error) throw error
        toast.success('Usuário atualizado!')
      } else {
        // Chama API Route server-side (usa service role key com segurança)
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            matricula: form.matricula,
            role: form.role,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error ?? 'Erro ao criar usuário')
        toast.success('Usuário criado com sucesso!')
      }
      closeForm()
      fetchUsers()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="Usuários" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-brand-green hover:bg-brand-dark">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Usuário
          </Button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Nome</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden md:table-cell">Matrícula</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase">Perfil</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase hidden lg:table-cell">Cadastrado em</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-green mx-auto" />
                </TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 uppercase">
                        {u.full_name.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{u.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 hidden md:table-cell">{u.matricula || '—'}</TableCell>
                  <TableCell>
                    {u.role === 'admin' && <Badge className="bg-violet-100 text-violet-700 border-violet-200"><Shield className="w-3 h-3 mr-1" />Administrador</Badge>}
                    {u.role === 'entrevistador' && <Badge className="bg-blue-100 text-blue-700 border-blue-200"><UserIcon className="w-3 h-3 mr-1" />Entrevistador</Badge>}
                    {u.role === 'recepcionista' && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><UserCheck className="w-3 h-3 mr-1" />Recepcionista</Badge>}
                    {u.role === 'externo' && <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Eye className="w-3 h-3 mr-1" />Externo</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Nome do servidor" />
            </div>
            <div className="space-y-1.5">
              <Label>Matrícula</Label>
              <Input value={form.matricula} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} placeholder="Nº de matrícula" />
            </div>
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="email@prefeitura.gov.br" />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha temporária *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Mínimo 6 caracteres" minLength={6} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Perfil *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrevistador">Entrevistador</SelectItem>
                  <SelectItem value="recepcionista">Recepcionista</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  )
}
