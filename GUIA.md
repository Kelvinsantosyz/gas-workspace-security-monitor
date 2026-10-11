# Monitoramento de segurança e LGPD para Google Workspace

Versão 1.0.0 • Código e documentação preparados em 10/10/2026 • Português brasileiro

## 1. O que está pronto

O pacote contém código Apps Script V8, manifesto com escopos explícitos, catálogo dos 51 alertas do arquivo fornecido, regras editáveis, coleta paginada, retomada com checkpoints, deduplicação, tratamento de erros, pseudonimização, retenção e criação automática do dashboard no Google Sheets. É um monitor de sinais e um apoio à gestão de incidentes. Não atesta conformidade LGPD nem determina sozinho se houve vazamento.

**Estado da entrega:** código testado localmente com respostas simuladas. Não foi instalado nem executado contra seu domínio. Nenhum alerta nativo foi ativado/desativado. Nenhuma mensagem foi enviada. A autenticação, cobertura da licença, fórmulas e gráficos precisam passar pela homologação descrita abaixo.

Não há bibliotecas Apps Script externas, chaves privadas salvas, consulta de conteúdo de arquivos ou leitura de caixas de e-mail. As notificações nativas existentes continuam sob administração do Google Workspace. Os alertas adicionais aparecem na aba `Alertas`; esta versão não envia e-mail, Chat ou SMS.

### Arquivos

| Arquivo | Finalidade |
|---|---|
| `src/00_Config.gs` | Limites operacionais, colunas e regras próprias |
| `src/01_Catalogo.gs` | Estado original, tipo API, severidade inicial e recomendação dos 51 itens |
| `src/02_Core.gs` | Normalização, HMAC, IDs e escrita segura |
| `src/03_Api.gs` | REST, autenticação sem chave privada, retries e limites |
| `src/04_Coleta.gs` | Agendamento lógico, paginação, checkpoints e recuperação |
| `src/05_Regras.gs` | Detecções individuais e por volume |
| `src/06_Planilha.gs` | Instalação das abas, dashboard, gatilhos e retenção |
| `src/appsscript.json` | Manifesto a copiar para o projeto |
| `BASELINE.json` e `MATRIZ_ALERTAS.md` | Inventário legível e processável do arquivo |
| `tests/test.cjs` | Testes locais sem dependências externas |

## 2. Arquitetura e limites de confiança

```text
Reports API (login/admin/drive/token) ── OAuth do proprietário do gatilho ─┐
                                                                       ├─ normalização mínima
Alert Center API ── conta de serviço + delegação no domínio ─────────────┘
       └─ IAM signJwt → troca JWT por token, sem chave privada local
               ↓
      Eventos → regras → Alertas → Dashboard / Incidentes
               ↓
       flush confirmado → checkpoint por coletor
```

O código reside em um **projeto Apps Script independente**, separado da planilha. Isso evita dar a todos os editores da planilha acesso automático ao código privilegiado. Compartilhe o projeto apenas com mantenedores autorizados. Um editor do projeto pode alterar o código executado pelo gatilho do proprietário: trate essa permissão como administrativa.

A planilha contém dados de segurança e pseudônimos que continuam sendo dados pessoais quando vinculáveis a pessoas. Restrinja seu acesso à equipe de segurança e ao encarregado. Ocultar abas não controla acesso. Para gestores que só precisam de indicadores, use um relatório agregado separado, sem compartilhar este arquivo inteiro.

