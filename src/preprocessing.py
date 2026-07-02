"""
EEG preprocessing: filtering, normalization, windowing, artifact rejection.
"""
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt
from config import (
    CHANNEL_NAMES, SAMPLING_RATE, BANDPASS_LOW, BANDPASS_HIGH,
    FILTER_ORDER, WINDOW_SIZE, STEP_SIZE, ARTIFACT_THRESHOLD_UV,
)


# ── Butterworth bandpass filter ──────────────────────────────────────

def _butter_bandpass(low, high, fs, order):
    nyq = 0.5 * fs
    b, a = butter(order, [low / nyq, high / nyq], btype="band")
    return b, a


def bandpass_filter(signal: np.ndarray, fs: int = SAMPLING_RATE,
                    low: float = BANDPASS_LOW, high: float = BANDPASS_HIGH,
                    order: int = FILTER_ORDER) -> np.ndarray:
    """
    Apply zero-phase Butterworth bandpass filter to a 1-D signal.
    """
    b, a = _butter_bandpass(low, high, fs, order)
    return filtfilt(b, a, signal, padlen=min(3 * max(len(b), len(a)), len(signal) - 1))


# ── Per-subject preprocessing ────────────────────────────────────────

def preprocess_subject(eeg_data: np.ndarray) -> np.ndarray:
    """
    Preprocess a single subject's raw EEG matrix.

    Parameters
    ----------
    eeg_data : np.ndarray, shape (n_samples, n_channels)
        Raw EEG voltage values.

    Returns
    -------
    np.ndarray, shape (n_samples, n_channels)
        Filtered and z-score normalized EEG.
    """
    n_samples, n_channels = eeg_data.shape
    processed = np.zeros_like(eeg_data, dtype=np.float64)

    for ch in range(n_channels):
        # 1. Bandpass filter
        filtered = bandpass_filter(eeg_data[:, ch].astype(np.float64))

        # 2. Z-score normalize per channel
        mu = np.mean(filtered)
        sigma = np.std(filtered)
        if sigma > 0:
            filtered = (filtered - mu) / sigma

        processed[:, ch] = filtered

    return processed


# ── Windowing ────────────────────────────────────────────────────────

def segment_into_windows(eeg_data: np.ndarray,
                         window_size: int = WINDOW_SIZE,
                         step_size: int = STEP_SIZE) -> np.ndarray:
    """
    Segment a continuous EEG recording into overlapping windows.

    Parameters
    ----------
    eeg_data : np.ndarray, shape (n_samples, n_channels)
    window_size : int
    step_size : int

    Returns
    -------
    np.ndarray, shape (n_windows, window_size, n_channels)
    """
    n_samples, n_channels = eeg_data.shape
    n_windows = (n_samples - window_size) // step_size + 1

    if n_windows <= 0:
        return np.empty((0, window_size, n_channels))

    windows = np.zeros((n_windows, window_size, n_channels))
    for i in range(n_windows):
        start = i * step_size
        windows[i] = eeg_data[start: start + window_size]

    return windows


def reject_artifacts(windows: np.ndarray,
                     threshold: float = ARTIFACT_THRESHOLD_UV) -> np.ndarray:
    """
    Remove windows where any channel's absolute value exceeds threshold.
    Applied AFTER z-score normalization, so threshold is in z-score units.

    Parameters
    ----------
    windows : np.ndarray, shape (n_windows, window_size, n_channels)
    threshold : float
        Max allowed absolute z-score value (default: 150, very permissive
        post-normalization to only catch extreme outliers)

    Returns
    -------
    np.ndarray  -  cleaned windows
    """
    max_vals = np.abs(windows).max(axis=(1, 2))  # max per window
    clean_mask = max_vals < threshold
    n_rejected = (~clean_mask).sum()
    if n_rejected > 0:
        pass  # silently reject  -  caller can check shape
    return windows[clean_mask]


def preprocess_and_window_subject(subject_eeg: np.ndarray):
    """
    Full preprocessing pipeline for one subject.

    Parameters
    ----------
    subject_eeg : np.ndarray, shape (n_samples, n_channels)

    Returns
    -------
    windows : np.ndarray, shape (n_windows, window_size, n_channels)
    """
    processed = preprocess_subject(subject_eeg)
    windows = segment_into_windows(processed)
    windows = reject_artifacts(windows)
    return windows


def preprocess_all_subjects(df: pd.DataFrame, max_samples: int = None):
    """
    Preprocess the entire dataset subject by subject.

    Parameters
    ----------
    df : pd.DataFrame
    max_samples : int, optional
        Max samples to take per subject (from the middle of the recording).
        If None, uses config.MAX_SAMPLES_PER_SUBJECT.

    Returns
    -------
    all_windows : np.ndarray, shape (total_windows, window_size, n_channels)
    window_labels : np.ndarray, shape (total_windows,) - 1=ADHD, 0=Control
    window_subject_ids : np.ndarray, shape (total_windows,) - subject ID per window
    """
    from config import MAX_SAMPLES_PER_SUBJECT

    if max_samples is None:
        max_samples = MAX_SAMPLES_PER_SUBJECT

    all_windows_list = []
    all_labels_list = []
    all_ids_list = []

    subjects = df["ID"].unique()
    total = len(subjects)

    for idx, subject_id in enumerate(subjects):
        subject_df = df[df["ID"] == subject_id]
        label = 1 if subject_df["Class"].iloc[0] == "ADHD" else 0
        eeg_data = subject_df[CHANNEL_NAMES].values

        # Subsample from the middle of the recording
        n_total = len(eeg_data)
        if max_samples > 0 and n_total > max_samples:
            start_idx = (n_total - max_samples) // 2
            eeg_data = eeg_data[start_idx: start_idx + max_samples]

        windows = preprocess_and_window_subject(eeg_data)
        n_win = windows.shape[0]

        if n_win > 0:
            all_windows_list.append(windows)
            all_labels_list.append(np.full(n_win, label, dtype=int))
            all_ids_list.append(np.full(n_win, subject_id, dtype=object))

        if (idx + 1) % 20 == 0 or idx == total - 1:
            print(f"[Preprocessing] {idx + 1}/{total} subjects done, "
                  f"subject {subject_id}: {n_total} -> {len(eeg_data)} samples -> {n_win} windows")

    all_windows = np.concatenate(all_windows_list, axis=0)
    window_labels = np.concatenate(all_labels_list, axis=0)
    window_subject_ids = np.concatenate(all_ids_list, axis=0)

    print(f"[Preprocessing] Total: {all_windows.shape[0]} windows "
          f"from {total} subjects")

    return all_windows, window_labels, window_subject_ids
