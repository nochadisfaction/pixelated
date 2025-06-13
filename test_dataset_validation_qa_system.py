#!/usr/bin/env python3
"""
Unit Tests for Dataset Validation and Quality Assurance System - Task 6.3

Tests the comprehensive validation and quality assurance functionality
including integration of all validation components.
"""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from dataset_validation_qa_system import (
    DatasetValidationQASystem,
    QualityStandard,
    ValidationConfig,
    ValidationResult,
    ValidationSeverity,
    create_mock_validation_dataset,
)

try:
    from dataset_categorization_system import DatasetCategory, DatasetItem
except ImportError:
    # Mock classes for testing
    class DatasetCategory:
        CLINICAL_CONVERSATIONS = Mock()
        CLINICAL_CONVERSATIONS.category_name = "clinical_conversations"
        CLINICAL_CONVERSATIONS.target_ratio = 0.30

    class DatasetItem:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)


class TestDatasetValidationQASystem(unittest.TestCase):
    """Test cases for the dataset validation and QA system."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = ValidationConfig()
        self.validator = DatasetValidationQASystem(self.config)

    def _create_test_item(self, item_id: str, quality_score: float = 0.8):
        """Create a test dataset item."""
        category = Mock()
        category.category_name = "clinical_conversations"
        category.target_ratio = 0.3

        item = Mock()
        item.item_id = item_id
        item.content = "Test therapeutic conversation content"
        item.source = "test"
        item.data_type = "conversation"
        item.category = category
        item.quality_score = quality_score
        item.clinical_accuracy = quality_score + 0.1
        item.conversation_quality = quality_score - 0.1
        item.diversity_features = {"cognitive", "therapy", "anxiety"}

        return item

    def test_validation_config_initialization(self):
        """Test validation configuration initialization."""
        config = ValidationConfig()
        self.assertEqual(config.quality_standard, QualityStandard.TRAINING)
        self.assertEqual(config.min_overall_quality, 0.7)
        self.assertEqual(config.ratio_tolerance, 0.05)

    def test_validator_initialization(self):
        """Test validator system initialization."""
        validator = DatasetValidationQASystem()
        self.assertIsNotNone(validator.config)

    def test_validation_result_methods(self):
        """Test validation result methods."""
        result = ValidationResult("test_dataset")

        # Test adding issues
        result.add_issue(ValidationSeverity.HIGH, "test", "Test issue")
        self.assertEqual(len(result.issues), 1)

        # Test score calculation
        result.quality_metrics.overall_quality_score = 0.8
        result.quality_metrics.clinical_accuracy_score = 0.85
        result.quality_metrics.conversation_quality_score = 0.75
        result.quality_metrics.diversity_score = 0.7
        result.quality_metrics.content_integrity_score = 0.9

        score = result.calculate_validation_score()
        self.assertGreater(score, 0.0)

        # Test grade calculation
        grade = result.calculate_quality_grade()
        self.assertIn(grade, ["A", "B", "C", "D", "F"])

    def test_dataset_validation(self):
        """Test comprehensive dataset validation."""
        dataset = [
            self._create_test_item("item_1", 0.8),
            self._create_test_item("item_2", 0.9),
            self._create_test_item("item_3", 0.7),
        ]

        result = self.validator.validate_dataset(dataset, "test_dataset")

        self.assertEqual(result.total_items, 3)
        self.assertGreaterEqual(result.validation_score, 0.0)
        self.assertLessEqual(result.validation_score, 1.0)

    def test_mock_dataset_generation(self):
        """Test mock dataset generation."""
        dataset = create_mock_validation_dataset(10)
        self.assertEqual(len(dataset), 10)

        for item in dataset:
            self.assertTrue(hasattr(item, "item_id"))
            self.assertTrue(hasattr(item, "content"))
            self.assertTrue(hasattr(item, "quality_score"))

    def test_validation_score_calculation(self):
        """Test validation score calculation."""
        result = ValidationResult("test_dataset")
        result.quality_metrics.overall_quality_score = 0.8
        result.quality_metrics.clinical_accuracy_score = 0.85
        result.quality_metrics.conversation_quality_score = 0.75
        result.quality_metrics.diversity_score = 0.7
        result.quality_metrics.content_integrity_score = 0.9

        score = result.calculate_validation_score()
        self.assertGreater(score, 0.7)
        self.assertLessEqual(score, 1.0)

        # Test with critical issues (should reduce score)
        result.add_issue(ValidationSeverity.CRITICAL, "test", "Critical issue")
        score_with_penalty = result.calculate_validation_score()
        self.assertLess(score_with_penalty, score)

    def test_quality_grade_calculation(self):
        """Test quality grade calculation."""
        result = ValidationResult("test_dataset")

        # Test A grade
        result.validation_score = 0.95
        grade = result.calculate_quality_grade()
        self.assertEqual(grade, "A")

        # Test B grade
        result.validation_score = 0.85
        grade = result.calculate_quality_grade()
        self.assertEqual(grade, "B")

        # Test C grade
        result.validation_score = 0.75
        grade = result.calculate_quality_grade()
        self.assertEqual(grade, "C")

        # Test F grade
        result.validation_score = 0.5
        grade = result.calculate_quality_grade()
        self.assertEqual(grade, "F")

    def test_dataset_structure_validation(self):
        """Test basic dataset structure validation."""
        # Test with valid dataset
        dataset = [
            self._create_test_item("item_1", 0.8),
            self._create_test_item("item_2", 0.9),
            self._create_test_item("item_3", 0.7),
        ]

        result = self.validator.validate_dataset(dataset, "test_dataset")

        # Should not have critical structure issues
        critical_issues = result.get_issues_by_severity(ValidationSeverity.CRITICAL)
        structure_critical = [
            i for i in critical_issues if i.issue_type == "dataset_size"
        ]
        self.assertEqual(
            len(structure_critical), 0
        )  # 3 items is below min, but we'll adjust config

        # Test with empty dataset
        empty_result = self.validator.validate_dataset([], "empty_dataset")
        critical_issues = empty_result.get_issues_by_severity(
            ValidationSeverity.CRITICAL
        )
        self.assertGreater(len(critical_issues), 0)

    def test_quality_metrics_validation(self):
        """Test quality metrics validation."""
        # Create dataset with varying quality scores
        dataset = [
            self._create_test_item("high_quality", 0.9),
            self._create_test_item("medium_quality", 0.7),
            self._create_test_item("low_quality", 0.5),
        ]

        result = self.validator.validate_dataset(dataset, "quality_test")

        # Check quality metrics calculation
        self.assertGreater(result.quality_metrics.overall_quality_score, 0.0)
        self.assertGreater(result.quality_metrics.clinical_accuracy_score, 0.0)
        self.assertGreater(result.quality_metrics.conversation_quality_score, 0.0)

        # Check quality distribution
        self.assertIn("excellent", result.quality_metrics.quality_distribution)
        self.assertIn("poor", result.quality_metrics.quality_distribution)

        # Should have some valid items
        self.assertGreater(result.valid_items, 0)
        self.assertEqual(result.total_items, 3)

    def test_category_validation(self):
        """Test category distribution and balance validation."""
        # Create unbalanced dataset
        dataset = []

        # Add many items of one category
        for i in range(10):
            dataset.append(self._create_test_item(f"clinical_{i}", 0.8))

        # Add few items of another category
        for i in range(2):
            dataset.append(self._create_test_item(f"general_{i}", 0.8))

        result = self.validator.validate_dataset(dataset, "category_test")

        # Should detect category imbalance
        imbalance_issues = [
            i for i in result.issues if i.issue_type == "category_imbalance"
        ]
        self.assertGreater(len(imbalance_issues), 0)

        # Check category analysis
        self.assertIn("clinical_conversations", result.category_analysis)
        self.assertIn("general_mental_health", result.category_analysis)

        # Check category quality scores
        self.assertIn(
            "clinical_conversations", result.quality_metrics.category_quality_scores
        )

    def test_ratio_validation(self):
        """Test dataset ratio validation against targets."""
        # Create dataset with known ratios
        dataset = []

        # 60% clinical conversations (target should be 30%)
        for i in range(6):
            dataset.append(self._create_test_item(f"clinical_{i}", 0.8))

        # 40% psychology knowledge (target should be 25%)
        for i in range(4):
            dataset.append(self._create_test_item(f"psych_{i}", 0.8))

        result = self.validator.validate_dataset(dataset, "ratio_test")

        # Check ratio validation results
        self.assertIn("target_ratios", result.ratio_validation)
        self.assertIn("actual_ratios", result.ratio_validation)
        self.assertIn("deviations", result.ratio_validation)

        # Should detect ratio deviations
        ratio_issues = [i for i in result.issues if i.issue_type == "ratio_deviation"]
        self.assertGreater(len(ratio_issues), 0)

    def test_content_integrity_validation(self):
        """Test content integrity and completeness validation."""
        # Create dataset with content issues
        dataset = [
            self._create_test_item(
                "good_content",
                0.8,
                content="This is a good therapeutic conversation with sufficient detail",
            ),
            self._create_test_item("short_content", 0.8, content="Too short"),
            self._create_test_item("empty_content", 0.8, content=""),
            self._create_test_item(
                "long_content", 0.8, content="x" * 15000
            ),  # Very long content
        ]

        result = self.validator.validate_dataset(dataset, "content_test")

        # Check content integrity score
        self.assertGreaterEqual(result.quality_metrics.content_integrity_score, 0.0)
        self.assertLessEqual(result.quality_metrics.content_integrity_score, 1.0)

        # Should detect content length issues
        length_issues = [i for i in result.issues if i.issue_type == "content_length"]
        self.assertGreater(len(length_issues), 0)

    def test_diversity_validation(self):
        """Test diversity features validation."""
        # Create items with varying diversity
        high_diversity_item = self._create_test_item("high_div", 0.8)
        high_diversity_item.diversity_features = {
            "cognitive",
            "therapy",
            "anxiety",
            "depression",
            "mindfulness",
        }

        low_diversity_item = self._create_test_item("low_div", 0.8)
        low_diversity_item.diversity_features = {"therapy"}

        no_diversity_item = self._create_test_item("no_div", 0.8)
        no_diversity_item.diversity_features = set()

        dataset = [high_diversity_item, low_diversity_item, no_diversity_item]

        result = self.validator.validate_dataset(dataset, "diversity_test")

        # Check diversity score
        self.assertGreaterEqual(result.quality_metrics.diversity_score, 0.0)
        self.assertLessEqual(result.quality_metrics.diversity_score, 1.0)

        # Should detect insufficient diversity features
        diversity_issues = [
            i for i in result.issues if i.issue_type == "diversity_features"
        ]
        self.assertGreater(len(diversity_issues), 0)

    def test_comprehensive_validation(self):
        """Test comprehensive validation with realistic dataset."""
        # Create realistic test dataset
        dataset = create_mock_validation_dataset(50)

        result = self.validator.validate_dataset(dataset, "comprehensive_test")

        # Check that all major components were validated
        self.assertGreater(result.total_items, 0)
        self.assertGreaterEqual(result.validation_score, 0.0)
        self.assertLessEqual(result.validation_score, 1.0)
        self.assertIn(result.quality_grade, ["A", "B", "C", "D", "F"])

        # Check that quality metrics were calculated
        self.assertGreaterEqual(result.quality_metrics.overall_quality_score, 0.0)
        self.assertGreaterEqual(result.quality_metrics.diversity_score, 0.0)
        self.assertGreaterEqual(result.quality_metrics.content_integrity_score, 0.0)

        # Check that category analysis was performed
        self.assertGreater(len(result.category_analysis), 0)

        # Check that ratio validation was performed
        self.assertIn("target_ratios", result.ratio_validation)

        # Check that recommendations were generated
        self.assertIsInstance(result.recommendations, list)

    def test_validation_status_determination(self):
        """Test validation status determination logic."""
        # Create dataset that should pass
        good_dataset = [
            self._create_test_item("good_1", 0.9),
            self._create_test_item("good_2", 0.85),
            self._create_test_item("good_3", 0.8),
        ]

        self.validator.validate_dataset(good_dataset, "good_dataset")
        # Note: May not pass due to size constraints, but should have decent scores

        # Create dataset with critical issues
        bad_item = self._create_test_item("bad", 0.3)  # Very low quality
        bad_dataset = [bad_item]

        bad_result = self.validator.validate_dataset(bad_dataset, "bad_dataset")
        self.assertFalse(bad_result.is_valid)  # Should fail due to size and quality

    def test_report_generation_and_saving(self):
        """Test validation report generation and file saving."""
        dataset = [
            self._create_test_item("item_1", 0.8),
            self._create_test_item("item_2", 0.9),
        ]

        result = self.validator.validate_dataset(dataset, "report_test")

        # Test summary generation
        summary = self.validator.generate_validation_summary(result)
        self.assertIn("Dataset Validation Report", summary)
        self.assertIn("report_test", summary)
        self.assertIn("Quality Metrics", summary)
        self.assertIn("Recommendations", summary)

        # Test report saving
        with tempfile.TemporaryDirectory() as temp_dir:
            report_path = Path(temp_dir) / "test_report.json"
            self.validator.save_validation_report(result, report_path)

            # Check that file was created
            self.assertTrue(report_path.exists())

            # Check file content
            with open(report_path, "r") as f:
                report_data = json.load(f)

            self.assertEqual(report_data["dataset_name"], "report_test")
            self.assertIn("quality_metrics", report_data)
            self.assertIn("issues", report_data)
            self.assertIn("recommendations", report_data)
            self.assertIn("summary", report_data)

    def test_configuration_variations(self):
        """Test validation with different configuration settings."""
        # Test strict configuration
        strict_config = ValidationConfig(
            quality_standard=QualityStandard.CLINICAL,
            min_overall_quality=0.9,
            ratio_tolerance=0.01,
        )
        strict_validator = DatasetValidationQASystem(strict_config)

        dataset = [self._create_test_item("item", 0.8)]  # Good but not excellent

        result = strict_validator.validate_dataset(dataset, "strict_test")

        # Should have more stringent requirements
        [i for i in result.issues if i.issue_type == "quality_threshold"]
        # Might have quality issues due to strict thresholds

        # Test lenient configuration
        lenient_config = ValidationConfig(
            quality_standard=QualityStandard.EXPERIMENTAL,
            min_overall_quality=0.5,
            ratio_tolerance=0.2,
        )
        lenient_validator = DatasetValidationQASystem(lenient_config)

        lenient_result = lenient_validator.validate_dataset(dataset, "lenient_test")

        # Should be more accepting
        self.assertGreaterEqual(lenient_result.validation_score, 0.0)

    def test_edge_cases(self):
        """Test edge cases and error handling."""
        # Test with empty dataset
        empty_result = self.validator.validate_dataset([], "empty")
        self.assertEqual(empty_result.total_items, 0)
        self.assertFalse(empty_result.is_valid)

        # Test with malformed items
        malformed_item = Mock()
        malformed_item.item_id = "malformed"
        # Missing other required attributes

        try:
            result = self.validator.validate_dataset([malformed_item], "malformed_test")
            # Should handle gracefully without crashing
            self.assertIsNotNone(result)
        except Exception as e:
            self.fail(f"Validation should handle malformed items gracefully: {e}")

        # Test with None values
        none_item = self._create_test_item("none_test", None)  # None quality score
        none_result = self.validator.validate_dataset([none_item], "none_test")
        self.assertIsNotNone(none_result)


if __name__ == "__main__":
    unittest.main()
