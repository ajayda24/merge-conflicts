-- ============================================================
--  MatriAI — Complete Supabase SQL Schema
--
--  HOW TO USE:
--  1. Open Supabase Dashboard → SQL Editor → New Query
--  2. Paste this entire file and click Run
--  3. Safe to re-run — uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS
--
--  EXISTING TABLE (untouched):
--    public.profiles already has:
--    id, full_name, phone, life_stage, onboarding_complete,
--    created_at, updated_at
--
--  THIS SCRIPT:
--    • Adds new columns to profiles (non-destructive)
--    • Creates 6 new tables
--    • Adds triggers, indexes, and RLS policies
-- ============================================================


-- ============================================================
-- SECTION 0: SHARED UTILITIES
-- ============================================================

-- Shared function: auto-update updated_at on any table
create or replace function public.handle_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- SECTION 1: profiles  (ALTER — add new columns only)
-- ============================================================
-- The profiles table already exists with:
--   id, full_name, phone, life_stage, onboarding_complete,
--   created_at, updated_at
--
-- New columns needed by onboarding page and storage layer:

-- email — populated by handle_new_user trigger on signup
alter table public.profiles
  add column if not exists email text;

-- age — user enters during onboarding step 1
alter table public.profiles
  add column if not exists age integer;

-- conditions — multi-select pre-existing conditions (step 1)
-- Possible values: 'pmdd', 'pcod', 'anxiety', 'depression', 'none'
alter table public.profiles
  add column if not exists conditions text[] default '{}';

-- cultural_context — answers to 5 cultural context questions (step 4)
-- Stored as: { "cq1": "answer", "cq2": "answer", ..., "cq5": "answer or [array]" }
-- Some questions allow multi-select (stored as text[])
alter table public.profiles
  add column if not exists cultural_context jsonb default '{}';

-- screening_type — which questionnaire was used: EPDS or PHQ-4
-- EPDS: used for pregnancy / postpartum life stages (10 questions, max score 30)
-- PHQ-4: used for all other life stages (4 questions, max score 12)
alter table public.profiles
  add column if not exists screening_type text
  check (screening_type in ('EPDS', 'PHQ4'));

-- screening_score — total score from onboarding screening
alter table public.profiles
  add column if not exists screening_score integer;

-- screening_severity — computed severity from onboarding screening
-- EPDS: low <9, moderate 9–12, severe >=13 (or Q10 > 0)
-- PHQ-4: low <3, moderate 3–5, severe >=6
alter table public.profiles
  add column if not exists screening_severity text
  check (screening_severity in ('low', 'moderate', 'severe'));

-- ── Trigger: auto-create profiles row on auth.users signup ──
-- This ensures the profiles row exists for the onboarding
-- update to succeed immediately after sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Trigger: keep updated_at current ────────────────────────
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "users can view own profile"   on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;

create policy "users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- SECTION 2: onboarding_screenings
--    Stores the full screening questionnaire result from
--    onboarding (EPDS or PHQ-4).
--
--    Written by: lib/matriai-storage.ts → saveScreeningToDB()
--    Called from: app/onboarding/page.tsx → handleComplete()
-- ============================================================

-- ── EPDS Reference ───────────────────────────────────────────
-- Q1:  Able to laugh                    (reverse scored: 0,1,2,3)
-- Q2:  Looking forward                  (reverse scored: 0,1,2,3)
-- Q3:  Self-blame                       (3,2,1,0)
-- Q4:  Anxious / worried                (0,1,2,3)
-- Q5:  Scared / panicky                 (3,2,1,0)
-- Q6:  Things getting on top            (3,2,1,0)
-- Q7:  Difficulty sleeping              (3,2,1,0)
-- Q8:  Sad / miserable                  (3,2,1,0)
-- Q9:  Crying                           (3,2,1,0)
-- Q10: Thought of self-harm (crisis!)   (3,2,1,0) — triggers crisis modal
-- Score range: 0–30  | low <9 | moderate 9–12 | severe >=13

-- ── PHQ-4 Reference ─────────────────────────────────────────
-- Q1:  Little interest / pleasure       (0,1,2,3)
-- Q2:  Feeling down / depressed         (0,1,2,3)
-- Q3:  Anxious / on edge                (0,1,2,3)
-- Q4:  Uncontrollable worrying          (0,1,2,3)
-- Score range: 0–12  | low <3 | moderate 3–5 | severe >=6

