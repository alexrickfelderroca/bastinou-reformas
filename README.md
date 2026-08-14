# Kobor — sitio web

Sitio de captación de leads para **Kobor** (reformas de viviendas y locales
comerciales en Barcelona y alrededores, hasta 50 km). Trilingüe (ES/CA/EN), estático,
orientado a Google Ads y SEO.

> **Rebranding (ago-2026).** La empresa pasa a llamarse **Kobor**: marca y logotipo
> nuevos (wordmark del cliente vectorizado en `src/assets/brand/kobor-logo.svg|png`
> + `kobor-glyphs.json`; favicons regenerados — todo reproducible con
> `node _build/generate-brand-assets.mjs`), dominio `kobor.es`, contacto real
> (+34 623 80 81 72 · admin@kobor.es) y las animaciones de marca (BrandLoader
> «kob | caja | or» y wordmark gigante del hero) reconstruidas con los glifos
> reales del logotipo. El diseño (paleta crema/verde, tipografía) no cambia.
>
> **Rebranding (jul-2026).** El proyecto nació como «Bastinou» (premium, tema oscuro);
> la fuente de verdad actual son los dos PDF del cliente: *Concepto página principal
> Reformas Barcelona* y *Especificación página «Nuestros precios»*. Cambios clave:
> marca y logo AV Reforma BCN, tema claro (crema/verde), servicios Viviendas · Oficinas ·
> Tiendas · Beauty & fitness, página `/nuestros-precios/` (14 + 26 precios editables en
> `src/config/pricing-list.ts`), portfolio antes/después con 20 proyectos y calculadora
> eliminada (las URLs antiguas redirigen con stubs estáticos). Las animaciones previas
> se conservaron tal cual.

## Stack

- **Astro 7** (SSG — todo el contenido en el HTML servido, el SEO no depende de JS)
- **React** islands para lo interactivo (calculadora, sliders, formularios — fases próximas)
- **Tailwind CSS v4** con design tokens en `src/styles/global.css`
- **Lenis** para el scroll suave
- **@astrojs/sitemap** para sitemap + hreflang
- Fuente **Inter Variable** self-hosted (1 woff2, subset latin, preload + swap)

## Cómo ejecutar

```bash
npm install
npm run dev        # desarrollo (http://localhost:4321)
npm run build      # build de producción a dist/
npm run preview    # sirve el build
npx astro check    # type-check
```

## Estructura

```
src/
  config/site.ts            Datos de la empresa (teléfono, WhatsApp, email…) — [PENDIENTE]
  i18n/
    ui.ts                   Núcleo i18n: locales, useTranslations, getLocaleFromUrl
    routes.ts               Slugs traducidos por idioma + hreflang/selector
    es.json · ca.json · en.json   Diccionarios (nada de texto hardcodeado)
  layouts/Layout.astro      Shell HTML + cabeza SEO (title/canonical/hreflang/OG/JSON-LD)
  components/
    Header.astro            Cabecera + glassmorphism al scroll + menú móvil + dropdown
    Footer.astro            Pie oscuro con logo, columnas y legales
    LanguageSwitcher.astro  Selector de idioma (mantiene la página actual)
    WhatsAppFab.astro       Botón flotante de WhatsApp (todas las páginas)
    ConsentGtm.astro        Consent Mode v2 (defaults) + loader de GTM (gated) — <head>
    CookieConsent.astro     Banner de cookies + <dialog> de preferencias (Fase 7)
    CookiePolicy.astro      Página de política de cookies (ES/CA/EN)
    sections/               Secciones reutilizables (Hero, Stats, …)
  scripts/site.ts           Runtime: Lenis + reveal/parallax/count-up + header
  scripts/consent.ts        Runtime del banner: consentimiento granular + localStorage
  scripts/tracking.ts       Eventos whatsapp_click / phone_click (listener delegado)
  lib/og-meta.ts            OG: ids + rutas + contenido por página (puro, sin Node)
  lib/og-render.ts          OG: render satori→SVG→sharp→PNG 1200×630 (build)
  lib/breadcrumbs.ts        Helper BreadcrumbList (schema.org)
  pages/og/[og].png.ts      Endpoint que genera una imagen OG por página e idioma
  pages/robots.txt.ts       robots.txt (sitemap sincronizado con el dominio)
  pages/                    index (es) · ca/ · en/ · 404
  assets/                   brand/ (logo) · team/ (equipo) — optimizadas por astro:assets
public/
  fonts/                    Inter woff2 (preload)
                            (las imágenes OG se generan en build vía /og/[id].png)
```

