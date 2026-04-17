-- =============================================
-- Migração: Novos tipos de usuário
-- Execute no SQL Editor do Supabase
-- =============================================

-- 1. Remover constraint antiga
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Renomear role 'servidor' para 'entrevistador' ANTES de adicionar nova constraint
UPDATE public.profiles SET role = 'entrevistador' WHERE role = 'servidor';

-- 3. Adicionar nova constraint com os roles atualizados
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'entrevistador', 'recepcionista', 'externo'));

-- 3. Atualizar trigger de criação de usuário (default muda de 'servidor' para 'entrevistador')
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

-- 4. Função auxiliar: roles que podem ver todos os atendimentos
CREATE OR REPLACE FUNCTION can_see_all_atendimentos()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'externo', 'recepcionista')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função auxiliar: roles que podem ver todos os perfis
CREATE OR REPLACE FUNCTION can_see_all_profiles()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'externo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atualizar política de SELECT em profiles (externo também pode listar todos)
DROP POLICY IF EXISTS "Usuários veem seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários veem seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR can_see_all_profiles());

-- 7. Atualizar política de SELECT em atendimentos
DROP POLICY IF EXISTS "Servidor vê próprios atendimentos" ON public.atendimentos;
CREATE POLICY "Atendimentos select"
  ON public.atendimentos FOR SELECT
  USING (servidor_id = auth.uid() OR can_see_all_atendimentos());
