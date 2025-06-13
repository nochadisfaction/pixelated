#!/usr/bin/env python3
"""
Production Dataset Generation Pipeline - Task 6.4

This module provides a comprehensive production-ready pipeline that orchestrates
all existing dataset processing components to generate high-quality, balanced
datasets for mental health AI training.

Key Features:
- Orchestrates all data loaders (local, psychology, edge case, voice)
- Applies standardization and quality assessment
- Implements categorization and ratio balancing
- Provides comprehensive validation and QA
- Generates production-ready training datasets
- Includes monitoring, logging, and error handling
- Supports different pipeline configurations for various use cases
"""

import json
import logging
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

# Import all existing pipeline components
try:
    from dataset_categorization_system import (
        DatasetCategorizationSystem,
    )
    from deduplication_system import DeduplicationSystem
    from edge_case_loader import EdgeCaseLoader
    from local_loader import LocalDataLoader
    from psychology_loader import PsychologyLoader
    from quality_filtering_system import QualityFilteringSystem
    from ratio_balancing_algorithms import (
        BalancingConfig,
        BalancingStrategy,
        RatioBalancingAlgorithms,
    )
    from voice_processor import VoiceProcessor

    from dataset_validation_qa import (
        DatasetValidationQASystem,
        QualityStandard,
        ValidationConfig,
    )
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Some components not available for import: {e}")

    # Mock classes for testing/development
    class MockLoader:
        def load_data(self):
            return []

    LocalDataLoader = MockLoader
    PsychologyLoader = MockLoader
    EdgeCaseLoader = MockLoader
    VoiceProcessor = MockLoader


class PipelineStage(Enum):
    """Pipeline execution stages"""

    INITIALIZATION = "initialization"
    DATA_LOADING = "data_loading"
    QUALITY_FILTERING = "quality_filtering"
    DEDUPLICATION = "deduplication"
    CATEGORIZATION = "categorization"
    RATIO_BALANCING = "ratio_balancing"
    VALIDATION = "validation"
    EXPORT = "export"
    COMPLETE = "complete"


class PipelineMode(Enum):
    """Production pipeline modes"""

    FULL_PRODUCTION = "full_production"  # All data sources, full validation
    PSYCHOLOGY_ONLY = "psychology_only"  # Psychology knowledge only
    VOICE_ONLY = "voice_only"  # Voice data only
    CLINICAL_FOCUS = "clinical_focus"  # Clinical conversations focus
    TESTING = "testing"  # Small dataset for testing
    DEVELOPMENT = "development"  # Development mode with mock data


@dataclass
class PipelineConfig:
    """Configuration for production dataset generation pipeline"""

    mode: PipelineMode = PipelineMode.FULL_PRODUCTION
    target_dataset_size: int = 50000
    output_directory: str = "production_datasets"
    enable_voice_processing: bool = True
    enable_psychology_processing: bool = True
    enable_edge_case_processing: bool = True
    enable_local_data_processing: bool = True

    # Quality thresholds
    min_overall_quality: float = 0.7
    min_clinical_accuracy: float = 0.75
    min_conversation_quality: float = 0.65

    # Ratio configuration
    target_ratios: Dict[str, float] = field(
        default_factory=lambda: {
            "clinical_conversations": 0.30,
            "psychology_knowledge": 0.25,
            "voice_derived_data": 0.20,
            "edge_cases": 0.15,
            "general_mental_health": 0.10,
        }
    )

    # Balancing configuration
    balancing_strategy: BalancingStrategy = BalancingStrategy.QUALITY_WEIGHTED
    diversity_weight: float = 0.3
    max_balancing_iterations: int = 10

    # Validation configuration
    quality_standard: QualityStandard = QualityStandard.TRAINING
    validation_enabled: bool = True
    comprehensive_validation: bool = True

    # Performance configuration
    batch_size: int = 1000
    parallel_processing: bool = True
    max_workers: int = 4
    memory_limit_gb: int = 8

    # Output configuration
    save_intermediate_results: bool = True
    generate_reports: bool = True
    export_formats: List[str] = field(default_factory=lambda: ["jsonl", "json", "csv"])