## Sistema de diseño (resumen)

- Paleta B/N/gris (tokens `--color-paper/ink/graphite/slate/mist/cloud/line`).
  Única excepción de color: `--color-whatsapp`.
- Tipografía: utilidades `.h-hero`, `.h-section`, `.lead`. Contenedor `.container-x`, `.section`.
- Animaciones (`data-*`), sólo `transform`/`opacity`, con `prefers-reduced-motion` y
  fallback sin JS (el estado oculto sólo se aplica con `html.js`):
  - `data-reveal` (+ `data-reveal-group`/`data-reveal-stagger` para escalonar)
  - `data-reveal-lines` (titulares revelados por línea)
  - `data-countup` (+ `-suffix`/`-prefix`)
  - `data-parallax` (valor = fracción de desplazamiento, ~0.08)

## Estado por fases (CLAUDE.pdf §12)

- [x] **Fase 1 — Base**: scaffold, i18n, tokens, layout (header/footer), sistema de
      animaciones, Lenis, assets (logo/equipo), 404, build + type-check OK.
- [x] **Fase 2 — Home**: hero, servicios (4 tarjetas con imágenes reales),
      calculadora resumida (mock glass), portfolio (proyecto casa-España),
      proceso 5 pasos, cifras, zona de servicio, CTA final — ES/CA/EN, responsive.
- [x] **Fase 3 — Landings de servicios**: 4 servicios × 3 idiomas (slugs
      traducidos), cada uno con hero+keyword, qué incluye, precios por segmento
      (pricing.json), proyectos relacionados, proceso, FAQ (FAQPage), CTA
      calculadora y formulario corto. Schema Service + BreadcrumbList + FAQPage.
- [x] **Fase 4 — Calculadora**: island React, wizard 5 pasos + resultado;
      motor en lib/estimate.ts (integral y parcial) desde pricing.json; horquilla
      ±15% redondeada a centenas con count-up; captura de lead no bloqueante +
      WhatsApp prellenado; persistencia en sessionStorage; eventos calc_* al
      dataLayer. ES/CA/EN, responsive.
- [x] **Fase 5 — Portfolio + Nosotros + Contacto**: portfolio con colección de
      contenido (`src/content/projects`), grid con filtro por tipo, detalle con
      meta + slider antes/después (ratón/touch/teclado) + galería; Nosotros con
      enfoque/garantías/equipo (4 fotos reales); Contacto con métodos + form +
      zona. hreflang correcto en detalle. ES/CA/EN.
- [x] **Fase 6 — Formularios y notificaciones**: endpoint `/api/lead` (Node
      adapter neutro, swappable), validación servidor + honeypot, email (Resend)
      + Telegram opcional tras env vars; formularios con fetch → gracias/error;
      captura UTM/gclid en sessionStorage adjunta a cada lead; evento form_submit.
      Ver `.env.example`. Antispam reCAPTCHA/Turnstile queda como [PENDIENTE] hook.
- [x] **Fase 7 — Tracking**: Google Tag Manager + Google Consent Mode v2 con
      banner de cookies conforme a la AEPD/RGPD. Defaults denegados antes de
      cargar ninguna etiqueta; primera capa no modal con Aceptar/Rechazar en
      paridad (un clic) + "Configurar"; segunda capa granular (`<dialog>` nativo:
      analítica y marketing por separado, necesarias siempre activas). Registro
      granular en localStorage (`kobor_consent`, caducidad 180 días) reaplicado
      en cada carga. Todo **dormido** hasta definir `PUBLIC_GTM_ID` real (sin él:
      ni GTM ni banner). Eventos `whatsapp_click`/`phone_click` (listener delegado)
      + los ya existentes `form_submit` y `calc_*`. Política de cookies (ES/CA/EN)
      con botón "Gestionar cookies" (reabre las preferencias). Ver "Tracking" abajo.
