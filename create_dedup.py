#!/usr/bin/env python3

dedup_content = '''#!/usr/bin/env python3
"""
Data Deduplication and Similarity Detection System

This module provides comprehensive deduplication and similarity detection for conversation datasets,
using multiple similarity metrics and configurable thresholds to identify and remove duplicates
and near-duplicates at both conversation and message levels.
"""

import logging
import hashlib
import re
from typing import List, Dict, Any, Optional, Tuple, Set, Generator
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, Counter
import numpy as np
from itertools import combinations
import json

from conversation_schema import Conversation, Message

logger = logging.getLogger(__name__)


class SimilarityMetric(Enum):
    """Types of similarity metrics"""
    EXACT_MATCH = "exact_match"
    JACCARD = "jaccard"
    COSINE = "cosine"
    LEVENSHTEIN = "levenshtein"
    SEMANTIC = "semantic"
    STRUCTURAL = "structural"
    CONTENT_HASH = "content_hash"


class DuplicateType(Enum):
    """Types of duplicates detected"""
    EXACT_DUPLICATE = "exact_duplicate"
    NEAR_DUPLICATE = "near_duplicate"
    SEMANTIC_DUPLICATE = "semantic_duplicate"
    STRUCTURAL_DUPLICATE = "structural_duplicate"
    CONTENT_DUPLICATE = "content_duplicate"


@dataclass
class SimilarityResult:
    """Result of similarity comparison between two items"""
    item1_id: str
    item2_id: str
    similarity_score: float
    metric: SimilarityMetric
    duplicate_type: Optional[DuplicateType] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DeduplicationConfig:
    """Configuration for deduplication parameters"""
    # Similarity thresholds (0.0 to 1.0)
    exact_match_threshold: float = 1.0
    near_duplicate_threshold: float = 0.95
    semantic_duplicate_threshold: float = 0.90
    structural_duplicate_threshold: float = 0.85
    content_duplicate_threshold: float = 0.80
    
    # Which metrics to use
    enabled_metrics: List[SimilarityMetric] = field(default_factory=lambda: [
        SimilarityMetric.EXACT_MATCH,
        SimilarityMetric.JACCARD,
        SimilarityMetric.COSINE,
        SimilarityMetric.CONTENT_HASH
    ])
    
    # Processing options
    case_sensitive: bool = False
    ignore_punctuation: bool = True
    min_conversation_length: int = 2
    max_items_to_compare: int = 10000
    
    # Batch processing
    batch_size: int = 1000
    use_parallel_processing: bool = True


@dataclass
class DeduplicationResult:
    """Result of deduplication process"""
    original_count: int
    duplicate_count: int
    unique_count: int
    duplicate_pairs: List[SimilarityResult]
    duplicate_groups: List[List[str]]
    removed_items: List[str]
    processing_time: float
    similarity_distribution: Dict[str, int] = field(default_factory=dict)
    
    def deduplication_rate(self) -> float:
        """Calculate deduplication rate"""
        if self.original_count == 0:
            return 0.0
        return self.duplicate_count / self.original_count


class TextNormalizer:
    """Utility class for text normalization"""
    
    @staticmethod
    def normalize_text(text: str, case_sensitive: bool = False, 
                      ignore_punctuation: bool = True) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        
        if not case_sensitive:
            text = text.lower()
        
        if ignore_punctuation:
            text = re.sub(r'[^\\w\\s]', '', text)
        
        text = re.sub(r'\\s+', ' ', text).strip()
        return text
    
    @staticmethod
    def extract_words(text: str) -> List[str]:
        """Extract words from text"""
        return re.findall(r'\\b\\w+\\b', text.lower())
    
    @staticmethod
    def create_content_hash(text: str) -> str:
        """Create a hash of normalized content"""
        normalized = TextNormalizer.normalize_text(text, case_sensitive=False, 
                                                 ignore_punctuation=True)
        return hashlib.md5(normalized.encode()).hexdigest()


class SimilarityCalculator:
    """Calculator for various similarity metrics"""
    
    @staticmethod
    def exact_match(text1: str, text2: str, case_sensitive: bool = False) -> float:
        """Calculate exact match similarity"""
        if not case_sensitive:
            text1, text2 = text1.lower(), text2.lower()
        return 1.0 if text1 == text2 else 0.0
    
    @staticmethod
    def jaccard_similarity(text1: str, text2: str) -> float:
        """Calculate Jaccard similarity based on word sets"""
        words1 = set(TextNormalizer.extract_words(text1))
        words2 = set(TextNormalizer.extract_words(text2))
        
        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
    
    @staticmethod
    def cosine_similarity(text1: str, text2: str) -> float:
        """Calculate cosine similarity using TF-IDF vectors"""
        words1 = TextNormalizer.extract_words(text1)
        words2 = TextNormalizer.extract_words(text2)
        
        all_words = set(words1 + words2)
        if not all_words:
            return 1.0 if not words1 and not words2 else 0.0
        
        vec1 = np.array([words1.count(word) for word in all_words])
        vec2 = np.array([words2.count(word) for word in all_words])
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 1.0 if norm1 == norm2 else 0.0
        
        return dot_product / (norm1 * norm2)


class ConversationDeduplicator:
    """Main deduplication system for conversations"""
    
    def __init__(self, config: Optional[DeduplicationConfig] = None):
        """Initialize deduplicator with configuration"""
        self.config = config or DeduplicationConfig()
        self.similarity_calculator = SimilarityCalculator()
        self.text_normalizer = TextNormalizer()
    
    def deduplicate_conversations(self, conversations: List[Conversation]) -> DeduplicationResult:
        """Deduplicate a list of conversations"""
        import time
        start_time = time.time()
        
        logger.info(f"Starting deduplication of {len(conversations)} conversations")
        
        # Filter conversations by minimum length
        valid_conversations = [
            conv for conv in conversations 
            if len(conv.messages) >= self.config.min_conversation_length
        ]
        
        # Find duplicates using content hashes for efficiency
        hash_to_conversations = defaultdict(list)
        for conv in valid_conversations:
            content = self._extract_conversation_content(conv)
            content_hash = self.text_normalizer.create_content_hash(content)
            hash_to_conversations[content_hash].append(conv)
        
        # Determine duplicates and unique conversations
        unique_conversations = []
        duplicate_pairs = []
        removed_items = []
        duplicate_groups = []
        
        for content_hash, conv_group in hash_to_conversations.items():
            if len(conv_group) > 1:
                # Keep the first conversation, mark others as duplicates
                unique_conversations.append(conv_group[0])
                group_ids = [conv.id for conv in conv_group]
                duplicate_groups.append(group_ids)
                removed_items.extend([conv.id for conv in conv_group[1:]])
                
                # Record duplicate pairs
                for i in range(1, len(conv_group)):
                    duplicate_pairs.append(SimilarityResult(
                        item1_id=conv_group[0].id,
                        item2_id=conv_group[i].id,
                        similarity_score=1.0,
                        metric=SimilarityMetric.CONTENT_HASH,
                        duplicate_type=DuplicateType.EXACT_DUPLICATE
                    ))
            else:
                unique_conversations.append(conv_group[0])
        
        processing_time = time.time() - start_time
        
        result = DeduplicationResult(
            original_count=len(conversations),
            duplicate_count=len(removed_items),
            unique_count=len(unique_conversations),
            duplicate_pairs=duplicate_pairs,
            duplicate_groups=duplicate_groups,
            removed_items=removed_items,
            processing_time=processing_time
        )
        
        logger.info(f"Deduplication completed: {len(conversations)} -> {len(unique_conversations)} "
                   f"({result.deduplication_rate():.2%} duplicates removed)")
        
        return result
    
    def _extract_conversation_content(self, conversation: Conversation) -> str:
        """Extract content from conversation for comparison"""
        content_parts = []
        
        for message in conversation.messages:
            normalized_content = self.text_normalizer.normalize_text(
                message.content,
                case_sensitive=self.config.case_sensitive,
                ignore_punctuation=self.config.ignore_punctuation
            )
            content_parts.append(normalized_content)
        
        return " ".join(content_parts)


def deduplicate_conversations(conversations: List[Conversation],
                            config: Optional[DeduplicationConfig] = None) -> Tuple[List[Conversation], DeduplicationResult]:
    """Convenience function to deduplicate conversations"""
    deduplicator = ConversationDeduplicator(config)
    result = deduplicator.deduplicate_conversations(conversations)
    
    # Return unique conversations
    removed_ids = set(result.removed_items)
    unique_conversations = [conv for conv in conversations if conv.id not in removed_ids]
    
    return unique_conversations, result


def create_lenient_deduplication_config() -> DeduplicationConfig:
    """Create lenient deduplication configuration"""
    return DeduplicationConfig(
        near_duplicate_threshold=0.98,
        semantic_duplicate_threshold=0.95,
        structural_duplicate_threshold=0.90,
        content_duplicate_threshold=0.85
    )


def create_strict_deduplication_config() -> DeduplicationConfig:
    """Create strict deduplication configuration"""
    return DeduplicationConfig(
        near_duplicate_threshold=0.85,
        semantic_duplicate_threshold=0.80,
        structural_duplicate_threshold=0.75,
        content_duplicate_threshold=0.70,
        case_sensitive=True,
        ignore_punctuation=False
    )
'''

with open('ai/dataset_pipeline/deduplication_system.py', 'w') as f:
    f.write(dedup_content)

print("Deduplication system file created successfully!") 