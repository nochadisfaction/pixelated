#!/usr/bin/env python3
"""
Dataset Validation and Quality Assurance System - Task 6.3

This module provides comprehensive validation and quality assurance for datasets,
integrating existing validation components and providing enhanced validation
specifically for balanced datasets with ratio requirements.
"""

import json
import logging
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Validation issue severity levels"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class QualityStandard(Enum):
    """Quality standards for dataset validation"""

    CLINICAL = "clinical"
    RESEARCH = "research"
    TRAINING = "training"
    EXPERIMENTAL = "experimental"


@dataclass
class ValidationConfig:
    """Configuration for dataset validation and quality assurance"""

    quality_standard: QualityStandard = QualityStandard.TRAINING
    min_overall_quality: float = 0.7
    min_clinical_accuracy: float = 0.75
    min_conversation_quality: float = 0.65
    ratio_tolerance: float = 0.05
    min_content_length: int = 10
    min_dataset_size: int = 100
    required_diversity_features: int = 2


@dataclass
class ValidationIssue:
    """Represents a validation issue"""

    severity: str
    issue_type: str
    message: str
    item_id: Optional[str] = None
    suggestion: Optional[str] = None


@dataclass
class QualityMetrics:
    """Quality metrics for a dataset"""

    overall_quality_score: float = 0.0
    clinical_accuracy_score: float = 0.0
    conversation_quality_score: float = 0.0
    diversity_score: float = 0.0
    content_integrity_score: float = 0.0
    category_quality_scores: Dict[str, float] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Comprehensive validation result for a dataset"""

    dataset_name: str
    validation_timestamp: datetime = field(default_factory=datetime.now)
    is_valid: bool = False
    validation_score: float = 0.0
    quality_grade: str = "F"
    config: ValidationConfig = field(default_factory=ValidationConfig)
    quality_metrics: QualityMetrics = field(default_factory=QualityMetrics)
    issues: List[ValidationIssue] = field(default_factory=list)
    category_analysis: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    ratio_validation: Dict[str, Any] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)
    total_items: int = 0
    valid_items: int = 0
    invalid_items: int = 0

    def add_issue(
        self,
        severity: ValidationSeverity,
        issue_type: str,
        message: str,
        item_id: Optional[str] = None,
        suggestion: Optional[str] = None,
    ):
        """Add a validation issue"""
        issue = ValidationIssue(
            severity=severity.value,
            issue_type=issue_type,
            message=message,
            item_id=item_id,
            suggestion=suggestion,
        )
        self.issues.append(issue)

    def get_issues_by_severity(
        self, severity: ValidationSeverity
    ) -> List[ValidationIssue]:
        """Get issues by severity level"""
        return [issue for issue in self.issues if issue.severity == severity.value]

    def calculate_validation_score(self) -> float:
        """Calculate overall validation score"""
        weights = {
            "quality": 0.3,
            "clinical": 0.25,
            "conversation": 0.2,
            "diversity": 0.15,
            "integrity": 0.1,
        }

        score = (
            weights["quality"] * self.quality_metrics.overall_quality_score
            + weights["clinical"] * self.quality_metrics.clinical_accuracy_score
            + weights["conversation"] * self.quality_metrics.conversation_quality_score
            + weights["diversity"] * self.quality_metrics.diversity_score
            + weights["integrity"] * self.quality_metrics.content_integrity_score
        )

        # Apply penalty for critical and high issues
        critical_issues = len(self.get_issues_by_severity(ValidationSeverity.CRITICAL))
        high_issues = len(self.get_issues_by_severity(ValidationSeverity.HIGH))
        penalty = (critical_issues * 0.2) + (high_issues * 0.1)
        score = max(0.0, score - penalty)

        self.validation_score = score
        return score

    def calculate_quality_grade(self) -> str:
        """Calculate quality grade based on validation score"""
        score = self.validation_score
        if score >= 0.9:
            grade = "A"
        elif score >= 0.8:
            grade = "B"
        elif score >= 0.7:
            grade = "C"
        elif score >= 0.6:
            grade = "D"
        else:
            grade = "F"

        self.quality_grade = grade
        return grade


class DatasetValidationQASystem:
    """
    Comprehensive dataset validation and quality assurance system.

    Integrates existing validation components and provides enhanced validation
    specifically for balanced datasets with ratio requirements.
    """

    def __init__(self, config: Optional[ValidationConfig] = None):
        """Initialize the validation system"""
        self.config = config or ValidationConfig()
        logger.info(
            f"Initialized dataset validation QA system with {self.config.quality_standard.value} quality standard"
        )

    def validate_dataset(
        self, dataset: List[Any], dataset_name: str = "dataset"
    ) -> ValidationResult:
        """
        Perform comprehensive validation of a dataset

        Args:
            dataset: List of dataset items to validate
            dataset_name: Name of the dataset for reporting

        Returns:
            ValidationResult with comprehensive validation information
        """
        logger.info(
            f"Starting comprehensive validation of dataset '{dataset_name}' with {len(dataset)} items"
        )

        result = ValidationResult(dataset_name=dataset_name, config=self.config)
        result.total_items = len(dataset)

        # 1. Basic dataset validation
        self._validate_dataset_structure(dataset, result)

        # 2. Quality validation
        self._validate_quality_metrics(dataset, result)

        # 3. Category validation
        self._validate_categories(dataset, result)

        # 4. Ratio validation
        self._validate_ratios(dataset, result)

        # 5. Content validation
        self._validate_content_integrity(dataset, result)

        # 6. Diversity validation
        self._validate_diversity(dataset, result)

        # 7. Calculate final scores and generate recommendations
        result.calculate_validation_score()
        result.calculate_quality_grade()
        self._generate_recommendations(dataset, result)
        result.is_valid = self._determine_validation_status(result)

        logger.info(
            f"Validation completed. Score: {result.validation_score:.3f}, Grade: {result.quality_grade}, Valid: {result.is_valid}"
        )
        return result

    def _validate_dataset_structure(self, dataset: List[Any], result: ValidationResult):
        """Validate basic dataset structure and requirements"""
        if len(dataset) < self.config.min_dataset_size:
            result.add_issue(
                ValidationSeverity.CRITICAL,
                "dataset_size",
                f"Dataset too small: {len(dataset)} items (minimum: {self.config.min_dataset_size})",
                suggestion="Add more data items to meet minimum size requirement",
            )

        # Check for required fields
        missing_fields = []
        for i, item in enumerate(dataset[:10]):  # Sample first 10 items
            if not hasattr(item, "item_id") or not getattr(item, "item_id", None):
                missing_fields.append(f"item_id missing at index {i}")
            if not hasattr(item, "content") or not getattr(item, "content", None):
                missing_fields.append(f"content missing at index {i}")

        if missing_fields:
            result.add_issue(
                ValidationSeverity.CRITICAL,
                "missing_fields",
                f"Required fields missing: {missing_fields[:3]}{'...' if len(missing_fields) > 3 else ''}",
                suggestion="Ensure all items have required fields: item_id, content, category",
            )

        # Check for duplicates
        item_ids = [
            getattr(item, "item_id", None)
            for item in dataset
            if hasattr(item, "item_id")
        ]
        item_ids = [id for id in item_ids if id is not None]
        duplicates = len(item_ids) - len(set(item_ids))
        if duplicates > 0:
            result.add_issue(
                ValidationSeverity.HIGH,
                "duplicates",
                f"Found {duplicates} duplicate item IDs",
                suggestion="Remove or rename duplicate items to ensure unique IDs",
            )

    def _validate_quality_metrics(self, dataset: List[Any], result: ValidationResult):
        """Validate quality metrics across the dataset"""
        quality_scores = []
        clinical_scores = []
        conversation_scores = []
        valid_items = 0

        for item in dataset:
            try:
                # Overall quality score
                quality_score = getattr(item, "quality_score", None)
                if quality_score is not None:
                    quality_scores.append(quality_score)
                    if quality_score >= self.config.min_overall_quality:
                        valid_items += 1

                # Clinical accuracy
                clinical_accuracy = getattr(item, "clinical_accuracy", None)
                if clinical_accuracy is not None:
                    clinical_scores.append(clinical_accuracy)

                # Conversation quality
                conversation_quality = getattr(item, "conversation_quality", None)
                if conversation_quality is not None:
                    conversation_scores.append(conversation_quality)

            except Exception as e:
                logger.warning(
                    f"Error processing item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        # Calculate metrics
        if quality_scores:
            result.quality_metrics.overall_quality_score = statistics.mean(
                quality_scores
            )
        if clinical_scores:
            result.quality_metrics.clinical_accuracy_score = statistics.mean(
                clinical_scores
            )
        if conversation_scores:
            result.quality_metrics.conversation_quality_score = statistics.mean(
                conversation_scores
            )

        result.valid_items = valid_items
        result.invalid_items = len(dataset) - valid_items

        # Check thresholds
        if (
            result.quality_metrics.overall_quality_score
            < self.config.min_overall_quality
        ):
            result.add_issue(
                ValidationSeverity.HIGH,
                "quality_threshold",
                f"Average quality score {result.quality_metrics.overall_quality_score:.3f} below threshold {self.config.min_overall_quality}",
                suggestion="Improve data quality or adjust quality thresholds",
            )

    def _validate_categories(self, dataset: List[Any], result: ValidationResult):
        """Validate category distribution and balance"""
        category_counts = {}
        category_quality = {}

        for item in dataset:
            try:
                if category := getattr(item, "category", None):
                    if hasattr(category, "category_name"):
                        category_name = category.category_name
                    else:
                        category_name = str(category)

                    if category_name not in category_counts:
                        category_counts[category_name] = 0
                        category_quality[category_name] = []

                    category_counts[category_name] += 1

                    quality_score = getattr(item, "quality_score", None)
                    if quality_score is not None:
                        category_quality[category_name].append(quality_score)

            except Exception as e:
                logger.warning(
                    f"Error processing category for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        # Calculate category quality scores
        for category, scores in category_quality.items():
            if scores:
                avg_quality = statistics.mean(scores)
                result.quality_metrics.category_quality_scores[category] = avg_quality

                result.category_analysis[category] = {
                    "count": category_counts[category],
                    "avg_quality": avg_quality,
                    "min_quality": min(scores),
                    "max_quality": max(scores),
                }

    def _validate_ratios(self, dataset: List[Any], result: ValidationResult):
        """Validate dataset ratios against target ratios"""
        category_counts = {}
        total_items = len(dataset)

        # Count items by category
        for item in dataset:
            try:
                if category := getattr(item, "category", None):
                    if hasattr(category, "category_name"):
                        category_name = category.category_name
                    else:
                        category_name = str(category)
                    category_counts[category_name] = (
                        category_counts.get(category_name, 0) + 1
                    )
            except Exception as e:
                logger.warning(
                    f"Error getting category for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        # Calculate actual ratios
        actual_ratios = {
            cat: count / total_items for cat, count in category_counts.items()
        }

        # Get target ratios (simplified - assume equal distribution for now)
        num_categories = len(category_counts)
        if num_categories > 0:
            target_ratios = {
                cat: 1.0 / num_categories for cat in category_counts.keys()
            }
        else:
            target_ratios = {}

        # Validate ratios
        ratio_deviations = {}
        max_deviation = 0.0

        for category, target_ratio in target_ratios.items():
            actual_ratio = actual_ratios.get(category, 0.0)
            deviation = abs(target_ratio - actual_ratio)
            ratio_deviations[category] = deviation
            max_deviation = max(max_deviation, deviation)

            if deviation > self.config.ratio_tolerance:
                result.add_issue(
                    ValidationSeverity.MEDIUM,
                    "ratio_deviation",
                    f"Category '{category}' ratio deviation {deviation:.3f} exceeds tolerance {self.config.ratio_tolerance}",
                    suggestion=f"Adjust category '{category}' from {actual_ratio:.1%} to target {target_ratio:.1%}",
                )

        # Store ratio validation results
        result.ratio_validation = {
            "target_ratios": target_ratios,
            "actual_ratios": actual_ratios,
            "deviations": ratio_deviations,
            "max_deviation": max_deviation,
            "within_tolerance": max_deviation <= self.config.ratio_tolerance,
        }

    def _validate_content_integrity(self, dataset: List[Any], result: ValidationResult):
        """Validate content integrity and completeness"""
        content_issues = 0

        for item in dataset:
            try:
                content = getattr(item, "content", "")
                if not content:
                    content_issues += 1
                    continue

                content_length = len(content)

                if content_length < self.config.min_content_length:
                    result.add_issue(
                        ValidationSeverity.LOW,
                        "content_length",
                        f"Item {getattr(item, 'item_id', 'unknown')} content too short: {content_length} chars",
                        suggestion="Ensure content has sufficient detail",
                    )

            except Exception as e:
                content_issues += 1
                logger.warning(
                    f"Error validating content for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        # Calculate content integrity score
        if dataset:
            integrity_score = 1.0 - (content_issues / len(dataset))
            result.quality_metrics.content_integrity_score = max(0.0, integrity_score)

        if content_issues > 0:
            result.add_issue(
                ValidationSeverity.MEDIUM,
                "content_integrity",
                f"Found {content_issues} items with content issues",
                suggestion="Review and fix content integrity issues",
            )

    def _validate_diversity(self, dataset: List[Any], result: ValidationResult):
        """Validate diversity features and coverage"""
        all_features = set()
        item_feature_counts = []

        for item in dataset:
            try:
                features = getattr(item, "diversity_features", set())
                if isinstance(features, (list, tuple)):
                    features = set(features)
                elif not isinstance(features, set):
                    features = set()

                all_features.update(features)
                item_feature_counts.append(len(features))

                if len(features) < self.config.required_diversity_features:
                    result.add_issue(
                        ValidationSeverity.LOW,
                        "diversity_features",
                        f"Item {getattr(item, 'item_id', 'unknown')} has insufficient diversity features: {len(features)}",
                        suggestion=f"Add more diversity features (minimum: {self.config.required_diversity_features})",
                    )

            except Exception as e:
                logger.warning(
                    f"Error validating diversity for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )
                item_feature_counts.append(0)

        # Calculate diversity score
        if item_feature_counts:
            avg_features = statistics.mean(item_feature_counts)
            total_unique_features = len(all_features)

            coverage_score = min(1.0, total_unique_features / 20.0)
            distribution_score = min(
                1.0, avg_features / self.config.required_diversity_features
            )

            result.quality_metrics.diversity_score = (
                coverage_score + distribution_score
            ) / 2.0
        else:
            result.quality_metrics.diversity_score = 0.0

    def _generate_recommendations(self, dataset: List[Any], result: ValidationResult):
        """Generate actionable recommendations based on validation results"""
        recommendations = []

        if result.quality_metrics.overall_quality_score < 0.8:
            recommendations.append(
                "Consider improving overall data quality through better curation and filtering"
            )

        if (
            result.ratio_validation.get("max_deviation", 0)
            > self.config.ratio_tolerance
        ):
            recommendations.append(
                "Rebalance dataset categories to achieve target ratios"
            )

        if result.total_items < 1000:
            recommendations.append(
                "Consider expanding dataset size for better model training"
            )

        if result.quality_metrics.diversity_score < 0.7:
            recommendations.append(
                "Increase diversity features to improve dataset coverage"
            )

        critical_issues = len(
            result.get_issues_by_severity(ValidationSeverity.CRITICAL)
        )
        if critical_issues > 0:
            recommendations.append(
                f"Address {critical_issues} critical issues before using dataset"
            )

        result.recommendations = recommendations

    def _determine_validation_status(self, result: ValidationResult) -> bool:
        """Determine if dataset passes validation"""
        critical_issues = len(
            result.get_issues_by_severity(ValidationSeverity.CRITICAL)
        )
        if critical_issues > 0:
            return False

        if (
            result.quality_metrics.overall_quality_score
            < self.config.min_overall_quality
        ):
            return False

        return result.validation_score >= 0.6

    def save_validation_report(
        self, result: ValidationResult, output_path: Union[str, Path]
    ):
        """Save comprehensive validation report to file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        report_data = {
            "dataset_name": result.dataset_name,
            "validation_timestamp": result.validation_timestamp.isoformat(),
            "is_valid": result.is_valid,
            "validation_score": result.validation_score,
            "quality_grade": result.quality_grade,
            "quality_metrics": {
                "overall_quality_score": result.quality_metrics.overall_quality_score,
                "clinical_accuracy_score": result.quality_metrics.clinical_accuracy_score,
                "conversation_quality_score": result.quality_metrics.conversation_quality_score,
                "diversity_score": result.quality_metrics.diversity_score,
                "content_integrity_score": result.quality_metrics.content_integrity_score,
                "category_quality_scores": result.quality_metrics.category_quality_scores,
            },
            "issues": [
                {
                    "severity": issue.severity,
                    "type": issue.issue_type,
                    "message": issue.message,
                    "item_id": issue.item_id,
                    "suggestion": issue.suggestion,
                }
                for issue in result.issues
            ],
            "category_analysis": result.category_analysis,
            "ratio_validation": result.ratio_validation,
            "recommendations": result.recommendations,
            "summary": {
                "total_items": result.total_items,
                "valid_items": result.valid_items,
                "invalid_items": result.invalid_items,
                "critical_issues": len(
                    result.get_issues_by_severity(ValidationSeverity.CRITICAL)
                ),
                "high_issues": len(
                    result.get_issues_by_severity(ValidationSeverity.HIGH)
                ),
                "medium_issues": len(
                    result.get_issues_by_severity(ValidationSeverity.MEDIUM)
                ),
                "low_issues": len(
                    result.get_issues_by_severity(ValidationSeverity.LOW)
                ),
            },
        }

        with open(output_path, "w") as f:
            json.dump(report_data, f, indent=2)

        logger.info(f"Validation report saved to {output_path}")

    def generate_validation_summary(self, result: ValidationResult) -> str:
        """Generate a human-readable validation summary"""
        # Calculate valid items percentage
        valid_percentage = (
            (result.valid_items / result.total_items) if result.total_items > 0 else 0
        )

        summary_lines = [
            f"Dataset Validation Report: {result.dataset_name}",
            "=" * 50,
            f"Validation Status: {'✅ PASSED' if result.is_valid else '❌ FAILED'}",
            f"Overall Score: {result.validation_score:.3f}/1.000",
            f"Quality Grade: {result.quality_grade}",
            f"Timestamp: {result.validation_timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "Quality Metrics:",
            f"  Overall Quality: {result.quality_metrics.overall_quality_score:.3f}",
            f"  Clinical Accuracy: {result.quality_metrics.clinical_accuracy_score:.3f}",
            f"  Conversation Quality: {result.quality_metrics.conversation_quality_score:.3f}",
            f"  Diversity Score: {result.quality_metrics.diversity_score:.3f}",
            f"  Content Integrity: {result.quality_metrics.content_integrity_score:.3f}",
            "",
            "Dataset Summary:",
            f"  Total Items: {result.total_items:,}",
            f"  Valid Items: {result.valid_items:,} ({valid_percentage:.1%})",
            f"  Invalid Items: {result.invalid_items:,}",
            f"  Validation Score: {result.validation_score:.3f}",
            f"  Validation Grade: {result.quality_grade}",
            "",
            "Issues by Severity:",
            f"  Critical: {len(result.get_issues_by_severity(ValidationSeverity.CRITICAL)):,}",
            f"  High: {len(result.get_issues_by_severity(ValidationSeverity.HIGH)):,}",
            f"  Medium: {len(result.get_issues_by_severity(ValidationSeverity.MEDIUM)):,}",
            f"  Low: {len(result.get_issues_by_severity(ValidationSeverity.LOW)):,}",
        ]

        if result.category_analysis:
            summary_lines.extend(["", "Category Analysis:"])
            summary_lines.extend(
                f"  {category}: {analysis['count']} items, avg quality: {analysis['avg_quality']:.3f}"
                for category, analysis in result.category_analysis.items()
            )
        if result.ratio_validation:
            summary_lines.extend(
                [
                    "",
                    "Ratio Validation:",
                    f"  Within Tolerance: {'✅' if result.ratio_validation.get('within_tolerance', False) else '❌'}",
                    f"  Max Deviation: {result.ratio_validation.get('max_deviation', 0):.3f}",
                ]
            )

        if result.recommendations:
            summary_lines.extend(["", "Recommendations:"])
            summary_lines.extend(
                f"  {i}. {rec}" for i, rec in enumerate(result.recommendations, 1)
            )
        return "\n".join(summary_lines)


