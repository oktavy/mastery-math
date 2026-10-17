import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

let siap = false;
async function siapkanTabel() {
  if (siap) return;
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text');
  // kolom lama "password" (jika ada) tidak boleh menghalangi simpan akun baru
  try { await pool.query('ALTER TABLE users ALTER COLUMN password DROP NOT NULL'); } catch (e) {}
  siap = true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method tidak diizinkan' });

  let me;
  try {
    me = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Tidak berwenang' });
  }

  const b = req.body || {};
  const pw = String(b.password || '');

  try {
    // Ganti sandi akun sendiri (semua peran)
    if (b.self) {
      if (pw.length < 6) return res.status(400).json({ message: 'Sandi minimal 6 karakter' });
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(pw, 10), me.id]);
      return res.status(200).json({ ok: true });
    }

    // Buat / perbarui akun orang lain: hanya admin dan guru
    if (!['admin', 'guru'].includes(me.role)) return res.status(403).json({ message: 'Tidak diizinkan' });

    const email = String(b.email || '').trim().toLowerCase();
    const nama = String(b.nama || '').trim();
    const role = String(b.role || '');
    const kelas = b.kelas ? String(b.kelas) : null;

    if (!email || !nama) return res.status(400).json({ message: 'Email dan nama wajib diisi' });
    if (pw.length < 6) return res.status(400).json({ message: 'Sandi minimal 6 karakter' });
    if (!['siswa', 'guru', 'ortu'].includes(role)) return res.status(400).json({ message: 'Peran tidak valid' });
    if (me.role === 'guru' && role === 'guru') return res.status(403).json({ message: 'Guru tidak boleh membuat akun guru' });

    await siapkanTabel();
    const hash = await bcrypt.hash(pw, 10);
    const ada = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);
    if (ada.rows.length) {
      if (ada.rows[0].role !== role) return res.status(409).json({ message: 'Email sudah dipakai akun lain' });
      await pool.query(
        'UPDATE users SET password_hash = $1, nama = $2, kelas = $3 WHERE id = $4',
        [hash, nama, kelas, ada.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO users (email, password_hash, nama, role, kelas) VALUES ($1, $2, $3, $4, $5)',
        [email, hash, nama, role, kelas]
      );
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error server database: ' + e.message });
  }
}
