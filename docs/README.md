# Sella — Fidelización Digital

Plataforma que reemplaza la tarjeta de sellos de cartón por un QR.
Negocios locales crean su programa de fidelización en minutos, sus clientes
acumulan sellos escaneando un QR, y el sistema reactiva clientes inactivos
por WhatsApp.

## Estructura

```
sella/
├── packages/
│   ├── backend/    API REST (Express + Prisma + PostgreSQL)
│   ├── web/        Panel de comercios (React + Vite + Tailwind)
│   └── pwa/        App clientes escanean QR (React + Vite + Tailwind)
└── docs/
```

## Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 6
- **Backend:** Node.js, Express, Prisma ORM
- **DB:** PostgreSQL (Supabase/Neon)
- **Notificaciones:** WhatsApp Business Cloud API (Meta)

## Setup

```bash
npm install
npm run db:push
npm run dev
```

## Modelo de negocio (Cali, Colombia)

| Plan | Precio COP/mes |
|------|:---:|
| Gratuito | $0 |
| Básico | $25,000 |
| Pro | $45,000 |
