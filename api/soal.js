import pkg from 'pg';
import jwt from 'jsonwebtoken';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

let siap = false;
async function siapkanTabel() {
  if (siap) return;
  // Satu baris = satu soal. Tabel bank_soal dibuat otomatis, tidak perlu SQL manual.
  await pool.query(`CREATE TABLE IF NOT EXISTS bank_soal (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    oleh integer,
    diubah timestamptz DEFAULT now()
  )`);
  siap = true;
}

export default async function handler(req, res) {
  let me;
  try {
    me = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Tidak berwenang' });
  }
  try {
    await siapkanTabel();
    if (req.method === 'GET') {
      const r = await pool.query('SELECT data FROM bank_soal ORDER BY diubah');
      return res.status(200).json({ soal: r.rows.map(x => x.data) });
    }
    if (req.method === 'POST') {
      if (me.role !== 'admin' && me.role !== 'guru')
        return res.status(403).json({ message: 'Hanya admin dan guru yang boleh mengubah soal' });
      const { simpan = [], hapus = [] } = req.body || {};
      if (simpan.length > 200 || hapus.length > 500) return res.status(400).json({ message: 'Terlalu banyak' });
      for (const q of simpan) {
        if (!q || !q.id) continue;
        await pool.query(
          `INSERT INTO bank_soal (id, data, oleh, diubah) VALUES ($1, $2::jsonb, $3, now())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, oleh = EXCLUDED.oleh, diubah = now()`,
          [String(q.id), JSON.stringify(q), me.id]
        );
      }
      for (const id of hapus) {
        // soal bawaan yang dihapus disimpan sebagai penanda agar tidak muncul lagi
        await pool.query(
          `INSERT INTO bank_soal (id, data, oleh, diubah) VALUES ($1, $2::jsonb, $3, now())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, oleh = EXCLUDED.oleh, diubah = now()`,
          [String(id), JSON.stringify({ id: String(id), hapus: 1 }), me.id]
        );
      }
      return res.status(200).json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error server database: ' + e.message });
  }
}
