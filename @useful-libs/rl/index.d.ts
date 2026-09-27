import { InspectColor } from 'node:util';

type ReadStream = NodeJS.ReadStream;
type WriteStream = NodeJS.WriteStream;
/**
 * Options for configuring the Rl instance.
 */
interface RlOptions {
    /** Input stream (defaults to process.stdin). */
    input?: ReadStream;
    /** Output stream (defaults to process.stdout). */
    output?: WriteStream;
    /** Whether to keep a history of inputs (default: false). */
    history?: boolean;
    /** Maximum number of history entries (default: 100). */
    historySize?: number;
    /** Prompt string displayed at the start of the line (default: '> '). */
    prompt?: string;
    /** Tab size in spaces (default: 4). */
    tabSize?: number;
}
/**
 * Options for the `ask` method.
 */
interface AskOptions {
    /** Default value if the user enters an empty string. */
    default?: string;
    /**
     * Validation function. Return `true` if valid, or a string error message.
     * The user will be re-prompted on validation failure.
     */
    validate?: (input: string) => string | true | Promise<string | true>;
    /**
     * Optional filter/transform applied to the answer before returning.
     */
    filter?: (input: string) => string | Promise<string>;
}
/**
 * A single option in an interactive menu.
 */
interface MenuOption {
    /** Display label shown to the user. */
    label: string;
    /** Value returned when this option is selected. */
    value: string;
    /** Optional description shown alongside the label. */
    description?: string;
}
/**
 * A single option in an interactive multiselect (checkbox) list.
 */
interface MultiselectOption {
    /** Display label shown to the user. */
    label: string;
    /** Value returned when this option is selected. */
    value: string;
    /** Optional description shown alongside the label. */
    description?: string;
    /** Optional group header. Consecutive options in the same group share one header. */
    group?: string;
    /** Optional trailing hint shown on the right (e.g. "← react"). */
    hint?: string;
    /** Initial checked state for this option (default: `config.defaultChecked`). */
    checked?: boolean;
    /** Whether this option is disabled (cannot be toggled). */
    disabled?: boolean;
}
/**
 * A keyboard shortcut for the interactive multiselect.
 *
 * The `fn` receives all options and must return the full desired `checked`
 * array (one boolean per option, same order). Disabled options are always
 * forced to `false` after applying.
 */
interface MultiselectShortcut {
    /** Single-character key that triggers the shortcut (e.g. `'n'`). */
    key: string;
    /** Short label shown in the hints line (e.g. `'new'`). */
    label: string;
    /** Computes the new checked state for every option. */
    fn: (options: MultiselectOption[]) => boolean[];
}
/**
 * Options for the `multiselect` method.
 */
interface MultiselectConfig {
    /**
     * Default checked state for options without an explicit `checked`.
     * @default `false`
     */
    defaultChecked?: boolean;
    /** Minimum number of selections required to confirm (default: 0). */
    min?: number;
    /** Maximum number of selections allowed (default: Infinity). */
    max?: number;
    /**
     * Whether the cursor wraps around when moving past the first/last option.
     * @default `true`
     */
    wrap?: boolean;
    /**
     * Custom single-key shortcuts rendered in the hints line.
     * Matched after the built-in keys (`enter`, `ctrl-c`, `space`, `a`)
     * and before navigation keys, so a shortcut may claim `j` or `k`.
     */
    shortcuts?: MultiselectShortcut[];
}
/**
 * Options for the `menu` method.
 */
interface MenuConfig {
    /**
     * Whether the cursor wraps around when moving past the first/last option.
     * @default `true`
     */
    wrap?: boolean;
}
/**
 * Options for the `confirm` method.
 */
interface ConfirmOptions {
    /** Default boolean value when the user enters an empty string (default: false). */
    default?: boolean;
}
/**
 * Data about a keypress event during interactive input.
 */
interface KeypressData {
    /** Raw sequence of characters. */
    sequence: string;
    /** Parsed key name (e.g. 'up', 'down', 'return', 'c', 'backspace'). */
    name: string;
    /** Whether the Ctrl modifier was pressed. */
    ctrl: boolean;
    /** Whether the Meta/Alt modifier was pressed. */
    meta: boolean;
    /** Whether the Shift modifier was pressed. */
    shift: boolean;
}
/**
 * A hook / plugin that can intercept Rl lifecycle events.
 *
 * Register a hook via `rl.use(myHook)` and remove it via `rl.removeHook(name)`.
 */
