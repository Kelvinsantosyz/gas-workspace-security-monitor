function prepararPlanilha() {
  const lock=LockService.getScriptLock();lock.waitLock(1000);
  try {
    const ss=SpreadsheetApp.openById(required_('SPREADSHEET_ID'));
    if(!props_().getProperty('PSEUDONYM_KEY')) {
      if(ss.getSheetByName('Eventos') && ss.getSheetByName('Eventos').getLastRow()>1) throw new Error('CHAVE_PSEUDONIMO_PERDIDA');
      props_().setProperty('PSEUDONYM_KEY',Utilities.getUuid()+Utilities.getUuid());
    }
    if(!ss.getSheetByName('Dashboard')) ss.insertSheet('Dashboard',0);
    ss.setSpreadsheetTimeZone('Etc/UTC');
    ss.setSpreadsheetLocale('en_US'); // Fórmulas portáveis; rótulos em português, datas explícitas.
    ss.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.MINUTE);
    Object.keys(HEADERS).forEach(name=>{
      const sh=ss.getSheetByName(name)||ss.insertSheet(name), headers=HEADERS[name];
      ensureSize_(sh,['Eventos','Alertas'].includes(name)?40000:200,headers.length);
      if(sh.getLastRow() && JSON.stringify(sh.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers)) throw new Error('CABECALHO_INCOMPATIVEL');
      sh.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#123047').setFontColor('#ffffff').setFontWeight('bold');
      sh.setFrozenRows(1);sh.setColumnWidths(1,headers.length,160);
      if(!sh.getFilter()) sh.getRange(1,1,sh.getMaxRows(),headers.length).createFilter();
    });
    if(!rows_(ss,'Config').length) append_(ss,'Config',[
      ['INTERNAL_DOMAINS','example.com','Obrigatório: domínio principal e aliases, separados por vírgulas'],
      ['APPROVED_CLIENT_IDS','','Clientes OAuth aprovados, IDs exatos separados por vírgulas'],
      ['SENSITIVE_SCOPES','https://mail.google.com/,https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/admin.directory.user','Lista inicial editável; correspondência exata'],
      ['POLICY_VERSION','1','Registrar mudanças no controle de mudanças externo'],
      ['DPO_CONTACT','','Contato interno do encarregado; não usado para envio']
    ]);
    if(!rows_(ss,'Catalogo').length) append_(ss,'Catalogo',BASELINE.map(b=>[b.id,b.name,b.active?'Ativo':'Inativo',b.notification,b.api || 'Não confirmado',b.mapping,b.recommendation]));
    if(!rows_(ss,'Regras').length) append_(ss,'Regras',BASELINE.map(b=>[b.id,b.active,b.severity,1,0,b.name]).concat(CUSTOM_RULES));
    const rs=ss.getSheetByName('Regras');
    rs.getRange(2,2,rs.getLastRow()-1,1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());
    rs.getRange(2,3,rs.getLastRow()-1,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['CRITICA','ALTA','MEDIA','BAIXA'],true).setAllowInvalid(false).build());
    ss.getSheetByName('Alertas').getRange('L2:L40000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['ABERTO','EM_ANALISE','RESOLVIDO','FALSO_POSITIVO'],true).setAllowInvalid(false).build());
    ['Eventos','Alertas'].forEach(name=>{
      const sh=ss.getSheetByName(name);
      sh.getRange(2,2,sh.getMaxRows()-1,2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      sh.getRange(2,11,sh.getMaxRows()-1,1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    });
    ss.getSheetByName('Saude').getRange('B2:C20').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    ss.getSheetByName('Saude').getRange('F2:F20').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    ss.getSheetByName('Operacoes').getRange('A2:A100').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    ss.getSheetByName('Catalogo').setColumnWidth(2,410);
    ss.getSheetByName('Catalogo').setColumnWidth(7,410);
    ss.getSheetByName('Regras').setColumnWidth(6,470);
    updateHealth_(ss);updateDashboard_(ss);
  } finally {lock.releaseLock();}
}
function updateHealth_(ss) {
  const data=MW.feeds.concat(MW.feeds.map(f=>'replay_'+f)).map(f=>{
    const s=loadState_(f);
    return [f,s.lastPage?date_(s.lastPage):'',s.watermark?date_(s.watermark):'',s.status||'SEM_COLETA',s.failures||0,s.retryAt?new Date(s.retryAt):'',!!s.token,s.code||'',s.resets||0];
  });
  ss.getSheetByName('Saude').getRange(2,1,data.length,9).setValues(data);
}
function updateDashboard_(ss) {
  ['Eventos','Alertas'].forEach(n=>ensureSize_(ss.getSheetByName(n),40000,HEADERS[n].length));
  const sh=ss.getSheetByName('Dashboard');
  ensureSize_(sh,45,8);sh.setHiddenGridlines(true);sh.setColumnWidths(1,8,155);sh.setColumnWidth(1,290);
  const data=[
    ['Monitoramento de segurança e LGPD',''],
    ['Atualizado em UTC',new Date()],
    ['Estado da atualização','=IF((NOW()-B2)*1440>45,"DESATUALIZADO","RECENTE")'],
    ['Cobertura das fontes','=IF(COUNTIF(Saude!D2:D6,"SEM_COLETA")>0,"NAO VALIDADA",IF(COUNTIF(Saude!D2:D6,"ERRO")>0,"COM FALHAS",IF(COUNT(Saude!C2:C6)<5,"INCOMPLETA",IF((NOW()-MIN(Saude!C2:C6))*24>24,"ATRASADA","COLETADA"))))'],
    ['Alertas abertos','=COUNTIF(Alertas!L2:L40000,"ABERTO")+COUNTIF(Alertas!L2:L40000,"EM_ANALISE")'],
    ['Críticos em aberto','=COUNTIFS(Alertas!E2:E40000,"CRITICA",Alertas!L2:L40000,"ABERTO")+COUNTIFS(Alertas!E2:E40000,"CRITICA",Alertas!L2:L40000,"EM_ANALISE")'],
    ['Novos nas últimas 24h','=COUNTIF(Alertas!B2:B40000,">="&NOW()-1)'],
    ['Eventos retidos','=COUNTA(Eventos!A2:A40000)'],
    ['Regras ativas','=COUNTIF(Regras!B2:B200,TRUE)'],
    ['Lacunas do catálogo',BASELINE.filter(b=>!b.api).length],
    ['Baseline do arquivo','40 ativos / 11 inativos'],
    ['Leitura dos resultados','Zero alertas só é interpretável com fontes homologadas.'],
    ['Retenção','Eventos: 14 d; alertas: 90 d; operações: 30 d.'],
    ['Incidentes','Registro separado; sem exclusão automática.'],
    ['Encaminhamento','Triar em Alertas; documentar decisão em Incidentes.'],
    ['Severidade','Alertas retidos']
  ];
  sh.getRange(1,1,data.length,2).setValues(data);
  sh.getRange('A1:H1').setBackground('#123047').setFontColor('white').setFontWeight('bold');
  sh.getRange('B2').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange('A3:A10').setFontWeight('bold');
  ['CRITICA','ALTA','MEDIA','BAIXA'].forEach((s,i)=>{
    sh.getRange(17+i,1,1,2).setValues([[s,'=COUNTIF(Alertas!E2:E40000,A'+(17+i)+')']]);
  });
  sh.getRange('D16:E16').setValues([['Data de detecção (UTC)','Novos alertas']]);
  for(let i=0;i<7;i++) {
    const r=17+i;
    sh.getRange(r,4,1,2).setValues([['=TODAY()-'+(6-i),'=COUNTIFS(Alertas!B2:B40000,">="&D'+r+',Alertas!B2:B40000,"<"&D'+r+'+1)']]);
  }
  sh.getRange('D17:D23').setNumberFormat('dd/mm');
  sh.getRange('B12:H15').setWrap(true);
  sh.getRange('D3:E5').setValues([
    ['Reconciliações com erro','=COUNTIF(Saude!D7:D11,"ERRO")'],
    ['Reconciliações pendentes','=COUNTIF(Saude!D7:D11,"SEM_COLETA")+COUNTIF(Saude!D7:D11,"PAGINANDO")'],
    ['Capacidade Eventos','=IF(COUNTA(Eventos!A2:A40000)>32000,"MIGRAR / REDUZIR ATRASO","DENTRO DO LIMITE")']
  ]);
  if(!sh.getCharts().length) {
    sh.insertChart(sh.newChart().setChartType(Charts.ChartType.COLUMN).addRange(sh.getRange('A16:B20')).setPosition(26,1,0,0).setOption('title','Alertas por severidade').setOption('legend',{position:'none'}).build());
    sh.insertChart(sh.newChart().setChartType(Charts.ChartType.LINE).addRange(sh.getRange('D16:E23')).setPosition(26,5,0,0).setOption('title','Novos alertas em 7 dias').setOption('legend',{position:'none'}).build());
  }
}
function instalarGatilhos() {
  // Instalação explícita após validarConexoes e teste no domínio.
  removerGatilhos();
  ScriptApp.newTrigger('executarMonitor').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('aplicarRetencao').timeBased().atHour(3).everyDays(1).inTimezone('Etc/UTC').create();
}
function removerGatilhos() {
  ScriptApp.getProjectTriggers().filter(t=>['executarMonitor','aplicarRetencao'].includes(t.getHandlerFunction())).forEach(t=>ScriptApp.deleteTrigger(t));
}
function aplicarRetencao() {
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000)) return;
  try {
    const ss=SpreadsheetApp.openById(required_('SPREADSHEET_ID'));
    [['Eventos',1,MW.eventDays],['Alertas',2,MW.alertDays],['Operacoes',0,MW.operationDays]].forEach(([name,col,days])=>{
      const data=rows_(ss,name),cut=Date.now()-days*86400000,sh=ss.getSheetByName(name);
      // Exclusão de blocos de baixo para cima é retomável e não duplica sobreviventes.
      let end=-1;
      for(let i=data.length-1;i>=-1;i--) {
        const expired=i>=0 && date_(data[i][col]).getTime()<cut;
        if(expired && end<0) end=i;
        if(!expired && end>=0) {sh.deleteRows(i+3,end-i);end=-1;}
      }
    });
    operation_(ss,'retencao','OK','POLITICA_V1');updateDashboard_(ss);
  } finally {lock.releaseLock();}
}
