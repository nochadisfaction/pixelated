import { execFileSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { getLogger } from '../../logging'

// Initialize logger
const logger = getLogger()

/**
 * Configuration for the Python Bridge
 */
export interface PythonBridgeConfig {
  pythonPath: string
  mentalArenaPath: string
  venvName?: string
  outputDir?: string
  logLevel?: 'debug' | 'info' | 'warning' | 'error'
}

/**
 * Conversation Generator Configuration
 */
export interface ConversationGeneratorConfig {
  numSessions: number
  maxTurns: number
  disorders?: string[]
  privacySettings?: {
    enableDP: boolean
    epsilon: number
    delta?: number | 'auto'
    entityColumn?: string
  }
  evaluateQuality?: boolean
  compareToRealData?: boolean
}

/**
 * Bridge to execute MentalArena Python code
 * Handles communication between TypeScript and Python code
 */
export class MentalArenaPythonBridge {
  private pythonPath: string
  private mentalArenaPath: string
  private venvName: string | undefined
  private outputDir: string
  private logLevel: string
  private initialized: boolean = false

  constructor(config: PythonBridgeConfig) {
    this.pythonPath = config.pythonPath
    this.mentalArenaPath = config.mentalArenaPath
    this.venvName = config.venvName
    this.outputDir =
      config.outputDir || path.join(process.cwd(), 'data', 'mental-arena')
    this.logLevel = config.logLevel || 'info'
  }

  /**
   * Initialize the Python environment
   */
  async initialize(): Promise<boolean> {
    logger.info('Initializing MentalArena Python Bridge', {
      pythonPath: this.pythonPath,
      mentalArenaPath: this.mentalArenaPath,
    })

    try {
      // Check if Python executable is available
      // Instead of existsSync, which only works for file paths, we'll test if the executable can run
      try {
        const pythonVersionOutput = this.runCommand(this.pythonPath, [
          '--version',
        ])
        logger.info('Python executable is available', {
          version: pythonVersionOutput,
        })
      } catch (error) {
        logger.error('Python executable not found or not executable', {
          path: this.pythonPath,
          error,
        })
        return false
      }

      // Check if MentalArena directory exists
      if (!existsSync(this.mentalArenaPath)) {
        logger.error('MentalArena directory not found', {
          path: this.mentalArenaPath,
        })
        return false
      }

      // Verify that MentalArena Python files exist
      const requiredFiles = [
        'arena_med.py',
        'data_process.py',
        'llama_finetune.py',
      ]
      for (const file of requiredFiles) {
        const filePath = path.join(this.mentalArenaPath, file)
        if (!existsSync(filePath)) {
          logger.error(`Required MentalArena file not found: ${file}`, {
            path: filePath,
          })
          return false
        }
      }

      // Activate virtual environment if specified
      if (this.venvName) {
        const venvPath = path.join(this.mentalArenaPath, this.venvName)
        if (!existsSync(venvPath)) {
          logger.info('Creating virtual environment', { venvPath })
          this.runCommand(this.pythonPath, ['-m', 'venv', this.venvName])
        }

        // Install requirements
        const requirementsPath = path.join(
          this.mentalArenaPath,
          'requirements.txt',
        )
        if (existsSync(requirementsPath)) {
          logger.info('Installing requirements')

          // Use the appropriate pip path depending on OS
          const pipCmd =
            process.platform === 'win32'
              ? path.join(venvPath, 'Scripts', 'pip')
              : path.join(venvPath, 'bin', 'pip')

          this.runCommand(pipCmd, ['install', '-r', requirementsPath])
        } else {
          // If no requirements.txt, install minimal requirements
          const minimalRequirements = [
            'fire',
            'numpy',
            'jsonlines',
            'torch',
            'transformers',
            'scikit-learn',
            'openai',
          ]

          const pipCmd =
            process.platform === 'win32'
              ? path.join(venvPath, 'Scripts', 'pip')
              : path.join(venvPath, 'bin', 'pip')

          this.runCommand(pipCmd, ['install', ...minimalRequirements])
        }
      }

      // Test Python environment by running a simple command
      const pythonVersionOutput = this.runCommand(this.getPythonExecutable(), [
        '--version',
      ])
      logger.info('Python environment validated', {
        version: pythonVersionOutput,
      })

      this.initialized = true
      return true
    } catch (error) {
      logger.error('Failed to initialize Python bridge', { error })
      return false
    }
  }

  /**
   * Generate data using MentalArena's arena_med.py
   */
  async generateData(params: {
    baseModel: string
    outputFile: string
    numSessions?: number
    maxTurns?: number
  }): Promise<string> {
    this.ensureInitialized()

    logger.info('Generating data with MentalArena', { params })

    // Ensure output directory exists
    this.ensureOutputDirectoryExists()

    // Create full path for output file
    const outputFilePath = path.join(this.outputDir, params.outputFile)

    // Build command for arena_med.py
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalArenaPath, 'arena_med.py')

    // Build args array
    const args = [
      scriptPath,
      `--base_model=${params.baseModel}`,
      `--output_file=${outputFilePath}`,
    ]

    // Add optional parameters
    if (params.numSessions) {
      args.push(`--num_sessions=${params.numSessions}`)
    }

    if (params.maxTurns) {
      args.push(`--max_turns=${params.maxTurns}`)
    }

    // Execute command
    return this.runCommandAsync(pythonExe, args)
  }

  /**
   * Process data for fine-tuning using MentalArena's data_process.py
   */
  async processData(params: {
    apiKey?: string
    inputFile: string
    finetuneFile: string
    baseModel: string
    nEpochs?: number
  }): Promise<string> {
    this.ensureInitialized()

    logger.info('Processing data for fine-tuning', { params })

    // Ensure input file exists
    const inputFilePath = path.join(this.outputDir, params.inputFile)
    if (!existsSync(inputFilePath)) {
      throw new Error(`Input file not found: ${inputFilePath}`)
    }

    // Create full path for output file
    const finetuneFilePath = path.join(this.outputDir, params.finetuneFile)

    // Get Python executable
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalArenaPath, 'data_process.py')

    // Build args array
    const args = [
      scriptPath,
      `--input_file=${inputFilePath}`,
      `--finetune_file=${finetuneFilePath}`,
      `--base_model=${params.baseModel}`,
    ]

    // Add optional parameters
    if (params.apiKey) {
      args.push(`--api_key=${params.apiKey}`)
    }

    if (params.nEpochs) {
      args.push(`--n_epochs=${params.nEpochs}`)
    }

    // Execute command
    return this.runCommandAsync(pythonExe, args)
  }

  /**
   * Fine-tune model using MentalArena's llama_finetune.py
   */
  async fineTuneModel(params: {
    baseModel: string
    newName: string
    nepoch?: number
    dataFiles: string | string[]
  }): Promise<string> {
    this.ensureInitialized()

    logger.info('Fine-tuning model with MentalArena', { params })

    // Convert dataFiles to paths if needed
    const dataFilePaths = Array.isArray(params.dataFiles)
      ? params.dataFiles.map((file) => path.join(this.outputDir, file))
      : path.join(this.outputDir, params.dataFiles)

    // Get Python executable
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalArenaPath, 'llama_finetune.py')

    // Build args array
    const args = [
      scriptPath,
      `--base_model=${params.baseModel}`,
      `--new_name=${params.newName}`,
    ]

    // Add optional parameters
    if (params.nepoch) {
      args.push(`--nepoch=${params.nepoch}`)
    }

    // Add data files
    if (Array.isArray(dataFilePaths)) {
      args.push(`--data_files=${dataFilePaths.join(',')}`)
    } else {
      args.push(`--data_files=${dataFilePaths}`)
    }

    // Execute command
    return this.runCommandAsync(pythonExe, args)
  }

  /**
   * Evaluate model using MentalArena's MedQA_eval.py
   */
  async evaluateModel(params: {
    model: string
    dataset: 'MedQA' | 'MedMCQA' | 'PubMedQA' | 'MMLU'
    name?: string
  }): Promise<string> {
    this.ensureInitialized()

    logger.info('Evaluating model with MentalArena', { params })

    // Get Python executable
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalArenaPath, 'MedQA_eval.py')

    // Build args array
    const args = [
      scriptPath,
      `--model=${params.model}`,
      `--dataset=${params.dataset}`,
    ]

    // Add optional parameters
    if (params.name) {
      args.push(`--name=${params.name}`)
    }

    // Execute command
    return this.runCommandAsync(pythonExe, args)
  }

  /**
   * Generate synthetic conversations using Gretel models
   */
  async generateSyntheticConversations(
    config: ConversationGeneratorConfig,
  ): Promise<string> {
    this.ensureInitialized()

    logger.info('Generating synthetic conversations', { config })

    // Ensure output directory exists
    this.ensureOutputDirectoryExists()

    // Create config file for Python script
    const configFileName = `synthetic_config_${Date.now()}.json`
    const configFilePath = await this.createJsonInputFile(
      config,
      configFileName,
    )

    // Create output file name
    const outputFileName = `synthetic_conversations_${Date.now()}.jsonl`
    const outputFilePath = path.join(this.outputDir, outputFileName)

    // Get Python executable
    const pythonExe = this.getPythonExecutable()
    const scriptPath = path.join(this.mentalArenaPath, 'synthetic_generator.py')

    // Build args array
    const args = [
      scriptPath,
      `--config=${configFilePath}`,
      `--output=${outputFilePath}`,
    ]

    // Execute command
    await this.runCommandAsync(pythonExe, args)
    return outputFileName
  }

  /**
   * Create a JSON input file for Python script
   */
  async createJsonInputFile(data: any, fileName: string): Promise<string> {
    this.ensureOutputDirectoryExists()

    const filePath = path.join(this.outputDir, fileName)

    try {
      // Write data to JSON file
      writeFileSync(filePath, JSON.stringify(data, null, 2))
      logger.info(`Created JSON input file: ${filePath}`)
      return filePath
    } catch (error) {
      logger.error('Failed to create JSON input file', { error })
      throw error
    }
  }

  /**
   * Read JSON output file from Python script
   */
  async readJsonOutputFile<T>(fileName: string): Promise<T> {
    const filePath = path.join(this.outputDir, fileName)

    try {
      // Read and parse JSON file
      const fileContent = readFileSync(filePath, 'utf-8')
      return JSON.parse(fileContent) as T
    } catch (error) {
      logger.error('Failed to read JSON output file', { error, filePath })
      throw error
    }
  }

  /**
   * Run a command synchronously
   */
  private runCommand(cmd: string, args: string[] = []): string {
    try {
      logger.debug(`Running command: ${cmd} ${args.join(' ')}`)
      logger.debug(`Executing: ${cmd} with args: ${JSON.stringify(args)}`)
      const output = execFileSync(cmd, args, {
        cwd: this.mentalArenaPath,
        encoding: 'utf-8',
      })
      return output.trim()
    } catch (error) {
      logger.error('Command execution failed', {
        command: `${cmd} ${args.join(' ')}`,
        error,
      })
      throw error
    }
  }

  /**
   * Run a command asynchronously
   */
  private runCommandAsync(cmd: string, args: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.debug(
        `Running async command: ${cmd}, args: ${JSON.stringify(args)}`,
      )

      // Spawn process without shell
      const child = spawn(cmd, args, {
        cwd: this.mentalArenaPath,
        shell: false,
      })

      let stdout = ''
      let stderr = ''

      // Collect stdout
      child.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        logger.debug(`Command output: ${output.trim()}`)
      })

      // Collect stderr
      child.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output
        logger.debug(`Command error output: ${output.trim()}`)
      })

      // Handle process completion
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`))
        }
      })

      // Handle process errors
      child.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Get the Python executable path based on whether venv is used
   */
  private getPythonExecutable(): string {
    if (!this.venvName) {
      return this.pythonPath
    }

    // Use the appropriate Python path from venv depending on OS
    const venvPath = path.join(this.mentalArenaPath, this.venvName)
    return process.platform === 'win32'
      ? path.join(venvPath, 'Scripts', 'python')
      : path.join(venvPath, 'bin', 'python')
  }

  /**
   * Ensure the output directory exists
   */
  private ensureOutputDirectoryExists(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true })
      logger.debug(`Created output directory: ${this.outputDir}`)
    } else {
      logger.debug(`Output directory exists: ${this.outputDir}`)
    }
  }

  /**
   * Ensure the bridge is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Python bridge not initialized. Call initialize() first.')
    }
  }
}
