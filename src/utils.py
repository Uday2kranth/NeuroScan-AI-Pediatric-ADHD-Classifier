"""
Utility functions: plotting, metrics formatting, I/O helpers.
"""
import os
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report, roc_curve, auc,
    accuracy_score, precision_score, recall_score, f1_score,
    cohen_kappa_score, roc_auc_score,
)
from config import FIGURES_DIR, RESULTS_DIR


# ── Color palette ────────────────────────────────────────────────────
COLORS = {
    "ADHD": "#FF6B6B",
    "Control": "#4ECDC4",
    "primary": "#6C5CE7",
    "secondary": "#00CEC9",
    "accent": "#FD79A8",
    "bg_dark": "#0D1117",
    "text": "#C9D1D9",
}

plt.rcParams.update({
    "figure.facecolor": "#0D1117",
    "axes.facecolor": "#161B22",
    "axes.edgecolor": "#30363D",
    "axes.labelcolor": "#C9D1D9",
    "xtick.color": "#C9D1D9",
    "ytick.color": "#C9D1D9",
    "text.color": "#C9D1D9",
    "font.family": "sans-serif",
    "font.size": 11,
    "legend.facecolor": "#161B22",
    "legend.edgecolor": "#30363D",
})


import pandas as pd

def extract_true_labels_safely(df: pd.DataFrame):
    """
    Extracts ground truth labels case-insensitively.
    If no explicit class/sentiment column is found, converts rating/stars.
    """
    cols_lower = {c.lower(): c for c in df.columns}
    
    target_col = None
    for key in ["class", "sentiment", "label", "target", "outcome", "ground_truth", "groundtruth"]:
        if key in cols_lower:
            target_col = cols_lower[key]
            break
            
    if target_col is not None:
        series = df[target_col]
        if pd.api.types.is_string_dtype(series):
            series_clean = series.str.strip().str.lower()
            mapping = {
                "adhd": 1, "positive": 1, "pos": 1, "1": 1, "true": 1, "yes": 1,
                "control": 0, "negative": 0, "neg": 0, "0": 0, "false": 0, "no": 0
            }
            return series_clean.map(mapping).fillna(0).astype(int).values
        else:
            return series.fillna(0).astype(int).values
            
    rating_col = None
    for key in ["rating", "stars", "score", "points"]:
        if key in cols_lower:
            rating_col = cols_lower[key]
            break
            
    if rating_col is not None:
        series = df[rating_col].astype(float)
        labels = np.zeros(len(df), dtype=int)
        labels[series >= 4.0] = 1
        labels[series <= 2.0] = 0
        return labels

    return np.zeros(len(df), dtype=int)


def compute_all_metrics(y_true, y_pred, y_prob=None):
    """Compute a comprehensive dict of classification metrics safely aligned via pandas."""
    # Ensure they are aligned by loading into a DataFrame
    data_dict = {"true": y_true, "pred": y_pred}
    if y_prob is not None:
        data_dict["prob"] = y_prob
        
    df = pd.DataFrame(data_dict).dropna()
    y_true_clean = df["true"].values
    y_pred_clean = df["pred"].values
    y_prob_clean = df["prob"].values if y_prob is not None else None

    # Safe fallback if labels are missing
    if len(y_true_clean) == 0:
        return {
            "accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "kappa": 0.0,
            "auc_roc": 0.0
        }

    metrics = {
        "accuracy": float(accuracy_score(y_true_clean, y_pred_clean)),
        "precision": float(precision_score(y_true_clean, y_pred_clean, zero_division=0)),
        "recall": float(recall_score(y_true_clean, y_pred_clean, zero_division=0)),
        "f1": float(f1_score(y_true_clean, y_pred_clean, zero_division=0)),
        "kappa": float(cohen_kappa_score(y_true_clean, y_pred_clean)),
    }
    if y_prob_clean is not None:
        try:
            metrics["auc_roc"] = float(roc_auc_score(y_true_clean, y_prob_clean))
        except ValueError:
            metrics["auc_roc"] = 0.0
    return metrics


