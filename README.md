# SettleUp

> **Una libreta compartida para cuadrar las cuentas de cada grupo.**  
> Anotas quién pagó, ves quién debe, liquidas lo que haga falta en un par de toques.

![Home](apps/web/public/screenshots/04-home-signed-in.png)

SettleUp es una aplicación full‑stack para dividir gastos en grupos que comparten costes — compañeros de piso, de viaje, de cenas. Mantiene un saldo actualizado para cada miembro, sugiere el conjunto mínimo de transferencias necesarias para cuadrar el grupo, y permite a cualquiera marcar una transferencia como pagada sin salir de la libreta.

Está construida como una app de producción real, no un demo: autenticación con email y contraseña, agregación de saldos en el servidor, sincronización en tiempo real, borrado lógico de gastos, y una UI que deliberadamente **no** es otra tarjeta SaaS con degradado y emojis.

---

<div align="center">

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=for-the-badge)
![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=for-the-badge)
![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Tailwind 4](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white&style=for-the-badge)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-base--ui-000000?logo=shadcnui&logoColor=white&style=for-the-badge)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white&style=for-the-badge)
![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white&style=for-the-badge)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black&style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)
![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socketdotio&logoColor=white&style=for-the-badge)
![Better Auth](https://img.shields.io/badge/Better_Auth-1.6-000000?logoColor=white&style=for-the-badge)

</div>

---

## 📑 Tabla de contenidos

1. [Capturas](#-capturas)
2. [El problema que resuelve](#-el-problema-que-resuelve)
3. [Funcionalidades](#-funcionalidades)
4. [Stack técnico](#-stack-técnico)
5. [Arquitectura](#-arquitectura)
6. [Empezar](#-empezar)
7. [Variables de entorno](#-variables-de-entorno)
8. [Modelo de datos](#-modelo-de-datos)
9. [Tests](#-tests)
10. [Estructura del repo](#-estructura-del-repo)
11. [Despliegue](#-despliegue)
12. [Decisiones de diseño](#-decisiones-de-diseño)
13. [Próximos pasos](#-próximos-pasos)
14. [Licencia](#-licencia)

---

## 📸 Capturas

### Portada y autenticación

| Landing (sin sesión) | Iniciar sesión | Crear cuenta |
| :---: | :---: | :---: |
| ![](apps/web/public/screenshots/01-landing-signed-out.png) | ![](apps/web/public/screenshots/02-signin.png) | ![](apps/web/public/screenshots/03-signup.png) |

### Libreta en sesión

| Home (con sesión) | Cuentas pendientes | Cuentas saldadas |
| :---: | :---: | :---: |
| ![](apps/web/public/screenshots/04-home-signed-in.png) | ![](apps/web/public/screenshots/05-groups-pending.png) | ![](apps/web/public/screenshots/06-groups-settled.png) |

### Una cuenta, tres pestañas

| Firmantes | Apuntes | Saldos |
| :---: | :---: | :---: |
| ![](apps/web/public/screenshots/07-group-signers.png) | ![](apps/web/public/screenshots/08-group-expenses.png) | ![](apps/web/public/screenshots/10-group-balances.png) |

### Anotar un gasto y cerrar la cuenta

| Formulario de gasto | Cuenta liquidada |
| :---: | :---: |
| ![](apps/web/public/screenshots/09-expense-form.png) | ![](apps/web/public/screenshots/11-group-settled.png) |

---

## 💡 El problema que resuelve

Dividir cuentas a mano se rompe rápido. La gente:

- Olvida quién pagó qué.
- Calcula mal los porcentajes y discute.
- Paga a tres personas diferentes y nadie sabe ya a quién debe qué.
- Acaba con un chat de WhatsApp lleno de capturas de Bizum.

SettleUp ataca los tres primeros:

- **Una libreta por grupo** — cada gasto, anotado una vez, vive con el grupo al que pertenece, no con la app.
- **Saldos en tiempo real** — el backend agrega pagos, splits y liquidaciones en cada consulta de balances; el front nunca almacena estado de dinero.
- **Mínimo de transferencias** — un algoritmo voraz reduce las deudas a N‑1 pagos o menos, igual que Splitwise.

---

## ✨ Funcionalidades

### Cuentas (grupos)

- Crear cuenta con un nombre (ej. *Piso de Madrid*).
- Unirse con código de invitación alfanumérico de 12 caracteres, formateado como `A3F9·C2D0`.
- Cada cuenta tiene un **sello de "Invita"** y un listado de firmantes con sellos de *Tú abriste* / *Te uniste*.
- Cuando todos los saldos están a 0, la cuenta pasa a la pestaña **Saldadas** con un sello de *Liquidado*.

### Apuntes (gastos)

- Anotar gasto con descripción, importe, pagador, fecha y método de reparto.
- Tres métodos de reparto:
  - **Igual** — se divide entre los firmantes; el último recibe el redondeo.
  - **Exacto** — cada uno paga una cantidad; el sumatorio debe coincidir.
  - **Porcentaje** — cada uno paga un %; el sumatorio debe sumar 100.
- Validación en vivo: si los importes no cuadran, el formulario no se envía.
- Anular gasto con confirmación (soft‑delete — el registro queda para auditoría, pero deja de contar).
- Ver el detalle de cada gasto en un panel lateral con pagador, fecha, importe total, método y desglose.

### Saldos y liquidaciones

- "Te deben / Debes" en grande, con la lista de transferencias mínimas para cuadrar.
- Liquidar con un toque: registra un pago directo de un miembro a otro.
- La transferencia se desliza fuera y aparece sellada en **Liquidaciones**.
- **Deshacer** cualquier liquidación ya confirmada.

### Sincronización

- **Local**: Socket.IO por grupo. Eventos `expense:created`, `expense:cancelled`, `settlement:created`, `settlement:cancelled`, `members:changed` invalidan las queries de TanStack Query afectadas.
- **Producción (Vercel)**: 15 s de polling con la misma API de invalidación. La UI no nota la diferencia.
- El hook `useGroupRealtime(groupId)` es transport‑agnóstico.

### Autenticación

- Email/contraseña vía Better Auth (Drizzle adapter).
- Sesiones en cookie HttpOnly con `SameSite=Lax`, 7 días de expiración, renovación silenciosa diaria.
- Sin tokens en localStorage. Sin OAuth por ahora.

---

## 🧩 Stack técnico

| Capa | Herramienta | Por qué |
| --- | --- | --- |
| Frontend | **React 19 + Vite 8 + TypeScript 7** | SPA rápida, sin SSR (no aporta nada aquí y complica el deploy). |
| Estilos | **Tailwind 4 + shadcn/ui sobre Base UI** | Sin CSS utility‑first suelto. Los componentes son Base UI con cva y `cn()`. |
| Datos servidor | **TanStack Query 5** | Cache, invalidación por mutación, hooks tipados. |
| Forms | Validación con Zod + estado manual | No React Hook Form: la complejidad de los formularios no lo justifica. |
| Iconos | **lucide‑react** | Tree‑shakable, mismo idioma visual. |
| Backend | **Express 5 + TypeScript** | Framework mínimo, sin opinionar. |
| DB | **PostgreSQL en Neon + Drizzle ORM** | Serverless Postgres con branching. Drizzle da tipos de verdad sin la magia de Prisma. |
| Auth | **Better Auth 1.6** | Manejo de sesiones, cookies y Drizzle adapter, todo cableado. |
| Realtime | **Socket.IO 4.8** | Rooms por `group:<id>`. Polling de 15 s como fallback. |
| Tests | **Vitest 4 + Testing Library + Playwright** | jsdom para componentes, browser para E2E. |
| Monorepo | **pnpm workspaces** | Rápido, determinista, único lockfile. |

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web   (Vite/React SPA)                                │
│  TanStack Query  →  api()  →  fetch con cookies             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┴────────────────────────────────────┐
│  apps/api   (Express 5 + Socket.IO 4.8)                     │
│                                                             │
│  /api/auth/*         Better Auth handler                    │
│  /groups/*           router REST                            │
│  /groups/:id/...     expenses, members, balances, settles.  │
│                                                             │
│  RealtimeEmitter  →  io.to(`group:${id}`).emit(...)         │
└────────────────────────┬────────────────────────────────────┘
                         │ pg
┌────────────────────────┴────────────────────────────────────┐
│  Neon Postgres                                              │
│  user, session, account, verification                       │
│  groups, group_members                                      │
│  expenses, expense_splits, settlements                      │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de balances

El backend calcula los saldos bajo demanda, **nunca los persiste**:

```ts
balance[user] =
    + SUM(expenses.amountCents WHERE paidBy = user AND isCancelled = false)
    - SUM(expenseSplits.owedAmountCents WHERE userId = user)
    + SUM(settlements.amountCents WHERE fromUser = user AND status = 'confirmed')
    - SUM(settlements.amountCents WHERE toUser = user AND status = 'confirmed')
```

Positivo = le deben al usuario. Negativo = debe. Se ejecuta con 4 queries en paralelo (`Promise.all`) y se agregan en JS.

El flag **`isSettled`** de un grupo se calcula con la misma fórmula, aplicada a todos los miembros: `∀u: balance[u] === 0`.

### Algoritmo de transferencias mínimas

Implementación voracia (`apps/api/src/modules/balances/debtSimplifier.ts`):

1. Ordenar deudores por deuda (mayor primero) y acreedores por crédito (mayor primero).
2. Emparejar el mayor deudor con el mayor acreedor, transferir `min(|deuda|, crédito)`.
3. Repetir hasta que todos estén a 0.

Complejidad O(N log N). Garantiza como mucho N‑1 transferencias. **No** es óptimo en sentido estricto (eso es NP‑duro), pero es el mismo compromiso que usa Splitwise en producción.

---

## 🚀 Empezar

### Requisitos

- **Node.js ≥ 22** (recomendado 24).
- **pnpm ≥ 10** (`npm i -g pnpm` o vía Corepack).
- Una base de datos **PostgreSQL** (lo más fácil: [Neon](https://console.neon.tech), free tier).

### 1. Clonar e instalar

```bash
git clone <repo-url> settleup
cd settleup
pnpm install
```

`pnpm install` ejecuta un hook `preinstall` que rechaza npm/yarn/bun — esto es deliberado, lee `AGENTS.md`.

### 2. Configurar variables de entorno

```bash
cp .env.example apps/api/.env
```

Edita `apps/api/.env`:

```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173

# Neon pooled connection (debe incluir ?sslmode=require)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

# Genera uno con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:4000
```

### 3. Crear las tablas

```bash
pnpm --filter @settleup/api db:generate   # genera SQL desde schema.ts
pnpm --filter @settleup/api db:migrate    # aplica las migraciones a Neon
```

### 4. Arrancar en desarrollo

```bash
pnpm dev
```

Esto levanta en paralelo:

- **API**: <http://localhost:4000> (con `/health` para verificar).
- **Web**: <http://localhost:5173>.

Para uno solo:

```bash
pnpm dev:api    # sólo el backend
pnpm dev:web    # sólo el frontend
```

### 5. Crear tu primera cuenta

1. Regístrate en `/signup`.
2. Pulsa **Crear cuenta** o **Entrar con código**.
3. Comparte el código de invitación con quien quieras que se una.

---

## 🔐 Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | `apps/api/.env` | Conexión pooled a Neon Postgres. |
| `BETTER_AUTH_SECRET` | `apps/api/.env` | Firma de cookies de sesión. Base64 de 32 bytes aleatorios. |
| `BETTER_AUTH_URL` | `apps/api/.env` | URL pública de la API para construir redirects. |
| `CLIENT_URL` | `apps/api/.env` | Origen CORS permitido (CSV si hay varios). |
| `PORT` | `apps/api/.env` | Puerto del API (default 4000). |
| `VITE_API_URL` | `apps/web/.env` | URL del API desde el navegador. |
| `VITE_WS_URL` | `apps/web/.env` | Si está, activa Socket.IO. Si no, polling 15 s. |

> **Importante**: en local pon `VITE_API_URL=http://localhost:4000`. En Vercel, apúntalo al dominio del API en Railway/Fly/etc.

---

## 🗄 Modelo de datos

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  user (BA)   │      │   group      │      │  group_member│
├──────────────┤      ├──────────────┤      ├──────────────┤
│ id (text PK) │◄────┤ createdBy    │◄────┤ groupId      │
│ email        │      │ name         │      │ userId       │
│ name         │      │ inviteCode   │      │ joinedAt     │
│ emailVerified│      │ createdAt    │      └──────────────┘
│ timestamps   │      └──────────────┘
└──────────────┘             │
                             │ 1:N
                             ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   expense    │      │ expense_split│      │  settlement  │
├──────────────┤      ├──────────────┤      ├──────────────┤
│ groupId      │◄────┤ expenseId    │      │ groupId      │
│ description  │      │ userId       │      │ fromUser     │
│ amountCents  │      │ owedAmountCts│      │ toUser       │
│ currency     │      └──────────────┘      │ amountCents  │
│ paidBy       │                            │ status       │
│ splitMethod  │                            │ createdAt    │
│ isCancelled  │                            │ confirmedAt  │
│ createdAt    │                            └──────────────┘
└──────────────┘
```

- Todo el dinero se almacena en **integer cents** — nunca floats.
- `expense.isCancelled` es soft‑delete: un gasto anulado no se borra, simplemente deja de contar para balances.
- `settlement.status` es `pending | confirmed | cancelled`. Sólo `confirmed` cuenta en balances.

---

## 🧪 Tests

```bash
pnpm --filter @settleup/web test          # Vitest + jsdom (componentes)
pnpm --filter @settleup/web test:e2e      # Playwright (browser)
pnpm --filter @settleup/api test          # Vitest (node)
```

Cobertura actual: formatters, hook de balances, sección de apuntes, hoja de detalle de gasto, balances con/sin liquidar.

E2E hay uno planificado para el flujo "liquidar → cuenta saldada". Está deshabilitado en CI hasta resolver un `process is not defined` con Vitest 4 + Playwright browser.

---

## 📁 Estructura del repo

```
settleup/
├── apps/
│   ├── web/                    # React 19 + Vite
│   │   ├── src/
│   │   │   ├── pages/          # Home, Groups, GroupDetail, SignIn, SignUp
│   │   │   ├── components/
│   │   │   │   ├── group/      # Notebook, Signers, Expenses, GroupHeader…
│   │   │   │   ├── balances/   # BalancesSection
│   │   │   │   ├── expenses/   # ExpenseForm, ExpenseDetailsSheet
│   │   │   │   └── ui/         # shadcn primitives (Tabs, Sheet, Dialog…)
│   │   │   ├── hooks/          # useGroupExpenses, useGroupBalances, useSettlements…
│   │   │   ├── services/       # api() helpers por recurso
│   │   │   ├── lib/            # auth, api, queryClient, formatters
│   │   │   └── types/
│   │   └── public/screenshots/ # Capturas para el README
│   └── api/                    # Express 5 + Drizzle
│       ├── src/
│       │   ├── modules/
│       │   │   ├── groups/
│       │   │   ├── expenses/
│       │   │   ├── members/
│       │   │   ├── balances/   # incluye debtSimplifier
│       │   │   └── settlements/
│       │   ├── db/             # schema Drizzle + driver Neon
│       │   ├── middleware/     # auth, validate, error-handler
│       │   └── server.ts
│       └── scripts/            # Utilidades one‑off (seed, debug, screenshots)
├── packages/
│   ├── shared/                 # zod schemas, money utils, settlement algo
│   └── eslint-config/          # placeholder
├── docs/                       # architecture.md, api.md, database.md
├── pnpm-workspace.yaml
└── README.md (← tú estás aquí)
```

---

## ☁️ Despliegue

| Pieza | Target sugerido | Razón |
| --- | --- | --- |
| `apps/web` | **Vercel** | SPA estática, sin server. Build: `pnpm --filter @settleup/web build`. |
| `apps/api` | **Railway** o Fly.io | Express + Socket.IO necesitan un proceso persistente. |
| Postgres | **Neon** | Free tier, branching, serverless, scale to zero. |

En Vercel, deja `VITE_WS_URL` vacío: el cliente cae automáticamente a polling de 15 s. La UX es indistinguible para grupos pequeños.

---

## 🎨 Decisiones de diseño

La estética de SettleUp es deliberadamente **papel**, **tinta** y **sello** — no otra UI genérica de SaaS. La razón:

- El producto *es* una libreta. La UI debería parecerse a una.
- El tipo de letra display (Geist) y el mono (Geist Mono) se usan con criterio: headings grandes, eyebrows de `text-[10px]` con `tracking-[0.2em] uppercase`, valores numéricos en mono para alinear decimales.
- Cada elemento estructural (sellos, perforados, líneas discontinuas) hace algo verdadero sobre el contenido: el sello **Invita** sólo aparece si eres el dueño; el sello **Liquidado** sólo cuando todos los balances están a 0; el sello **Abierto** marca el estado del cuaderno.
- La paleta es deliberadamente pequeña: `#F4EFE6` (papel), `#1A1814` (tinta), `#FBF8F1` (cartulina), `#E94B2C` (sello de acento). Sin gradientes. Sin sombras de color.

Los números de serie (`,01` / `,02` / `#000`) y los recuadros vacíos al final de cada cuenta no son decoración: los números son índice, los recuadros son literal "el siguiente apunte que entra aquí".

---

## 🛠 Próximos pasos

- [ ] Activar E2E de liquidación cuando Vitest/Playwright arreglen `process is not defined` en browser.
- [ ] CI con GitHub Actions (`typecheck` + `test`).
- [ ] Endpoint `POST /users/:id/settle-all` para liquidar de una vez.
- [ ] OAuth (Google, GitHub).
- [ ] Notificaciones por email al ser invitado a una cuenta.
- [ ] Exportar a CSV / Excel.
- [ ] i18n (hoy sólo es‑ES — la estructura ya está lista para añadir `en`).

---

## 🤝 Contribuir

No es un proyecto abierto (es portfolio), pero si te interesa forkearlo:

1. `git checkout -b feature/tu-mejora`
2. `pnpm install`
3. Antes de commit: `pnpm typecheck && pnpm lint && pnpm test`
4. PR con descripción clara del cambio.

---

## 📜 Licencia

MIT. Úsalo, fórkalo, cítalo si te ayudó.

---

<div align="center">

**Hecho con ☕ y demasiados recibos de Mercadona.**

</div>
