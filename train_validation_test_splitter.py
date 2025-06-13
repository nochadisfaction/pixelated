#!/usr/bin/env python3
"""
Train/Validation/Test Split Generation System - Task 6.5

This module provides comprehensive functionality for splitting datasets into
training, validation, and test sets with proper stratification, quality preservation,
and category balance maintenance.

Key Features:
- Stratified splitting by category and quality levels
- Configurable split ratios (default: 70/15/15)
- Quality-aware splitting to preserve distribution
- Category balance preservation across splits
- Statistical validation of split quality
- Export capabilities for different formats
- Comprehensive reporting and metrics
"""

import json
import logging
import math
import random
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class SplitStrategy(Enum):
    """Available strategies for dataset splitting"""

    RANDOM = "random"  # Simple random splitting
    STRATIFIED = "stratified"  # Stratified by category
    QUALITY_AWARE = "quality_aware"  # Quality-aware stratified splitting
    BALANCED = "balanced"  # Balanced across all dimensions


class QualityLevel(Enum):
    """Quality level categories for stratification"""

    HIGH = "high"  # >= 0.9
    MEDIUM_HIGH = "medium_high"  # 0.8-0.89
    MEDIUM = "medium"  # 0.7-0.79
    MEDIUM_LOW = "medium_low"  # 0.6-0.69
    LOW = "low"  # < 0.6


@dataclass
class SplitConfig:
    """Configuration for train/validation/test splitting"""

    train_ratio: float = 0.70
    validation_ratio: float = 0.15
    test_ratio: float = 0.15
    strategy: SplitStrategy = SplitStrategy.QUALITY_AWARE
    preserve_category_balance: bool = True
    preserve_quality_distribution: bool = True
    min_items_per_split: int = 10
    random_seed: Optional[int] = 42
    ensure_diversity: bool = True
    quality_stratification: bool = True

    def __post_init__(self):
        """Validate split ratios"""
        total_ratio = self.train_ratio + self.validation_ratio + self.test_ratio
        if not math.isclose(total_ratio, 1.0, rel_tol=1e-6):
            raise ValueError(f"Split ratios must sum to 1.0, got {total_ratio}")


@dataclass
class SplitMetrics:
    """Metrics for dataset split quality"""

    train_size: int = 0
    validation_size: int = 0
    test_size: int = 0

    # Category distribution metrics
    train_category_distribution: Dict[str, float] = field(default_factory=dict)
    validation_category_distribution: Dict[str, float] = field(default_factory=dict)
    test_category_distribution: Dict[str, float] = field(default_factory=dict)
    category_balance_score: float = 0.0

    # Quality distribution metrics
    train_quality_stats: Dict[str, float] = field(default_factory=dict)
    validation_quality_stats: Dict[str, float] = field(default_factory=dict)
    test_quality_stats: Dict[str, float] = field(default_factory=dict)
    quality_balance_score: float = 0.0

    # Diversity metrics
    train_diversity_score: float = 0.0
    validation_diversity_score: float = 0.0
    test_diversity_score: float = 0.0

    # Overall split quality
    split_quality_score: float = 0.0


@dataclass
class DatasetSplit:
    """Container for train/validation/test dataset splits"""

    train_data: List[Any] = field(default_factory=list)
    validation_data: List[Any] = field(default_factory=list)
    test_data: List[Any] = field(default_factory=list)
    config: SplitConfig = field(default_factory=SplitConfig)
    metrics: SplitMetrics = field(default_factory=SplitMetrics)
    split_timestamp: datetime = field(default_factory=datetime.now)
    original_dataset_size: int = 0


