// src/lib/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supabase client — single instance shared across the app.
//
// Setup (one-time):
//   1. Create a free project at https://supabase.com
//   2. Go to Project Settings → API and copy:
//      - Project URL  → VITE_SUPABASE_URL
//      - anon/public key → VITE_SUPABASE_ANON_KEY
//   3. Add both to frontend/.env  (never commit this file)
//   4. In Supabase → Authentication → Providers, enable Email, Google, GitHub
//   5. For Google/GitHub OAuth, add your app's redirect URL:
//      http://localhost:5173  (dev)  and your production URL
//   6. Run the SQL migration below in Supabase → SQL Editor
//
// SQL migration (run once in Supabase SQL Editor):
// ─────────────────────────────────────────────────────────────────────────────
//   create table if not exists public.profiles (
//     id         uuid primary key references auth.users(id) on delete cascade,
//     email      text not null,
//     full_name  text,
//     avatar_url text,
//     provider   text default 'email',
//     created_at timestamptz default now()
//   );
//
//   alter table public.profiles enable row level security;
//
//   create policy "Users can read own profile"
//     on public.profiles for select using (auth.uid() = id);
//
//   create policy "Users can update own profile"
//     on public.profiles for update using (auth.uid() = id);
//
//   -- Auto-create profile on signup
//   create or replace function public.handle_new_user()
//   returns trigger language plpgsql security definer set search_path = public as $$
//   begin
//     insert into public.profiles (id, email, full_name, avatar_url, provider)
//     values (
//       new.id,
//       new.email,
//       coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
//       new.raw_user_meta_data->>'avatar_url',
//       coalesce(new.raw_app_meta_data->>'provider', 'email')
//     );
//     return new;
//   end;
//   $$;
//
//   drop trigger if exists on_auth_user_created on auth.users;
//   create trigger on_auth_user_created
//     after insert on auth.users
//     for each row execute procedure public.handle_new_user();
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js"

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[TotalCura] Missing Supabase env vars.\n" +
    "Create frontend/.env with:\n" +
    "  VITE_SUPABASE_URL=https://xxxx.supabase.co\n" +
    "  VITE_SUPABASE_ANON_KEY=eyJ..."
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,          // stores session in localStorage automatically
    autoRefreshToken: true,        // keeps JWT fresh
    detectSessionInUrl: true,      // handles OAuth redirects
  },
})

// ── Database types (matches the profiles table) ───────────────────────────────
export interface Profile {
  id:         string
  email:      string
  full_name:  string | null
  avatar_url: string | null
  provider:   string
  created_at: string
}
