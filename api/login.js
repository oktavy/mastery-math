import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nama, email, role, kelas FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length > 0) {
      const userObj = result.rows[0]; 
      return res.status(200).json({
        message: 'Login sukses',
        user: { id: userObj.id, email: userObj.email },
        profil: { nama: userObj.nama, role: userObj.role, kelas: userObj.kelas }
      });
    } else {
      return res.status(401).json({ message: 'Invalid login credentials' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error server database' });
  }
}
