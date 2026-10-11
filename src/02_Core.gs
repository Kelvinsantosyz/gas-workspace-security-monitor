function canonical_(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical_).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+canonical_(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function hex_(bytes) { return bytes.map(x => ('0'+((x+256)%256).toString(16)).slice(-2)).join(''); }
function hash_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }
function pseudo_(s) {
  return s ? hex_(Utilities.computeHmacSha256Signature(String(s).trim().toLowerCase(), required_('PSEUDONYM_KEY'), Utilities.Charset.UTF_8)).slice(0,32) : '';
}
function date_(s) {
  const d = new Date(s);
  if (!s || !Number.isFinite(d.getTime())) throw new Error('DATA_ORIGEM_INVALIDA');
  return d;
}
function text_(v) {
  if (typeof v !== 'string') return v;
  const t = v.slice(0,4000);
  return /^[\s]*[=+@-]/.test(t) ? "'" + t : t;
}
function rows_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('ABA_AUSENTE_' + name);
  return sh.getLastRow() < 2 ? [] : sh.getRange(2,1,sh.getLastRow()-1,HEADERS[name].length).getValues();
}
function append_(ss, name, data) {
  if (!data.length) return;
  const sh = ss.getSheetByName(name), last = sh.getLastRow();
  if (last + data.length > MW.maxRows) throw new Error('CAPACIDADE_' + name);
  ensureSize_(sh, last+data.length, HEADERS[name].length);
  sh.getRange(last+1,1,data.length,HEADERS[name].length).setValues(data.map(r => r.map(text_)));
}
function ensureSize_(sh, r, c) {
  if (sh.getMaxRows() < r) sh.insertRowsAfter(sh.getMaxRows(), r-sh.getMaxRows());
  if (sh.getMaxColumns() < c) sh.insertColumnsAfter(sh.getMaxColumns(), c-sh.getMaxColumns());
}
function params_(ps) {
  const o = {};
  (ps || []).forEach(p => {
    for (const k of ['value','intValue','boolValue','multiValue','multiIntValue','messageValue','multiMessageValue']) {
      if (Object.prototype.hasOwnProperty.call(p,k)) { o[p.name] = p[k]; break; }
    }
  });
  return o;
}
function external_(email, domains) {
  const s = String(email || '').trim().toLowerCase(), i = s.lastIndexOf('@');
  return i > 0 && !domains.includes(s.slice(i+1));
}
function normalizedReports_(app, activities, c, now) {
  const out = [];
  activities.forEach(a => {
    if (!a.id || !a.id.uniqueQualifier || !a.id.time) throw new Error('SCHEMA_REPORTS');
    const duplicates = {};
    (a.events || []).forEach(e => {
      const p = params_(e.parameters), rawActor = (a.actor || {}).email || (a.actor || {}).profileId || p.affected_email_address || '';
      const rawTarget = p.target_user || p.USER_EMAIL || p.affected_email_address || '';
      // Só atributos necessários à regra. Nunca persistir o payload completo.
      const scopes = Array.isArray(p.scope) ? p.scope : String(p.scope || '').split(/[\s,]+/).filter(Boolean);
      const attrs = {
        visibility: p.visibility || '', visibilityChange:p.visibility_change || '',
        newValue: app === 'drive' && ['change_document_visibility','change_user_access'].includes(e.name) ? p.new_value || '' : '',
        external: external_(rawTarget,c.domains),
        suspicious: p.is_suspicious === true || p.is_suspicious === 'true',
        client: app === 'token' ? String(p.client_id || '') : '',
        sensitiveScopes: app === 'token' ? scopes.filter(s => c.scopes.includes(s)) : []
      };
      const fingerprint = hash_(canonical_({name:e.name,type:e.type || '',parameters:(e.parameters || []).slice().sort((x,y)=>String(x.name).localeCompare(String(y.name)))}));
      duplicates[fingerprint] = (duplicates[fingerprint] || 0)+1;
      const id = hash_([app,a.id.customerId || '',a.id.time,a.id.uniqueQualifier,fingerprint,duplicates[fingerprint]].join('|'));
      out.push([id,date_(a.id.time),now,app,e.name || 'UNKNOWN',pseudo_(rawActor),pseudo_(rawTarget),pseudo_(p.doc_id || ''),JSON.stringify(attrs),String(a.id.uniqueQualifier),date_(a.id.time)]);
    });
  });
  return out;
}
function normalizedAlerts_(items, now) {
  return items.map(a => {
    if (!a.alertId || !a.type || !a.createTime) throw new Error('SCHEMA_ALERTCENTER');
    const rev = a.updateTime || a.createTime;
    const attrs = {type:a.type,source:a.source || '',severity:(a.metadata || {}).severity || '',nativeStatus:(a.metadata || {}).status || '',deleted:!!a.deleted};
    const id = hash_('alerts|'+a.alertId+'|'+rev+'|'+canonical_(attrs));
    return [id,date_(a.createTime),now,'alerts',a.type,'','','',JSON.stringify(attrs),a.alertId,date_(rev)];
  });
}
function code_(e) {
  return e.code || (/^[A-Z_]+$/.test(String(e.message)) ? e.message : 'FALHA_LOCAL');
}
function operation_(ss, part, outcome, code) { append_(ss,'Operacoes',[[new Date(),part,outcome,String(code)]]); }
