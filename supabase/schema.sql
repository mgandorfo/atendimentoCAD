-- =============================================
-- CAD Atendimento - Schema Supabase / PostgreSQL
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- 1. Tabela de Perfis (extende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  matricula TEXT,
  role TEXT NOT NULL DEFAULT 'entrevistador' CHECK (role IN ('admin', 'entrevistador', 'recepcionista', 'externo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Setores
CREATE TABLE IF NOT EXISTS public.setores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Status de Atendimento
CREATE TABLE IF NOT EXISTS public.status_atendimento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6B7280',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Beneficiários
CREATE TABLE IF NOT EXISTS public.beneficiarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  telefone TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT DEFAULT 'PA',
  cep TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Atendimentos
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE RESTRICT,
  servidor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES public.status_atendimento(id) ON DELETE RESTRICT,
  data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Triggers para updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER beneficiarios_updated_at
  BEFORE UPDATE ON public.beneficiarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER atendimentos_updated_at
  BEFORE UPDATE ON public.atendimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Trigger para criar profile automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'entrevistador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Helper function para verificar se é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: profiles
CREATE POLICY "Usuários veem seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR can_see_all_profiles());

CREATE POLICY "Admin gerencia perfis"
  ON public.profiles FOR ALL
  USING (is_admin());

CREATE POLICY "Usuário atualiza próprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Policies: setores (leitura para todos autenticados, escrita só admin)
CREATE POLICY "Leitura setores autenticados"
  ON public.setores FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Admin gerencia setores"
  ON public.setores FOR ALL
  USING (is_admin());

-- Policies: servicos
CREATE POLICY "Leitura servicos autenticados"
  ON public.servicos FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Admin gerencia servicos"
  ON public.servicos FOR ALL
  USING (is_admin());

-- Policies: status_atendimento
CREATE POLICY "Leitura status autenticados"
  ON public.status_atendimento FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Admin gerencia status"
  ON public.status_atendimento FOR ALL
  USING (is_admin());

-- Policies: beneficiarios (todos autenticados podem criar/editar)
CREATE POLICY "Leitura beneficiarios autenticados"
  ON public.beneficiarios FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "Inserção beneficiarios autenticados"
  ON public.beneficiarios FOR INSERT
  TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Atualização beneficiarios autenticados"
  ON public.beneficiarios FOR UPDATE
  TO authenticated USING (TRUE);

CREATE POLICY "Admin deleta beneficiarios"
  ON public.beneficiarios FOR DELETE
  USING (is_admin());

-- Helper: roles que veem todos os atendimentos
CREATE OR REPLACE FUNCTION can_see_all_atendimentos()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'externo', 'recepcionista')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: roles que veem todos os perfis
CREATE OR REPLACE FUNCTION can_see_all_profiles()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'externo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: atendimentos (entrevistador vê os próprios, admin/recepcionista/externo vê todos)
CREATE POLICY "Atendimentos select"
  ON public.atendimentos FOR SELECT
  USING (servidor_id = auth.uid() OR can_see_all_atendimentos());

CREATE POLICY "Servidor cria atendimento"
  ON public.atendimentos FOR INSERT
  TO authenticated WITH CHECK (servidor_id = auth.uid() OR is_admin());

CREATE POLICY "Servidor edita próprios atendimentos"
  ON public.atendimentos FOR UPDATE
  USING (servidor_id = auth.uid() OR is_admin());

CREATE POLICY "Admin deleta atendimentos"
  ON public.atendimentos FOR DELETE
  USING (is_admin());

-- =============================================
-- Dados iniciais
-- =============================================

INSERT INTO public.setores (nome, descricao) VALUES
  ('Cadastro Único', 'Cadastro e manutenção do CadÚnico'),
  ('Bolsa Família', 'Serviços relacionados ao Bolsa Família'),
  ('BPC/LOAS', 'Benefício de Prestação Continuada'),
  ('Habitação', 'Programas habitacionais'),
  ('Assistência Social', 'Serviços gerais de assistência social')
ON CONFLICT DO NOTHING;

INSERT INTO public.status_atendimento (nome, cor, ordem) VALUES
  ('Em Andamento', '#F59E0B', 1),
  ('Concluído', '#10B981', 2),
  ('Pendente', '#6B7280', 3),
  ('Cancelado', '#EF4444', 4),
  ('Aguardando Documentos', '#3B82F6', 5)
ON CONFLICT DO NOTHING;
