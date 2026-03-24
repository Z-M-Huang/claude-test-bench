/**
 * Tailwind CSS v4 configuration reference.
 *
 * In Tailwind v4 the canonical config lives in CSS (@theme blocks in index.css).
 * This file exists for tooling compatibility (IDE autocomplete, etc.) and as
 * a single-source-of-truth reference for the design tokens extracted from
 * docs/design.html.  The actual runtime config is in src/web/src/index.css.
 */

import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/web/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        'on-secondary-fixed-variant': '#2f2ebe',
        'on-tertiary-container': '#e6ecff',
        'surface-bright': '#31394d',
        'on-tertiary': '#002e6a',
        'outline-variant': '#4d4354',
        'on-tertiary-fixed-variant': '#004395',
        'surface-variant': '#2d3449',
        'secondary-fixed': '#e1e0ff',
        'on-surface': '#dae2fd',
        'on-secondary-fixed': '#07006c',
        'on-tertiary-fixed': '#001a42',
        'on-secondary': '#1000a9',
        'tertiary-container': '#0466d9',
        'on-background': '#dae2fd',
        'primary-fixed': '#f0dbff',
        'tertiary-fixed': '#d8e2ff',
        'surface': '#0b1326',
        'surface-container-low': '#131b2e',
        'surface-tint': '#ddb8ff',
        'surface-container-lowest': '#060e20',
        'outline': '#988ca0',
        'primary-fixed-dim': '#ddb8ff',
        'inverse-surface': '#dae2fd',
        'on-primary-container': '#f6e6ff',
        'error': '#ffb4ab',
        'background': '#0b1326',
        'on-secondary-container': '#b0b2ff',
        'on-primary': '#490080',
        'error-container': '#93000a',
        'tertiary-fixed-dim': '#adc6ff',
        'on-primary-fixed-variant': '#6800b4',
        'surface-container': '#171f33',
        'on-error-container': '#ffdad6',
        'surface-dim': '#0b1326',
        'on-primary-fixed': '#2c0051',
        'secondary-container': '#3131c0',
        'inverse-on-surface': '#283044',
        'surface-container-high': '#222a3d',
        'primary-container': '#9333ea',
        'surface-container-highest': '#2d3449',
        'secondary': '#c0c1ff',
        'primary': '#ddb8ff',
        'on-surface-variant': '#cfc2d7',
        'tertiary': '#adc6ff',
        'on-error': '#690005',
        'inverse-primary': '#861fdd',
        'secondary-fixed-dim': '#c0c1ff',
        'success-green': '#10b981',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
    },
  },
} satisfies Config;
