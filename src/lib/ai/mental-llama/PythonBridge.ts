/**
 * This file is a stub implementation for browser compatibility.
 * In a real application, this would be conditionally imported only on the server
 * using dynamic imports or build-time code splitting.
 */

import { getLogger } from '../../logging'
import { isBrowser } from '../../../lib/browser'

const logger = getLogger()

let spawn: typeof import('child_process').spawn
let fs: typeof import('fs')
let path: typeof import('path')
let process: typeof import('process') // For process.cwd() and process.platform

/**
 * Configuration for the MentalLLaMAPythonBridge
 */
export interface MentalLLaMAPythonBridgeConfig {
  pythonPath?: string
  mentalLLaMAPath: string
  venvName?: string
  outputDir?: string
  logLevel?: 'debug' | 'info' | 'warning' | 'error'
  securityOptions?: {
    allowedCommands?: string[]
    disallowedArgs?: string[]
    sanitizeInput?: boolean
  }
}

/**
 * Bridge to interact with MentalLLaMA Python code
 * Handles secure communication between TypeScript and Python code
 */
export class MentalLLaMAPythonBridge {
  private pythonPath: string
  private mentalLLaMAPath: string
  private venvName: string | undefined
  private outputDir: string
  private logLevel: string
  private initialized: boolean = false
  private securityOptions: {
    allowedCommands: string[]
    disallowedArgs: string[]
    sanitizeInput: boolean
  }

  private constructor(
    mentalLLaMAPath: string,
    pythonPath: string = 'python',
    config: Partial<MentalLLaMAPythonBridgeConfig> = {},
  ) {
    this.mentalLLaMAPath = mentalLLaMAPath
    this.pythonPath = pythonPath
    this.logLevel = config.logLevel || 'info'

    if (isBrowser) {
      logger.warn(
        'MentalLLaMAPythonBridge is not available in browser environments',
      )
      this.outputDir = '' // Set to empty string for browser
      this.securityOptions = {
        // Initialize for browser
        allowedCommands: config.securityOptions?.allowedCommands || [],
        disallowedArgs: config.securityOptions?.disallowedArgs || [],
        sanitizeInput: config.securityOptions?.sanitizeInput !== false,
      }
      return
    }
    this.outputDir = config.outputDir || '' // Will be overridden by create() in Node.js
    this.securityOptions = {
      // Will be overridden by create() in Node.js
      allowedCommands: [],
      disallowedArgs: [],
      sanitizeInput: true,
    }
  }

  public static async create(
    mentalLLaMAPath: string,
    pythonPath: string = 'python',
    config: Partial<MentalLLaMAPythonBridgeConfig> = {},
  ): Promise<MentalLLaMAPythonBridge> {
    const instance = new MentalLLaMAPythonBridge(
      mentalLLaMAPath,
      pythonPath,
      config,
    )

    if (!isBrowser) {
      const childProcessModule = await import('child_process')
      spawn = childProcessModule.spawn
      fs = await import('fs')
      path = await import('path')
      process = await import('process')

      instance.outputDir =
        config.outputDir || path.join(process.cwd(), 'data', 'mental-llama')

      const currentFilePath = import.meta.url
      const currentDirPath = path.dirname(new URL(currentFilePath).pathname)

      const defaultAllowedScripts = [
        path.join(mentalLLaMAPath, 'eval_imhi.py'),
        path.join(mentalLLaMAPath, 'label_responses.py'),
      ]
      if (fs.existsSync(currentDirPath)) {
        defaultAllowedScripts.push(
          path.join(currentDirPath, 'scripts', 'text_analyzer.py'),
        )
      }

      instance.securityOptions = {
        allowedCommands: config.securityOptions?.allowedCommands || [
          'python',
          'pip',
          'git',
          ...defaultAllowedScripts,
        ],
        disallowedArgs: config.securityOptions?.disallowedArgs || [
          ';',
          '&&',
          '||',
          '>',
          '>>',
          '<',
          '<<',
          '|',
          '$("',
          '`',
          'rm -rf',
          'sudo',
          'chmod',
          'chown',
        ],
        sanitizeInput: config.securityOptions?.sanitizeInput !== false,
      }

      logger.info('MentalLLaMAPythonBridge initialized with configuration', {
        pythonPath: instance.pythonPath,
        mentalLLaMAPath: instance.mentalLLaMAPath,
        outputDir: instance.outputDir,
        venvName: instance.venvName,
      })
    }
    return instance
  }

