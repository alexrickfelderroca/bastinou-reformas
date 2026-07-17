# Bastinou — sitio web

Sitio de captación de leads para **Bastinou** (reformas y construcción premium en
Barcelona y Cataluña). Trilingüe (ES/CA/EN), estático, orientado a Google Ads y SEO.
La fuente de verdad del proyecto es `CLAUDE.pdf` (especificación) + `Brief Bastinou ES.docx`.

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
  pages/                    index (es) · ca/ · en/ · 404
  assets/                   brand/ (logo) · team/ (equipo) — optimizadas por astro:assets
public/
  fonts/                    Inter woff2 (preload)
  og/                       Imágenes Open Graph — [placeholder, se generan en Fase 8]
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
      granular en localStorage (`bastinou_consent`, caducidad 180 días) reaplicado
      en cada carga. Todo **dormido** hasta definir `PUBLIC_GTM_ID` real (sin él:
      ni GTM ni banner). Eventos `whatsapp_click`/`phone_click` (listener delegado)
      + los ya existentes `form_submit` y `calc_*`. Política de cookies (ES/CA/EN)
      con botón "Gestionar cookies" (reabre las preferencias). Ver "Tracking" abajo.
- [ ] Fase 8 — SEO técnico (JSON-LD, OG, sitemap)
- [ ] Fase 9 — Rendimiento (≥90 móvil)
- [ ] Fase 10 — QA final

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

## Pendientes de material (CLAUDE.pdf §8)

Buscar `[PENDIENTE` en el código: teléfono, WhatsApp, email, razón social/NIF,
dirección y **documento de tarifas** para `pricing.json` (Fase 4). El dominio real
se configura en `astro.config.mjs` (`SITE`). **Tracking (Fase 7):** `PUBLIC_GTM_ID`
en `.env` + configuración de GA4/Ads dentro del contenedor de GTM. La política de
cookies referencia la razón social/NIF (placeholder hasta recibir los datos).
