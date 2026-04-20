export type UserRole = 'admin' | 'entrevistador' | 'recepcionista' | 'externo'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  matricula: string | null
  created_at: string
  updated_at: string
}

export interface Setor {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

export interface Servico {
  id: string
  nome: string
  descricao: string | null
  setor_id: string | null
  setor?: Setor
  ativo: boolean
  created_at: string
}

export interface StatusAtendimento {
  id: string
  nome: string
  cor: string
  ordem: number
  created_at: string
}

export interface Beneficiario {
  id: string
  nome: string
  cpf: string
  telefone: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  prioritario: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Atendimento {
  id: string
  beneficiario_id: string
  beneficiario?: Beneficiario
  servidor_id: string | null
  servidor?: Profile
  setor_id: string
  setor?: Setor
  servico_id: string
  servico?: Servico
  status_id: string
  status?: StatusAtendimento
  data_atendimento: string
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_atendimentos: number
  atendimentos_hoje: number
  atendimentos_mes: number
  total_beneficiarios: number
}
