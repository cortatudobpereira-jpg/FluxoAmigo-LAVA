-- =============================================
-- FIX: Trigger que estava SOBRESCREVENDO o role
-- =============================================
-- O trigger antigo fazia: role = EXCLUDED.role
-- Isso resetava o admin para 'user' toda vez que
-- o Supabase tocava na tabela auth.users.
--
-- SOLUÇÃO: Nunca sobrescrever o role existente.
-- O role só pode ser mudado manualmente no painel
-- do Supabase ou via UPDATE direto.
-- =============================================

-- 1. Corrigir a função do trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
    -- ↑ REMOVIDO: role = EXCLUDED.role
    -- Agora o role NUNCA é sobrescrito por este trigger.
    -- Só será definido na primeira inserção (novo usuário).
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que o trigger só roda em INSERT (nunca UPDATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Opcional: Caso o trigger tenha sido configurado para UPDATE também,
--    essa linha garante que qualquer versão anterior é removida
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- 4. IMPORTANTE: Restaurar seu role de admin caso já tenha sido sobrescrito
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email de login
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'SEU_EMAIL_AQUI';
