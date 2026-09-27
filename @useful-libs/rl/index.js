// src/rl.ts
import { createInterface } from "readline";
import { stdin as defaultStdin, stdout as defaultStdout2 } from "process";
import { styleText as styleText2 } from "util";

// src/spinner.ts
import { styleText } from "util";
import { stdout as defaultStdout } from "process";
var BRAILLE_LEVELS = ["\u28C0", "\u28E4", "\u28F6", "\u28FF"];
function createRandomBrailleGenerator(columns = 7) {
  const levels = new Array(columns).fill(0);
  return () => {
    for (let i = 0; i < columns; i++) {
      if (Math.random() < 0.25) {
        levels[i] = Math.min(levels[i] + 1, BRAILLE_LEVELS.length - 1);
      }
      if (levels[i] === BRAILLE_LEVELS.length - 1 && Math.random() < 0.3) {
        levels[i] = 0;
      }
    }
    const row = levels.map((level) => BRAILLE_LEVELS[level]).join(" ");
    return `[${row}]`;
  };
}
var SPINNERS = {
  /** npm-style braille dots. */
  npm: ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"],
  /** Docker container loading bar. */
  docker: [
    "[=    ]",
    "[==   ]",
    "[===  ]",
    "[==== ]",
    "[=====]",
    "[ ====]",
    "[  ===]",
    "[   ==]",
    "[    =]"
  ],
  /** Classic line spinner. */
  line: ["-", "\\", "|", "/"],
  /** Braille dots. */
  dots: ["\u2801", "\u2802", "\u2804", "\u2840", "\u2880", "\u2820", "\u2810", "\u2808"],
  /** Dense braille dots. */
  dots2: ["\u28FE", "\u28FD", "\u28FB", "\u28BF", "\u287F", "\u28DF", "\u28EF", "\u28F7"],
  /** Vertical bar. */
  bar: ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588", "\u2587", "\u2586", "\u2585", "\u2584", "\u2583", "\u2582", "\u2581"],
  /** Bouncing dot. */
  bounce: ["\u2801", "\u2802", "\u2804", "\u2802"],
  /** Clock emoji. */
  clock: ["\u{1F55B}", "\u{1F550}", "\u{1F551}", "\u{1F552}", "\u{1F553}", "\u{1F554}", "\u{1F555}", "\u{1F556}", "\u{1F557}", "\u{1F558}", "\u{1F559}", "\u{1F55A}"],
  /** Random Braille equalizer; frames are generated dynamically at render time. */
  brailleFill: [],
  /** Custom frames; must be provided via `frames` option. */
  custom: []
};
function loading(options = {}) {
  const {
    style = "npm",
    frames,
    interval = 80,
    color = "cyan",
    text = "",
    stream = defaultStdout,
    hideCursor = true,
    columns = 7
  } = options;
  const activeFrames = frames ?? SPINNERS[style];
  const nextBrailleFrame = style === "brailleFill" ? createRandomBrailleGenerator(columns) : null;
  let currentText = text;
  let index = 0;
  let timer = null;
  let isActive = false;
  const render = () => {
    const frame = nextBrailleFrame ? nextBrailleFrame() : activeFrames[index % activeFrames.length];
    index++;
    stream.write(`\r\x1B[K${styleText(color, frame)} ${currentText}`);
  };
  const start = () => {
    if (isActive) return;
    isActive = true;
    if (hideCursor) stream.write("\x1B[?25l");
    render();
    timer = setInterval(render, interval);
  };
  const stop = (message) => {
    if (!isActive) return;
    isActive = false;
    if (timer) clearInterval(timer);
    timer = null;
    if (hideCursor) stream.write("\x1B[?25h");
    stream.write("\r\x1B[K");
    if (message) stream.write(`${message}
`);
  };
  const succeed = (message) => {
    stop(`${styleText("green", "\u2714")} ${currentText}${message ? ` ${message}` : ""}`);
  };
  const fail = (message) => {
    stop(`${styleText("red", "\u2716")} ${currentText}${message ? ` ${message}` : ""}`);
  };
  const updateText = (nextText) => {
    currentText = nextText;
  };
  return { start, stop, succeed, fail, updateText };
}

// src/types.ts
var KEY_CODES = {
  UP: "\x1B[A",
  DOWN: "\x1B[B",
  RIGHT: "\x1B[C",
  LEFT: "\x1B[D",
  ENTER: "\r",
  CTRL_C: "",
  BACKSPACE: "\x7F",
  DELETE: "\x1B[3~"
};

// src/hooks.ts
var Hooks = class {
  hooks = [];
  /**
   * Register a hook. Safe to call multiple times with different names.
   *
   * @param hook - The hook to register.
   * @returns `this` for chaining.
   */
  use(hook) {
    this.hooks.push(hook);
    return this;
  }
  /**
   * Remove a previously registered hook by its unique name.
   *
   * @param name - The unique name of the hook to remove.
   * @returns `true` if a hook was removed, `false` otherwise.
   */
  removeHook(name) {
    const idx = this.hooks.findIndex((h) => h.name === name);
    if (idx === -1) return false;
    this.hooks.splice(idx, 1);
    return true;
  }
  /**
   * Number of currently registered hooks.
   */
  get size() {
    return this.hooks.length;
  }
  /**
   * Run every `onBeforeQuestion` hook. Hooks may transform the prompt.
   *
   * @param prompt - The original prompt.
   * @returns The prompt, possibly modified by hooks.
   */
  async runBeforeQuestion(prompt) {
    let p = prompt;
    for (const hook of this.hooks) {
      if (hook.onBeforeQuestion) {
        const result = await hook.onBeforeQuestion(p);
        if (typeof result === "string") p = result;
      }
    }
    return p;
  }
  /**
   * Run every `onAfterAnswer` hook.
   *
   * @param answer - The answer received from the user.
   * @param prompt - The prompt that produced the answer.
   */
  async runAfterAnswer(answer, prompt) {
    for (const hook of this.hooks) {
      if (hook.onAfterAnswer) {
        await hook.onAfterAnswer(answer, prompt);
      }
    }
  }
  /**
   * Run every `onBeforeRender` hook. Hooks may transform the output string.
   *
   * @param output - The output to be written.
   * @returns The output, possibly modified by hooks.
   */
  async runBeforeRender(output) {
    let o = output;
    for (const hook of this.hooks) {
      if (hook.onBeforeRender) {
        const result = await hook.onBeforeRender(o);
        if (typeof result === "string") o = result;
      }
    }
    return o;
  }
  /**
   * Run every `onBeforeClose` hook.
   */
  async runBeforeClose() {
    for (const hook of this.hooks) {
      if (hook.onBeforeClose) {
        await hook.onBeforeClose();
      }
    }
  }
  /**
   * Parse a raw key sequence and dispatch it to every `onKeypress` hook.
   *
   * @param key - The raw key sequence emitted by the input stream.
   */
  runOnKeypress(key) {
    const kp = {
      sequence: key,
      name: "",
      ctrl: false,
      meta: false,
      shift: false
    };
    if (key === KEY_CODES.CTRL_C) {
      kp.name = "c";
      kp.ctrl = true;
    } else if (key === KEY_CODES.UP) {
      kp.name = "up";
    } else if (key === KEY_CODES.DOWN) {
      kp.name = "down";
    } else if (key === KEY_CODES.ENTER) {
      kp.name = "return";
    } else if (key === KEY_CODES.BACKSPACE) {
      kp.name = "backspace";
    } else if (key.length === 1) {
      kp.name = key;
    }
    for (const hook of this.hooks) {
      if (hook.onKeypress) {
        hook.onKeypress(kp, "");
      }
    }
  }
};

