import argparse
import json
import os
import pathlib
import re
import sys

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


# Security helper functions
def sanitize_path(raw_path):
    """Sanitize and validate a path to prevent path traversal attacks"""
    try:
        # Normalize path and resolve any symlinks
        path_obj = pathlib.Path(raw_path).resolve()
        # Additional path validation could be added here
        return str(path_obj)
    except Exception as e:
        raise ValueError(f"Invalid path: {str(e)}")


def is_safe_path(path, base_dir=None):
    """Check if the path is safe (doesn't try to escape using ../ etc)"""
    # Convert to absolute paths
    path = os.path.abspath(path)

    # If base_dir is provided, check that path doesn't escape it
    if base_dir:
        base_dir = os.path.abspath(base_dir)
        return os.path.commonpath([path, base_dir]) == base_dir

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Analyze mental health text using MentalLLaMA models"
    )
    parser.add_argument(
        "--input_path", type=str, required=True, help="Path to the input JSON file"
    )
    parser.add_argument(
        "--output_path",
        type=str,
        required=True,
        help="Path to save the output JSON file",
    )
    parser.add_argument(
        "--model_path", type=str, required=True, help="Path to the model"
    )
    parser.add_argument(
        "--allowed_base_dir",
        type=str,
        help="Optional base directory for path validation",
    )
    args = parser.parse_args()

    try:
        # Sanitize and validate paths
        input_path = sanitize_path(args.input_path)
        output_path = sanitize_path(args.output_path)
        model_path = sanitize_path(args.model_path)

        # If a base directory was provided, validate paths against it
        if args.allowed_base_dir:
            base_dir = sanitize_path(args.allowed_base_dir)
            if not is_safe_path(input_path, base_dir) or not is_safe_path(
                output_path, base_dir
            ):
                sys.stderr.write(
                    "Error: Paths must be within the allowed base directory\n"
                )
                return 1

        # Validate input path exists
        if not os.path.exists(input_path):
            sys.stderr.write(f"Error: Input file does not exist: {input_path}\n")
            return 1

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Load input data
        with open(input_path, "r") as f:
            input_data = json.load(f)

        # Validate the input data
        if not isinstance(input_data, dict):
            sys.stderr.write("Error: Input data must be a JSON object\n")
            return 1

        text = input_data.get("text", "")
        if not isinstance(text, str):
            sys.stderr.write("Error: 'text' field must be a string\n")
            return 1

        categories = input_data.get("categories", ["all"])
        if not isinstance(categories, list) or not all(
            isinstance(c, str) for c in categories
        ):
            sys.stderr.write("Error: 'categories' must be a list of strings\n")
            return 1

        # Initialize results
        results = {"categories": {}, "analysis": "", "confidenceScore": 0.0}

        # Load the model
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)

        # Process text through the model
        inputs = tokenizer(
            text, return_tensors="pt", max_length=512, truncation=True, padding=True
        )
        with torch.no_grad():
            outputs = model(**inputs)

        # Get predictions
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predictions = torch.argmax(probs, dim=-1)

        # Map to category names and confidence scores
        category_names = ["depression", "anxiety", "stress", "suicidal"]
        for i, category in enumerate(category_names):
            if "all" in categories or category in categories:
                results["categories"][category] = float(probs[0][i])

        # Get highest confidence category
        if results["categories"]:
            max_category = max(results["categories"].items(), key=lambda x: x[1])
            results["analysis"] = (
                f"The text indicates {max_category[0]} with {max_category[1]:.2%} confidence."
            )
            results["confidenceScore"] = float(max(probs[0]))
        else:
            results["analysis"] = "No relevant categories found."
            results["confidenceScore"] = 0.0

        # Save output
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)

        # Print results for capture by the parent process
        print(json.dumps(results))
        return 0
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
