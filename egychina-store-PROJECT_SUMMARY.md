# EgyChina Store — Project Summary

Arabic-first customer storefront for EgyChina Supermarket. It is a Next.js app that reads and writes a SQLite database shared with the sibling ERP. The storefront does not run its own migrations against that database.

## 1. Tech stack

| Area | Choice |
| --- | --- |
| Runtime | Node.js |
| Framework | Next.js 16.3.6 (App Router, Turbopack in `next dev`) |
| UI | React 19.2.8, React DOM 19.2.8 |
| Language | TypeScript 5, `strict` |
| Styling | Tailwind CSS 4 (`@import "tailwindcss"` plus `@config`), PostCSS |
| Icons | lucide-react |
| State | Zustand 5 |
| Database | Prisma 6.19.3 client, SQLite (`DATABASE_URL`) |
| Dates | react-datepicker |
| Loyalty card | react-barcode |
| Lint | ESLint 9 with `eslint-config-next` 16.3.6 |

Scripts in `package.json`: `dev` (`next dev`), `build`, `start`, `lint`.

There is no `pubspec.yaml` or `composer.json`. Path alias `@/*` maps to `./src/*`.

Brand color is green `#16a34a`, with hover `#22c55e`, defined as `primary` in `tailwind.config.ts`. The UI font is Cairo (`next/font/google`).

## 2. Folder and file structure

Generated folders (`node_modules`, `.next`) and `.git` are omitted.

```text
egychina-store/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   └── schema.prisma
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── loading.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── favicon.ico
    │   ├── (storefront)/
    │   │   └── search/page.tsx
    │   ├── shop/page.tsx
    │   ├── checkout/page.tsx
    │   ├── profile/page.tsx
    │   ├── account/
    │   │   ├── orders/page.tsx
    │   │   ├── orders/[id]/page.tsx
    │   │   └── returns/[id]/page.tsx
    │   ├── uploads/[...slug]/route.ts
    │   └── api/
    │       ├── products/route.ts
    │       ├── categories/route.ts
    │       ├── brands/route.ts
    │       ├── loyalty/route.ts
    │       ├── delivery-zones/route.ts
    │       ├── returns/route.ts
    │       ├── store/checkout/route.ts
    │       ├── orders/[id]/route.ts
    │       ├── auth/
    │       │   ├── login/route.ts
    │       │   ├── logout/route.ts
    │       │   └── session/route.ts
    │       ├── account/
    │       │   ├── addresses/route.ts
    │       │   ├── orders/route.ts
    │       │   ├── orders/[id]/route.ts
    │       │   ├── returns/route.ts
    │       │   └── returns/[id]/route.ts
    │       └── customers/[id]/addresses/
    │           ├── route.ts
    │           └── [addressId]/route.ts
    ├── components/
    │   ├── account/
    │   │   ├── OrderCards.tsx
    │   │   ├── OrderDetails.tsx
    │   │   ├── OrderHistory.tsx
    │   │   ├── ProfileAccount.tsx
    │   │   ├── ReturnDetails.tsx
    │   │   ├── ReturnRequestModal.tsx
    │   │   └── StatusBadge.tsx
    │   ├── auth/LoginModal.tsx
    │   ├── brand/
    │   │   ├── BrandCarousel.tsx
    │   │   └── BrandFilter.tsx
    │   ├── cart/CartDrawer.tsx
    │   ├── category/CategoryGrid.tsx
    │   ├── checkout/
    │   │   ├── DeliveryTimePicker.tsx
    │   │   └── delivery-time-picker.css
    │   ├── home/
    │   │   ├── HeroBanner.tsx
    │   │   └── HomeHero.tsx
    │   ├── i18n/LanguageProvider.tsx
    │   ├── layout/
    │   │   ├── CategoryNav.tsx
    │   │   ├── Footer.tsx
    │   │   ├── Header.tsx
    │   │   ├── LanguageSwitcher.tsx
    │   │   ├── LiveSearch.tsx
    │   │   └── Navbar.tsx
    │   ├── loyalty/LoyaltyCardModal.tsx
    │   ├── product/
    │   │   ├── ProductCard.tsx
    │   │   ├── ProductGrid.tsx
    │   │   ├── ProductGridSkeleton.tsx
    │   │   └── QuantityStepper.tsx
    │   └── ui/TimelineStepper.tsx
    ├── hooks/useLoyaltySettings.ts
    ├── lib/
    │   ├── accountData.ts
    │   ├── customers.ts
    │   ├── deliveryZones.ts
    │   ├── erpAccount.ts
    │   ├── loyalty.ts
    │   ├── orderStatus.ts
    │   ├── prisma.ts
    │   └── session.ts
    ├── locales/
    │   ├── ar.ts
    │   ├── en.ts
    │   ├── zh.ts
    │   ├── index.ts
    │   └── types.ts
    ├── services/
    │   ├── api.ts
    │   └── orders.ts
    ├── store/
    │   ├── authStore.ts
    │   └── cartStore.ts
    ├── types/index.ts
    └── utils/
        ├── brandVisual.ts
        ├── categoryIcon.ts
        ├── localizedName.ts
        ├── maskPhone.ts
        ├── points.ts
        ├── quantity.ts
        └── uniqueByName.ts
```

