"""
main.py - End-to-end ADHD EEG Classification Pipeline

SMART MODE:
  - If a trained model already exists (outputs/models/best_model.joblib),
    it is loaded instantly. Training is SKIPPED entirely.
  - If no model exists, the pipeline trains from the split data parts
    (data_parts/*.csv), evaluates, saves the model, and all future
    launches will reuse it.

Run:  python main.py
      python main.py --retrain   (force retraining even if model exists)
"""
import os
import sys
import time
import json
import glob
import numpy as np
import joblib

# Add project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    DATA_PATH, OUTPUT_DIR, FIGURES_DIR, MODELS_DIR, RESULTS_DIR,
    CHANNEL_NAMES, WINDOW_SIZE, STEP_SIZE, SAMPLING_RATE,
    MAX_SAMPLES_PER_SUBJECT, TEST_SPLIT_RATIO, RANDOM_STATE,
    DATA_PARTS_DIR,
)
from src.data_loader import load_eeg_data, get_subject_info
from src.preprocessing import preprocess_all_subjects
from src.feature_engineering import (
    extract_features_from_windows, get_feature_names,
)
from src.model_training import train_and_evaluate
from src.utils import (
    plot_confusion_matrix, plot_roc_curve, plot_multi_roc,
    plot_model_comparison, plot_feature_importance, save_results_json,
    compute_all_metrics, plot_class_balance, plot_boxplot_by_class,
)



def model_exists():
    """Check if a trained model is already saved."""
    model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    results_path = os.path.join(RESULTS_DIR, "model_results.json")
    return (os.path.exists(model_path) and
            os.path.exists(scaler_path) and
            os.path.exists(results_path))


def load_saved_model():
    """Load the previously trained model and scaler from disk."""
    model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    model_name = type(model).__name__
    print(f"[ModelLoader] Loaded saved model: {model_name}")
    print(f"[ModelLoader] Model file: {model_path}")
    print(f"[ModelLoader] Scaler file: {scaler_path}")
    return model, scaler, model_name