@dataclass
class PipelineMetrics:
    """Metrics tracking for pipeline execution"""

    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    total_execution_time: float = 0.0

    # Data metrics
    raw_data_loaded: int = 0
    items_after_filtering: int = 0
    items_after_deduplication: int = 0
    final_dataset_size: int = 0

    # Quality metrics
    average_quality_score: float = 0.0
    quality_distribution: Dict[str, int] = field(default_factory=dict)

    # Category metrics
    category_distribution: Dict[str, int] = field(default_factory=dict)
    achieved_ratios: Dict[str, float] = field(default_factory=dict)

    # Processing metrics
    processing_rates: Dict[str, float] = field(default_factory=dict)
    error_counts: Dict[str, int] = field(default_factory=dict)

    def calculate_execution_time(self):
        """Calculate total execution time"""
        if self.end_time:
            self.total_execution_time = (
                self.end_time - self.start_time
            ).total_seconds()


@dataclass
class PipelineResult:
    """Result of production dataset generation pipeline"""

    success: bool = False
    dataset: List[Any] = field(default_factory=list)
    config: PipelineConfig = field(default_factory=PipelineConfig)
    metrics: PipelineMetrics = field(default_factory=PipelineMetrics)
    validation_result: Optional[Any] = None
    output_paths: Dict[str, str] = field(default_factory=dict)
    error_log: List[str] = field(default_factory=list)
    stage_results: Dict[str, Any] = field(default_factory=dict)


