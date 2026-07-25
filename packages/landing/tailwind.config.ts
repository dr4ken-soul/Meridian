import type { Config } from 'tailwindcss'
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { fontFamily: { display: ['Geist', 'sans-serif'], sans: ['Geist', 'sans-serif'], mono: ['Geist Mono', 'monospace'] } } }, plugins: [] } satisfies Config
