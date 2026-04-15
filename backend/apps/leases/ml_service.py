"""
Module 3: AI/ML Anomaly Detection Service
Utilizes Scikit-Learn IsolationForest for unsupervised outlier detection.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(settings.BASE_DIR, 'apps/leases/trained_models/isolation_forest.pkl')

class OutlierDetectionEngine:
    def __init__(self):
        self.model = None
        self.features = [
            'dispatch_efficiency', 
            'production_to_workforce_ratio',
            'production_to_capacity_ratio',
            'outstanding_royalty_pct',
            'night_dispatch_freq' 
        ]
        self._load_or_retrain()

    def _load_or_retrain(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception as e:
                logger.error(f"Failed to load ML model: {e}")
                self.model = self._train_baseline()
        else:
            self.model = self._train_baseline()

    def _train_baseline(self):
        """
        Since this is a fresh setup, we initialize the Isolation Forest 
        with synthetic/baseline baseline parameters conforming to the standard distribution,
        and fit it so it's instantly usable.
        """
        logger.info("Training baseline Isolation Forest...")
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        
        # Synthetic normative data (Good operations)
        np.random.seed(42)
        n_samples = 200
        
        # Normative distributions
        eff = np.random.normal(0.85, 0.1, n_samples)
        workforce = np.random.normal(15, 2, n_samples)
        capacity = np.random.normal(0.8, 0.15, n_samples)
        royalty = np.random.exponential(0.05, n_samples)
        night_dispatch = np.random.exponential(0.02, n_samples)

        X = pd.DataFrame({
            'dispatch_efficiency': eff,
            'production_to_workforce_ratio': workforce,
            'production_to_capacity_ratio': capacity,
            'outstanding_royalty_pct': royalty,
            'night_dispatch_freq': night_dispatch
        })

        # Inject extreme outliers matching our anomaly specs
        outliers = pd.DataFrame({
            'dispatch_efficiency': [0.1, 0.99, 0.05, 0.95],
            'production_to_workforce_ratio': [200, 0, 500, 0],
            'production_to_capacity_ratio': [5.0, 0.0, 8.0, 0.0],
            'outstanding_royalty_pct': [0.99, 0.85, 1.0, 0.90],
            'night_dispatch_freq': [0.8, 0.9, 0.7, 1.0]
        })
        
        X = pd.concat([X, outliers], ignore_index=True)

        model = IsolationForest(contamination=0.05, random_state=42)
        model.fit(X)

        joblib.dump(model, MODEL_PATH)
        return model

    def evaluate_record(self, record):
        """
        Converts a ProductionRecord into a feature vector and returns an anomaly score [0.0 - 1.0]
        and derived flag strings.
        """
        # Feature Engineering
        qty_prod = float(record.quantity_produced_mt)
        qty_disp = float(record.quantity_dispatched_mt)
        wf = float(record.workforce_strength)
        machinery = float(record.machinery_deployed)
        
        # 1. Dispatch Efficiency
        dispatch_eff = (qty_disp / qty_prod) if qty_prod > 0 else 0.0

        # 2. Production to workforce
        prod_workforce = (qty_prod / wf) if wf > 0 else (qty_prod * 10) # Heavy penalty if 0 workforce but prod > 0
        
        # 3. Production to capacity
        # Assume 500 MT per machine capacity
        capacity = machinery * 500.0
        prod_cap = (qty_prod / capacity) if capacity > 0 else (qty_prod * 10)

        # 4. Outstanding Royalty
        payable = float(record.royalty_payable)
        paid = float(record.royalty_paid)
        out_pct = ((payable - paid) / payable) if payable > 0 else 0.0

        # 5. Night dispatch freq (Mocked for now since dispatch logs are aggregated)
        night_dispatch = 0.0

        df = pd.DataFrame([{
            'dispatch_efficiency': dispatch_eff,
            'production_to_workforce_ratio': prod_workforce,
            'production_to_capacity_ratio': prod_cap,
            'outstanding_royalty_pct': out_pct,
            'night_dispatch_freq': night_dispatch
        }])

        # Predict (-1 is outlier, 1 is inlier)
        pred = self.model.predict(df)[0]
        
        # Decision function: lower values are more abnormal. Normalize to 0-1 score
        decision_score = self.model.decision_function(df)[0]
        
        # Sigmoid squash inverted decision score -> bounds to 0-1
        normalized_score = 1 / (1 + np.exp(decision_score * 5))

        flags = []
        if pred == -1 or normalized_score > 0.6:
            if dispatch_eff < 0.4:
                flags.append('SEVERE_DISPATCH_EFFICIENCY_DROP')
            if wf == 0 and qty_prod > 0:
                flags.append('GHOST_PRODUCTION: ZERO WORKFORCE')
            if capacity == 0 and qty_prod > 0:
                flags.append('GHOST_PRODUCTION: NO MACHINERY')
            elif prod_cap > 3.0:
                flags.append('MASSIVE_CAPACITY_OVERRUN')
            if out_pct > 0.8:
                flags.append('CRITICAL_FINANCIAL_IRREGULARITY')
                
        # Check suspended/expired lease state
        if record.lease.status in ['SUSPENDED', 'EXPIRED'] and qty_prod > 0:
            flags.append('ILLEGAL_PRODUCTION: LEASE_INACTIVE')
            normalized_score = max(normalized_score, 0.99)
            
        return normalized_score, flags

# Singleton instance
anomaly_engine = OutlierDetectionEngine()