## 3. Screens, state, services, schema, and API

This is a web storefront with its own Route Handler API. Catalog, checkout, and account data go through that API into the shared ERP SQLite file. The storefront does not call the ERP HTTP server for products.

### Screens

| Route | Screen | What it does |
| --- | --- | --- |
| `/` | Home | Hero, category grid, brand carousel, featured product grid |
| `/shop` | Shop | Category nav, brand filter, paginated product grid (`categoryId`, `brandId`, `search`) |
| `/search` | Search results | Reads `q` and renders the same product grid. Empty query shows a prompt. No matches show `لا توجد نتائج لـ "{{query}}"` |
| `/checkout` | Checkout | Name, phone, saved or new address, delivery zone, delivery time, points redemption, order summary |
| `/profile` | Account dashboard | Tabs: orders, returns, addresses. `?tab=orders\|returns\|addresses` selects a tab |
| `/account/orders` | Orders list | Same order cards as the profile orders tab |
| `/account/orders/[id]` | Order tracking | Delivery timeline only |
| `/account/returns/[id]` | Return tracking | Return timeline only |

There is no dedicated product-details route. Quantity and add-to-cart live on the product card and in the cart drawer.

Shared chrome on storefront pages: `Header` (re-export of `Navbar`), `Footer`, cart drawer, login modal, loyalty-card modal, language switcher. Search lives in the header (`LiveSearch`): a dropdown while typing, and Enter or the search icon navigates to `/search?q=`.

### State management

Zustand stores, no Redux and no React Query:

- `useCartStore` (`src/store/cartStore.ts`) — line items, quantity, and a cent-rounded total. Piece items step by 1. Weighed items (`isWeighed`) step by 0.25 kg, minimum 0.25. Dropping below the step removes the line. Cart state is in memory only.
- `useAuthStore` (`src/store/authStore.ts`) — `user`, `ready`, `login`, `logout`, `hydrate`. Hydrates from `GET /api/auth/session`.

Local React state covers the cart drawer, login modal, menus, checkout form, and account tabs. `useLoyaltySettings` loads earn and redeem rates from `GET /api/loyalty`.

### Client services

- `src/services/api.ts` — `getProducts()` calls `GET /api/products` and validates the JSON before returning `Product[]` plus pagination meta.
- `src/services/orders.ts` — server action `placeOrder`. It checks the session cookie, then the checkout route persists the order. The checkout page also posts to `/api/store/checkout` with fractional quantities left as numbers.

Other UI fetches call the route handlers directly (`/api/categories`, `/api/brands`, `/api/account/*`, `/api/returns`, `/api/orders/[id]`).

### Auth

