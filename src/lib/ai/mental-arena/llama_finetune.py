#!/usr/bin/env python
# llama_finetune.py - Fine-tuning script for MentalArena mental health models

import argparse
import json
import logging
import os
import subprocess  # nosec B404 - Used with proper input validation and check=True for error handling
import sys
import time
from typing import Any, Dict, Optional, Tuple, Union, cast

import torch
from datasets import Dataset, DatasetDict, load_dataset
from transformers.data.data_collator import DataCollatorForLanguageModeling
from transformers.modeling_utils import PreTrainedModel
from transformers.models.auto.modeling_auto import AutoModelForCausalLM
from transformers.models.auto.tokenization_auto import AutoTokenizer
from transformers.tokenization_utils_base import BatchEncoding, PreTrainedTokenizerBase
from transformers.trainer import Trainer
from transformers.training_args import TrainingArguments

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def parse_arguments():
    """Parse command line arguments for fine-tuning."""
    parser = argparse.ArgumentParser(
        description="Fine-tune LLM for mental health conversations"
    )

    parser.add_argument(
        "--base_model",
        type=str,
        required=True,
        help="Base model to fine-tune (HuggingFace model ID or local path)",
    )
    parser.add_argument(
        "--new_name", type=str, required=True, help="Name for the fine-tuned model"
    )
    parser.add_argument(
        "--data_files",
        type=str,
        required=True,
        help="JSONL data files for fine-tuning (comma-separated for multiple files)",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="./models",
        help="Directory to save the fine-tuned model",
    )
    parser.add_argument(
        "--nepoch", type=int, default=3, help="Number of training epochs"
    )
    parser.add_argument("--batch_size", type=int, default=4, help="Training batch size")
    parser.add_argument(
        "--learning_rate", type=float, default=2e-5, help="Learning rate for training"
    )
    parser.add_argument(
        "--use_peft",
        action="store_true",
        help="Use Parameter-Efficient Fine-Tuning (PEFT) with LoRA",
    )
    parser.add_argument(
        "--lora_r", type=int, default=16, help="LoRA attention dimension"
    )
    parser.add_argument(
        "--lora_alpha", type=int, default=32, help="LoRA alpha parameter"
    )
    parser.add_argument(
        "--lora_dropout", type=float, default=0.05, help="LoRA dropout probability"
    )
    parser.add_argument(
        "--max_seq_length", type=int, default=512, help="Maximum sequence length"
    )

    return parser.parse_args()


def prepare_dataset(
    data_files: str, tokenizer: PreTrainedTokenizerBase, max_length: int = 512
) -> Dataset:
    """
    Prepare the dataset for fine-tuning from JSONL files.
    Each entry should have 'instruction' and 'response' fields.
    """
    logger.info(f"Loading data from: {data_files}")

    # Split comma-separated file paths
    files = [f.strip() for f in data_files.split(",")]

    # Verify files exist
    for file_path in files:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Data file not found: {file_path}")

    # Load the dataset
    try:
        # Load dataset and properly handle the train split
        dataset_dict: DatasetDict = cast(
            DatasetDict, load_dataset("json", data_files=files)
        )

        # Check if 'train' split exists in the dataset
        if "train" not in dataset_dict:
            raise ValueError("Dataset does not contain a 'train' split")

        # Get the train dataset
        train_dataset: Dataset = dataset_dict["train"]
        logger.info(f"Dataset loaded with {len(train_dataset)} examples")
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        raise

    def format_prompt(example: Dict[str, Any]) -> Dict[str, str]:
        """Format the prompt for instruction fine-tuning."""
        instruction = example["instruction"]
        response = example["response"]

        # Format: "Patient: [instruction] Therapist: [response]"
        prompt = f"Patient: {instruction}\nTherapist: {response}"
        return {"text": prompt}

    def tokenize_function(examples: Dict[str, Any]) -> BatchEncoding:
        """Tokenize the examples and prepare for training."""
        return tokenizer(
            examples["text"],
            truncation=True,
            padding="max_length",
            max_length=max_length,
        )

    # Format and tokenize the dataset
    formatted_dataset: Dataset = train_dataset.map(format_prompt)
    tokenized_dataset: Dataset = formatted_dataset.map(
        tokenize_function, batched=True, remove_columns=["text"]
    )

    logger.info(f"Dataset prepared with {len(tokenized_dataset)} examples")
    return tokenized_dataset