create table if not exists public.onboarding_screenings (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references auth.users(id) on delete cascade,

  -- Which questionnaire was shown (depends on life_stage)
  -- EPDS → pregnancy, postpartum
  -- PHQ4 → loss, menopause, unsure
  type            text          not null
                  check (type in ('EPDS', 'PHQ4')),

  -- Total computed score
  score           integer       not null,

  -- Severity band derived from score + crisis question
  severity        text          not null
                  check (severity in ('low', 'moderate', 'severe')),

  -- Raw per-question scores as an array (preserves individual answers)
  -- EPDS: 10 integers  |  PHQ-4: 4 integers  (each 0–3)
  answers         integer[]     not null default '{}',

  -- Was Q10 of EPDS > 0? (crisis flag — shown only for EPDS users)
  epds_crisis_flag boolean      default false,

  -- Date the screening was completed
  screened_on     date          not null default current_date,

  created_at      timestamptz   default now()
);

create index if not exists idx_onboarding_screenings_user
  on public.onboarding_screenings (user_id, screened_on desc);

alter table public.onboarding_screenings enable row level security;

drop policy if exists "screening: owner all" on public.onboarding_screenings;
create policy "screening: owner all"
  on public.onboarding_screenings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- SECTION 3: cultural_context_responses
--    Stores the 5 cultural context answers per user, per life
--    stage. Kept separate from profiles JSONB for queryability.
--
--    Source data from: lib/matriai-data.ts → CULTURAL_QUESTIONS
--    Written by: app/onboarding/page.tsx → handleComplete()
-- ============================================================

-- ── Cultural questions by life stage ─────────────────────────
-- pregnancy:
--   cq1: Who do you live with?          (single select)
--   cq2: First pregnancy?               (single select)
--   cq3: How involved are people?        (single select)
--   cq4: Are you working?               (single select)
--   cq5: Who do you turn to?            (single select)
--
-- postpartum:
--   cq1: How long ago did you give birth? (single select)
--   cq2: Support after baby came home?    (single select)
--   cq3: How have you been feeling?       (single select)
--   cq4: Pressure about how you should?  (single select)
--   cq5: How are you feeding your baby?  (single select)
--
-- loss:
--   cq1: How long ago did this happen?   (single select)
--   cq2: Space to grieve?               (single select)
--   cq3: Able to talk to anyone?         (single select)
--   cq4: What are you looking for?       (single select)
--   cq5: Name your loss?                 (single select)
--
-- menopause:
--   cq1: Where are you right now?        (single select)
--   cq2: How openly can you talk?        (single select)
--   cq3: Which symptoms affect you most? (MULTI-SELECT)
--   cq4: Spoken to a doctor?             (single select)
--   cq5: Do people understand you?       (single select)
--
-- unsure:
--   cq1: What's bringing you here?       (single select)
--   cq2: Any body/emotion changes?       (single select)
--   cq3: Related to pregnancy?           (single select)
--   cq4: People to talk to?              (single select)
--   cq5: Something you want to say?      (single select)

create table if not exists public.cultural_context_responses (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,

  -- Which life stage was active when cultural Qs were answered
  life_stage  text        not null,

  -- Individual answers (text for single select, text[] for multi-select)
  cq1         text,                       -- always single select
  cq2         text,                       -- always single select
  cq3_single  text,                       -- single-select answer for cq3 (most stages)
  cq3_multi   text[]      default '{}',   -- multi-select for menopause cq3 (symptoms)
  cq4         text,                       -- always single select
  cq5         text,                       -- always single select

  -- Full JSONB copy for flexibility (mirrors profiles.cultural_context)
  raw_answers jsonb       default '{}',

  created_at  timestamptz default now()
);

create unique index if not exists idx_cultural_context_user_stage
  on public.cultural_context_responses (user_id, life_stage);

create index if not exists idx_cultural_context_user
  on public.cultural_context_responses (user_id);

alter table public.cultural_context_responses enable row level security;

drop policy if exists "cultural: owner all" on public.cultural_context_responses;
create policy "cultural: owner all"
  on public.cultural_context_responses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- SECTION 4: daily_checkins
--    Full daily check-in record with all detail fields.
--    This is the PRIMARY analytics table (source of truth).
--
--    Written by: lib/matriai-storage.ts → saveCheckInToDB()
--    Called from: components/mood-checkin.tsx
--    Used by:     components/dashboard-content.tsx (charts)
-- ============================================================

-- ── Mood labels (from MOOD_TILES in matriai-data.ts) ─────────
-- Radiant, Calm, Content, Anxious, Numb, Sad,
-- Exhausted, Irritable, Overwhelmed

-- ── Mood factors (from ALL_MOOD_FACTORS) ─────────────────────
-- Work/studies, Family pressure, Partner/spouse, Sleep,
-- Physical health, Finances, Loneliness, My baby, Body image,
-- Social media, The pregnancy, My grief, Hot flashes,
-- My identity, Nothing specific

-- ── Sleep options (from SLEEP_OPTIONS) ───────────────────────
-- Very poorly, Poorly, Okay, Well, Very well

-- ── Appetite options (from APPETITE_OPTIONS) ─────────────────
-- Barely eating, Less than usual, Normal,
-- More than usual, Eating a lot

