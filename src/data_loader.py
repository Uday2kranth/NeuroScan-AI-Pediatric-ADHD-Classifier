"""
Data loading and validation for the ADHD EEG dataset.
"""
import pandas as pd
import numpy as np
from config import DATA_PATH, CHANNEL_NAMES


def load_eeg_data(path: str = DATA_PATH) -> pd.DataFrame:
    """
    Load the EEG CSV and validate its structure.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: 19 EEG channels + 'Class' + 'ID'
    """
    print(f"[DataLoader] Loading data from {path} ...")
    df = pd.read_csv(path)

    # Validate expected columns exist
    expected_cols = CHANNEL_NAMES + ["Class", "ID"]
    missing = [c for c in expected_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    # Keep only expected columns in canonical order
    df = df[expected_cols]

    # Validate no NaNs in EEG channels
    nan_counts = df[CHANNEL_NAMES].isna().sum()
    if nan_counts.any():
        print(f"[DataLoader] WARNING  -  NaN values found:\n{nan_counts[nan_counts > 0]}")
        print("[DataLoader] Dropping rows with NaN values ...")
        df = df.dropna(subset=CHANNEL_NAMES)

    # Validate classes
    unique_classes = df["Class"].unique()
    assert set(unique_classes) == {"ADHD", "Control"}, \
        f"Unexpected classes: {unique_classes}"

    print(f"[DataLoader] Loaded {len(df):,} samples, "
          f"{df['ID'].nunique()} subjects, "
          f"classes: {dict(df['Class'].value_counts())}")

    return df


def get_subject_info(df: pd.DataFrame) -> pd.DataFrame:
    """
    Get per-subject summary information.

    Returns
    -------
    pd.DataFrame
        Columns: ID, Class, num_samples, duration_seconds
    """
    from config import SAMPLING_RATE

    info = (
        df.groupby(["ID", "Class"])
        .size()
        .reset_index(name="num_samples")
    )
    info["duration_seconds"] = info["num_samples"] / SAMPLING_RATE
    return info


def get_subject_groups(df: pd.DataFrame):
    """
    Extract group labels and class labels for group-stratified CV.

    Returns
    -------
    groups : np.ndarray of subject IDs (one per row in df)
    labels : np.ndarray of binary labels (1 = ADHD, 0 = Control)
    """
    groups = df["ID"].values
    labels = (df["Class"] == "ADHD").astype(int).values
    return groups, labels


def encode_labels(df: pd.DataFrame) -> np.ndarray:
    """Convert 'ADHD'/'Control' to 1/0."""
    return (df["Class"] == "ADHD").astype(int).values