- [x] **Fase 8 — SEO técnico**: `robots.txt` (endpoint, sitemap sincronizado con
      el dominio). Imágenes Open Graph **por página e idioma** (1200×630, B/N),
      generadas en build con satori + sharp (endpoint `/og/[id].png`, fuente Inter
      de `@fontsource/inter`). JSON-LD ampliado: `HomeAndConstructionBusiness`
      (con `@id`, horario, `priceRange`, logo real) + `WebSite` enlazados por
      `@id`; se omite todo campo `[PENDIENTE]` (dirección y geo incluidas, hasta
      tener datos reales); el `provider` de las landings reusa el mismo `@id`.
      `BreadcrumbList` en portfolio, detalle de proyecto, nosotros, contacto y
      calculadora (las landings ya lo tenían). hreflang/canonical/breadcrumbs con
      barra final coherente; sitemap plano (hreflang autoritativo en el `<head>`).
- [x] **Fase 9 — Rendimiento**: Lighthouse móvil ≥90 en las páginas clave
      (home 96, calculadora 93, landing 96; CLS 0, TBT 0–120 ms). Lenis y el
      parallax se difieren a `requestIdleCallback` (antes provocaban un reflow
      forzado en la ruta crítica: 644 ms → ~8 ms); header y parallax escuchan el
      scroll nativo (Lenis scrollea la ventana con suavizado). La calculadora
      (island React) pasa a `client:visible` para diferir la hidratación (TBT).
      Imágenes ya optimizadas (astro:assets, `widths`/`sizes`, lazy salvo LCP con
      `fetchpriority`); fuente Inter con preload+swap. Medido con Lighthouse móvil.
- [x] **Fase 10 — QA final**: barrido completo (i18n, enlaces, SEO, accesibilidad)
      de las 33+6 páginas. **Auditorías Lighthouse móvil**: SEO 100 y buenas
      prácticas 100 en todo el sitio; accesibilidad 100 salvo las landings (96,
      por el contraste del botón WhatsApp — ver checklist); rendimiento 96/93/96
      (Fase 9). Corregidos: `alt` redundantes (portfolio/galería/equipo), contraste
      de texto secundario (mist→slate), enlace "Blog" del pie (404), migaja de
      landing sin barra final, salto de encabezado en `/proyectos`, filtro de
      portfolio (`role="group"` + `aria-pressed`). **Creadas las páginas legales
      que faltaban** (aviso legal + privacidad, ES/CA/EN) → sin enlaces 404 en el
      pie ni en el checkbox RGPD de los formularios. Sin errores de consola.
      Ver "Checklist de lanzamiento" abajo.

## Tracking (Fase 7)

Toda la analítica está escrita pero **dormida** hasta que se defina un contenedor
de GTM real. Para activarla:

1. Copia `.env.example` a `.env` y pon `PUBLIC_GTM_ID=GTM-XXXXXXX` (el ID real).
   Sin un ID válido (`^GTM-[A-Z0-9]+$`) no se carga GTM ni se muestra el banner.
2. Dentro del **contenedor de GTM** se configuran GA4 y las conversiones de
   Google Ads (los IDs de GA4/Ads no van en el código). Todas las etiquetas deben
   respetar Consent Mode: por defecto `ad_storage`, `ad_user_data`,
   `ad_personalization` y `analytics_storage` están **denegados** hasta que el
   usuario acepta. `security_storage` va concedido; `ads_data_redaction` y
   `url_passthrough` activos.

**Eventos que llegan al `dataLayer`** (para disparar etiquetas/conversiones en GTM):

