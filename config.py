"""
Central configuration for the ADHD EEG Classification pipeline.
All hyperparameters and paths are defined here for easy tuning.
"""
import os

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "adhdata.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
FIGURES_DIR = os.path.join(OUTPUT_DIR, "figures")
MODELS_DIR = os.path.join(OUTPUT_DIR, "models")
RESULTS_DIR = os.path.join(OUTPUT_DIR, "results")
DATA_PARTS_DIR = os.path.join(BASE_DIR, "data_parts")

# ── EEG Recording Parameters ──────────────────────────────────────────
SAMPLING_RATE = 128  # Hz
CHANNEL_NAMES = [
    "Fp1", "Fp2", "F3", "F4", "C3", "C4", "P3", "P4",
    "O1", "O2", "F7", "F8", "T7", "T8", "P7", "P8",
    "Fz", "Cz", "Pz",
]
NUM_CHANNELS = len(CHANNEL_NAMES)  # 19

# ── Windowing ─────────────────────────────────────────────────────────
WINDOW_SECONDS = 2          # seconds per window
WINDOW_SIZE = SAMPLING_RATE * WINDOW_SECONDS  # 256 samples
OVERLAP_RATIO = 0.5         # 50 % overlap
STEP_SIZE = int(WINDOW_SIZE * (1 - OVERLAP_RATIO))  # 128 samples

# ── Filtering ─────────────────────────────────────────────────────────
BANDPASS_LOW = 0.5   # Hz
BANDPASS_HIGH = 45.0 # Hz
FILTER_ORDER = 4     # Butterworth filter order

# ── Frequency Bands (Hz) ─────────────────────────────────────────────
FREQ_BANDS = {
    "delta": (0.5, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta":  (13, 30),
    "gamma": (30, 45),
}

# ── Symmetric Channel Pairs (for coherence) ──────────────────────────
SYMMETRIC_PAIRS = [
    ("Fp1", "Fp2"),
    ("F3", "F4"),
    ("C3", "C4"),
    ("P3", "P4"),
    ("O1", "O2"),
    ("F7", "F8"),
    ("T7", "T8"),
    ("P7", "P8"),
]

# ── Subsampling ──────────────────────────────────────────────────
# Take a fixed number of samples from the MIDDLE of each subject's
# recording (the middle avoids start/end artifacts). This dramatically
# speeds up processing while preserving per-subject representativeness.
MAX_SAMPLES_PER_SUBJECT = 5120   # ~40 seconds at 128 Hz -> ~38 windows each

# ── Train / Test Split ───────────────────────────────────────────
# Hold out 20% of subjects as a final unseen test set (subject-level split).
# The remaining 80% are used for cross-validation during training.
TEST_SPLIT_RATIO = 0.2

# ── Cross-validation ─────────────────────────────────────────────
N_FOLDS = 5
RANDOM_STATE = 42

# ── Artifact Rejection ───────────────────────────────────────────
ARTIFACT_THRESHOLD_UV = 150  # reject windows where any channel exceeds this (z-score units)

# ── Ensure output dirs exist ─────────────────────────────────────────
for d in [OUTPUT_DIR, FIGURES_DIR, MODELS_DIR, RESULTS_DIR]:
    os.makedirs(d, exist_ok=True)