interface RlHook {
    /** Unique name for this hook (used for identification and removal). */
    name: string;
    /**
     * Called before a question is asked. Return a modified prompt string,
     * or return `void` to leave the prompt unchanged.
     */
    onBeforeQuestion?: (prompt: string) => string | Promise<string> | void;
    /**
     * Called after an answer is received (before validation/filter).
     */
    onAfterAnswer?: (answer: string, prompt: string) => void | Promise<void>;
    /**
     * Called before output is written to the terminal.
     * Return modified output or `void` to leave it unchanged.
     */
    onBeforeRender?: (output: string) => string | Promise<string> | void;
    /**
     * Called before the readline interface is closed.
     */
    onBeforeClose?: () => void | Promise<void>;
    /**
     * Called on each keypress during interactive input (menu, password).
     */
    onKeypress?: (key: KeypressData, prompt: string) => void;
}
/**
 * Internal key codes for raw-mode input handling.
 */
declare const KEY_CODES: {
    readonly UP: "\u001B[A";
    readonly DOWN: "\u001B[B";
    readonly RIGHT: "\u001B[C";
    readonly LEFT: "\u001B[D";
    readonly ENTER: "\r";
    readonly CTRL_C: "\u0003";
    readonly BACKSPACE: "";
    readonly DELETE: "\u001B[3~";
};
/**
 * Available built-in spinner styles.
 */
type SpinnerStyle = 'npm' | 'docker' | 'line' | 'dots' | 'dots2' | 'bar' | 'bounce' | 'clock' | 'brailleFill' | 'custom';
/**
 * Options for {@link loading}.
 */
interface SpinnerOptions {
    /**
     * Built-in style to use
     * @default `'npm'`.
     */
    style?: SpinnerStyle;
    /** Custom frames, required when `style: 'custom'`. */
    frames?: string[];
    /**
     * Milliseconds between frames
     * @default `80`
     */
    interval?: number;
    /**
     * Color of the spinner frame
     * @default `'cyan'`
     */
    color?: string;
    /** Message shown next to the spinner. */
    text?: string;
    /**
     * Number of columns used by the `brailleFill` style
     * @default `7`
     */
    columns?: number;
    /**
     * Output stream
     * @default `process.stdout`.
     */
    stream?: WriteStream;
    /**
     * Hide the terminal cursor while animating
     * @default `true`
     */
    hideCursor?: boolean;
}
/**
 * Control handle returned by {@link loading}.
 */
interface SpinnerHandle {
    /** Start animating. Safe to call multiple times. */
    start(): void;
    /** Stop animating and clear the line. */
    stop(message?: string): void;
    /** Stop and print a green checkmark + text. */
    succeed(message?: string): void;
    /** Stop and print a red cross + text. */
    fail(message?: string): void;
    /** Change the message while animating. */
    updateText(text: string): void;
}
/**
 * Available banner animations for {@link printBanner}.
 */
type BannerAnimation = 'wave' | 'rainbow' | 'typing' | 'wipe' | 'pulse';
/**
 * Options for {@link printBanner}.
 */
interface BannerOptions {
    /** Big lines rendered with the wave animation (one per line). */
    lines?: string[];
    /**
     * Alternative to `lines`: render this text as large art via {@link ANSIText}.
     * When provided together with the `animation` option, the chosen animation
     * plays over the generated art.
     */
    text?: string;
    /** Optional smaller line printed below, dimmed. */
    subtitle?: string;
    /**
     * Animate the wave on TTYs. Automatically falls back to a static render
     * when the output is not a TTY or `NO_COLOR` is set.
     * @default `true`
     */
    animate?: boolean;
    /**
     * Animation to play over the banner art.
     * @default `'wave'`
     */
    animation?: BannerAnimation;
    /** Speed of the animation. @default `2.5` for wave. */
    speed?: number;
    /**
     * Run cyclic animations (wave / rainbow / pulse) forever until the process
     * exits or the returned {@link AnimateHandle} is stopped. Typing and wipe
     * always play once, regardless of this flag.
     * @default `false`
     */
    loop?: boolean;
    /** Output stream. @default `process.stdout` */
    stream?: WriteStream;
}

