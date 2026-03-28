-- 1. Migration for Existing Users
-- This will copy all existing users from auth.users to public.profiles
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Usuário') as full_name,
  email,
  COALESCE(raw_user_meta_data->>'role', 'user') as role,
  created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = COALESCE(EXCLUDED.role, profiles.role, 'user');

-- 2. Automatic Sync Trigger
-- This function will be called every time a new user signs up
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
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger
-- First, drop if exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
