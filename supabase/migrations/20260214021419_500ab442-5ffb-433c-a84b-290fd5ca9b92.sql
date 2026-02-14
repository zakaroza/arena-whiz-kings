
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  avatar_color TEXT NOT NULL DEFAULT '#22c55e',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting',
  visibility TEXT NOT NULL DEFAULT 'private',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room players table
CREATE TABLE public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  join_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'connected',
  score NUMERIC NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL,
  content JSONB NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  players_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds INT,
  settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND username = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_host(p_room_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = p_room_id AND host_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_participant(p_room_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_id = p_room_id AND player_id = auth.uid()
  );
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Auth users can create rooms" ON public.rooms FOR INSERT WITH CHECK (host_id = auth.uid());
CREATE POLICY "Host can update room" ON public.rooms FOR UPDATE USING (host_id = auth.uid());
CREATE POLICY "Host can delete room" ON public.rooms FOR DELETE USING (host_id = auth.uid());

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read room players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Players can join rooms" ON public.room_players FOR INSERT WITH CHECK (player_id = auth.uid());
CREATE POLICY "Players or host can update" ON public.room_players FOR UPDATE USING (player_id = auth.uid() OR public.is_room_host(room_id));
CREATE POLICY "Players can leave or host can kick" ON public.room_players FOR DELETE USING (player_id = auth.uid() OR public.is_room_host(room_id));

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admin can insert questions" ON public.questions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update questions" ON public.questions FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete questions" ON public.questions FOR DELETE USING (public.is_admin());

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Auth users can insert matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
