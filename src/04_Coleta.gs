function loadState_(feed) { return JSON.parse(props_().getProperty('CP_'+feed) || '{}'); }
function saveState_(feed,state) { props_().setProperty('CP_'+feed,JSON.stringify(state)); }
function beginWindow_(feed,s,now) {
  if(s.start) {
    if(feed.replace('replay_','')!=='alerts' && Date.parse(s.start)<now-MW.eventDays*86400000) throw apiError_('ATRASO_EXCEDE_RETENCAO');
    return s;
  }
  const replay=feed.startsWith('replay_'), end=now-5*60000;
  if(replay && s.completed && now-Date.parse(s.completed)<86400000) return null;
  if(!replay && s.watermark && end-Date.parse(s.watermark)<60000) return null;
  let start, until;
  if(replay) {
    // updateTime não é um filtro suportado: reler por createTime.
    start=end-(feed==='replay_alerts' ? MW.alertDays : MW.replayDays)*86400000; until=end;
  } else {
    const wm=s.watermark ? Date.parse(s.watermark) : end-MW.initialHours*3600000;
    if(now-wm > MW.eventDays*86400000) throw apiError_('ATRASO_EXCEDE_RETENCAO');
    start=wm-MW.overlapHours*3600000; until=Math.min(end,wm+MW.stepHours*3600000);
  }
  return Object.assign(s,{start:new Date(start).toISOString(),end:new Date(until).toISOString(),token:'',page:0,tokenReset:false});
}
function processPage_(ss,feed,s,c,rules,deadline) {
  const page=page_(feed,s,deadline), app=feed.replace('replay_',''), now=new Date();
  const incoming=app==='alerts' ? normalizedAlerts_(page.alerts || [],now) : normalizedReports_(app,page.items || [],c,now);
  const ledger=rows_(ss,'Eventos'), ids=new Set(ledger.map(e=>e[0])), fresh=[];
  incoming.forEach(e=>{if(!ids.has(e[0])) {ids.add(e[0]);fresh.push(e);}});
  append_(ss,'Eventos',fresh);
  // Reavaliar inclusive duplicados: repara queda entre escrita do evento e alerta.
  storeDetections_(ss,detect_(incoming,ledger.concat(fresh),rules,c));
  SpreadsheetApp.flush(); // Dados antes do checkpoint. Falha: mesma página será relida.
  const next=page.nextPageToken || '';
  if(next && next===s.token) throw apiError_('TOKEN_REPETIDO');
  s.lastPage=now.toISOString();s.failures=0;s.retryAt=0;s.code='';s.page=(s.page||0)+1;
  if(next) {s.token=next;s.status='PAGINANDO';}
  else {
    s.watermark=s.end;s.completed=now.toISOString();s.status='OK';
    delete s.start;delete s.end;delete s.token;
  }
  saveState_(feed,s);
  return !next;
}
function executarMonitor() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;
  const deadline=Date.now()+MW.budgetMs;
  let ss;
  try {
    ss=SpreadsheetApp.openById(required_('SPREADSHEET_ID'));
    const c=config_(ss), rules=rules_(ss);
    const feeds=MW.feeds.concat(MW.feeds.map(f=>'replay_'+f));
    const offset=Number(props_().getProperty('ROUND_ROBIN') || 0)%feeds.length;
    const ordered=feeds.slice(offset).concat(feeds.slice(0,offset)), done=new Set();
    props_().setProperty('ROUND_ROBIN',String((offset+1)%feeds.length));
    let pages=0;
    while(Date.now()+20000<deadline && pages<MW.maxPages && done.size<ordered.length) {
      for(const feed of ordered) {
        if(done.has(feed) || Date.now()+20000>=deadline || pages>=MW.maxPages) continue;
        let s=loadState_(feed);
        if(s.retryAt && Date.now()<s.retryAt) {done.add(feed);continue;}
        try {
          s=beginWindow_(feed,s,Date.now());
          if(!s) {done.add(feed);continue;}
          saveState_(feed,s); // Janela fixa antes da primeira chamada.
          pages++;
          if(processPage_(ss,feed,s,c,rules,deadline)) done.add(feed);
        } catch(e) {
          s=s || loadState_(feed);
          // 400/410 com token: reiniciar UMA vez a janela; não avançar watermark.
          if(['HTTP_400','HTTP_410'].includes(e.code) && s.token && !s.tokenReset) {
            s.token='';s.tokenReset=true;s.resets=(s.resets||0)+1;
            s.code='TOKEN_REINICIADO';s.status='REPROCESSAR';s.retryAt=Date.now()+60000;
          } else {
            s.failures=(s.failures||0)+1;s.code=code_(e);s.status='ERRO';
            s.retryAt=Date.now()+Math.max(e.retryMs||0,Math.min(21600000,60000*Math.pow(2,Math.min(s.failures,8))));
          }
          saveState_(feed,s);operation_(ss,feed,'ERRO',s.code);done.add(feed);
        }
      }
    }
    updateHealth_(ss);
    updateDashboard_(ss);
    props_().setProperty('LAST_RUN',new Date().toISOString());
  } catch(e) {
    if(ss) {try{operation_(ss,'monitor','FALHA',code_(e));}catch(_) {}}
    throw new Error('Monitor: '+code_(e));
  } finally {lock.releaseLock();}
}
function validarConexoes() {
  const ss=SpreadsheetApp.openById(required_('SPREADSHEET_ID')), now=Date.now(),deadline=now+180000;
  config_(ss);rules_(ss);
  const s={start:new Date(now-86400000).toISOString(),end:new Date(now-300000).toISOString()};
  const failures=[];
  MW.feeds.forEach(f=>{
    try {page_(f,s,deadline);operation_(ss,f,'CONEXAO_OK','HTTP_200');}
    catch(e) {operation_(ss,f,'CONEXAO_ERRO',code_(e));failures.push(f+':'+code_(e));}
  });
  if(failures.length) throw new Error(failures.join('; '));
}
/** Recuperação explícita: propriedades RECOVERY_FEED, RECOVERY_START, RECOVERY_END (ISO UTC). */
function reprocessarIntervalo() {
  const lock=LockService.getScriptLock();lock.waitLock(1000);
  try {
    const feed=required_('RECOVERY_FEED');
    if(!MW.feeds.includes(feed)) throw new Error('FEED_INVALIDO');
    const start=date_(required_('RECOVERY_START')),end=date_(required_('RECOVERY_END'));
    if(end<=start || end.getTime()>Date.now() || start.getTime()<Date.now()-MW.replayDays*86400000) throw new Error('INTERVALO_INVALIDO');
    const id='replay_'+feed,old=loadState_(id);
    if(old.start) throw new Error('JANELA_PENDENTE');
    saveState_(id,{start:start.toISOString(),end:end.toISOString(),token:'',status:'REPROCESSAR'});
  } finally {lock.releaseLock();}
}