-- ── Physical symptoms (from BASE_SYMPTOMS) ───────────────────
-- Gynaecological: Irregular bleeding, Pelvic pain,
--   Unusual discharge, Breast lump/tenderness, Menstrual irregularity
-- General: Fever, Headache, Fatigue, Nausea, Body ache,
--   Dizziness, Appetite loss
-- Psychiatric: Persistent low mood, Panic attacks,
--   Dissociation/detachment, Self-harm thoughts
-- Other: Insomnia, Back pain, Anxiety in body

create table if not exists public.daily_checkins (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,

  -- Calendar date of the check-in (one per user per day)
  checkin_date      date        not null,

  -- ── Step 1: Mood ─────────────────────────────────────────
  -- Selected from MOOD_TILES
  mood              text        not null,

  -- ── Step 2: Mood factors ─────────────────────────────────
  -- Multi-select from ALL_MOOD_FACTORS (filtered by life_stage)
  factors           text[]      default '{}',

  -- ── Step 3: Body (sleep + appetite) ──────────────────────
  sleep             text        not null,    -- from SLEEP_OPTIONS
  appetite          text        not null,    -- from APPETITE_OPTIONS

  -- ── Step 4: Physical symptoms ────────────────────────────
  -- Multi-select from BASE_SYMPTOMS
  symptoms          text[]      default '{}',

  -- Specialist routing flag computed from symptoms
  -- Values: 'gynaecologist' | 'general_physician' | 'psychiatrist' | null
  specialist_flag   text,

  -- ── Step 5: Life-stage question ───────────────────────────
  -- Free text or option answer for the stage-specific question
  stage_answer      text        default '',

  -- ── Step 6: Free-text notes ──────────────────────────────
  notes             text        default '',

  -- ── Computed analytics ───────────────────────────────────
  -- Score: 0–100 computed from mood modifier + sleep + appetite + symptoms
  computed_score    integer     not null check (computed_score between 0 and 100),

  -- Severity band from computed_score
  -- low: score >= 60  |  moderate: 40–59  |  severe: < 40
  severity          text        not null check (severity in ('low', 'moderate', 'severe')),

  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),

  -- One check-in per user per calendar day (upsert support)
  unique (user_id, checkin_date)
);

drop trigger if exists daily_checkins_updated_at on public.daily_checkins;
create trigger daily_checkins_updated_at
  before update on public.daily_checkins
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_daily_checkins_user_date
  on public.daily_checkins (user_id, checkin_date desc);

create index if not exists idx_daily_checkins_severity
  on public.daily_checkins (user_id, severity);

alter table public.daily_checkins enable row level security;

drop policy if exists "checkins: owner all" on public.daily_checkins;
create policy "checkins: owner all"
  on public.daily_checkins for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- SECTION 5: checkins  (legacy simplified record)
--    Written by: components/mood-checkin.tsx (legacy insert)
--    Used by:    dashboard/page.tsx for hasCheckedInToday
--                and recentCheckins 7-day chart fallback
-- ============================================================
create table if not exists public.checkins (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,

  -- Numeric 1–5 scale (derived from mood label and sleep option)
  mood          integer     check (mood between 1 and 5),
  energy        integer     check (energy between 1 and 5),
  sleep_quality integer     check (sleep_quality between 1 and 5),
  notes         text,

  created_at    timestamptz default now()
);

create index if not exists idx_checkins_user_created
  on public.checkins (user_id, created_at desc);

alter table public.checkins enable row level security;

drop policy if exists "checkins_legacy: owner all" on public.checkins;
create policy "checkins_legacy: owner all"
  on public.checkins for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- SECTION 6: threads  (community posts)
--    Written by: components/community-content.tsx
--    Read by:    app/community/page.tsx (with comment count)
--                app/community/[id]/page.tsx
-- ============================================================

-- ── Categories (from community-content.tsx) ──────────────────
-- General, Anxiety, Depression, Motherhood, Work Stress,
-- Relationships, Self-Care, Menopause