class ProductionDatasetGenerator:
    """
    Comprehensive production dataset generation pipeline.

    Orchestrates all dataset processing components to generate high-quality,
    balanced datasets for mental health AI training.
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        """Initialize production dataset generator"""
        self.config = config or PipelineConfig()
        self.logger = self._setup_logging()
        self.current_stage = PipelineStage.INITIALIZATION

        # Initialize components based on configuration
        self._initialize_components()

        self.logger.info(
            f"Initialized production dataset generator with mode: {self.config.mode.value}"
        )

    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging for pipeline"""
        logger = logging.getLogger(
            f"production_pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        logger.setLevel(logging.INFO)

        # Create formatters
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # File handler
        log_file = Path(self.config.output_directory) / "pipeline.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        return logger

    def _initialize_components(self):
        """Initialize all pipeline components"""
        try:
            # Data loaders
            if self.config.enable_local_data_processing:
                self.local_loader = LocalDataLoader()

            if self.config.enable_psychology_processing:
                self.psychology_loader = PsychologyLoader()

            if self.config.enable_edge_case_processing:
                self.edge_case_loader = EdgeCaseLoader()

            if self.config.enable_voice_processing:
                self.voice_processor = VoiceProcessor()

            # Quality and filtering systems
            self.quality_filter = QualityFilteringSystem()
            self.deduplication_system = DeduplicationSystem()

            # Categorization and balancing
            self.categorization_system = DatasetCategorizationSystem()

            balancing_config = BalancingConfig(
                strategy=self.config.balancing_strategy,
                target_ratios=self.config.target_ratios,
                min_quality_threshold=self.config.min_overall_quality,
                diversity_weight=self.config.diversity_weight,
                max_iterations=self.config.max_balancing_iterations,
            )
            self.ratio_balancer = RatioBalancingAlgorithms(balancing_config)

            # Validation system
            validation_config = ValidationConfig(
                quality_standard=self.config.quality_standard,
                min_overall_quality=self.config.min_overall_quality,
                min_clinical_accuracy=self.config.min_clinical_accuracy,
            )
            self.validator = DatasetValidationQASystem(validation_config)

            self.logger.info("All pipeline components initialized successfully")

        except Exception as e:
            self.logger.error(f"Error initializing components: {e}")
            raise

    def generate_production_dataset(self) -> PipelineResult:
        """
        Generate production-ready dataset using complete pipeline.

        Returns:
            PipelineResult with generated dataset and comprehensive metrics
        """
        result = PipelineResult(config=self.config)
        metrics = PipelineMetrics()

        try:
            self.logger.info(
                f"Starting production dataset generation - Mode: {self.config.mode.value}"
            )
            self.logger.info(f"Target size: {self.config.target_dataset_size:,} items")

            # Stage 1: Data Loading
            self.current_stage = PipelineStage.DATA_LOADING
            raw_dataset = self._load_all_data(result, metrics)
            metrics.raw_data_loaded = len(raw_dataset)
            self.logger.info(f"Loaded {len(raw_dataset):,} raw data items")

            # Stage 2: Quality Filtering
            self.current_stage = PipelineStage.QUALITY_FILTERING
            filtered_dataset = self._apply_quality_filtering(
                raw_dataset, result, metrics
            )
            metrics.items_after_filtering = len(filtered_dataset)
            self.logger.info(
                f"After quality filtering: {len(filtered_dataset):,} items"
            )

            # Stage 3: Deduplication
            self.current_stage = PipelineStage.DEDUPLICATION
            deduplicated_dataset = self._apply_deduplication(
                filtered_dataset, result, metrics
            )
            metrics.items_after_deduplication = len(deduplicated_dataset)
            self.logger.info(
                f"After deduplication: {len(deduplicated_dataset):,} items"
            )

            # Stage 4: Categorization
            self.current_stage = PipelineStage.CATEGORIZATION
            categorized_dataset = self._apply_categorization(
                deduplicated_dataset, result, metrics
            )
            self.logger.info(
                f"Categorization completed: {len(categorized_dataset):,} items"
            )

            # Stage 5: Ratio Balancing
            self.current_stage = PipelineStage.RATIO_BALANCING
            balanced_dataset = self._apply_ratio_balancing(
                categorized_dataset, result, metrics
            )
            metrics.final_dataset_size = len(balanced_dataset)
            self.logger.info(f"After ratio balancing: {len(balanced_dataset):,} items")

            # Stage 6: Comprehensive Validation
            if self.config.validation_enabled:
                self.current_stage = PipelineStage.VALIDATION
                validation_result = self._apply_comprehensive_validation(
                    balanced_dataset, result, metrics
                )
                result.validation_result = validation_result
                self.logger.info(
                    f"Validation completed - Status: {'PASSED' if validation_result.is_valid else 'FAILED'}"
                )

            # Stage 7: Export and Reporting
            self.current_stage = PipelineStage.EXPORT
            output_paths = self._export_dataset(balanced_dataset, result, metrics)
            result.output_paths = output_paths

            # Finalize results
            result.dataset = balanced_dataset
            self._extracted_from_generate_production_dataset_78(True, result, metrics)
            self.current_stage = PipelineStage.COMPLETE
            self.logger.info(
                f"Production dataset generation completed successfully in {metrics.total_execution_time:.2f} seconds"
            )

        except Exception as e:
            self.logger.error(
                f"Pipeline failed at stage {self.current_stage.value}: {e}"
            )
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            result.error_log.append(f"Stage {self.current_stage.value}: {str(e)}")
            self._extracted_from_generate_production_dataset_78(False, result, metrics)
        return result

    # TODO Rename this here and in `generate_production_dataset`
    def _extracted_from_generate_production_dataset_78(self, arg0, result, metrics):
        result.success = arg0
        metrics.end_time = datetime.now()
        metrics.calculate_execution_time()
        result.metrics = metrics

    def _load_all_data(
        self, result: PipelineResult, metrics: PipelineMetrics
    ) -> List[Any]:
        """Load data from all configured sources"""
        all_data = []
        start_time = time.time()

        try:
            # Load from different sources based on configuration
            if self.config.enable_local_data_processing and hasattr(
                self, "local_loader"
            ):
                self.logger.info("Loading local mental health data...")
                local_data = self._load_with_error_handling("local_loader", result)
                all_data.extend(local_data)
                self.logger.info(f"Loaded {len(local_data):,} items from local sources")

            if self.config.enable_psychology_processing and hasattr(
                self, "psychology_loader"
            ):
                self.logger.info("Loading psychology knowledge data...")
                psychology_data = self._load_with_error_handling(
                    "psychology_loader", result
                )
                all_data.extend(psychology_data)
                self.logger.info(
                    f"Loaded {len(psychology_data):,} items from psychology sources"
                )

            if self.config.enable_edge_case_processing and hasattr(
                self, "edge_case_loader"
            ):
                self.logger.info("Loading edge case scenarios...")
                edge_case_data = self._load_with_error_handling(
                    "edge_case_loader", result
                )
                all_data.extend(edge_case_data)
                self.logger.info(
                    f"Loaded {len(edge_case_data):,} items from edge case sources"
                )

            if self.config.enable_voice_processing and hasattr(self, "voice_processor"):
                self.logger.info("Processing voice-derived data...")
                voice_data = self._load_with_error_handling("voice_processor", result)
                all_data.extend(voice_data)
                self.logger.info(
                    f"Processed {len(voice_data):,} items from voice sources"
                )

            # Handle testing/development modes
            if self.config.mode == PipelineMode.TESTING or not all_data:
                self.logger.info("Generating mock data for testing...")
                mock_data = self._generate_mock_data()
                all_data.extend(mock_data)
                self.logger.info(f"Generated {len(mock_data):,} mock items")

        except Exception as e:
            self.logger.error(f"Error during data loading: {e}")
            result.error_log.append(f"Data loading error: {str(e)}")

        processing_time = time.time() - start_time
        metrics.processing_rates["data_loading"] = (
            len(all_data) / processing_time if processing_time > 0 else 0
        )
        result.stage_results["data_loading"] = {
            "items_loaded": len(all_data),
            "processing_time": processing_time,
            "sources_used": self._get_enabled_sources(),
        }

        return all_data

    def _load_with_error_handling(
        self, loader_name: str, result: PipelineResult
    ) -> List[Any]:
        """Load data with comprehensive error handling"""
        try:
            loader = getattr(self, loader_name)
            if hasattr(loader, "load_data"):
                return loader.load_data()
            else:
                # Mock data for testing
                return self._generate_mock_data_for_source(loader_name)
        except Exception as e:
            self.logger.warning(f"Error loading from {loader_name}: {e}")
            result.error_log.append(f"{loader_name} error: {str(e)}")
            return []

    def _apply_quality_filtering(
        self, dataset: List[Any], result: PipelineResult, metrics: PipelineMetrics
    ) -> List[Any]:
        """Apply comprehensive quality filtering"""
        start_time = time.time()

        try:
            if hasattr(self, "quality_filter"):
                filtered_data = self.quality_filter.filter_dataset(dataset)
            else:
                # Simple quality filtering for testing
                filtered_data = [
                    item
                    for item in dataset
                    if getattr(item, "quality_score", 0.8)
                    >= self.config.min_overall_quality
                ]

            processing_time = time.time() - start_time
            metrics.processing_rates["quality_filtering"] = (
                len(filtered_data) / processing_time if processing_time > 0 else 0
            )

            result.stage_results["quality_filtering"] = {
                "items_before": len(dataset),
                "items_after": len(filtered_data),
                "items_removed": len(dataset) - len(filtered_data),
                "processing_time": processing_time,
            }

            return filtered_data

        except Exception as e:
            self.logger.error(f"Error during quality filtering: {e}")
            result.error_log.append(f"Quality filtering error: {str(e)}")
            return dataset  # Return original dataset if filtering fails

    def _apply_deduplication(
        self, dataset: List[Any], result: PipelineResult, metrics: PipelineMetrics
    ) -> List[Any]:
        """Apply deduplication to remove similar items"""
        start_time = time.time()

        try:
            if hasattr(self, "deduplication_system"):
                deduplicated_data = self.deduplication_system.deduplicate_dataset(
                    dataset
                )
            else:
                # Simple deduplication based on content similarity
                seen_content = set()
                deduplicated_data = []
                for item in dataset:
                    content_hash = hash(str(getattr(item, "content", "")))
                    if content_hash not in seen_content:
                        seen_content.add(content_hash)
                        deduplicated_data.append(item)

            processing_time = time.time() - start_time
            metrics.processing_rates["deduplication"] = (
                len(deduplicated_data) / processing_time if processing_time > 0 else 0
            )

            result.stage_results["deduplication"] = {
                "items_before": len(dataset),
                "items_after": len(deduplicated_data),
                "duplicates_removed": len(dataset) - len(deduplicated_data),
                "processing_time": processing_time,
            }

            return deduplicated_data

        except Exception as e:
            self.logger.error(f"Error during deduplication: {e}")
            result.error_log.append(f"Deduplication error: {str(e)}")
            return dataset

    def _apply_categorization(
        self, dataset: List[Any], result: PipelineResult, metrics: PipelineMetrics
    ) -> List[Any]:
        """Apply dataset categorization"""
        start_time = time.time()

        try:
            return self._extracted_from__apply_categorization_8(
                dataset, start_time, metrics, result
            )
        except Exception as e:
            self.logger.error(f"Error during categorization: {e}")
            result.error_log.append(f"Categorization error: {str(e)}")
            return dataset

    # TODO Rename this here and in `_apply_categorization`
    def _extracted_from__apply_categorization_8(self, dataset, start_time, metrics, result):
        if hasattr(self, "categorization_system"):
            categorized_data = self.categorization_system.categorize_dataset(
                dataset
            )
        else:
            # Simple categorization for testing
            categorized_data = dataset
            for i, item in enumerate(categorized_data):
                # Assign categories based on simple rules
                if not hasattr(item, "category"):
                    categories = list(self.config.target_ratios.keys())
                    item.category = categories[i % len(categories)]

        processing_time = time.time() - start_time
        metrics.processing_rates["categorization"] = (
            len(categorized_data) / processing_time if processing_time > 0 else 0
        )

        # Calculate category distribution
        category_counts = {}
        for item in categorized_data:
            category = getattr(item, "category", "unknown")
            category_counts[category] = category_counts.get(category, 0) + 1

        metrics.category_distribution = category_counts

        result.stage_results["categorization"] = {
            "items_processed": len(categorized_data),
            "category_distribution": category_counts,
            "processing_time": processing_time,
        }

        return categorized_data

    def _apply_ratio_balancing(
        self, dataset: List[Any], result: PipelineResult, metrics: PipelineMetrics
    ) -> List[Any]:
        """Apply ratio balancing to achieve target ratios"""
        start_time = time.time()

        try:
            return self._extracted_from__apply_ratio_balancing_8(
                dataset, metrics, start_time, result
            )
        except Exception as e:
            self.logger.error(f"Error during ratio balancing: {e}")
            result.error_log.append(f"Ratio balancing error: {str(e)}")
            return dataset[
                : self.config.target_dataset_size
            ]  # Simple truncation fallback

    # TODO Rename this here and in `_apply_ratio_balancing`
    def _extracted_from__apply_ratio_balancing_8(self, dataset, metrics, start_time, result):
        balanced_result = self.ratio_balancer.balance_dataset(
            dataset, self.config.target_dataset_size
        )
        balanced_data = balanced_result.balanced_dataset

        metrics.achieved_ratios = balanced_result.achieved_ratios

        processing_time = time.time() - start_time
        metrics.processing_rates["ratio_balancing"] = (
            len(balanced_data) / processing_time if processing_time > 0 else 0
        )

        result.stage_results["ratio_balancing"] = {
            "items_before": len(dataset),
            "items_after": len(balanced_data),
            "target_ratios": self.config.target_ratios,
            "achieved_ratios": balanced_result.achieved_ratios,
            "strategy_used": self.config.balancing_strategy.value,
            "processing_time": processing_time,
        }

        return balanced_data

    def _apply_comprehensive_validation(
        self, dataset: List[Any], result: PipelineResult, metrics: PipelineMetrics
    ) -> Any:
        """Apply comprehensive validation and quality assurance"""
        start_time = time.time()

        try:
            validation_result = self.validator.validate_dataset(
                dataset, "production_dataset"
            )

            processing_time = time.time() - start_time
            metrics.processing_rates["validation"] = (
                len(dataset) / processing_time if processing_time > 0 else 0
            )

            result.stage_results["validation"] = {
                "validation_score": validation_result.validation_score,
                "quality_grade": validation_result.quality_grade,
                "is_valid": validation_result.is_valid,
                "issues_found": len(validation_result.issues),
                "processing_time": processing_time,
            }

            return validation_result

        except Exception as e:
            self.logger.error(f"Error during validation: {e}")
            result.error_log.append(f"Validation error: {str(e)}")
            return None

    def _export_dataset(
        self, dataset: List[Any], result: PipelineResult, metrics: PipelineMetrics
    ) -> Dict[str, str]:
        """Export dataset in multiple formats"""
        output_paths = {}
        start_time = time.time()

        try:
            # Create output directory
            output_dir = Path(self.config.output_directory)
            output_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_filename = f"production_dataset_{timestamp}"

            # Export in requested formats
            for format_type in self.config.export_formats:
                if format_type == "jsonl":
                    output_path = output_dir / f"{base_filename}.jsonl"
                    self._export_jsonl(dataset, output_path)
                    output_paths["jsonl"] = str(output_path)

                elif format_type == "json":
                    output_path = output_dir / f"{base_filename}.json"
                    self._export_json(dataset, output_path)
                    output_paths["json"] = str(output_path)

                elif format_type == "csv":
                    output_path = output_dir / f"{base_filename}.csv"
                    self._export_csv(dataset, output_path)
                    output_paths["csv"] = str(output_path)

            # Export metrics and reports
            if self.config.generate_reports:
                metrics_path = output_dir / f"metrics_{timestamp}.json"
                self._export_metrics(result.metrics, metrics_path)
                output_paths["metrics"] = str(metrics_path)

                if result.validation_result:
                    validation_path = output_dir / f"validation_report_{timestamp}.json"
                    self._export_validation_report(
                        result.validation_result, validation_path
                    )
                    output_paths["validation_report"] = str(validation_path)

            processing_time = time.time() - start_time
            metrics.processing_rates["export"] = (
                len(dataset) / processing_time if processing_time > 0 else 0
            )

            result.stage_results["export"] = {
                "formats_exported": list(output_paths.keys()),
                "processing_time": processing_time,
            }

            self.logger.info(f"Dataset exported to {len(output_paths)} formats")

        except Exception as e:
            self.logger.error(f"Error during export: {e}")
            result.error_log.append(f"Export error: {str(e)}")

        return output_paths

    def _export_jsonl(self, dataset: List[Any], output_path: Path):
        """Export dataset as JSONL format"""
        with open(output_path, "w", encoding="utf-8") as f:
            for item in dataset:
                item_data = {
                    "id": getattr(item, "id", getattr(item, "item_id", "unknown")),
                    "content": getattr(item, "content", ""),
                    "category": getattr(item, "category", "unknown"),
                    "quality_score": getattr(item, "quality_score", 0.0),
                    "metadata": getattr(item, "metadata", {}),
                }
                f.write(json.dumps(item_data, ensure_ascii=False) + "\n")

    def _export_json(self, dataset: List[Any], output_path: Path):
        """Export dataset as JSON format"""
        dataset_data = []
        for item in dataset:
            item_data = {
                "id": getattr(item, "id", getattr(item, "item_id", "unknown")),
                "content": getattr(item, "content", ""),
                "category": getattr(item, "category", "unknown"),
                "quality_score": getattr(item, "quality_score", 0.0),
                "metadata": getattr(item, "metadata", {}),
            }
            dataset_data.append(item_data)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(dataset_data, f, indent=2, ensure_ascii=False)

    def _export_csv(self, dataset: List[Any], output_path: Path):
        """Export dataset as CSV format"""
        import csv

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "content", "category", "quality_score", "metadata"])

            for item in dataset:
                writer.writerow(
                    [
                        getattr(item, "id", getattr(item, "item_id", "unknown")),
                        getattr(item, "content", ""),
                        getattr(item, "category", "unknown"),
                        getattr(item, "quality_score", 0.0),
                        json.dumps(getattr(item, "metadata", {})),
                    ]
                )

    def _export_metrics(self, metrics: PipelineMetrics, output_path: Path):
        """Export pipeline metrics"""
        metrics_data = {
            "execution_time": metrics.total_execution_time,
            "data_metrics": {
                "raw_data_loaded": metrics.raw_data_loaded,
                "items_after_filtering": metrics.items_after_filtering,
                "items_after_deduplication": metrics.items_after_deduplication,
                "final_dataset_size": metrics.final_dataset_size,
            },
            "processing_rates": metrics.processing_rates,
            "category_distribution": metrics.category_distribution,
            "achieved_ratios": metrics.achieved_ratios,
            "error_counts": metrics.error_counts,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(metrics_data, f, indent=2, ensure_ascii=False)

    def _export_validation_report(self, validation_result: Any, output_path: Path):
        """Export validation report"""
        if hasattr(validation_result, "__dict__"):
            report_data = validation_result.__dict__.copy()
            # Convert datetime objects to strings
            if "validation_timestamp" in report_data:
                report_data["validation_timestamp"] = report_data[
                    "validation_timestamp"
                ].isoformat()
        else:
            report_data = {"validation_result": str(validation_result)}

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False, default=str)

    def _generate_mock_data(self, size: int = 1000) -> List[Any]:
        """Generate mock data for testing"""
        import secrets

        class MockItem:
            def __init__(self, item_id, category, quality_score):
                self.id = item_id
                self.item_id = item_id
                self.content = (
                    f"Mock therapeutic conversation content for {category} category"
                )
                self.category = category
                self.quality_score = quality_score
                self.metadata = {"source": "mock_generator", "type": "testing"}

        mock_data = []
        categories = list(self.config.target_ratios.keys())

        for i in range(size):
            # Use secrets for cryptographically secure random choice
            category_index = secrets.randbelow(len(categories))
            category = categories[category_index]
            
            # For quality_score, we need a uniform distribution between 0.6 and 1.0
            # secrets doesn't have a uniform method, so we'll create one using randbelow
            quality_score = 0.6 + (secrets.randbelow(4001) / 10000)  # 0.6 to 1.0 with 0.0001 precision
            
            item = MockItem(f"mock_{i:05d}", category, quality_score)
            mock_data.append(item)

        return mock_data

    def _generate_mock_data_for_source(
        self, source_name: str, size: int = 100
    ) -> List[Any]:
        """Generate mock data for specific source"""
        return self._generate_mock_data(size)

    def _get_enabled_sources(self) -> List[str]:
        """Get list of enabled data sources"""
        sources = []
        if self.config.enable_local_data_processing:
            sources.append("local_data")
        if self.config.enable_psychology_processing:
            sources.append("psychology_knowledge")
        if self.config.enable_edge_case_processing:
            sources.append("edge_cases")
        if self.config.enable_voice_processing:
            sources.append("voice_data")
        return sources

    def get_pipeline_status(self) -> Dict[str, Any]:
        """Get current pipeline status"""
        return {
            "current_stage": self.current_stage.value,
            "mode": self.config.mode.value,
            "target_size": self.config.target_dataset_size,
            "enabled_sources": self._get_enabled_sources(),
        }


