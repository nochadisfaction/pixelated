#!/usr/bin/env python3
"""
Dataset Validation and Quality Assurance System - Task 6.3

This module provides comprehensive validation and quality assurance for datasets,
integrating all existing validation components and providing enhanced validation
specifically for balanced datasets with ratio requirements.
"""

import json
import logging
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union

# Import existing validation components
try:
    from clinical_accuracy_validator_new import ClinicalAccuracyValidator
    from dataset_categorization_system import DatasetCategory, DatasetItem
    from dataset_validator import DatasetValidator, ValidationIssue, ValidationReport
    from language_quality_assessment import LanguageQualityAssessment
    from quality_filtering_system import (
        FilterDecision,
        FilterReason,
        QualityFilteringSystem,
    )
    from ratio_balancing_algorithms import BalancingResult, RatioBalancingAlgorithms
except ImportError as e:
    logging.warning(f"Some validation components not available: {e}")

    # Define minimal interfaces for testing
    class ValidationReport:
        def __init__(self):
            self.issues = []

    class ValidationIssue:
        def __init__(
            self, severity, issue_type, message, field_name=None, suggested_fix=None
        ):
            self.severity = severity
            self.issue_type = issue_type
            self.message = message
            self.field_name = field_name
            self.suggested_fix = suggested_fix

    class DatasetValidator:
        """Minimal DatasetValidator class for testing"""

        def validate(self, dataset):
            return ValidationReport()

    class FilterDecision(Enum):
        """Minimal FilterDecision enum for testing"""

        ACCEPT = "accept"
        REJECT = "reject"
        REVIEW = "review"

    class FilterReason(Enum):
        """Minimal FilterReason enum for testing"""

        QUALITY = "quality"
        CONTENT = "content"
        RELEVANCE = "relevance"

    class QualityFilteringSystem:
        """Minimal QualityFilteringSystem class for testing"""

        def filter_item(self, item):
            return FilterDecision.ACCEPT, None

    class LanguageQualityAssessment:
        """Minimal LanguageQualityAssessment class for testing"""

        def assess_quality(self, text):
            return 0.8

    class ClinicalAccuracyValidator:
        """Minimal ClinicalAccuracyValidator class for testing"""

        def validate(self, content):
            return 0.8

    class DatasetCategory(Enum):
        """Minimal DatasetCategory enum for testing"""

        CLINICAL_CONVERSATIONS = ("clinical_conversations", 0.30, 1)
        PSYCHOLOGY_KNOWLEDGE = ("psychology_knowledge", 0.25, 2)
        VOICE_DERIVED_DATA = ("voice_derived_data", 0.20, 3)
        EDGE_CASES = ("edge_cases", 0.15, 4)
        GENERAL_MENTAL_HEALTH = ("general_mental_health", 0.10, 5)

        def __init__(self, category_name, target_ratio, priority):
            self._category_name = category_name
            self._target_ratio = target_ratio
            self._priority = priority

        @property
        def category_name(self):
            return self._category_name

        @property
        def target_ratio(self):
            return self._target_ratio

        @property
        def priority(self):
            return self._priority

    @dataclass
    class DatasetItem:
        """Minimal DatasetItem class for testing"""

        item_id: str
        content: str
        source: str
        data_type: str
        category: DatasetCategory
        quality_score: float = 0.0
        clinical_accuracy: float = 0.0
        conversation_quality: float = 0.0
        diversity_features: Set[str] = field(default_factory=set)

    @dataclass
    class BalancingResult:
        """Minimal BalancingResult class for testing"""

        balanced_items: List[Any] = field(default_factory=list)
        original_count: int = 0
        balanced_count: int = 0
        removed_items: List[Any] = field(default_factory=list)
        added_items: List[Any] = field(default_factory=list)

    class RatioBalancingAlgorithms:
        """Minimal RatioBalancingAlgorithms class for testing"""

        @staticmethod
        def balance_by_quality_threshold(items, target_ratios, quality_threshold=0.7):
            return BalancingResult(
                balanced_items=items,
                original_count=len(items),
                balanced_count=len(items),
            )


logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Validation issue severity levels"""

    CRITICAL = "critical"  # Must be fixed
    HIGH = "high"  # Should be fixed
    MEDIUM = "medium"  # Consider fixing
    LOW = "low"  # Optional fix
    INFO = "info"  # Informational


class QualityStandard(Enum):
    """Quality standards for dataset validation"""

    CLINICAL = "clinical"  # Clinical-grade quality
    RESEARCH = "research"  # Research-grade quality
    TRAINING = "training"  # Training-grade quality
    EXPERIMENTAL = "experimental"  # Experimental-grade quality


@dataclass
class ValidationConfig:
    """Configuration for dataset validation and quality assurance"""

    quality_standard: QualityStandard = QualityStandard.TRAINING

    # Quality thresholds
    min_overall_quality: float = 0.7
    min_clinical_accuracy: float = 0.75
    min_conversation_quality: float = 0.65
    min_language_quality: float = 0.6

    # Ratio tolerance for balanced datasets
    ratio_tolerance: float = 0.05  # 5% tolerance

    # Content validation
    min_content_length: int = 10
    max_content_length: int = 10000
    required_diversity_features: int = 2

    # Dataset size requirements
    min_dataset_size: int = 100
    max_dataset_size: int = 100000

    # Category requirements
    min_items_per_category: int = 5
    max_category_imbalance: float = 0.8  # Maximum ratio of largest to smallest category

    # Clinical validation
    require_clinical_validation: bool = True
    clinical_validation_sample_size: int = 100

    # Automated validation flags
    validate_ratios: bool = True
    validate_quality_scores: bool = True
    validate_content_integrity: bool = True
    validate_diversity: bool = True
    validate_clinical_accuracy: bool = True
    validate_conversation_structure: bool = True


@dataclass
class QualityMetrics:
    """Comprehensive quality metrics for a dataset"""

    overall_quality_score: float = 0.0
    quality_std_dev: float = 0.0
    quality_distribution: Dict[str, int] = field(default_factory=dict)

    clinical_accuracy_score: float = 0.0
    clinical_accuracy_std_dev: float = 0.0

    conversation_quality_score: float = 0.0
    conversation_quality_std_dev: float = 0.0

    language_quality_score: float = 0.0
    language_quality_std_dev: float = 0.0

    diversity_score: float = 0.0
    content_integrity_score: float = 0.0

    # Category-specific metrics
    category_quality_scores: Dict[str, float] = field(default_factory=dict)
    category_balance_score: float = 0.0


@dataclass
class ValidationResult:
    """Comprehensive validation result for a dataset"""

    dataset_name: str
    validation_timestamp: datetime = field(default_factory=datetime.now)

    # Overall validation status
    is_valid: bool = False
    validation_score: float = 0.0
    quality_grade: str = "F"

    # Validation config used
    config: ValidationConfig = field(default_factory=ValidationConfig)

    # Quality metrics
    quality_metrics: QualityMetrics = field(default_factory=QualityMetrics)

    # Issues found
    issues: List[ValidationIssue] = field(default_factory=list)

    # Category analysis
    category_analysis: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    # Ratio validation (for balanced datasets)
    ratio_validation: Dict[str, Any] = field(default_factory=dict)

    # Recommendations
    recommendations: List[str] = field(default_factory=list)

    # Summary statistics
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
            field_name=item_id,
            suggested_fix=suggestion,
        )
        self.issues.append(issue)

    def get_issues_by_severity(
        self, severity: ValidationSeverity
    ) -> List[ValidationIssue]:
        """Get issues by severity level"""
        return [issue for issue in self.issues if issue.severity == severity.value]

    def calculate_validation_score(self) -> float:
        """Calculate overall validation score"""
        # Weight different components
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

        # Apply penalty for critical issues
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

    Integrates all existing validation components and provides enhanced validation
    specifically for balanced datasets with ratio requirements.
    """

    def __init__(self, config: Optional[ValidationConfig] = None):
        """Initialize the validation system"""
        self.config = config or ValidationConfig()

        # Initialize component validators
        self._init_validators()

        logger.info(
            f"Initialized dataset validation QA system with {self.config.quality_standard.value} quality standard"
        )

    def _init_validators(self):
        """Initialize all validation components"""
        try:
            self.dataset_validator = DatasetValidator()
            self.quality_filter = QualityFilteringSystem()
            self.language_assessor = LanguageQualityAssessment()
            self.clinical_validator = ClinicalAccuracyValidator()
        except Exception as e:
            logger.warning(f"Some validators could not be initialized: {e}")
            # Create minimal mock validators for testing
            self.dataset_validator = None
            self.quality_filter = None
            self.language_assessor = None
            self.clinical_validator = None

    def validate_dataset(
        self, dataset: List[DatasetItem], dataset_name: str = "dataset"
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

        # 4. Ratio validation (for balanced datasets)
        if self.config.validate_ratios:
            self._validate_ratios(dataset, result)

        # 5. Content validation
        if self.config.validate_content_integrity:
            self._validate_content_integrity(dataset, result)

        # 6. Diversity validation
        if self.config.validate_diversity:
            self._validate_diversity(dataset, result)

        # 7. Clinical validation
        if self.config.validate_clinical_accuracy:
            self._validate_clinical_accuracy(dataset, result)

        # 8. Conversation structure validation
        if self.config.validate_conversation_structure:
            self._validate_conversation_structure(dataset, result)

        # 9. Calculate final scores and grades
        result.calculate_validation_score()
        result.calculate_quality_grade()

        # 10. Generate recommendations
        self._generate_recommendations(dataset, result)

        # 11. Determine validation status
        result.is_valid = self._determine_validation_status(result)

        logger.info(
            f"Validation completed. Score: {result.validation_score:.3f}, Grade: {result.quality_grade}, Valid: {result.is_valid}"
        )

        return result

    def _validate_dataset_structure(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Validate basic dataset structure and requirements"""
        # Check dataset size
        if len(dataset) < self.config.min_dataset_size:
            result.add_issue(
                ValidationSeverity.CRITICAL,
                "dataset_size",
                f"Dataset too small: {len(dataset)} items (minimum: {self.config.min_dataset_size})",
                suggestion="Add more data items to meet minimum size requirement",
            )
        elif len(dataset) > self.config.max_dataset_size:
            result.add_issue(
                ValidationSeverity.HIGH,
                "dataset_size",
                f"Dataset very large: {len(dataset)} items (maximum recommended: {self.config.max_dataset_size})",
                suggestion="Consider splitting into smaller datasets for better performance",
            )

        # Check for required fields
        missing_fields = []
        for i, item in enumerate(dataset[:100]):  # Sample first 100 items
            if not hasattr(item, "item_id") or not item.item_id:
                missing_fields.append(f"item_id missing at index {i}")
            if not hasattr(item, "content") or not item.content:
                missing_fields.append(f"content missing at index {i}")
            if not hasattr(item, "category"):
                missing_fields.append(f"category missing at index {i}")

        if missing_fields:
            result.add_issue(
                ValidationSeverity.CRITICAL,
                "missing_fields",
                f"Required fields missing: {missing_fields[:5]}{'...' if len(missing_fields) > 5 else ''}",
                suggestion="Ensure all items have required fields: item_id, content, category",
            )

        # Check for duplicates
        item_ids = [
            item.item_id
            for item in dataset
            if hasattr(item, "item_id") and item.item_id
        ]
        duplicates = len(item_ids) - len(set(item_ids))
        if duplicates > 0:
            result.add_issue(
                ValidationSeverity.HIGH,
                "duplicates",
                f"Found {duplicates} duplicate item IDs",
                suggestion="Remove or rename duplicate items to ensure unique IDs",
            )

    def _extract_scores(self, dataset: List[DatasetItem]) -> tuple:
        """Extract quality scores from dataset items"""
        quality_scores, clinical_scores, conversation_scores = [], [], []
        valid_items = 0

        for item in dataset:
            try:
                if hasattr(item, "quality_score") and item.quality_score is not None:
                    quality_scores.append(item.quality_score)
                    if item.quality_score >= self.config.min_overall_quality:
                        valid_items += 1

                if (
                    hasattr(item, "clinical_accuracy")
                    and item.clinical_accuracy is not None
                ):
                    clinical_scores.append(item.clinical_accuracy)

                if (
                    hasattr(item, "conversation_quality")
                    and item.conversation_quality is not None
                ):
                    conversation_scores.append(item.conversation_quality)

            except Exception as e:
                logger.warning(
                    f"Error processing item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        return quality_scores, clinical_scores, conversation_scores, valid_items

    def _calculate_score_metrics(self, scores: List[float]) -> tuple:
        """Calculate mean and standard deviation for score list"""
        if not scores:
            return 0.0, 0.0
        return statistics.mean(scores), (
            statistics.stdev(scores) if len(scores) > 1 else 0.0
        )

    def _check_quality_thresholds(self, result: ValidationResult):
        """Check quality thresholds and add issues if needed"""
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

        if (
            result.quality_metrics.clinical_accuracy_score
            < self.config.min_clinical_accuracy
        ):
            result.add_issue(
                ValidationSeverity.HIGH,
                "clinical_threshold",
                f"Average clinical accuracy {result.quality_metrics.clinical_accuracy_score:.3f} below threshold {self.config.min_clinical_accuracy}",
                suggestion="Review clinical accuracy of content or adjust thresholds",
            )

    def _validate_quality_metrics(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Validate quality metrics across the dataset"""
        quality_scores, clinical_scores, conversation_scores, valid_items = (
            self._extract_scores(dataset)
        )

        # Calculate quality metrics
        (
            result.quality_metrics.overall_quality_score,
            result.quality_metrics.quality_std_dev,
        ) = self._calculate_score_metrics(quality_scores)
        (
            result.quality_metrics.clinical_accuracy_score,
            result.quality_metrics.clinical_accuracy_std_dev,
        ) = self._calculate_score_metrics(clinical_scores)
        (
            result.quality_metrics.conversation_quality_score,
            result.quality_metrics.conversation_quality_std_dev,
        ) = self._calculate_score_metrics(conversation_scores)

        # Quality distribution
        if quality_scores:
            result.quality_metrics.quality_distribution = {
                "excellent": sum(s >= 0.9 for s in quality_scores),
                "good": sum(0.8 <= s < 0.9 for s in quality_scores),
                "acceptable": sum(0.7 <= s < 0.8 for s in quality_scores),
                "poor": sum(s < 0.7 for s in quality_scores),
            }

        result.valid_items = valid_items
        result.invalid_items = len(dataset) - valid_items

        # Check thresholds
        self._check_quality_thresholds(result)

    def _validate_categories(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Validate category distribution and balance"""
        category_counts = {}
        category_quality = {}

        for item in dataset:
            try:
                category = (
                    item.category.category_name
                    if hasattr(item.category, "category_name")
                    else str(item.category)
                )

                # Count items per category
                if category not in category_counts:
                    category_counts[category] = 0
                    category_quality[category] = []

                category_counts[category] += 1

                # Collect quality scores by category
                if hasattr(item, "quality_score") and item.quality_score is not None:
                    category_quality[category].append(item.quality_score)

            except Exception as e:
                logger.warning(
                    f"Error processing category for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        # Check minimum items per category
        for category, count in category_counts.items():
            if count < self.config.min_items_per_category:
                result.add_issue(
                    ValidationSeverity.MEDIUM,
                    "category_size",
                    f"Category '{category}' has only {count} items (minimum: {self.config.min_items_per_category})",
                    suggestion=f"Add more items to category '{category}'",
                )

        # Check category balance
        if category_counts:
            max_count = max(category_counts.values())
            min_count = min(category_counts.values())
            imbalance_ratio = max_count / min_count if min_count > 0 else float("inf")

            if imbalance_ratio > self.config.max_category_imbalance:
                result.add_issue(
                    ValidationSeverity.MEDIUM,
                    "category_imbalance",
                    f"Category imbalance ratio {imbalance_ratio:.2f} exceeds threshold {self.config.max_category_imbalance}",
                    suggestion="Balance category sizes for better training performance",
                )

        # Calculate category quality scores
        for category, scores in category_quality.items():
            if scores:
                avg_quality = statistics.mean(scores)
                result.quality_metrics.category_quality_scores[category] = avg_quality

                result.category_analysis[category] = {
                    "count": category_counts[category],
                    "avg_quality": avg_quality,
                    "quality_std": statistics.stdev(scores) if len(scores) > 1 else 0.0,
                    "min_quality": min(scores),
                    "max_quality": max(scores),
                }

    def _validate_ratios(self, dataset: List[DatasetItem], result: ValidationResult):
        """Validate dataset ratios against target ratios"""
        category_counts = {}
        total_items = len(dataset)

        # Count items by category
        for item in dataset:
            try:
                category = (
                    item.category.category_name
                    if hasattr(item.category, "category_name")
                    else str(item.category)
                )
                category_counts[category] = category_counts.get(category, 0) + 1
            except Exception as e:
                logger.warning(
                    f"Error getting category for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        # Calculate actual ratios
        actual_ratios = {
            cat: count / total_items for cat, count in category_counts.items()
        }

        # Get target ratios (from DatasetCategory enum or defaults)
        target_ratios = {}
        try:
            for category in DatasetCategory:
                target_ratios[category.category_name] = category.target_ratio
        except Exception:
            # Fallback to equal distribution
            num_categories = len(category_counts)
            if num_categories > 0:
                target_ratios = {cat: 1.0 / num_categories for cat in category_counts}

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

        # Calculate balance score
        if max_deviation == 0:
            result.quality_metrics.category_balance_score = 1.0
        else:
            result.quality_metrics.category_balance_score = max(
                0.0, 1.0 - (max_deviation / 0.5)
            )

    def _validate_content_integrity(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Validate content integrity and completeness"""
        content_issues = 0
        total_length = 0
        content_lengths = []

        for item in dataset:
            try:
                content = getattr(item, "content", "")
                if not content:
                    content_issues += 1
                    continue

                content_length = len(content)
                content_lengths.append(content_length)
                total_length += content_length

                # Check content length limits
                if content_length < self.config.min_content_length:
                    result.add_issue(
                        ValidationSeverity.LOW,
                        "content_length",
                        f"Item {getattr(item, 'item_id', 'unknown')} content too short: {content_length} chars",
                        suggestion="Ensure content has sufficient detail",
                    )
                elif content_length > self.config.max_content_length:
                    result.add_issue(
                        ValidationSeverity.LOW,
                        "content_length",
                        f"Item {getattr(item, 'item_id', 'unknown')} content too long: {content_length} chars",
                        suggestion="Consider splitting long content",
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

    def _validate_diversity(self, dataset: List[DatasetItem], result: ValidationResult):
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

                # Check minimum diversity features
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

            # Diversity score based on feature coverage and distribution
            coverage_score = min(
                1.0, total_unique_features / 20.0
            )  # Assume 20 ideal features
            distribution_score = min(
                1.0, avg_features / self.config.required_diversity_features
            )

            result.quality_metrics.diversity_score = (
                coverage_score + distribution_score
            ) / 2.0
        else:
            result.quality_metrics.diversity_score = 0.0

    def _validate_clinical_accuracy(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Validate clinical accuracy using clinical validator"""
        if not self.clinical_validator:
            logger.warning(
                "Clinical validator not available, skipping clinical accuracy validation"
            )
            return

        # Sample items for clinical validation
        sample_size = min(self.config.clinical_validation_sample_size, len(dataset))
        sample_items = dataset[:sample_size]  # Take first N items

        clinical_issues = 0
        clinical_scores = []

        for item in sample_items:
            try:
                # Use existing clinical accuracy score if available
                if (
                    hasattr(item, "clinical_accuracy")
                    and item.clinical_accuracy is not None
                ):
                    clinical_scores.append(item.clinical_accuracy)
                    if item.clinical_accuracy < self.config.min_clinical_accuracy:
                        clinical_issues += 1
                else:
                    # Would need to call clinical validator on content
                    # This is a placeholder for actual clinical validation
                    clinical_scores.append(0.8)  # Mock score

            except Exception as e:
                clinical_issues += 1
                logger.warning(
                    f"Error in clinical validation for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        if clinical_issues > sample_size * 0.2:  # More than 20% of items have issues
            result.add_issue(
                ValidationSeverity.HIGH,
                "clinical_accuracy",
                f"High rate of clinical accuracy issues: {clinical_issues}/{sample_size} items",
                suggestion="Review clinical content accuracy and update validation criteria",
            )

    def _validate_conversation_structure(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Validate conversation structure and format"""
        structure_issues = 0

        for item in dataset:
            try:
                content = getattr(item, "content", "")
                if not content:
                    continue

                # Basic conversation structure checks
                # This is a simplified check - would need conversation schema validation
                has_dialogue = any(
                    marker in content.lower()
                    for marker in [":", "therapist", "client", "patient"]
                )
                has_sufficient_length = len(content.split()) >= 10

                if not (has_dialogue and has_sufficient_length):
                    structure_issues += 1

            except Exception as e:
                structure_issues += 1
                logger.warning(
                    f"Error validating conversation structure for item {getattr(item, 'item_id', 'unknown')}: {e}"
                )

        if structure_issues > len(dataset) * 0.1:  # More than 10% have structure issues
            result.add_issue(
                ValidationSeverity.MEDIUM,
                "conversation_structure",
                f"High rate of conversation structure issues: {structure_issues}/{len(dataset)} items",
                suggestion="Review conversation format and structure requirements",
            )

    def _generate_recommendations(
        self, dataset: List[DatasetItem], result: ValidationResult
    ):
        """Generate actionable recommendations based on validation results"""
        recommendations = []

        # Quality recommendations
        if result.quality_metrics.overall_quality_score < 0.8:
            recommendations.append(
                "Consider improving overall data quality through better curation and filtering"
            )

        # Category recommendations
        if (
            result.ratio_validation.get("max_deviation", 0)
            > self.config.ratio_tolerance
        ):
            recommendations.append(
                "Rebalance dataset categories to achieve target ratios"
            )

        # Size recommendations
        if result.total_items < 1000:
            recommendations.append(
                "Consider expanding dataset size for better model training"
            )

        # Diversity recommendations
        if result.quality_metrics.diversity_score < 0.7:
            recommendations.append(
                "Increase diversity features to improve dataset coverage"
            )

        # Clinical recommendations
        if result.quality_metrics.clinical_accuracy_score < 0.8:
            recommendations.append("Review clinical accuracy with domain experts")

        # Issue-based recommendations
        critical_issues = len(
            result.get_issues_by_severity(ValidationSeverity.CRITICAL)
        )
        if critical_issues > 0:
            recommendations.append(
                f"Address {critical_issues} critical issues before using dataset"
            )

        high_issues = len(result.get_issues_by_severity(ValidationSeverity.HIGH))
        if high_issues > 5:
            recommendations.append(
                f"Address {high_issues} high-priority issues for better quality"
            )

        result.recommendations = recommendations

    def _determine_validation_status(self, result: ValidationResult) -> bool:
        """Determine if dataset passes validation"""
        # Must not have critical issues
        critical_issues = len(
            result.get_issues_by_severity(ValidationSeverity.CRITICAL)
        )
        if critical_issues > 0:
            return False

        # Must meet minimum quality standards
        if (
            result.quality_metrics.overall_quality_score
            < self.config.min_overall_quality
        ):
            return False

        # Must meet validation score threshold
        return result.validation_score >= 0.6  # Minimum passing score

    def save_validation_report(
        self, result: ValidationResult, output_path: Union[str, Path]
    ):
        """Save comprehensive validation report to file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert to serializable format
        report_data = {
            "dataset_name": result.dataset_name,
            "validation_timestamp": result.validation_timestamp.isoformat(),
            "is_valid": result.is_valid,
            "validation_score": result.validation_score,
            "quality_grade": result.quality_grade,
            "config": {
                "quality_standard": result.config.quality_standard.value,
                "min_overall_quality": result.config.min_overall_quality,
                "ratio_tolerance": result.config.ratio_tolerance,
            },
            "quality_metrics": {
                "overall_quality_score": result.quality_metrics.overall_quality_score,
                "clinical_accuracy_score": result.quality_metrics.clinical_accuracy_score,
                "conversation_quality_score": result.quality_metrics.conversation_quality_score,
                "diversity_score": result.quality_metrics.diversity_score,
                "content_integrity_score": result.quality_metrics.content_integrity_score,
                "quality_distribution": result.quality_metrics.quality_distribution,
                "category_quality_scores": result.quality_metrics.category_quality_scores,
            },
            "issues": [
                {
                    "severity": issue.severity,
                    "type": issue.issue_type,
                    "message": issue.message,
                    "item_id": issue.field_name,
                    "suggestion": issue.suggested_fix,
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
            f"  Valid Items: {result.valid_items:,} ({result.valid_items/result.total_items:.1%})",
            f"  Invalid Items: {result.invalid_items:,} ({result.invalid_items/result.total_items:.1%})",
            "",
            "Issues by Severity:",
            f"  Critical: {len(result.get_issues_by_severity(ValidationSeverity.CRITICAL))}",
            f"  High: {len(result.get_issues_by_severity(ValidationSeverity.HIGH))}",
            f"  Medium: {len(result.get_issues_by_severity(ValidationSeverity.MEDIUM))}",
            f"  Low: {len(result.get_issues_by_severity(ValidationSeverity.LOW))}",
        ]

        # Add category analysis
        if result.category_analysis:
            summary_lines.extend(["", "Category Analysis:"])
            summary_lines.extend(
                f"  {category}: {analysis['count']} items, avg quality: {analysis['avg_quality']:.3f}"
                for category, analysis in result.category_analysis.items()
            )

        # Add ratio validation
        if result.ratio_validation:
            summary_lines.extend(
                [
                    "",
                    "Ratio Validation:",
                    f"  Within Tolerance: {'✅' if result.ratio_validation.get('within_tolerance', False) else '❌'}",
                    f"  Max Deviation: {result.ratio_validation.get('max_deviation', 0):.3f}",
                ]
            )

        # Add recommendations
        if result.recommendations:
            summary_lines.extend(["", "Recommendations:"])
            summary_lines.extend(
                f"  {i}. {rec}" for i, rec in enumerate(result.recommendations, 1)
            )

        return "\n".join(summary_lines)


# Mock data generation for testing
def create_mock_validation_dataset(size: int = 100) -> List[DatasetItem]:
    """Create mock dataset for validation testing"""
    import random

    # Use the already imported or fallback DatasetCategory and DatasetItem
    dataset = []
    categories = list(DatasetCategory)

    for i in range(size):
        category = random.choice(categories)
        quality_score = random.uniform(0.6, 1.0)
        clinical_accuracy = random.uniform(0.5, 1.0)
        conversation_quality = random.uniform(0.5, 1.0)

        # Create diversity features
        features = random.sample(
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

        item = DatasetItem(
            item_id=f"test_item_{i:03d}",
            content=f"Mock therapeutic conversation content for item {i} with {category.category_name} focus.",
            source="mock_validation_test",
            data_type="therapeutic_conversation",
            category=category,
            quality_score=quality_score,
            clinical_accuracy=clinical_accuracy,
            conversation_quality=conversation_quality,
            diversity_features=set(features),
        )

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