def plot_confusion_matrix(y_true, y_pred, title="Confusion Matrix",
                           filename="confusion_matrix.png"):
    """Plot and save a styled confusion matrix with Pandas-aligned data."""
    df = pd.DataFrame({"true": y_true, "pred": y_pred}).dropna()
    y_true_clean = df["true"].values
    y_pred_clean = df["pred"].values

    cm = confusion_matrix(y_true_clean, y_pred_clean)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="rocket_r",
                xticklabels=["Control", "ADHD"],
                yticklabels=["Control", "ADHD"],
                linewidths=0.5, linecolor="#30363D",
                cbar_kws={"shrink": 0.8}, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(title, fontsize=13, fontweight="bold", pad=12)
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_roc_curve(y_true, y_prob, model_name="Model",
                   filename="roc_curve.png"):
    """Plot and save a ROC curve safely aligned via pandas."""
    df = pd.DataFrame({"true": y_true, "prob": y_prob}).dropna()
    y_true_clean = df["true"].values
    y_prob_clean = df["prob"].values

    fpr, tpr, _ = roc_curve(y_true_clean, y_prob_clean)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(fpr, tpr, color=COLORS["primary"], lw=2.5,
            label=f"{model_name} (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], "--", color="#484F58", lw=1)
    ax.fill_between(fpr, tpr, alpha=0.15, color=COLORS["primary"])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"ROC Curve  -  {model_name}", fontsize=13,
                 fontweight="bold", pad=12)
    ax.legend(loc="lower right")
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.02])
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_multi_roc(roc_data: dict, filename="roc_comparison.png"):
    """Plot multiple ROC curves on one figure safely aligned via pandas."""
    fig, ax = plt.subplots(figsize=(8, 6))
    colors = ["#6C5CE7", "#00CEC9", "#FD79A8", "#FDCB6E", "#E17055", "#74B9FF"]

    for i, (name, data) in enumerate(roc_data.items()):
        df = pd.DataFrame({"true": data["y_true"], "prob": data["y_prob"]}).dropna()
        fpr, tpr, _ = roc_curve(df["true"], df["prob"])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=colors[i % len(colors)], lw=2,
                label=f"{name} (AUC = {roc_auc:.3f})")

    ax.plot([0, 1], [0, 1], "--", color="#484F58", lw=1)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curves  -  Model Comparison", fontsize=14,
                 fontweight="bold", pad=12)
    ax.legend(loc="lower right", fontsize=9)
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.02])
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_model_comparison(results: dict, filename="model_comparison.png"):
    """Bar chart comparing metrics across models."""
    metrics_to_plot = ["accuracy", "precision", "recall", "f1", "auc_roc"]
    model_names = list(results.keys())
    n_models = len(model_names)
    n_metrics = len(metrics_to_plot)

    fig, ax = plt.subplots(figsize=(12, 6))
    x = np.arange(n_metrics)
    width = 0.8 / n_models
    colors = ["#6C5CE7", "#00CEC9", "#FD79A8", "#FDCB6E", "#E17055", "#74B9FF"]

    for i, model in enumerate(model_names):
        vals = [results[model].get(m, 0) for m in metrics_to_plot]
        offset = (i - n_models / 2 + 0.5) * width
        bars = ax.bar(x + offset, vals, width * 0.9,
                      label=model, color=colors[i % len(colors)],
                      edgecolor="#0D1117", linewidth=0.5)
        # Value labels on bars
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.008,
                    f"{val:.2f}", ha="center", va="bottom", fontsize=7,
                    color="#C9D1D9")

    ax.set_xticks(x)
    ax.set_xticklabels([m.replace("_", " ").title() for m in metrics_to_plot])
    ax.set_ylim(0, 1.12)
    ax.set_title("Model Performance Comparison (Subject-Level)",
                 fontsize=14, fontweight="bold", pad=12)
    ax.legend(loc="upper right", fontsize=8)
    ax.grid(axis="y", alpha=0.15)
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_feature_importance(importances, feature_names, top_n=30,
                            model_name="Model",
                            filename="feature_importance.png"):
    """Plot top-N feature importances as horizontal bar chart."""
    idx = np.argsort(importances)[-top_n:]
    fig, ax = plt.subplots(figsize=(10, 8))

    colors = plt.cm.viridis(np.linspace(0.3, 0.9, top_n))
    ax.barh(range(top_n), importances[idx], color=colors,
            edgecolor="#0D1117", linewidth=0.5)
    ax.set_yticks(range(top_n))
    ax.set_yticklabels([feature_names[i] for i in idx], fontsize=8)
    ax.set_xlabel("Importance")
    ax.set_title(f"Top {top_n} Features  -  {model_name}",
                 fontsize=13, fontweight="bold", pad=12)
    ax.grid(axis="x", alpha=0.15)
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_class_balance(df, filename="01_class_distribution.png"):
    """Generate and save Class Balance bar chart."""
    fig, ax = plt.subplots(figsize=(6, 5))
    
    df_safe = pd.DataFrame({"Class": df["Class"]})
    counts = df_safe["Class"].value_counts()
    
    colors = [COLORS.get(cat, COLORS["primary"]) for cat in counts.index]
    bars = ax.bar(counts.index, counts.values, color=colors, edgecolor="#30363D", width=0.6)
    
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 10,
                f"{height:,}", ha='center', va='bottom', color='#C9D1D9')
                
    ax.set_ylabel("Number of Samples")
    ax.set_title("Class Balance (ADHD vs Control)", fontsize=13, fontweight="bold", pad=12)
    ax.set_ylim(0, max(counts.values) * 1.15)
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_boxplot_by_class(df, channels=["Fp1", "Cz", "Fz", "Pz"], filename="09_boxplot_channels.png"):
    """Generate and save Boxplot range visualizations grouped by target outcome class."""
    df_safe = df[channels + ["Class"]].copy()
    df_melt = df_safe.melt(id_vars="Class", value_vars=channels, var_name="Channel", value_name="Voltage")
    
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.boxplot(
        data=df_melt, x="Channel", y="Voltage", hue="Class",
        palette={"ADHD": COLORS["ADHD"], "Control": COLORS["Control"]},
        ax=ax, flierprops={"markerfacecolor": "gray", "markersize": 2, "alpha": 0.3}
    )
    
    ax.set_xlabel("EEG Channel")
    ax.set_ylabel("Signal Voltage (μV)")
    ax.set_title("EEG Signal Amplitude Ranges by Patient Class", fontsize=13, fontweight="bold", pad=12)
    ax.grid(axis="y", alpha=0.15)
    plt.tight_layout()
    path = os.path.join(FIGURES_DIR, filename)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return path


def save_results_json(results: dict, filename: str = "results.json"):
    """Save results dict to JSON."""
    path = os.path.join(RESULTS_DIR, filename)
    with open(path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    return path