def create_pipeline_config(
    mode: PipelineMode = PipelineMode.TESTING, target_size: int = 1000
) -> PipelineConfig:
    """Create pipeline configuration for different modes"""

    if mode == PipelineMode.FULL_PRODUCTION:
        return PipelineConfig(
            mode=mode,
            target_dataset_size=50000,
            enable_voice_processing=True,
            enable_psychology_processing=True,
            enable_edge_case_processing=True,
            enable_local_data_processing=True,
            comprehensive_validation=True,
        )

    elif mode == PipelineMode.PSYCHOLOGY_ONLY:
        return PipelineConfig(
            mode=mode,
            target_dataset_size=target_size,
            enable_voice_processing=False,
            enable_psychology_processing=True,
            enable_edge_case_processing=False,
            enable_local_data_processing=False,
            target_ratios={"psychology_knowledge": 1.0},
        )

    elif mode == PipelineMode.TESTING:
        return PipelineConfig(
            mode=mode,
            target_dataset_size=target_size,
            enable_voice_processing=False,
            enable_psychology_processing=False,
            enable_edge_case_processing=False,
            enable_local_data_processing=False,
            comprehensive_validation=True,
            generate_reports=True,
        )

    else:
        return PipelineConfig(mode=mode, target_dataset_size=target_size)


def main():
    """Main function for testing production dataset generator"""
    print("Testing Production Dataset Generation Pipeline")
    print("=" * 60)

    # Create configuration for testing
    config = create_pipeline_config(PipelineMode.TESTING, target_size=500)

    # Initialize generator
    print("Initializing production dataset generator...")
    generator = ProductionDatasetGenerator(config)

    # Generate dataset
    print("\nGenerating production dataset...")
    result = generator.generate_production_dataset()

    # Display results
    print("\nPipeline Results:")
    print(f"Success: {result.success}")
    print(f"Dataset size: {len(result.dataset):,}")
    print(f"Execution time: {result.metrics.total_execution_time:.2f} seconds")

    if result.validation_result:
        print(f"Validation score: {result.validation_result.validation_score:.3f}")
        print(f"Quality grade: {result.validation_result.quality_grade}")

    print("\nStage Results:")
    for stage, stage_result in result.stage_results.items():
        print(f"  {stage}: {stage_result}")

    print("\nOutput files:")
    for format_type, path in result.output_paths.items():
        print(f"  {format_type}: {path}")

    if result.error_log:
        print("\nErrors encountered:")
        for error in result.error_log:
            print(f"  - {error}")

    return result


if __name__ == "__main__":
    main()
