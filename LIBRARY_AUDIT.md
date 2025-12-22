# Library Audit: Opportunities to Reduce Custom Code

This document identifies areas where external libraries or **native JavaScript APIs** could replace custom implementations, reducing maintenance burden and improving reliability.

## Executive Summary

The `apps/web/src/lib/agents/tools/` directory contains **~3,400 lines** of custom utility code that could be reduced to **~500 lines** by adopting:

1. **Native JS APIs** (preferred) - Zero bundle cost, future-proof
2. **Polyfills for Stage 3+ proposals** - Use now, remove when native
3. **Modern TypeScript-first libraries** - When no native option exists

---

## Native JavaScript APIs (Prefer These First!)

### 1. Deep Cloning → `structuredClone()` (Native)

**File:** `utility.ts` - Multiple uses of `JSON.parse(JSON.stringify(obj))`

**Current:**
```ts
const result = JSON.parse(JSON.stringify(obj))  // Loses functions, dates, etc.
```

**Native Solution (No Library!):**
```ts
const result = structuredClone(obj)  // Handles Date, Map, Set, ArrayBuffer, circular refs
```

**Benefits:**
- Zero bundle size
- Handles Map, Set, Date, RegExp, ArrayBuffer, circular references
- Available in all modern browsers + Node 17+ + Cloudflare Workers

**Limitations:** Cannot clone functions, DOM nodes, or symbols (but neither can JSON.parse trick)