# Mock data generation for testing
def create_mock_validation_dataset(size: int = 100) -> List[Any]:
    """Create mock dataset for validation testing"""
    import random

    class MockCategory:
        def __init__(self, name):
            self.category_name = name
            self.target_ratio = 0.2

    class MockItem:
        def __init__(self, item_id, category_name, quality_score):
            self.item_id = item_id
            self.content = f"Mock therapeutic conversation content for item {item_id} with {category_name} focus."
            self.source = "mock_validation_test"
            self.data_type = "therapeutic_conversation"
            self.category = MockCategory(category_name)
            self.quality_score = quality_score
            self.clinical_accuracy = min(1.0, quality_score + random.uniform(-0.1, 0.2))
            self.conversation_quality = min(
                1.0, quality_score + random.uniform(-0.2, 0.1)
            )
            self.diversity_features = set(
                random.sample(
                    [
                        "cognitive",
                        "therapy",
                        "anxiety",
                        "depression",
                        "mindfulness",
                        "trauma",
                        "personality",
                        "assessment",
                        "intervention",
                        "coping",
                    ],
                    random.randint(1, 5),
                )
            )

    dataset = []
    categories = [
        "clinical_conversations",
        "psychology_knowledge",
        "voice_derived_data",
        "edge_cases",
        "general_mental_health",
    ]

    for i in range(size):
        category = random.choice(categories)
        quality_score = random.uniform(0.6, 1.0)

        item = MockItem(f"test_item_{i:03d}", category, quality_score)
        dataset.append(item)

    return dataset


def main():
    """Main function for testing dataset validation and QA system"""
    print("Testing Dataset Validation and Quality Assurance System")
    print("=" * 60)

    # Create test configuration
    config = ValidationConfig(
        quality_standard=QualityStandard.TRAINING,
        min_overall_quality=0.7,
        ratio_tolerance=0.05,
    )

    # Initialize validation system
    validator = DatasetValidationQASystem(config)

    # Create mock dataset
    print("Creating mock dataset for validation...")
    dataset = create_mock_validation_dataset(200)
    print(f"Created dataset with {len(dataset)} items")

    # Perform validation
    print("\nPerforming comprehensive validation...")
    result = validator.validate_dataset(dataset, "test_dataset")

    # Display results
    print("\n" + validator.generate_validation_summary(result))

    # Save detailed report
    report_path = "validation_qa_test_report.json"
    validator.save_validation_report(result, report_path)
    print(f"\nDetailed validation report saved to {report_path}")

    return result


if __name__ == "__main__":
    main()