// src/errors.ts
var RlError = class extends Error {
  code;
  /**
   * @param message - Human-readable error message.
   * @param code - Machine-readable error code.
   * @param options - Additional options, including an optional `cause`.
   */
  constructor(message, code = "CANCELLED", options) {
    super(message, options);
    this.name = "RlError";
    this.code = code;
  }
};

// src/utils/ansi.ts
var HIDE_CURSOR = "\x1B[?25l";
var SHOW_CURSOR = "\x1B[?25h";
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}
function visiblePad(value, width) {
  return value + " ".repeat(Math.max(0, width - stripAnsi(value).length));
}
function truncateVisible(value, width) {
  const plain = stripAnsi(value);
  if (plain.length <= width) return value;
  if (width <= 1) return "\u2026";
  return plain.slice(0, width - 1) + "\u2026";
}
function visualLines(text, columns) {
  let lines = 0;
  for (const segment of stripAnsi(text).split("\n")) {
    lines += Math.max(1, Math.ceil((segment.length || 1) / columns));
  }
  return lines;
}
function wrapText(value, width) {
  if (width <= 0) return [value];
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let line = "";
  for (const word of words) {
    if (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width));
      }
      continue;
    }
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// src/rl.ts
function isCsiTerminator(char) {
  const code = char.charCodeAt(0);
  return code >= 64 && code <= 126;
}
var KeyBuffer = class {
  pending = "";
  push(data) {
    this.pending += new TextDecoder().decode(data);
    const keys = [];
    while (this.pending.length > 0) {
      const ch = this.pending[0];
      if (ch === "\x1B") {
        if (this.pending.length < 2) break;
        const csi = this.pending[1] === "[";
        if (csi) {
          let seqEnd = -1;
          for (let k = 2; k < this.pending.length; k++) {
            if (isCsiTerminator(this.pending[k])) {
              seqEnd = k;
              break;
            }
          }
          if (seqEnd === -1) break;
          const seq = this.pending.slice(0, seqEnd + 1);
          this.pending = this.pending.slice(seqEnd + 1);
          keys.push(seq);
        } else {
          this.pending = this.pending.slice(1);
          keys.push("\x1B");
        }
      } else {
        this.pending = this.pending.slice(1);
        keys.push(ch);
      }
    }
    return keys;
  }
};
var Rl = class {
  rl = null;
  hooks = new Hooks();
  opts;
  onResize = null;
  /**
   * Creates a prompt manager.
   *
   * @param options - Input/output streams and defaults; see {@link RlOptions}.
   */
  constructor(options = {}) {
    this.opts = {
      input: options.input ?? defaultStdin,
      output: options.output ?? defaultStdout2,
      history: options.history ?? false,
      historySize: options.historySize ?? 100,
      prompt: options.prompt ?? "> ",
      tabSize: options.tabSize ?? 4
    };
  }
  // ---------------------------------------------------------------------------
  // Hook system (delegated to {@link Hooks})
  // ---------------------------------------------------------------------------
  /**
   * Register a lifecycle hook on this instance.
   *
   * @param hook - The hook to register.
   * @returns `this` for chaining.
   */
  use(hook) {
    this.hooks.use(hook);
    return this;
  }
  /**
   * Remove a previously registered hook by name.
   *
   * @param name - The unique name of the hook.
   * @returns `true` if a hook was removed, `false` otherwise.
   */
  removeHook(name) {
    return this.hooks.removeHook(name);
  }
  /** Number of currently registered hooks. */
  get hookCount() {
    return this.hooks.size;
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
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
  async ask(prompt, options = {}) {
    const finalPrompt = await this.hooks.runBeforeRender(
      `${await this.hooks.runBeforeQuestion(prompt)} `
    );
    let answer;
    for (; ; ) {
      answer = (await this.question(finalPrompt)).trim();
      if (answer === "" && options.default !== void 0) {
        answer = options.default;
      }
      if (options.validate) {
        const result = await options.validate(answer);
        if (result !== true) {
          const errorMsg = typeof result === "string" ? result : "Invalid input";
          this.write(styleText2("red", `\u2716 ${errorMsg}
`));
          continue;
        }
      }
      break;
    }
    await this.hooks.runAfterAnswer(answer, prompt);
    if (options.filter) {
      answer = await options.filter(answer);
    }
    return answer;
  }
  /**
   * Asks a yes/no question, accepting `y/yes/true/1` and `n/no/false/0`.
   *
   * @param prompt - Question shown to the user.
   * @param options - Default when the answer is empty (default: `false`); see {@link ConfirmOptions}.
   * @returns `true` for yes, `false` for no.
   */
  async confirm(prompt, options = {}) {
    const defaultVal = options.default ?? false;
    const hint = defaultVal ? "Y/n" : "y/N";
    const finalPrompt = await this.hooks.runBeforeRender(
      `${await this.hooks.runBeforeQuestion(prompt)} (${styleText2("gray", hint)}) `
    );
    for (; ; ) {
      const answer = (await this.question(finalPrompt)).trim().toLowerCase();
      if (answer === "") return defaultVal;
      if (["y", "yes", "true", "1"].includes(answer)) return true;
      if (["n", "no", "false", "0"].includes(answer)) return false;
      this.write(styleText2("red", "\u2716 Please answer y or n\n"));
    }
  }
  /**
   * Shows a single-choice menu and resolves with the selected `value`.
   *
   * @param prompt - Heading shown above the options.
   * @param options - Choices; see {@link MenuOption}.
   * @param config - Cursor wrapping; see {@link MenuConfig}.
   * @returns The selected option value.
   * @throws {RlError} With code `'EMPTY_MENU'` when `options` is empty.
   */
  async menu(prompt, options, config = {}) {
    if (options.length === 0) {
      throw new RlError("Menu must have at least one option", "EMPTY_MENU");
    }
    const finalPrompt = await this.hooks.runBeforeRender(await this.hooks.runBeforeQuestion(prompt));
    const hasRawMode = typeof this.opts.input.setRawMode === "function";
    if (!hasRawMode) {
      return this.fallbackMenu(finalPrompt, options);
    }
    return this.interactiveMenu(finalPrompt, options, config);
  }
  /**
   * Shows a multi-choice checklist and resolves with the selected `value`s.
   *
   * @param prompt - Heading shown above the options.
   * @param options - Choices with checked/disabled state; see {@link MultiselectOption}.
   * @param config - Defaults, min/max limits and shortcuts; see {@link MultiselectConfig}.
   * @returns The selected option values.
   * @throws {RlError} With code `'EMPTY_MENU'` when `options` is empty.
   */
  async multiselect(prompt, options, config = {}) {
    if (options.length === 0) {
      throw new RlError("Multiselect must have at least one option", "EMPTY_MENU");
    }
    const finalPrompt = await this.hooks.runBeforeRender(await this.hooks.runBeforeQuestion(prompt));
    const hasRawMode = typeof this.opts.input.setRawMode === "function";
    if (!hasRawMode) {
      return this.fallbackMultiselect(finalPrompt, options, config);
    }
    return this.interactiveMultiselect(finalPrompt, options, config);
  }
  /**
   * Asks for secret input, masking keystrokes with `*`.
   *
   * @param prompt - Question shown to the user.
   * @returns The typed value (unmasked).
   */
  async password(prompt) {
    const finalPrompt = await this.hooks.runBeforeRender(await this.hooks.runBeforeQuestion(prompt));
    const stdin = this.opts.input;
    const stdout = this.opts.output;
    return new Promise((resolve, reject) => {
      const isRaw = typeof stdin.setRawMode === "function";
      if (!isRaw) {
        this.question(finalPrompt).then(resolve).catch(reject);
        return;
      }
      stdout.write(finalPrompt);
      stdout.write(HIDE_CURSOR);
      let value = "";
      const origRaw = stdin.isRaw;
      const readlineListeners = stdin.listeners("data");
      stdin.removeAllListeners("data");
      stdin.setRawMode(true);
      stdin.resume();
      const keyBuffer = new KeyBuffer();
      const onData = (data) => {
        const keys = keyBuffer.push(data);
        for (const key of keys) {
          this.hooks.runOnKeypress(key);
          if (key === KEY_CODES.ENTER) {
            cleanup();
            stdout.write("\n");
            resolve(value);
            return;
          } else if (key === KEY_CODES.CTRL_C) {
            cleanup();
            stdout.write("\n");
            reject(new RlError("Cancelled", "CANCELLED"));
            return;
          } else if (key === KEY_CODES.BACKSPACE || key === "\b") {
            if (value.length > 0) {
              value = value.slice(0, -1);
              stdout.write("\b \b");
            }
          } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
            value += key;
            stdout.write("*");
          }
        }
      };
      const cleanup = () => {
        stdin.removeListener("data", onData);
        stdout.write(SHOW_CURSOR);
        if (typeof stdin.setRawMode === "function") {
          stdin.setRawMode(origRaw ?? false);
        }
        stdin.pause();
        for (const listener of readlineListeners) {
          stdin.on("data", listener);
        }
        stdin.resume();
      };
      stdin.on("data", onData);
    });
  }
  /**
   * Start an animated loading spinner bound to this instance's output stream.
   *
   * @param options - Spinner configuration.
   * @returns A {@link SpinnerHandle} to control the animation.
   */
  loading(options = {}) {
    return loading({ ...options, stream: this.opts.output });
  }
  /**
   * Closes the readline interface and runs `onBeforeClose` hooks.
   *
   * @returns A promise resolving once closed.
   */
  async close() {
    this.removeSigwinch();
    await this.hooks.runBeforeClose();
    this.rl?.close();
    this.rl = null;
  }
  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------
  getRl() {
    if (!this.rl) {
      this.rl = createInterface({
        input: this.opts.input,
        output: this.opts.output,
        prompt: this.opts.prompt,
        historySize: this.opts.history ? this.opts.historySize : 0,
        tabSize: this.opts.tabSize
      });
    }
    return this.rl;
  }
  question(query) {
    return new Promise((resolve, reject) => {
      const rl = this.getRl();
      rl.question(query, (answer) => {
        this.closeRl();
        resolve(answer);
      });
      rl.once("SIGINT", () => {
        this.closeRl();
        reject(new RlError("Cancelled", "CANCELLED"));
      });
    });
  }
  closeRl() {
    this.rl?.close();
    this.rl = null;
  }
  async write(output) {
    const rendered = await this.hooks.runBeforeRender(output);
    this.opts.output.write(rendered);
  }
  onSigwinch(handler) {
    this.removeSigwinch();
    this.onResize = handler;
    process.on("SIGWINCH", handler);
  }
  removeSigwinch() {
    if (this.onResize) {
      process.removeListener("SIGWINCH", this.onResize);
      this.onResize = null;
    }
  }
  async fallbackMenu(prompt, options) {
    const lines = [prompt];
    options.forEach((opt, i) => {
      lines.push(`  ${styleText2("cyan", `${i + 1}.`)} ${opt.label}`);
    });
    lines.push("");
    this.opts.output.write(lines.join("\n") + "\n");
    for (; ; ) {
      const answer = (await this.question(styleText2("gray", "Enter number: "))).trim();
      if (!/^\d+$/.test(answer)) {
        this.opts.output.write(
          styleText2("red", `\u2716 Please enter a number between 1 and ${options.length}
`)
        );
        continue;
      }
      const num = parseInt(answer, 10);
      if (num >= 1 && num <= options.length) {
        return options[num - 1].value;
      }
      this.opts.output.write(
        styleText2("red", `\u2716 Please enter a number between 1 and ${options.length}
`)
      );
    }
  }
  async fallbackMultiselect(prompt, options, config) {
    const defaultChecked = config.defaultChecked ?? false;
    const min = config.min ?? 0;
    const max = config.max ?? Infinity;
    const count = options.length;
    const checked = options.map((opt) => opt.disabled ? false : opt.checked ?? defaultChecked);
    const renderList = () => {
      const lines = [prompt];
      options.forEach((opt, i) => {
        const mark = checked[i] ? styleText2("green", "\u25FC") : styleText2("gray", "\u25FB");
        const label = opt.disabled ? styleText2("gray", opt.label) : opt.label;
        const desc = opt.description ? styleText2("gray", ` \u2014 ${opt.description}`) : "";
        lines.push(`  ${mark} ${styleText2("cyan", `${i + 1}.`)} ${label}${desc}`);
      });
      lines.push("");
      this.opts.output.write(lines.join("\n") + "\n");
    };
    renderList();
    for (; ; ) {
      const answer = (await this.question(styleText2("gray", "Enter numbers to toggle (empty to confirm): "))).trim();
      if (answer === "") {
        const selected = options.filter((_, i) => checked[i]).map((opt) => opt.value);
        if (selected.length < min) {
          this.opts.output.write(
            styleText2("red", `\u2716 Please select at least ${min} option${min !== 1 ? "s" : ""}
`)
          );
          continue;
        }
        if (selected.length > max) {
          this.opts.output.write(
            styleText2("red", `\u2716 Please select at most ${max} option${max !== 1 ? "s" : ""}
`)
          );
          continue;
        }
        await this.hooks.runAfterAnswer(selected.join(", "), prompt);
        return selected;
      }
      const nums = answer.split(/[\s,]+/).map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n));
      let changed = false;
      for (const n of nums) {
        if (n >= 1 && n <= count && !options[n - 1].disabled) {
          checked[n - 1] = !checked[n - 1];
          changed = true;
        }
      }
      if (changed) {
        this.opts.output.write(`\x1B[${count + 2}A\x1B[J`);
        renderList();
      } else {
        this.opts.output.write(
          styleText2("red", `\u2716 Enter a number between 1 and ${count}
`)
        );
      }
    }
  }
  async interactiveMultiselect(prompt, options, config) {
    const stdin = this.opts.input;
    const stdout = this.opts.output;
    this.closeRl();
    return new Promise((resolve, reject) => {
      const defaultChecked = config.defaultChecked ?? false;
      const min = config.min ?? 0;
      const max = config.max ?? Infinity;
      const wrap = config.wrap ?? true;
      const shortcuts = config.shortcuts ?? [];
      const checked = options.map((opt) => opt.disabled ? false : opt.checked ?? defaultChecked);
      const origRaw = stdin.isRaw;
      const count = options.length;
      let cursor = 0;
      let renderedVisualLines = 0;
      let settled = false;
      stdout.write(HIDE_CURSOR);
      stdout.write(`${prompt}
`);
      render();
      stdin.setRawMode(true);
      stdin.resume();
      this.onSigwinch(() => {
        if (renderedVisualLines > 0) {
          const up = renderedVisualLines - 1;
          if (up > 0) stdout.write(`\x1B[${up}A`);
          stdout.write("\x1B[J");
        }
        render();
      });
      function selectedCount() {
        return checked.filter(Boolean).length;
      }
      function render() {
        const columns = stdout.columns || 80;
        const lines = [];
        let lastGroup = null;
        for (let i = 0; i < count; i++) {
          const opt = options[i];
          if (opt.group && opt.group !== lastGroup) {
            if (lastGroup !== null) lines.push("");
            lines.push(`  ${styleText2("yellow", opt.group)}`);
            lastGroup = opt.group;
          }
          const isSel = i === cursor;
          const mark = checked[i] ? styleText2("green", "\u25FC") : styleText2("gray", "\u25FB");
          const pointer = isSel ? styleText2("cyan", "\u276F") : " ";
          const label = opt.disabled ? styleText2("gray", opt.label) : isSel ? styleText2("cyan", opt.label) : opt.label;
          const desc = opt.description ? styleText2("gray", ` \u2014 ${opt.description}`) : "";
          const hint = opt.hint ? `  ${styleText2("gray", opt.hint)}` : "";
          lines.push(` ${pointer} ${mark} ${label}${desc}${hint}`);
        }
        lines.push("");
        const hints = [
          `${styleText2("white", "\u2191/\u2193")} move`,
          `${styleText2("white", "space")} toggle`,
          `${styleText2("white", "a")} all`
        ];
        for (const shortcut of shortcuts) {
          hints.push(`${styleText2("white", `[${shortcut.key}]`)} ${shortcut.label}`);
        }
        hints.push(`${styleText2("white", "enter")} confirm (${selectedCount()}/${count})`);
        lines.push(`  ${hints.join(" \xB7 ")}`);
        let newVisualLines = 0;
        for (const line of lines) {
          newVisualLines += visualLines(line, columns);
        }
        if (renderedVisualLines > 0) {
          const up = renderedVisualLines - 1;
          if (up > 0) stdout.write(`\x1B[${up}A`);
          stdout.write("\x1B[J");
        }
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) stdout.write("\n");
          stdout.write("\r\x1B[K");
          stdout.write(lines[i]);
        }
        renderedVisualLines = newVisualLines;
      }
      const keyBuffer = new KeyBuffer();
      const onData = (data) => {
        const keys = keyBuffer.push(data);
        for (const key of keys) {
          if (settled) return;
          this.hooks.runOnKeypress(key);
          if (key === KEY_CODES.ENTER) {
            const selCount = selectedCount();
            if (selCount < min) {
              stdout.write(
                `
${styleText2("red", `\u2716 Please select at least ${min} option${min !== 1 ? "s" : ""}`)}
`
              );
              render();
              return;
            }
            if (selCount > max) {
              stdout.write(
                `
${styleText2("red", `\u2716 Please select at most ${max} option${max !== 1 ? "s" : ""}`)}
`
              );
              render();
              return;
            }
            const selected = options.filter((_, i) => checked[i]).map((opt) => opt.value);
            settled = true;
            cleanup();
            if (renderedVisualLines > 0) {
              const up = renderedVisualLines - 1;
              if (up > 0) stdout.write(`\x1B[${up}A`);
              stdout.write("\x1B[J");
            }
            stdout.write("\r\x1B[K");
            stdout.write(` ${styleText2("green", "\u276F")} ${selCount} selected
`);
            this.hooks.runAfterAnswer(selected.join(", "), prompt);
            resolve(selected);
          } else if (key === KEY_CODES.CTRL_C) {
            settled = true;
            cleanup();
            if (renderedVisualLines > 0) {
              const up = renderedVisualLines - 1;
              if (up > 0) stdout.write(`\x1B[${up}A`);
              stdout.write("\x1B[J");
            }
            stdout.write("\r\x1B[K\n");
            reject(new RlError("Cancelled", "CANCELLED"));
          } else if (key === " ") {
            if (!options[cursor].disabled) {
              checked[cursor] = !checked[cursor];
            }
            render();
          } else if (key === "a") {
            const allSelected = options.every((opt, i) => opt.disabled || checked[i]);
            for (let i = 0; i < count; i++) {
              if (!options[i].disabled) checked[i] = !allSelected;
            }
            render();
          } else {
            const shortcut = shortcuts.find((s) => s.key === key);
            if (shortcut) {
              const result = shortcut.fn(options);
              for (let i = 0; i < count; i++) {
                checked[i] = options[i].disabled ? false : Boolean(result?.[i]);
              }
              render();
            } else if (key === KEY_CODES.UP || key === "k") {
              cursor = wrap ? (cursor - 1 + count) % count : Math.max(0, cursor - 1);
              render();
            } else if (key === KEY_CODES.DOWN || key === "j") {
              cursor = wrap ? (cursor + 1) % count : Math.min(count - 1, cursor + 1);
              render();
            }
          }
        }
      };
      const cleanup = () => {
        this.removeSigwinch();
        stdin.removeListener("data", onData);
        stdout.write(SHOW_CURSOR);
        if (typeof stdin.pause === "function") {
          stdin.pause();
        }
        if (typeof stdin.setRawMode === "function") {
          stdin.setRawMode(origRaw ?? false);
        }
      };
      stdin.on("data", onData);
    });
  }
  async interactiveMenu(prompt, options, config = {}) {
    const stdin = this.opts.input;
    const stdout = this.opts.output;
    this.closeRl();
    return new Promise((resolve, reject) => {
      const wrap = config.wrap ?? true;
      let selected = 0;
      const origRaw = stdin.isRaw;
      const count = options.length;
      let renderedVisualLines = 0;
      let settled = false;
      stdout.write(HIDE_CURSOR);
      stdout.write(`${prompt}
`);
      render();
      stdin.setRawMode(true);
      stdin.resume();
      this.onSigwinch(() => {
        if (renderedVisualLines > 0) {
          const up = renderedVisualLines - 1;
          if (up > 0) stdout.write(`\x1B[${up}A`);
          stdout.write("\x1B[J");
        }
        render();
      });
      function render() {
        const columns = stdout.columns || 80;
        const lines = [];
        for (let i = 0; i < count; i++) {
          const opt = options[i];
          const isSel = i === selected;
          const cursor = isSel ? styleText2("cyan", "\u276F") : " ";
          const label = isSel ? styleText2("cyan", opt.label) : opt.label;
          const desc = opt.description ? styleText2("gray", ` \u2014 ${opt.description}`) : "";
          lines.push(` ${cursor} ${label}${desc}`);
        }
        let newVisualLines = 0;
        for (const line of lines) {
          newVisualLines += visualLines(line, columns);
        }
        if (renderedVisualLines > 0) {
          const up = renderedVisualLines - 1;
          if (up > 0) stdout.write(`\x1B[${up}A`);
          stdout.write("\x1B[J");
        }
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) stdout.write("\n");
          stdout.write("\r\x1B[K");
          stdout.write(lines[i]);
        }
        renderedVisualLines = newVisualLines;
      }
      const keyBuffer = new KeyBuffer();
      const onData = (data) => {
        const keys = keyBuffer.push(data);
        for (const key of keys) {
          if (settled) return;
          this.hooks.runOnKeypress(key);
          if (key === KEY_CODES.UP || key === "k") {
            selected = wrap ? (selected - 1 + count) % count : Math.max(0, selected - 1);
            render();
          } else if (key === KEY_CODES.DOWN || key === "j") {
            selected = wrap ? (selected + 1) % count : Math.min(count - 1, selected + 1);
            render();
          } else if (key === KEY_CODES.ENTER) {
            settled = true;
            cleanup();
            if (renderedVisualLines > 0) {
              const up = renderedVisualLines - 1;
              if (up > 0) stdout.write(`\x1B[${up}A`);
              stdout.write("\x1B[J");
            }
            stdout.write("\r\x1B[K");
            stdout.write(` ${styleText2("cyan", "\u276F")} ${options[selected].label}
`);
            this.hooks.runAfterAnswer(options[selected].value, prompt);
            resolve(options[selected].value);
          } else if (key === KEY_CODES.CTRL_C) {
            settled = true;
            cleanup();
            if (renderedVisualLines > 0) {
              const up = renderedVisualLines - 1;
              if (up > 0) stdout.write(`\x1B[${up}A`);
              stdout.write("\x1B[J");
            }
            stdout.write("\r\x1B[K\n");
            reject(new RlError("Cancelled", "CANCELLED"));
          }
        }
      };
      const cleanup = () => {
        this.removeSigwinch();
        stdin.removeListener("data", onData);
        stdout.write(SHOW_CURSOR);
        if (typeof stdin.pause === "function") {
          stdin.pause();
        }
        if (typeof stdin.setRawMode === "function") {
          stdin.setRawMode(origRaw ?? false);
        }
      };
      stdin.on("data", onData);
    });
  }
};

