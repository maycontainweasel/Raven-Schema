import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetUno,
} from 'unocss'
import lucide from '@iconify-json/lucide/icons.json'

const defaultBreakpoints = {
  m: '320px',
  mm: '380px',
  mmx: '381px',
  ml: '480px',
  mlx: '481px',
  txs: '550px',
  ts: '600px',
  t: '767px',
  tx: '768px',
  txl: '800px',
  tm: '991px',
  tmx: '992px',
  tl: '1024px',
  ds: '1024px',
  d: '1200px',
  dm: '1366px',
  dmx: '1440px',
  dmxx: '1441px',
  dml: '1600px',
  dmlx: '1750px',
  dl: '1900px',
  dxl: '2560px',
  dxxl: '3840px',
}

const loadBreakpoints = () => {
  try {
    const tokensPath = resolve(process.cwd(), 'app/assets/scss/helios/helios.tokens.json')
    if (!existsSync(tokensPath)) return defaultBreakpoints
    const raw = readFileSync(tokensPath, 'utf-8')
    const data = JSON.parse(raw)
    const list = Array.isArray(data?.breakpoints) ? data.breakpoints : null
    if (!list) return defaultBreakpoints
    const result: Record<string, string> = {}
    for (const item of list) {
      if (!item?.key || !item?.value) continue
      result[item.key] = item.value
    }
    return Object.keys(result).length ? result : defaultBreakpoints
  }
  catch {
    return defaultBreakpoints
  }
}

const formatScaleKey = (raw: string) => {
  const value = Number(raw)
  if (!Number.isFinite(value)) return raw
  const sign = value < 0 ? '-' : ''
  const absoluteValue = Math.abs(value)
  if (absoluteValue % 1 === 0) return `${sign}${absoluteValue}`
  const fixed = absoluteValue.toFixed(2)
  const [intPart, fracRaw] = fixed.split('.')
  const frac = fracRaw.replace(/0+$/, '')
  const normalized = `${intPart}${frac.padEnd(2, '0')}`
  const padded = intPart === '0' ? normalized.padStart(2, '0') : normalized
  return `${sign}${padded}`
}