/**
 * Interactive readline prompt manager (questions, menus, passwords, spinners).
 */
declare class Rl {
    private rl;
    private hooks;
    private opts;
    private onResize;
    /**
     * Creates a prompt manager.
     *
     * @param options - Input/output streams and defaults; see {@link RlOptions}.
     */
    constructor(options?: RlOptions);
    /**
     * Register a lifecycle hook on this instance.
     *
     * @param hook - The hook to register.
     * @returns `this` for chaining.
     */
    use(hook: RlHook): this;
    /**
     * Remove a previously registered hook by name.
     *
     * @param name - The unique name of the hook.
     * @returns `true` if a hook was removed, `false` otherwise.
     */
    removeHook(name: string): boolean;
    /** Number of currently registered hooks. */
    get hookCount(): number;
    /**
     * Asks a free-text question, re-prompting until validation passes.
     *
     * @param prompt - Question shown to the user.
     * @param options - Default value, validation and filter; see {@link AskOptions}.
     * @returns The trimmed (and filtered) answer.
     *
     * @example
     * ```ts
     * const name = await rl.ask('What is your name?')
     * ```
     */
    ask(prompt: string, options?: AskOptions): Promise<string>;
    /**
     * Asks a yes/no question, accepting `y/yes/true/1` and `n/no/false/0`.
     *
     * @param prompt - Question shown to the user.
     * @param options - Default when the answer is empty (default: `false`); see {@link ConfirmOptions}.
     * @returns `true` for yes, `false` for no.
     */
    confirm(prompt: string, options?: ConfirmOptions): Promise<boolean>;
    /**
     * Shows a single-choice menu and resolves with the selected `value`.
     *
     * @param prompt - Heading shown above the options.
     * @param options - Choices; see {@link MenuOption}.
     * @param config - Cursor wrapping; see {@link MenuConfig}.
     * @returns The selected option value.
     * @throws {RlError} With code `'EMPTY_MENU'` when `options` is empty.
     */
    menu(prompt: string, options: MenuOption[], config?: MenuConfig): Promise<string>;
    /**
     * Shows a multi-choice checklist and resolves with the selected `value`s.
     *
     * @param prompt - Heading shown above the options.
     * @param options - Choices with checked/disabled state; see {@link MultiselectOption}.
     * @param config - Defaults, min/max limits and shortcuts; see {@link MultiselectConfig}.
     * @returns The selected option values.
     * @throws {RlError} With code `'EMPTY_MENU'` when `options` is empty.
     */
    multiselect(prompt: string, options: MultiselectOption[], config?: MultiselectConfig): Promise<string[]>;
    /**
     * Asks for secret input, masking keystrokes with `*`.
     *
     * @param prompt - Question shown to the user.
     * @returns The typed value (unmasked).
     */
    password(prompt: string): Promise<string>;
    /**
     * Start an animated loading spinner bound to this instance's output stream.
     *
     * @param options - Spinner configuration.
     * @returns A {@link SpinnerHandle} to control the animation.
     */
    loading(options?: SpinnerOptions): SpinnerHandle;
    /**
     * Closes the readline interface and runs `onBeforeClose` hooks.
     *
     * @returns A promise resolving once closed.
     */
    close(): Promise<void>;
    private getRl;
    private question;
    private closeRl;
    private write;
    private onSigwinch;
    private removeSigwinch;
    private fallbackMenu;
    private fallbackMultiselect;
    private interactiveMultiselect;
    private interactiveMenu;
}

/** Style format name accepted by Node's `styleText`. */
type StyleFormat = InspectColor;
/**
 * Apply one or more text styles using Node's built-in `styleText`.
 * Formats are applied left-to-right; later styles may override earlier ones.
 *
 * @param text - The raw text to style.
 * @param formats - One or more style format names such as `'cyan'`, `'bold'`, `'red'`.
 * @returns The styled string.
 *
 * @example
 * ```ts
 * stylize('Hello', 'cyan', 'bold') // => '\x1b[36;1mHello\x1b[22;39m'
 * ```
 */
