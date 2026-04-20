-- =============================================
-- Migração: Fila de Atendimento
-- Execute no SQL Editor do Supabase
-- =============================================

-- 1. Adicionar campo prioritario em beneficiarios
ALTER TABLE public.beneficiarios
  ADD COLUMN IF NOT EXISTS prioritario BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tornar servidor_id nullable em atendimentos
--    (recepcionista cria sem servidor designado)
ALTER TABLE public.atendimentos
  ALTER COLUMN servidor_id DROP NOT NULL;

-- 3. Inserir novos status
INSERT INTO public.status_atendimento (nome, cor, ordem) VALUES
  ('Aguardando',     '#6366F1', 0),
  ('Em Atendimento', '#00883A', 1)
ON CONFLICT DO NOTHING;

-- Reordenar status existentes
UPDATE public.status_atendimento SET ordem = 2 WHERE nome = 'Em Andamento';
UPDATE public.status_atendimento SET ordem = 3 WHERE nome = 'Concluído';
UPDATE public.status_atendimento SET ordem = 4 WHERE nome = 'Pendente';
UPDATE public.status_atendimento SET ordem = 5 WHERE nome = 'Cancelado';
UPDATE public.status_atendimento SET ordem = 6 WHERE nome = 'Aguardando Documentos';

-- 4. Função helper para recepcionista (com SET row_security = off)
CREATE OR REPLACE FUNCTION is_recepcionista()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'recepcionista'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- 5. Atualizar policy SELECT de atendimentos
--    Entrevistador agora vê: próprios + status Aguardando
DROP POLICY IF EXISTS "Atendimentos select" ON public.atendimentos;
CREATE POLICY "Atendimentos select"
  ON public.atendimentos FOR SELECT
  USING (
    servidor_id = auth.uid()
    OR can_see_all_atendimentos()
    OR EXISTS (
      SELECT 1 FROM public.status_atendimento s
      WHERE s.id = status_id AND s.nome = 'Aguardando'
    )
  );

-- 6. Atualizar policy INSERT de atendimentos
--    Recepcionista pode inserir com servidor_id NULL
DROP POLICY IF EXISTS "Servidor cria atendimento" ON public.atendimentos;
DROP POLICY IF EXISTS "Criar atendimento" ON public.atendimentos;
CREATE POLICY "Criar atendimento"
  ON public.atendimentos FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR servidor_id = auth.uid()
    OR (is_recepcionista() AND servidor_id IS NULL)
  );

-- 7. Atualizar policy UPDATE de atendimentos
--    Entrevistador pode "assumir" atendimentos com servidor_id NULL
DROP POLICY IF EXISTS "Servidor edita próprios atendimentos" ON public.atendimentos;
DROP POLICY IF EXISTS "Atualizar atendimento" ON public.atendimentos;
CREATE POLICY "Atualizar atendimento"
  ON public.atendimentos FOR UPDATE
  USING (
    servidor_id = auth.uid()
    OR servidor_id IS NULL
    OR is_admin()
  )
  WITH CHECK (
    servidor_id = auth.uid()
    OR is_admin()
  );
