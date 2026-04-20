'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Beneficiario } from '@/lib/types'
import { formatCPF, formatPhone, formatCEP } from '@/lib/format'
import { toast } from 'sonner'
import { Loader2, Star } from 'lucide-react'

interface Props {
  beneficiario: Beneficiario | null
  onSuccess: () => void
  onCancel: () => void
}

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export function BeneficiarioForm({ beneficiario, onSuccess, onCancel }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', endereco: '', numero: '',
    complemento: '', bairro: '', cidade: '', estado: 'PA', cep: '',
    prioritario: false,
  })

  useEffect(() => {
    if (beneficiario) {
      setForm({
        nome: beneficiario.nome ?? '',
        cpf: formatCPF(beneficiario.cpf ?? ''),
        telefone: beneficiario.telefone ? formatPhone(beneficiario.telefone) : '',
        endereco: beneficiario.endereco ?? '',
        numero: beneficiario.numero ?? '',
        complemento: beneficiario.complemento ?? '',
        bairro: beneficiario.bairro ?? '',
        cidade: beneficiario.cidade ?? '',
        estado: beneficiario.estado ?? 'PA',
        cep: beneficiario.cep ? formatCEP(beneficiario.cep) : '',
        prioritario: beneficiario.prioritario ?? false,
      })
    }
  }, [beneficiario])

  function handleChange(field: string, value: string) {
    let formatted = value
    if (field === 'cpf') formatted = formatCPF(value)
    if (field === 'telefone') formatted = formatPhone(value)
    if (field === 'cep') formatted = formatCEP(value)
    setForm(f => ({ ...f, [field]: formatted }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cpfClean = form.cpf.replace(/\D/g, '')
    if (cpfClean.length !== 11) {
      toast.error('CPF deve ter 11 dígitos')
      return
    }
    setLoading(true)
    const payload = {
      nome: form.nome.trim(),
      cpf: cpfClean,
      telefone: form.telefone.replace(/\D/g, '') || null,
      endereco: form.endereco || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep.replace(/\D/g, '') || null,
      prioritario: form.prioritario,
    }
    try {
      if (beneficiario) {
        const { error } = await supabase.from('beneficiarios').update(payload).eq('id', beneficiario.id)
        if (error) throw error
        toast.success('Beneficiário atualizado!')
      } else {
        const { error } = await supabase.from('beneficiarios').insert(payload)
        if (error) {
          if (error.code === '23505') toast.error('CPF já cadastrado no sistema')
          else throw error
          return
        }
        toast.success('Beneficiário cadastrado!')
      }
      onSuccess()
    } catch {
      toast.error('Erro ao salvar beneficiário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="nome">Nome completo *</Label>
          <Input id="nome" value={form.nome} onChange={e => handleChange('nome', e.target.value)} required placeholder="Nome do beneficiário" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cpf">CPF *</Label>
          <Input id="cpf" value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} required placeholder="000.000.000-00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" value={form.telefone} onChange={e => handleChange('telefone', e.target.value)} placeholder="(00) 00000-0000" />
        </div>
      </div>

      {/* Prioritário */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, prioritario: !f.prioritario }))}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.prioritario ? 'text-amber-600' : 'text-gray-400'}`}
        >
          <Star className={`w-5 h-5 ${form.prioritario ? 'fill-amber-400 text-amber-400' : ''}`} />
          Atendimento Prioritário
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          {form.prioritario ? 'Este beneficiário sempre entra na frente da fila' : 'Clique para marcar como prioritário'}
        </span>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Endereço</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="endereco">Logradouro</Label>
            <Input id="endereco" value={form.endereco} onChange={e => handleChange('endereco', e.target.value)} placeholder="Rua, Avenida..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" value={form.numero} onChange={e => handleChange('numero', e.target.value)} placeholder="Nº" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="complemento">Complemento</Label>
            <Input id="complemento" value={form.complemento} onChange={e => handleChange('complemento', e.target.value)} placeholder="Apto, Bloco..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" value={form.bairro} onChange={e => handleChange('bairro', e.target.value)} placeholder="Bairro" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" value={form.cep} onChange={e => handleChange('cep', e.target.value)} placeholder="00000-000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" value={form.cidade} onChange={e => handleChange('cidade', e.target.value)} placeholder="Cidade" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              value={form.estado}
              onChange={e => handleChange('estado', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            >
              {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-brand-green hover:bg-brand-dark" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : (beneficiario ? 'Atualizar' : 'Cadastrar')}
        </Button>
      </div>
    </form>
  )
}