declare function stylize(text: string, ...formats: StyleFormat[]): string;
/**
 * Create a styled question-mark label, useful as a prompt prefix.
 *
 * @param text - The label text following the question mark.
 * @param color - Color for the question mark symbol (default: `'cyan'`).
 * @returns The styled label string.
 *
 * @example
 * ```ts
 * questionMark('What is your name?') // => '? What is your name?'
 * questionMark('Continue?', 'yellow')
 * ```
 */
declare function questionMark(text: string, color?: StyleFormat): string;
/**
 * Create a styled bracket prefix like `[LABEL]`.
 *
 * @param label - The text inside the brackets.
 * @param color - Color for the label (default: `'cyan'`).
 * @param bracketColor - Color for the brackets (defaults to `color`).
 * @returns The styled prefix string.
 *
 * @example
 * ```ts
 * prefix('INPUT')             // => '[INPUT]'  (both cyan)
 * prefix('WARN', 'yellow')    // => '[WARN]'   (yellow)
 * prefix('ERR', 'red', 'gray') // => '[ERR]'   (red text, gray brackets)
 * ```
 */
declare function prefix(label: string, color?: StyleFormat, bracketColor?: StyleFormat): string;

/**
 * Braille levels used by the `brailleFill` style, from base to full.
 */
declare const BRAILLE_LEVELS: readonly ["⣀", "⣤", "⣶", "⣿"];
/**
 * Create a random Braille equalizer frame generator.
 *
 * Each generated frame is a bracket-wrapped row of `columns` characters that
 * start at the base level `⣀` and randomly climb towards the full level `⣿`,
 * resetting once a column fills up.
 *
 * @param columns - Number of columns in each frame (default: `7`).
 * @returns A function that produces the next frame string on every call.
 *
 * @example
 * ```ts
 * const next = createRandomBrailleGenerator(7)
 * next() // => '[⣀ ⣀ ⣤ ⣀ ⣀ ⣶ ⣀]'
 * ```
 */
declare function createRandomBrailleGenerator(columns?: number): () => string;
/**
 * Predefined spinner frame sets, keyed by style name.
 */
declare const SPINNERS: Record<SpinnerStyle, Array<string>>;
/**
 * Start an animated loading spinner.
 *
 * @param options - Spinner configuration.
 * @returns A handle with `start`, `stop`, `succeed`, `fail`, and `updateText`.
 *
 * @example
 * ```ts
 * const spin = loading({ text: 'Installing...', style: 'docker' })
 * spin.start()
 * // ... do work ...
 * spin.succeed()
 * ```
 */
declare function loading(options?: SpinnerOptions): SpinnerHandle;

/**
 * Manages the lifecycle hooks of an {@link Rl} instance.
 *
 * Hooks intercept the Rl lifecycle: prompts, answers, rendering, closing, and
 * key presses. Register hooks with {@link Hooks.use} and remove them by name
 * with {@link Hooks.removeHook}.
 */
declare class Hooks {
    private hooks;
    /**
     * Register a hook. Safe to call multiple times with different names.
     *
     * @param hook - The hook to register.
     * @returns `this` for chaining.
     */
    use(hook: RlHook): this;
    /**
     * Remove a previously registered hook by its unique name.
     *
     * @param name - The unique name of the hook to remove.
     * @returns `true` if a hook was removed, `false` otherwise.
     */
    removeHook(name: string): boolean;
    /**
     * Number of currently registered hooks.
     */
    get size(): number;
    /**
     * Run every `onBeforeQuestion` hook. Hooks may transform the prompt.
     *
     * @param prompt - The original prompt.
     * @returns The prompt, possibly modified by hooks.
     */
    runBeforeQuestion(prompt: string): Promise<string>;
    /**
     * Run every `onAfterAnswer` hook.
     *
     * @param answer - The answer received from the user.
     * @param prompt - The prompt that produced the answer.
     */
    runAfterAnswer(answer: string, prompt: string): Promise<void>;
    /**
     * Run every `onBeforeRender` hook. Hooks may transform the output string.
     *
     * @param output - The output to be written.
     * @returns The output, possibly modified by hooks.
     */
    runBeforeRender(output: string): Promise<string>;
    /**
     * Run every `onBeforeClose` hook.
     */
    runBeforeClose(): Promise<void>;
    /**
     * Parse a raw key sequence and dispatch it to every `onKeypress` hook.
     *
     * @param key - The raw key sequence emitted by the input stream.
     */
    runOnKeypress(key: string): void;
}