export default defineConfig({
  content: {
    pipeline: {
      include: [
        './app/**/*.{vue,ts,js,md}',
        '../../app/**/*.{vue,ts,js,md}',
        '../../layers/**/*.{vue,ts,js,md}',
      ],
    },
  },
  presets: [
    presetUno(),
    presetIcons({
      collections: { lucide },
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
    presetTypography(),
  ],
  theme: {
    breakpoints: loadBreakpoints(),
    colors: {
      ink: 'var(--ds-text, #0f172a)',
      muted: 'var(--ds-muted, #667085)',
      panel: 'var(--ds-panel, #ffffff)',
      panelSoft: 'var(--ds-panel-soft, #f8f9fc)',
      border: 'var(--ds-border, #e3e7ef)',
      accent: 'var(--ds-accent, #1c2b4f)',
      accentSoft: 'var(--ds-accent-soft, #e7ecff)',
      accentStrong: 'var(--ds-accent-strong, #2858ff)',
      success: 'var(--ds-success, #19a974)',
      warning: 'var(--ds-warning, #f59f00)',
      danger: 'var(--ds-danger, #e03131)',
    },
    fontFamily: {
      sans: ['Poppins', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
    },
    boxShadow: {
      sm: 'var(--ds-shadow-sm, 0 6px 18px rgba(15, 23, 42, 0.06))',
      md: 'var(--ds-shadow-md, 0 18px 40px rgba(16, 24, 40, 0.12))',
      lg: 'var(--ds-shadow-lg, 0 30px 70px rgba(15, 23, 42, 0.2))',
    },
    borderRadius: {
      lg: 'var(--ds-radius-lg, 18px)',
      md: 'var(--ds-radius-md, 12px)',
      sm: 'var(--ds-radius-sm, 8px)',
    },
  },
  shortcuts: {
    'ui-card': 'bg-panel border-ds rounded-[var(--ds-card-radius)] shadow-[var(--ds-shadow-sm)]',
    'ui-pill': 'inline-flex items-center gap-2 rounded-full border border-border bg-panelSoft px-4 py-1.5 text-sm text-muted',
    'ui-btn': 'inline-flex items-center justify-center gap-2 rounded-[var(--ds-btn-radius)] px-[var(--ds-btn-pad-x)] h-[var(--ds-btn-height)] text-sm font-semibold transition',
    'ui-btn-primary': 'ui-btn bg-accentStrong text-white shadow-[var(--ds-shadow-sm)] hover:bg-[#2047d6]',
    'ui-btn-ghost': 'ui-btn border border-border text-ink hover:border-[#cfd6e5]',
    'ui-btn-soft': 'ui-btn bg-accentSoft text-accent border border-transparent',
  },
  preflights: [
    {
      getCSS: () => `
        :root {
          --ds-bg: #f4f6fb;
          --ds-panel: #ffffff;
          --ds-panel-soft: #f8f9fc;
          --ds-text: #0f172a;
          --ds-muted: #667085;
          --ds-border: #e3e7ef;
          --ds-accent: #1c2b4f;
          --ds-accent-strong: #2858ff;
          --ds-accent-soft: #e7ecff;
          --ds-success: #19a974;
          --ds-warning: #f59f00;
          --ds-danger: #e03131;
          --ds-radius-sm: 8px;
          --ds-radius-md: 12px;
          --ds-radius-lg: 18px;
          --ds-radius-xl: 28px;
          --ds-shadow-sm: 0 6px 18px rgba(15, 23, 42, 0.06);
          --ds-shadow-md: 0 18px 40px rgba(16, 24, 40, 0.12);
          --ds-shadow-lg: 0 30px 70px rgba(15, 23, 42, 0.2);
          --ds-border-width: 1px;
          --ds-btn-height: 44px;
          --ds-btn-pad-x: 20px;
          --ds-btn-radius: 999px;
          --ds-card-radius: 20px;
          --ds-card-border: 1px;
        }

        .type-default :is(p, li, h1, h2, h3, h4, h5, h6) {
          line-height: var(--lh-0);
          margin: 0;
        }

        .type-default :is(ul, ol) {
          margin: 0;
          padding-left: var(--v-1);
        }

        .type-grid {
          position: relative;
          background-image:
            linear-gradient(to bottom, rgba(99, 102, 241, 0.12) 1px, transparent 1px);
          background-size: 100% var(--lh-0);
        }

        .type-debug :is(p, li, h1, h2, h3, h4, h5, h6) {
          box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.25);
          border-radius: 6px;
        }

        .input,
        .select,
        .textarea {
          width: 100%;
          border: 1px solid rgba(203, 213, 225, 0.8);
          border-radius: 10px;
          background: #fff;
          padding: 0.5rem 0.7rem;
          font-size: 0.85rem;
          color: #0f172a;
        }

        .input-sm,
        .select-sm {
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
        }

        .input:focus,
        .select:focus,
        .textarea:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.6);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .ui-select-shell {
          position: relative;
          width: 100%;
        }

        .ui-select-input {
          padding-right: 2.6rem;
        }

        .ui-select-chevron {
          position: absolute;
          top: 1px;
          right: 1px;
          bottom: 1px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          border: 1px solid rgba(203, 213, 225, 0.8);
          background: #f8f9fc;
          color: #667085;
          border-top-right-radius: 10px;
          border-bottom-right-radius: 10px;
          pointer-events: none;
        }

        .ui-select-chevron--button {
          pointer-events: auto;
        }

        .ui-select-options {
          position: absolute;
          left: 0;
          z-index: 50;
          width: 100%;
          overflow: auto;
          border: 1px solid rgba(203, 213, 225, 0.8);
          border-radius: 10px;
          background: #fff;
          padding: 0.25rem;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid rgba(203, 213, 225, 0.8);
          background: #f8f9fc;
          color: #0f172a;
        }

        .badge-outline {
          background: transparent;
        }

        .ui-menu-items {
          position: absolute;
          right: 0;
          margin-top: 0.5rem;
          min-width: 180px;
          border-radius: 12px;
          border: 1px solid rgba(203, 213, 225, 0.8);
          background: #fff;
          padding: 0.35rem;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
          z-index: 60;
        }

        .ui-menu-item {
          display: flex;
          width: 100%;
          padding: 0.5rem 0.7rem;
          border-radius: 10px;
          font-size: 0.8rem;
          color: #0f172a;
        }

        .ui-menu-item--active {
          background: #e7ecff;
          color: #2047d6;
        }
      `,
    },
  ],
  rules: [
    [/^shadow-ds-(sm|md|lg)$/, ([, size]) => ({ 'box-shadow': `var(--ds-shadow-${size})` })],
    [/^radius-ds-(sm|md|lg|xl)$/, ([, size]) => ({ 'border-radius': `var(--ds-radius-${size})` })],
    [/^border-ds$/, () => ({
      'border-width': 'var(--ds-border-width)',
      'border-style': 'solid',
      'border-color': 'var(--ds-border)',
    })],
    [/^fs-(-?[\d.]+)$/, ([, value]) => ({ 'font-size': `var(--fs-${formatScaleKey(value)})` })],
    [/^f-(-?[\d.]+)$/, ([, value]) => ({ 'font-size': `var(--fs-${formatScaleKey(value)})` })],
    [/^lh-(-?[\d.]+)$/, ([, value]) => ({ 'line-height': `var(--lh-${formatScaleKey(value)})` })],
    [/^v-(-?[\d.]+)$/, ([, value]) => ({ height: `var(--v-${formatScaleKey(value)})` })],

    // scale-based spacing (ratio/grid mode)
    [/^sp-(-?[\d.]+)$/, ([, value]) => ({ padding: `var(--sp-${formatScaleKey(value)})` })],
    [/^spt-(-?[\d.]+)$/, ([, value]) => ({ 'padding-top': `var(--sp-${formatScaleKey(value)})` })],
    [/^spr-(-?[\d.]+)$/, ([, value]) => ({ 'padding-right': `var(--sp-${formatScaleKey(value)})` })],
    [/^spb-(-?[\d.]+)$/, ([, value]) => ({ 'padding-bottom': `var(--sp-${formatScaleKey(value)})` })],
    [/^spl-(-?[\d.]+)$/, ([, value]) => ({ 'padding-left': `var(--sp-${formatScaleKey(value)})` })],
    [/^spx-(-?[\d.]+)$/, ([, value]) => ({ 'padding-left': `var(--sp-${formatScaleKey(value)})`, 'padding-right': `var(--sp-${formatScaleKey(value)})` })],
    [/^spy-(-?[\d.]+)$/, ([, value]) => ({ 'padding-top': `var(--sp-${formatScaleKey(value)})`, 'padding-bottom': `var(--sp-${formatScaleKey(value)})` })],
    [/^sm-(-?[\d.]+)$/, ([, value]) => ({ margin: `var(--sp-${formatScaleKey(value)})` })],
    [/^smt-(-?[\d.]+)$/, ([, value]) => ({ 'margin-top': `var(--sp-${formatScaleKey(value)})` })],
    [/^smr-(-?[\d.]+)$/, ([, value]) => ({ 'margin-right': `var(--sp-${formatScaleKey(value)})` })],
    [/^smb-(-?[\d.]+)$/, ([, value]) => ({ 'margin-bottom': `var(--sp-${formatScaleKey(value)})` })],
    [/^sml-(-?[\d.]+)$/, ([, value]) => ({ 'margin-left': `var(--sp-${formatScaleKey(value)})` })],
    [/^smx-(-?[\d.]+)$/, ([, value]) => ({ 'margin-left': `var(--sp-${formatScaleKey(value)})`, 'margin-right': `var(--sp-${formatScaleKey(value)})` })],
    [/^smy-(-?[\d.]+)$/, ([, value]) => ({ 'margin-top': `var(--sp-${formatScaleKey(value)})`, 'margin-bottom': `var(--sp-${formatScaleKey(value)})` })],
    [/^sg-([\w-]+)$/, ([, value]) => ({ gap: `var(--sp-${value})` })],

    // grid-based spacing (vertical rhythm)
    [/^gp-([\w-]+)$/, ([, value]) => ({ padding: `var(--v-${value})` })],
    [/^gpt-([\w-]+)$/, ([, value]) => ({ 'padding-top': `var(--v-${value})` })],
    [/^gpr-([\w-]+)$/, ([, value]) => ({ 'padding-right': `var(--v-${value})` })],
    [/^gpb-([\w-]+)$/, ([, value]) => ({ 'padding-bottom': `var(--v-${value})` })],
    [/^gpl-([\w-]+)$/, ([, value]) => ({ 'padding-left': `var(--v-${value})` })],
    [/^gpx-([\w-]+)$/, ([, value]) => ({ 'padding-left': `var(--v-${value})`, 'padding-right': `var(--v-${value})` })],
    [/^gpy-([\w-]+)$/, ([, value]) => ({ 'padding-top': `var(--v-${value})`, 'padding-bottom': `var(--v-${value})` })],
    [/^gm-([\w-]+)$/, ([, value]) => ({ margin: `var(--v-${value})` })],
    [/^gmt-([\w-]+)$/, ([, value]) => ({ 'margin-top': `var(--v-${value})` })],
    [/^gmr-([\w-]+)$/, ([, value]) => ({ 'margin-right': `var(--v-${value})` })],
    [/^gmb-([\w-]+)$/, ([, value]) => ({ 'margin-bottom': `var(--v-${value})` })],
    [/^gml-([\w-]+)$/, ([, value]) => ({ 'margin-left': `var(--v-${value})` })],
    [/^gmx-([\w-]+)$/, ([, value]) => ({ 'margin-left': `var(--v-${value})`, 'margin-right': `var(--v-${value})` })],
    [/^gmy-([\w-]+)$/, ([, value]) => ({ 'margin-top': `var(--v-${value})`, 'margin-bottom': `var(--v-${value})` })],
    [/^g-([\w-]+)$/, ([, value]) => ({ gap: `var(--v-${value})` })],
  ],
})