// src/color.ts
import { styleText as styleText3 } from "util";
function stylize(text, ...formats) {
  if (formats.length === 0) return text;
  if (formats.length === 1) return styleText3(formats[0], text);
  return styleText3(formats, text);
}
function questionMark(text, color = "cyan") {
  return `${styleText3(color, "?")} ${styleText3("bold", text)}`;
}
function prefix(label, color = "cyan", bracketColor = color) {
  return `${styleText3(bracketColor, "[")}${styleText3(color, label)}${styleText3(bracketColor, "]")}`;
}

// src/banner.ts
import { styleText as styleText4 } from "util";

// src/ansi.ts
var BlockFont = {
  a: ["\u256D\u2500\u256E", "\u251C\u2500\u2524", "\u2534 \u2534"],
  // esta bien
  b: ["\u250C\u2500\u256E", "\u251C\u2500\u2524", "\u2514\u2500\u256F"],
  // esta bien
  c: ["\u250C\u2500\u2510", "\u2502", "\u2514\u2500\u2518"],
  // esta bien
  d: ["\u250C\u2500\u2510", "\u2502 \u2502", "\u2514\u2500\u2518"],
  // esta bien
  e: ["\u250C\u2500\u2510", "\u251C\u2500", "\u2514\u2500\u2518"],
  // esta bien
  f: ["\u250C\u2500\u2510", "\u251C\u2500", "\u2534  "],
  // esta bien
  g: ["\u250C\u2500\u2510", "\u2514\u2500\u2524", "\u2500\u2500\u2518"],
  // esta bien
  h: ["\u252C \u252C", "\u251C\u2500\u2524", "\u2534 \u2534"],
  // esta bien
  i: [" \u252C ", " \u2502 ", " \u2534 "],
  // esta bien
  j: ["  \u252C", "  \u2502", "\u2514\u2500\u2518"],
  // esta bien
  k: ["\u252C\u250C\u2500", "\u251C\u2534\u2510", "\u2534 \u2534"],
  // esta bien
  l: ["\u252C", "\u2502", "\u2534\u2500\u2518"],
  // esta bien
  m: ["\u250C\u252C \u252C\u2510", "\u2502\u2502 \u2502\u2502", "\u2534\u2534 \u2534\u2534"],
  n: ["\u250C\u2510 \u250C\u2510", "\u2502\u251C\u2500\u2524\u2502", "\u2534\u2518 \u2514\u2518"],
  o: ["\u250C\u2500\u2510", "\u2502 \u2502", "\u2514\u2500\u2518"],
  // esta bien
  p: ["\u250C\u2500\u2510", "\u251C\u2500\u2518", "\u2534 "],
  // esta bien
  q: ["\u250C\u2500\u2510", "\u2514\u2500\u2524", "  \u2534"],
  // esta bien
  r: ["\u252C\u2500 ", "\u2502  ", "\u2534  "],
  // esta bien
  s: ["\u250C\u2500\u2510", "\u2514\u2500\u2510", "\u2514\u2500\u2518"],
  // esta bien
  t: ["\u250C\u252C\u2510", " \u2502 ", " \u2534 "],
  // esta bien
  u: ["\u252C \u252C", "\u2502 \u2502", "\u2570\u2500\u256F"],
  // esta bien
  v: ["\u250C \u2510", "\u2502 \u2502", "\u2514\u252C\u2518"],
  w: ["\u252C \u252C \u252C", "\u2502 \u2502 \u2502", "\u2534\u2500\u2534\u2500\u2534"],
  // esta bien
  x: ["\u2510 \u250C \u2510", "\u251C \u253C \u2524", "\u2518 \u2514 \u2518"],
  // esta bien
  y: ["\u252C \u252C", "\u2514\u252C\u2518", " \u2502 "],
  // esta bien
  z: ["\u2500\u2500\u2510", " \u2571 ", "\u2514\u2500\u2500"],
  // unica forma de la z
  "0": ["\u250C\u2500\u2510", "\u2502 \u2502", "\u2514\u2500\u2518"],
  // esta bien
  "1": [" \u252C ", " \u2502 ", " \u2534 "],
  // esta bien
  "2": ["\u250C\u2500\u2510", "\u250C\u2500\u2518", "\u2514\u2500\u2518"],
  // esta bien
  "3": ["\u250C\u2500\u2510", " \u2500\u2524", "\u2514\u2500\u2518"],
  // esta bien
  "4": ["\u252C \u252C", "\u2514\u2500\u2524", "  \u2534"],
  // esta bien
  "5": ["\u250C\u2500\u2510", "\u2514\u2500\u2510", "\u2514\u2500\u2518"],
  // esta bien
  "6": ["\u250C\u2500\u2510", "\u251C\u2500\u2510", "\u2514\u2500\u2518"],
  // esta bien
  "7": ["\u250C\u2500\u2510", "  \u2502", "  \u2518"],
  // esta bien
  "8": ["\u250C\u2500\u2510", "\u251C\u2500\u2524", "\u2514\u2500\u2518"],
  // esta bien
  "9": ["\u250C\u2500\u2510", "\u2514\u2500\u2524", "\u2514\u2500\u2518"],
  // esta bien
  " ": [" ", " ", " "],
  ".": ["", "", "."],
  "-": ["", "\u2500\u2500", ""],
  _: ["", "", "\u2500\u2500"],
  "!": ["\u2502", "\u2502", " "],
  "?": ["\u250C\u2500\u2510", " \u2500\u2524", "   "]
};
function glyphWidth(rows) {
  return Math.max(1, ...rows.map((r) => r.length));
}
function ANSIText(text, options = {}) {
  const font = options.font ?? BlockFont;
  const gap = options.gap ?? 1;
  const chars = [...text];
  const cols = [];
  for (const ch of chars) {
    const key = String(ch).toLowerCase();
    const rows = font[key] ?? font[" "] ?? [" ", " ", " "];
    cols.push({ rows, w: glyphWidth(rows) });
  }
  const height = text.length === 0 ? 0 : 3;
  const width = cols.reduce((sum, c, i) => sum + c.w + (i < cols.length - 1 ? gap : 0), 0);
  const gridRows = Array.from(
    { length: height },
    () => Array.from({ length: width }, () => " ")
  );
  let x = 0;
  for (const c of cols) {
    for (let y = 0; y < 3; y++) {
      const glyphRow = c.rows[y] ?? "";
      for (let dx = 0; dx < glyphRow.length; dx++) {
        gridRows[y][x + dx] = glyphRow[dx];
      }
    }
    x += c.w + gap;
  }
  return { rows: gridRows, width, height, text };
}
function gridToLines(grid) {
  return grid.rows.map((row) => row.join(""));
}
function trueColor(r, g, b, text) {
  return `\x1B[38;2;${Math.max(0, Math.min(255, Math.round(r)))};${Math.max(0, Math.min(255, Math.round(g)))};${Math.max(0, Math.min(255, Math.round(b)))}m${text}\x1B[39m`;
}
function hslToRgb(h, s, l) {
  h = (h % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs(hp % 2 - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function paintGrid(grid, perCell) {
  const out = [];
  for (let y = 0; y < grid.height; y++) {
    let line = "";
    for (let x = 0; x < grid.width; x++) {
      const ch = grid.rows[y][x];
      if (ch === " ") line += " ";
      else line += perCell(y, x);
    }
    out.push(line);
  }
  return out;
}
function wave(grid, frame) {
  const speed = 2.5;
  const waveFront = frame * speed;
  return paintGrid(grid, (row, col) => {
    const distance = col + row * 2;
    const progress = Math.max(0, Math.min(1, (waveFront - distance) / 10));
    const grayValue = Math.round(63 + progress * (244 - 63));
    const g = trueColor(grayValue, grayValue, grayValue, grid.rows[row][col]);
    return g;
  });
}
function rainbow(grid, frame, speed = 6) {
  return paintGrid(grid, (_row, col) => {
    const hue = (frame * speed + col * 12) % 360;
    const [r, g, b] = hslToRgb(hue, 0.9, 0.55);
    return trueColor(r, g, b, grid.rows[_row][col]);
  });
}
function typing(grid, frame) {
  const out = [];
  for (let y = 0; y < grid.height; y++) {
    let line = "";
    for (let x = 0; x < grid.width; x++) {
      const ch = grid.rows[y][x];
      if (x < frame) {
        line += ch === " " ? " " : trueColor(200, 200, 200, ch);
      } else {
        line += " ";
      }
    }
    out.push(line);
  }
  return out;
}
function wipe(grid, frame) {
  const out = [];
  for (let y = 0; y < grid.height; y++) {
    let line = "";
    for (let x = 0; x < grid.width; x++) {
      const srcX = x + (grid.width - frame);
      const ch = srcX >= 0 && srcX < grid.width ? grid.rows[y][srcX] : " ";
      line += ch === " " ? " " : trueColor(220, 220, 220, ch);
    }
    out.push(line);
  }
  return out;
}
function pulse(grid, frame) {
  const t = frame % 20 / 20;
  const brightness = Math.round(80 + (1 - Math.abs(t * 2 - 1)) * 160);
  const hue = 200;
  const [r, g, b] = hslToRgb(hue, 0.7, 0.6);
  const k = brightness / 255;
  return paintGrid(grid, (row, col) => trueColor(r * k, g * k, b * k, grid.rows[row][col]));
}
function totalFramesFor(animation, grid, options = {}) {
  switch (animation) {
    case "wave": {
      const speed = options.speed ?? 2.5;
      return Math.ceil((grid.width + grid.height * 2 + 10) / speed) + 1;
    }
    case "rainbow": {
      const speed = options.speed ?? 6;
      return Math.ceil(360 / speed) + 1;
    }
    case "typing":
      return grid.width + 1;
    case "wipe":
      return grid.width + 1;
    case "pulse":
      return 20;
    default:
      return 1;
  }
}
function animateGrid(grid, animation, totalFrames, options = {}) {
  const frameDelay = options.frameDelay ?? 28;
  const stream = options.stream ?? process.stdout;
  const write = (value) => stream.write(value);
  const loop = options.loop === true;
  return new Promise((resolve) => {
    write("\n");
    let frame = 0;
    let timer = null;
    const stop = () => {
      if (timer) clearInterval(timer);
    };
    if (loop) {
      timer = setInterval(() => {
        const lines = animation(grid, frame);
        write(lines.join("\n"));
        write("\n");
        frame++;
        write(`\x1B[${grid.height}A\r`);
      }, frameDelay);
      resolve({ stop });
      return;
    }
    const render = () => {
      const lines = animation(grid, frame);
      write(lines.join("\n"));
      write("\n");
      frame++;
      if (frame >= totalFrames) {
        resolve({ stop });
        return;
      }
      write(`\x1B[${grid.height}A\r`);
      setTimeout(render, frameDelay);
    };
    render();
  });
}

// src/banner.ts
function animationFor(name) {
  switch (name) {
    case "rainbow":
      return rainbow;
    case "typing":
      return typing;
    case "wipe":
      return wipe;
    case "pulse":
      return pulse;
    case "wave":
    default:
      return wave;
  }
}
function staticBanner(lines, subtitle, write) {
  write("\n");
  for (const line of lines) write(styleText4(["bold", "cyan"], line) + "\n");
  if (subtitle) write(styleText4("gray", subtitle) + "\n");
  write("\n");
}
async function printBanner(options) {
  const {
    lines,
    text,
    subtitle,
    animate = true,
    animation = "wave",
    speed,
    loop = false,
    stream = process.stdout
  } = options;
  const write = (value) => stream.write(value);
  const isAnimated = animate && Boolean(stream.isTTY) && !("NO_COLOR" in process.env);
  const rawLines = text !== void 0 ? gridToLines(ANSIText(text)) : lines ?? [];
  if (!isAnimated) {
    staticBanner(rawLines, subtitle, write);
    return;
  }
  const grid = text !== void 0 ? ANSIText(text) : { rows: (lines ?? []).map((l) => [...l]), width: Math.max(0, ...(lines ?? []).map((l) => l.length)), height: (lines ?? []).length, text: "" };
  const renderer = animationFor(animation);
  const totalFrames = totalFramesFor(animation, grid, { speed });
  const isCyclic = animation === "wave" || animation === "rainbow" || animation === "pulse";
  const shouldLoop = loop && isCyclic;
  write(HIDE_CURSOR + "\n");
  const finish = () => {
    if (subtitle) write(styleText4("gray", `   ${subtitle}`) + "\n");
    write(SHOW_CURSOR);
    write("\n");
  };
  if (!shouldLoop) {
    await animateGrid(grid, renderer, totalFrames, { stream });
    finish();
    return;
  }
  const handle = await animateGrid(grid, renderer, totalFrames, { loop: true, stream });
  const originalStop = handle.stop;
  handle.stop = () => {
    originalStop();
    finish();
  };
  const onExit = () => write(SHOW_CURSOR);
  process.once("exit", onExit);
  return handle;
}

// src/utils/format.ts
function formatTime(ms) {
  if (ms < 1e3) return `${ms}ms`;
  const s = ms / 1e3;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}
var NOISE_PATTERNS = [
  /^npm\s+(warn|notice|http)\b/i,
  /^npm\s+error\s*$/i,
  /^\s*$/,
  /^>\s/,
  /^added\s+\d+\s+packages/i,
  /^up to date/i,
  /^npm error A complete log of this run/i,
  /^npm error\s+[\w/\\:.-]+debug-\d+\.log$/i
];
function extractErrorLines(stderr, output = "") {
  const raw = stderr?.trim() || output?.trim() || "";
  return raw.split("\n").map((line) => line.trim()).filter((line) => line && !NOISE_PATTERNS.some((pattern) => pattern.test(line)));
}
function summarizeError(stderr, output = "", maxWidth = 80) {
  const lines = extractErrorLines(stderr, output);
  if (lines.length === 0) return "Unknown error";
  return truncateVisible(lines[0], maxWidth);
}

// src/utils/table.ts
import { styleText as styleText5 } from "util";
import { stdout as defaultStdout3 } from "process";
function table(options) {
  const { headers, rows } = options;
  const terminalWidth = options.width ?? options.stream?.columns ?? defaultStdout3.columns ?? 100;
  const fixedOverhead = headers.length * 3 + 2;
  const contentWidth = Math.max(20, terminalWidth - fixedOverhead);
  const widths = headers.map((h, i) => {
    const cells = [h, ...rows.map((row) => row[i] ?? "")];
    return Math.min(34, Math.max(5, ...cells.map((cell) => cell.length)));
  });
  const totalNatural = widths.reduce((a, b) => a + b, 0);
  if (totalNatural > contentWidth) {
    const scale = contentWidth / totalNatural;
    for (let i = 0; i < widths.length; i++) {
      widths[i] = Math.max(5, Math.floor(widths[i] * scale));
    }
  }
  const line = (cells) => `| ${cells.map((cell, i) => visiblePad(truncateVisible(cell, widths[i]), widths[i])).join(" | ")} |`;
  const divider = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
  const out = [line(headers), divider];
  for (const row of rows) {
    const wrapped = row.map((cell, i) => wrapText(cell ?? "", widths[i]));
    const height = Math.max(1, ...wrapped.map((lines) => lines.length));
    for (let lineIdx = 0; lineIdx < height; lineIdx++) {
      out.push(line(wrapped.map((lines) => lines[lineIdx] ?? "")));
    }
  }
  return styleText5("gray", out.join("\n"));
}

// src/utils/columns.ts
import { stdout as defaultStdout4 } from "process";
function columnsList(items, options = {}) {
  const { cols = 3, gap = 3, indent = "   ", stream = defaultStdout4 } = options;
  if (items.length === 0) return "";
  const terminalWidth = stream.columns ?? defaultStdout4.columns ?? 100;
  const naturalWidth = Math.max(...items.map((item) => item.length));
  const colWidth = Math.min(
    naturalWidth,
    Math.max(1, Math.floor((terminalWidth - indent.length - (cols - 1) * gap) / cols))
  );
  const lines = [];
  for (let i = 0; i < items.length; i += cols) {
    const row = items.slice(i, i + cols);
    const rendered = row.map((item, j) => {
      const isLast = i + j === items.length - 1 || j === cols - 1;
      return isLast ? item : visiblePad(item, colWidth);
    });
    lines.push(indent + rendered.join(" ".repeat(gap)));
  }
  return lines.join("\n");
}

// src/utils/pad.ts
function padStart(count, options = {}) {
  const ch = options.style === "tab" ? "	" : " ";
  return count > 0 ? ch.repeat(count) : "";
}
function padEnd(count, options = {}) {
  return padStart(count, options);
}
export {
  ANSIText,
  BRAILLE_LEVELS,
  BlockFont,
  HIDE_CURSOR,
  Hooks,
  Rl,
  RlError,
  SHOW_CURSOR,
  SPINNERS,
  animateGrid,
  columnsList,
  createRandomBrailleGenerator,
  extractErrorLines,
  formatTime,
  gridToLines,
  loading,
  padEnd,
  padStart,
  prefix,
  printBanner,
  pulse,
  questionMark,
  rainbow,
  stripAnsi,
  stylize,
  summarizeError,
  table,
  totalFramesFor,
  truncateVisible,
  typing,
  visiblePad,
  wave,
  wipe,
  wrapText
};