Sources: [MDN structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone), [Builder.io Deep Cloning](https://www.builder.io/blog/structured-clone)

---

### 2. Text Segmentation → `Intl.Segmenter` (Native)

**File:** `utility.ts:463-468` - Word counting

**Current:**
```ts
const words = text.trim().split(/\s+/).filter((w) => w.length > 0)
```

**Native Solution:**
```ts
const segmenter = new Intl.Segmenter('en', { granularity: 'word' })
const words = [...segmenter.segment(text)].filter(s => s.isWordLike)
```

**Benefits:**
- Proper word segmentation for CJK languages (Chinese, Japanese, Korean)
- Sentence segmentation built-in
- Grapheme-aware character counting (handles emoji correctly)
- Baseline available since April 2024

Sources: [MDN Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter), [web.dev Baseline](https://web.dev/blog/intl-segmenter)

---

### 3. Color Manipulation → CSS `color-mix()` + `oklch()` (Native CSS)

**File:** `transform.ts:586-821` (~235 lines)

For **CSS output contexts**, use native CSS instead of JS:

```css
/* Lighten/darken with oklch */
--lighter: oklch(from var(--base) calc(l + 0.15) c h);
--darker: oklch(from var(--base) calc(l - 0.15) c h);

/* Blend two colors */
--blended: color-mix(in oklch, var(--color1), var(--color2) 50%);
```

For **JS color manipulation**, see `culori` or `colorjs.io` below.

Sources: [MDN color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix), [Evil Martians OKLCH](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)

---

## Polyfills for Future Native APIs

### 4. DateTime → `@js-temporal/polyfill` (Stage 3 TC39)

**File:** `utility.ts:7-188` (~180 lines)

The **Temporal API** is Stage 3 and will replace `Date`. Use the polyfill now, remove later.

**Current:**
```ts
const formatDate = (d: Date, fmt?: string, tz?: string): string => {
  // 180 lines of manual date handling...
}
```

**With Temporal Polyfill:**
```ts
import { Temporal } from '@js-temporal/polyfill'

const now = Temporal.Now.zonedDateTimeISO('America/New_York')
const relative = now.since(other).toString()  // "P3DT4H"
const formatted = now.toLocaleString('en-US', { dateStyle: 'full' })
```

**Benefits:**
- Immutable, timezone-aware, nanosecond precision
- Will become native (remove polyfill later)
- Solves DST edge cases properly
- Firefox 139+ has experimental support

**Alternative:** `date-fns` if you need something battle-tested now (~10KB tree-shaken)

Sources: [MDN Temporal](https://developer.mozilla.org/en-US/blog/javascript-temporal-is-coming/), [Temporal Polyfill](https://github.com/js-temporal/temporal-polyfill)

---

## Modern TypeScript Libraries

### 5. Phone Validation → `libphonenumber-js` ✓

**File:** `validation.ts:97-186` (~90 lines)

Still the best option. TypeScript-first, actively maintained (synced with Google's lib Sep 2025).

```bash
bun add libphonenumber-js
```

```ts
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
const phone = parsePhoneNumber(input, 'US')
return { valid: phone.isValid(), formatted: phone.format('E.164') }
```

**Size:** ~15KB tree-shaken (vs Google's 550KB)
**Edge Compatible:** Yes

Sources: [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js), [npm-compare](https://npm-compare.com/libphonenumber-js,google-libphonenumber)

---

### 6. Validation → Already Using Zod! (Extend It)

**File:** `validation.ts` - Email, credit card, IP, URL validation

You're already using **Zod** extensively. Instead of adding `validator.js`, extend Zod with refinements:

```ts
import { z } from 'zod'

// Email with better validation
const emailSchema = z.string().email().refine(
  (email) => !email.endsWith('.con'),  // typo check
  { message: 'Did you mean .com?' }
)

// Credit card with Luhn
const creditCardSchema = z.string().refine(luhnCheck, 'Invalid card number')

// IP address (v4 or v6)
const ipSchema = z.string().ip()  // Zod has built-in IP validation!
```

**Alternative:** If you need more validators, consider **Valibot** (< 1KB, modular, tree-shakeable) instead of validator.js

Sources: [Zod vs Valibot](https://dev.to/sheraz4194/zod-vs-valibot-which-validation-library-is-right-for-your-typescript-project-303d), [Valibot](https://valibot.dev/)

---

### 7. Markdown → `marked` or `mdast-util-from-markdown`

**File:** `transform.ts:7-177` (~170 lines)

**Option A: `marked`** - Simple, fast, battle-tested
```bash
bun add marked
```
```ts
import { marked } from 'marked'
const html = marked.parse(markdown)
```

**Option B: `mdast-util-from-markdown`** - AST-based, part of unified ecosystem
```bash
bun add mdast-util-from-markdown mdast-util-to-hast hast-util-to-html
```
```ts
import { fromMarkdown } from 'mdast-util-from-markdown'
const ast = fromMarkdown(markdown)  // Full AST for manipulation
```

Both are TypeScript-first and edge-compatible.

Sources: [marked](https://marked.js.org/), [mdast-util-from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown)

---

### 8. QR Code → `@libs/qrcode` (JSR) - Edge Native!

**File:** `transform.ts:314-484` (~170 lines) - **CRITICAL: Current impl is broken**

**Best for Edge:** Use `@libs/qrcode` from JSR - zero dependencies, runtime agnostic:

```bash
bunx jsr add @libs/qrcode
```
```ts
import { qrcode } from '@libs/qrcode'
const svg = qrcode(data, { output: 'svg', ecl: 'M' })
```

**Alternative:** `qrcode-svg` (used in Cloudflare's official tutorial)
```bash
bun add qrcode-svg
```

Sources: [@libs/qrcode JSR](https://jsr.io/@libs/qrcode), [Cloudflare QR Tutorial](https://developers.cloudflare.com/workers/tutorials/build-a-qr-code-generator/)

---

### 9. Color Operations → `culori` or `colorjs.io`

**File:** `transform.ts:586-821` (~235 lines)

**Option A: `culori`** - Functional, tree-shakeable, all color spaces
```bash
bun add culori
```
```ts
import { oklch, formatHex, wcagContrast } from 'culori'
const color = oklch('#ff0000')
const lighter = { ...color, l: color.l + 0.1 }
const contrast = wcagContrast('#fff', '#000')
```

**Option B: `colorjs.io`** - CSS Color 4 compliant, created by Lea Verou
```bash
bun add colorjs.io
```

Both support OKLCH, P3, and modern color spaces.

Sources: [Color.js](https://colorjs.io/), [better-color-tools](https://github.com/drwpow/better-color-tools)

---

### 10. Diff → `diff` (jsdiff) v8+

**File:** `transform.ts:179-312` (~135 lines)

The `diff` package ships TypeScript types since v8. Still the standard.

```bash
bun add diff
```
```ts
import { diffLines, createPatch } from 'diff'
const changes = diffLines(original, modified)
```

For **object/JSON diffing**, use `microdiff` (0.5KB gzipped):
```bash
bun add microdiff
```

Sources: [jsdiff](https://github.com/kpdecker/jsdiff), [microdiff](https://github.com/AsyncBanana/microdiff)

---

### 11. RSS/XML Parsing → `fast-xml-parser`

**File:** `data.ts:7-158` (~150 lines)

`rss-parser` has Node.js dependencies. Use `fast-xml-parser` for edge:

```bash
bun add fast-xml-parser
```
```ts
import { XMLParser } from 'fast-xml-parser'
const parser = new XMLParser()
const feed = parser.parse(xmlString)
```

Sources: [Cloudflare RSS Worker](https://www.raymondcamden.com/2023/10/31/building-a-generic-rss-parser-service-with-cloudflare-workers)

---

### 12. Utility Functions → `radashi` (Modern Lodash Alternative)

**File:** `utility.ts:193-349` (~155 lines)

Use **Radashi** - a TypeScript-first, tree-shakeable utility library (4.8KB gzipped vs Lodash's 24KB):

```bash
bun add radashi
```

```ts
import { get, set, clone, pick, omit, debounce, throttle } from 'radashi'

// Deep clone with native API
const cloned = structuredClone(obj)

// Path operations
const value = get(obj, 'user.address.city')
const updated = set(obj, 'user.name', 'Alice')

// Object utilities
const subset = pick(obj, ['id', 'name'])
const filtered = omit(obj, ['password', 'secret'])
```

**Why Radashi over Lodash:**
- TypeScript-first (not retrofitted types)
- Zero dependencies
- 4.8KB gzipped (vs Lodash 24KB)
- Actively maintained (monthly releases)
- No deprecated JS functions (map, reduce, etc. - use native)
- Tree-shakeable by design

Sources: [Radashi](https://radashi.js.org/), [radashi npm](https://www.npmjs.com/package/radashi)

---

## Updated Recommendations Summary

| Category | Recommendation | Bundle Impact |
|----------|---------------|---------------|
| Deep Clone | `structuredClone()` native | 0 KB |
| Text Segmentation | `Intl.Segmenter` native | 0 KB |
| Color (CSS) | `color-mix()` + `oklch()` native | 0 KB |
| DateTime | `@js-temporal/polyfill` (or `date-fns`) | ~15KB / ~10KB |
| Phone | `libphonenumber-js` | ~15KB |
| Validation | Extend Zod (already using) | 0 KB |
| Markdown | `marked` | ~8KB |
| QR Code | `@libs/qrcode` (JSR) | ~5KB |
| Colors (JS) | `culori` | ~10KB |
| Diff | `diff` | ~5KB |
| XML/RSS | `fast-xml-parser` | ~15KB |
| Utilities | `radashi` | ~5KB |

**Total new dependencies:** ~75-90KB (vs previous estimate of ~170KB)

---

## Migration Priority

### Phase 1: Critical Fixes
1. **QR Code** - Current implementation is explicitly broken
2. **Deep Clone** - Replace `JSON.parse(JSON.stringify())` with `structuredClone()`

### Phase 2: Use Native APIs
3. **Intl.Segmenter** - For word counting, text segmentation
4. **Temporal polyfill** - For datetime operations

### Phase 3: Add Minimal Libraries
5. **libphonenumber-js** - Phone validation (200+ countries)
6. **marked** or **mdast** - Markdown parsing
7. **fast-xml-parser** - RSS/XML parsing

### Phase 4: Cleanup
8. Extend Zod for remaining validation
9. Add `culori` if JS color manipulation needed
10. Add `diff` if diff functionality used heavily

---

## Edge Runtime Compatibility Verified

All recommendations work on Cloudflare Workers:

| Library | Edge Compatible | Notes |
|---------|----------------|-------|
| `structuredClone` | ✅ Native | |
| `Intl.Segmenter` | ✅ Native | |
| `@js-temporal/polyfill` | ✅ | |
| `libphonenumber-js` | ✅ | |
| `marked` | ✅ | |
| `@libs/qrcode` | ✅ | Designed for edge |
| `culori` | ✅ | |
| `diff` | ✅ | |
| `fast-xml-parser` | ✅ | |
| `radashi` | ✅ | Zero deps, TS-first |

---

## References

- [MDN structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- [MDN Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [MDN Temporal API](https://developer.mozilla.org/en-US/blog/javascript-temporal-is-coming/)
- [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/)
- [JSR @libs/qrcode](https://jsr.io/@libs/qrcode)
- [Color.js](https://colorjs.io/)
- [Valibot](https://valibot.dev/)
- [Radashi](https://radashi.js.org/)
