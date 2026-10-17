import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { nama, email } = req.body || {};
  if (!nama || !email) return res.status(400).json({ message: 'Data kurang' });
  try {
    await pool.query('INSERT INTO kontak (nama, email) VALUES ($1, $2)', [nama, email]);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error server database' });
  }
}
