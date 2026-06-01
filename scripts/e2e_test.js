(async () => {
  const base = 'http://localhost:4000';
  const rand = Math.floor(Math.random() * 100000);
  const email = `test${rand}@example.com`;
  const password = 'password123';
  const name = 'Test User';

  console.log('Registering user', email);
  let res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  console.log('Register status', res.status);
  const reg = await res.json();
  console.log('Register response', reg);

  console.log('Logging in');
  res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  console.log('Login status', res.status);
  const login = await res.json();
  console.log('Login response', login);

  const token = login.token;
  if (!token) {
    console.error('No token, aborting');
    process.exit(1);
  }

  console.log('Fetching status');
  res = await fetch(`${base}/api/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status', res.status);
  console.log(await res.json());

  console.log('Creating transaction (expense)');
  res = await fetch(`${base}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: 'expense',
      description: 'Test purchase',
      amount: 100,
      items: [{ name: 'Apple', quantity: 1, unitPrice: 100 }]
    })
  });
  console.log('Create transaction status', res.status);
  console.log(await res.json());

  console.log('Fetching transactions');
  res = await fetch(`${base}/api/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Transactions status', res.status);
  console.log(await res.json());

  console.log('E2E test completed');
})();
