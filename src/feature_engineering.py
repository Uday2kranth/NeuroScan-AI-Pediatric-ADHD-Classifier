"""
Feature extraction from windowed EEG data.

Extracts time-domain, frequency-domain, and inter-channel connectivity
features from each window of preprocessed EEG.
"""
import numpy as np
from scipy import stats as sp_stats
from scipy.signal import welch, coherence
from config import SAMPLING_RATE, CHANNEL_NAMES, FREQ_BANDS, SYMMETRIC_PAIRS


# =======================================================================
# TIME-DOMAIN FEATURES
# =======================================================================

def _hjorth_params(signal: np.ndarray):
    """Compute Hjorth Activity, Mobility, Complexity."""
    diff1 = np.diff(signal)
    diff2 = np.diff(diff1)

    activity = np.var(signal)
    mobility = np.sqrt(np.var(diff1) / activity) if activity > 0 else 0
    complexity = (
        (np.sqrt(np.var(diff2) / np.var(diff1)) / mobility)
        if mobility > 0 and np.var(diff1) > 0 else 0
    )
    return activity, mobility, complexity


def _zero_crossing_rate(signal: np.ndarray) -> float:
    """Fraction of consecutive samples that cross zero."""
    return np.sum(np.diff(np.sign(signal)) != 0) / len(signal)


def extract_time_features(window: np.ndarray) -> np.ndarray:
    """
    Extract time-domain features from a single window.

    Parameters
    ----------
    window : np.ndarray, shape (window_size, n_channels)

    Returns
    -------
    np.ndarray, shape (n_channels * 9,)
        Per channel: mean, std, skewness, kurtosis, rms, zcr,
        hjorth_activity, hjorth_mobility, hjorth_complexity
    """
    features = []
    for ch in range(window.shape[1]):
        sig = window[:, ch]
        activity, mobility, complexity = _hjorth_params(sig)
        features.extend([
            np.mean(sig),
            np.std(sig),
            sp_stats.skew(sig),
            sp_stats.kurtosis(sig),
            np.sqrt(np.mean(sig ** 2)),        # RMS
            _zero_crossing_rate(sig),
            activity,
            mobility,
            complexity,
        ])
    return np.array(features, dtype=np.float64)


# =======================================================================
# FREQUENCY-DOMAIN FEATURES
# =======================================================================

def _band_power(psd: np.ndarray, freqs: np.ndarray,
                low: float, high: float) -> float:
    """Compute average power in a frequency band."""
    idx = np.where((freqs >= low) & (freqs <= high))[0]
    if len(idx) == 0:
        return 0.0
    return np.trapezoid(psd[idx], freqs[idx])


def extract_freq_features(window: np.ndarray,
                          fs: int = SAMPLING_RATE) -> np.ndarray:
    """
    Extract frequency-domain features from a single window.

    Parameters
    ----------
    window : np.ndarray, shape (window_size, n_channels)

    Returns
    -------
    np.ndarray, shape (n_channels * (n_bands + 1),)
        Per channel: power in each band + theta/beta ratio
    """
    features = []
    n_bands = len(FREQ_BANDS)

    for ch in range(window.shape[1]):
        sig = window[:, ch]
        freqs, psd = welch(sig, fs=fs, nperseg=min(len(sig), 128),
                           noverlap=64)

        band_powers = {}
        for band_name, (low, high) in FREQ_BANDS.items():
            bp = _band_power(psd, freqs, low, high)
            band_powers[band_name] = bp
            features.append(bp)

        # Theta / Beta ratio  -  key ADHD biomarker
        theta = band_powers.get("theta", 0)
        beta = band_powers.get("beta", 0)
        tbr = theta / beta if beta > 1e-10 else 0.0
        features.append(tbr)

    return np.array(features, dtype=np.float64)


# =======================================================================
# CONNECTIVITY FEATURES
# =======================================================================

