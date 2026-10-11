function detection_(rule, key, e, label, count, version) {
  return {id:hash_('v1|'+rule.id+'|'+key), rule:rule.id, severity:rule.severity,
    label:label,actor:e[5],count:count || 1,evidence:e[0],ref:e[9],version:version || e[10]};
}
function detect_(incoming, ledger, rules, c) {
  const result=[], touched={};
  function add(id,key,e,label) { const r=rules[id]; if(r && r.on) result.push(detection_(r,key,e,label)); }
  incoming.forEach(e=>{
    const app=e[3],name=e[4],p=JSON.parse(e[8]);
    if(app==='alerts') {
      const b=BASELINE.find(x=>x.api===name);
      const id=b ? b.id : name==='Data Loss Prevention' ? 'AC_DLP' : 'AC_UNKNOWN';
      add(id,e[9],e,b ? b.name : name);
      return;
    }
    if(app==='login' && (['suspicious_login','suspicious_programmatic_login','suspicious_login_less_secure_app'].includes(name) || (name==='login_success' && p.suspicious))) add('R_LOGIN',e[0],e,'Login sinalizado como suspeito');
    if(app==='drive' && name==='change_document_visibility' && ['people_with_link','public_on_the_web'].includes(p.newValue)) add('R_PUBLIC',e[0],e,'Link ou publicação com acesso público');
    if(app==='drive' && name==='change_user_access' && p.external && ['can_view','can_edit','can_comment','can_respond','can_view_published','organizer','owner'].includes(p.newValue)) add('R_EXTERNAL',e[0],e,'Concessão para destinatário externo');
    if(app==='token' && name==='authorize' && p.sensitiveScopes.length && !c.approved.includes(p.client)) add('R_OAUTH',e[0],e,'App fora da lista aprovada recebeu escopo sensível');
    if(app==='admin' && name==='UNENROLL_USER_FROM_STRONG_AUTH') add('R_MFA',e[0],e,'Autenticação forte removida pelo administrador');
    if(app==='admin' && ['GRANT_ADMIN_PRIVILEGE','REVOKE_ADMIN_PRIVILEGE','CHANGE_PASSWORD','CREATE_USER','DELETE_USER','SUSPEND_USER','UNSUSPEND_USER'].includes(name)) add('R_ADMIN_USERS',e[0],e,'Mudança administrativa: '+name);
    if(app==='admin' && ['CHANGE_APPLICATION_SETTING','CREATE_APPLICATION_SETTING','DELETE_APPLICATION_SETTING','CHANGE_DOCS_SETTING','CHANGE_CALENDAR_SETTING','CHANGE_MOBILE_SETTING'].includes(name)) add('R_ADMIN_SETTINGS',e[0],e,'Configuração alterada: '+name);
    [['R_FAILURE','login','login_failure'],['R_DOWNLOAD','drive','download']].forEach(([id,a,n])=>{
      const r=rules[id];
      if(r && r.on && app===a && name===n && e[5]) {
        const bucket=Math.floor(date_(e[1]).getTime()/(r.minutes*60000));
        const key=[id,r.minutes,e[5],bucket].join('|');
        touched[key]={id:id,actor:e[5],bucket:bucket,app:a,name:n,e:e};
      }
    });
  });
  Object.keys(touched).forEach(key=>{
    const t=touched[key],r=rules[t.id], distinct=new Set();
    ledger.forEach(e=>{
      if(e[3]!==t.app || e[4]!==t.name || e[5]!==t.actor || Math.floor(date_(e[1]).getTime()/(r.minutes*60000))!==t.bucket) return;
      const unique=t.id==='R_DOWNLOAD' ? e[7] : e[0];
      if(unique) distinct.add(unique);
    });
    if(distinct.size>=r.threshold) result.push(detection_(r,key,t.e,t.id==='R_DOWNLOAD' ? 'Volume de arquivos distintos baixados' : 'Sequência de falhas de login',distinct.size,new Date()));
  });
  return result;
}
function storeDetections_(ss, detections) {
  const old=rows_(ss,'Alertas'), index=new Map(old.map((r,i)=>[r[0],i]));
  const sh=ss.getSheetByName('Alertas');
  detections.forEach(d=>{
    const now=new Date();
    if(index.has(d.id)) {
      const i=index.get(d.id), row=old[i];
      if(date_(d.version).getTime()<date_(row[10]).getTime()) return;
      if(row[7]===d.count && date_(d.version).getTime()===date_(row[10]).getTime()) return;
      // Não sobrescrever Estado, Responsável e Ticket preenchidos pela equipe.
      const updated=[d.id,row[1],now,d.rule,d.severity,d.label,d.actor,d.count,d.evidence,d.ref,date_(d.version)];
      sh.getRange(i+2,1,1,11).setValues([updated.map(text_)]);
      old[i]=updated.concat(row.slice(11));
    } else {
      const row=[d.id,now,now,d.rule,d.severity,d.label,d.actor,d.count,d.evidence,d.ref,date_(d.version),'ABERTO','',''];
      // Também deduplicar dentro da página.
      index.set(d.id,old.length); old.push(row);
      // Materializar antes de outra detecção com o mesmo ID na página.
      append_(ss,'Alertas',[row]);
    }
  });
}
