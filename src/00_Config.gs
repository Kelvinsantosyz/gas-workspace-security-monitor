/** Monitor Workspace 1.0.0. Projeto Apps Script independente, V8. */
const MW = Object.freeze({
  version: '1.0.0', budgetMs: 210000, pageSize: 100, maxPages: 20,
  overlapHours: 6, replayDays: 7, initialHours: 24, stepHours: 24,
  eventDays: 14, alertDays: 90, operationDays: 30, maxRows: 40000,
  feeds: ['alerts', 'login', 'admin', 'drive', 'token'],
  source: 'https://developers.google.com/workspace/admin/alertcenter/reference/alert-types'
});
const HEADERS = {
  Config: ['Chave', 'Valor', 'Orientação'],
  Regras: ['ID', 'Ativa', 'Severidade', 'Limiar', 'Janela_min', 'Descrição'],
  Catalogo: ['ID', 'Alerta do arquivo', 'Estado no arquivo', 'Notificação no arquivo', 'Tipo API', 'Mapeamento', 'Recomendação'],
  Eventos: ['ID', 'Data_evento_UTC', 'Coletado_UTC', 'Fonte', 'Evento', 'Ator_pseudo', 'Alvo_pseudo', 'Recurso_pseudo', 'Atributos_minimos', 'Referencia_origem', 'Revisao_UTC'],
  Alertas: ['ID', 'Primeira_deteccao_UTC', 'Ultima_revisao_UTC', 'Regra', 'Severidade', 'Sinal', 'Ator_pseudo', 'Quantidade', 'Evidencia_ID', 'Referencia_origem', 'Versao_origem', 'Estado', 'Responsavel', 'Ticket'],
  Saude: ['Coletor', 'Ultima_pagina_UTC', 'Janela_completa_ate_UTC', 'Estado', 'Falhas', 'Proxima_tentativa_UTC', 'Pagina_pendente', 'Codigo', 'Reinicios_token'],
  Operacoes: ['Data_UTC', 'Componente', 'Resultado', 'Codigo'],
  Incidentes: ['ID', 'Alerta_ID', 'Ciencia_controlador_UTC', 'Dados_pessoais', 'Categorias', 'Titulares_estimados', 'Risco_relevante', 'Decisao_e_fundamento', 'Encarregado', 'Prazo_validado', 'Comunicacao_ANPD', 'Comunicacao_titulares', 'Medidas', 'Evidencia_restrita', 'Encerramento', 'Revisar_retencao_em']
};
const CUSTOM_RULES = [
  ['R_LOGIN', true, 'ALTA', 1, 0, 'Login suspeito sinalizado pelo Google'],
  ['R_FAILURE', true, 'MEDIA', 10, 15, 'Falhas por ator em janela fixa UTC'],
  ['R_PUBLIC', true, 'ALTA', 1, 0, 'Mudança de visibilidade para acesso público ou por link'],
  ['R_EXTERNAL', true, 'MEDIA', 1, 0, 'Concessão de acesso a destinatário externo'],
  ['R_DOWNLOAD', true, 'ALTA', 50, 60, 'Arquivos distintos baixados por ator em janela fixa UTC'],
  ['R_OAUTH', true, 'ALTA', 1, 0, 'Autorização de escopo sensível para cliente fora da lista aprovada'],
  ['R_MFA', true, 'ALTA', 1, 0, 'Remoção administrativa de autenticação forte'],
  ['R_ADMIN_USERS', false, 'ALTA', 1, 0, 'Mudanças administrativas de usuários; inativa conforme baseline'],
  ['R_ADMIN_SETTINGS', false, 'ALTA', 1, 0, 'Mudanças em configurações de apps; inativa conforme baseline'],
  ['AC_UNKNOWN', true, 'MEDIA', 1, 0, 'Tipo da Central sem mapeamento: validar cobertura'],
  ['AC_DLP', true, 'ALTA', 1, 0, 'Violação DLP emitida pelo Google (depende da licença e regras nativas)']
];
function props_() { return PropertiesService.getScriptProperties(); }
function required_(key) {
  const v = props_().getProperty(key);
  if (!v) throw new Error('CONFIG_' + key);
  return v;
}
function config_(ss) {
  const c = {};
  rows_(ss, 'Config').forEach(r => c[r[0]] = r[1]);
  c.domains = String(c.INTERNAL_DOMAINS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  if (!c.domains.length || c.domains.includes('example.com')) throw new Error('CONFIG_INTERNAL_DOMAINS');
  c.approved = String(c.APPROVED_CLIENT_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  c.scopes = String(c.SENSITIVE_SCOPES || '').split(',').map(x => x.trim()).filter(Boolean);
  return c;
}
function rules_(ss) {
  const result = {};
  rows_(ss, 'Regras').forEach(r => {
    if (result[r[0]]) throw new Error('REGRA_DUPLICADA');
    if (typeof r[1] !== 'boolean' || !['CRITICA','ALTA','MEDIA','BAIXA'].includes(r[2])) throw new Error('REGRA_INVALIDA');
    if (!Number.isInteger(Number(r[3])) || Number(r[3]) < 1) throw new Error('LIMIAR_INVALIDO');
    if (['R_FAILURE','R_DOWNLOAD'].includes(r[0]) && ![5,10,15,30,60].includes(Number(r[4]))) throw new Error('JANELA_INVALIDA');
    result[r[0]] = {id:r[0], on:r[1], severity:r[2], threshold:Number(r[3]), minutes:Number(r[4])};
  });
  [...CUSTOM_RULES.map(r => r[0]), ...BASELINE.map(r => r.id)].forEach(id => {
    if (!result[id]) throw new Error('REGRA_AUSENTE');
  });
  return result;
}
