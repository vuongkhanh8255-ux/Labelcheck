-- Create brands table
create table public.brands (
  id text primary key,
  name text not null,
  logo_url text,
  qr_code_url text,
  registered_company_name text not null,
  address text,
  phone text,
  website text,
  color text
);

-- Enable Row Level Security
alter table public.brands enable row level security;

-- Create policies for anonymous access (For MVP demo purpose)
create policy "Enable read access for all users" on public.brands for select using (true);
create policy "Enable insert for all users" on public.brands for insert with check (true);
create policy "Enable update for all users" on public.brands for update using (true);
create policy "Enable delete for all users" on public.brands for delete using (true);

-- Insert Mock Data
insert into public.brands (id, name, logo_url, qr_code_url, registered_company_name, address, phone, website, color)
values
  ('innisfree', 'Innisfree', '/logos/innisfree.png', '/qrcodes/innisfree.png', 'AmorePacific Vietnam Co., Ltd.', 'Tầng 10, Tòa nhà Vietcombank, 5 Công Trường Mê Linh, Quận 1, TP.HCM', '1800 1234', 'www.innisfree.com.vn', '#2D6A4F'),
  ('loreal', 'L''Oréal', '/logos/loreal.png', '/qrcodes/loreal.png', 'L''Oréal Vietnam Co., Ltd.', '12 Tôn Đản, Phường 13, Quận 4, TP.HCM', '1800 5678', 'www.loreal.com.vn', '#C8102E'),
  ('cocoon', 'Cocoon', '/logos/cocoon.png', '/qrcodes/cocoon.png', 'Công ty TNHH Nature Story', '123 Nguyễn Thị Minh Khai, Quận 3, TP.HCM', '028 3939 1234', 'www.cocoonoriginal.com', '#8B5E3C'),
  ('thefaceshop', 'The Face Shop', '/logos/thefaceshop.png', '/qrcodes/thefaceshop.png', 'LG H&H Vietnam Co., Ltd.', '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM', '1800 9090', 'www.thefaceshop.com.vn', '#4A7C59');