| Evento | Cuándo | Parámetros |
|---|---|---|
| `form_submit` | Envío correcto de cualquier formulario de lead | `form_id`, `page`, `service` |
| `whatsapp_click` | Clic en cualquier enlace de WhatsApp (`[data-wa]`) | `click_source` (fab/header/contact/final-cta/quote-form/landing-*), `page`, `locale` |
| `phone_click` | Clic en cualquier `tel:` (`[data-phone]`) | `click_source` (`tel`), `page`, `locale` |
| `calc_start` · `calc_step` · `calc_complete` · `calc_lead_submit` · `calc_whatsapp_click` | Interacción con la calculadora | según el paso (ver `Calculator.tsx`) |

El botón de WhatsApp de la calculadora emite `calc_whatsapp_click` (con contexto
del cálculo) y **no** lleva `[data-wa]`, para no duplicar con `whatsapp_click`.
En GTM, mapea ambos a la misma conversión de WhatsApp si procede.

## Checklist de lanzamiento (Fase 10)

El sitio está **completo y verificado a nivel técnico**. Antes de publicar hay que
rellenar los datos del cliente (marcados con `[PENDIENTE]`/`[PENDING]`/`[PENDENT]`
en el código) y activar los servicios externos. Nada de esto es código nuevo: son
datos y credenciales.

**Bloqueantes de lanzamiento — datos del cliente:**
- [x] **Contacto** (`src/config/site.ts`): +34 623 80 81 72 (tel + WhatsApp) y
      admin@kobor.es (corregido de @kobor.com, ago-2026).
- [ ] **Identidad legal** (`src/config/site.ts`): `legalName` (razón social) y `nif`.
      Aparecen en el JSON-LD y en las páginas legales cuando existan. (`address` y
      `geo` ya rellenados con datos reales del propietario, ago-2026.)
- [ ] **Dominio real** en `astro.config.mjs` (`SITE`) — afecta a canonical, sitemap,
      hreflang, OG y `robots.txt`.
- [ ] **Tarifas reales** para la calculadora y las landings (`pricing.json` +
      `landing.pricingDisclaimer`).
- [ ] **Equipo**: nombres y cargos reales (`about.teamName`/`teamRole`; las 4 fotos
      ya están).
- [ ] **Portfolio**: más proyectos y fotos reales del "antes" (before/after).
- [ ] **Revisión jurídica** de aviso legal + privacidad + política de cookies
      (estructura RGPD/LSSI lista; faltan los datos de empresa y el visto bueno legal).

**Activación de servicios (credenciales / `.env`, en el deploy):**
- [ ] **Tracking**: `PUBLIC_GTM_ID` real + configurar GA4/Ads dentro del contenedor
      de GTM (ver sección "Tracking"). Todo dormido hasta entonces.
- [ ] **Leads** (`.env`): dos vías de email — SMTP del buzón de Hostinger
      (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` + `LEAD_TO_EMAIL`; recomendada, sin
      cuentas externas) o Resend (`RESEND_API_KEY` + `LEAD_TO_EMAIL`); opcional
      `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`. Sin credenciales el lead solo se
      registra en el log del servidor (¡se pierde en la práctica!). Test local:
      `node _build/smtp-catcher.mjs` + env vars apuntando a localhost:2525
      (ago-2026).
- [ ] **Hosting**: elegir adaptador (Vercel/Netlify/Cloudflare) — el de Node es interino.
- [ ] **Antispam** (Fase 6): activar reCAPTCHA/Turnstile en el endpoint `/api/lead`.

**Decisión de diseño pendiente (accesibilidad):**
- El botón de WhatsApp usa texto blanco sobre verde `#25d366` (~2:1), que **no cumple
  WCAG AA** — es la excepción de marca aprobada (estándar de WhatsApp) y mantiene las
  landings en 96 de accesibilidad. Si se exige AA estricto: texto oscuro sobre el verde
  (pasa a ~7.5:1) o un verde más oscuro. Cambio de una línea en `--color-whatsapp`/`.btn-whatsapp`.

**Verificado en QA (correcto):** SEO 100 y buenas prácticas 100 en todo el sitio;
accesibilidad 100 (salvo el botón WhatsApp); rendimiento 96/93/96 móvil; i18n completo
en ES/CA/EN; sin errores de consola; sin enlaces internos rotos; JSON-LD válido sin
fugas de `[PENDIENTE]`; sitemap con 39 URLs + hreflang correcto.
