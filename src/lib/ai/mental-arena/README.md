# MentalArena - Mental Health AI Training Environment

MentalArena is a framework for generating, analyzing, and fine-tuning mental health conversations between patients and therapists.

## Features

- **Synthetic Conversation Generation**: Create realistic therapeutic dialogues with encoded mental health symptoms
- **Symptom Encoding/Decoding**: Simulate specific mental health conditions and evaluate detection
- **Model Fine-tuning**: Fine-tune language models on therapeutic conversation datasets
- **Python Bridge**: Interface between TypeScript/JavaScript and Python for advanced ML capabilities

## Setup

### Prerequisites

- Node.js 16+
- Python 3.8+
- (Optional) CUDA-capable GPU for faster training

### Installation

1. Install JavaScript dependencies:
   ```bash
   pnpm install
   ```

2. Set up Python environment:
   ```bash
   cd src/lib/ai/mental-arena
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```
   MENTAL_ARENA_PATH=/absolute/path/to/src/lib/ai/mental-arena
   PYTHON_PATH=/path/to/python  # Or use python3
   MENTAL_ARENA_USE_PYTHON_BRIDGE=true
   MENTAL_ARENA_VENV=venv  # Optional, name of virtualenv
   ```

## Fine-tuning Models

The framework provides a complete pipeline for fine-tuning language models on therapeutic conversations.

### Using the TypeScript API

```typescript
import { MentalArenaFactory } from './lib/ai/mental-arena/MentalArenaFactory';
import { TherapyProvider } from './lib/ai/providers/TherapyProvider';
import { FHEService } from './lib/fhe/FHEService';

async function fineTuneModel() {
  // Create dependencies
  const provider = new TherapyProvider();
  const fheService = new FHEService();

  // Initialize MentalArena adapter
  const adapter = await MentalArenaFactory.createWithPythonBridge(
    provider,
    fheService,
    {
      baseUrl: 'http://localhost:8000',
      apiKey: process.env.API_KEY || "example-api-key",
      pythonPath: 'python3',
      mentalArenaPath: '/path/to/mental-arena',
      venvName: 'venv',  // Optional
      outputDir: './outputs'  // Optional
    }
  );

  // Generate synthetic data
  const syntheticData = await adapter.generateSyntheticData({
    numSessions: 100,
    maxTurns: 10,
    disorders: ['anxiety', 'depression']
  });

  // Fine-tune a model
  await adapter.fineTuneModel(
    syntheticData,
    {
      baseModel: 'meta-llama/Llama-3-8B',
      newModelName: 'therapy-tuned-model',
      epochs: 3,
      outputPath: './models'  // Optional
    }
  );
}
```

### Using the Python Script Directly

You can also use the Python script directly for more control:

```bash
python llama_finetune.py \
  --base_model meta-llama/Llama-3-8B \
  --new_name therapy-tuned-model \
  --data_files /path/to/training_data.jsonl \
  --nepoch 3 \
  --batch_size 4 \
  --use_peft \
  --lora_r 16
```

### Training Data Format

The training data should be in JSONL format with each line containing a JSON object with the following structure:

```json
{"instruction": "Patient: I've been feeling anxious lately", "response": "Therapist: Thank you for sharing. When did you first notice these feelings?"}
```

## Testing

### JavaScript Tests

```bash
pnpm test
```

### Python Tests

```bash
cd src/lib/ai/mental-arena
python -m unittest discover -s __tests__
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request
