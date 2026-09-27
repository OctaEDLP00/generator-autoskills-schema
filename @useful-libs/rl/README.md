# @useful-libs/rl

Feature-rich readline wrapper with interactive menus, validation, password input, and a plugin/hook system.

## Install

```bash
npm install @useful-libs/rl
pnpm add @useful-libs/rl
```

## Usage

```ts
import { Rl, stylize } from '@useful-libs/rl'

const rl = new Rl()

// Basic prompt
const name = await rl.ask('What is your name?')

// With validation and default
const email = await rl.ask('Email:', {
  default: 'user@example.com',
  validate: (v) => v.includes('@') || 'Invalid email',
})

// Confirmation
const ok = await rl.confirm('Continue?', { default: true })

// Interactive menu (arrow keys + enter)
const option = await rl.menu('Choose:', [
  { label: 'Option A', value: 'a', description: 'First option' },
  { label: 'Option B', value: 'b', description: 'Second option' },
])

// Multiselect (checkbox list, space to toggle, `a` to select all)
const selected = await rl.multiselect('Pick skills:', [
  { label: 'React', value: 'react', hint: '← react', checked: true },
  { label: 'Vue', value: 'vue', group: 'Frontend', description: 'Progressive framework' },
  { label: 'Express', value: 'express', group: 'Backend', disabled: true },
], { defaultChecked: false, min: 1 })

// Hidden password input
const pass = await rl.password('Enter password:')

rl.close()
```

## Multiselect

`multiselect` renders an interactive checkbox list. Navigate with the arrow
keys (or `j`/`k`), toggle the focused item with `Space`, press `a` to
select/unselect all, and confirm with `Enter`. The cursor wraps around the
edges by default.

```ts
const selected = await rl.multiselect('Select skills to install:', [
  { label: 'react-best-practices', value: 'react-best-practices', hint: 'React' },
  { label: 'next-upgrade', value: 'next-upgrade', hint: 'Next.js' },
  { label: 'prisma-guide', value: 'prisma-guide', hint: 'Prisma' },
], { defaultChecked: true, min: 1 })
// => ['react-best-practices', 'next-upgrade', 'prisma-guide']
```

### Option fields

| Field | Type | Description |
|---|---|---|
| `label` | `string` | Display label shown to the user |
| `value` | `string` | Value returned when selected |
| `description` | `string` | Extra text shown after the label |
| `group` | `string` | Group header; consecutive options in the same group share one header, separated by a blank line |
| `hint` | `string` | Trailing hint shown on the right (e.g. the source tech) |
| `checked` | `boolean` | Initial checked state (default: `config.defaultChecked`) |
| `disabled` | `boolean` | Cannot be toggled (default: `false`) |