def extract_connectivity_features(window: np.ndarray,
                                  fs: int = SAMPLING_RATE) -> np.ndarray:
    """
    Extract inter-hemispheric coherence for symmetric channel pairs.

    Parameters
    ----------
    window : np.ndarray, shape (window_size, n_channels)

    Returns
    -------
    np.ndarray, shape (n_pairs * 2,)
        Coherence in theta band and alpha band for each symmetric pair
    """
    features = []
    ch_idx = {name: i for i, name in enumerate(CHANNEL_NAMES)}

    for ch_left, ch_right in SYMMETRIC_PAIRS:
        if ch_left not in ch_idx or ch_right not in ch_idx:
            features.extend([0.0, 0.0])
            continue

        sig_left = window[:, ch_idx[ch_left]]
        sig_right = window[:, ch_idx[ch_right]]

        nperseg = min(len(sig_left), 128)
        freqs, coh = coherence(sig_left, sig_right, fs=fs,
                               nperseg=nperseg, noverlap=nperseg // 2)

        # Average coherence in theta band
        theta_idx = np.where((freqs >= 4) & (freqs <= 8))[0]
        theta_coh = np.mean(coh[theta_idx]) if len(theta_idx) > 0 else 0.0

        # Average coherence in alpha band
        alpha_idx = np.where((freqs >= 8) & (freqs <= 13))[0]
        alpha_coh = np.mean(coh[alpha_idx]) if len(alpha_idx) > 0 else 0.0

        features.extend([theta_coh, alpha_coh])

    return np.array(features, dtype=np.float64)


# =======================================================================
# COMBINED FEATURE EXTRACTION
# =======================================================================

def extract_all_features(window: np.ndarray) -> np.ndarray:
    """
    Extract all features from a single window.

    Returns
    -------
    np.ndarray, shape (total_features,)
    """
    time_feats = extract_time_features(window)
    freq_feats = extract_freq_features(window)
    conn_feats = extract_connectivity_features(window)
    return np.concatenate([time_feats, freq_feats, conn_feats])


def get_feature_names() -> list:
    """
    Get descriptive names for all features.
    """
    names = []
    time_feat_names = [
        "mean", "std", "skewness", "kurtosis", "rms", "zcr",
        "hjorth_activity", "hjorth_mobility", "hjorth_complexity",
    ]
    freq_feat_names = list(FREQ_BANDS.keys()) + ["theta_beta_ratio"]

    for ch in CHANNEL_NAMES:
        for feat in time_feat_names:
            names.append(f"{ch}_{feat}")

    for ch in CHANNEL_NAMES:
        for feat in freq_feat_names:
            names.append(f"{ch}_{feat}")

    for ch_left, ch_right in SYMMETRIC_PAIRS:
        names.append(f"{ch_left}_{ch_right}_theta_coherence")
        names.append(f"{ch_left}_{ch_right}_alpha_coherence")

    return names


def extract_features_from_windows(windows: np.ndarray,
                                  show_progress: bool = True) -> np.ndarray:
    """
    Extract features from all windows.

    Parameters
    ----------
    windows : np.ndarray, shape (n_windows, window_size, n_channels)

    Returns
    -------
    np.ndarray, shape (n_windows, n_features)
    """
    n_windows = windows.shape[0]
    if n_windows == 0:
        return np.empty((0, 0))

    # Extract first window to determine feature count
    first = extract_all_features(windows[0])
    n_features = len(first)

    feature_matrix = np.zeros((n_windows, n_features), dtype=np.float64)
    feature_matrix[0] = first

    for i in range(1, n_windows):
        feature_matrix[i] = extract_all_features(windows[i])
        if show_progress and (i + 1) % 5000 == 0:
            print(f"  [FeatureExtraction] {i + 1}/{n_windows} windows processed")

    if show_progress:
        print(f"  [FeatureExtraction] Done  -  {n_windows} windows x "
              f"{n_features} features")

    return feature_matrix