  async initialize(): Promise<boolean> {
    if (isBrowser) {
      throw new Error(
        'MentalLLaMAPythonBridge is not available in browser environments',
      )
    }
    if (!fs || !path || !spawn || !process) {
      throw new Error('Node.js modules not loaded. Ensure create() was called.')
    }

    try {
      logger.info('Initializing MentalLLaMA Python Bridge', {
        mentalLLaMAPath: this.mentalLLaMAPath,
      })

      if (!fs.existsSync(this.outputDir)) {
        logger.info('Creating output directory', { outputDir: this.outputDir })
        fs.mkdirSync(this.outputDir, { recursive: true })
      }

      if (!fs.existsSync(this.mentalLLaMAPath)) {
        logger.info('MentalLLaMA path does not exist, cloning repository', {
          mentalLLaMAPath: this.mentalLLaMAPath,
        })
        const parentDir = path.dirname(this.mentalLLaMAPath)
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true })
        }
        await this.executeCommand('git', [
          'clone',
          'https://github.com/SteveKGYang/MentalLLaMA.git',
          this.mentalLLaMAPath,
        ])
      } else {
        logger.info('MentalLLaMA repository already exists', {
          mentalLLaMAPath: this.mentalLLaMAPath,
        })
      }

      if (this.venvName) {
        const venvPath = path.join(this.mentalLLaMAPath, this.venvName)
        if (!fs.existsSync(venvPath)) {
          logger.info('Creating virtual environment', { venvPath })
          await this.executeCommand(this.pythonPath, ['-m', 'venv', venvPath])
        }

        const requirementsPath = path.join(
          this.mentalLLaMAPath,
          'requirements.txt',
        )
        const pipCmd =
          process.platform === 'win32'
            ? path.join(venvPath, 'Scripts', 'pip')
            : path.join(venvPath, 'bin', 'pip')

        if (fs.existsSync(requirementsPath)) {
          logger.info('Installing requirements')
          await this.executeCommand(pipCmd, ['install', '-r', requirementsPath])
        } else {
          const minimalRequirements = [
            'torch>=2.0.0',
            'transformers>=4.28.0',
            'datasets>=2.12.0',
            'numpy>=1.24.3',
            'pandas>=2.0.0',
            'scikit-learn>=1.2.2',
            'accelerate>=0.20.3',
            'matplotlib>=3.7.1',
            'jsonlines>=3.1.0',
            'requests>=2.31.0',
            'tqdm>=4.65.0',
          ]
          await this.executeCommand(pipCmd, ['install', ...minimalRequirements])
        }
      }

      const pythonVersionOutput = await this.executeCommandWithOutput(
        this.getPythonExecutable(),
        ['--version'],
      )
      logger.info('Python environment validated', {
        version: pythonVersionOutput,
      })

      this.initialized = true
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to initialize Python bridge', { error: message })
      return false
    }
  }

  async runIMHIEvaluation(params: {
    modelPath: string
    batchSize?: number
    outputPath: string
    testDataset: 'IMHI' | 'IMHI-completion' | 'expert'
    isLlama?: boolean
  }): Promise<string> {
    if (isBrowser) {
      throw new Error(
        'MentalLLaMAPythonBridge runIMHIEvaluation is not available in browser environments',
      )
    }
    if (!fs || !path || !spawn) {
      throw new Error('Node.js modules not loaded. Ensure create() was called.')
    }
    this.ensureInitialized()
    logger.info('Running IMHI benchmark evaluation with MentalLLaMA', {
      params,
    })
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalLLaMAPath, 'eval_imhi.py')
    const scriptArgs = [
      scriptPath,
      '--model_name_or_path',
      this.sanitizePath(params.modelPath),
      '--test_dataset',
      params.testDataset,
      '--output_path',
      this.sanitizePath(params.outputPath),
    ]
    if (params.batchSize) {
      scriptArgs.push('--batch_size', params.batchSize.toString())
    }
    if (params.isLlama) {
      scriptArgs.push('--is_llama_model')
    }
    return this.executeCommandWithOutput(pythonExe, scriptArgs)
  }

  async labelResponses(params: {
    modelPath: string
    dataPath: string
    outputPath: string
    calculate?: boolean
  }): Promise<string> {
    if (isBrowser) {
      throw new Error(
        'MentalLLaMAPythonBridge labelResponses is not available in browser environments',
      )
    }
    if (!fs || !path || !spawn) {
      throw new Error('Node.js modules not loaded. Ensure create() was called.')
    }
    this.ensureInitialized()
    logger.info('Labeling responses with MentalLLaMA', { params })
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalLLaMAPath, 'label_responses.py')
    const scriptArgs = [
      scriptPath,
      '--model_name_or_path',
      this.sanitizePath(params.modelPath),
      '--data_path',
      this.sanitizePath(params.dataPath),
      '--output_path',
      this.sanitizePath(params.outputPath),
    ]
    if (params.calculate) {
      scriptArgs.push('--calculate')
    }
    return this.executeCommandWithOutput(pythonExe, scriptArgs)
  }

  async analyzeText(params: {
    modelPath: string
    text: string
    outputPath?: string
    categories?: ('depression' | 'anxiety' | 'stress' | 'suicidal' | 'all')[]
  }): Promise<{
    categories: Record<string, number>
    analysis: string
    confidenceScore: number
  }> {
    if (isBrowser) {
      throw new Error(
        'MentalLLaMAPythonBridge analyzeText is not available in browser environments',
      )
    }
    if (!fs || !path || !spawn || !process) {
      throw new Error('Node.js modules not loaded. Ensure create() was called.')
    }
    this.ensureInitialized()
    logger.info('Analyzing text with MentalLLaMA', { params })

    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const inputFilePath = path.join(tempDir, 'input-' + Date.now() + '.txt')
    fs.writeFileSync(inputFilePath, params.text)

    const defaultOutputDir = path.join(tempDir, 'analysis_results')
    const outputPath = params.outputPath
      ? this.sanitizePath(params.outputPath)
      : defaultOutputDir
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true })
    }

    const currentFilePath = import.meta.url
    const scriptDir = path.dirname(new URL(currentFilePath).pathname)
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(scriptDir, 'scripts', 'text_analyzer.py')
    const scriptArgs = [
      scriptPath,
      '--model_path',
      this.sanitizePath(params.modelPath),
      '--input_file',
      inputFilePath,
      '--output_dir',
      outputPath,
    ]
    if (params.categories && params.categories.length > 0) {
      scriptArgs.push('--categories', params.categories.join(','))
    }

    try {
      const analysisOutputRaw = await this.executeCommandWithOutput(
        pythonExe,
        scriptArgs,
      )
      const analysisResult = JSON.parse(analysisOutputRaw)
      if (fs.existsSync(inputFilePath)) {
        fs.unlinkSync(inputFilePath)
      }
      return analysisResult
    } catch (error) {
      if (fs.existsSync(inputFilePath)) {
        fs.unlinkSync(inputFilePath)
      }
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Text analysis failed', { error: message })
      throw error
    }
  }

  private sanitizeInput(input: string): string {
    if (!this.securityOptions.sanitizeInput) {
      return input
    }
    let sanitized = input.replace(/["\\;&|>$`()]/g, '')
    sanitized = sanitized.replace(/\.\.\/|\.\.\\/g, '')
    return sanitized
  }

  private sanitizePath(filePath: string): string {
    if (!this.securityOptions.sanitizeInput) {
      return filePath
    }
    if (!path) {
      throw new Error('Path module not loaded for sanitizePath')
    }
    const resolvedPath = path.resolve(filePath)
    return path.normalize(resolvedPath)
  }

  private getPythonExecutable(): string {
    if (isBrowser) {
      return 'python'
    }
    if (!path || !fs || !process) {
      throw new Error('Node.js modules not loaded for getPythonExecutable.')
    }
    if (this.venvName) {
      const venvPath = path.join(this.mentalLLaMAPath, this.venvName)
      const pythonInVenv =
        process.platform === 'win32'
          ? path.join(venvPath, 'Scripts', 'python.exe')
          : path.join(venvPath, 'bin', 'python')
      if (fs.existsSync(pythonInVenv)) {
        return pythonInVenv
      }
      logger.warn(
        'Python executable not found in venv ' +
          venvPath +
          ', falling back to global path.',
      )
    }
    return this.pythonPath
  }

  private ensureInitialized(): void {
    if (!this.initialized && !isBrowser) {
      throw new Error(
        'MentalLLaMAPythonBridge is not initialized. Call initialize() first.',
      )
    }
  }

  private validateCommand(command: string, args: string[]): void {
    if (isBrowser) {
      return
    }
    if (!path) {
      throw new Error('Path module not loaded for validateCommand')
    }

    const fullCommand = `${command} ${args.join(' ')}`
    logger.debug('Validating command', { command: fullCommand })

    for (const disallowed of this.securityOptions.disallowedArgs) {
      if (
        args.some((arg) => arg.includes(disallowed)) ||
        command.includes(disallowed)
      ) {
        logger.error('Disallowed argument or command part detected', {
          command,
          arg: disallowed,
        })
        throw new Error(
          `Command validation failed: disallowed argument or command part '${disallowed}'`,
        )
      }
    }

    const isAllowedCommand = this.securityOptions.allowedCommands.some(
      (allowed) => {
        if (command === allowed) {
          return true
        }
        if (
          fs.existsSync(allowed) &&
          path.isAbsolute(allowed) &&
          command.startsWith(path.dirname(allowed))
        ) {
          const scriptBeingRun = args.find((arg) => arg.endsWith('.py'))
          if (
            scriptBeingRun &&
            path.resolve(scriptBeingRun) === path.resolve(allowed)
          ) {
            return true
          }
          if (command === allowed && args.length === 0) {
            return true
          }
        }
        return false
      },
    )

    if (!isAllowedCommand) {
      logger.error('Command not allowed', { command: fullCommand })
      throw new Error(`Command not allowed: ${fullCommand}`)
    }
    logger.debug('Command validated successfully', { command: fullCommand })
  }

  private async executeCommandWithOutput(
    command: string,
    args: string[],
    env: Record<string, string> = {},
  ): Promise<string> {
    if (isBrowser) {
      throw new Error('executeCommandWithOutput is not available in browser')
    }
    if (!spawn) {
      throw new Error('Spawn module not loaded. Ensure create() was called.')
    }
    this.ensureInitialized()
    const sanitizedCommand = this.sanitizeInput(command)
    const sanitizedArgs = args.map((arg) => this.sanitizeInput(arg))
    this.validateCommand(sanitizedCommand, sanitizedArgs)

    return new Promise((resolve, reject) => {
      logger.info('Executing command with output', {
        command: sanitizedCommand,
        args: sanitizedArgs,
      })
      const processEnv = { ...process.env, ...env }
      const proc = spawn(sanitizedCommand, sanitizedArgs, {
        env: processEnv,
        shell: false,
      })
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
        logger.debug('Command stdout:', { data: data.toString() })
      })

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
        logger.warn('Command stderr:', { data: data.toString() })
      })

      proc.on('close', (code: number | null) => {
        if (code !== 0) {
          logger.error('Command execution failed', {
            command: sanitizedCommand,
            args: sanitizedArgs,
            code,
            stderr,
            stdout,
          })
          reject(
            new Error(`Command failed with code ${code}: ${stderr || stdout}`),
          )
        } else {
          logger.info('Command executed successfully', {
            command: sanitizedCommand,
            args: sanitizedArgs,
            stdout,
          })
          resolve(stdout.trim())
        }
      })

      proc.on('error', (err: Error) => {
        logger.error('Failed to start command', {
          command: sanitizedCommand,
          args: sanitizedArgs,
          error: err.message,
        })
        reject(err)
      })
    })
  }

  private async executeCommand(command: string, args: string[]): Promise<void> {
    if (isBrowser) {
      throw new Error('executeCommand is not available in browser environments')
    }
    if (!spawn) {
      throw new Error('Spawn module not loaded. Ensure create() was called.')
    }
    this.ensureInitialized()
    const sanitizedCommand = this.sanitizeInput(command)
    const sanitizedArgs = args.map((arg) => this.sanitizeInput(arg))
    this.validateCommand(sanitizedCommand, sanitizedArgs)

    return new Promise((resolve, reject) => {
      logger.info('Executing command', {
        command: sanitizedCommand,
        args: sanitizedArgs,
      })
      const proc = spawn(sanitizedCommand, sanitizedArgs, {
        stdio: 'inherit',
        shell: false,
      })

      proc.on('close', (code: number | null) => {
        if (code !== 0) {
          logger.error('Command execution failed', {
            command: sanitizedCommand,
            args: sanitizedArgs,
            code,
          })
          reject(new Error(`Command failed with code ${code}`))
        } else {
          logger.info('Command executed successfully', {
            command: sanitizedCommand,
            args: sanitizedArgs,
          })
          resolve()
        }
      })

      proc.on('error', (err: Error) => {
        logger.error('Failed to start command', {
          command: sanitizedCommand,
          args: sanitizedArgs,
          error: err.message,
        })
        reject(err)
      })
    })
  }

  private async executeScriptWithArgs({
    scriptPath,
    args,
    env = {},
  }: {
    scriptPath: string
    args: string[]
    env?: Record<string, string>
  }): Promise<string> {
    if (isBrowser) {
      throw new Error('executeScriptWithArgs is not available in browser')
    }
    if (!path || !fs) {
      // Added !fs here as it's used
      throw new Error('Path or fs module not loaded for executeScriptWithArgs')
    }
    this.ensureInitialized()
    const pythonExe = this.getPythonExecutable()
    const fullScriptPath = this.sanitizePath(scriptPath)

    if (!fs.existsSync(fullScriptPath)) {
      logger.error('Script not found', { scriptPath: fullScriptPath })
      throw new Error(`Script not found: ${fullScriptPath}`)
    }

    const scriptArgs = [fullScriptPath, ...args]
    return this.executeCommandWithOutput(pythonExe, scriptArgs, env)
  }
}
