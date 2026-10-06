create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  name text not null,
  faculty text not null default 'Science',
  dept text not null default '',
  level text not null default '100L',
  residence text not null default 'Jaja Hall',
  room text not null default '',
  bio text not null default '',
  is_seed boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed-in" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.my_profile_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1
$$;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "insert own posts" on public.posts for insert to authenticated with check (author_id = public.my_profile_id());
create policy "delete own posts" on public.posts for delete to authenticated using (author_id = public.my_profile_id());

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.profiles(id) on delete cascade,
  office text not null,
  candidate_id text not null,
  created_at timestamptz not null default now(),
  unique (voter_id, office)
);
grant select, insert on public.votes to authenticated;
grant all on public.votes to service_role;
alter table public.votes enable row level security;
create policy "votes readable" on public.votes for select to authenticated using (true);
create policy "cast own vote" on public.votes for insert to authenticated with check (voter_id = public.my_profile_id());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'note' check (kind in ('knock','note','invite','game')),
  body text not null default '' check (char_length(body) <= 500),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "see own messages" on public.messages for select to authenticated using (from_id = public.my_profile_id() or to_id = public.my_profile_id());
create policy "send as self" on public.messages for insert to authenticated with check (from_id = public.my_profile_id());
create policy "recipient marks read" on public.messages for update to authenticated using (to_id = public.my_profile_id()) with check (to_id = public.my_profile_id());

create table public.trivia_scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid references public.profiles(id) on delete set null,
  score int not null check (score between 0 and 5),
  created_at timestamptz not null default now()
);
grant select, insert on public.trivia_scores to authenticated;
grant all on public.trivia_scores to service_role;
alter table public.trivia_scores enable row level security;
create policy "scores readable" on public.trivia_scores for select to authenticated using (true);
create policy "insert own score" on public.trivia_scores for insert to authenticated with check (player_id = public.my_profile_id());

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.votes;

insert into public.profiles (name, faculty, dept, level, residence, room, bio, is_seed) values
('Tunde Adeyemi','Engineering','Mechanical','300L','Jaja Hall','A112','Jaja to the world. Ask me for past questions.',true),
('Segun Balogun','Science','Computer Science','200L','Jaja Hall','A112','Coding at TDB every night.',true),
('Emeka Okafor','Law','Law','400L','Mariere Hall','B204','Moot court champion.',true),
('Femi Lawal','Social Sciences','Economics','100L','Mariere Hall','B204','Fresher, still learning the shuttle routes.',true),
('Kelechi Eze','Engineering','Electrical','500L','Eni Njoku Hall','C301','Hall exec aspirant.',true),
('Uche Nwosu','Arts','Theatre Arts','300L','Eni Njoku Hall','C118','Hall week MC. Book me.',true),
('Dayo Ogunleye','Management Sciences','Accounting','200L','Biobaku Hall','D210','POS business by New Hall.',true),
('Ibrahim Musa','Science','Physics','400L','Biobaku Hall','D210','SUG presidential aspirant.',true),
('Chioma Nwachukwu','Medilag (Medicine)','Medicine','400L','Moremi Hall','B214','Medilag babe, always reading.',true),
('Amaka Okonkwo','Arts','English','200L','Moremi Hall','B214','Knotless braids at student price.',true),
('Bisola Adeyemi','Environmental Sciences','Architecture','300L','Moremi Hall','A105','Drawing boards and late nights.',true),
('Aisha Bello','Law','Law','100L','Amina Hall','C220','Fresher. Love Iya Moria amala.',true),
('Zainab Ibrahim','Education','Guidance & Counselling','300L','Amina Hall','C220','Here if you need to talk.',true),
('Halima Lawal','Science','Biochemistry','500L','Kofo Hall','A010','Final year project wahala.',true),
('Ngozi Eze','Social Sciences','Mass Communication','200L','Kofo Hall','A011','Presenter on campus radio.',true),
('Tobi Balogun','Engineering','Systems Engineering','300L','Off-Campus (Akoka)','','Print shop owner. ₦20/page.',true),
('Ifeoma Okafor','Management Sciences','Business Admin','400L','Off-Campus (Akoka)','','Small chops business.',true),
('Kunle Akande','Science','Mathematics','300L','Off-Campus (Abule-Oja)','','Hall chairman aspirant, squatting nowhere.',true),
('Grace Okeke','Arts','History','200L','Off-Campus (Abule-Oja)','','Thrift fashion plug.',true);

insert into public.posts (author_id, title, body)
select id, 'Cheap printing & binding', '₦20/page at the Business Strip. Projects bound in 1 hour.' from public.profiles where name='Tobi Balogun'
union all select id, 'Knotless braids — student price', 'Moremi Hall B214. DM for slots this weekend.' from public.profiles where name='Amaka Okonkwo'
union all select id, 'Hall Week Concert Friday', 'Live at Jaja. Bring your naira for spraying!' from public.profiles where name='Uche Nwosu'
union all select id, 'Small chops for your events', 'Puff-puff, samosa, spring rolls. Delivery to all halls.' from public.profiles where name='Ifeoma Okafor';

insert into public.votes (voter_id, office, candidate_id)
select id, 'SUG President', (array['c1','c2','c3'])[1 + (abs(hashtext(name)) % 3)] from public.profiles where is_seed
union all
select id, 'Hall Chairman', (array['h1','h2'])[1 + (abs(hashtext(name)) % 2)] from public.profiles where is_seed;