# Library Audit: Opportunities to Reduce Custom Code

This document identifies areas where external libraries could replace custom implementations, reducing maintenance burden and improving reliability.

## Executive Summary

The `apps/web/src/lib/agents/tools/` directory contains **~3,400 lines** of custom utility code that could be reduced to **~500 lines** by adopting well-maintained libraries. This would:

- Reduce maintenance burden
- Improve edge case handling
- Add international support (phone numbers, locales)
- Fix known limitations (e.g., QR code is explicitly marked as "simplified placeholder")

## High Priority Replacements

### 1. Phone Number Validation & Formatting

**File:** `validation.ts:97-186` (~90 lines)

**Current Implementation:**
- Only supports 3 countries (US, GB, CA)
- Hardcoded regex patterns per country
- Basic formatting options

**Recommended Library:** `libphonenumber-js` (~80KB, tree-shakeable to ~15KB)

```ts
// Current (90 lines)
const countryRules: Record<string, { pattern: RegExp; format: (digits: string) => string }> = {
  US: { pattern: /^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/, ... },
  GB: { pattern: /^(44)?([1-9]\d{9,10})$/, ... },
  CA: { pattern: /^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/, ... },
}

// With library (10 lines)
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
const phone = parsePhoneNumber(input, country)
return { valid: phone.isValid(), formatted: phone.format('E.164') }
```

**Benefits:**
- Supports 200+ countries
- Proper carrier detection
- All standard formats (E.164, National, International)

---

### 2. Email & General Validation

**File:** `validation.ts:7-92` (~85 lines for email), `validation.ts:285-394` (~110 lines for credit card), `validation.ts:399-516` (~115 lines for IP)

**Current Implementation:**
- Manual regex patterns
- Hardcoded typo dictionary (only 12 common typos)
- Custom Luhn algorithm
- Manual IPv4/IPv6 parsing

**Recommended Library:** `validator.js` (~25KB)

```ts
// Current: 300+ lines of validation code

// With library:
import validator from 'validator'
validator.isEmail(email)
validator.isCreditCard(number)
validator.isIP(ip, 4)  // or 6 for IPv6
validator.isURL(url)
```

**Benefits:**
- Battle-tested patterns
- Comprehensive credit card type detection
- Full IPv6 support including compressed notation

---

### 3. DateTime Operations

**File:** `utility.ts:7-188` (~180 lines)

**Current Implementation:**
- Manual date parsing and formatting
- Basic relative time calculation
- Limited timezone support

**Recommended Library:** `date-fns` (~10KB tree-shaken) or `Day.js` (~2KB)

```ts
// Current (180 lines)
const formatDate = (d: Date, fmt?: string, tz?: string): string => {
  switch (fmt) {
    case 'relative': {
      const diffMs = now.getTime() - d.getTime()
      const diffDay = Math.floor(diffHour / 24)
      if (diffDay < 30) return past ? `${diffDay} days ago` : `in ${diffDay} days`
      // ...
    }
  }
}

// With date-fns (20 lines)
import { format, formatRelative, add, differenceInDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
```

**Benefits:**
- Proper timezone handling
- Locale support
- Immutable operations
- Full relative time formatting

---

### 4. JSON Path Operations

**File:** `utility.ts:193-349` (~155 lines)

**Current Implementation:**
- Manual dot notation path traversal
- `JSON.parse(JSON.stringify(obj))` for deep cloning
- Basic set/delete operations

**Recommended Library:** `lodash` (specific functions) or `lodash-es` (tree-shakeable)

```ts
// Current (70 lines for getByPath, setByPath, deleteByPath)
const getByPath = (obj: unknown, pathStr: string): unknown => {
  const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current: unknown = obj
  for (const part of parts) { ... }
}

// With lodash (3 lines)
import { get, set, unset } from 'lodash-es'
const value = get(obj, path)
const newObj = set(structuredClone(obj), path, value)
```

**Benefits:**
- Handles edge cases (undefined paths, arrays, etc.)
- Uses `structuredClone()` instead of JSON parse/stringify
- Well-tested path parsing