/**
 * Error codes used by {@link RlError}.
 */
type RlErrorCode = 
/** The `menu()` method was called with an empty options array. */
'EMPTY_MENU'
/** The user interrupted the interaction (Ctrl+C or similar). */
 | 'CANCELLED'
/** A stream operation failed or a required feature is missing. */
 | 'STREAM_ERROR';
/**
 * Error thrown by the Rl library for user-facing failures.
 *
 * Extends the built-in `Error` with a machine-readable `code` so callers can
 * react to specific failure modes (e.g. handle cancellation separately).
 */
declare class RlError extends Error {
    readonly code: RlErrorCode;
    /**
     * @param message - Human-readable error message.
     * @param code - Machine-readable error code.
     * @param options - Additional options, including an optional `cause`.
     */
    constructor(message: string, code?: RlErrorCode, options?: ErrorOptions);
}

/**
 * ANSI text-art utilities.
 *
 * `ANSIText` renders any string as large "block" terminal art (letra por
 * letra desde un font), and the animation functions paint color / reveal
 * effects over the resulting grid. Everything works on visible characters
 * and emits only raw ANSI SGR escapes (no external dependencies).
 */
/**
 * A font maps a single character to its rasterized rows. Every row of every
 * glyph must have the same width so letters can be joined horizontally.
 */
type AnsiFont = Record<string, string[]>;
/**
 * A rectangular grid of character cells produced by {@link ANSIText}.
 */
interface AnsiTextGrid {
    /** Rows of raw glyph characters (pre join, before any color). */
    rows: string[][];
    /** Number of columns in the grid. */
    width: number;
    /** Number of rows in the grid. */
    height: number;
    /** The original input string rendered. */
    text: string;
}
/**
 * Options for {@link ANSIText}.
 */
interface AnsiTextOptions {
    /**
     * Font to use. Defaults to the built-in `block` font.
     */
    font?: AnsiFont;
    /**
     * Number of space columns inserted between rendered letters.
     * @default `1`
     */
    gap?: number;
}
/**
 * The built-in "block" font: chunky rectangular letters in the style of the
 * `banner.txt` files. Every glyph is 3 rows tall; widths vary per letter.
 *
 * The keys are lowercase; {@link ANSIText} lowercases input before lookup.
 */
declare const BlockFont: AnsiFont;
/**
 * Render a string as a big text-art grid using an {@link AnsiFont}.
 *
 * Letters are looked up by their lowercase form; unknown characters fall back
 * to a space. A configurable gap separates letters.
 *
 * @param text - The text to render (e.g. `'autoskills'`).
 * @param options - Rendering options.
 * @returns The resulting {@link AnsiTextGrid}.
 *
 * @example
 * ```ts
 * const grid = ANSIText('hi')
 * grid.rows // [['┌','─','┐','┌','─','┐'], ['│',' ','│','│',' ','│'], ...]
 * ```
 */
declare function ANSIText(text: string, options?: AnsiTextOptions): AnsiTextGrid;
/**
 * Renders a grid back to raw (uncolored) string lines.
 *
 * @param grid - The grid produced by {@link ANSIText}.
 * @returns One string per grid row.
 */
declare function gridToLines(grid: AnsiTextGrid): string[];
/**
 * A frame renderer: given a grid and a normalized progress (0..1) / frame
 * number, returns the lines with color escapes applied.
 */
type AnsiAnimation = (grid: AnsiTextGrid, frame: number) => string[];
/**
 * Wave animation: a diagonal brightness wave sweeps from top-left to
 * bottom-right, brightening characters from dark gray to near-white.
 *
 * @param grid - The grid to render.
 * @param frame - Current frame number.
 * @returns Colored lines for this frame.
 */
declare function wave(grid: AnsiTextGrid, frame: number): string[];
/**
 * Rainbow animation: each column gets an HSL hue that shifts over time,
 * producing a flowing rainbow that scrolls across the text.
 *
 * @param grid - The grid to render.
 * @param frame - Current frame number.
 * @param speed - Hue shift per frame (default: `6`).
 * @returns Colored lines for this frame.
 */
