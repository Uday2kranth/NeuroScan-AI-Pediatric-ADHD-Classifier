import os
import sys
import urllib.request

REPO_URL = "https://raw.githubusercontent.com/Uday2kranth/NeuroScan-AI-Pediatric-ADHD-Classifier/main"

files_to_download = [
    "outputs/models/best_model.joblib",
    "outputs/models/scaler.joblib",
    "outputs/results/model_results.json",
    "outputs/results/feature_importances.json",
    # Figures
    "outputs/figures/01_class_distribution.png",
    "outputs/figures/02_sample_counts.png",
    "outputs/figures/03_raw_eeg.png",
    "outputs/figures/04_channel_distributions.png",
    "outputs/figures/05_correlation_heatmap.png",
    "outputs/figures/06_psd_comparison.png",
    "outputs/figures/07_theta_beta_ratio.png",
    "outputs/figures/08_channel_variance.png",
    "outputs/figures/cm_knn_cv.png",
    "outputs/figures/cm_test_set.png",
    "outputs/figures/feature_importance_best.png",
    "outputs/figures/model_comparison.png",
    "outputs/figures/roc_comparison.png",
    "outputs/figures/roc_knn_cv.png",
    "outputs/figures/roc_test_set.png"
]

def main():
    print("====================================================")
    print(" Downloading pre-trained model artifacts from GitHub")
    print("====================================================")
    for f in files_to_download:
        os.makedirs(os.path.dirname(f), exist_ok=True)
        url = f"{REPO_URL}/{f}"
        print(f"Downloading {url} -> {f} ...")
        try:
            # Add headers to avoid potential request blocks
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req) as response, open(f, 'wb') as out_file:
                out_file.write(response.read())
        except Exception as e:
            print(f"  [ERROR] Failed to download {f}: {e}")
            # If it's a critical model file, warn but carry on (model can be trained in app)
            if "best_model.joblib" in f or "scaler.joblib" in f:
                print("  Critical file download failed! Continuing build (user can train model dynamically).")

if __name__ == "__main__":
    main()
