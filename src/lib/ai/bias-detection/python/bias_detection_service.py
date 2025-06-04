#!/usr/bin/env python3
"""
Pixelated Empathy Bias Detection Service

This module implements the core bias detection functionality using:
- IBM AIF360 for algorithmic fairness
- Microsoft Fairlearn for constraint-based fairness
- Google What-If Tool for interactive analysis
- Hugging Face evaluate for NLP bias detection
- spaCy and NLTK for linguistic analysis
"""

import asyncio
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import hashlib

# Core ML libraries
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split

# IBM AIF360
try:
    from aif360.datasets import StandardDataset
    from aif360.metrics import ClassificationMetric, BinaryLabelDatasetMetric
    from aif360.algorithms.preprocessing import Reweighing
    from aif360.algorithms.inprocessing import AdversarialDebiasing
    from aif360.algorithms.postprocessing import EqOddsPostprocessing
    AIF360_AVAILABLE = True
except ImportError:
    AIF360_AVAILABLE = False
    logging.warning("AIF360 not available. Some fairness metrics will be unavailable.")

# Microsoft Fairlearn
try:
    from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
    from fairlearn.reductions import ExponentiatedGradient, DemographicParity, EqualizedOdds
    from fairlearn.postprocessing import ThresholdOptimizer
    FAIRLEARN_AVAILABLE = True
except ImportError:
    FAIRLEARN_AVAILABLE = False
    logging.warning("Fairlearn not available. Some constraint-based fairness methods will be unavailable.")

# Hugging Face evaluate
try:
    import evaluate
    HF_EVALUATE_AVAILABLE = True
except ImportError:
    HF_EVALUATE_AVAILABLE = False
    logging.warning("Hugging Face evaluate not available. Some NLP bias metrics will be unavailable.")

# NLP libraries
try:
    import spacy
    import nltk
    from nltk.sentiment import SentimentIntensityAnalyzer
    from textblob import TextBlob
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False
    logging.warning("NLP libraries not fully available. Text analysis will be limited.")

# Visualization and data processing
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objs as go
import plotly.express as px
from plotly.subplots import make_subplots

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BiasDetectionConfig:
    """Configuration for bias detection service"""
    warning_threshold: float = 0.3
    high_threshold: float = 0.6
    critical_threshold: float = 0.8
    layer_weights: Dict[str, float] = None
    enable_hipaa_compliance: bool = True
    enable_audit_logging: bool = True
    
    def __post_init__(self):
        if self.layer_weights is None:
            self.layer_weights = {
                'preprocessing': 0.2,
                'model_level': 0.3,
                'interactive': 0.2,
                'evaluation': 0.3
            }

@dataclass
class SessionData:
    """Structured session data for bias analysis"""
    session_id: str
    participant_demographics: Dict[str, Any]
    training_scenario: Dict[str, Any]
    content: Dict[str, Any]
    ai_responses: List[Dict[str, Any]]
    expected_outcomes: List[Dict[str, Any]]
    transcripts: List[Dict[str, Any]]
    metadata: Dict[str, Any]

