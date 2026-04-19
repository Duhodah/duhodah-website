-- ============================================================
-- SUGLASNOSTI — tablica za pohranu suglasnosti na disclaimer
-- Pokreni u Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS suglasnosti (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  ime_prezime   TEXT        NOT NULL,
  email         TEXT,
  tip_proizvoda TEXT,        -- 'pretplata_online_35' | 'autoskola_hod' | 'event:{uuid}' ...
  stripe_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: svako može dodati svoju suglasnost
ALTER TABLE suglasnosti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suglasnosti_insert_anyone"
  ON suglasnosti FOR INSERT
  WITH CHECK (true);

-- Prijavljeni korisnik vidi samo svoje
CREATE POLICY "suglasnosti_select_own"
  ON suglasnosti FOR SELECT
  USING (user_id = auth.uid());

-- Index za brze upite po korisniku
CREATE INDEX IF NOT EXISTS suglasnosti_user_id_idx ON suglasnosti (user_id);
CREATE INDEX IF NOT EXISTS suglasnosti_created_at_idx ON suglasnosti (created_at DESC);
