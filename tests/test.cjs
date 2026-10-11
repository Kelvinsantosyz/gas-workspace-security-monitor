// Sem dependências externas. Executar: node tests/test.cjs
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const path=require('path');
let values={PSEUDONYM_KEY:'test-key-not-production'}, responses=[], requests=[], sleeps=[], flushFail=false;
class Range {
  constructor(s,r,c,n=1,m=1){Object.assign(this,{s,r,c,n,m});}
  getValues(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.s.data[this.r-1+i]?.[this.c-1+j]??''));}
  setValues(a){assert.equal(a.length,this.n);a.forEach((row,i)=>{assert.equal(row.length,this.m);this.s.data[this.r-1+i]??=[];row.forEach((v,j)=>this.s.data[this.r-1+i][this.c-1+j]=v);});return this;}
}
class Sheet {
  constructor(header){this.data=[header];}
  getLastRow(){return this.data.length;}
  getMaxRows(){return 40000;}
  getMaxColumns(){return 26;}
  getRange(r,c,n,m){return new Range(this,r,c,n,m);}
  deleteRows(r,n){this.data.splice(r-1,n);}
}
const context={console,Date,Set,Map,Math,JSON,Error,Object,Array,String,Number,Boolean,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>values[k]??null,setProperty:(k,v)=>values[k]=v})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()],sleep:ms=>sleeps.push(ms)},
  SpreadsheetApp:{flush:()=>{if(flushFail)throw Error('FLUSH_FAIL');}},
  ScriptApp:{getOAuthToken:()=> 'owner-token'},
  UrlFetchApp:{fetch:(url,opts)=>{requests.push({url,opts});const x=responses.shift();if(!x)throw Error('NO_RESPONSE');return {getResponseCode:()=>x.status,getContentText:()=>JSON.stringify(x.body||{}),getAllHeaders:()=>x.headers||{}};}},
  CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{},remove:()=>{}})}
};
vm.createContext(context);
const src=path.join(__dirname,'../src');
for(const file of fs.readdirSync(src).filter(f=>f.endsWith('.gs')).sort())vm.runInContext(fs.readFileSync(path.join(src,file),'utf8'),context,{filename:file});
function run(s){return vm.runInContext(s,context);}
const headers=run('HEADERS'), baseline=run('BASELINE'), custom=run('CUSTOM_RULES');
let passed=0;
function test(name,fn){try{fn();console.log('OK',name);passed++;}catch(e){console.error('FALHOU',name,e);process.exitCode=1;}}
function book(){const ss={sheets:Object.fromEntries(Object.entries(headers).map(([k,v])=>[k,new Sheet(v)])),getSheetByName(n){return this.sheets[n];}};return ss;}
const config={domains:['corp.test','alias.test'],approved:['approved'],scopes:['https://www.googleapis.com/auth/drive']};
const rules=Object.fromEntries([...baseline.map(b=>[b.id,b.active,b.severity,1,0]),...custom].map(r=>[r[0],{id:r[0],on:r[1],severity:r[2],threshold:r[3],minutes:r[4]}]));
const now=new Date(),eventTime=new Date(Math.floor(Date.now()/3600000)*3600000+1000).toISOString();
function activity(name,params=[],id='1',email='alice@corp.test',time=eventTime){return {id:{time,uniqueQualifier:id,customerId:'Ctenant'},actor:{email},events:[{name,type:'test',parameters:params}]};}
function norm(app,a){return context.normalizedReports_(app,[a],config,now);}
function detect(e,ledger=e,r=rules){return context.detect_(e,ledger,r,config);}
test('Baseline: 51 itens, 40 ativos, 11 inativos, 3 lacunas',()=>{assert.equal(baseline.length,51);assert.equal(baseline.filter(b=>b.active).length,40);assert.equal(baseline.filter(b=>!b.api).length,3);});
test('Pseudônimo determinístico e minimização',()=>{const row=norm('drive',activity('download',[{name:'doc_id',value:'secret-document'},{name:'doc_title',value:'Segredo'}]))[0];assert(!JSON.stringify(row).includes('alice@'));assert(!JSON.stringify(row).includes('secret-document'));assert(!JSON.stringify(row).includes('Segredo'));assert.equal(row[5],context.pseudo_('ALICE@CORP.TEST'));});
test('Deduplicação independente da ordem dos parâmetros',()=>{const p=[{name:'doc_id',value:'a'},{name:'visibility',value:'private'}];assert.equal(norm('drive',activity('download',p))[0][0],norm('drive',activity('download',p.slice().reverse()))[0][0]);});
test('Eventos múltiplos e duplicados na mesma atividade preservados',()=>{const a=activity('login_failure');a.events.push(a.events[0]);const e=norm('login',a);assert.equal(e.length,2);assert.notEqual(e[0][0],e[1][0]);});
test('Baseline inativo não produz alerta',()=>{const e=context.normalizedAlerts_([{alertId:'a',type:'Users password changed',createTime:eventTime}],now);assert.equal(detect(e).length,0);});
test('Tipo desconhecido e DLP recebem regras diferentes',()=>{for(const [type,id] of [['Novel event','AC_UNKNOWN'],['Data Loss Prevention','AC_DLP']]){const e=context.normalizedAlerts_([{alertId:'a',type,createTime:eventTime}],now);assert.equal(detect(e)[0].rule,id);}});
test('Mudança de link público detectada; privado não',()=>{for(const [v,n] of [['people_with_link',1],['public_on_the_web',1],['private',0]]){const e=norm('drive',activity('change_document_visibility',[{name:'new_value',value:v}]));assert.equal(detect(e).length,n);}});
test('Acesso externo: concessão sim, revogação e alias interno não',()=>{for(const [email,value,n] of [['bob@outside.test','can_view',1],['bob@outside.test','none',0],['bob@alias.test','can_view',0]]){const e=norm('drive',activity('change_user_access',[{name:'target_user',value:email},{name:'new_value',value}]));assert.equal(detect(e).length,n);}});
test('OAuth: escopo multiValue e allowlist',()=>{for(const [client,n] of [['bad',1],['approved',0]]){const e=norm('token',activity('authorize',[{name:'client_id',value:client},{name:'scope',multiValue:['https://www.googleapis.com/auth/drive']} ]));assert.equal(detect(e).length,n);}});
test('Falhas em páginas separadas: limiar 10, ator ausente não agrupa',()=>{const all=Array.from({length:10},(_,i)=>norm('login',activity('login_failure',[],String(i)))[0]);assert.equal(detect(all.slice(0,9)).length,0);assert.equal(detect(all.slice(9),all)[0].count,10);const unknown=norm('login',activity('login_failure',[],'u',''));assert.equal(detect(unknown).length,0);});
test('Downloads contam arquivos distintos, não repetições',()=>{const all=Array.from({length:60},(_,i)=>norm('drive',activity('download',[{name:'doc_id',value:'file'+i%49}],String(i)))[0]);assert.equal(detect(all).length,0);all.push(norm('drive',activity('download',[{name:'doc_id',value:'file50'}],'61'))[0]);assert.equal(detect(all.slice(-1),all)[0].count,50);});
test('Proteção contra fórmulas e tipagem de datas',()=>{assert.equal(context.text_('=IMPORTXML("url")').slice(0,1),"'");assert.equal(context.text_(' +cmd').slice(0,1),"'");assert(context.date_(eventTime) instanceof Date);assert.throws(()=>context.date_('invalid'));});
test('Janela fixa até terminar páginas',()=>{const s=context.beginWindow_('login',{},Date.now());s.token='p2';const original=s.end;assert.equal(context.beginWindow_('login',s,Date.now()+999999).end,original);assert.equal(s.token,'p2');});
test('Falha de flush: checkpoint não avança; replay repara sem duplicar',()=>{
 const ss=book(),s=context.beginWindow_('login',{},Date.now());
 const a=activity('suspicious_login');responses=[{status:200,body:{items:[a],nextPageToken:'p2'}}];flushFail=true;
 assert.throws(()=>context.processPage_(ss,'login',s,config,rules,Date.now()+60000));assert.equal(values.CP_login,undefined);
 assert.equal(ss.sheets.Eventos.data.length,2);assert.equal(ss.sheets.Alertas.data.length,2);
 flushFail=false;responses=[{status:200,body:{items:[a],nextPageToken:'p2'}}];
 assert.equal(context.processPage_(ss,'login',s,config,rules,Date.now()+60000),false);
 assert.equal(ss.sheets.Eventos.data.length,2);assert.equal(ss.sheets.Alertas.data.length,2);
 assert.equal(JSON.parse(values.CP_login).token,'p2');assert(!JSON.parse(values.CP_login).watermark);
 responses=[{status:200,body:{items:[]}}];context.processPage_(ss,'login',s,config,rules,Date.now()+60000);
 assert(JSON.parse(values.CP_login).watermark);assert(!JSON.parse(values.CP_login).token);
});
test('Falha entre evento e alerta: reavaliação de evento já salvo',()=>{
 const ss=book(),a=activity('suspicious_login'),e=norm('login',a);context.append_(ss,'Eventos',e);
 const s=context.beginWindow_('login',{},Date.now());responses=[{status:200,body:{items:[a]}}];context.processPage_(ss,'login',s,config,rules,Date.now()+60000);
 assert.equal(ss.sheets.Eventos.data.length,2);assert.equal(ss.sheets.Alertas.data.length,2);
});
test('Atualização nativa mantém triagem; versão antiga não regride',()=>{
 const ss=book(),item={alertId:'a',type:'Suspicious login',createTime:eventTime};
 const first=detect(context.normalizedAlerts_([item],now));context.storeDetections_(ss,first);ss.sheets.Alertas.data[1][11]='RESOLVIDO';
 item.updateTime=new Date(Date.parse(eventTime)+1000).toISOString();context.storeDetections_(ss,detect(context.normalizedAlerts_([item],now)));
 context.storeDetections_(ss,first);assert.equal(ss.sheets.Alertas.data.length,2);assert.equal(ss.sheets.Alertas.data[1][11],'RESOLVIDO');assert.equal(ss.sheets.Alertas.data[1][10].toISOString(),item.updateTime);
});
test('HTTP 429 tenta novamente; 403 de permissão não repete',()=>{
 sleeps=[];responses=[{status:429},{status:200,body:{ok:true}}];assert(context.request_('https://test',{},Date.now()+60000).ok);assert.equal(sleeps.length,1);
 responses=[{status:403}];assert.throws(()=>context.request_('https://test',{},Date.now()+60000),e=>e.code==='HTTP_403');assert.equal(responses.length,0);
});
test('Retry-After longo adia para outra execução',()=>{responses=[{status:429,headers:{'Retry-After':'120'}}];assert.throws(()=>context.request_('https://test',{},Date.now()+60000),e=>e.retryMs===120000);});
test('Alert Center: assinatura sem chave e troca JWT por token',()=>{
 values.ALERTS_SERVICE_ACCOUNT='monitor@project.iam.gserviceaccount.com';values.ALERTS_SUBJECT='reader@corp.test';requests=[];
 responses=[{status:200,body:{signedJwt:'signed'}},{status:200,body:{access_token:'access',expires_in:3600}}];
 assert.equal(context.alertsToken_(Date.now()+60000,false),'access');const p=JSON.parse(JSON.parse(requests[0].opts.payload).payload);
 assert.equal(p.sub,'reader@corp.test');assert.equal(p.scope,'https://www.googleapis.com/auth/apps.alerts');assert.equal(requests[1].opts.payload.assertion,'signed');
});
test('Nenhum filtro updateTime enviado à Central',()=>{
 requests=[];responses=[{status:200,body:{signedJwt:'x'}},{status:200,body:{access_token:'y'}},{status:200,body:{alerts:[]}}];
 context.page_('alerts',{start:eventTime,end:now.toISOString()},Date.now()+60000);
 assert(decodeURIComponent(requests[2].url).includes('createTime >='));assert(!requests[2].url.includes('updateTime'));
});
test('Janela UTC: eventos em lados distintos não somam',()=>{
 const a=Array.from({length:10},(_,i)=>norm('login',activity('login_failure',[],String(i),'alice@corp.test',i<5?'2026-10-10T10:14:59Z':'2026-10-10T10:15:00Z'))[0]);assert.equal(detect(a).length,0);
});
test('Renomear arquivo não persiste seu novo título',()=>{const e=norm('drive',activity('rename',[{name:'new_value',value:'Paciente confidencial'}]));assert(!JSON.stringify(e).includes('Paciente'));});
test('Janela pendente mais antiga que retenção interrompe, sem pular dados',()=>{assert.throws(()=>context.beginWindow_('drive',{start:new Date(Date.now()-15*86400000).toISOString()},Date.now()),e=>e.code==='ATRASO_EXCEDE_RETENCAO');});
test('Mesmo alerta repetido na página gera uma linha',()=>{const ss=book();const e=norm('login',activity('suspicious_login'));const ds=detect(e);context.storeDetections_(ss,ds.concat(ds));assert.equal(ss.sheets.Alertas.data.length,2);});
test('Retenção apaga blocos expirados sem tocar incidentes',()=>{
 const ss=book();const old=new Date(Date.now()-100*86400000),recent=new Date();
 const row=(id,d)=>[id,d,d,'login','login_success','','','','{}','ref',d];
 ss.sheets.Eventos.data.push(row('a',old),row('b',recent),row('c',old));
 ss.sheets.Incidentes.data.push(['case','a',old]);
 values.SPREADSHEET_ID='test';context.SpreadsheetApp.openById=()=>ss;
 context.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
 const original=context.updateDashboard_;context.updateDashboard_=()=>{};
 context.aplicarRetencao();context.updateDashboard_=original;
 assert.equal(ss.sheets.Eventos.data.length,2);assert.equal(ss.sheets.Eventos.data[1][0],'b');assert.equal(ss.sheets.Incidentes.data.length,2);
});
test('Fonte com 403 não impede demais fontes e token inválido reinicia sem avanço',()=>{
 const ss=book();ss.sheets.Config.data.push(['INTERNAL_DOMAINS','corp.test',''],['SENSITIVE_SCOPES','https://www.googleapis.com/auth/drive','']);
 ss.sheets.Regras.data.push(...baseline.map(b=>[b.id,b.active,b.severity,1,0,b.name]),...custom);
 values={PSEUDONYM_KEY:'key',SPREADSHEET_ID:'test'};
 const stamp=Date.now();let driveCalls=0;
 values.CP_drive=JSON.stringify({start:new Date(stamp-86400000).toISOString(),end:new Date(stamp-300000).toISOString(),token:'expired'});
 context.SpreadsheetApp.openById=()=>ss;
 const saved={page:context.page_,dash:context.updateDashboard_,health:context.updateHealth_};
 context.updateDashboard_=()=>{};context.updateHealth_=()=>{};
 context.page_=(feed)=>{if(feed==='login')throw context.apiError_('HTTP_403');if(feed==='drive'){driveCalls++;throw context.apiError_('HTTP_400');}return {};};
 context.executarMonitor();
 context.page_=saved.page;context.updateDashboard_=saved.dash;context.updateHealth_=saved.health;
 assert.equal(JSON.parse(values.CP_login).status,'ERRO');assert.equal(JSON.parse(values.CP_admin).status,'OK');
 const d=JSON.parse(values.CP_drive);assert.equal(d.token,'');assert.equal(d.tokenReset,true);assert(!d.watermark);assert.equal(driveCalls,1);
});
console.log(`${passed} testes aprovados.`);