Phone-only Egyptian mobile login. `POST /api/auth/login` creates or finds a `Customer` and sets an HMAC-SHA256 `session` cookie (`src/lib/session.ts`), httpOnly, 30 days. `currentCustomer()` in `src/lib/erpAccount.ts` is the server-side session lookup. Account and checkout routes return 401 when that cookie is missing or invalid.

### Database

Prisma schema: `prisma/schema.prisma`. Provider: SQLite. The file is the ERP database (`DATABASE_URL`, typically the sibling ERP `prisma/dev.db`). Do not run Prisma migrate from this app.

The schema mirrors the ERP, including POS and back-office models the storefront does not write:

`User`, `AuditLog`, `Product`, `Supplier`, `PurchaseInvoice`, `PurchaseInvoiceItem`, `SupplierPayment`, `PurchaseReturn`, `PurchaseReturnItem`, `Treasury`, `TreasuryTransaction`, `ExpenseCategory`, `Expense`, `BankAccount`, `BankTransaction`, `InternalTransfer`, `Shift`, `InventoryAdjustment`, `AdjustmentItem`, `OpeningBalance`, `OpeningBalanceItem`, `Employee`, `Sale`, `SaleLine`, `Brand`, `Category`, `StoreSetting`, `Customer`, `PointsTransaction`, `Order`, `OrderItem`.

Storefront-relevant fields:

- `Product`: `name` / `nameEn` / `nameZh`, `price`, `salePrice`, `stockQuantity` (Float), `stockStatus`, `isWeighed`, `isActive`, `imageUrl`, `categoryId`, `brandId`.
- `Order`: string `status` (default `PENDING`), customer, totals, `pointsEarned`, `pointsRedeemed`. Delivery time is stored in `notes` as `deliveryTime: <iso>` because this schema has no `deliveryTime` column.
- `OrderItem.quantity` is a Float so weighed lines can be `0.25`, `0.5`, and so on.
- `Customer`: unique `phone`, optional `name` and `password`, `pointsBalance`.
- `StoreSetting`: key/value loyalty ratios.

These tables exist in the shared database and are read or written with `prisma.$queryRaw` / `$executeRaw` because they are not in this Prisma schema:

- `Address` — `id`, `title`, `street`, `city`, `recipientName`, `phoneNumber`, `zoneId`, `isDefault`, `customerId`, `createdAt`.
- `DeliveryZone` — `id`, `nameAr`, `nameEn`, `nameZh`, `deliveryFee`, `isActive`.
- `ReturnRequest` — `id`, `orderId`, `customerId`, `status` (default `PENDING`), `pointsDeducted`, `createdAt`, `updatedAt`.
- `ReturnItem` — `id`, `returnRequestId`, `orderItemId`, `quantity`.

Order status values used by the UI: `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPED`, `COMPLETED`, plus `DELIVERED`, `CANCELLED`, `RETURNED`, `PARTIALLY_RETURNED`. Arabic aliases are normalized in `src/lib/orderStatus.ts`. Delivery timeline steps are `PENDING → CONFIRMED → PREPARING → SHIPPED → COMPLETED`. Return timeline steps are `PENDING → CONFIRMED → COLLECTING → COMPLETED`.

Cancel is allowed only for `PENDING` or `CONFIRMED`, and only to `CANCELLED`, and it restores stock and points. A return can be requested only when the order is `COMPLETED` or `DELIVERED`. Return quantities are still whole numbers.

### API endpoints

