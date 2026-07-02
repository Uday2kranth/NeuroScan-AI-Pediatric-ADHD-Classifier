"""
Model training and evaluation with subject-level cross-validation.

Uses Stratified Group K-Fold so no patient's data leaks between
train and test splits.
"""
import numpy as np
import joblib
import os
from collections import Counter

from sklearn.model_selection import StratifiedGroupKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from config import N_FOLDS, RANDOM_STATE, MODELS_DIR
from src.utils import compute_all_metrics


# -- Try to import LightGBM (optional) -------------------------------
try:
    from lightgbm import LGBMClassifier
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    print("[Warning] LightGBM not installed  -  skipping LightGBM model")


def get_models() -> dict:
    """Return a dict of model_name  ->  model_instance."""
    models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=200, max_depth=20, min_samples_split=5,
            class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=1.0,  # will be set per fold
            random_state=RANDOM_STATE, eval_metric="logloss",
            use_label_encoder=False, n_jobs=-1, verbosity=0,
        ),
        "SVM (RBF)": SVC(
            kernel="rbf", C=10, gamma="scale", probability=True,
            class_weight="balanced", random_state=RANDOM_STATE,
        ),
        "Logistic Regression": LogisticRegression(
            C=1.0, max_iter=1000, class_weight="balanced",
            random_state=RANDOM_STATE, n_jobs=-1,
        ),
        "KNN": KNeighborsClassifier(
            n_neighbors=7, weights="distance", n_jobs=-1,
        ),
    }

    if HAS_LGBM:
        models["LightGBM"] = LGBMClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            class_weight="balanced", random_state=RANDOM_STATE,
            n_jobs=-1, verbose=-1,
        )

    return models


def _majority_vote(predictions, subject_ids):
    """
    Aggregate window-level predictions to subject-level via majority vote.

    Returns
    -------
    subject_preds : dict  {subject_id: predicted_label}
    """
    subject_preds = {}
    unique_ids = np.unique(subject_ids)
    for sid in unique_ids:
        mask = subject_ids == sid
        preds = predictions[mask]
        counter = Counter(preds)
        subject_preds[sid] = counter.most_common(1)[0][0]
    return subject_preds


def _majority_vote_proba(probas, subject_ids):
    """
    Aggregate window-level probabilities to subject-level via averaging.

    Returns
    -------
    subject_probs : dict  {subject_id: mean_probability}
    """
    subject_probs = {}
    unique_ids = np.unique(subject_ids)
    for sid in unique_ids:
        mask = subject_ids == sid
        subject_probs[sid] = float(np.mean(probas[mask]))
    return subject_probs


