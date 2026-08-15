/* JSONBin cloud data layer. No localStorage/sessionStorage is used for data. */
const JSONBIN_BIN_ID = '6a806543da38895dfee86ff1';
const JSONBIN_ACCESS_KEY = '$2a$10$J9blma/PKDEBjvlGZ/YiHOPIw7vQPAOi3jndnhZ9/5tu/NQio7.Gq';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

function normalizeHubData(value) {
  const src = value && typeof value === 'object' ? value : {};
  return {
    applications: Array.isArray(src.applications) ? src.applications : [],
    payments: Array.isArray(src.payments) ? src.payments : [],
    quizScores: Array.isArray(src.quizScores) ? src.quizScores : [],
    messages: Array.isArray(src.messages) ? src.messages : [],
    accessCodes: Array.isArray(src.accessCodes) ? src.accessCodes : []
  };
}

async function jsonBinRequest(method, body) {
  const options = {
    method,
    headers: {'Content-Type':'application/json','X-Access-Key':JSONBIN_ACCESS_KEY}
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  const response = await fetch(JSONBIN_URL, options);
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) throw new Error(`JSONBin ${response.status}: ${payload?.message || payload?.error || text || 'Request failed'}`);
  return payload;
}

async function loadFromJsonBin() {
  const payload = await jsonBinRequest('GET');
  return normalizeHubData(payload?.record ?? payload);
}

async function saveHubData(data) {
  return jsonBinRequest('PUT', normalizeHubData(data));
}

async function saveToJsonBin(collection, record) {
  const allowed = ['applications','payments','quizScores','messages','accessCodes'];
  if (!allowed.includes(collection)) throw new Error(`Invalid collection: ${collection}`);
  const data = await loadFromJsonBin();
  const entry = {...record, id: record.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: record.createdAt || new Date().toISOString()};
  data[collection].unshift(entry);
  await saveHubData(data);
  return entry;
}

function makeAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  if (crypto.getRandomValues) {
    const bytes = new Uint8Array(8); crypto.getRandomValues(bytes);
    for (const b of bytes) code += chars[b % chars.length];
  } else for (let i=0;i<8;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

async function createAccessCode() {
  const data = await loadFromJsonBin();
  const existing = new Set(data.accessCodes.map(x => String(x.code || '').toUpperCase()));
  let code = makeAccessCode();
  while (existing.has(code)) code = makeAccessCode();
  const record = {id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, code, used:false, usedBy:'', usedAt:null, createdAt:new Date().toISOString()};
  data.accessCodes.unshift(record);
  await saveHubData(data);
  return record;
}

async function validateAccessCode(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return {ok:false,reason:'missing'};
  const data = await loadFromJsonBin();
  const record = data.accessCodes.find(x => String(x.code || '').toUpperCase() === clean);
  if (!record) return {ok:false,reason:'invalid'};
  if (record.used) return {ok:false,reason:'used'};
  return {ok:true,record};
}

async function markCodeUsedBy(code, usedBy='') {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) throw new Error('Missing access code');
  const data = await loadFromJsonBin();
  const index = data.accessCodes.findIndex(x => String(x.code || '').toUpperCase() === clean);
  if (index < 0) throw new Error('Access code not found');
  if (data.accessCodes[index].used) return {ok:false,reason:'used',record:data.accessCodes[index]};
  data.accessCodes[index] = {
    ...data.accessCodes[index],
    used:true,
    usedBy:String(usedBy || ''),
    usedAt:new Date().toISOString()
  };
  await saveHubData(data);
  return {ok:true,record:data.accessCodes[index]};
}

async function validateAndUseAccessCode(code, usedBy='') {
  const check = await validateAccessCode(code);
  if (!check.ok) return {valid:false,reason:check.reason};
  const used = await markCodeUsedBy(code, usedBy);
  return {valid:!!used.ok,reason:used.reason,record:used.record};
}


// Shared aliases used by the individual application pages.
async function saveSubmission(data) {
  return saveToJsonBin('applications', data);
}
async function savePaymentRequest(data) {
  return saveToJsonBin('payments', data);
}

async function saveGiftPhoto(photo){ return saveToJsonBin("gift_photos", photo); }