---

### 5. Markdown Parsing

**File:** `transform.ts:7-177` (~170 lines)

**Current Implementation:**
- Regex-based parser
- Missing GFM features (tables, task lists, footnotes)
- Basic HTML sanitization

**Recommended Library:** `markdown-it` (~30KB) or `marked` (~25KB)

```ts
// Current (regex-based, fragile)
html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
// ... 50+ more regex replacements

// With markdown-it
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt({ html: true, linkify: true })
const html = md.render(markdown)
```

**Benefits:**
- Full CommonMark + GFM support
- Tables, task lists, footnotes
- Plugin ecosystem
- Proper XSS protection

---

### 6. Diff Algorithm

**File:** `transform.ts:179-312` (~135 lines)

**Current Implementation:**
- Custom LCS (Longest Common Subsequence) algorithm
- O(n*m) space complexity
- Basic unified diff output

**Recommended Library:** `diff` (~10KB) or `diff-match-patch` (~40KB)

```ts
// Current (custom LCS implementation)
const lcs = (a: string[], b: string[]): number[][] => {
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) { ... }
}

// With diff library
import { diffLines, createPatch } from 'diff'
const changes = diffLines(original, modified)
const patch = createPatch('file', original, modified)
```

**Benefits:**
- Optimized algorithms
- Semantic diff options
- Patch generation/application
- Three-way merge support

---

### 7. QR Code Generation

**File:** `transform.ts:314-484` (~170 lines)

**Current Implementation:**
- Comments explicitly state: "For production, use a proper QR code library"
- Simplified placeholder that won't produce valid QR codes
- Missing error correction implementation

**Recommended Library:** `qrcode` (~35KB)

```ts
// Current (explicitly marked as placeholder)
// "Simple QR code matrix generation (Reed-Solomon encoding simplified)"
// "For production, use a proper QR code library"
const generateMatrix = (data: string, ecLevel: string): boolean[][] => { ... }

// With qrcode library
import QRCode from 'qrcode'
const svg = await QRCode.toString(data, { type: 'svg', errorCorrectionLevel: 'M' })
const dataUrl = await QRCode.toDataURL(data)
```

**Benefits:**
- Valid, scannable QR codes
- Proper Reed-Solomon error correction
- Multiple output formats (SVG, PNG, terminal)

---

### 8. Color Operations

**File:** `transform.ts:586-821` (~235 lines)

**Current Implementation:**
- Manual RGB/HSL/Hex conversion
- Limited named colors (only 8)
- Basic contrast calculation

**Recommended Library:** `color` (~8KB) or `chroma-js` (~15KB)

```ts
// Current (manual color space conversion)
const rgbToHsl = (r: number, g: number, b: number): { h, s, l } => { ... }
const hslToRgb = (h: number, s: number, l: number): { r, g, b } => { ... }

// With color library
import Color from 'color'
const color = Color('#ff0000')
const hsl = color.hsl()
const lighter = color.lighten(0.2)
const contrast = color.contrast(Color('white'))
```

**Benefits:**
- All color spaces (RGB, HSL, HSV, HWB, LAB, LCH)
- 140+ named colors
- WCAG contrast checking
- Color mixing and manipulation

---

### 9. RSS/Atom Feed Parsing

**File:** `data.ts:7-158` (~150 lines)

**Current Implementation:**
- Regex-based XML parsing
- Missing CDATA edge cases
- Limited Atom support

**Recommended Library:** `rss-parser` (~15KB)

```ts
// Current (regex-based, fragile)
const getTagContent = (tag: string, content: string): string | null => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  return match ? match[1].trim() : null
}

// With rss-parser
import Parser from 'rss-parser'
const parser = new Parser()
const feed = await parser.parseURL(url)
// feed.title, feed.items, etc.
```

**Benefits:**
- Proper XML parsing
- Full RSS 2.0 and Atom support
- Custom field extraction
- Error handling for malformed feeds

---

