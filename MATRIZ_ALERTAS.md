# Matriz dos alertas fornecidos

Origem: Texto colado.txt, recuperado da conversa “Monitoramento Google Workspace”. Estados preservados: 40 ativos, 11 inativos. Consulta documental: 10/10/2026. As severidades são propostas da implementação.

Referência dos tipos: [Google Workspace Alert types](https://developers.google.com/workspace/admin/alertcenter/reference/alert-types). Tipo não confirmado significa lacuna de mapeamento, não ausência comprovada de suporte.

| ID | Alerta do arquivo | Estado original | Notificação original | Tipo API | Prioridade | Cobertura / recomendação |
|---|---|---|---|---|---|---|
| AC_01 | Exclusão acelerada do Vault iniciada | Ativo | Ativado | **Não confirmado** | ALTA | NAO_CONFIRMADO — Validar no console e suporte; sem equivalência API presumida |
| AC_02 | Phishing denunciado pelo usuário | Ativo | Ativado | `User reported phishing` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_03 | Senha do usuário alterada | Inativo | Desativado | `Users password changed` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_04 | Privilégios de administrador do usuário revogados | Inativo | Desativado | `Users Admin privilege revoked` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_05 | Usuário suspenso devido a spamming por redirecionamento | Ativo | Ativado | `User suspended (spam through relay)` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_06 | Usuário suspenso devido a spamming | Ativo | Ativado | `User suspended (spam)` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_07 | Usuário suspenso devido à atividade suspeita | Ativo | Ativado | `User suspended (suspicious activity)` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_08 | Usuário suspenso (alerta de identidade do Google) | Ativo | Ativado | `User suspended` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_09 | Usuário suspenso (pelo administrador) | Inativo | Desativado | `User suspended (Administrator email alert)` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_10 | Usuário ao qual foram concedidos privilégios de administrador | Inativo | Desativado | `User granted Admin privilege` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_11 | Usuário excluído | Inativo | Desativado | `User deleted` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_12 | Login programático suspeito | Ativo | Ativado | `Suspicious programmatic login` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_13 | Mensagem suspeita denunciada | Ativo | Ativado | `Suspicious message reported` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_14 | Login suspeito | Ativo | Ativado | `Suspicious login` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_15 | Atividade suspeita no dispositivo | Ativo | Ativado | `Suspicious activity` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_16 | Usuário suspenso tornado ativo | Inativo | Desativado | `Suspended user made active` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_17 | Perfil de SSO atualizado | Ativo | Ativado | `SSO profile updated` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_18 | Perfil de SSO excluído | Ativo | Ativado | `SSO profile deleted` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_19 | Perfil de SSO adicionado | Ativo | Ativado | `SSO profile added` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_20 | Pico nas denúncias de spam feitas pelos usuários | Ativo | Ativado | `User reported spam spike` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_21 | Administrador principal alterado | Ativo | Ativado | `Primary admin changed` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_22 | Possível ransomware detectado | Ativo | Ativado | `Potential ransomware detected` | CRITICA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_23 | Mensagem de phishing detectada após a entrega | Ativo | Ativado | `Phishing reclassification` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_24 | Phishing nas Caixas de entrada devido a um erro na lista de permissões | Ativo | Ativado | `Misconfigured whitelist` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_25 | Novo usuário adicionado | Inativo | Desativado | `New user Added` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_26 | Configurações de dispositivo móvel alteradas | Inativo | Desativado | `Mobile settings changed` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_27 | Mensagem com malware detectada após a entrega | Ativo | Ativado | `Malware reclassification` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_28 | Senha vazada | Ativo | Ativado | `Leaked password` | CRITICA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_29 | Ataques apoiados pelo governo | Ativo | Ativado | `Government attack warning` | CRITICA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_30 | Problema na configuração do Google Voice | Ativo | Ativado | `Configuration problem` | BAIXA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_31 | Operações do Google | Ativo | Ativado | `Google Operations` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_32 | Aviso de serviço obrigatório do Google: segurança | Ativo | Ativado | `MSA Security` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_33 | Aviso de serviço obrigatório do Google: produto | Ativo | Ativado | `MSA Product` | BAIXA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_34 | Aviso de serviço obrigatório do Google: jurídico | Ativo | Ativado | `MSA Legal` | BAIXA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_35 | Aviso de serviço obrigatório do Google: faturamento | Ativo | Ativado | `MSA Billing` | BAIXA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_36 | Possível spoofing de funcionário no Gmail | Ativo | Ativado | **Não confirmado** | ALTA | NAO_CONFIRMADO — Validar no console e suporte; sem equivalência API presumida |
| AC_37 | Sincronização de arquivos retomada | Ativo | Ativado | `File syncing resumed` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_38 | As configurações do e-mail foram alteradas | Inativo | Desativado | `Email settings changed` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_39 | Configurações do Drive alteradas | Inativo | Desativado | `Drive settings changed` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_40 | Exportação de dados do domínio iniciada | Ativo | Ativado | `Customer takeout initiated` | CRITICA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_41 | Sincronização do diretório cancelada porque o limite de proteção foi excedido | Ativo | Ativado | **Não confirmado** | ALTA | NAO_CONFIRMADO — Validar no console e suporte; sem equivalência API presumida |
| AC_42 | Dispositivo comprometido | Ativo | Ativado | `Device compromised` | CRITICA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_43 | Abuso do cliente detectado | Ativo | Ativado | `Customer abuse detected` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_44 | Serviço de criptografia do lado do cliente indisponível | Ativo | Ativado | `Client-side encryption service unavailable` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_45 | Configurações do Agenda alteradas | Inativo | Desativado | `Calendar settings changed` | ALTA | DOCUMENTADO — Recomendada ativação após homologação |
| AC_46 | Configuração do Cloud SQL do App Maker | Ativo | -- / Ativado | `AppMaker Default Cloud SQL setup` | BAIXA | LEGADO_DOCUMENTADO — Revisar aplicabilidade do App Maker legado |
| AC_47 | O certificado APNs expira em breve | Ativo | Ativado | `APNS certificate is expiring soon` | BAIXA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_48 | O certificado de APNs expirou | Ativo | Ativado | `APNS certificate has expired` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_49 | Senha de admin redefinida | Ativo | Ativado | `Super admin password reset` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_50 | Aviso de suspensão da conta | Ativo | Ativado | `Account suspension warning` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
| AC_51 | Solicitações de aprovação de acesso | Ativo | Ativado | `Access Approvals request` | ALTA | DOCUMENTADO — Manter e homologar cobertura na edição contratada |