def train_and_evaluate(X: np.ndarray, y: np.ndarray,
                       subject_ids: np.ndarray):
    """
    Train all models using Stratified Group K-Fold cross-validation.

    Parameters
    ----------
    X : np.ndarray, shape (n_windows, n_features)
    y : np.ndarray, shape (n_windows,)   -  0=Control, 1=ADHD
    subject_ids : np.ndarray, shape (n_windows,)

    Returns
    -------
    results : dict
        {model_name: {"window_metrics": ..., "subject_metrics": ..., ...}}
    best_model_name : str
    best_model : fitted model
    best_scaler : fitted scaler
    roc_data : dict  for multi-ROC plotting
    """
    # Build a subject-level label array for stratification
    unique_subjects = np.unique(subject_ids)
    subject_labels = np.array([
        int(y[subject_ids == sid][0]) for sid in unique_subjects
    ])

    sgkf = StratifiedGroupKFold(n_splits=N_FOLDS, shuffle=True,
                                 random_state=RANDOM_STATE)

    models = get_models()
    results = {}
    roc_data = {}

    # Storage for subject-level preds across all folds
    all_subject_true = {}   # model_name  ->  list of (sid, true_label)
    all_subject_pred = {}
    all_subject_prob = {}

    print(f"\n{'=' * 60}")
    print(f"  TRAINING {len(models)} MODELS x {N_FOLDS}-FOLD CV")
    print(f"  {len(unique_subjects)} subjects, {X.shape[0]} windows, "
          f"{X.shape[1]} features")
    print(f"{'=' * 60}\n")

    for model_name, model_template in models.items():
        print(f"\n-- {model_name} {'-' * (50 - len(model_name))}")

        fold_window_metrics = []
        fold_subject_metrics = []
        all_subject_true[model_name] = []
        all_subject_pred[model_name] = []
        all_subject_prob[model_name] = []

        for fold_idx, (train_idx, test_idx) in enumerate(
                sgkf.split(X, y, groups=subject_ids)):

            X_train, X_test = X[train_idx], X[test_idx]
            y_train, y_test = y[train_idx], y[test_idx]
            ids_test = subject_ids[test_idx]

            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)

            # Handle NaN/Inf from feature extraction
            X_train_scaled = np.nan_to_num(X_train_scaled, nan=0, posinf=0,
                                            neginf=0)
            X_test_scaled = np.nan_to_num(X_test_scaled, nan=0, posinf=0,
                                           neginf=0)

            # Clone model for this fold
            import sklearn.base
            model = sklearn.base.clone(model_template)

            # Adjust scale_pos_weight for XGBoost
            if model_name == "XGBoost":
                n_neg = np.sum(y_train == 0)
                n_pos = np.sum(y_train == 1)
                model.set_params(
                    scale_pos_weight=n_neg / n_pos if n_pos > 0 else 1.0
                )

            # Train
            model.fit(X_train_scaled, y_train)

            # Window-level predictions
            y_pred = model.predict(X_test_scaled)
            y_prob = (model.predict_proba(X_test_scaled)[:, 1]
                      if hasattr(model, "predict_proba") else None)

            w_metrics = compute_all_metrics(y_test, y_pred, y_prob)
            fold_window_metrics.append(w_metrics)

            # Subject-level aggregation
            subj_preds = _majority_vote(y_pred, ids_test)
            subj_probs = (_majority_vote_proba(y_prob, ids_test)
                          if y_prob is not None else {})

            for sid in np.unique(ids_test):
                true_label = int(y_test[ids_test == sid][0])
                all_subject_true[model_name].append(true_label)
                all_subject_pred[model_name].append(subj_preds[sid])
                if sid in subj_probs:
                    all_subject_prob[model_name].append(subj_probs[sid])

            # Subject-level metrics for this fold
            s_true = [int(y_test[ids_test == sid][0])
                      for sid in np.unique(ids_test)]
            s_pred = [subj_preds[sid] for sid in np.unique(ids_test)]
            s_prob = ([subj_probs[sid] for sid in np.unique(ids_test)]
                      if subj_probs else None)
            s_metrics = compute_all_metrics(
                s_true, s_pred,
                s_prob if s_prob else None
            )
            fold_subject_metrics.append(s_metrics)

            print(f"  Fold {fold_idx + 1:2d}/{N_FOLDS}  -  "
                  f"Window Acc: {w_metrics['accuracy']:.3f}, "
                  f"Subject Acc: {s_metrics['accuracy']:.3f}")

        # Average metrics across folds
        avg_w = {k: float(np.mean([m[k] for m in fold_window_metrics]))
                 for k in fold_window_metrics[0]}
        std_w = {k: float(np.std([m[k] for m in fold_window_metrics]))
                 for k in fold_window_metrics[0]}
        avg_s = {k: float(np.mean([m[k] for m in fold_subject_metrics]))
                 for k in fold_subject_metrics[0]}
        std_s = {k: float(np.std([m[k] for m in fold_subject_metrics]))
                 for k in fold_subject_metrics[0]}

        results[model_name] = {
            "window_metrics_mean": avg_w,
            "window_metrics_std": std_w,
            "subject_metrics_mean": avg_s,
            "subject_metrics_std": std_s,
        }

        print(f"\n  > Avg Window:  Acc={avg_w['accuracy']:.3f}+/-{std_w['accuracy']:.3f}, "
              f"F1={avg_w['f1']:.3f}+/-{std_w['f1']:.3f}, "
              f"AUC={avg_w.get('auc_roc', 0):.3f}")
        print(f"  > Avg Subject: Acc={avg_s['accuracy']:.3f}+/-{std_s['accuracy']:.3f}, "
              f"F1={avg_s['f1']:.3f}+/-{std_s['f1']:.3f}, "
              f"AUC={avg_s.get('auc_roc', 0):.3f}")

        # Store ROC data using all-folds aggregated predictions
        if all_subject_prob[model_name]:
            roc_data[model_name] = {
                "y_true": np.array(all_subject_true[model_name]),
                "y_prob": np.array(all_subject_prob[model_name]),
            }

    # -- Find best model (by subject-level F1) -----------------------
    best_model_name = max(
        results,
        key=lambda m: results[m]["subject_metrics_mean"]["f1"]
    )
    print(f"\n{'=' * 60}")
    print(f"  [BEST] BEST MODEL: {best_model_name}")
    print(f"     Subject F1 = "
          f"{results[best_model_name]['subject_metrics_mean']['f1']:.3f}")
    print(f"{'=' * 60}\n")

    # Retrain best model on ALL data for saving
    scaler_final = StandardScaler()
    X_scaled_all = scaler_final.fit_transform(X)
    X_scaled_all = np.nan_to_num(X_scaled_all, nan=0, posinf=0, neginf=0)

    import sklearn.base
    best_model = sklearn.base.clone(models[best_model_name])
    if best_model_name == "XGBoost":
        n_neg = np.sum(y == 0)
        n_pos = np.sum(y == 1)
        best_model.set_params(
            scale_pos_weight=n_neg / n_pos if n_pos > 0 else 1.0
        )
    best_model.fit(X_scaled_all, y)

    # Save model and scaler
    model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    joblib.dump(best_model, model_path)
    joblib.dump(scaler_final, scaler_path)
    print(f"[ModelTraining] Saved best model  ->  {model_path}")
    print(f"[ModelTraining] Saved scaler  ->  {scaler_path}")

    return results, best_model_name, best_model, scaler_final, roc_data