### Config

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultChecked` | `boolean` | `false` | Initial state for options without an explicit `checked` |
| `min` | `number` | `0` | Minimum selections required to confirm |
| `max` | `number` | `Infinity` | Maximum selections allowed |
| `wrap` | `boolean` | `true` | Cursor wraps around when moving past the first/last option |
| `shortcuts` | `MultiselectShortcut[]` | `[]` | Custom single-key actions rendered in the hints line |

### Custom shortcuts

Shortcuts let you expose one-key bulk actions. `fn` receives all options and
returns the full desired checked array; disabled options are always forced to
unchecked.

```ts
const selected = await rl.multiselect('Select skills:', skills, {
  shortcuts: [
    { key: 'n', label: 'none', fn: () => skills.map(() => false) },
    { key: 'r', label: 'react only', fn: (opts) => opts.map((o) => o.hint === 'React') },
  ],
})
// hints line: ↑/↓ move · space toggle · a all · [n] none · [r] react only · enter confirm (x/y)
```

Raises `RlError('CANCELLED')` when the user interrupts (Ctrl+C), and
`RlError('EMPTY_MENU')` when called with an empty options array. When the input
stream does not support raw mode, it falls back to a numbered list where you
toggle options by index (e.g. `1,3`) and confirm with an empty line.

## Menu navigation

`menu(prompt, options, config?)` returns the selected `value` (`Promise<string>`).
`config` is `MenuConfig`: only `wrap` (default `true`). Navigation supports
arrows and `j`/`k`, with wrap-around enabled by default.

```ts
const lang = await rl.menu('Choose a language:', langs, { wrap: false })
```

## Prompts

| Method | Signature | Description |
|---|---|---|
| `ask` | `ask(prompt, options?: AskOptions): Promise<string>` | Prompt for text. `AskOptions`: `default` (used on empty input), `validate: (input) => true \| string \| Promise<…>` (re-prompts on string), `filter: (input) => string \| Promise<string>` (transform before returning) |
| `confirm` | `confirm(prompt, options?: ConfirmOptions): Promise<boolean>` | `y`/`yes`/`true`/`1` → `true`, `n`/`no`/`false`/`0` → `false`, empty → `options.default` (default `false`) |
| `password` | `password(prompt): Promise<string>` | Hidden input (masks with `*`); falls back to a plain prompt without raw mode |
| `close` | `close(): Promise<void>` | Run `onBeforeClose` hooks and release the interface |

## Hook system

Hooks are managed by the standalone `Hooks` class, available as a property of
each `Rl` instance. Use it to intercept the Rl lifecycle.

```ts
rl.use({
  name: 'logger',
  onBeforeQuestion(prompt) { return `[PROMPT] ${prompt}` },
  onAfterAnswer(answer)    { console.log('[ANSWER]', answer) },
  onKeypress(key)         { /* KeypressData: key.name is 'up' | 'down' | 'return' | 'c' | 'backspace' | char */ },
})
rl.removeHook('logger')
rl.hookCount // number of registered hooks
```

You can also use `Hooks` directly:

```ts
import { Hooks } from '@useful-libs/rl'

const hooks = new Hooks()
hooks.use({ name: 'decorator', onBeforeRender: (o) => `» ${o}` })
await hooks.runBeforeRender('hello') // '» hello'
```

Available hook points:

| Hook | Signature | Purpose |
|---|---|---|
| `onBeforeQuestion` | `(prompt) => string \| Promise<string> \| void` | transform the prompt |
| `onAfterAnswer` | `(answer, prompt) => void \| Promise<void>` | react to an answer |
| `onBeforeRender` | `(output) => string \| Promise<string> \| void` | transform terminal output |
| `onBeforeClose` | `() => void \| Promise<void>` | run before closing |
| `onKeypress` | `(key: KeypressData, prompt) => void` | react to raw key input (`key.name`: `'up'`, `'down'`, `'return'`, `'c'`, `'backspace'`, …) |

`Rl` constructor options (`RlOptions`): `input` (default `process.stdin`),
`output` (default `process.stdout`), `history` (default `false`),
`historySize` (default `100`), `prompt` (default `'> '`), `tabSize`
(default `4`). `close()` is async and runs `onBeforeClose` hooks.

## Errors

User-facing failures throw `RlError`, which extends `Error` with a machine
readable `code`.

```ts
import { Rl, RlError } from '@useful-libs/rl'

const rl = new Rl()

try {
  await rl.menu('Pick:', []) // no options
} catch (err) {
  if (err instanceof RlError) {
    err.code // 'EMPTY_MENU' | 'CANCELLED' | 'STREAM_ERROR'
  }
}
```

| Code | Raised when |
|---|---|
| `EMPTY_MENU` | `menu()` is called with an empty options array |
| `CANCELLED` | the user interrupts input (Ctrl+C or similar) |
| `STREAM_ERROR` | a stream operation fails or a required feature is missing |

```ts
// Throw your own (code defaults to 'CANCELLED'):
throw new RlError('Something went wrong', 'STREAM_ERROR')
```

## Color utilities

```ts
import { stylize, questionMark, prefix } from '@useful-libs/rl'

stylize('hello', 'cyan', 'bold')
questionMark('Continue?')     // '? Continue?'
prefix('INPUT')               // '[INPUT]'
```

## Loading spinner

`loading()` returns a handle to animate a spinner while a task runs. The handle
can be used standalone, or via the `Rl.loading()` method (which binds the
spinner to the instance's output stream).

```ts
import { loading, Rl } from '@useful-libs/rl'

