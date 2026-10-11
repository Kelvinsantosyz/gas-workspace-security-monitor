/** Nunca registrar URL com token, corpo de erro, JWT ou payload recebido. */
function apiError_(code, retryMs) {
  const e = new Error(String(code)); e.code=String(code); e.retryMs=retryMs || 0; return e;
}
function request_(url, options, deadline) {
  const opts = Object.assign({muteHttpExceptions:true,followRedirects:false}, options || {});
  for (let attempt=0; attempt<4; attempt++) {
    if (Date.now()+15000 > deadline) throw apiError_('ORCAMENTO',60000);
    let response;
    try { response = UrlFetchApp.fetch(url,opts); }
    catch (_) { throw apiError_('REDE',60000); }
    const status=response.getResponseCode();
    if (status >= 200 && status < 300) {
      try { return JSON.parse(response.getContentText()); } catch (_) { throw apiError_('JSON_INVALIDO',60000); }
    }
    let reasons=[];
    try { reasons=(JSON.parse(response.getContentText()).error.errors || []).map(x=>x.reason); } catch (_) {}
    const retryable=status===429 || status>=500 || (status===403 && reasons.some(x=>['rateLimitExceeded','userRateLimitExceeded','quotaExceeded'].includes(x)));
    if (!retryable) throw apiError_('HTTP_'+status);
    const headers=response.getAllHeaders(), key=Object.keys(headers).find(k=>k.toLowerCase()==='retry-after');
    const raw=key ? headers[key] : '', seconds=Number(raw);
    const retryAfter=raw ? (Number.isFinite(seconds) ? seconds*1000 : Math.max(0,Date.parse(raw)-Date.now())) : 0;
    const delay=Math.max(retryAfter || 0,Math.min(30000,1000*Math.pow(2,attempt))+Math.floor(Math.random()*700));
    if (attempt===3 || delay>30000 || Date.now()+delay+15000>deadline) throw apiError_('HTTP_'+status,delay);
    Utilities.sleep(delay);
  }
  throw apiError_('RETRY_ESGOTADO');
}
function alertsToken_(deadline, refresh) {
  const sa=required_('ALERTS_SERVICE_ACCOUNT'), sub=required_('ALERTS_SUBJECT');
  const cache=CacheService.getScriptCache(), key='ac_token_'+hash_(sa+'|'+sub).slice(0,20);
  if (refresh) cache.remove(key);
  const old=cache.get(key); if (old) return old;
  const now=Math.floor(Date.now()/1000);
  const claims={iss:sa,sub:sub,scope:'https://www.googleapis.com/auth/apps.alerts',aud:'https://oauth2.googleapis.com/token',iat:now-30,exp:now+3500};
  const signed=request_('https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+encodeURIComponent(sa)+':signJwt',{
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},payload:JSON.stringify({payload:JSON.stringify(claims)})
  },deadline);
  const token=request_('https://oauth2.googleapis.com/token',{method:'post',payload:{grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:signed.signedJwt}},deadline);
  if (!token.access_token) throw apiError_('TOKEN_AUSENTE');
  cache.put(key,token.access_token,Math.max(1,Math.min(3000,Number(token.expires_in || 3600)-120)));
  return token.access_token;
}
function page_(feed, state, deadline) {
  const app=feed.replace('replay_',''), q={}, isAlerts=app==='alerts';
  let base;
  if (isAlerts) {
    base='https://alertcenter.googleapis.com/v1beta1/alerts';
    q.pageSize=MW.pageSize;
    q.filter='createTime >= "'+state.start+'" AND createTime < "'+state.end+'"';
    q.orderBy='createTime asc';
  } else {
    base='https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/'+app;
    q.startTime=state.start; q.endTime=state.end; q.maxResults=MW.pageSize;
  }
  if (state.token) q.pageToken=state.token;
  const url=base+'?'+Object.keys(q).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(q[k])).join('&');
  const call = refresh => request_(url,{headers:{Authorization:'Bearer '+(isAlerts ? alertsToken_(deadline,refresh) : ScriptApp.getOAuthToken())}},deadline);
  try { return call(false); }
  catch(e) { if (e.code==='HTTP_401' && isAlerts) return call(true); throw e; }
}
