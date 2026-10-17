-- Jalankan di Neon -> SQL Editor
CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  nama          text NOT NULL,
  role          text NOT NULL CHECK (role IN ('siswa','guru','ortu','admin')),
  kelas         text
);
CREATE TABLE IF NOT EXISTS app_state (id int PRIMARY KEY, data jsonb, updated_at timestamptz);
CREATE TABLE IF NOT EXISTS kontak (id serial PRIMARY KEY, nama text, email text, created_at timestamptz DEFAULT now());

-- Buat hash sandi admin dulu di komputer Anda:
--   npm i bcryptjs
--   node -e "console.log(require('bcryptjs').hashSync('SANDI_BARU_YANG_KUAT',10))"
-- Lalu tempel hasilnya di bawah:
-- INSERT INTO users (email, password_hash, nama, role)
-- VALUES ('email-admin@anda.com', '<HASH_BCRYPT>', 'Administrator', 'admin');
