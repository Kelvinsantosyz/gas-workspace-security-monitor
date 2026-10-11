# 🛡️ Workspace Security & Compliance Monitor

**Monitoramento de Segurança, Auditoria e Conformidade para Google Workspace**

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Google Workspace](https://img.shields.io/badge/Google-Workspace-34A853?logo=google&logoColor=white)](https://workspace.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/Status-Em%20Valida%C3%A7%C3%A3o-orange)
![LGPD](https://img.shields.io/badge/LGPD-Privacy%20by%20Design-blueviolet)

---

## 📖 Sobre o Projeto

O **Workspace Security & Compliance Monitor** é uma solução independente desenvolvida em **Google Apps Script (Runtime V8)** para monitoramento de segurança, auditoria de eventos e apoio à conformidade com a Lei Geral de Proteção de Dados (LGPD).

O projeto integra APIs administrativas do Google Workspace e implementa mecanismos de detecção, correlação, pseudonimização e retenção de dados.

### ✨ Principais Funcionalidades

- 🔍 Monitoramento de eventos de autenticação e administração.
- 🚨 Integração com a Central de Alertas do Google Workspace.
- 📊 Dashboard centralizado em Google Sheets.
- 🔐 Pseudonimização com HMAC-SHA256.
- ⚙️ Motor de regras configurável.
- 🔄 Coleta paginada com checkpoints.
- 🛡️ Autenticação sem armazenamento local de chaves privadas.
- 📁 Registro e acompanhamento de incidentes.
- 🕒 Retenção automatizada de evidências operacionais.
- 🧪 Testes locais com Node.js, sem dependências externas.

---

## 🏗️ Arquitetura

```text
                   GOOGLE WORKSPACE
                          |
          +---------------+---------------+
          |                               |
     Admin SDK API                 Alert Center API
          |                               |
     OAuth Apps Script            Service Account
          |                        Domain Delegation
          |                               |
          |                         IAM signJwt
          |                               |
          +---------------+---------------+
                          |
                    COLETA DE DADOS
                          |
                 Normalização Mínima
                          |
                  Pseudonimização
                       HMAC-SHA256
                          |
                    MOTOR DE REGRAS
                          |
                 +--------+--------+
                 |                 |
              Alertas           Eventos
                 |                 |
                 +--------+--------+
                          |
                    GOOGLE SHEETS
                          |
          +---------------+---------------+
          |               |               |
       Dashboard       Incidentes       Logs
                          |
                  Retenção Automática
                          |
                   CHECKPOINTS
```

### Princípios Arquiteturais

| Princípio | Implementação |
|---|---|
| Isolamento | Apps Script independente da planilha |
| Autenticação | IAM Credentials API com `signJwt` |
| Resiliência | Paginação, retries e checkpoints |
| Privacidade | Pseudonimização HMAC-SHA256 |
| Governança | Retenção e registro de incidentes |
| Extensibilidade | Motor de regras parametrizável |
| Dependências | JavaScript nativo, sem pacotes externos |

> **Nota de segurança:** o projeto Apps Script deve permanecer sob controle de administradores autorizados. O acesso à planilha não deve conceder automaticamente acesso ao código ou às credenciais.

---

## 📂 Estrutura do Repositório

```text
workspace-security-monitor/
│
├── src/
│   ├── 00_Config.gs
│   ├── 01_Catalogo.gs
│   ├── 02_Core.gs
│   ├── 03_Api.gs
│   ├── 04_Coleta.gs
│   ├── 05_Regras.gs
│   ├── 06_Planilha.gs
│   └── appsscript.json
│
├── tests/
│   └── test.cjs
│
├── BASELINE.json
├── MATRIZ_ALERTAS.md
├── VALIDACAO.md
├── LICENSE
└── README.md
```

### Responsabilidade dos Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `00_Config.gs` | Configurações, limites e constantes |
| `01_Catalogo.gs` | Catálogo de 51 alertas |
| `02_Core.gs` | Criptografia, normalização e persistência |
| `03_Api.gs` | Integrações REST, autenticação e retries |
| `04_Coleta.gs` | Coleta, paginação e checkpoints |
| `05_Regras.gs` | Motor de detecção e correlação |
| `06_Planilha.gs` | Dashboard, instalação e retenção |
| `appsscript.json` | Manifesto e escopos OAuth |
| `tests/test.cjs` | Testes automatizados |

---

## 📊 Cobertura de Segurança

### Central de Alertas

O baseline do projeto contém **51 tipos de alertas mapeados**.

| Indicador | Quantidade |
|---|---:|
| Alertas catalogados | 51 |
| Ativos por padrão | 40 |
| Inativos por padrão | 11 |

A disponibilidade real dos tipos de alerta depende da edição, das configurações e dos recursos habilitados no Google Workspace.

### Regras de Detecção

| ID | Origem | Severidade | Descrição |
|---|---|---|---|
| `AC_01`–`AC_51` | Alert Center | Variável | Alertas nativos catalogados |
| `AC_UNKNOWN` | Alert Center | Média | Tipos ainda não catalogados |
| `AC_DLP` | Alert Center | Alta | Eventos de DLP |
| `R_LOGIN` | Login | Alta | Autenticações suspeitas |
| `R_FAILURE` | Login | Média | 10 falhas em 15 minutos |
| `R_PUBLIC` | Drive | Alta | Compartilhamento público |
| `R_EXTERNAL` | Drive | Média | Compartilhamento externo |
| `R_DOWNLOAD` | Drive | Alta | 50 arquivos distintos em 60 minutos |
| `R_OAUTH` | Token | Alta | Escopos OAuth sensíveis |
| `R_MFA` | Admin | Alta | Remoção administrativa de MFA |
| `R_ADMIN_USERS` | Admin | Alta | Alterações em contas (inativa) |
| `R_ADMIN_SETTINGS` | Admin | Alta | Alterações globais (inativa) |

Os limites de detecção devem ser ajustados conforme o perfil de risco da organização.

---

## 🔒 Segurança e Autenticação

A solução utiliza dois mecanismos distintos.

**1. Admin SDK Reports API**

Utiliza o token OAuth do usuário responsável pela execução dos gatilhos, com escopo de leitura dos relatórios de auditoria.

**2. Google Workspace Alert Center API**

Utiliza uma conta de serviço com delegação em todo o domínio (Domain-Wide Delegation).

A assinatura do JWT ocorre por meio da IAM Service Account Credentials API, evitando o armazenamento de arquivos JSON com chaves privadas.

### Escopos OAuth

Arquivo `src/appsscript.json`:

```json
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/admin.reports.audit.readonly",
    "https://www.googleapis.com/auth/iam"
  ]
}
```

> A lista contém também permissões operacionais de escrita na planilha e gerenciamento de gatilhos. O princípio de menor privilégio deve ser aplicado a todas as contas envolvidas.

---

## 🚀 Instalação

### Pré-requisitos

- Google Workspace com acesso administrativo apropriado.
- Projeto no Google Cloud.
- Google Apps Script com Runtime V8.
- Google Sheets.
- Permissões para configurar APIs, IAM e delegação de domínio.

### 1. Configurar Google Cloud

Habilite as APIs:

- Admin SDK API
- Google Workspace Alert Center API
- IAM Service Account Credentials API

Crie uma conta de serviço dedicada à leitura de alertas.

Configure a permissão:

```text
iam.serviceAccounts.signJwt
```

Restrinja a concessão dessa permissão à conta de serviço necessária.

### 2. Configurar delegação de domínio

No Google Workspace Admin Console, autorize o ID de cliente OAuth da conta de serviço com o escopo:

```text
https://www.googleapis.com/auth/apps.alerts
```

A conta delegada deve possuir as permissões administrativas adequadas para consultar os alertas.

### 3. Criar a planilha

Crie uma planilha Google e copie o identificador da URL:

```text
https://docs.google.com/spreadsheets/d/SEU_ID/edit
```

### 4. Configurar Apps Script

Crie um projeto independente no Google Apps Script e adicione os arquivos da pasta `src/`.

Configure as seguintes propriedades do script:

| Propriedade | Valor |
|---|---|
| `SPREADSHEET_ID` | ID da planilha |
| `ALERTS_SERVICE_ACCOUNT` | E-mail da conta de serviço |
| `ALERTS_SUBJECT` | E-mail do administrador delegado |

A chave `PSEUDONYM_KEY` deve ser gerada de forma segura durante a instalação, conforme a implementação do projeto.

Não publique segredos, tokens ou identificadores privados em arquivos versionados.

### 5. Inicializar

Execute:

```javascript
prepararPlanilha();
```

Configure os domínios internos e os clientes OAuth autorizados na aba de configuração.

### 6. Validar as integrações

Execute:

```javascript
validarConexoes();
```

Verifique as permissões, respostas das APIs e registros operacionais.

### 7. Ativar os gatilhos

Após validar o ambiente:

```javascript
instalarGatilhos();
```

Configuração prevista:

- Coleta automatizada a cada 15 minutos.
- Rotina diária de retenção.
- Persistência de checkpoints por coletor.

---

## 🧪 Testes

A suíte de testes pode ser executada localmente com Node.js:

```bash
node tests/test.cjs
```

Os testes locais devem verificar, conforme a cobertura implementada:

- Normalização dos eventos.
- Regras de detecção.
- Pseudonimização.
- Tratamento de paginação.
- Recuperação de checkpoints.
- Comportamento diante de falhas simuladas.

Consulte `VALIDACAO.md` para resultados e limitações da validação.

---

## 🛡️ Privacidade e LGPD

O projeto adota medidas técnicas de minimização e proteção de dados pessoais.

### Pseudonimização

Os identificadores de atores, alvos e recursos são transformados com HMAC-SHA256 e uma chave secreta de instalação.

A pseudonimização não equivale à anonimização irreversível; os dados resultantes podem continuar sujeitos à LGPD.

### Retenção

| Categoria | Retenção padrão |
|---|---:|
| Eventos de auditoria | 14 dias |
| Alertas de triagem | 90 dias |
| Logs operacionais | 30 dias |
| Incidentes formais | Política específica |

A retenção de incidentes deve respeitar requisitos legais, contratuais e organizacionais.

### Responsabilidade

Este software auxilia na identificação e triagem de eventos de segurança.

Ele não substitui:

- Análise humana de incidentes.
- Avaliação jurídica.
- Processo formal de resposta a incidentes.
- Determinação de obrigação de comunicação à ANPD.
- Programa de governança de proteção de dados.

---

## ⚠️ Limitações Conhecidas

- Dependência da disponibilidade e das quotas das APIs do Google.
- Limites de execução e armazenamento do Apps Script.
- Variação de eventos conforme a edição do Google Workspace.
- Possibilidade de falsos positivos e falsos negativos.
- Necessidade de gestão segura das propriedades do script.
- Checkpoints e retries não garantem, isoladamente, processamento exatamente uma vez.
- Google Sheets não substitui uma plataforma SIEM para ambientes de grande escala.

Recomenda-se validar o comportamento da coleta em condições de falha antes do uso operacional.

---

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| [BASELINE.json](BASELINE.json) | Inventário estruturado de alertas |
| [MATRIZ_ALERTAS.md](MATRIZ_ALERTAS.md) | Cobertura, severidades e recomendações |
| [VALIDACAO.md](VALIDACAO.md) | Evidências e resultados dos testes |
| [LICENSE](LICENSE) | Licença de distribuição |

---

## 🤝 Contribuições

Contribuições são bem-vindas.

Para propor melhorias:

1. Abra uma issue descrevendo o problema ou a sugestão.
2. Crie uma branch para a alteração.
3. Inclua testes para novas funcionalidades, quando aplicável.
4. Envie um Pull Request com a descrição das mudanças.

Não inclua credenciais, tokens ou dados pessoais reais em issues e pull requests.

---

## 📜 Licença

Distribuído sob a licença **MIT**, conforme o arquivo [LICENSE](LICENSE).

---

## ⚖️ Aviso Legal

Este é um projeto independente, sem afiliação ou endosso oficial do Google.

Google Workspace, Google Apps Script e Google Cloud são marcas de seus respectivos titulares.

A implantação e operação são de responsabilidade da organização usuária.

---

**Workspace Security & Compliance Monitor**

*Security Monitoring • Audit Automation • Privacy by Design • Google Workspace*