declare function rainbow(grid: AnsiTextGrid, frame: number, speed?: number): string[];
/**
 * Typing animation: characters reveal left-to-right, one column width per
 * frame, until the whole grid is visible. `frame` ranges 0..width.
 *
 * @param grid - The grid to render.
 * @param frame - Current frame number (revealed columns).
 * @returns Colored lines for this frame.
 */
declare function typing(grid: AnsiTextGrid, frame: number): string[];
/**
 * Wipe / slide animation: the whole grid slides in from the right edge,
 * reaching its final position once `frame` equals the grid width.
 *
 * @param grid - The grid to render.
 * @param frame - Current frame number.
 * @returns Colored lines for this frame.
 */
declare function wipe(grid: AnsiTextGrid, frame: number): string[];
/**
 * Pulse animation: the whole grid breathes between dim and fully bright,
 * using a sine wave over `frame` so the color oscillates smoothly.
 *
 * @param grid - The grid to render.
 * @param frame - Current frame number.
 * @returns Colored lines for this frame.
 */
declare function pulse(grid: AnsiTextGrid, frame: number): string[];
/**
 * Compute the number of frames a given animation needs to complete based on
 * the grid dimensions. Wave and typing cover the diagonal/width; slide covers
 * the width plus an entry offset.
 *
 * @param animation - One of the exported animation names.
 * @param grid - The grid to frame.
 * @param options - Optional speed override matching the animation's `speed` argument.
 * @returns The number of frames needed to complete the animation.
 */
declare function totalFramesFor(animation: 'wave' | 'rainbow' | 'typing' | 'wipe' | 'pulse', grid: AnsiTextGrid, options?: {
    speed?: number;
}): number;
/** Playback options for {@link animateGrid}. */
interface AnimateGridOptions {
    /** Milliseconds between frames. @default `28` */
    frameDelay?: number;
    /** Stream writer to output to (defaults to `process.stdout`). */
    stream?: {
        write: (s: string) => unknown;
    };
    /**
     * Keep looping forever (used by cyclic animations like wave / rainbow /
     * pulse) instead of stopping after `totalFrames`. Uses an internal
     * `setInterval`; the returned handle's `stop()` clears it.
     * @default `false`
     */
    loop?: boolean;
}
/** Handle returned by {@link animateGrid} / {@link printBanner} when looping. */
interface AnimateHandle {
    /** Stop a looping animation. */
    stop(): void;
}
/**
 * Play an animation over a grid on an output stream, re-rendering in place by
 * moving the cursor up `height` rows each frame.
 *
 * With `loop: false` (default) it plays exactly `totalFrames` frames and the
 * returned promise resolves once playback finishes. With `loop: true` it
 * resolves immediately with a handle and keeps re-rendering in the background
 * until the handle's `stop()` is called (or the process exits).
 *
 * @param grid - The grid to animate.
 * @param animation - The frame renderer (e.g. {@link wave}).
 * @param totalFrames - Total number of frames to render (ignored when looping).
 * @param options - Playback options.
 * @returns A promise that resolves to a handle ({@link AnimateHandle}).
 */
declare function animateGrid(grid: AnsiTextGrid, animation: AnsiAnimation, totalFrames: number, options?: AnimateGridOptions): Promise<AnimateHandle>;

/**
 * Print an ASCII banner with a selectable animation.
 *
 * Pass either `lines` (pre-rendered art) or `text` (rendered via
 * {@link ANSIText}). Falls back to a static cyan render when the stream is not
 * a TTY or `NO_COLOR` is set. The terminal cursor is hidden during the
 * animation and restored afterwards.
 *
 * With `loop: true` and a cyclic animation (`wave`, `rainbow`, `pulse`) the
 * banner keeps animating until the process exits or you call `stop()` on the
 * returned handle; the animation then finishes in place. Typing and wipe
 * always play once regardless of `loop`.
 *
 * @param options - Banner configuration.
 * @returns A handle (when looping / animated) that can stop the banner;
 *          resolves once the banner has been printed otherwise.
 *
 * @example
 * ```ts
 * await printBanner({ text: 'autoskills', subtitle: 'v1.0.0' })
 * await printBanner({ text: 'RL', animation: 'rainbow' })
 * const loop = printBanner({ text: 'RL', animation: 'rainbow', loop: true })
 * // ... until the process ends, or:
 * loop.stop()
 * ```
 */