def load_data_from_parts():
    """
    Load the EEG data from split CSV parts (data_parts/) instead of
    the single large file. Falls back to the full file if parts
    don't exist.
    """
    part_files = sorted(glob.glob(os.path.join(DATA_PARTS_DIR, "adhdata_part_*.csv")))

    if not part_files:
        print("[DataLoader] No split parts found. Loading full dataset ...")
        return load_eeg_data(DATA_PATH)

    print(f"[DataLoader] Loading {len(part_files)} data parts from {DATA_PARTS_DIR} ...")
    import pandas as pd
    dfs = []
    for pf in part_files:
        part_df = pd.read_csv(pf)
        dfs.append(part_df)
        print(f"  Loaded {os.path.basename(pf)}: {len(part_df):,} rows")

    df = pd.concat(dfs, ignore_index=True)

    # Keep only expected columns
    expected_cols = CHANNEL_NAMES + ["Class", "ID"]
    missing = [c for c in expected_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset parts: {missing}")
    df = df[expected_cols]

    # Drop NaNs
    nan_counts = df[CHANNEL_NAMES].isna().sum()
    if nan_counts.any():
        df = df.dropna(subset=CHANNEL_NAMES)

    print(f"[DataLoader] Combined: {len(df):,} samples, "
          f"{df['ID'].nunique()} subjects")
    return df


def split_subjects(df, test_ratio=TEST_SPLIT_RATIO, seed=RANDOM_STATE):
    """
    Split subjects into train and test groups (subject-level split).
    Stratified by class to preserve ADHD/Control ratio.
    """
    from sklearn.model_selection import train_test_split

    info = get_subject_info(df)
    subject_ids = info["ID"].values
    subject_labels = info["Class"].values

    train_ids, test_ids = train_test_split(
        subject_ids,
        test_size=test_ratio,
        stratify=subject_labels,
        random_state=seed,
    )

    train_df = df[df["ID"].isin(train_ids)]
    test_df = df[df["ID"].isin(test_ids)]

    print(f"[Split] Train: {len(train_ids)} subjects "
          f"({sum(subject_labels[np.isin(subject_ids, train_ids)] == 'ADHD')} ADHD, "
          f"{sum(subject_labels[np.isin(subject_ids, train_ids)] == 'Control')} Control)")
    print(f"[Split] Test:  {len(test_ids)} subjects "
          f"({sum(subject_labels[np.isin(subject_ids, test_ids)] == 'ADHD')} ADHD, "
          f"{sum(subject_labels[np.isin(subject_ids, test_ids)] == 'Control')} Control)")

    return train_df, test_df, train_ids, test_ids


def train_pipeline():
    """Full training pipeline: load -> preprocess -> extract -> train -> save."""
    start_time = time.time()

    # -- 1. Load data (from parts or full file) -------------------------
    print("\n> STEP 1: Loading data ...")
    df = load_data_from_parts()

    # -- 2. Subject-level train/test split ------------------------------
    print("\n> STEP 2: Splitting subjects into train/test ...")
    train_df, test_df, train_ids, test_ids = split_subjects(df)

    # -- 3. Preprocess & Window (with subsampling) ----------------------
    print(f"\n> STEP 3: Preprocessing (subsample {MAX_SAMPLES_PER_SUBJECT} "
          f"samples/subject, filter, normalize, window) ...")

    print("\n  --- TRAIN SET ---")
    train_windows, train_labels, train_subject_ids = preprocess_all_subjects(train_df)
    print(f"  Train windows: {train_windows.shape}")

    print("\n  --- TEST SET ---")
    test_windows, test_labels, test_subject_ids = preprocess_all_subjects(test_df)
    print(f"  Test windows: {test_windows.shape}")

    # -- 4. Feature Extraction ------------------------------------------
    print("\n> STEP 4: Extracting features ...")
    feature_names = get_feature_names()

    print("  Extracting train features ...")
    X_train = extract_features_from_windows(train_windows, show_progress=True)
    print(f"  Train feature matrix: {X_train.shape}")

    print("  Extracting test features ...")
    X_test = extract_features_from_windows(test_windows, show_progress=True)
    print(f"  Test feature matrix: {X_test.shape}")

    # Save feature matrices for API server
    np.save(os.path.join(RESULTS_DIR, "X_train.npy"), X_train)
    np.save(os.path.join(RESULTS_DIR, "y_train.npy"), train_labels)
    np.save(os.path.join(RESULTS_DIR, "train_subject_ids.npy"), train_subject_ids)
    np.save(os.path.join(RESULTS_DIR, "X_test.npy"), X_test)
    np.save(os.path.join(RESULTS_DIR, "y_test.npy"), test_labels)
    np.save(os.path.join(RESULTS_DIR, "test_subject_ids.npy"), test_subject_ids)
    with open(os.path.join(RESULTS_DIR, "feature_names.json"), "w") as f:
        json.dump(feature_names, f)
    with open(os.path.join(RESULTS_DIR, "test_subject_ids_list.json"), "w") as f:
        json.dump(test_ids.tolist(), f)
    print("  Saved feature matrices to outputs/results/")

    # -- 5. Train & Evaluate (CV on train set) --------------------------
    print("\n> STEP 5: Training models (cross-validation on train set) ...")
    results, best_name, best_model, best_scaler, roc_data = \
        train_and_evaluate(X_train, train_labels, train_subject_ids)

    # -- 6. Evaluate best model on held-out test set --------------------
    print("\n> STEP 6: Evaluating best model on HELD-OUT test set ...")
    from collections import Counter

    X_test_scaled = best_scaler.transform(X_test)
    X_test_scaled = np.nan_to_num(X_test_scaled, nan=0, posinf=0, neginf=0)
    test_preds = best_model.predict(X_test_scaled)
    test_probs = (best_model.predict_proba(X_test_scaled)[:, 1]
                  if hasattr(best_model, "predict_proba") else None)

    # Window-level test metrics
    test_window_metrics = compute_all_metrics(test_labels, test_preds, test_probs)

    # Subject-level test metrics (majority vote)
    test_subject_true = []
    test_subject_pred = []
    test_subject_prob = []
    for sid in np.unique(test_subject_ids):
        mask = test_subject_ids == sid
        true_label = int(test_labels[mask][0])
        pred_votes = Counter(test_preds[mask])
        pred_label = pred_votes.most_common(1)[0][0]
        test_subject_true.append(true_label)
        test_subject_pred.append(pred_label)
        if test_probs is not None:
            test_subject_prob.append(float(np.mean(test_probs[mask])))

    test_subject_metrics = compute_all_metrics(
        test_subject_true, test_subject_pred,
        test_subject_prob if test_subject_prob else None
    )

    results["__test_set__"] = {
        "window_metrics": test_window_metrics,
        "subject_metrics": test_subject_metrics,
        "test_subjects": test_ids.tolist(),
        "best_model": best_name,
    }

    print(f"\n  HELD-OUT TEST RESULTS ({best_name}):")
    print(f"  Window-level  -> Acc: {test_window_metrics['accuracy']:.3f}, "
          f"F1: {test_window_metrics['f1']:.3f}, "
          f"AUC: {test_window_metrics.get('auc_roc', 0):.3f}")
    print(f"  Subject-level -> Acc: {test_subject_metrics['accuracy']:.3f}, "
          f"F1: {test_subject_metrics['f1']:.3f}, "
          f"AUC: {test_subject_metrics.get('auc_roc', 0):.3f}")

    # -- 7. Save Results & Generate Plots -------------------------------
    print("\n> STEP 7: Generating evaluation plots ...")

    save_results_json(results, "model_results.json")

    # Generate additional academic plots
    plot_class_balance(df)
    plot_boxplot_by_class(df)
    print("  [OK] Class balance and Boxplot range visualizations")

    # Model comparison bar chart (CV results)
    comparison_data = {
        name: data["subject_metrics_mean"]
        for name, data in results.items()
        if name != "__test_set__"
    }
    plot_model_comparison(comparison_data)
    print("  [OK] Model comparison chart")

    # Multi-ROC plot
    if roc_data:
        plot_multi_roc(roc_data)
        print("  [OK] ROC comparison chart")

    # Test set confusion matrix
    plot_confusion_matrix(
        test_subject_true, test_subject_pred,
        title=f"Test Set Confusion Matrix - {best_name}",
        filename="cm_test_set.png"
    )
    print("  [OK] Test set confusion matrix")

    # Test set ROC
    if test_subject_prob:
        plot_roc_curve(
            test_subject_true, test_subject_prob,
            model_name=f"{best_name} (Test Set)",
            filename="roc_test_set.png"
        )
        print("  [OK] Test set ROC curve")

    # Individual plots for best model (from CV)
    if best_name in roc_data:
        rd = roc_data[best_name]
        best_preds_cv = (rd["y_prob"] >= 0.5).astype(int)
        plot_confusion_matrix(
            rd["y_true"], best_preds_cv,
            title=f"CV Confusion Matrix - {best_name}",
            filename=f"cm_{best_name.lower().replace(' ', '_')}_cv.png"
        )
        plot_roc_curve(
            rd["y_true"], rd["y_prob"],
            model_name=f"{best_name} (CV)",
            filename=f"roc_{best_name.lower().replace(' ', '_')}_cv.png"
        )
        print(f"  [OK] {best_name} CV confusion matrix & ROC")

    # Feature importance (tree-based models natively, or permutation for others)
    importances = None
    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        print("  Using native feature importances")
    else:
        print(f"  {best_name} has no native feature_importances_, computing permutation importance ...")
        from sklearn.inspection import permutation_importance
        sample_n = min(1000, len(X_train))
        rng = np.random.RandomState(RANDOM_STATE)
        idx = rng.choice(len(X_train), sample_n, replace=False)
        X_sample = best_scaler.transform(X_train[idx])
        X_sample = np.nan_to_num(X_sample, nan=0, posinf=0, neginf=0)
        perm = permutation_importance(
            best_model, X_sample, train_labels[idx],
            n_repeats=10, random_state=RANDOM_STATE, n_jobs=-1, scoring="f1"
        )
        importances = perm.importances_mean
        print(f"  Permutation importance computed for {len(feature_names)} features")

    if importances is not None:
        plot_feature_importance(
            importances,
            feature_names,
            top_n=30,
            model_name=best_name,
            filename="feature_importance_best.png",
        )
        print("  [OK] Feature importance chart")

        fi = dict(zip(feature_names, importances.tolist()))
        fi_sorted = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True))
        save_results_json(fi_sorted, "feature_importances.json")

    # -- 8. Summary -----------------------------------------------------
    elapsed = time.time() - start_time

    print("\n================================================================")
    print("|                    RESULTS SUMMARY                         |")
    print("================================================================")
    print(f"\n  Total time: {elapsed / 60:.1f} minutes")
    print(f"  Best model: {best_name}")
    print(f"\n  Cross-validation metrics (train set, {len(train_ids)} subjects):")
    for k, v in results[best_name]["subject_metrics_mean"].items():
        std = results[best_name]["subject_metrics_std"][k]
        print(f"    {k:>12s}: {v:.3f} +/- {std:.3f}")

    print(f"\n  Held-out test metrics ({len(test_ids)} subjects):")
    for k, v in test_subject_metrics.items():
        print(f"    {k:>12s}: {v:.3f}")

    print(f"\n  All results saved to: {OUTPUT_DIR}")
    print(f"  Figures: {FIGURES_DIR}")
    print(f"  Models: {MODELS_DIR}")
    print(f"  Results JSON: {RESULTS_DIR}")
    print(f"\n  ** Model saved! Future launches will load it instantly. **")
    print()

    return results, best_name