As regras próprias são locais. A API da Central fornece alertas emitidos pelo Google; esta implementação não cria regras nativas no Admin Console. Os métodos e filtros utilizados estão descritos na documentação oficial de [activities.list](https://developers.google.com/workspace/admin/reports/reference/rest/v1/activities/list) e [alerts.list](https://developers.google.com/workspace/admin/alertcenter/reference/rest/v1beta1/alerts/list).

## 3. Tratamento do arquivo fornecido

Foram identificados **51 itens: 40 ativos e 11 inativos**. A aba `Catalogo` preserva esse retrato. A aba `Regras` inicia com os mesmos estados para os itens `AC_01` a `AC_51`. As prioridades são propostas desta solução, não informações extraídas do arquivo. O campo de notificação do App Maker foi preservado como `-- / Ativado`, pois o arquivo não contém “Enviar notificação” nesse item.

Há 48 correspondências com tipos publicados, incluindo uma referência legada do App Maker. Três itens não têm correspondência explícita confirmada na tabela pública consultada:

- Exclusão acelerada do Vault iniciada (`AC_01`).
- Possível spoofing de funcionário no Gmail (`AC_36`).
- Sincronização do diretório cancelada pelo limite de proteção (`AC_41`).

Esses três permanecem no catálogo com o estado original, mas não se presume um nome de API. Se a Central devolver um tipo desconhecido, `AC_UNKNOWN` gera um sinal para revisão. Isso **não garante** que os três alertas sejam expostos pela API. Confira-os no console e com o suporte. Também confirme se o alerta legado do App Maker ainda tem aplicabilidade no seu ambiente. O mapeamento usa identificadores exatos da [tabela oficial de tipos](https://developers.google.com/workspace/admin/alertcenter/reference/alert-types), não traduções automáticas dos rótulos.

Recomenda-se homologar e depois habilitar os 11 alertas nativos hoje inativos, priorizando concessão/revogação de administrador, exclusão de usuário e mudanças de Gmail/Drive. Isso é uma recomendação, não uma alteração aplicada. Ativar uma linha `AC_*` local não faz o Google emitir um alerta que a regra nativa não produz. As regras Reports `R_ADMIN_USERS` e `R_ADMIN_SETTINGS` também começam inativas para não contrariar silenciosamente o retrato fornecido; podem complementar a cobertura após decisão da equipe.

O catálogo é um retrato importado, não uma consulta contínua ao estado das regras nativas. Faça uma revisão mensal das configurações do console e atualize a matriz com controle de mudanças.

## 4. Regras implementadas

| Regra | Condição inicial | Prioridade | Resposta sugerida / limite |
|---|---|---|---|
| `AC_01…AC_51` | Tipo nativo correspondente e regra local ativa | Conforme catálogo | Investigar o alerta original pela referência; disponibilidade depende de edição e privilégios |
| `AC_UNKNOWN` | Tipo não mapeado | Média | Validar novo tipo; não classificar automaticamente como incidente |
| `AC_DLP` | Tipo nativo DLP | Alta | Exige licença e regras DLP previamente configuradas; o monitor não inspeciona conteúdo |
| `R_LOGIN` | Sinais suspeitos do Google, inclusive sucesso com `is_suspicious` | Alta | Validar sessão, dispositivo e atividade com o usuário |
| `R_FAILURE` | 10 falhas do mesmo ator em 15 minutos | Média | Verificar erro de senha, automação ou ataque; atores ausentes não são agregados |
| `R_PUBLIC` | Alteração de link para público/qualquer pessoa com link | Alta | Verificar finalidade e classificação do documento |
| `R_EXTERNAL` | Concessão explícita para endereço fora dos domínios configurados | Média | Confirmar destinatário e autorização; revogações não disparam |
| `R_DOWNLOAD` | 50 arquivos distintos por ator em 60 minutos | Alta | Verificar exportação autorizada, sincronização ou possível extração |
| `R_OAUTH` | Autorização de escopo sensível por cliente não aprovado | Alta | Revisar aplicativo, necessidade e escopos concedidos |
| `R_MFA` | Remoção administrativa de autenticação forte | Alta | Confirmar exceção e restabelecer proteção quando aplicável |
| `R_ADMIN_USERS` | Eventos administrativos de usuários selecionados | Alta, inativa | Revisar mudança aprovada; não cobre alterações de senha feitas pelo próprio usuário |
| `R_ADMIN_SETTINGS` | Eventos de alteração de apps selecionados | Alta, inativa | Revisar configuração e mudança autorizada; não interpreta automaticamente o conteúdo alterado |

Os contadores usam **janelas fixas alinhadas em UTC**, não janelas móveis. Exemplo: 10:00–10:14:59 e 10:15–10:29:59. Um ataque repartido entre janelas pode não atingir o limiar. Downloads contam recursos distintos com `doc_id`; múltiplos downloads do mesmo arquivo contam uma vez. Sem identificação do ator ou documento, a regra de volume não assume identidades fictícias. Ajuste os limiares após medir o comportamento normal.

Em `Regras`, edite Ativa, Severidade e os limiares/janelas de `R_FAILURE` e `R_DOWNLOAD`. As outras regras são unitárias: Limiar e Janela não mudam sua condição. Não renomeie IDs nem apague linhas. Mudanças de semântica exigem alterar o código e, se precisar criar uma nova geração de alertas, versionar a chave da regra. `POLICY_VERSION` serve ao registro humano e não muda IDs automaticamente.

### Nomes de eventos conferidos

- Login: `login_failure`, `login_success`, `suspicious_login`, `suspicious_programmatic_login`, `suspicious_login_less_secure_app`. Parâmetro `is_suspicious` e identificador `affected_email_address`: [referência Login](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/login).
- Drive: `download`, `change_document_visibility`, `change_user_access`; parâmetros `doc_id`, `new_value`, `target_user`, `visibility`, `visibility_change`: [referência Drive](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/drive).
- OAuth: `authorize`, `client_id`, `scope`: [referência Token](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/token).
- Administração de usuários: `GRANT_ADMIN_PRIVILEGE`, `REVOKE_ADMIN_PRIVILEGE`, `CHANGE_PASSWORD`, `CREATE_USER`, `DELETE_USER`, `SUSPEND_USER`, `UNSUSPEND_USER`, `UNENROLL_USER_FROM_STRONG_AUTH`: [referência User Settings](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-user-settings).
- Apps: `CHANGE_APPLICATION_SETTING`, `CREATE_APPLICATION_SETTING`, `DELETE_APPLICATION_SETTING`: [referência Application Settings](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-application-settings). Drive, Agenda e dispositivos: [Docs Settings](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-docs-settings), [Calendar Settings](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-calendar-settings), [Mobile Settings](https://developers.google.com/workspace/admin/reports/v1/appendix/activity/admin-mobile-settings).

As alterações recentes nos eventos administrativos, inclusive migração de eventos do Gmail para Application Settings, são relevantes para manutenção. A solução usa os eventos de aplicação documentados e não pressupõe equivalência completa com todos os rótulos do console. Consulte o [histórico oficial de mudanças dos eventos Admin](https://knowledge.workspace.google.com/admin/reports/admin-log-event-changes).

Limitações: não inventaria todos os compartilhamentos existentes, não resolve membros de grupos externos, não detecta sozinho geolocalização/impossible travel, não comprova ausência de MFA em todas as contas, não captura todo tipo de publicação do Drive e não lê conteúdo para identificar CPF ou outros dados pessoais. Um sinal de download não comprova exfiltração. Os sinais da Central e de Reports podem representar o mesmo fato e aparecer em alertas distintos: a deduplicação é por fonte/regra, sem correlação semântica entre APIs.

## 5. Permissões mínimas e autenticação

Use uma conta técnica Workspace dedicada, com autenticação forte, para executar os gatilhos. Conceda somente os privilégios administrativos necessários aos relatórios. Use uma identidade delegada dedicada à Central com `Alert Center > View access`. Privilégios adicionais podem ser necessários para alertas baseados em regras, inclusive DLP; homologue cada classe e não conceda Super Admin como solução automática para 403. Veja [privilégios da Central](https://knowledge.workspace.google.com/admin/security/grant-access-to-the-alert-center).

| Camada | Permissão | Justificativa |
|---|---|---|
| OAuth Apps Script | `admin.reports.audit.readonly` | Ler atividades auditadas |
| OAuth Apps Script | `spreadsheets` | Abrir e manter a planilha por ID no projeto independente; esse escopo alcança outras planilhas acessíveis à conta |
| OAuth Apps Script | `script.external_request` | Chamadas REST ao Google |
| OAuth Apps Script | `script.scriptapp` | Criar/remover os dois gatilhos do projeto |
| OAuth Apps Script | `iam` | Assinar JWT pela IAM Credentials API, sujeito ao IAM do recurso |
| IAM na conta de serviço | `iam.serviceAccounts.signJwt` | Permitir a assinatura somente na conta de serviço dedicada |
| Delegação no domínio | `https://www.googleapis.com/auth/apps.alerts` | Escopo exigido pela Central |

O escopo `apps.alerts` permite leitura e escrita: não há variante `readonly` documentada. O código só usa GET na Central. A [documentação de autenticação da Central](https://developers.google.com/workspace/admin/alertcenter/guides/auth) exige conta de serviço e delegação no domínio. O usuário delegado recebe privilégios de visualização, que devem ser validados na sua organização.

A delegação autoriza a conta de serviço para o escopo no domínio; não fica tecnicamente limitada ao `sub` configurado no código. Quem consegue assinar JWTs com essa conta pode escolher outro sujeito dentro dos limites da delegação. Por isso, o acesso ao projeto e a `signJwt` precisa ficar restrito. Não acrescente Gmail, Drive ou Directory à delegação “por garantia”.

O método [IAM signJwt](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signJwt) usa a chave gerenciada pelo Google. O JWT contém sujeito, escopo, audiência e expiração e é trocado por access token conforme o [fluxo OAuth de conta de serviço](https://developers.google.com/identity/protocols/oauth2/service-account). O token fica apenas no cache temporário do projeto. Não há arquivo JSON de chave privada para baixar ou inserir na planilha.

## 6. Implantação passo a passo

### 6.1 Criar os recursos

1. Com a conta técnica, crie uma planilha Google vazia, de acesso restrito. Copie seu ID da URL, entre `/d/` e `/edit`.
2. Crie um projeto independente em [Apps Script](https://script.google.com/). Não publique como web app. O uso será por funções manuais e gatilhos.
3. Crie ou escolha um projeto padrão no Google Cloud. Vincule-o nas configurações do projeto Apps Script usando o número do projeto Cloud. Configure a plataforma OAuth para uso interno na organização e autorize os escopos pelo procedimento de controle de apps da sua organização.
4. Ative **Admin SDK API** (`admin.googleapis.com`), **Google Workspace Alert Center API** (`alertcenter.googleapis.com`) e **IAM Service Account Credentials API** (`iamcredentials.googleapis.com`). O código não depende de serviços avançados Apps Script.
5. No projeto Cloud, crie a conta de serviço `workspace-alert-reader`. Não gere chave. Copie o e-mail e o OAuth Client ID numérico dela.
6. Crie um papel IAM personalizado com apenas `iam.serviceAccounts.signJwt`. Conceda esse papel à conta técnica, no recurso da conta de serviço, não em todo o projeto. Se a política organizacional não permitir papel personalizado, avalie formalmente o papel predefinido Token Creator, que é mais amplo; não o adote silenciosamente.
7. Um Super Admin faz a configuração inicial em Segurança > Controles de API > Delegação em todo o domínio: registre o Client ID numérico da conta de serviço e **somente** `https://www.googleapis.com/auth/apps.alerts`. Aprove o fluxo adicional se sua organização exige aprovação por múltiplas partes.
8. Atribua ao usuário que será `ALERTS_SUBJECT` a função personalizada de visualização da Central e os privilégios adicionais estritamente necessários às classes utilizadas. A conta técnica dos gatilhos precisa dos privilégios de Reports. Podem ser a mesma identidade dedicada se isso for aprovado internamente.

Orientação oficial para [criar credenciais e configurar delegação](https://developers.google.com/workspace/guides/create-credentials). Os papéis Cloud IAM não concedem, por si só, privilégios de administração do Workspace.

### 6.2 Copiar e configurar o código

1. No editor Apps Script, crie os sete arquivos com extensão `.gs` de `src/` e cole o conteúdo integral de cada um. Remova qualquer `myFunction` vazio se desejar. Não cole os testes no projeto.
2. Ative “Mostrar arquivo de manifesto appsscript.json” nas configurações. Substitua o manifesto pelo arquivo fornecido.
3. Em Propriedades do script, preencha:

| Propriedade | Exemplo / origem |
|---|---|
| `SPREADSHEET_ID` | ID da planilha de monitoramento |
| `ALERTS_SERVICE_ACCOUNT` | `workspace-alert-reader@SEU_PROJETO.iam.gserviceaccount.com` |
| `ALERTS_SUBJECT` | E-mail do administrador delegado de visualização |

4. Execute `prepararPlanilha` com a conta que será proprietária dos gatilhos e autorize os escopos. A instalação cria as abas sem apagar dados existentes e gera `PSEUDONYM_KEY` nas propriedades. Guarde essa chave em cofre interno se precisar de recuperação, sem enviá-la à equipe por e-mail. Não a altere durante operação: a troca rompe correlações dos atores e contadores.
5. Na aba `Config`, substitua `example.com` em `INTERNAL_DOMAINS` pelo domínio principal **e todos os aliases internos**, separados por vírgulas. Correspondência é exata; subdomínios precisam constar se forem usados. Preencha clientes OAuth aprovados pelos IDs exatos. Revise a lista inicial de escopos sensíveis. As listas são configurações operacionais, não permissões OAuth do próprio monitor.
6. Revise `Regras`. Preserve a configuração original até homologar as mudanças desejadas. Registre alterações em ticket, com autor, data e justificativa.
7. Execute `validarConexoes`. Confira cinco linhas `CONEXAO_OK` em `Operacoes`; HTTP 200 vazio só valida a chamada, não a cobertura de eventos.
8. Execute `executarMonitor`. Ele fará a carga inicial e as reconciliações aos poucos. Não apague checkpoints para “destravar” sem investigar.
9. Execute o roteiro de homologação da seção 11. Após aprovação local, execute `instalarGatilhos`. São criados gatilhos a cada 15 minutos e de retenção diária às 03h UTC. O horário real é administrado pelo Apps Script e não é um SLA de execução exata.

As credenciais do gatilho pertencem a quem o instala. A [autorização Apps Script](https://developers.google.com/apps-script/guides/services/authorization) depende do contexto da execução. Para trocar o operador, remova os gatilhos da conta antiga e instale-os com a nova conta autorizada. `removerGatilhos` só enxerga gatilhos acessíveis ao usuário executor.

### 6.3 Restringir a edição

No Sheets, proteja `Eventos`, `Saude`, `Operacoes`, `Catalogo` e `Dashboard` para a conta técnica/mantenedores. Proteja `Config` e `Regras` para responsáveis pelas regras. Em `Alertas`, proteja colunas A:K e libere L:N apenas aos analistas. Em `Incidentes`, conceda edição apenas aos responsáveis. As proteções são configuradas pela equipe porque a lista de pessoas não foi fornecida. Não compartilhe publicamente, não habilite link aberto e não use “publicar na Web”.

Os analistas podem filtrar, mas não devem reordenar fisicamente/excluir linhas enquanto o coletor roda. Use visualizações de filtro. O lock evita concorrência entre funções deste script, não bloqueia edição humana ou outro projeto que escreva na mesma planilha.

## 7. Dashboard e operação diária

O instalador cria as abas:

- **Dashboard:** atualização, cobertura de coleta, abertos, críticos abertos, novos nas últimas 24h, eventos retidos, regras ativas, lacunas, reconciliações e dois gráficos.
- **Alertas:** Estado, Responsável e Ticket editáveis. Estados: ABERTO, EM_ANALISE, RESOLVIDO, FALSO_POSITIVO. Atualizações da fonte preservam essas três colunas; não reabrem um caso resolvido automaticamente.
- **Saude:** última página, watermark, falhas, próxima tentativa, paginação e reinícios de token, separados para coleta normal e replay.
- **Config / Regras / Catalogo:** parâmetros, detecções e estado importado.
- **Eventos / Operacoes:** evidência mínima e diagnósticos sem payloads.
- **Incidentes:** registro formal com ciência do controlador, classificação, decisão fundamentada, comunicação, evidências e revisão de retenção.

Datas são UTC em valores de data reais. A localidade técnica da planilha é `en_US` para estabilidade das fórmulas, com rótulos em português e formatos explícitos. Não interprete UTC como horário de Brasília.

`RECENTE` significa que o dashboard foi atualizado há menos de 45 minutos. `COLETADA` significa que todas as fontes normais têm janela concluída nas últimas 24 horas e não estão em estado ERRO; **não significa ausência de incidentes, cobertura integral da licença ou ausência de atraso na geração dos logs pelo Google**. Revise também as reconciliações. Fórmulas `NOW()` indicam desatualização ao recalcular, mas não notificam alguém se ninguém abrir a planilha. Habilite notificações de falha dos gatilhos e mantenha uma verificação independente da última execução para necessidade de plantão contínuo.

Triagem sugerida: confirmar sinal na origem, avaliar autorização da ação, vincular ticket, classificar impacto, conter com o processo administrativo da organização e registrar decisão. Prioridades são iniciais; não representam prazos legais. Um sinal crítico merece avaliação imediata pela equipe de segurança.

## 8. Paginação, deduplicação e recuperação

Cada fonte possui checkpoint próprio em Script Properties (`CP_<fonte>`), com início/fim fixos, token, watermark, estado e retry. O watermark só avança após a última página, inclusive quando a API retorna páginas vazias com token de continuação. Uma página é persistida, avaliada e confirmada com `SpreadsheetApp.flush()` antes de salvar seu checkpoint. A execução seguinte retoma o token salvo. Não há transação distribuída; usa-se escrita repetível e deduplicação para recuperar falhas.

Reports: ID por aplicação, cliente, horário, identificador de atividade, impressão digital do evento e ocorrência repetida dentro da atividade. Todos os eventos da atividade são percorridos. O ID não usa o número da página. Central: registro por alertId + revisão e atributos mínimos; o alerta de triagem é atualizado pela chave regra + alertId. Versões antigas não substituem versões novas. Atualizações preservam triagem humana.

As agregações leem os eventos já persistidos, por isso limiares funcionam entre páginas e execuções. A releitura de um evento já salvo reavalia sua regra: repara quedas ocorridas entre a escrita do evento e a escrita do alerta. Não há índice permanente fora das tabelas. A retenção e o limite máximo de replay são parte da garantia de deduplicação; não se promete deduplicação indefinida após exclusão do histórico.

Configuração inicial: atraso de segurança de 5 minutos; carga inicial de 24 horas mais sobreposição de 6 horas; avanço máximo de 24 horas por janela; reconciliação diária dos últimos 7 dias em Reports e dos alertas criados nos últimos 90 dias na Central. Isso reduz perdas por chegada tardia, mas não cobre atrasos ilimitados. Alertas criados há mais de 90 dias não são atualizados por este monitor.

**Não há filtro `updateTime` na coleta da Central.** A lista oficial de [campos de filtro](https://developers.google.com/workspace/admin/alertcenter/reference/filter-fields) não o inclui, embora a ordenação por atualização exista. A reconciliação usa `createTime`, relê o horizonte configurado e compara as revisões retornadas.

O script alterna fontes para evitar que uma fila volumosa bloqueie as demais. Processa até 20 páginas por execução, 100 itens solicitados por página, com orçamento de 210 segundos antes do limite do Apps Script. As escritas e chamadas podem demorar mais que o previsto; se a execução for interrompida pelo serviço, o checkpoint anterior permite retomada. `LockService` impede dois coletores deste projeto de escrever ao mesmo tempo.

### Falhas

| Código / situação | Comportamento | Ação |
|---|---|---|
| 429, 5xx, 403 de rate limit | Até quatro tentativas com espera exponencial, jitter e Retry-After; depois agenda nova tentativa | Avaliar quota, volume e backlog |
| 401 da Central | Renova token uma vez | Conferir delegação/sujeito se persistir |
| 403 de permissão | Não repete imediatamente; fonte continua em erro | Conferir API, privilégios, licença e controles de OAuth |
| 400/410 com token | Reinicia uma vez a mesma janela | Se persistir, conferir requisição e schema; não avança watermark |
| JSON/schema inválido | Fonte para naquela página e registra código | Corrigir normalizador e retomar; não descartar silenciosamente |
| CAPACIDADE | Não grava além do limite nem confirma a página | Aplicar retenção, avaliar crescimento ou migrar armazenamento |
| ATRASO_EXCEDE_RETENCAO | Interrompe a fonte normal | Registrar lacuna e planejar recuperação controlada |

Os retries persistentes começam em aproximadamente 2 minutos e crescem até cerca de 4h16, ou respeitam Retry-After maior. Os gatilhos verificam a próxima tentativa a cada ciclo. Um 400 com token pode ser erro de consulta, não necessariamente token expirado; a única reinicialização evita loop silencioso.

Para reavaliar dados dos últimos 7 dias, defina propriedades `RECOVERY_FEED` (alerts/login/admin/drive/token), `RECOVERY_START` e `RECOVERY_END` em ISO UTC. Exemplo de formato: `2026-10-10T00:00:00Z`. Execute `reprocessarIntervalo` quando o replay dessa fonte não tiver janela pendente; depois `executarMonitor`. A função não altera o watermark da coleta normal. Para recuperar uma interrupção superior a 14 dias, preserve checkpoints, registre a lacuna, use uma cópia isolada com política de retenção/replay revisada e exporte para armazenamento apropriado. Não pule o watermark sem documentar o intervalo não recuperado.

## 9. Retenção e LGPD

Esta política é uma configuração técnica inicial que precisa ser aprovada pelo controlador e pelo encarregado conforme finalidade, riscos e obrigações aplicáveis. Ela não presume consentimento de empregados nem escolhe uma base legal única para todas as organizações. Documente finalidade de segurança, necessidade, base legal, transparência, responsáveis e acesso no registro das operações de tratamento. Os princípios e deveres pertinentes constam da [LGPD, especialmente arts. 6º, 37, 46 e 48](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

| Conjunto | Regra implementada | Observação |
|---|---|---|
| Eventos normalizados | 14 dias desde a data do evento | Sem conteúdo de e-mail, título, IP ou payload completo |
| Alertas de triagem | 90 dias desde a última revisão local | A exclusão alcança qualquer estado; promova evidência necessária a caso formal antes disso |
| Operações técnicas | 30 dias desde a execução | Apenas componente, resultado e código |
| Checkpoints | Mantidos durante operação | Não contêm conteúdo de eventos; apagar na desativação definitiva |
| Incidentes formais | Não excluídos automaticamente | Revisar prazo mínimo aplicável e impedimentos de eliminação caso a caso |

Os HMACs usam uma chave por instalação; isso dificulta reversão por dicionário sem a chave, mas é **pseudonimização, não anonimização**. IDs de alertas e de atividades ficam disponíveis como referência. Para investigar uma pessoa/documento, consulte a fonte com privilégio próprio e a combinação de horário, evento e referência. Não existe mapa de reversão na planilha.

A exclusão automática remove linhas da planilha operacional, não garante eliminação de histórico de versões, cópias, backups, retenção Vault ou logs originais do Google. A política da organização deve abranger essas camadas. Sheets não fornece armazenamento imutável nem cadeia de custódia por si só. Preserve evidências de incidentes em repositório restrito aprovado, com integridade e controle de acesso, e inclua somente referência na aba `Incidentes`.

O registro formal de incidentes com dados pessoais deve ser conservado por pelo menos cinco anos segundo a orientação publicada sobre o RCIS. Isso não significa guardar todos os logs por cinco anos. A [ANPD descreve a obrigação de registro](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca). A equipe deve transferir os fatos necessários de um alerta confirmado para o registro formal, inclusive para incidentes não comunicados, com justificativa e revisão de retenção.

O controlador avalia a obrigação de comunicar incidentes que possam causar risco ou dano relevante. A orientação da [ANPD sobre comunicação](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis) informa prazo de três dias úteis, ressalvadas regras específicas. Não confunda data de um alerta com ciência do controlador de que dados pessoais foram afetados. Registre essa ciência, avalie os critérios aplicáveis e valide prazo/feriados com a área responsável. Esta solução não calcula prazo jurídico automaticamente nem envia comunicação à ANPD ou aos titulares.

Para retenção excepcional, registre motivo, responsável, conjunto afetado e revisão. Transfira evidência necessária antes da purga operacional; não simplesmente desative a retenção de tudo. Solicitações de titulares e eliminações precisam considerar as obrigações de conservação e o processo interno de atendimento.

## 10. Capacidade e manutenção

O limite deliberado é de **40.000 linhas por tabela**, incluindo cabeçalho. O coletor lê o conjunto de eventos retidos para agregações; é uma solução para volume pequeno, não um SIEM de grande escala. Comece com piloto de até aproximadamente 1.500 eventos normalizados/dia e meça duração, crescimento e quota. Essa é uma hipótese de dimensionamento, não capacidade garantida. A coleta de Drive e Token sem filtro pode excedê-la rapidamente.

O dashboard avisa acima de 32.000 eventos. Se a janela pendente não convergir, a execução aproximar-se continuamente do orçamento ou o volume ultrapassar o horizonte de retenção, migre eventos para BigQuery/armazenamento com índices e deixe Sheets como painel agregado. Não aumente `maxRows` isoladamente: as fórmulas, limites de células, memória e algoritmo também precisam mudar.

O [Apps Script tem quotas de execução e serviços](https://developers.google.com/apps-script/guides/services/quotas), incluindo limite publicado de seis minutos por execução, e a [Reports API tem quotas próprias](https://developers.google.com/workspace/admin/reports/v1/limits). O orçamento local reserva margem, mas não altera essas quotas. Revise limites e latência de dados na sua edição.

Rotina sugerida: revisar saúde e abertos diariamente; calibrar falsos positivos semanalmente no piloto; revisar privilégios, tipos desconhecidos, catálogo nativo, retenção e lista de apps mensalmente. Após mudanças nas APIs, execute os testes locais e uma homologação mínima no domínio. Mantenha cópia versionada do código e registro de quem alterou as regras. O projeto não implementa histórico imutável das edições da planilha.

## 11. Testes e critérios de aceite

### Testes locais incluídos

Com Node.js instalado, na pasta do pacote:

```bash
node tests/test.cjs
```

Os testes usam dados fictícios e simulam APIs/planilhas. Verificam catálogo, pseudônimos, ordem de parâmetros, atividades com vários eventos, regras inativas, tipos desconhecidos, exposição pública, acesso externo, OAuth, limiares entre páginas, downloads distintos, proteção de fórmulas, checkpoints, recuperação após falhas, atualização preservando triagem, retries e fluxo de autenticação. O resultado está em `VALIDACAO.md`.

### Homologação necessária no domínio

1. Em uma planilha de teste, executar a preparação duas vezes: sem duplicar regras ou apagar dados; conferir gráficos, fórmulas sem erros e tipagem de datas.
2. Validar as cinco conexões. Conferir pelo menos um evento real autorizado por fonte ou registrar explicitamente “sem evento disponível para teste”. Resposta vazia não é aceite de cobertura.
3. Com arquivo de teste sem dados pessoais, compartilhar com endereço externo autorizado e revogar. Confirmar que apenas a concessão gera `R_EXTERNAL`. Testar link público apenas se permitido pela política; depois retirar a exposição.
4. Usar fixtures locais para falhas de login e mudanças de MFA. Não provocar ataque, remover MFA ou conceder privilégio real somente para teste. Testes reais de autenticação devem seguir o procedimento de homologação da organização.
5. Executar a mesma janela duas vezes e comparar IDs/quantidades. Alertas não devem duplicar. Reprocessar dados não deve apagar Estado, Responsável ou Ticket.
6. Interromper uma carga de teste entre páginas, executar novamente e confirmar que a janela conclui sem avanço antecipado do watermark.
7. Simular perda de privilégio na conta de homologação: fonte deve ficar em erro, as outras continuar e o dashboard não indicar saúde integral. Repor o privilégio e observar a retomada.
8. Em cópia de teste, inserir linhas sintéticas antigas e executar retenção. Verificar que só as tabelas/prazos definidos são expurgados e `Incidentes` permanece.
9. Confirmar acesso de leitor, analista e mantenedor. Conferir que analista não edita código nem colunas geradas. Verificar retenção do histórico de versões/cópias no processo interno.
10. Comparar cada classe crítica esperada com o Admin Console, incluindo as três lacunas e DLP. Documentar edição, privilégios, diferença de contagens e latências observadas.

Aceite: coletores concluem as janelas, IDs são estáveis, falhas ficam visíveis, contagens e filtros do dashboard conferem, regras refletem decisão aprovada e equipe consegue localizar a evidência na origem. Sem esses passos, trate a instalação como piloto.

## 12. Desativação e recuperação

Para pausar, execute `removerGatilhos`; dados, regras e checkpoints permanecem. Para retomar, confirme conexão/atraso e reinstale os gatilhos. Para desativar definitivamente: remova gatilhos de todas as contas que os criaram, revogue a delegação do Client ID, remova o vínculo IAM de assinatura, revogue a autorização Apps Script, trate os dados conforme retenção e exclua propriedades/tokens quando não forem mais necessários. Preserve separadamente os registros formais cuja conservação ainda seja obrigatória.

Restaurar só a planilha sem os checkpoints pode causar releitura; restaurar só checkpoints sem os dados pode pular evidência. Planeje recuperação conjunta com a chave HMAC e valide em cópia isolada. Nunca coloque tokens ou `PSEUDONYM_KEY` no arquivo de backup compartilhado do pacote.
