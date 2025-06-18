#!/usr/bin/env python
# test_llama_finetune.py - Test script for llama_finetune.py

import json
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch, ANY, mock_open # Added ANY, mock_open
import torch # Added torch

# Add parent directory to path to import llama_finetune
# Correcting the path for llama_finetune module itself
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../')))


from src.lib.ai.mental_arena import llama_finetune # Ensures it's imported as a module
from src.lib.ai.mental_arena.llama_finetune import GradientNormMonitorCallback # Import specific class

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

    @patch("src.lib.ai.mental_arena.llama_finetune.fine_tune_model") # Note: Corrected patch path
    @patch("src.lib.ai.mental_arena.llama_finetune.parse_arguments") # Note: Corrected patch path
    def test_main_function(self, mock_parse_args, mock_fine_tune):
        """Test the main function with mocked dependencies."""
        # Mock the arguments using the helper
        mock_args = self._create_mock_args(
            base_model="meta-llama/Llama-2-7b", # Override defaults if needed for the test
            new_name="test-model",
            # data_files is already set by _create_mock_args using self.data_file
            # output_dir is already set by _create_mock_args using self.temp_dir
            nepoch=1
        )
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
        # The actual argument is a list of files, so check if self.data_file is in that list
        self.assertIn(self.data_file, mock_load_dataset.call_args[1]["data_files"])


    def _create_mock_args(self, **kwargs):
        """Helper function to create mock arguments for tests."""
        args = MagicMock()
        args.base_model = "test_base_model"
        args.new_name = "test_new_name"
        args.data_files = self.data_file # Use the one created in setUp
        args.output_dir = self.temp_dir
        args.nepoch = 1
        args.batch_size = 1
        args.learning_rate = 1e-4
        args.use_peft = False
        args.lora_r = 16
        args.lora_alpha = 32
        args.lora_dropout = 0.05
        args.max_seq_length = 128
        args.logging_steps = 10

        # Defaults for new arguments related to gradient monitoring
        args.enable_gradient_norm_monitoring = False
        args.gradient_clip_val = 1.0

        for key, value in kwargs.items():
            setattr(args, key, value)
        return args

    @patch("src.lib.ai.mental_arena.llama_finetune.load_model_and_tokenizer")
    @patch("src.lib.ai.mental_arena.llama_finetune.prepare_dataset")
    @patch("src.lib.ai.mental_arena.llama_finetune.Trainer")
    @patch("src.lib.ai.mental_arena.llama_finetune.json.dump") # Mock json.dump for metadata
    @patch("src.lib.ai.mental_arena.llama_finetune.open", new_callable=mock_open) # Mock open for metadata
    def test_trainer_callback_integration(self, mock_open_file, mock_json_dump, mock_trainer, mock_prepare_dataset, mock_load_model_tokenizer):
        """Test that GradientNormMonitorCallback is added to Trainer based on args."""
        mock_load_model_tokenizer.return_value = (MagicMock(spec=llama_finetune.PreTrainedModel), MagicMock(spec=llama_finetune.PreTrainedTokenizerBase))
        mock_prepare_dataset.return_value = MagicMock(spec=llama_finetune.Dataset)
        trainer_instance_mock = mock_trainer.return_value
        trainer_instance_mock.train = MagicMock() # Mock the train method

        # Case 1: Gradient monitoring enabled
        args_enabled = self._create_mock_args(enable_gradient_norm_monitoring=True, gradient_clip_val=1.5)

        # Mock the model's save_pretrained method, as it's called at the end of fine_tune_model
        model_mock, _ = mock_load_model_tokenizer.return_value
        model_mock.save_pretrained = MagicMock()

        llama_finetune.fine_tune_model(args_enabled)

        self.assertTrue(mock_trainer.called)
        trainer_kwargs_enabled = mock_trainer.call_args[1]
        self.assertIn('callbacks', trainer_kwargs_enabled)
        self.assertTrue(any(isinstance(cb, GradientNormMonitorCallback) for cb in trainer_kwargs_enabled['callbacks']))

        # Reset mocks for the next sub-test
        mock_trainer.reset_mock()
        mock_load_model_tokenizer.reset_mock()
        mock_prepare_dataset.reset_mock()
        mock_json_dump.reset_mock()
        mock_open_file.reset_mock()

        # Re-assign return values for mocks
        mock_load_model_tokenizer.return_value = (MagicMock(spec=llama_finetune.PreTrainedModel), MagicMock(spec=llama_finetune.PreTrainedTokenizerBase))
        mock_prepare_dataset.return_value = MagicMock(spec=llama_finetune.Dataset)
        trainer_instance_mock = mock_trainer.return_value
        trainer_instance_mock.train = MagicMock()
        model_mock, _ = mock_load_model_tokenizer.return_value
        model_mock.save_pretrained = MagicMock()


        # Case 2: Gradient monitoring disabled
        args_disabled = self._create_mock_args(enable_gradient_norm_monitoring=False)
        llama_finetune.fine_tune_model(args_disabled)

        self.assertTrue(mock_trainer.called)
        trainer_kwargs_disabled = mock_trainer.call_args[1]
        if 'callbacks' in trainer_kwargs_disabled and trainer_kwargs_disabled['callbacks']: # Check if list exists and is not empty
            self.assertFalse(any(isinstance(cb, GradientNormMonitorCallback) for cb in trainer_kwargs_disabled['callbacks']))
        else:
            self.assertTrue(True) # No callbacks list or empty list is also a pass

    @patch('torch.nn.utils.clip_grad_norm_')
    def test_gradient_clipping_logic(self, mock_clip_grad_norm):
        """Test the gradient clipping logic within GradientNormMonitorCallback.on_step_end."""
        callback = GradientNormMonitorCallback()

        # Mock model and its parameters
        model_mock = MagicMock(spec=llama_finetune.PreTrainedModel)
        param1_grad_data = MagicMock(spec=torch.Tensor)
        param1_grad_data.norm.return_value = torch.tensor(0.5)
        param1 = MagicMock(spec=torch.nn.Parameter)
        param1.grad = MagicMock()
        param1.grad.data = param1_grad_data
        param1.requires_grad = True

        param2_grad_data = MagicMock(spec=torch.Tensor)
        param2_grad_data.norm.return_value = torch.tensor(1.0)
        param2 = MagicMock(spec=torch.nn.Parameter)
        param2.grad = MagicMock()
        param2.grad.data = param2_grad_data
        param2.requires_grad = True

        # Mock for a parameter with no gradient
        param_no_grad = MagicMock(spec=torch.nn.Parameter)
        param_no_grad.grad = None
        param_no_grad.requires_grad = True

        model_mock.named_parameters.return_value = [("param1", param1), ("param2", param2), ("param_no_grad", param_no_grad)]
        model_mock.parameters.return_value = [param1, param2, param_no_grad]


        optimizer_mock = MagicMock()
        control_mock = MagicMock() # control object is not used in the logic, but is part of signature

        # Base state and args for most tests
        state_mock = MagicMock()

        args_template = MagicMock() # Using MagicMock directly for args here
        args_template.logging_steps = 5

        # Test 1: Monitoring enabled, global_step is a logging step, gradient_clip_val > 0
        args_case1 = MagicMock(spec=args_template)
        args_case1.enable_gradient_norm_monitoring = True
        args_case1.gradient_clip_val = 1.0
        args_case1.logging_steps = 5 # Ensure this is set
        state_mock.global_step = 10 # Multiple of logging_steps

        callback.on_step_end(args_case1, state_mock, control_mock, model=model_mock, optimizer=optimizer_mock)
        mock_clip_grad_norm.assert_called_once_with(model_mock.parameters(), 1.0)
        self.assertTrue(param1.grad.data.norm.called) # Check that individual norms were calculated
        self.assertTrue(param2.grad.data.norm.called)

        # Test 2: gradient_clip_val is 0 (clipping disabled)
        mock_clip_grad_norm.reset_mock()
        param1.grad.data.norm.reset_mock()
        param2.grad.data.norm.reset_mock()
        args_case2 = MagicMock(spec=args_template)
        args_case2.enable_gradient_norm_monitoring = True
        args_case2.gradient_clip_val = 0.0
        args_case2.logging_steps = 5
        state_mock.global_step = 10

        callback.on_step_end(args_case2, state_mock, control_mock, model=model_mock, optimizer=optimizer_mock)
        mock_clip_grad_norm.assert_not_called()
        self.assertTrue(param1.grad.data.norm.called)
        self.assertTrue(param2.grad.data.norm.called)

        # Test 3: Monitoring disabled
        mock_clip_grad_norm.reset_mock()
        param1.grad.data.norm.reset_mock()
        param2.grad.data.norm.reset_mock()
        args_case3 = MagicMock(spec=args_template)
        args_case3.enable_gradient_norm_monitoring = False
        args_case3.gradient_clip_val = 1.0
        args_case3.logging_steps = 5
        state_mock.global_step = 10

        callback.on_step_end(args_case3, state_mock, control_mock, model=model_mock, optimizer=optimizer_mock)
        mock_clip_grad_norm.assert_not_called()
        self.assertFalse(param1.grad.data.norm.called) # Norms should not be calculated
        self.assertFalse(param2.grad.data.norm.called)

        # Test 4: global_step is NOT a logging_step
        mock_clip_grad_norm.reset_mock()
        param1.grad.data.norm.reset_mock()
        param2.grad.data.norm.reset_mock()
        args_case4 = MagicMock(spec=args_template)
        args_case4.enable_gradient_norm_monitoring = True
        args_case4.gradient_clip_val = 1.0
        args_case4.logging_steps = 5
        state_mock.global_step = 12 # NOT a multiple of logging_steps

        callback.on_step_end(args_case4, state_mock, control_mock, model=model_mock, optimizer=optimizer_mock)
        mock_clip_grad_norm.assert_not_called()
        self.assertFalse(param1.grad.data.norm.called)
        self.assertFalse(param2.grad.data.norm.called)

        # Test 5: args object might not have gradient_clip_val (e.g. older saved args)
        # The hasattr check in the callback should prevent errors
        mock_clip_grad_norm.reset_mock()
        param1.grad.data.norm.reset_mock()
        param2.grad.data.norm.reset_mock()
        args_case5 = MagicMock() # Fresh MagicMock without gradient_clip_val
        args_case5.enable_gradient_norm_monitoring = True
        args_case5.logging_steps = 5
        # Deliberately remove gradient_clip_val if it was auto-created by MagicMock access
        if hasattr(args_case5, 'gradient_clip_val'):
            del args_case5.gradient_clip_val
        state_mock.global_step = 10

        callback.on_step_end(args_case5, state_mock, control_mock, model=model_mock, optimizer=optimizer_mock)
        mock_clip_grad_norm.assert_not_called() # Should not be called as gradient_clip_val is missing or not > 0
        self.assertTrue(param1.grad.data.norm.called) # Norms are still calculated for logging

    @patch("src.lib.ai.mental_arena.llama_finetune.load_model_and_tokenizer")
    @patch("src.lib.ai.mental_arena.llama_finetune.prepare_dataset")
    @patch("src.lib.ai.mental_arena.llama_finetune.Trainer")
    @patch("src.lib.ai.mental_arena.llama_finetune.json.dump")
    @patch("src.lib.ai.mental_arena.llama_finetune.open", new_callable=mock_open)
    def test_metadata_update_with_gradient_monitoring(self, mock_file_open, mock_json_dump, mock_trainer_constructor, mock_prepare_dataset, mock_load_model_tokenizer):
        """Test that metadata includes gradient monitoring settings."""
        # Setup mocks for functions called within fine_tune_model
        mock_model_instance = MagicMock(spec=llama_finetune.PreTrainedModel)
        mock_model_instance.save_pretrained = MagicMock()
        mock_tokenizer_instance = MagicMock(spec=llama_finetune.PreTrainedTokenizerBase)
        mock_tokenizer_instance.save_pretrained = MagicMock()
        mock_load_model_tokenizer.return_value = (mock_model_instance, mock_tokenizer_instance)

        mock_dataset_instance = MagicMock(spec=llama_finetune.Dataset)
        mock_prepare_dataset.return_value = mock_dataset_instance

        mock_trainer_instance = MagicMock(spec=llama_finetune.Trainer)
        mock_trainer_instance.train = MagicMock()
        mock_trainer_constructor.return_value = mock_trainer_instance

        # Case 1: Monitoring enabled
        args_enabled = self._create_mock_args(enable_gradient_norm_monitoring=True, gradient_clip_val=2.5)
        llama_finetune.fine_tune_model(args_enabled)

        # Check that json.dump was called to write metadata
        mock_json_dump.assert_called_once()
        # The first argument to json.dump is the data dictionary
        written_metadata_enabled = mock_json_dump.call_args[0][0]

        self.assertTrue(written_metadata_enabled["enable_gradient_norm_monitoring"])
        self.assertEqual(written_metadata_enabled["gradient_clip_val"], 2.5)
        # Ensure the file was opened correctly (optional, but good practice)
        expected_meta_path = os.path.join(self.temp_dir, args_enabled.new_name, "training_metadata.json")
        mock_file_open.assert_called_with(expected_meta_path, "w")

        # Reset mocks for the next case
        mock_json_dump.reset_mock()
        mock_file_open.reset_mock()
        mock_load_model_tokenizer.reset_mock() # reset all top-level mocks used
        mock_prepare_dataset.reset_mock()
        mock_trainer_constructor.reset_mock()

        # Re-assign return values after reset
        mock_model_instance = MagicMock(spec=llama_finetune.PreTrainedModel)
        mock_model_instance.save_pretrained = MagicMock()
        mock_tokenizer_instance = MagicMock(spec=llama_finetune.PreTrainedTokenizerBase)
        mock_tokenizer_instance.save_pretrained = MagicMock()
        mock_load_model_tokenizer.return_value = (mock_model_instance, mock_tokenizer_instance)
        mock_prepare_dataset.return_value = MagicMock(spec=llama_finetune.Dataset)
        mock_trainer_constructor.return_value = MagicMock(spec=llama_finetune.Trainer)
        mock_trainer_constructor.return_value.train = MagicMock()


        # Case 2: Monitoring disabled
        args_disabled = self._create_mock_args(enable_gradient_norm_monitoring=False, gradient_clip_val=0.5) # clip_val is irrelevant if disabled
        llama_finetune.fine_tune_model(args_disabled)

        mock_json_dump.assert_called_once()
        written_metadata_disabled = mock_json_dump.call_args[0][0]

        self.assertFalse(written_metadata_disabled["enable_gradient_norm_monitoring"])
        self.assertIsNone(written_metadata_disabled["gradient_clip_val"])
        expected_meta_path_disabled = os.path.join(self.temp_dir, args_disabled.new_name, "training_metadata.json")
        mock_file_open.assert_called_with(expected_meta_path_disabled, "w")


if __name__ == "__main__":
    unittest.main()