const spin = loading({ text: 'Installing...', style: 'docker' })
spin.start()
// ... do work ...
spin.succeed()   // ✔ Installing...
// or spin.fail('something went wrong')
// or spin.stop()            // just clears the line
// or spin.updateText('next step')  // change the message while animating
```

```ts
const rl = new Rl()
const spin = rl.loading({ text: 'Loading...', style: 'npm' })
spin.start()
spin.succeed()
rl.close()
```

### Styles

| Style | Frames |
|---|---|
| `npm` | braille dots (default) |
| `docker` | container loading bar |
| `line` | `- \ | /` |
| `dots` | braille dots (8 frames) |
| `dots2` | dense braille dots |
| `bar` | vertical bar |
| `bounce` | bouncing braille dot |
| `clock` | clock emoji |
| `brailleFill` | random Braille equalizer (dynamic frames) |
| `custom` | use the `frames` option |

### Options

```ts
loading({
  style: 'bar',      // SpinnerStyle, default 'npm'
  frames: ['🌑', '🌒', '🌓'], // custom frames (required for style: 'custom')
  interval: 80,      // ms between frames
  color: 'cyan',     // frame color
  text: '',          // message next to the spinner
  stream: process.stdout, // output stream
  hideCursor: true,  // hide the cursor while animating
  columns: 7,        // columns for style: 'brailleFill'
})
```

### Random Braille equalizer (`brailleFill`)

Generates a dynamic equalizer-style animation: columns start at the base level
`⣀` and randomly climb towards the full level `⣿`, resetting once filled.

```ts
import { loading, createRandomBrailleGenerator } from '@useful-libs/rl'

loading({ text: 'Processing...', style: 'brailleFill', columns: 10 }).start()

// Low-level API:
const next = createRandomBrailleGenerator(7) // '[⣀ ⣀ ⣤ ⣀ ⣀ ⣶ ⣀]'
next()
```

Braille levels: `⣀` → `⣤` → `⣶` → `⣿`.

`SPINNERS` maps every `SpinnerStyle` to its frame array (`brailleFill` and
`custom` are `[]` — frames are generated/provided at runtime).
`BRAILLE_LEVELS` is `['⣀', '⣤', '⣶', '⣿']`.

## Text & display utilities

ANSI-aware helpers for building richer CLIs. All width-based helpers measure
*visible* text, so styled strings align correctly.

```ts
import {
  stripAnsi, visiblePad, truncateVisible, wrapText,
  padStart, padEnd,
  formatTime, summarizeError, extractErrorLines, table, columnsList,
  HIDE_CURSOR, SHOW_CURSOR, KEY_CODES,
} from '@useful-libs/rl'

stripAnsi('\x1b[36mHello\x1b[39m')      // 'Hello'
visiblePad('hi', 5)                     // 'hi   '
truncateVisible('hello world', 8)       // 'hello w…'
wrapText('the quick brown fox', 9)      // ['the quick', 'brown fox']

padStart(4)                             // '    '
padStart(4, { style: 'tab' })           // '\t\t\t\t'
padEnd(3)                               // '   '
padEnd(2, { style: 'tab' })             // '\t\t'

formatTime(832)                         // '832ms'
formatTime(3200)                        // '3.2s'
formatTime(125000)                      // '2m 5s'

summarizeError(stderr, stdout)          // first useful line of a failed command
// filters npm warn/notice/http noise, 'added N packages', etc.
extractErrorLines(stderr, stdout)       // all useful lines (summarizeError uses [0])
// HIDE_CURSOR / SHOW_CURSOR: '\x1b[?25l' / '\x1b[?25h'
// KEY_CODES: UP, DOWN, LEFT, RIGHT, ENTER ('\r'), CTRL_C, BACKSPACE, DELETE
```

### Padding generators (`padStart` / `padEnd`)

`padStart` and `padEnd` return a run of whitespace characters instead of
hand-counting indentation. Pass `{ style: 'space' }` (default) or
`{ style: 'tab' }` to choose the character.

```ts
import { padStart, padEnd } from '@useful-libs/rl'

