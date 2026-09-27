// @ts-ignore
import {
  writeFileSync,
  existsSync,
  mkdirSync
} from 'node:fs'
import {
  Rl, stylize, prefix, questionMark, printBanner, table, RlError
} from '@useful-libs/rl'
import type { Props, Tuple } from './types.ts'
import { COMBO_SKILLS_MAP, FRONTEND_BONUS_SKILLS, SKILLS_MAP } from './const.ts'
import { join, isAbsolute } from 'node:path'

const parseSkills = (skills: Array<string>): Array<Tuple> => {
  return skills.map((skill) => {
    const segments = skill.split("/")
    const source = segments.slice(0, -1).join("/")
    const id = segments.at(-1) ?? ""
    return [id, source]
  })
}

const stringify = (data: unknown) => JSON.stringify(data, null, 2)

/**
 * Build the `$schema` reference for development mode as a relative URI.
 * Always uses forward slashes (valid in URIs on every OS) and prefixes
 * `./` only for relative paths — absolute paths are kept as-is.
 */
const toSchemaRef = (directory: string, fileName: string): string => {
  const filePath = join(directory, fileName)
  const posix = filePath.split(/[\\/]+/).join('/')
  if (isAbsolute(filePath) || /^[a-zA-Z]:\//.test(posix)) return posix
  if (posix.startsWith('./') || posix.startsWith('../')) return posix
  return `./${posix}`
}

function generateSchema({
  directory,
  fileName,
  mode = 'development'
}: Props): { file: string; schemaRef: string; skillCount: number } {
  const allSkillTuples = [
    ...SKILLS_MAP.flatMap((tech) => parseSkills(tech.skills)),
    ...COMBO_SKILLS_MAP.flatMap((combo) => parseSkills(combo.skills)),
    ...parseSkills(FRONTEND_BONUS_SKILLS),
  ]

  const skillDefinitions = Object.fromEntries(
    allSkillTuples.map(([id, source]) => {
      return [
        id,
        {
          description: `Agent Skill ${id}`,
          properties: {
            source: {
              type: "string",
              const: source,
              description: `Source: ${source}`,
            },
            sourceType: { $ref: "#/definitions/source-type" },
            computedHash: { $ref: "#/definitions/computed-hash" },
          },
          required: ["source", "sourceType"],
        },
      ]
    }),
  )

  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Autoskills Lockfile",
    description:
      "Configuration schema for Autoskills lockfile (skills-lock.json)",
    type: "object",
    required: ["version", "skills"],
    additionalProperties: false,
    properties: {
      $schema: {
        type: "string",
        const: mode === 'production' ? "https://autoskills.sh/skills-lock.schema.json" : toSchemaRef(directory, fileName),
        description: ""
      },
      version: {
        anyOf: [
          { $ref: "#/definitions/semver" },
          { $ref: "#/definitions/version" }
        ]
      },
      skills: {
        type: "object",
        description: "Installed skills in your project",
        properties: skillDefinitions,
      },
      additionalProperties: false,
    },
    definitions: {
      semver: {
        type: "string",
        format: "^\\d+\\.\\d+\\.\\d+$",
        description: "Version of the autoskill lockfile (SEMVER)",
        default: "1.0.0"
      },
      version: {
        type: "integer",
        minimum: 1,
        description: "Version of the autoskill lockfile",
        default: 1
      },
      "source-type": {
        type: "string",
        enum: [
          "autoskills-registry"
        ]
      },
      "computed-hash": {
        type: "string",
        pattern: "^[a-fA-F0-9]{64}$"
      }
    }
  }


  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
  }


  const file = join(directory, fileName)
  writeFileSync(file, stringify(schema))

  return {
    file,
    schemaRef: (schema.properties.$schema as { const: string }).const,
    skillCount: allSkillTuples.length,
  }
}

async function main() {
  const rl = new Rl({ tabSize: 2 })

  try {
    await printBanner({ text: 'autoskills', subtitle: 'skills-lock schema generator' })

    // `ask()` already substitutes `default` before validating, so validators
    // only ever see non-empty input — no need to handle the empty case.
    const directory = await rl.ask(
      `${prefix('DIR', 'cyan')} ${questionMark('Output directory?')} (${stylize('schema', 'dim')})`,
      { default: 'schema' },
    )

    const fileName = await rl.ask(
      `${prefix('FILE', 'magenta')} ${questionMark('Schema filename?')} (${stylize('skills-lock.schema.json', 'dim')})`,
      {
        default: 'skills-lock.schema.json',
        validate: (input) =>
          input.endsWith('.json') || 'Filename must end with .json',
      },
    )

    // Env var (Bun or Node) only decides which option is pre-selected first;
    // the user always picks via an arrow-key menu (numbered fallback on non-TTY).
    const envMode =
      ((globalThis as { Bun?: { env?: Record<string, string | undefined> } }).Bun
        ?.env?.MODE ?? process.env.MODE) as 'production' | 'development' | undefined
    const devFirst = envMode !== 'production'
    const mode = (await rl.menu(questionMark('Build mode?'), devFirst
      ? [
        { label: 'development', value: 'development', description: 'local $schema ref (./dir/file.json)' },
        { label: 'production', value: 'production', description: 'remote $schema ref (autoskills.sh)' },
      ]
      : [
        { label: 'production', value: 'production', description: 'remote $schema ref (autoskills.sh)' },
        { label: 'development', value: 'development', description: 'local $schema ref (./dir/file.json)' },
      ])) as 'production' | 'development'

    const outFile = join(directory, fileName)
    if (existsSync(outFile)) {
      const overwrite = await rl.confirm(
        `${prefix('WARN', 'yellow')} ${questionMark(`'${outFile}' exists. Overwrite?`)}`,
        { default: false },
      )
      if (!overwrite) {
        console.log(stylize('Aborted: file already exists.', 'yellow'))
        return
      }
    }

    const spin = rl.loading({ text: `Generating ${outFile}…`, style: 'dots' })
    spin.start()
    try {
      const result = generateSchema({ directory, fileName, mode })
      spin.succeed(`Schema written to ${result.file}`)
      console.log(table({
        headers: ['Field', 'Value'],
        rows: [
          ['file', result.file],
          ['$schema', result.schemaRef],
          ['mode', mode],
          ['skills', String(result.skillCount)],
        ],
      }))
    } catch (err) {
      spin.fail('Generation failed')
      throw err
    }
  } catch (err) {
    if (err instanceof RlError && err.code === 'CANCELLED') {
      console.log(stylize('\nCancelled.', 'yellow'))
      process.exitCode = 130
      return
    }
    throw err
  } finally {
    await rl.close()
  }
}

await main()
