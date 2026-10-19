import pkg from 'pg';
import jwt from 'jsonwebtoken';
const { Pool } = pkg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

let tabelSiap = false;
async function siapkanTabelSoal() {
  if (tabelSiap) return;
  // Membuat tabel otomatis di Neon jika belum tersedia
  await pool.query(`
    CREATE TABLE IF NOT EXISTS soal (
      id SERIAL PRIMARY KEY,
      pertanyaan TEXT NOT NULL,
      pilihan_a TEXT NOT NULL,
      pilihan_b TEXT NOT NULL,
      pilihan_c TEXT NOT NULL,
      pilihan_d TEXT NOT NULL,
      jawaban_benar VARCHAR(2) NOT NULL,
      bab VARCHAR(50) NOT NULL,
      kategori VARCHAR(20) NOT NULL,
      tipe_soal VARCHAR(30) NOT NULL,
      link_soal TEXT,
      gambar_url TEXT,
      tingkat VARCHAR(20) NOT NULL,
      pembahasan TEXT,
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  tabelSiap = true;
}

export default async function handler(req, res) {
  let user;
  try {
    if (req.headers.authorization) {
      user = jwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET);
    }
  } catch (e) {
    // Abaikan error parsing token jika metodenya hanya mengambil data (GET)
  }

  // --- 1. MENAMPILKAN / MENGHITUNG JUMLAH SOAL SECARA DINAMIS (UNTUK LAMAN SISWA) ---
  if (req.method === 'GET') {
    try {
      await siapkanTabelSoal();
      const queryResult = await pool.query(`
        SELECT bab, kategori, COUNT(*)::int as jumlah 
        FROM soal 
        GROUP BY bab, kategori
      `);
      return res.status(200).json({ ok: true, data: queryResult.rows });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Error mengambil data jumlah soal' });
    }
  }

  // --- 2. MENYIMPAN BUTIR SOAL BARU (DARI LAMAN ADMIN / GURU) ---
  if (req.method === 'POST') {
    if (!user || !['admin', 'guru'].includes(user.role)) {
      return res.status(403).json({ message: 'Tidak diizinkan menambah soal' });
    }

    const {
      pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d,
      jawaban_benar, bab, kategori, tipe_soal, link_soal,
      gambar_url, tingkat, pembahasan
    } = req.body || {};

    if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d || !jawaban_benar || !bab || !kategori) {
      return res.status(400).json({ message: 'Data soal belum lengkap' });
    }

    try {
      await siapkanTabelSoal();
      const queryText = `
        INSERT INTO soal (
          pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, 
          jawaban_benar, bab, kategori, tipe_soal, link_soal, 
          gambar_url, tingkat, pembahasan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id;
      `;
      const values = [
        pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d,
        jawaban_benar, bab, kategori, tipe_soal, link_soal || null,
        gambar_url || null, tingkat || 'Sedang', pembahasan || null
      ];

      const hasil = await pool.query(queryText, values);
      return res.status(200).json({ ok: true, id: hasil.rows[0].id });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Gagal menyimpan soal ke database: ' + e.message });
    }
  }

  return res.status(405).json({ message: 'Method tidak diizinkan' });
}
