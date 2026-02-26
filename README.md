# Growlify — Seu Administrador Financeiro Inteligente

Growlify é um SaaS de controle financeiro doméstico e comercial para pessoas, famílias, MEI e pequenos negócios.  
O produto é educacional e informativo: ajuda a organizar lançamentos e entender padrões de gastos.

## O que o Growlify **não** é
- Não é banco, não conecta em contas bancárias e não usa Open Banking.
- Não processa pagamentos de clientes.
- Não emite boletos, cobranças, notas fiscais ou faturas.
- Stripe é usado **somente** para cobrança da assinatura do Growlify.

## Stack
- **Web**: React + TypeScript (Vite)
- **Mobile**: Expo / React Native + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Banco**: SQLite (MVP) via Prisma (pode evoluir para PostgreSQL)
- **Auth**: e-mail + senha (JWT em cookie httpOnly)
- **Assinatura**: Stripe Checkout (mensal, BRL) + Webhooks

## Estrutura do repositório
- `apps/api` — API REST + Stripe + Prisma
- `apps/web` — Aplicação web responsiva
- `apps/mobile` — Aplicação mobile Expo

## Requisitos
- Node.js 18+ (recomendado 20+)
- npm 9+

## Como rodar localmente

### 1) API
```bash
cd apps/api
npm install
cp .env.example .env
  npm run prisma:generate
  npm run prisma:push
  npm run dev
  ```

A API sobe em `http://localhost:8080`.

### 2) Web
```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```

A Web sobe em `http://localhost:5173`.

### Deploy (Vercel)
No projeto do Vercel (Root Directory: `apps/web`), configure a vari\u00e1vel:
- `VITE_API_BASE_URL=https://growlify-api-production.up.railway.app`

Sem isso, o frontend n\u00e3o consegue acessar a API em produ\u00e7\u00e3o.

### 3) Mobile (Expo)
```bash
cd apps/mobile
npm install
cp .env.example .env
npm run start
```

## Stripe (assinatura do Growlify)
No ambiente local, você deve configurar:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID` (mensal BRL)
- `PUBLIC_APP_URL` (ex.: `http://localhost:5173`)

O paywall é aplicado quando `subscription_status !== "active"`.

Plano atual:
- Plano Growlify: **R$ 27,90/mês**
- **Teste gratuito por 7 dias** (cartão obrigatório para iniciar)
- Cancelamento antes do fim do teste: **sem cobranças**

## Reset de senha (Esqueceu a senha)
O fluxo de redefinição de senha é feito via e-mail:
- Web: `/forgot-password` (solicitar link) e `/reset-password?token=...` (definir nova senha)
- API: `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`

### Variáveis de ambiente (API)
No `apps/api/.env`:
- `APP_URL` (ex.: `http://localhost:5173`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`

Para testes locais, use um capturador SMTP (Mailpit/Mailhog). Configure o SMTP para `127.0.0.1:1025` e copie o link enviado no e-mail.

### Smoke test (manual)
1) API e Web online
2) Acesse `http://localhost:5173/forgot-password`
3) Informe o e-mail cadastrado e envie
4) Abra o e-mail recebido e acesse o link de redefinição
5) Defina uma nova senha (mínimo 8 caracteres)
6) Volte para `/entrar` e autentique com a nova senha

### Testes rápidos (curl)
```bash
# Solicitar redefinição (sempre 200 e mensagem genérica)
curl -i -X POST http://localhost:8080/api/auth/forgot-password -H "Content-Type: application/json" -d "{\"email\":\"seu@email.com\"}"

# Redefinir senha (precisa do token do link enviado)
curl -i -X POST http://localhost:8080/api/auth/reset-password -H "Content-Type: application/json" -d "{\"token\":\"TOKEN_AQUI\",\"password\":\"NovaSenhaForte123\"}"
```

## Telas principais
- **Início**: resumo do mês, gráficos e alertas educacionais
- **Lançamentos**: CRUD de entradas/saídas + filtros + exclusão com confirmação
- **Diagnóstico**: padrões e alertas educacionais (sem “sinais”)
- **Relatórios**: comparativos, top categorias e exportação CSV
- **Perfil**: dados do usuário, assinatura, logout

## Aviso importante (somente educacional)
O Growlify fornece contexto e organização financeira.  
Ele **não** fornece recomendações de investimento e **não** promete resultados financeiros.

## Mitigação (Windows / OneDrive)
Se o projeto estiver dentro do OneDrive, o SQLite pode falhar ao criar/abrir o arquivo do banco (permissões/sincronização), gerando erros como **"Unable to open the database file"**.

Recomendado para desenvolvimento:
- Mover o projeto para um caminho local simples, por exemplo: `C:\dev\Growlify`
- Evitar rodar o banco SQLite dentro de pastas sincronizadas
