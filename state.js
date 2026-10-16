import pkg from 'pg';
import jwt from 'jsonwebtoken';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  let user;
  try {
    user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Tidak berwenang' });
  }
  try {
    if (req.method === 'GET') {
      const r = await pool.query('SELECT data FROM app_state WHERE id = 1');
      return res.status(200).json({ data: r.rows[0] ? r.rows[0].data : null });
    }
    if (req.method === 'POST') {
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES (1, $1::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [JSON.stringify(req.body.data)]
      );
      return res.status(200).json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error server database' });
  }
}
