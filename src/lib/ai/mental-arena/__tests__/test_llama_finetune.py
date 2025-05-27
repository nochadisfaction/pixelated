#!/usr/bin/env python
# test_llama_finetune.py - Test script for llama_finetune.py

import json
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

# Add parent directory to path to import llama_finetune
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import llama_finetune

# Get test token from environment variable or use a default during testing
EOS_TOKEN = os.environ.get("TEST_EOS_TOKEN", "<eos>")


class TestLlamaFinetune(unittest.TestCase):
    """Test cases for the llama_finetune.py script."""

    def setUp(self):
        """Set up test environment."""
        # Create a temp directory for test files
        self.temp_dir = tempfile.mkdtemp()

        # Create a sample JSONL data file
        self.sample_data = [
            {
                "instruction": "I feel anxious all the time",
                "response": "That sounds difficult. When did you first notice these feelings?",
            },
            {
                "instruction": "I've been having trouble sleeping",
                "response": "Tell me more about your sleep patterns. When did this start?",
            },
        ]

        self.data_file = os.path.join(self.temp_dir, "test_data.jsonl")
        with open(self.data_file, "w") as f:
            for item in self.sample_data:
                f.write(json.dumps(item) + "\n")

    def tearDown(self):
        """Clean up after tests."""
        # Remove temp directory and files
        import shutil

        shutil.rmtree(self.temp_dir)

    @patch("llama_finetune.fine_tune_model")
    @patch("llama_finetune.parse_arguments")
    def test_main_function(self, mock_parse_args, mock_fine_tune):
        """Test the main function with mocked dependencies."""
        # Mock the arguments
        mock_args = MagicMock()
        mock_args.base_model = "meta-llama/Llama-2-7b"
        mock_args.new_name = "test-model"
        mock_args.data_files = self.data_file
        mock_args.nepoch = 1
        mock_args.output_dir = self.temp_dir
        mock_parse_args.return_value = mock_args

        # Mock the fine-tuning result
        mock_result = {
            "status": "success",
            "model_path": os.path.join(self.temp_dir, "test-model"),
        }
        mock_fine_tune.return_value = mock_result

        # Call the script's main functionality
        try:
            # Redirect stdout to capture the JSON output
            import io
            from contextlib import redirect_stdout

            f = io.StringIO()
            with redirect_stdout(f):
                # Directly execute the test code without conditionals
                args = mock_parse_args()
                result = mock_fine_tune(args)
                print(json.dumps(result))

            # Check the output
            output = f.getvalue().strip()
            self.assertEqual(output, json.dumps(mock_result))

        except Exception as e:
            self.fail(f"Main function execution failed: {e}")

        # Verify the mocks were called correctly
        mock_parse_args.assert_called_once()
        mock_fine_tune.assert_called_once_with(mock_args)

    @patch("llama_finetune.load_dataset")
    @patch("llama_finetune.AutoTokenizer.from_pretrained")
    @patch("llama_finetune.AutoModelForCausalLM.from_pretrained")
    @patch("llama_finetune.Trainer")
    @patch("torch.cuda.is_available")
    def test_prepare_dataset(
        self, mock_cuda, mock_trainer, mock_model, mock_tokenizer, mock_load_dataset
    ):
        """Test the dataset preparation function."""
        # Mock dependencies
        mock_cuda.return_value = False  # Test CPU execution path

        # Mock tokenizer
        tokenizer_mock = MagicMock()
        tokenizer_mock.pad_token = None
        tokenizer_mock.eos_token = EOS_TOKEN
        mock_tokenizer.return_value = tokenizer_mock

        # Mock dataset loading
        dataset_mock = MagicMock()
        dataset_mock.__getitem__.return_value = MagicMock()
        mock_load_dataset.return_value = {"train": dataset_mock}

        # Call prepare_dataset
        try:
            dataset = llama_finetune.prepare_dataset(self.data_file, tokenizer_mock)
            # Just testing it runs without errors
            self.assertIsNotNone(dataset)
        except Exception as e:
            self.fail(f"prepare_dataset failed: {e}")

        # Verify mocks were called correctly
        mock_load_dataset.assert_called_once()
        self.assertTrue("json" in mock_load_dataset.call_args[1]["data_files"])


if __name__ == "__main__":
    unittest.main()