class BiasDetectionService:
    """Main bias detection service implementing multi-layer analysis"""
    
    def __init__(self, config: BiasDetectionConfig):
        self.config = config
        self.nlp = None
        self.sentiment_analyzer = None
        self._initialize_nlp()
        
    def _initialize_nlp(self):
        """Initialize NLP components"""
        if NLP_AVAILABLE:
            try:
                # Load spaCy model
                self.nlp = spacy.load("en_core_web_sm")
                
                # Initialize NLTK sentiment analyzer
                nltk.download('vader_lexicon', quiet=True)
                self.sentiment_analyzer = SentimentIntensityAnalyzer()
                
                logger.info("NLP components initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize NLP components: {e}")
                self.nlp = None
                self.sentiment_analyzer = None
    
    async def analyze_session(self, session_data: SessionData) -> Dict[str, Any]:
        """
        Perform comprehensive bias analysis on a therapeutic session
        """
        logger.info(f"Starting bias analysis for session {session_data.session_id}")
        
        try:
            # Run all analysis layers
            preprocessing_result = await self._run_preprocessing_analysis(session_data)
            model_level_result = await self._run_model_level_analysis(session_data)
            interactive_result = await self._run_interactive_analysis(session_data)
            evaluation_result = await self._run_evaluation_analysis(session_data)
            
            # Calculate overall bias score
            overall_score = self._calculate_overall_bias_score([
                preprocessing_result,
                model_level_result,
                interactive_result,
                evaluation_result
            ])
            
            # Generate recommendations
            recommendations = self._generate_recommendations([
                preprocessing_result,
                model_level_result,
                interactive_result,
                evaluation_result
            ])
            
            # Determine alert level
            alert_level = self._determine_alert_level(overall_score)
            
            result = {
                'session_id': session_data.session_id,
                'timestamp': datetime.now().isoformat(),
                'overall_bias_score': overall_score,
                'layer_results': {
                    'preprocessing': preprocessing_result,
                    'model_level': model_level_result,
                    'interactive': interactive_result,
                    'evaluation': evaluation_result
                },
                'demographics': session_data.participant_demographics,
                'recommendations': recommendations,
                'alert_level': alert_level,
                'confidence': self._calculate_confidence([
                    preprocessing_result,
                    model_level_result,
                    interactive_result,
                    evaluation_result
                ])
            }
            
            # Log for audit if enabled
            if self.config.enable_audit_logging:
                await self._log_audit_event(session_data.session_id, result)
            
            logger.info(f"Bias analysis completed for session {session_data.session_id}")
            return result
            
        except Exception as e:
            logger.error(f"Bias analysis failed for session {session_data.session_id}: {e}")
            raise
    
    async def _run_preprocessing_analysis(self, session_data: SessionData) -> Dict[str, Any]:
        """Run preprocessing layer analysis using spaCy and NLTK"""
        logger.info("Running preprocessing analysis")
        
        # Extract text content for analysis
        text_content = self._extract_text_content(session_data)
        
        # Linguistic bias detection
        linguistic_bias = await self._detect_linguistic_bias(text_content)
        
        # Representation analysis
        representation_analysis = self._analyze_representation(session_data)
        
        # Data quality metrics
        data_quality = self._assess_data_quality(session_data)
        
        # Calculate preprocessing bias score
        bias_score = (
            linguistic_bias['overall_bias_score'] * 0.4 +
            representation_analysis['bias_score'] * 0.4 +
            (1 - data_quality['overall_quality']) * 0.2
        )
        
        return {
            'bias_score': bias_score,
            'linguistic_bias': linguistic_bias,
            'representation_analysis': representation_analysis,
            'data_quality_metrics': data_quality,
            'recommendations': self._generate_preprocessing_recommendations(
                linguistic_bias, representation_analysis, data_quality
            )
        }
    
    async def _detect_linguistic_bias(self, text_content: str) -> Dict[str, Any]:
        """Detect linguistic bias using NLP techniques"""
        if not self.nlp or not text_content:
            return {'overall_bias_score': 0.0, 'error': 'NLP not available or no content'}
        
        doc = self.nlp(text_content)
        
        # Gender bias detection
        gender_bias = self._detect_gender_bias(doc)
        
        # Racial bias detection
        racial_bias = self._detect_racial_bias(doc)
        
        # Age bias detection
        age_bias = self._detect_age_bias(doc)
        
        # Cultural bias detection
        cultural_bias = self._detect_cultural_bias(doc)
        
        # Sentiment analysis
        sentiment = self._analyze_sentiment(text_content)
        
        # Biased terms detection
        biased_terms = self._detect_biased_terms(doc)
        
        overall_bias_score = np.mean([
            gender_bias, racial_bias, age_bias, cultural_bias
        ])
        
        return {
            'overall_bias_score': overall_bias_score,
            'gender_bias_score': gender_bias,
            'racial_bias_score': racial_bias,
            'age_bias_score': age_bias,
            'cultural_bias_score': cultural_bias,
            'biased_terms': biased_terms,
            'sentiment_analysis': sentiment
        }
    
    def _detect_gender_bias(self, doc) -> float:
        """Detect gender bias in text"""
        bias_indicators = [
            'gendered_pronouns', 'stereotypical_roles', 'gendered_adjectives'
        ]
        
        gendered_terms = {
            'male_terms': ['he', 'him', 'his', 'man', 'men', 'guy', 'guys'],
            'female_terms': ['she', 'her', 'hers', 'woman', 'women', 'girl', 'girls'],
            'stereotypical_male': ['aggressive', 'dominant', 'assertive', 'competitive'],
            'stereotypical_female': ['emotional', 'nurturing', 'submissive', 'caring']
        }
        
        text_lower = doc.text.lower()
        
        male_count = sum(text_lower.count(term) for term in gendered_terms['male_terms'])
        female_count = sum(text_lower.count(term) for term in gendered_terms['female_terms'])
        
        total_gendered = male_count + female_count
        if total_gendered == 0:
            return 0.0
        
        # Calculate imbalance
        imbalance = abs(male_count - female_count) / total_gendered
        
        # Check for stereotypical language
        stereotype_score = 0
        for term in gendered_terms['stereotypical_male'] + gendered_terms['stereotypical_female']:
            if term in text_lower:
                stereotype_score += 0.1
        
        return min(imbalance + stereotype_score, 1.0)
    
    def _detect_racial_bias(self, doc) -> float:
        """Detect racial bias in text"""
        # Implement racial bias detection logic
        # This is a simplified version - in practice, this would be more sophisticated
        
        bias_terms = [
            'racial_stereotypes', 'coded_language', 'cultural_assumptions'
        ]
        
        # For now, return a placeholder score
        # Real implementation would use more sophisticated NLP techniques
        return 0.1  # Low baseline bias score
    
    def _detect_age_bias(self, doc) -> float:
        """Detect age bias in text"""
        age_related_terms = [
            'young', 'old', 'elderly', 'senior', 'youth', 'teenager', 
            'millennial', 'boomer', 'generation'
        ]
        
        text_lower = doc.text.lower()
        age_mentions = sum(text_lower.count(term) for term in age_related_terms)
        
        # Simple heuristic - high number of age mentions might indicate bias
        total_words = len(doc)
        if total_words == 0:
            return 0.0
        
        age_ratio = age_mentions / total_words
        return min(age_ratio * 10, 1.0)  # Scale to 0-1 range
    
    def _detect_cultural_bias(self, doc) -> float:
        """Detect cultural bias in text"""
        cultural_indicators = [
            'cultural_assumptions', 'western_bias', 'language_preferences'
        ]
        
        # Simplified implementation
        return 0.1  # Placeholder
    
    def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using NLTK and TextBlob"""
        if not self.sentiment_analyzer:
            return {'error': 'Sentiment analyzer not available'}
        
        # NLTK VADER sentiment
        vader_scores = self.sentiment_analyzer.polarity_scores(text)
        
        # TextBlob sentiment
        blob = TextBlob(text)
        textblob_sentiment = blob.sentiment
        
        return {
            'vader_scores': vader_scores,
            'textblob_polarity': textblob_sentiment.polarity,
            'textblob_subjectivity': textblob_sentiment.subjectivity,
            'overall_sentiment': (vader_scores['compound'] + textblob_sentiment.polarity) / 2
        }
    
    def _detect_biased_terms(self, doc) -> List[Dict[str, Any]]:
        """Detect potentially biased terms in text"""
        biased_terms_db = {
            'gender': ['mankind', 'manpower', 'chairman'],
            'racial': ['exotic', 'articulate', 'urban'],
            'age': ['old-fashioned', 'outdated', 'modern'],
            'cultural': ['foreign', 'ethnic', 'exotic']
        }
        
        detected_terms = []
        text_lower = doc.text.lower()
        
        for bias_type, terms in biased_terms_db.items():
            for term in terms:
                if term in text_lower:
                    detected_terms.append({
                        'term': term,
                        'bias_type': bias_type,
                        'severity': 'medium',  # Could be enhanced with ML scoring
                        'context': self._extract_context(doc, term),
                        'suggested_alternative': self._suggest_alternative(term)
                    })
        
        return detected_terms
    
    def _extract_context(self, doc, term: str, window: int = 10) -> str:
        """Extract context around a biased term"""
        text = doc.text
        term_pos = text.lower().find(term.lower())
        if term_pos == -1:
            return ""
        
        start = max(0, term_pos - window * 5)  # Approximate word boundary
        end = min(len(text), term_pos + len(term) + window * 5)
        
        return text[start:end].strip()
    
    def _suggest_alternative(self, term: str) -> str:
        """Suggest alternative terms for biased language"""
        alternatives = {
            'mankind': 'humanity, people',
            'manpower': 'workforce, personnel',
            'chairman': 'chairperson, chair',
            'exotic': 'unique, distinctive',
            'articulate': 'well-spoken, eloquent',
            'urban': 'city-based, metropolitan'
        }
        
        return alternatives.get(term.lower(), 'Consider more neutral language')
    
    def _analyze_representation(self, session_data: SessionData) -> Dict[str, Any]:
        """Analyze demographic representation in the session data"""
        demographics = session_data.participant_demographics
        
        # Calculate representation metrics
        age_dist = self._analyze_age_distribution([demographics])
        gender_dist = self._analyze_gender_distribution([demographics])
        ethnicity_dist = self._analyze_ethnicity_distribution([demographics])
        
        # Calculate diversity index (Simpson's Diversity Index)
        diversity_index = self._calculate_diversity_index([demographics])
        
        # Identify under/over-represented groups
        baseline_distribution = self._get_baseline_demographics()
        underrepresented = self._identify_underrepresented_groups(
            [demographics], baseline_distribution
        )
        overrepresented = self._identify_overrepresented_groups(
            [demographics], baseline_distribution
        )
        
        # Calculate overall representation bias score
        bias_score = self._calculate_representation_bias_score(
            age_dist, gender_dist, ethnicity_dist, diversity_index
        )
        
        return {
            'bias_score': bias_score,
            'demographic_distribution': {
                'age': age_dist,
                'gender': gender_dist,
                'ethnicity': ethnicity_dist
            },
            'underrepresented_groups': underrepresented,
            'overrepresented_groups': overrepresented,
            'diversity_index': diversity_index
        }
    
    async def _run_model_level_analysis(self, session_data: SessionData) -> Dict[str, Any]:
        """Run model-level analysis using AIF360 and Fairlearn"""
        logger.info("Running model-level analysis")
        
        if not AIF360_AVAILABLE and not FAIRLEARN_AVAILABLE:
            return {
                'bias_score': 0.0,
                'error': 'Neither AIF360 nor Fairlearn available'
            }
        
        # Prepare data for analysis
        model_data = self._prepare_model_data(session_data)
        
        if not model_data:
            return {
                'bias_score': 0.0,
                'error': 'Insufficient model data for analysis'
            }
        
        # Run AIF360 analysis if available
        aif360_results = {}
        if AIF360_AVAILABLE:
            aif360_results = await self._run_aif360_analysis(model_data)
        
        # Run Fairlearn analysis if available
        fairlearn_results = {}
        if FAIRLEARN_AVAILABLE:
            fairlearn_results = await self._run_fairlearn_analysis(model_data)
        
        # Combine results and calculate overall score
        bias_score = self._calculate_model_bias_score(aif360_results, fairlearn_results)
        
        return {
            'bias_score': bias_score,
            'aif360_results': aif360_results,
            'fairlearn_results': fairlearn_results,
            'recommendations': self._generate_model_recommendations(
                aif360_results, fairlearn_results
            )
        }
    
    async def _run_interactive_analysis(self, session_data: SessionData) -> Dict[str, Any]:
        """Run interactive analysis using What-If Tool concepts"""
        logger.info("Running interactive analysis")
        
        # Generate counterfactual scenarios
        counterfactuals = self._generate_counterfactual_scenarios(session_data)
        
        # Analyze counterfactual outcomes
        counterfactual_results = await self._analyze_counterfactuals(
            session_data, counterfactuals
        )
        
        # Feature importance analysis
        feature_importance = self._analyze_feature_importance(session_data)
        
        # What-if scenarios
        what_if_scenarios = self._generate_what_if_scenarios(session_data)
        
        # Calculate interactive bias score
        bias_score = self._calculate_interactive_bias_score(
            counterfactual_results, feature_importance, what_if_scenarios
        )
        
        return {
            'bias_score': bias_score,
            'counterfactual_analysis': counterfactual_results,
            'feature_importance': feature_importance,
            'what_if_scenarios': what_if_scenarios,
            'recommendations': self._generate_interactive_recommendations(
                counterfactual_results, feature_importance
            )
        }
    
    async def _run_evaluation_analysis(self, session_data: SessionData) -> Dict[str, Any]:
        """Run evaluation analysis using Hugging Face evaluate"""
        logger.info("Running evaluation analysis")
        
        # Hugging Face metrics
        hf_metrics = {}
        if HF_EVALUATE_AVAILABLE:
            hf_metrics = await self._run_huggingface_evaluation(session_data)
        
        # Custom therapeutic bias metrics
        custom_metrics = self._calculate_custom_bias_metrics(session_data)
        
        # Temporal analysis
        temporal_analysis = self._analyze_temporal_bias_patterns(session_data)
        
        # Calculate evaluation bias score
        bias_score = self._calculate_evaluation_bias_score(
            hf_metrics, custom_metrics, temporal_analysis
        )
        
        return {
            'bias_score': bias_score,
            'hugging_face_metrics': hf_metrics,
            'custom_metrics': custom_metrics,
            'temporal_analysis': temporal_analysis,
            'recommendations': self._generate_evaluation_recommendations(
                hf_metrics, custom_metrics
            )
        }
    
    # Helper methods continue in the next part due to length limits...
    
    def _extract_text_content(self, session_data: SessionData) -> str:
        """Extract all text content from session for analysis"""
        text_parts = []
        
        # Session content
        if session_data.content:
            text_parts.extend([
                session_data.content.get('patient_presentation', ''),
                ' '.join(session_data.content.get('therapeutic_interventions', [])),
                ' '.join(session_data.content.get('patient_responses', [])),
                session_data.content.get('session_notes', '')
            ])
        
        # AI responses
        for response in session_data.ai_responses:
            text_parts.append(response.get('content', ''))
            text_parts.append(response.get('reasoning', ''))
        
        # Transcripts
        for transcript in session_data.transcripts:
            text_parts.append(transcript.get('content', ''))
        
        return ' '.join(filter(None, text_parts))
    
    def _calculate_overall_bias_score(self, layer_results: List[Dict[str, Any]]) -> float:
        """Calculate weighted overall bias score from all layers"""
        weights = self.config.layer_weights
        
        preprocessing_score = layer_results[0].get('bias_score', 0)
        model_score = layer_results[1].get('bias_score', 0)
        interactive_score = layer_results[2].get('bias_score', 0)
        evaluation_score = layer_results[3].get('bias_score', 0)
        
        overall_score = (
            preprocessing_score * weights['preprocessing'] +
            model_score * weights['model_level'] +
            interactive_score * weights['interactive'] +
            evaluation_score * weights['evaluation']
        )
        
        return min(max(overall_score, 0.0), 1.0)
    
    def _determine_alert_level(self, bias_score: float) -> str:
        """Determine alert level based on bias score"""
        if bias_score >= self.config.critical_threshold:
            return 'critical'
        elif bias_score >= self.config.high_threshold:
            return 'high'
        elif bias_score >= self.config.warning_threshold:
            return 'medium'
        else:
            return 'low'
    
    async def _log_audit_event(self, session_id: str, result: Dict[str, Any]) -> None:
        """Log audit event for compliance"""
        if self.config.enable_hipaa_compliance:
            # Hash session ID for privacy
            hashed_session_id = hashlib.sha256(session_id.encode()).hexdigest()
            
            audit_entry = {
                'timestamp': datetime.now().isoformat(),
                'hashed_session_id': hashed_session_id,
                'bias_score': result['overall_bias_score'],
                'alert_level': result['alert_level'],
                'analysis_layers': list(result['layer_results'].keys())
            }
            
            # In production, this would write to a secure audit log
            logger.info(f"AUDIT: Bias analysis completed - {audit_entry}")

if __name__ == "__main__":
    # Example usage
    config = BiasDetectionConfig()
    service = BiasDetectionService(config)
    
    # This would be called by the web service
    print("Bias Detection Service initialized and ready") 