def main():
    print("================================================================")
    print("|  NeuroScan AI - Pediatric Brainwave Decoder                 |")
    print("|  ML Framework for Automated ADHD Classification             |")
    print("================================================================")

    # Check for --retrain flag
    force_retrain = "--retrain" in sys.argv

    if model_exists() and not force_retrain:
        try:
            print("\n[NeuroScan] Trained model found! Attempting to load...")
            model, scaler, model_name = load_saved_model()

            # Load saved results for display
            results_path = os.path.join(RESULTS_DIR, "model_results.json")
            with open(results_path) as f:
                results = json.load(f)

            test_set = results.get("__test_set__", {})
            print(f"\n  Best model: {model_name}")
            if test_set:
                sm = test_set.get("subject_metrics", {})
                print(f"  Test Accuracy:  {sm.get('accuracy', 0):.3f}")
                print(f"  Test F1 Score:  {sm.get('f1', 0):.3f}")
                print(f"  Test AUC-ROC:   {sm.get('auc_roc', 0):.3f}")

            print(f"\n[NeuroScan] Ready for predictions. Start the server with:")
            print(f"  python -m uvicorn server.main:app --host 127.0.0.1 --port 8002")
            print()
            return results, model_name
        except Exception as e:
            print(f"\n[NeuroScan] WARNING: Failed to load saved model/scaler: {e}")
            print("[NeuroScan] This is likely due to library version mismatch or Python version difference.")
            print("[NeuroScan] Automatically retraining model to match the current environment...")
            return train_pipeline()
    else:
        if force_retrain:
            print("\n[NeuroScan] --retrain flag detected. Retraining from scratch ...")
        else:
            print("\n[NeuroScan] No trained model found. Starting first-time training ...")
            print("[NeuroScan] This will take ~5 minutes. Subsequent launches are instant.")

        return train_pipeline()



if __name__ == "__main__":
    main()
