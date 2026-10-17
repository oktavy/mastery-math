import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method tidak diizinkan' });
  const { email, password } = req.body || {};
  try {
    const r = await pool.query(
      'SELECT id, nama, email, role, kelas, password_hash FROM users WHERE email = $1',
      [(email || '').toLowerCase()]
    );
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
      return res.status(401).json({ message: 'Email atau sandi salah' });
    const token = jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({
      token,
      user: { id: u.id, email: u.email },
      profil: { nama: u.nama, role: u.role, kelas: u.kelas }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error server database' });
  }
}
