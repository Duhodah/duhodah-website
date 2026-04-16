-- ============================================================
-- DUHODAH — Supabase SQL Shema
-- ============================================================
-- UPUTE:
-- 1. Idi na https://supabase.com → tvoj projekt → SQL Editor
-- 2. Kopiraj i pokreni cijeli ovaj file
-- 3. Copiraj Project URL i anon key u js/supabase-config.js
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES — jedan red po korisniku
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  ime TEXT,
  email TEXT,
  tel TEXT,
  izvor TEXT DEFAULT 'direktno',     -- 'priručnik' | 'kviz' | 'event' | 'kontakt' | 'direktno'
  kviz_tip TEXT,                      -- 'plitki' | 'hiperventilator' | 'zadrzavac' | 'kaotican'
  "priručnik_preuzet" BOOLEAN DEFAULT FALSE,
  autoskola_zavrsena BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profil pri registraciji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, izvor)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'izvor', 'direktno')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- PRETPLATE
-- ============================================================
CREATE TABLE IF NOT EXISTS pretplate (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL,              -- 'zajednica_15' | 'zajednica_120_god'
  status TEXT DEFAULT 'active',   -- 'active' | 'cancelled' | 'expired'
  pocetak TIMESTAMPTZ DEFAULT NOW(),
  kraj TIMESTAMPTZ,                -- NULL = aktivna recurring
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pretplate_user_status ON pretplate(user_id, status);

-- ============================================================
-- DOGADJAJI (kalendar)
-- ============================================================
CREATE TABLE IF NOT EXISTS dogadjaji (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  naziv TEXT NOT NULL,
  tip TEXT NOT NULL,               -- 'breathwork_journey' | 'autoskola_1' | 'autoskola_2' | 'autoskola_3' | 'autoskola_4' | 'individualno'
  datum TIMESTAMPTZ NOT NULL,
  trajanje_min INTEGER DEFAULT 90,
  lokacija TEXT DEFAULT 'Studio Shine, Ivana Gundulića 5, Osijek',
  opis TEXT,
  opis_kratki TEXT,
  cijena_eur NUMERIC(10,2),
  cijena_pretplatnik NUMERIC(10,2) DEFAULT 0,
  kapacitet INTEGER DEFAULT 15,
  stripe_link TEXT,
  pokriva_plan TEXT[],             -- npr. '{zajednica_15,zajednica_120_god}'
  aktivan BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dogadjaji_datum ON dogadjaji(datum);
CREATE INDEX IF NOT EXISTS dogadjaji_aktivan ON dogadjaji(aktivan);

-- ============================================================
-- REGISTRACIJE
-- ============================================================
CREATE TABLE IF NOT EXISTS registracije (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  dogadjaj_id UUID REFERENCES dogadjaji(id) ON DELETE CASCADE NOT NULL,
  tip_placanja TEXT NOT NULL,      -- 'pretplatnik_besplatno' | 'stripe' | 'gotovina' | 'na_cekanju'
  status TEXT DEFAULT 'potvrdjena',-- 'potvrdjena' | 'cekanje' | 'otkazana'
  poruka TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dogadjaj_id)
);

CREATE INDEX IF NOT EXISTS registracije_event ON registracije(dogadjaj_id, status);

-- ============================================================
-- AUTOSKOLA PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS autoskola_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sesija_broj INTEGER CHECK (sesija_broj BETWEEN 1 AND 4),
  dogadjaj_id UUID REFERENCES dogadjaji(id),
  datum TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, sesija_broj)
);

-- ============================================================
-- INTERAKCIJE (universal tracker)
-- ============================================================
CREATE TABLE IF NOT EXISTS interakcije (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT,
  tip TEXT NOT NULL,
  vrijednost JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS interakcije_user ON interakcije(user_id);
CREATE INDEX IF NOT EXISTS interakcije_tip ON interakcije(tip);
CREATE INDEX IF NOT EXISTS interakcije_created ON interakcije(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: korisnik vidi samo svoje
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Pretplate: korisnik vidi samo svoje
ALTER TABLE pretplate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pretplate_own" ON pretplate
  FOR ALL USING (auth.uid() = user_id);

-- Dogadjaji: javno čitanje aktivnih, admin sve
ALTER TABLE dogadjaji ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dogadjaji_public_read" ON dogadjaji
  FOR SELECT USING (aktivan = TRUE);
-- Za admina (Erni piše direktno u Dashboard — RLS bypass za authenticated)
CREATE POLICY "dogadjaji_admin_all" ON dogadjaji
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- DODAJ OVO ako koristiš postojeću dogadjaji tablicu:
-- ============================================================
ALTER TABLE dogadjaji ADD COLUMN IF NOT EXISTS tagovi TEXT[] DEFAULT '{}';

-- Registracije: korisnik vidi samo svoje
ALTER TABLE registracije ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registracije_own_read" ON registracije
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "registracije_own_insert" ON registracije
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "registracije_own_update" ON registracije
  FOR UPDATE USING (auth.uid() = user_id);

-- Autoskola progress: korisnik vidi samo svoje
ALTER TABLE autoskola_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autoskola_own" ON autoskola_progress
  FOR ALL USING (auth.uid() = user_id);

-- Interakcije: insert za sve (i anonimne), read samo svoje ili admin
ALTER TABLE interakcije ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interakcije_insert_all" ON interakcije
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "interakcije_own_read" ON interakcije
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- TESTNI PODACI — ukloni kada odeš u produkciju
-- ============================================================

-- Test događaji (Erni ažurira datume i dodaje prave)
INSERT INTO dogadjaji (slug, naziv, tip, datum, trajanje_min, opis_kratki, opis, cijena_eur, kapacitet, pokriva_plan)
VALUES
(
  'breathwork-journey-2026-05-10',
  'Breathwork Journey — Svibanj',
  'breathwork_journey',
  '2026-05-10 18:00:00+02',
  90,
  'Svjesno povezano disanje uz glazbu, vođena sesija u maloj grupi.',
  'Vođeno disajno putovanje — 90 minuta svjesnog disanja uz posebno odabranu glazbu. Dolazimo zajedno, otidemo drugačiji. Prostor za tiho, duboko, živo iskustvo. Kapacitet ograničen na 15 mjesta.',
  25.00,
  15,
  ARRAY['zajednica_15', 'zajednica_120_god']
),
(
  'autoskola-ans-2026-05-15',
  'Autoškola za živčani sustav — Susret 1',
  'autoskola_1',
  '2026-05-15 17:00:00+02',
  120,
  'Uvod u anatomiju živčanog sustava i disanje kao primarni alat samoregulacije.',
  'Prvi od 4 susreta Autoškole za živčani sustav. Razumijevamo simpatikus i parasimpatikus — zašto smo u stanju u kojem smo i što s tim možemo. Gradimo temelj za sva 4 tjedna.',
  NULL,
  12,
  NULL
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PROVJERA (pokreni da vidiš što je nastalo)
-- ============================================================
-- SELECT * FROM dogadjaji;
-- SELECT * FROM profiles;
-- SELECT * FROM interakcije ORDER BY created_at DESC LIMIT 20;