def load_model_and_tokenizer(
    model_name_or_path: str,
    use_peft: bool = False,
    lora_config: Optional[Dict[str, Any]] = None,
) -> Tuple[Union[PreTrainedModel, Any], PreTrainedTokenizerBase]:
    """Load the base model and tokenizer for fine-tuning."""
    logger.info(f"Loading model: {model_name_or_path}")

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)

    # Ensure the tokenizer has padding token
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model with appropriate configuration
    device_map = "auto"
    if torch.cuda.is_available():
        logger.info(f"Using GPU for training: {torch.cuda.get_device_name(0)}")
    else:
        logger.warning("No GPU detected, using CPU (training will be slow)")
        device_map = None

    # Load the base model
    model = AutoModelForCausalLM.from_pretrained(
        model_name_or_path,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map=device_map,
    )

    # Apply PEFT if requested
    if use_peft and lora_config is not None:
        try:
            from peft import LoraConfig, TaskType, get_peft_model

            logger.info(f"Applying LoRA with config: {lora_config}")
            peft_config = LoraConfig(
                task_type=TaskType.CAUSAL_LM,
                r=lora_config["lora_r"],
                lora_alpha=lora_config["lora_alpha"],
                lora_dropout=lora_config["lora_dropout"],
                bias="none",
                target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            )
            # Apply PEFT to the model
            peft_model = get_peft_model(model, peft_config)
            peft_model.print_trainable_parameters()
            model = peft_model
        except ImportError:
            logger.warning("PEFT library not found. Installing PEFT...")
            try:
                # Using hardcoded package name, not user input
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", "peft"], check=True
                )  # nosec B603 - Fixed command with no user input
                # Try again after installation
                from peft import LoraConfig, TaskType, get_peft_model

                peft_config = LoraConfig(
                    task_type=TaskType.CAUSAL_LM,
                    r=lora_config["lora_r"],
                    lora_alpha=lora_config["lora_alpha"],
                    lora_dropout=lora_config["lora_dropout"],
                    bias="none",
                    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
                )
                # Apply PEFT to the model
                peft_model = get_peft_model(model, peft_config)
                peft_model.print_trainable_parameters()
                model = peft_model
            except subprocess.SubprocessError as e:
                logger.error(f"Failed to install PEFT: {e}")
                raise

    return model, tokenizer


def fine_tune_model(args):
    """Main function to run the fine-tuning process."""
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)

    # Set up PEFT config if enabled
    lora_config = None
    if args.use_peft:
        lora_config = {
            "lora_r": args.lora_r,
            "lora_alpha": args.lora_alpha,
            "lora_dropout": args.lora_dropout,
        }

    # Load model and tokenizer
    model, tokenizer = load_model_and_tokenizer(
        args.base_model, use_peft=args.use_peft, lora_config=lora_config
    )

    # Prepare the dataset
    # gitleaks:allow
    data_path = args.data_files  # Not a secret or API key, just a file path
    train_dataset = prepare_dataset(
        data_path, tokenizer, max_length=args.max_seq_length
    )

    # Set up training arguments
    model_output_dir = os.path.join(args.output_dir, args.new_name)

    # Create TrainingArguments with appropriate parameters
    training_args = TrainingArguments(
        output_dir=model_output_dir,
        per_device_train_batch_size=args.batch_size,
        num_train_epochs=args.nepoch,
        learning_rate=args.learning_rate,
        weight_decay=0.01,
        logging_dir=os.path.join(model_output_dir, "logs"),
        logging_steps=10,
        save_strategy="epoch",
        save_total_limit=2,
        fp16=torch.cuda.is_available(),
        report_to="none",
    )

    # Create data collator
    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        data_collator=data_collator,
    )

    # Start training
    logger.info("Starting fine-tuning process")
    start_time = time.time()

    trainer.train()

    # Log training time
    training_time = time.time() - start_time
    logger.info(f"Training completed in {training_time:.2f} seconds")

    # Save the fine-tuned model
    model.save_pretrained(model_output_dir)
    tokenizer.save_pretrained(model_output_dir)

    # Save training metadata
    metadata = {
        "base_model": args.base_model,
        "fine_tuned_model": args.new_name,
        "training_time": training_time,
        "epochs": args.nepoch,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "max_seq_length": args.max_seq_length,
        "dataset": "training_data",  # Avoid storing file paths that could contain sensitive info
        "use_peft": args.use_peft,
    }

    with open(os.path.join(model_output_dir, "training_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Model and metadata saved to {model_output_dir}")

    return {
        "model_path": model_output_dir,
        "training_time": training_time,
        "status": "success",
    }


if __name__ == "__main__":
    args = parse_arguments()
    result = fine_tune_model(args)

    # Print result as JSON for the caller to parse
    print(json.dumps(result))
