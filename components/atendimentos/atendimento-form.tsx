'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Atendimento, Beneficiario, Setor, Servico, StatusAtendimento } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { formatCPF } from '@/lib/format'

interface Props {
  atendimento: Atendimento | null
  onSuccess: () => void
  onCancel: () => void
}

export function AtendimentoForm({ atendimento, onSuccess, onCancel }: Props) {
  const { user, isAdmin } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [setores, setSetores] = useState<Setor[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [statusList, setStatusList] = useState<StatusAtendimento[]>([])
  const [beneficiarioSearch, setBeneficiarioSearch] = useState('')
  const [beneficiarioResults, setBeneficiarioResults] = useState<Beneficiario[]>([])
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<Beneficiario | null>(null)
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState({
    setor_id: '',
    servico_id: '',
    status_id: '',
    data_atendimento: format(new Date(), 'yyyy-MM-dd'),
    observacoes: '',
  })

  useEffect(() => {
    loadOptions()
  }, [])

  useEffect(() => {
    if (atendimento) {
      setForm({
        setor_id: (atendimento.setor as any)?.id ?? atendimento.setor_id,
        servico_id: (atendimento.servico as any)?.id ?? atendimento.servico_id,
        status_id: (atendimento.status as any)?.id ?? atendimento.status_id,
        data_atendimento: atendimento.data_atendimento,
        observacoes: atendimento.observacoes ?? '',
      })
      if (atendimento.beneficiario) {
        setSelectedBeneficiario(atendimento.beneficiario as Beneficiario)
        setBeneficiarioSearch((atendimento.beneficiario as any).nome)
      }
    }
  }, [atendimento])

  async function loadOptions() {
    const [{ data: s }, { data: sv }, { data: st }] = await Promise.all([
      supabase.from('setores').select('*').eq('ativo', true).order('nome'),
      supabase.from('servicos').select('*').eq('ativo', true).order('nome'),
      supabase.from('status_atendimento').select('*').order('ordem'),
    ])
    setSetores(s ?? [])
    setServicos(sv ?? [])
    setStatusList(st ?? [])
  }

  async function searchBeneficiarios(term: string) {
    if (!term || term.length < 2) { setBeneficiarioResults([]); return }
    setSearching(true)
    const cpfOnly = term.replace(/\D/g, '')
    let query = supabase.from('beneficiarios').select('*').limit(8)
    if (cpfOnly.length > 0) {
      query = query.or(`nome.ilike.%${term}%,cpf.ilike.%${cpfOnly}%`)
    } else {
      query = query.ilike('nome', `%${term}%`)
    }
    const { data } = await query
    setBeneficiarioResults(data ?? [])
    setSearching(false)
  }

  function selectBeneficiario(b: Beneficiario) {
    setSelectedBeneficiario(b)
    setBeneficiarioSearch(b.nome)
    setBeneficiarioResults([])
  }

  const filteredServicos = form.setor_id
    ? servicos.filter(s => s.setor_id === form.setor_id || s.setor_id === null)
    : servicos

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBeneficiario) { toast.error('Selecione um beneficiário'); return }
    if (!form.setor_id || !form.servico_id || !form.status_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setLoading(true)
    const payload = {
      beneficiario_id: selectedBeneficiario.id,
      servidor_id: user?.id,
      setor_id: form.setor_id,
      servico_id: form.servico_id,
      status_id: form.status_id,
      data_atendimento: form.data_atendimento,
      observacoes: form.observacoes || null,
    }
    try {
      if (atendimento) {
        const { error } = await supabase.from('atendimentos').update(payload).eq('id', atendimento.id)
        if (error) throw error
        toast.success('Atendimento atualizado!')
      } else {
        const { error } = await supabase.from('atendimentos').insert(payload)
        if (error) throw error
        toast.success('Atendimento registrado!')
      }
      onSuccess()
    } catch {
      toast.error('Erro ao salvar atendimento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Beneficiário Search */}
      <div className="space-y-1.5">
        <Label>Beneficiário *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou CPF..."
            value={beneficiarioSearch}
            onChange={e => {
              setBeneficiarioSearch(e.target.value)
              setSelectedBeneficiario(null)
              searchBeneficiarios(e.target.value)
            }}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
        </div>
        {beneficiarioResults.length > 0 && (
          <div className="border border-gray-200 rounded-lg shadow-lg bg-white max-h-48 overflow-y-auto">
            {beneficiarioResults.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBeneficiario(b)}
                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between text-sm border-b last:border-0"
              >
                <span className="font-medium">{b.nome}</span>
                <span className="text-gray-400 font-mono text-xs">{formatCPF(b.cpf)}</span>
              </button>
            ))}
          </div>
        )}
        {selectedBeneficiario && (
          <p className="text-xs text-emerald-600 font-medium">
            ✓ {selectedBeneficiario.nome} — CPF: {formatCPF(selectedBeneficiario.cpf)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Setor */}
        <div className="space-y-1.5">
          <Label>Setor *</Label>
          <Select value={form.setor_id} onValueChange={v => setForm(f => ({ ...f, setor_id: v ?? '', servico_id: '' }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o setor">
                {setores.find(s => s.id === form.setor_id)?.nome ?? 'Selecione o setor'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Serviço */}
        <div className="space-y-1.5">
          <Label>Serviço *</Label>
          <Select value={form.servico_id} onValueChange={v => setForm(f => ({ ...f, servico_id: v ?? '' }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o serviço">
                {filteredServicos.find(s => s.id === form.servico_id)?.nome ?? 'Selecione o serviço'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredServicos.length === 0
                ? <div className="px-4 py-3 text-sm text-gray-400">Nenhum serviço disponível para este setor</div>
                : filteredServicos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)
              }
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status_id} onValueChange={v => setForm(f => ({ ...f, status_id: v ?? '' }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status">
                {statusList.find(s => s.id === form.status_id)?.nome ?? 'Selecione o status'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusList.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Data */}
        <div className="space-y-1.5">
          <Label>Data do Atendimento *</Label>
          <Input
            type="date"
            value={form.data_atendimento}
            onChange={e => setForm(f => ({ ...f, data_atendimento: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea
          placeholder="Observações sobre o atendimento..."
          value={form.observacoes}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-brand-green hover:bg-brand-dark" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : (atendimento ? 'Atualizar' : 'Registrar')}
        </Button>
      </div>
    </form>
  )
}