class TrainValidationTestSplitter:
    """
    Comprehensive system for generating train/validation/test splits.

    Provides multiple strategies for splitting datasets while preserving
    category balance, quality distribution, and diversity across splits.
    """

    def __init__(self, config: Optional[SplitConfig] = None):
        """Initialize the splitter with configuration"""
        self.config = config or SplitConfig()

        if self.config.random_seed is not None:
            random.seed(self.config.random_seed)

        logger.info(f"Initialized splitter with strategy: {self.config.strategy.value}")
        logger.info(
            f"Split ratios: Train={self.config.train_ratio:.0%}, "
            f"Val={self.config.validation_ratio:.0%}, Test={self.config.test_ratio:.0%}"
        )

    def split_dataset(
        self, dataset: List[Any], dataset_name: str = "dataset"
    ) -> DatasetSplit:
        """
        Split dataset into train/validation/test sets.

        Args:
            dataset: List of dataset items to split
            dataset_name: Name of the dataset for reporting

        Returns:
            DatasetSplit with train/validation/test sets and metrics
        """
        logger.info(
            f"Starting dataset splitting for '{dataset_name}' with {len(dataset)} items"
        )

        if len(dataset) < 3 * self.config.min_items_per_split:
            raise ValueError(
                f"Dataset too small for splitting: {len(dataset)} items "
                f"(minimum: {3 * self.config.min_items_per_split})"
            )

        # Apply splitting strategy
        if self.config.strategy == SplitStrategy.RANDOM:
            split_result = self._random_split(dataset)
        elif self.config.strategy == SplitStrategy.STRATIFIED:
            split_result = self._stratified_split(dataset)
        elif self.config.strategy == SplitStrategy.QUALITY_AWARE:
            split_result = self._quality_aware_split(dataset)
        elif self.config.strategy == SplitStrategy.BALANCED:
            split_result = self._balanced_split(dataset)
        else:
            raise ValueError(f"Unknown split strategy: {self.config.strategy}")

        # Calculate comprehensive metrics
        split_result.metrics = self._calculate_split_metrics(split_result)
        split_result.original_dataset_size = len(dataset)

        logger.info(
            f"Split completed: Train={len(split_result.train_data)}, "
            f"Val={len(split_result.validation_data)}, Test={len(split_result.test_data)}"
        )
        logger.info(
            f"Split quality score: {split_result.metrics.split_quality_score:.3f}"
        )

        return split_result

    def _random_split(self, dataset: List[Any]) -> DatasetSplit:
        """Simple random splitting"""
        logger.info("Applying random split strategy")

        # Shuffle dataset
        shuffled_dataset = dataset.copy()
        random.shuffle(shuffled_dataset)

        # Calculate split sizes
        total_size = len(dataset)
        train_size = int(total_size * self.config.train_ratio)
        validation_size = int(total_size * self.config.validation_ratio)

        # Split dataset
        train_data = shuffled_dataset[:train_size]
        validation_data = shuffled_dataset[train_size : train_size + validation_size]
        test_data = shuffled_dataset[train_size + validation_size :]

        return DatasetSplit(
            train_data=train_data,
            validation_data=validation_data,
            test_data=test_data,
            config=self.config,
        )

    def _stratified_split(self, dataset: List[Any]) -> DatasetSplit:
        """Stratified splitting by category"""
        logger.info("Applying stratified split strategy")

        # Group by category
        category_groups = self._group_by_category(dataset)

        train_data = []
        validation_data = []
        test_data = []

        # Split each category proportionally
        for _category, items in category_groups.items():
            category_train, category_val, category_test = self._split_category_items(
                items
            )
            train_data.extend(category_train)
            validation_data.extend(category_val)
            test_data.extend(category_test)

        # Shuffle final splits
        random.shuffle(train_data)
        random.shuffle(validation_data)
        random.shuffle(test_data)

        return DatasetSplit(
            train_data=train_data,
            validation_data=validation_data,
            test_data=test_data,
            config=self.config,
        )

    def _quality_aware_split(self, dataset: List[Any]) -> DatasetSplit:
        """Quality-aware stratified splitting"""
        logger.info("Applying quality-aware split strategy")

        # Group by category and quality level
        stratified_groups = self._group_by_category_and_quality(dataset)

        train_data = []
        validation_data = []
        test_data = []

        # Split each group proportionally
        for (_category, _quality_level), items in stratified_groups.items():
            if len(items) >= 3:  # Ensure we can split into 3 sets
                group_train, group_val, group_test = self._split_category_items(items)
                train_data.extend(group_train)
                validation_data.extend(group_val)
                test_data.extend(group_test)
            else:
                # For very small groups, add to training set
                train_data.extend(items)

        # Shuffle final splits
        random.shuffle(train_data)
        random.shuffle(validation_data)
        random.shuffle(test_data)

        return DatasetSplit(
            train_data=train_data,
            validation_data=validation_data,
            test_data=test_data,
            config=self.config,
        )

    def _balanced_split(self, dataset: List[Any]) -> DatasetSplit:
        """Balanced splitting across all dimensions"""
        logger.info("Applying balanced split strategy")

        # Start with quality-aware split
        initial_split = self._quality_aware_split(dataset)

        # Apply additional balancing if needed
        # This is a placeholder for more sophisticated balancing algorithms
        # that could consider diversity features, temporal distribution, etc.

        return initial_split

    def _group_by_category(self, dataset: List[Any]) -> Dict[str, List[Any]]:
        """Group dataset items by category"""
        category_groups = {}

        for item in dataset:
            category = getattr(item, "category", "unknown")
            if isinstance(category, str):
                category_name = category
            else:
                # Handle category objects with category_name attribute
                category_name = getattr(category, "category_name", str(category))

            if category_name not in category_groups:
                category_groups[category_name] = []
            category_groups[category_name].append(item)

        logger.info(
            f"Grouped into {len(category_groups)} categories: {list(category_groups.keys())}"
        )
        return category_groups

    def _group_by_category_and_quality(
        self, dataset: List[Any]
    ) -> Dict[Tuple[str, str], List[Any]]:
        """Group dataset items by category and quality level"""
        stratified_groups = {}

        for item in dataset:
            # Get category
            category = getattr(item, "category", "unknown")
            if isinstance(category, str):
                category_name = category
            else:
                category_name = getattr(category, "category_name", str(category))

            # Get quality level
            quality_score = getattr(item, "quality_score", 0.8)
            quality_level = self._get_quality_level(quality_score)

            key = (category_name, quality_level.value)
            if key not in stratified_groups:
                stratified_groups[key] = []
            stratified_groups[key].append(item)

        logger.info(f"Created {len(stratified_groups)} stratified groups")
        return stratified_groups

    def _get_quality_level(self, quality_score: float) -> QualityLevel:
        """Determine quality level from quality score"""
        if quality_score >= 0.9:
            return QualityLevel.HIGH
        elif quality_score >= 0.8:
            return QualityLevel.MEDIUM_HIGH
        elif quality_score >= 0.7:
            return QualityLevel.MEDIUM
        elif quality_score >= 0.6:
            return QualityLevel.MEDIUM_LOW
        else:
            return QualityLevel.LOW

    def _split_category_items(
        self, items: List[Any]
    ) -> Tuple[List[Any], List[Any], List[Any]]:
        """Split a category's items into train/validation/test"""
        # Shuffle items
        shuffled_items = items.copy()
        random.shuffle(shuffled_items)

        # Calculate split sizes
        total_size = len(items)
        train_size = max(1, int(total_size * self.config.train_ratio))
        validation_size = max(1, int(total_size * self.config.validation_ratio))

        # Ensure we don't exceed total size
        if train_size + validation_size >= total_size:
            if total_size >= 3:
                train_size = total_size - 2
                validation_size = 1
            else:
                train_size = total_size
                validation_size = 0

        # Split items
        train_items = shuffled_items[:train_size]
        validation_items = shuffled_items[train_size : train_size + validation_size]
        test_items = shuffled_items[train_size + validation_size :]

        return train_items, validation_items, test_items

    def _calculate_split_metrics(self, split: DatasetSplit) -> SplitMetrics:
        """Calculate comprehensive metrics for the split"""
        metrics = SplitMetrics()

        # Basic size metrics
        metrics.train_size = len(split.train_data)
        metrics.validation_size = len(split.validation_data)
        metrics.test_size = len(split.test_data)

        # Category distribution metrics
        metrics.train_category_distribution = self._calculate_category_distribution(
            split.train_data
        )
        metrics.validation_category_distribution = (
            self._calculate_category_distribution(split.validation_data)
        )
        metrics.test_category_distribution = self._calculate_category_distribution(
            split.test_data
        )
        metrics.category_balance_score = self._calculate_category_balance_score(metrics)

        # Quality distribution metrics
        metrics.train_quality_stats = self._calculate_quality_stats(split.train_data)
        metrics.validation_quality_stats = self._calculate_quality_stats(
            split.validation_data
        )
        metrics.test_quality_stats = self._calculate_quality_stats(split.test_data)
        metrics.quality_balance_score = self._calculate_quality_balance_score(metrics)

        # Diversity metrics
        metrics.train_diversity_score = self._calculate_diversity_score(
            split.train_data
        )
        metrics.validation_diversity_score = self._calculate_diversity_score(
            split.validation_data
        )
        metrics.test_diversity_score = self._calculate_diversity_score(split.test_data)

        # Overall split quality score
        metrics.split_quality_score = self._calculate_overall_split_quality(metrics)

        return metrics

    def _calculate_category_distribution(self, data: List[Any]) -> Dict[str, float]:
        """Calculate category distribution for a dataset split"""
        if not data:
            return {}

        category_counts = {}
        for item in data:
            category = getattr(item, "category", "unknown")
            if isinstance(category, str):
                category_name = category
            else:
                category_name = getattr(category, "category_name", str(category))

            category_counts[category_name] = category_counts.get(category_name, 0) + 1

        # Convert to percentages
        total_items = len(data)
        return {cat: count / total_items for cat, count in category_counts.items()}

    def _calculate_quality_stats(self, data: List[Any]) -> Dict[str, float]:
        """Calculate quality statistics for a dataset split"""
        if not data:
            return {}

        quality_scores = [getattr(item, "quality_score", 0.8) for item in data]

        return {
            "mean": statistics.mean(quality_scores),
            "median": statistics.median(quality_scores),
            "std": statistics.stdev(quality_scores) if len(quality_scores) > 1 else 0.0,
            "min": min(quality_scores),
            "max": max(quality_scores),
        }

    def _calculate_diversity_score(self, data: List[Any]) -> float:
        """Calculate diversity score for a dataset split"""
        if not data:
            return 0.0

        # Simple diversity calculation based on unique features
        all_features = set()
        for item in data:
            features = getattr(item, "diversity_features", set())
            if isinstance(features, (list, tuple)):
                features = set(features)
            all_features.update(features)

        # Normalize by data size
        return min(1.0, len(all_features) / max(1, len(data) * 0.1))

    def _calculate_category_balance_score(self, metrics: SplitMetrics) -> float:
        """Calculate how well categories are balanced across splits"""
        if not metrics.train_category_distribution:
            return 0.0

        # Compare distributions across splits
        all_categories = set()
        all_categories.update(metrics.train_category_distribution.keys())
        all_categories.update(metrics.validation_category_distribution.keys())
        all_categories.update(metrics.test_category_distribution.keys())

        deviations = []
        for category in all_categories:
            train_pct = metrics.train_category_distribution.get(category, 0.0)
            val_pct = metrics.validation_category_distribution.get(category, 0.0)
            test_pct = metrics.test_category_distribution.get(category, 0.0)

            # Calculate variance in category percentages across splits
            category_variance = statistics.variance([train_pct, val_pct, test_pct])
            deviations.append(category_variance)

        # Higher score = better balance (lower variance)
        avg_deviation = statistics.mean(deviations) if deviations else 0.0
        return max(0.0, 1.0 - avg_deviation * 10)  # Scale and invert

    def _calculate_quality_balance_score(self, metrics: SplitMetrics) -> float:
        """Calculate how well quality is balanced across splits"""
        train_mean = metrics.train_quality_stats.get("mean", 0.0)
        val_mean = metrics.validation_quality_stats.get("mean", 0.0)
        test_mean = metrics.test_quality_stats.get("mean", 0.0)

        if train_mean == 0.0 and val_mean == 0.0 and test_mean == 0.0:
            return 0.0

        # Calculate variance in quality means across splits
        quality_variance = statistics.variance([train_mean, val_mean, test_mean])

        # Higher score = better balance (lower variance)
        return max(0.0, 1.0 - quality_variance * 20)  # Scale and invert

    def _calculate_overall_split_quality(self, metrics: SplitMetrics) -> float:
        """Calculate overall split quality score"""
        # Weighted combination of different quality aspects
        weights = {
            "category_balance": 0.4,
            "quality_balance": 0.3,
            "diversity": 0.2,
            "size_balance": 0.1,
        }

        # Size balance score (how close splits are to target ratios)
        total_size = metrics.train_size + metrics.validation_size + metrics.test_size
        if total_size == 0:
            return 0.0

        actual_train_ratio = metrics.train_size / total_size
        actual_val_ratio = metrics.validation_size / total_size
        actual_test_ratio = metrics.test_size / total_size

        size_deviations = [
            abs(actual_train_ratio - self.config.train_ratio),
            abs(actual_val_ratio - self.config.validation_ratio),
            abs(actual_test_ratio - self.config.test_ratio),
        ]
        size_balance_score = max(0.0, 1.0 - statistics.mean(size_deviations) * 10)

        # Average diversity score
        avg_diversity = (
            metrics.train_diversity_score
            + metrics.validation_diversity_score
            + metrics.test_diversity_score
        ) / 3.0

        # Calculate weighted score
        overall_score = (
            weights["category_balance"] * metrics.category_balance_score
            + weights["quality_balance"] * metrics.quality_balance_score
            + weights["diversity"] * avg_diversity
            + weights["size_balance"] * size_balance_score
        )

        return overall_score

    def export_splits(self, split: DatasetSplit, output_dir: str) -> Dict[str, str]:
        """Export train/validation/test splits to files"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_paths = {}

        # Export each split
        splits = {
            "train": split.train_data,
            "validation": split.validation_data,
            "test": split.test_data,
        }

        for split_name, split_data in splits.items():
            # JSON format
            json_path = output_dir / f"{split_name}_split_{timestamp}.json"
            self._export_split_json(split_data, json_path)
            output_paths[f"{split_name}_json"] = str(json_path)

            # JSONL format
            jsonl_path = output_dir / f"{split_name}_split_{timestamp}.jsonl"
            self._export_split_jsonl(split_data, jsonl_path)
            output_paths[f"{split_name}_jsonl"] = str(jsonl_path)

        # Export metrics
        metrics_path = output_dir / f"split_metrics_{timestamp}.json"
        self._export_metrics(split, metrics_path)
        output_paths["metrics"] = str(metrics_path)

        logger.info(f"Exported splits to {len(output_paths)} files in {output_dir}")
        return output_paths

    def _export_split_json(self, split_data: List[Any], output_path: Path):
        """Export split data as JSON"""
        export_data = []
        for item in split_data:
            item_data = {
                "id": getattr(item, "id", getattr(item, "item_id", "unknown")),
                "content": getattr(item, "content", ""),
                "category": getattr(item, "category", "unknown"),
                "quality_score": getattr(item, "quality_score", 0.0),
                "metadata": getattr(item, "metadata", {}),
            }
            export_data.append(item_data)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

    def _export_split_jsonl(self, split_data: List[Any], output_path: Path):
        """Export split data as JSONL"""
        with open(output_path, "w", encoding="utf-8") as f:
            for item in split_data:
                item_data = {
                    "id": getattr(item, "id", getattr(item, "item_id", "unknown")),
                    "content": getattr(item, "content", ""),
                    "category": getattr(item, "category", "unknown"),
                    "quality_score": getattr(item, "quality_score", 0.0),
                    "metadata": getattr(item, "metadata", {}),
                }
                f.write(json.dumps(item_data, ensure_ascii=False) + "\n")

    def _export_metrics(self, split: DatasetSplit, output_path: Path):
        """Export split metrics"""
        metrics_data = {
            "split_config": {
                "train_ratio": split.config.train_ratio,
                "validation_ratio": split.config.validation_ratio,
                "test_ratio": split.config.test_ratio,
                "strategy": split.config.strategy.value,
            },
            "split_sizes": {
                "train": split.metrics.train_size,
                "validation": split.metrics.validation_size,
                "test": split.metrics.test_size,
                "original": split.original_dataset_size,
            },
            "category_distributions": {
                "train": split.metrics.train_category_distribution,
                "validation": split.metrics.validation_category_distribution,
                "test": split.metrics.test_category_distribution,
            },
            "quality_statistics": {
                "train": split.metrics.train_quality_stats,
                "validation": split.metrics.validation_quality_stats,
                "test": split.metrics.test_quality_stats,
            },
            "quality_scores": {
                "category_balance_score": split.metrics.category_balance_score,
                "quality_balance_score": split.metrics.quality_balance_score,
                "split_quality_score": split.metrics.split_quality_score,
            },
            "diversity_scores": {
                "train": split.metrics.train_diversity_score,
                "validation": split.metrics.validation_diversity_score,
                "test": split.metrics.test_diversity_score,
            },
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(metrics_data, f, indent=2, ensure_ascii=False)

    def generate_split_report(self, split: DatasetSplit) -> str:
        """Generate human-readable split report"""
        report_lines = [
            "Train/Validation/Test Split Report",
            "=" * 50,
            f"Split Strategy: {split.config.strategy.value}",
            f"Split Timestamp: {split.split_timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "Dataset Sizes:",
            f"  Original Dataset: {split.original_dataset_size:,} items",
            f"  Training Set: {split.metrics.train_size:,} items ({split.metrics.train_size/split.original_dataset_size:.1%})",
            f"  Validation Set: {split.metrics.validation_size:,} items ({split.metrics.validation_size/split.original_dataset_size:.1%})",
            f"  Test Set: {split.metrics.test_size:,} items ({split.metrics.test_size/split.original_dataset_size:.1%})",
            "",
            "Target vs Actual Ratios:",
            f"  Training: {split.config.train_ratio:.1%} target vs {split.metrics.train_size/split.original_dataset_size:.1%} actual",
            f"  Validation: {split.config.validation_ratio:.1%} target vs {split.metrics.validation_size/split.original_dataset_size:.1%} actual",
            f"  Test: {split.config.test_ratio:.1%} target vs {split.metrics.test_size/split.original_dataset_size:.1%} actual",
            "",
            "Quality Metrics:",
            f"  Category Balance Score: {split.metrics.category_balance_score:.3f}",
            f"  Quality Balance Score: {split.metrics.quality_balance_score:.3f}",
            f"  Overall Split Quality: {split.metrics.split_quality_score:.3f}",
            "",
            "Quality Statistics:",
            f"  Training Set Mean Quality: {split.metrics.train_quality_stats.get('mean', 0):.3f}",
            f"  Validation Set Mean Quality: {split.metrics.validation_quality_stats.get('mean', 0):.3f}",
            f"  Test Set Mean Quality: {split.metrics.test_quality_stats.get('mean', 0):.3f}",
        ]

        # Add category distribution
        if split.metrics.train_category_distribution:
            report_lines.extend(["", "Category Distribution:"])
            all_categories = set()
            all_categories.update(split.metrics.train_category_distribution.keys())
            all_categories.update(split.metrics.validation_category_distribution.keys())
            all_categories.update(split.metrics.test_category_distribution.keys())

            for category in sorted(all_categories):
                train_pct = split.metrics.train_category_distribution.get(category, 0.0)
                val_pct = split.metrics.validation_category_distribution.get(
                    category, 0.0
                )
                test_pct = split.metrics.test_category_distribution.get(category, 0.0)
                report_lines.append(
                    f"  {category}: Train={train_pct:.1%}, Val={val_pct:.1%}, Test={test_pct:.1%}"
                )

        return "\n".join(report_lines)


def create_mock_dataset_for_splitting(size: int = 1000) -> List[Any]:
    """Create mock dataset for testing split functionality"""
    import random

    class MockItem:
        def __init__(self, item_id, category, quality_score):
            self.id = item_id
            self.item_id = item_id
            self.content = f"Mock content for {category} item {item_id}"
            self.category = category
            self.quality_score = quality_score
            self.metadata = {"source": "mock", "type": "testing"}
            self.diversity_features = set(
                random.sample(
                    ["feature1", "feature2", "feature3", "feature4", "feature5"],
                    random.randint(1, 3),
                )
            )

    categories = [
        "clinical_conversations",
        "psychology_knowledge",
        "voice_derived_data",
        "edge_cases",
    ]
    mock_data = []

    for i in range(size):
        category = random.choice(categories)
        # Create realistic quality distribution
        quality_score = random.gauss(0.8, 0.1)  # Normal distribution around 0.8
        quality_score = max(0.5, min(1.0, quality_score))  # Clamp to valid range

        item = MockItem(f"mock_{i:05d}", category, quality_score)
        mock_data.append(item)

    return mock_data


def main():
    """Main function for testing train/validation/test splitter"""
    print("Testing Train/Validation/Test Split Generation System")
    print("=" * 60)

    # Create test configuration
    config = SplitConfig(
        train_ratio=0.70,
        validation_ratio=0.15,
        test_ratio=0.15,
        strategy=SplitStrategy.QUALITY_AWARE,
        preserve_category_balance=True,
        random_seed=42,
    )

    # Initialize splitter
    splitter = TrainValidationTestSplitter(config)

    # Create mock dataset
    print("Creating mock dataset...")
    dataset = create_mock_dataset_for_splitting(1000)
    print(f"Created dataset with {len(dataset)} items")

    # Perform split
    print("\nPerforming dataset split...")
    split_result = splitter.split_dataset(dataset, "test_dataset")

    # Display results
    print("\nSplit Results:")
    print(f"Training set: {len(split_result.train_data)} items")
    print(f"Validation set: {len(split_result.validation_data)} items")
    print(f"Test set: {len(split_result.test_data)} items")
    print(f"Split quality score: {split_result.metrics.split_quality_score:.3f}")

    # Generate and display report
    report = splitter.generate_split_report(split_result)
    print(f"\n{report}")

    # Export splits
    print("\nExporting splits...")
    output_paths = splitter.export_splits(split_result, "dataset_splits")
    print(f"Exported to {len(output_paths)} files:")
    for file_type, path in output_paths.items():
        print(f"  {file_type}: {path}")

    return split_result


if __name__ == "__main__":
    main()