console.log(`${padStart(4)}${line}`)              // '    ' + line
console.log(`${padStart(4, { style: 'tab' })}${line}`) // '\t\t\t\t' + line
console.log(`${line}${padEnd(2)}done`)            // 'line  done'
```

### Tables

```ts
console.log(table({
  headers: ['Skill', 'Status'],
  rows: [['react-best-practices', 'ok'], ['vue', 'installed']],
}))
// | Skill                | Status    |
// | -------------------- | --------- |
// | react-best-practices | ok        |
// | vue                  | installed |
```

Cells are truncated to their column and long content word-wraps onto
continuation rows. The table sizes itself to the terminal (`width` option or
`stdout.columns`).

### Columns

```ts
console.log(columnsList(['React', 'Vue', 'Svelte', 'Astro'], { cols: 2 }))
//    React  Vue
//    Svelte  Astro
```

## Banner

`printBanner` renders an ASCII banner with a selectable animation on TTYs, and
falls back to a static render when the output is not a TTY or `NO_COLOR` is
set. Pass `text` to auto-generate the art from a string with `ANSIText`, or
`lines` for pre-rendered art.

```ts
import { printBanner } from '@useful-libs/rl'

await printBanner({
  text: 'autoskills',
  subtitle: 'v1.0.0 · interactive prompts for CLIs',
})

await printBanner({ text: 'RL', animation: 'rainbow' })
await printBanner({ lines: ['USEFUL LIBS', 'RL TOOLKIT'] })
```

The terminal cursor is hidden during the animation and restored afterwards.

### Animations

| Animation | Description |
|---|---|
| `wave` | (default) diagonal brightness sweep, dark gray → near-white |
| `rainbow` | scrolling spectrum of hues across the columns |
| `typing` | characters reveal left-to-right |
| `wipe` | the whole grid slides in from the right edge |
| `pulse` | the whole grid breathes between dim and bright |

### Infinite loop

Cyclic effects (`wave`, `rainbow`, `pulse`) can run forever until the program
exits (Ctrl+C) or you stop them via the returned handle. Reveal animations
(`typing`, `wipe`) always play once regardless of the flag.

```ts
import { printBanner } from '@useful-libs/rl'

// keeps animating until Ctrl+C / process exit
await printBanner({ text: 'RL', animation: 'rainbow', loop: true })

// or stop it explicitly from your own code
const loop = await printBanner({ text: 'RL', animation: 'wave', loop: true })
setTimeout(() => loop.stop(), 5000)
```

The terminal cursor is restored automatically when the loop stops or the
process exits.

## ANSI text art (`ANSIText`)

Generate large "block" terminal art from any string, then animate it. The
generator uses the built-in `block` font (the style of the `banner.txt`
files) and is extensible with custom fonts.

```ts
import { ANSIText, gridToLines, wave, animateGrid, totalFramesFor } from '@useful-libs/rl'

const grid = ANSIText('autoskills')        // { rows, width, height, text }
gridToLines(grid)
// ['┌─┐┌ ┐┌─┐┌─┐┌─┐┌ ┐┌─┐┌  ┌  ┌─┐', ...]

// custom font
ANSIText('hi', { font: { h: ['X X', 'X X', 'X X'] }, gap: 1 })

// play a wave over the grid, 2 frames per tick
await animateGrid(grid, wave, totalFramesFor('wave', grid), { frameDelay: 28 })
```

`ANSIText` options: `font` (default `BlockFont`) and `gap` (space columns
between letters, default `1`). `BlockFont` keys are lowercase; unknown
characters fall back to a space.

### Frame renderers

Each animation is a pure function `(grid, frame) => string[]` — easy to reuse
for custom banners or previews:

- `wave(grid, frame)`
- `rainbow(grid, frame, speed?)`
- `typing(grid, frame)`
- `wipe(grid, frame)`
- `pulse(grid, frame)`

Use `totalFramesFor(name, grid, { speed? })` to size a loop for the chosen
animation, and `animateGrid(grid, animation, frames, opts)` to run it.

## License

MIT
