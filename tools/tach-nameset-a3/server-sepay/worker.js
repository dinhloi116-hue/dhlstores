const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function j(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...cors(), ...extra } });
}
function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-sepay-signature,x-sepay-timestamp,authorization',
  };
}
function cleanDevice(v) {
  const s = String(v || '').trim().toUpperCase();
  return /^[A-F0-9]{32,64}$/.test(s) ? s : '';
}
function cleanSession(v) {
  const s = String(v || '').trim();
  return /^[A-Za-z0-9._:-]{4,160}$/.test(s) ? s : '';
}
function randomCode() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return 'DHL' + [...b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function planInfo(env, plan) {
  if (plan === 'LIFE') return { plan, amount: Number(env.PRICE_LIFETIME || 0), credits: 0 };
  if (plan === 'CREDITS_100') return { plan, amount: Number(env.PRICE_100 || 0), credits: 100 };
  return null;
}
async function bodyJson(req) {
  try { return await req.json(); } catch { return {}; }
}
async function ensureDevice(env, deviceId) {
  await env.DB.prepare(`INSERT OR IGNORE INTO devices(device_id) VALUES (?)`).bind(deviceId).run();
  return env.DB.prepare(`SELECT device_id, plan, credits, lifetime, blocked, updated_at FROM devices WHERE device_id=?`).bind(deviceId).first();
}
function devicePayload(row) {
  if (!row) return { exists: false, allowed: false, plan: 'NONE', credits: 0 };
  return {
    exists: true,
    allowed: !row.blocked && (Number(row.lifetime) === 1 || Number(row.credits) > 0),
    plan: Number(row.lifetime) === 1 ? 'LIFE' : (Number(row.credits) > 0 ? 'CREDITS' : 'NONE'),
    credits: Number(row.credits) || 0,
    blocked: !!row.blocked,
    updatedAt: row.updated_at || null,
  };
}
function qrUrl(env, amount, code) {
  const q = new URLSearchParams({
    acc: env.BANK_ACCOUNT,
    bank: env.BANK_CODE,
    amount: String(amount),
    des: code,
  });
  return `https://vietqr.app/img?${q.toString()}`;
}
async function createOrder(req, env) {
  const b = await bodyJson(req);
  const deviceId = cleanDevice(b.deviceId);
  const p = planInfo(env, String(b.plan || '').toUpperCase());
  if (!deviceId) return j({ ok: false, error: 'bad_device' }, 400);
  if (!p || !(p.amount > 0)) return j({ ok: false, error: 'bad_plan_or_price' }, 400);
  if (!env.BANK_ACCOUNT || !env.BANK_CODE) return j({ ok: false, error: 'bank_not_configured' }, 500);

  const d = await ensureDevice(env, deviceId);
  if (d.blocked) return j({ ok: false, error: 'device_blocked' }, 403);
  if (Number(d.lifetime) === 1) return j({ ok: false, error: 'already_lifetime' }, 409);

  let code = randomCode();
  for (let i = 0; i < 4; i++) {
    const exists = await env.DB.prepare(`SELECT code FROM orders WHERE code=?`).bind(code).first();
    if (!exists) break;
    code = randomCode();
  }
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await env.DB.prepare(`INSERT INTO orders(code,device_id,plan,amount,credits_add,expires_at) VALUES (?,?,?,?,?,?)`)
    .bind(code, deviceId, p.plan, p.amount, p.credits, expires).run();

  return j({
    ok: true,
    code,
    plan: p.plan,
    amount: p.amount,
    expiresAt: expires,
    qrUrl: qrUrl(env, p.amount, code),
    bankCode: env.BANK_CODE,
    accountNumber: env.BANK_ACCOUNT,
    content: code,
  });
}
async function orderStatus(code, env) {
  const row = await env.DB.prepare(`SELECT code,status,plan,amount,expires_at,paid_at FROM orders WHERE code=?`).bind(code).first();
  if (!row) return j({ ok: false, status: 'not_found' }, 404);
  let status = row.status;
  if (status === 'pending' && new Date(row.expires_at).getTime() < Date.now()) status = 'expired';
  return j({ ok: true, status, plan: row.plan, amount: row.amount, expiresAt: row.expires_at, paidAt: row.paid_at || null });
}
async function deviceStatus(req, env) {
  const b = await bodyJson(req);
  const deviceId = cleanDevice(b.deviceId);
  if (!deviceId) return j({ ok: false, error: 'bad_device' }, 400);
  const row = await ensureDevice(env, deviceId);
  return j({ ok: true, deviceId, ...devicePayload(row) });
}
async function startSession(req, env) {
  const b = await bodyJson(req);
  const deviceId = cleanDevice(b.deviceId);
  const sessionId = cleanSession(b.sessionId);
  if (!deviceId || !sessionId) return j({ ok: false, allowed: false, error: 'bad_device_or_session' }, 400);

  let row = await ensureDevice(env, deviceId);
  if (row.blocked) return j({ ok: false, allowed: false, error: 'device_blocked' }, 403);
  if (Number(row.lifetime) === 1) {
    return j({ ok: true, allowed: true, charged: false, plan: 'LIFE', credits: Number(row.credits) || 0 });
  }

  const same = await env.DB.prepare(`SELECT 1 AS ok FROM sessions WHERE device_id=? AND session_id=?`).bind(deviceId, sessionId).first();
  if (same) {
    return j({ ok: true, allowed: true, charged: false, plan: 'CREDITS', credits: Number(row.credits) || 0 });
  }
  if (Number(row.credits) <= 0) return j({ ok: true, allowed: false, charged: false, plan: 'NONE', credits: 0, error: 'no_credits' });

  const ins = await env.DB.prepare(`INSERT OR IGNORE INTO sessions(device_id,session_id) VALUES (?,?)`).bind(deviceId, sessionId).run();
  if (!ins.meta?.changes) {
    row = await env.DB.prepare(`SELECT * FROM devices WHERE device_id=?`).bind(deviceId).first();
    return j({ ok: true, allowed: true, charged: false, plan: 'CREDITS', credits: Number(row.credits) || 0 });
  }
  const dec = await env.DB.prepare(`UPDATE devices SET credits=credits-1, plan='CREDITS', updated_at=CURRENT_TIMESTAMP WHERE device_id=? AND credits>0 AND blocked=0`).bind(deviceId).run();
  if (!dec.meta?.changes) {
    await env.DB.prepare(`DELETE FROM sessions WHERE device_id=? AND session_id=?`).bind(deviceId, sessionId).run();
    return j({ ok: true, allowed: false, charged: false, plan: 'NONE', credits: 0, error: 'no_credits' });
  }
  row = await env.DB.prepare(`SELECT * FROM devices WHERE device_id=?`).bind(deviceId).first();
  return j({ ok: true, allowed: true, charged: true, plan: 'CREDITS', credits: Number(row.credits) || 0 });
}

function hex(bytes) { return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
async function verifySePay(req, raw, env) {
  const sig = req.headers.get('x-sepay-signature') || '';
  const ts = req.headers.get('x-sepay-timestamp') || '';
  const n = Number(ts);
  if (!env.SEPAY_WEBHOOK_SECRET || !sig || !n) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - n) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SEPAY_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${raw}`));
  return safeEq(`sha256=${hex(mac)}`.toLowerCase(), sig.toLowerCase());
}
async function sepayWebhook(req, env) {
  const raw = await req.text();
  if (!(await verifySePay(req, raw, env))) return j({ success: false, error: 'unauthorized' }, 401);
  let p;
  try { p = JSON.parse(raw); } catch { return j({ success: false, error: 'bad_json' }, 400); }
  if (String(p.transferType || '').toLowerCase() !== 'in') return j({ success: true, ignored: 'not_incoming' });
  if (env.BANK_ACCOUNT && p.accountNumber && String(p.accountNumber) !== String(env.BANK_ACCOUNT)) return j({ success: true, ignored: 'wrong_account' });

  const tx = String(p.id || p.referenceCode || '').trim();
  if (!tx) return j({ success: false, error: 'missing_transaction_id' }, 400);
  const dup = await env.DB.prepare(`SELECT transaction_id FROM transactions WHERE transaction_id=?`).bind(tx).first();
  if (dup) return j({ success: true, duplicate: true });

  const codeRaw = String(p.code || p.content || '').toUpperCase();
  const m = codeRaw.match(/DHL[A-F0-9]{12}/);
  const code = m ? m[0] : '';
  const amount = Math.round(Number(p.transferAmount || 0));
  if (!code || !(amount > 0)) {
    await env.DB.prepare(`INSERT OR IGNORE INTO transactions(transaction_id,amount,reference_code,raw_json) VALUES (?,?,?,?)`)
      .bind(tx, amount || 0, String(p.referenceCode || ''), raw).run();
    return j({ success: true, ignored: 'no_order_code' });
  }

  const order = await env.DB.prepare(`SELECT * FROM orders WHERE code=?`).bind(code).first();
  if (!order || order.status !== 'pending') {
    await env.DB.prepare(`INSERT OR IGNORE INTO transactions(transaction_id,order_code,amount,reference_code,raw_json) VALUES (?,?,?,?,?)`)
      .bind(tx, code, amount, String(p.referenceCode || ''), raw).run();
    return j({ success: true, ignored: 'order_not_pending' });
  }
  if (amount < Number(order.amount)) return j({ success: true, ignored: 'underpaid' });

  await env.DB.prepare(`INSERT OR IGNORE INTO transactions(transaction_id,order_code,amount,reference_code,raw_json) VALUES (?,?,?,?,?)`)
    .bind(tx, code, amount, String(p.referenceCode || ''), raw).run();

  if (order.plan === 'LIFE') {
    await env.DB.prepare(`UPDATE devices SET lifetime=1, plan='LIFE', updated_at=CURRENT_TIMESTAMP WHERE device_id=?`).bind(order.device_id).run();
  } else {
    await env.DB.prepare(`UPDATE devices SET credits=credits+?, plan='CREDITS', updated_at=CURRENT_TIMESTAMP WHERE device_id=?`).bind(Number(order.credits_add) || 100, order.device_id).run();
  }
  await env.DB.prepare(`UPDATE orders SET status='paid', transaction_id=?, paid_at=CURRENT_TIMESTAMP WHERE code=? AND status='pending'`).bind(tx, code).run();
  return j({ success: true });
}

async function adminReset(req, env) {
  const auth = req.headers.get('authorization') || '';
  if (!env.ADMIN_SECRET || auth !== `Bearer ${env.ADMIN_SECRET}`) return j({ ok: false, error: 'unauthorized' }, 401);
  const b = await bodyJson(req);
  const deviceId = cleanDevice(b.deviceId);
  if (!deviceId) return j({ ok: false, error: 'bad_device' }, 400);
  const mode = String(b.mode || '').toUpperCase();
  if (mode === 'BLOCK') await env.DB.prepare(`UPDATE devices SET blocked=1, updated_at=CURRENT_TIMESTAMP WHERE device_id=?`).bind(deviceId).run();
  else if (mode === 'UNBLOCK') await env.DB.prepare(`UPDATE devices SET blocked=0, updated_at=CURRENT_TIMESTAMP WHERE device_id=?`).bind(deviceId).run();
  else if (mode === 'RESET_SESSIONS') await env.DB.prepare(`DELETE FROM sessions WHERE device_id=?`).bind(deviceId).run();
  else return j({ ok: false, error: 'bad_mode' }, 400);
  return j({ ok: true });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
    const u = new URL(req.url);
    try {
      if (u.pathname === '/health') return j({ ok: true, service: 'dhl-nameset-license' });
      if (req.method === 'POST' && u.pathname === '/api/device/status') return deviceStatus(req, env);
      if (req.method === 'POST' && u.pathname === '/api/session/start') return startSession(req, env);
      if (req.method === 'POST' && u.pathname === '/api/orders') return createOrder(req, env);
      if (req.method === 'GET' && u.pathname.startsWith('/api/orders/')) return orderStatus(u.pathname.split('/').pop(), env);
      if (req.method === 'POST' && u.pathname === '/webhook/sepay') return sepayWebhook(req, env);
      if (req.method === 'POST' && u.pathname === '/api/admin/device') return adminReset(req, env);
      return j({ ok: false, error: 'not_found' }, 404);
    } catch (e) {
      return j({ ok: false, error: 'server_error', message: String(e?.message || e) }, 500);
    }
  }
};