All routes live under `src/app/api` except product images, which are served from `src/app/uploads/[...slug]`.

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | `/api/products` | Public | Active products. Query: `categoryId`, `brandId`, `search` (Arabic `name` contains), `page`, `limit`. Returns `{ products, meta }`. `isWeighed` is included. Sale price is sent only when it is greater than 0. |
| GET | `/api/categories` | Public | Category list |
| GET | `/api/brands` | Public | Brand list |
| GET | `/api/loyalty` | Public | `{ points_earn_ratio, points_redeem_value }` from `StoreSetting` |
| GET | `/api/delivery-zones` | Public | Active delivery zones |
| POST | `/api/auth/login` | Public | Body `{ phone, name? }`. Sets the session cookie. `400` `invalid_phone` |
| POST | `/api/auth/logout` | Cookie | Clears the session cookie |
| GET | `/api/auth/session` | Cookie | `{ user }` or `{ user: null }` |
| POST | `/api/store/checkout` | Session | Creates an order. Body includes customer, address, zone, delivery time, `pointsRedeemed`, and `items[]` with float `quantity`. Weighed quantities must be at least 0.25 and on a 0.25 grid. Piece quantities must be integers. Unknown products or a bad quantity return `400`. Insufficient points return `400` `points`. Missing session returns `401`. |
| PATCH | `/api/orders/[id]` | Session | Cancel. Only the signed-in customer's order, only `PENDING` or `CONFIRMED`. Response `{ ok: true, status: "CANCELLED" }` |
| GET | `/api/account/orders` | Session | The customer's orders, each with `returnRequests: { id }[]` |
| GET | `/api/account/orders/[id]` | Session | One order plus return requests. `404` if it is not theirs |
| GET | `/api/account/returns` | Session | The customer's return requests |
| GET | `/api/account/returns/[id]` | Session | One return request. `404` if missing |
| POST | `/api/returns` | Session | Creates a return for a completed or delivered order. Integer quantities only. `201` `{ ok: true, id }` |
| GET | `/api/account/addresses` | Session | Saved addresses |
| POST | `/api/account/addresses` | Session | Creates an address. `201` `{ address }` |
| GET | `/api/customers/[id]/addresses` | Session | Same list, and the id must match the session (`403` otherwise) |
| DELETE | `/api/customers/[id]/addresses/[addressId]` | Session | Deletes one of the customer's addresses |
| GET | `/uploads/...` | Public | Serves a file from `public/uploads` (jpeg, png, webp). Rejects paths outside that directory |

Product photos that already live on the ERP host are requested from `http://localhost:3001/uploads/...` by the storefront image helper. `next.config.ts` allows remote images, including local IPs.

## 4. Coding patterns and architecture rules

- App Router only. Pages are server components that compose client sections. Interactive pieces (`ProductGrid`, `Navbar`, `LiveSearch`, checkout, account) are `"use client"`. `useSearchParams` is wrapped in `<Suspense>`.
- Data access stays on the server: Route Handlers and `src/lib/*` use the singleton `prisma` client. The browser never imports Prisma.
- Client code treats API JSON as `unknown` and narrows it before use. Do not trust the response shape.
- Shared UI copy goes through `useI18n().t(key, vars)`. Keys must exist on `Dictionary` and in `ar.ts`, `en.ts`, and `zh.ts`. Interpolation is `{{name}}`. Language is stored in a `lang` cookie. Arabic is RTL. Default language is Arabic.
- Localized catalog names use `getLocalizedName` (`name`, then `nameEn` or `nameZh`).
- Tailwind utilities only, with the `primary` palette. Layout is RTL-safe (`start` / `end`, not left / right). Rounded-full buttons and `font-extrabold` labels are the usual controls.
- Sale price is shown only when `salePrice != null && salePrice > 0`. Otherwise the regular price is used.
- Quantities: `src/utils/quantity.ts`. Weighed step is `0.25`. Checkout must not `Math.floor` a quantity. Points stay whole numbers (`Math.floor`).
- Order and return timelines are separate pages. An order that already has a return shows the label "تم طلب إرجاع" instead of track and request-return buttons. Order tracking links back to `/profile?tab=orders`. Return tracking links back to `/profile?tab=returns`.
- Session-gated mutations check `currentCustomer()` and, where a customer id is in the URL, require it to match the session.
- Raw SQL is used only for ERP tables missing from this Prisma schema (`Address`, `DeliveryZone`, `ReturnRequest`, `ReturnItem`). Prefer the Prisma client for models that are in `schema.prisma`.
- This Next.js version can differ from older training data. Check `node_modules/next/dist/docs/` before changing framework APIs. `AGENTS.md` is regenerated by `next dev`.