declare function printBanner(options: BannerOptions): Promise<AnimateHandle | void>;

/**
 * ANSI-aware text utilities.
 *
 * All helpers measure and manipulate text based on its *visible* width,
 * ignoring ANSI escape sequences so styled strings align correctly.
 */
/** Escape sequence that hides the terminal cursor. */
declare const HIDE_CURSOR = "\u001B[?25l";
/** Escape sequence that shows the terminal cursor. */
declare const SHOW_CURSOR = "\u001B[?25h";
/**
 * Remove all ANSI SGR (colors/styles) sequences from a string.
 *
 * @param text - Text possibly containing ANSI color codes.
 * @returns Plain text without color escapes.
 *
 * @example
 * ```ts
 * stripAnsi('\x1b[36mHello\x1b[39m') // => 'Hello'
 * ```
 */
declare function stripAnsi(text: string): string;
/**
 * Pad a (possibly styled) string with trailing spaces up to `width`
 * visible characters.
 *
 * @param value - Text to pad; ANSI sequences do not count towards width.
 * @param width - Target visible width.
 * @returns The text padded with spaces.
 *
 * @example
 * ```ts
 * visiblePad('hi', 5) // => 'hi   '
 * ```
 */
declare function visiblePad(value: string, width: number): string;
/**
 * Truncate a (possibly styled) string to `width` visible characters,
 * appending an ellipsis when the text is cut.
 *
 * @param value - Text to truncate; ANSI sequences do not count towards width.
 * @param width - Maximum visible width.
 * @returns The original text if it fits, otherwise a truncated copy with `…`.
 *
 * @example
 * ```ts
 * truncateVisible('hello world', 8) // => 'hello w…'
 * ```
 */
declare function truncateVisible(value: string, width: number): string;
/**
 * Word-wrap text into lines of at most `width` visible characters.
 * Words longer than `width` are hard-split.
 *
 * @param value - Text to wrap.
 * @param width - Maximum line width. Non-positive widths return the input as a single line.
 * @returns Array of wrapped lines.
 *
 * @example
 * ```ts
 * wrapText('the quick brown fox', 9) // => ['the quick', 'brown fox']
 * ```
 */
declare function wrapText(value: string, width: number): string[];

/**
 * Format a duration in milliseconds into a human-readable string.
 *
 * @param ms - Duration in milliseconds.
 * @returns `"832ms"` under a second, `"3.2s"` under a minute, otherwise `"2m 5s"`.
 *
 * @example
 * ```ts
 * formatTime(832)   // => '832ms'
 * formatTime(3200)  // => '3.2s'
 * formatTime(125000) // => '2m 5s'
 * ```
 */
declare function formatTime(ms: number): string;
/**
 * Extract meaningful lines from process output, stripping ANSI codes and
 * filtering common package-manager noise.
 *
 * @param stderr - Standard error output (takes precedence).
 * @param output - Standard output used as fallback when stderr is empty.
 * @returns Filtered, trimmed lines. Empty array if nothing useful remains.
 */
declare function extractErrorLines(stderr: string, output?: string): string[];
/**
 * Summarize a failed command's output into a single short reason line.
 *
 * @param stderr - Standard error output.
 * @param output - Standard output fallback.
 * @param maxWidth - Maximum length of the returned reason (default `80`).
 * @returns The first meaningful line, truncated with `…`, or `'Unknown error'`.
 *
 * @example
 * ```ts
 * summarizeError('npm WARN deprecated x\nENOENT: no such file') // => 'ENOENT: no such file'
 * ```
 */
declare function summarizeError(stderr: string, output?: string, maxWidth?: number): string;

/**
 * Options for {@link table}.
 */
interface TableOptions {
    /** Column headers. */
    headers: string[];
    /** Row cells; each row must have the same length as `headers`. */
    rows: string[][];
    /**
     * Total width available for the table.
     * @default `stdout.columns || 100`
     */
    width?: number;
    /**
     * Output stream used to read `columns` when `width` is not given.
     * @default `process.stdout`
     */
    stream?: {
        columns?: number | undefined;
    };
}
/**
 * Render an aligned ASCII table with borders, sized to the terminal.
 *
 * Cells are truncated to fit their column and long content is word-wrapped
 * onto continuation rows. Widths are computed on visible (ANSI-free) text, so
 * styled cells align correctly.
 *
 * @param options - Headers, rows and optional width/stream.
 * @returns The table as a multi-line string (no trailing newline).
 *
 * @example
 * ```ts
 * console.log(table({
 *   headers: ['Skill', 'Status'],
 *   rows: [['react-best-practices', 'ok']],
 * }))
 * ```
 */
