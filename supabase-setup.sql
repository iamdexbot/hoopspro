-- =====================================================
-- HOOPS PRO — SUPABASE DATABASE SETUP
-- Run in: supabase.com → SQL Editor → New Query
-- Safe to re-run. Drops and recreates cleanly.
-- =====================================================


-- ── 1. PROFILES ──────────────────────────────────────

DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);


-- ── 2. AUTO-CREATE PROFILE ON SIGNUP ─────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── 3. GAME STATE ─────────────────────────────────────

DROP TABLE IF EXISTS game_state CASCADE;

CREATE TABLE game_state (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_state_all" ON game_state FOR ALL USING (auth.uid() = user_id);


-- ── 4. PRO DATA (roster · stats · standings · history) ─

DROP TABLE IF EXISTS pro_data CASCADE;

CREATE TABLE pro_data (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data_key   TEXT NOT NULL,
  data_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, data_key)
);

ALTER TABLE pro_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_data_all" ON pro_data FOR ALL USING (auth.uid() = user_id);


-- ── 5. UPCOMING / SCHEDULED GAMES ────────────────────

DROP TABLE IF EXISTS upcoming_games CASCADE;

CREATE TABLE upcoming_games (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  games      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE upcoming_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upcoming_games_all" ON upcoming_games FOR ALL USING (auth.uid() = user_id);


-- =====================================================
-- DONE. All tables created with Row Level Security.
-- Each user can only access their own data.
-- =====================================================
