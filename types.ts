interface ConfigFileContentBlock {
  files?: string[]
  patterns: string[]
  scanGradleLayout?: boolean
  scanDotNetLayout?: boolean
}

interface DetectConfig {
  packages?: string[]
  packagePatterns?: RegExp[]
  configFiles?: string[]
  fileExtensions?: string[]
  gems?: string[]
  configFileContent?: ConfigFileContentBlock | ConfigFileContentBlock[]
}

interface Technology {
  id: string
  name: string
  detect: DetectConfig
  skills: string[]
}

interface ComboSkill {
  id: string
  name: string
  requires: string[]
  skills: string[]
}

type Tuple = [id: string, source: string]

interface Props {
  directory: string
  fileName: string
  mode: 'development' | 'production'
}

export type { ComboSkill, Technology, Tuple, Props }