declare function table(options: TableOptions): string;

/**
 * Options for {@link columnsList}.
 */
interface ColumnsListOptions {
    /**
     * Number of columns in the grid.
     * @default `3`
     */
    cols?: number;
    /**
     * Spaces between columns.
     * @default `3`
     */
    gap?: number;
    /**
     * Indentation prepended to every line.
     * @default `'   '`
     */
    indent?: string;
    /**
     * Output stream used to read `columns` when computing the layout.
     * @default `process.stdout`
     */
    stream?: {
        columns?: number | undefined;
    };
}
/**
 * Lay out items as a grid of fixed-width columns (like `ls` output).
 *
 * Column width is derived from the longest item, capped so the grid fits the
 * terminal width. Widths are measured on visible (ANSI-free) text.
 *
 * @param items - Items to display; ANSI-styled strings are supported.
 * @param options - Grid configuration.
 * @returns The grid as a multi-line string (no trailing newline).
 *
 * @example
 * ```ts
 * console.log(columnsList(['React', 'Vue', 'Svelte', 'Astro'], { cols: 2 }))
 * ```
 */
declare function columnsList(items: string[], options?: ColumnsListOptions): string;

/**
 * Padding generators.
 *
 * `padStart` and `padEnd` return a run of whitespace characters (spaces or
 * tabs) that can be prefixed/appended to a line, so you don't hand-count
 * indentation. The character used is chosen via the `style` option.
 */
/**
 * Options for {@link padStart} / {@link padEnd}.
 */
interface PadOptions {
    /**
     * Which whitespace character to produce.
     * - `'space'`: repeat a single space (default)
     * - `'tab'`: repeat a single tab
     * @default `'space'`
     */
    style?: 'space' | 'tab';
}
/**
 * Build a left padding string of `count` whitespace characters.
 *
 * @param count - Number of whitespace characters to produce.
 * @param options - Padding options (space or tab).
 * @returns A string of whitespace of `count` length.
 *
 * @example
 * ```ts
 * padStart(4)              // => '    '
 * padStart(4, { style: 'tab' }) // => '\t\t\t\t'
 * console.log(`${padStart(4, { style: 'tab' })}${line}`)
 * ```
 */
declare function padStart(count: number, options?: PadOptions): string;
/**
 * Build a right padding string of `count` whitespace characters.
 *
 * @param count - Number of whitespace characters to produce.
 * @param options - Padding options (space or tab).
 * @returns A string of whitespace of `count` length.
 *
 * @example
 * ```ts
 * padEnd(3)               // => '   '
 * padEnd(2, { style: 'tab' }) // => '\t\t'
 * console.log(`${line}${padEnd(4)}done`)
 * ```
 */
declare function padEnd(count: number, options?: PadOptions): string;

export { ANSIText, type AnimateGridOptions, type AnimateHandle, type AnsiAnimation, type AnsiFont, type AnsiTextGrid, type AnsiTextOptions, type AskOptions, BRAILLE_LEVELS, type BannerAnimation, type BannerOptions, BlockFont, type ColumnsListOptions, type ConfirmOptions, HIDE_CURSOR, Hooks, KEY_CODES, type KeypressData, type MenuConfig, type MenuOption, type MultiselectConfig, type MultiselectOption, type MultiselectShortcut, type PadOptions, Rl, RlError, type RlErrorCode, type RlHook, type RlOptions, SHOW_CURSOR, SPINNERS, type SpinnerHandle, type SpinnerOptions, type SpinnerStyle, type StyleFormat, type TableOptions, animateGrid, columnsList, createRandomBrailleGenerator, extractErrorLines, formatTime, gridToLines, loading, padEnd, padStart, prefix, printBanner, pulse, questionMark, rainbow, stripAnsi, stylize, summarizeError, table, totalFramesFor, truncateVisible, typing, visiblePad, wave, wipe, wrapText };
