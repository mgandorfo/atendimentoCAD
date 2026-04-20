-- =============================================
-- Migração: Novos tipos de usuário
-- Execute no SQL Editor do Supabase
-- =============================================

-- 0. CRÍTICO: Corrigir funções helper para evitar recursão RLS
--    Todas as funções que consultam profiles precisam de SET row_security = off
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

CREATE OR REPLACE FUNCTION can_see_all_profiles()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'externo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- 1. Remover constraint antiga
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Renomear role 'servidor' para 'entrevistador' ANTES de adicionar nova constraint
UPDATE public.profiles SET role = 'entrevistador' WHERE role = 'servidor';

-- 3. Adicionar nova constraint com os roles atualizados
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'entrevistador', 'recepcionista', 'externo'));

-- 4. Atualizar trigger de criação de usuário
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

-- 5. Função para checar quem pode ver todos os atendimentos
--    Usa SET row_security = off para evitar recursão na policy
CREATE OR REPLACE FUNCTION can_see_all_atendimentos()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role IN ('admin', 'externo', 'recepcionista');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- 6. Função RPC para externo listar perfis (bypassa RLS via row_security = off)
CREATE OR REPLACE FUNCTION get_profiles_list()
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET row_security = off
AS $$
  SELECT id, full_name FROM public.profiles ORDER BY full_name;
$$;

-- 7. Restaurar/manter política de SELECT em profiles (usa is_admin() que sabemos funcionar)
DROP POLICY IF EXISTS "Usuários veem seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários veem seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

-- 8. Atualizar política de SELECT em atendimentos
DROP POLICY IF EXISTS "Servidor vê próprios atendimentos" ON public.atendimentos;
DROP POLICY IF EXISTS "Atendimentos select" ON public.atendimentos;
CREATE POLICY "Atendimentos select"
  ON public.atendimentos FOR SELECT
  USING (servidor_id = auth.uid() OR can_see_all_atendimentos());
