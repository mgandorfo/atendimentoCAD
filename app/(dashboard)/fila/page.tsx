'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCPF } from '@/lib/format'
import {
  Star, UserPlus, RefreshCw, Loader2, Search, Clock,
  CheckCircle2, PlayCircle, FileText, CheckCheck,
  AlertCircle, FileX, ClipboardEdit,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FilaItem {
  id: string
  created_at: string
  observacoes: string | null
  servidor_id: string | null
  beneficiario: { id: string; nome: string; cpf: string; prioritario: boolean } | null
  setor: { nome: string } | null
  servico: { nome: string } | null
}

interface BeneficiarioSimples {
  id: string
  nome: string
  cpf: string
  prioritario: boolean
}

const STATUS_ENCERRAMENTO = [
  { nome: 'Concluído',             cor: '#10B981', icon: CheckCheck,   descricao: 'Atendimento finalizado com sucesso' },
  { nome: 'Pendente',              cor: '#F59E0B', icon: AlertCircle,   descricao: 'Requer ação posterior' },
  { nome: 'Aguardando Documentos', cor: '#3B82F6', icon: FileText,      descricao: 'Beneficiário precisa trazer documentos' },
  { nome: 'Cancelado',             cor: '#EF4444', icon: FileX,         descricao: 'Atendimento cancelado' },
]

export default function FilaPage() {
  const { user, isAdmin, isRecepcionista, isEntrevistador, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [fila, setFila] = useState<FilaItem[]>([])
  const [ativos, setAtivos] = useState<FilaItem[]>([])
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([])
  const [servicos, setServicos] = useState<{ id: string; nome: string; setor_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [assumindo, setAssumindo] = useState<string | null>(null)

  // Dialog Nova Chegada
  const [showNovaChegada, setShowNovaChegada] = useState(false)
  const [salvandoChegada, setSalvandoChegada] = useState(false)
  const [chegadaForm, setChegadaForm] = useState({ setor_id: '', servico_id: '', observacoes: '' })
  const [beneficiarioSearch, setBeneficiarioSearch] = useState('')
  const [beneficiarioResults, setBeneficiarioResults] = useState<BeneficiarioSimples[]>([])
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<BeneficiarioSimples | null>(null)
  const [searching, setSearching] = useState(false)

  // Dialog Gerenciar Atendimento
  const [gerenciando, setGerenciando] = useState<FilaItem | null>(null)
  const [gerenciarObs, setGerenciarObs] = useState('')
  const [gerenciarStatus, setGerenciarStatus] = useState('')
  const [salvandoGerenciar, setSalvandoGerenciar] = useState(false)

  const fetchFila = useCallback(async (silent = false) => {
    if (!statusMap['Aguardando'] || !statusMap['Em Atendimento']) return
    if (!silent) setLoading(true)
    else setRefreshing(true)

    const [{ data: filaData }, { data: ativosData }] = await Promise.all([
      supabase
        .from('atendimentos')
        .select('id, created_at, observacoes, servidor_id, beneficiario:beneficiarios(id, nome, cpf, prioritario), setor:setores(nome), servico:servicos(nome)')
        .eq('status_id', statusMap['Aguardando'])
        .order('created_at', { ascending: true }),
      supabase
        .from('atendimentos')
        .select('id, created_at, observacoes, servidor_id, beneficiario:beneficiarios(id, nome, cpf, prioritario), setor:setores(nome), servico:servicos(nome)')
        .eq('status_id', statusMap['Em Atendimento'])
        .order('created_at', { ascending: true }),
    ])

    const sorted = ((filaData ?? []) as unknown as FilaItem[]).sort((a, b) => {
      const aPrio = a.beneficiario?.prioritario ? 1 : 0
      const bPrio = b.beneficiario?.prioritario ? 1 : 0
      if (bPrio !== aPrio) return bPrio - aPrio
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    setFila(sorted)
    setAtivos((ativosData ?? []) as unknown as FilaItem[])
    setLoading(false)
    setRefreshing(false)
  }, [statusMap, supabase])

  useEffect(() => {
    if (authLoading) return
    async function loadInit() {
      const [{ data: statusData }, { data: profilesData }, { data: setoresData }, { data: servicosData }] = await Promise.all([
        supabase.from('status_atendimento').select('id, nome'),
        supabase.rpc('get_profiles_list'),
        supabase.from('setores').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('servicos').select('id, nome, setor_id').eq('ativo', true).order('nome'),
      ])
      const map: Record<string, string> = {}
      statusData?.forEach((s: any) => { map[s.nome] = s.id })
      setStatusMap(map)
      setProfiles(profilesData ?? [])
      setSetores(setoresData ?? [])
      setServicos(servicosData ?? [])
    }
    loadInit()
  }, [authLoading])

  useEffect(() => {
    if (!statusMap['Aguardando']) return
    fetchFila()
    const interval = setInterval(() => fetchFila(true), 30000)
    return () => clearInterval(interval)
  }, [statusMap, fetchFila])

  async function handleAssumir(atendimentoId: string) {
    if (!user) return
    setAssumindo(atendimentoId)
    const { error } = await supabase
      .from('atendimentos')
      .update({ servidor_id: user.id, status_id: statusMap['Em Atendimento'] })
      .eq('id', atendimentoId)
    if (error) toast.error('Erro ao assumir atendimento')
    else { toast.success('Atendimento assumido!'); fetchFila(true) }
    setAssumindo(null)
  }

  async function handleTogglePrioritario(beneficiarioId: string, atual: boolean) {
    const { error } = await supabase
      .from('beneficiarios')
      .update({ prioritario: !atual })
      .eq('id', beneficiarioId)
    if (error) toast.error('Erro ao atualizar prioridade')
    else {
      toast.success(atual ? 'Prioridade removida' : 'Marcado como prioritário')
      fetchFila(true)
    }
  }

  function abrirGerenciar(item: FilaItem) {
    setGerenciando(item)
    setGerenciarObs(item.observacoes ?? '')
    setGerenciarStatus('')
  }

  async function handleSalvarGerenciar() {
    if (!gerenciando) return
    if (!gerenciarStatus) { toast.error('Selecione o novo status'); return }
    setSalvandoGerenciar(true)
    const novoStatusId = statusMap[gerenciarStatus]
    const { error } = await supabase
      .from('atendimentos')
      .update({
        observacoes: gerenciarObs || null,
        status_id: novoStatusId,
      })
      .eq('id', gerenciando.id)
    if (error) {
      toast.error('Erro ao atualizar atendimento')
    } else {
      toast.success(`Atendimento ${gerenciarStatus === 'Concluído' ? 'encerrado' : 'atualizado'}!`)
      setGerenciando(null)
      fetchFila(true)
    }
    setSalvandoGerenciar(false)
  }

  async function handleSalvarObservacoes() {
    if (!gerenciando) return
    setSalvandoGerenciar(true)
    const { error } = await supabase
      .from('atendimentos')
      .update({ observacoes: gerenciarObs || null })
      .eq('id', gerenciando.id)
    if (error) toast.error('Erro ao salvar observações')
    else {
      toast.success('Observações salvas!')
      setGerenciando(prev => prev ? { ...prev, observacoes: gerenciarObs } : null)
      fetchFila(true)
    }
    setSalvandoGerenciar(false)
  }

  async function searchBeneficiarios(term: string) {
    if (!term || term.length < 2) { setBeneficiarioResults([]); return }
    setSearching(true)
    const cpfOnly = term.replace(/\D/g, '')
    let query = supabase.from('beneficiarios').select('id, nome, cpf, prioritario').limit(8)
    if (cpfOnly.length > 0) {
      query = query.or(`nome.ilike.%${term}%,cpf.ilike.%${cpfOnly}%`)
    } else {
      query = query.ilike('nome', `%${term}%`)
    }
    const { data } = await query
    setBeneficiarioResults((data ?? []) as BeneficiarioSimples[])
    setSearching(false)
  }

  async function handleNovaChegada(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBeneficiario) { toast.error('Selecione um beneficiário'); return }
    if (!chegadaForm.setor_id || !chegadaForm.servico_id) {
      toast.error('Selecione setor e serviço')
      return
    }
    setSalvandoChegada(true)
    const { error } = await supabase.from('atendimentos').insert({
      beneficiario_id: selectedBeneficiario.id,
      servidor_id: null,
      setor_id: chegadaForm.setor_id,
      servico_id: chegadaForm.servico_id,
      status_id: statusMap['Aguardando'],
      data_atendimento: new Date().toISOString().split('T')[0],
      observacoes: chegadaForm.observacoes || null,
    })
    if (error) {
      toast.error('Erro ao registrar chegada')
    } else {
      toast.success(`${selectedBeneficiario.nome} adicionado à fila!`)
      setShowNovaChegada(false)
      setSelectedBeneficiario(null)
      setBeneficiarioSearch('')
      setChegadaForm({ setor_id: '', servico_id: '', observacoes: '' })
      fetchFila(true)
    }
    setSalvandoChegada(false)
  }

  function openNovaChegada() {
    setSelectedBeneficiario(null)
    setBeneficiarioSearch('')
    setBeneficiarioResults([])
    setChegadaForm({ setor_id: '', servico_id: '', observacoes: '' })
    setShowNovaChegada(true)
  }

  const filteredServicos = chegadaForm.setor_id
    ? servicos.filter(s => s.setor_id === chegadaForm.setor_id || s.setor_id === null)
    : servicos

  const canAssumir = isEntrevistador || isAdmin
  const prioritariosCount = fila.filter(f => f.beneficiario?.prioritario).length
  // Ativos do entrevistador atual
  const meusAtivos = ativos.filter(a => a.servidor_id === user?.id)
  // Ativos de outros (visível para admin/recepcionista)
  const outrosAtivos = ativos.filter(a => a.servidor_id !== user?.id)

  if (loading && !statusMap['Aguardando']) {
    return (
      <div>
        <Header title="Fila de Atendimento" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Fila de Atendimento" />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Clock className="w-5 h-5" style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{fila.length}</p>
              <p className="text-xs text-gray-500">Aguardando</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,136,58,0.1)' }}>
              <PlayCircle className="w-5 h-5" style={{ color: '#00883A' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{ativos.length}</p>
              <p className="text-xs text-gray-500">Em Atendimento</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{prioritariosCount}</p>
              <p className="text-xs text-gray-500">Prioritários</p>
            </div>
          </div>
        </div>

        {/* Meus atendimentos ativos (entrevistador) */}
        {meusAtivos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-brand-green" />
              Meu Atendimento Atual
            </h2>
            <div className="space-y-3">
              {meusAtivos.map(item => {
                const isPrio = item.beneficiario?.prioritario ?? false
                const tempo = formatDistanceToNow(new Date(item.created_at), { addSuffix: false, locale: ptBR })
                return (
                  <div key={item.id} className="bg-white border-2 border-brand-green rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{item.beneficiario?.nome ?? '—'}</span>
                          {isPrio && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-amber-500" /> Prioritário
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <PlayCircle className="w-3 h-3" /> Em Atendimento
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatCPF(item.beneficiario?.cpf ?? '')}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">{item.setor?.nome ?? '—'}</Badge>
                          <Badge variant="outline" className="text-xs">{item.servico?.nome ?? '—'}</Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {tempo} em atendimento
                          </span>
                        </div>
                        {item.observacoes && (
                          <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 px-2 py-1 rounded">"{item.observacoes}"</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => abrirGerenciar(item)}
                        className="bg-brand-green hover:bg-brand-dark shrink-0"
                      >
                        <ClipboardEdit className="w-4 h-4 mr-1.5" />
                        Gerenciar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Fila de espera */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span>Fila de Espera</span>
              {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchFila(true)} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {(isRecepcionista || isAdmin) && (
                <Button size="sm" className="bg-brand-green hover:bg-brand-dark" onClick={openNovaChegada}>
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Nova Chegada
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            </div>
          ) : fila.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Fila vazia</p>
              <p className="text-sm text-gray-400 mt-1">Nenhum beneficiário aguardando</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fila.map((item, idx) => {
                const isPrio = item.beneficiario?.prioritario ?? false
                const tempo = formatDistanceToNow(new Date(item.created_at), { addSuffix: false, locale: ptBR })
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all ${isPrio ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isPrio ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{item.beneficiario?.nome ?? '—'}</span>
                        {isPrio && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-amber-500" /> Prioritário
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatCPF(item.beneficiario?.cpf ?? '')}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">{item.setor?.nome ?? '—'}</Badge>
                        <Badge variant="outline" className="text-xs">{item.servico?.nome ?? '—'}</Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {tempo} na fila
                        </span>
                      </div>
                      {item.observacoes && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{item.observacoes}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(isRecepcionista || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleTogglePrioritario(item.beneficiario!.id, isPrio)}
                          className={`p-1.5 rounded-lg transition-colors ${isPrio ? 'text-amber-500 hover:bg-amber-100' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
                          title={isPrio ? 'Remover prioridade' : 'Marcar como prioritário'}
                        >
                          <Star className={`w-4 h-4 ${isPrio ? 'fill-amber-400' : ''}`} />
                        </button>
                      )}
                      {canAssumir && (
                        <Button
                          size="sm"
                          className="bg-brand-green hover:bg-brand-dark text-xs"
                          onClick={() => handleAssumir(item.id)}
                          disabled={assumindo === item.id}
                        >
                          {assumindo === item.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : 'Assumir'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Atendimentos de outros entrevistadores (admin/recepcionista) */}
        {(isAdmin || isRecepcionista) && outrosAtivos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-brand-green" />
              Em Atendimento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {outrosAtivos.map(item => {
                const servidorNome = profiles.find(p => p.id === item.servidor_id)?.full_name ?? 'Entrevistador'
                const isPrio = item.beneficiario?.prioritario ?? false
                return (
                  <div key={item.id} className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{item.beneficiario?.nome ?? '—'}</p>
                        <p className="text-xs text-gray-400">{formatCPF(item.beneficiario?.cpf ?? '')}</p>
                      </div>
                      {isPrio && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500">{item.setor?.nome} · {item.servico?.nome}</p>
                    <p className="text-xs font-medium mt-1" style={{ color: '#00883A' }}>
                      {servidorNome}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialog Gerenciar Atendimento */}
      <Dialog open={!!gerenciando} onOpenChange={open => !open && setGerenciando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="w-5 h-5 text-brand-green" />
              Gerenciar Atendimento
            </DialogTitle>
          </DialogHeader>

          {gerenciando && (
            <div className="space-y-5 mt-2">
              {/* Info beneficiário */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{gerenciando.beneficiario?.nome}</p>
                  {gerenciando.beneficiario?.prioritario && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{formatCPF(gerenciando.beneficiario?.cpf ?? '')}</p>
                <p className="text-xs text-gray-500">{gerenciando.setor?.nome} · {gerenciando.servico?.nome}</p>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label>Observações / Anotações</Label>
                <Textarea
                  placeholder="Registre informações sobre o atendimento, documentos solicitados, pendências..."
                  value={gerenciarObs}
                  onChange={e => setGerenciarObs(e.target.value)}
                  rows={4}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSalvarObservacoes}
                  disabled={salvandoGerenciar}
                  className="w-full"
                >
                  {salvandoGerenciar ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Salvar Observações (sem encerrar)
                </Button>
              </div>

              {/* Encerramento */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Encerrar atendimento como:</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_ENCERRAMENTO.map(s => {
                    const Icon = s.icon
                    const selected = gerenciarStatus === s.nome
                    return (
                      <button
                        key={s.nome}
                        type="button"
                        onClick={() => setGerenciarStatus(s.nome)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-all ${selected ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                        style={selected ? { borderColor: s.cor, backgroundColor: `${s.cor}12` } : {}}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-4 h-4" style={{ color: s.cor }} />
                          <span className="text-sm font-medium" style={{ color: selected ? s.cor : '#374151' }}>{s.nome}</span>
                        </div>
                        <span className="text-xs text-gray-400">{s.descricao}</span>
                      </button>
                    )
                  })}
                </div>

                <Button
                  onClick={handleSalvarGerenciar}
                  disabled={!gerenciarStatus || salvandoGerenciar}
                  className="w-full bg-brand-green hover:bg-brand-dark"
                >
                  {salvandoGerenciar
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                    : gerenciarStatus
                      ? `Encerrar como "${gerenciarStatus}"`
                      : 'Selecione um status para encerrar'
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Chegada */}
      <Dialog open={showNovaChegada} onOpenChange={setShowNovaChegada}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Chegada</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNovaChegada} className="space-y-4 mt-2">
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
                      onClick={() => {
                        setSelectedBeneficiario(b)
                        setBeneficiarioSearch(b.nome)
                        setBeneficiarioResults([])
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between text-sm border-b last:border-0"
                    >
                      <span className="font-medium flex items-center gap-2">
                        {b.nome}
                        {b.prioritario && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      </span>
                      <span className="text-gray-400 font-mono text-xs">{formatCPF(b.cpf)}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedBeneficiario && (
                <div className={`text-xs font-medium flex items-center gap-1.5 ${selectedBeneficiario.prioritario ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {selectedBeneficiario.prioritario && <Star className="w-3.5 h-3.5 fill-amber-400" />}
                  ✓ {selectedBeneficiario.nome} — {formatCPF(selectedBeneficiario.cpf)}
                  {selectedBeneficiario.prioritario && ' · PRIORITÁRIO'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Setor *</Label>
                <Select value={chegadaForm.setor_id} onValueChange={v => setChegadaForm(f => ({ ...f, setor_id: v ?? '', servico_id: '' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {setores.find(s => s.id === chegadaForm.setor_id)?.nome ?? 'Selecione'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Serviço *</Label>
                <Select value={chegadaForm.servico_id} onValueChange={v => setChegadaForm(f => ({ ...f, servico_id: v ?? '' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {filteredServicos.find(s => s.id === chegadaForm.servico_id)?.nome ?? 'Selecione'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServicos.length === 0
                      ? <div className="px-4 py-3 text-sm text-gray-400">Nenhum serviço disponível</div>
                      : filteredServicos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações relevantes..."
                value={chegadaForm.observacoes}
                onChange={e => setChegadaForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowNovaChegada(false)}>Cancelar</Button>
              <Button type="submit" className="bg-brand-green hover:bg-brand-dark" disabled={salvandoChegada}>
                {salvandoChegada
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</>
                  : <><UserPlus className="mr-2 h-4 w-4" /> Adicionar à Fila</>
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