### 10. CSV Parsing

**File:** `data.ts:727-864` (~140 lines)

**Current Implementation:**
- Manual CSV parsing with quote handling
- Basic delimiter support
- Limited error handling

**Recommended Library:** `papaparse` (~20KB) - works in browser/Node

```ts
// Current
const parseRow = (row: string): string[] => {
  let inQuotes = false
  for (let i = 0; i < row.length; i++) { ... }
}

// With papaparse
import Papa from 'papaparse'
const result = Papa.parse(csv, { header: true, dynamicTyping: true })
const csv = Papa.unparse(data)
```

**Benefits:**
- Streaming for large files
- Auto-detect delimiters
- Type coercion
- Web Worker support

---

## Medium Priority Replacements

### 11. Template Rendering

**File:** `data.ts:869-939` (~70 lines)

**Recommended:** `mustache` (~10KB) or `handlebars` (~25KB)

### 12. JSON Schema Validation

**File:** `data.ts:597-722` (~125 lines)

**Recommended:** `ajv` (~40KB) - full JSON Schema spec support

### 13. UUID/ULID Generation

**File:** `utility.ts:706-793` (~85 lines)

**Recommended:** Keep `crypto.randomUUID()` for UUID v4, add `ulid` package for ULID

---

## Low Priority / Keep As-Is

These implementations are fine to keep:

| Component | Reason |
|-----------|--------|
| **Hash (SHA-256/384/512)** | Uses Web Crypto API correctly |
| **Base64 encode/decode** | Uses native `btoa`/`atob` |
| **Compression (gzip/deflate)** | Uses native Compression Streams API |
| **AES-GCM encryption** | Uses Web Crypto API correctly |
| **URL parsing** | Uses native URL API |

---

## Implementation Recommendations

### Package Installation

```bash
bun add libphonenumber-js validator date-fns lodash-es markdown-it diff qrcode color rss-parser papaparse
```

### Estimated Bundle Impact

| Package | Size (min+gzip) | Tree-shakeable |
|---------|----------------|----------------|
| libphonenumber-js | ~15KB | Yes |
| validator | ~25KB | Partial |
| date-fns | ~10KB | Yes |
| lodash-es | ~5KB | Yes |
| markdown-it | ~30KB | No |
| diff | ~10KB | Yes |
| qrcode | ~35KB | Partial |
| color | ~8KB | Yes |
| rss-parser | ~15KB | No |
| papaparse | ~20KB | Yes |
| **Total** | ~173KB | - |

Note: With tree-shaking and only importing needed functions, actual impact is closer to **~80-100KB**.

### Migration Strategy

1. **Phase 1 (Critical):** Replace QR code tool (current implementation produces invalid QR codes)
2. **Phase 2 (High Value):** Phone validation, DateTime, Markdown
3. **Phase 3 (Maintenance):** Email/URL/IP validation, CSV, RSS
4. **Phase 4 (Optional):** Color, Diff, JSON Schema

---

## Code Reduction Summary

| File | Current Lines | After Migration | Reduction |
|------|--------------|-----------------|-----------|
| validation.ts | 590 | 150 | -74% |
| utility.ts | 1055 | 400 | -62% |
| transform.ts | 830 | 200 | -76% |
| data.ts | 950 | 350 | -63% |
| **Total** | **3,425** | **1,100** | **-68%** |

---

## Edge Runtime Compatibility Note

Since this project runs on Cloudflare Workers (edge runtime), ensure all libraries are edge-compatible:

- `libphonenumber-js` - Edge compatible
- `validator` - Edge compatible
- `date-fns` - Edge compatible
- `lodash-es` - Edge compatible
- `markdown-it` - Edge compatible
- `diff` - Edge compatible
- `qrcode` - Edge compatible (use `qrcode/lib/browser`)
- `color` - Edge compatible
- `rss-parser` - Needs polyfill for `xml2js` dependency
- `papaparse` - Edge compatible

For `rss-parser`, consider using `feed` package instead, which is lighter and more edge-friendly.
