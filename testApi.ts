import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'adorehAppSecretKeyKey2026';

const token = jwt.sign({
  id: 'test-admin-id',
  email: 'admin@test.com',
  name: 'Admin Test',
  role: 'SUPER_ADMIN',
  roles: ['SUPER_ADMIN']
}, JWT_SECRET, { expiresIn: '1h' });

async function test() {
  try {
    const res = await fetch('http://localhost:3333/api/finance/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    console.log("DASHBOARD SUCCESS");
  } catch (err: any) {
    console.error("DASHBOARD ERROR:", err.message);
  }

  try {
    const res = await fetch('http://localhost:3333/api/finance/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log("TRANSACTIONS SUCCESS");
  } catch (err: any) {
    console.error("TRANSACTIONS ERROR:", err.message);
  }

  try {
    const res = await fetch('http://localhost:3333/api/finance/fixed-expenses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    console.log("FIXED EXPENSES SUCCESS");
  } catch (err: any) {
    console.error("FIXED EXPENSES ERROR:", err.message);
  }
}

test();

test();
