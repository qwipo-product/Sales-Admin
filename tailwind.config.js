/**
 * Reconstructed Tailwind CSS 3.3.x config (see STYLES.md "Tailwind").
 * Evidence: default theme (default screens 640/768/1024/1280/1536 in .container, default spacing scale,
 * default colors e.g. text-white / bg-slate-50), preflight ON, no prefix, important:false (only explicit `!` utilities
 * are !important), default separator ':' (hover:, sm:, md:, rtl: variants present).
 * Utilities in the bundle include words that only occur in TS/HTML text (visible, static, fixed, table, contents,
 * transform, filter, transition), so both .html and .ts files are scanned.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  // Utilities present in the production stylesheet whose source templates are not part of this app
  safelist: [
    '!absolute', '!mr-4', 'mb-6', '!flex', 'contents', 'hidden', '!h-6', 'h-[calc(100vh-90px)]', '!w-6',
    'flex-wrap', 'overflow-hidden', 'rounded', 'pl-4', 'text-[18px]',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