create table if not exists public.threads (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,

  title         text        not null,
  content       text        not null,
  category      text,       -- see categories above
  is_anonymous  boolean     default false,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop trigger if exists threads_updated_at on public.threads;
create trigger threads_updated_at
  before update on public.threads
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_threads_created_at on public.threads (created_at desc);
create index if not exists idx_threads_user_id    on public.threads (user_id);
create index if not exists idx_threads_category   on public.threads (category);

alter table public.threads enable row level security;

drop policy if exists "threads: read all authenticated" on public.threads;
create policy "threads: read all authenticated"
  on public.threads for select
  using (auth.uid() is not null);

drop policy if exists "threads: insert own" on public.threads;
create policy "threads: insert own"
  on public.threads for insert
  with check (auth.uid() = user_id);

drop policy if exists "threads: delete own" on public.threads;
create policy "threads: delete own"
  on public.threads for delete
  using (auth.uid() = user_id);


-- ============================================================
-- SECTION 7: comments  (community replies)
--    Written by: components/thread-content.tsx
--    Aggregated: app/community/page.tsx → comments(count)
-- ============================================================
create table if not exists public.comments (
  id            uuid        primary key default gen_random_uuid(),
  thread_id     uuid        not null references public.threads(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,

  content       text        not null,
  is_anonymous  boolean     default false,

  created_at    timestamptz default now()
);

create index if not exists idx_comments_thread_id on public.comments (thread_id, created_at asc);
create index if not exists idx_comments_user_id   on public.comments (user_id);

alter table public.comments enable row level security;

drop policy if exists "comments: read all authenticated" on public.comments;
create policy "comments: read all authenticated"
  on public.comments for select
  using (auth.uid() is not null);

drop policy if exists "comments: insert own" on public.comments;
create policy "comments: insert own"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "comments: delete own" on public.comments;
create policy "comments: delete own"
  on public.comments for delete
  using (auth.uid() = user_id);


-- ============================================================
-- SECTION 8: professional_profiles  (doctor/counsellor directory)
--    Written by: app/api/professionals/register/route.ts
--    Read by:    app/doctors/page.tsx (is_verified = true only)
-- ============================================================

-- ── Roles ────────────────────────────────────────────────────
-- doctor    → registered with NMC (National Medical Commission)
-- counsellor → registered with RCI (Rehabilitation Council of India)

-- ── Doctor specializations ───────────────────────────────────
-- Psychiatry, Gynaecology, General Medicine,
-- Obstetrics, Paediatrics, Internal Medicine

-- ── Counsellor specializations ───────────────────────────────
-- Clinical Psychology, Counselling Psychology, Trauma & PTSD,
-- Health Psychology, Marriage & Family Therapy, Neuropsychology

create table if not exists public.professional_profiles (
  id                  uuid        primary key default gen_random_uuid(),

  -- Linked auth user (null if account creation failed during registration)
  user_id             uuid        references auth.users(id) on delete set null,

  full_name           text        not null,
  email               text        not null unique,

  -- Professional role determines registration body
  role                text        not null check (role in ('doctor', 'counsellor')),

  -- Specialization from DOCTOR_SPECIALIZATIONS or COUNSELLOR_SPECIALIZATIONS
  specialization      text        not null,

  years_experience    integer     not null check (years_experience >= 0),
  license_number      text        not null,

  -- NMC for doctors, RCI for counsellors
  registration_type   text        not null check (registration_type in ('NMC', 'RCI')),

  bio                 text,

  -- Admin-managed verification status
  -- pending  → submitted, awaiting manual review (2-3 business days)
  -- verified → approved, appears in Find Help directory
  -- rejected → not approved, hidden from all users
  status              text        not null default 'pending'
                      check (status in ('pending', 'verified', 'rejected')),

  -- Computed from status — set automatically by trigger
  is_verified         boolean     not null default false,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-sync is_verified when admin changes status
create or replace function public.sync_professional_verified()
returns trigger language plpgsql as $$
begin
  new.is_verified = (new.status = 'verified');
  new.updated_at  = now();
  return new;
end;
$$;

drop trigger if exists professional_profiles_sync_verified on public.professional_profiles;
create trigger professional_profiles_sync_verified
  before insert or update of status on public.professional_profiles
  for each row execute procedure public.sync_professional_verified();

create index if not exists idx_professional_profiles_verified
  on public.professional_profiles (is_verified, created_at desc);

alter table public.professional_profiles enable row level security;

-- Users see only verified professionals
drop policy if exists "professionals: select verified" on public.professional_profiles;
create policy "professionals: select verified"
  on public.professional_profiles for select
  using (is_verified = true);

-- A professional can always see their own row (pending status check)
drop policy if exists "professionals: select own" on public.professional_profiles;
create policy "professionals: select own"
  on public.professional_profiles for select
  using (auth.uid() = user_id);

-- Insert is handled via server API route
drop policy if exists "professionals: insert via api" on public.professional_profiles;
create policy "professionals: insert via api"
  on public.professional_profiles for insert
  with check (true);


-- ============================================================
-- ADMIN OPERATIONS
-- ============================================================

-- Verify a professional (is_verified auto-set by trigger):
--   update public.professional_profiles
--   set status = 'verified'
--   where id = '<uuid>';

-- Reject a professional:
--   update public.professional_profiles
--   set status = 'rejected'
--   where id = '<uuid>';

-- View all pending applications:
--   select id, full_name, email, role, specialization,
--          registration_type, license_number, created_at
--   from public.professional_profiles
--   where status = 'pending'
--   order by created_at asc;
