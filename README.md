---
title: NeuroScan AI Backend
emoji: 🧠
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Algorithmic Decoding of Pediatric Brainwaves (NeuroScan AI)

**A Machine Learning Framework & AI Copilot for Automated ADHD Classification from EEG Data**

---

## Overview

This project implements an end-to-end machine learning pipeline for classifying Attention Deficit Hyperactivity Disorder (ADHD) from 19-channel EEG recordings of pediatric subjects. 

It features:
1. **Automated ML Pipeline (Python)**: Extracts time-domain, frequency-domain, and connectivity features from windowed EEG signals and trains multiple classifiers with subject-level cross-validation.
2. **AI Copilot Chat Interface (LangChain)**: An LLM-powered assistant integrated directly into the dashboard. It uses web search tools (DuckDuckGo) to retrieve context, explains diagnostic results to parents in clean, everyday language, and supports sending reports via Gmail.
3. **Academic Statistical Pipeline (R)**: A base R script designed for formal academic analysis, containing data cleaning (IQR outlier removal), descriptive statistics, hypothesis testing (t-test, Chi-square, ANOVA), and simple linear regression.

---

## Dataset

- **Source**: Shahed University, released via IEEE
- **DOI**: [10.21227/rzfh-zn36](https://doi.org/10.21227/rzfh-zn36)
- **Subjects**: 61 ADHD + 60 healthy controls (ages 7-12)
- **Channels**: 19 EEG channels (10-20 international system) at 128 Hz
- **Task**: Visual attention counting task with cartoon characters

---

## Project Structure

```
├── adhdata.csv                  # Raw EEG dataset
├── data_parts/                  # Split dataset files for efficient loading
├── config.py                    # Central configuration & parameters
├── main.py                      # End-to-end ML training & compilation pipeline
├── run_project.py               # Smart single-entry startup script
├── TRANSFER_GUIDE.md            # Transfer & setup instructions for new devices
├── requirements.txt             # Python dependencies
├── README.md
├── src/
│   ├── data_loader.py           # Data loading & validation
│   ├── preprocessing.py         # Filtering, normalization, windowing
│   ├── feature_engineering.py   # Feature extraction (238 features)
│   ├── model_training.py        # Training with GroupKFold CV
│   └── utils.py                 # Plotting & metrics helpers
├── server/
│   ├── main.py                  # FastAPI backend server
│   └── chat_agent.py            # AI Copilot engine (LangChain agent with tool access)
├── frontend/                    # React (Vite) dashboard
│   ├── src/
│   │   ├── pages/               # Dashboard, EDA, Performance, Predict, Features
│   │   └── components/          # Sidebar, ChatDrawer (AI Copilot drawer), Cards
│   └── ...
├── academic_pipeline/           # Standalone R statistical analysis
│   ├── academic_pipeline.R      # R statistical tests (t-test, Chi-square, ANOVA, regression)
│   └── README.md                # R pipeline documentation
└── outputs/                     # Generated at runtime
    ├── figures/                 # Plots & visualizations
    ├── models/                  # Saved model & scaler artifacts
    └── results/                 # JSON results & feature matrices
```

---

## Quick Start

### 1. Unified Startup Script (Recommended)
You can run the entire stack (verify/install Python packages, npm install React dependencies, train/load the ML model, launch servers, and open the browser) automatically using a single command:

```bash
python run_project.py
```

This starts the **FastAPI backend** on port **8002**, the **Vite React dashboard** on port **5173**, and automatically launches your browser.

---

### 2. Running the Academic R Statistical Pipeline
To execute the base R statistical pipeline and generate descriptive/hypothesis reports along with a cleaned dataset:

```bash
cd academic_pipeline
Rscript academic_pipeline.R
```

---

### 3. Manual Component Start (Alternative)
If you prefer starting components separately:

#### A. Train / Validate Models
```bash
python main.py
```

#### B. Start FastAPI Backend
```bash
cd server
python -m uvicorn main:app --reload --port 8002
```

#### C. Start React Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Docker Deployment (Hugging Face Spaces SDK)

A lightweight `Dockerfile` and optimized `.dockerignore` are included to package the FastAPI backend directly for containerized hosting.

### 1. Build and Run Locally
```bash
# Build the image (runs training pipeline automatically)
docker build -t neuroscan-backend .

# Run the container
docker run -p 7860:7860 neuroscan-backend
```
The server will be active at `http://localhost:7860`.

### 2. Deploy to Hugging Face Spaces
1. Create a **New Space** on Hugging Face.
2. Choose **Docker** as the SDK (select **Blank** template).
3. Push your repository to Hugging Face.
4. Set the environment variable `VITE_API_URL` on your frontend host (Vercel) to:
   `https://<username>-<space-name>.hf.space/api`

---

## AI Copilot & NVIDIA NIM Integrations

The integrated Copilot assistant utilizes state-of-the-art hosted model API routes:
- **Default model**: `minimaxai/minimax-m2.7`
- **Supported NIM providers**: DeepSeek 3.2, Kimi 2.5, GLM 5.1, GPT-OSS-120B, and Sarvam-M.
- **Multilingual Support**: Can translate clinical insights, reports, and EEG frequency explanations into major Indic languages (Hindi, Bengali, Marathi, Telugu, Tamil, etc.).

---

## ML Pipeline Details

### Preprocessing
1. **Bandpass filtering** (0.5–45 Hz, 4th order Butterworth)
2. **Z-score normalization** per channel per subject
3. **Windowing**: 2-second windows (256 samples) with 50% overlap
4. **Artifact rejection**: Remove windows exceeding amplitude thresholds

### Feature Extraction (238 features per window)
- **Time-domain** (9 × 19 channels = 171): mean, std, skewness, kurtosis, RMS, zero-crossing rate, Hjorth parameters
- **Frequency-domain** (6 × 19 channels = 114): band powers (delta, theta, alpha, beta, gamma) + theta/beta ratio
- **Connectivity** (2 × 8 pairs = 16): inter-hemispheric coherence in theta and alpha bands

### Supported Classifiers
- **Random Forest**: 200 trees, balanced class weights
- **XGBoost**: Gradient boosting with auto class weighting
- **LightGBM**: Fast gradient boosting
- **SVM (RBF)**: Support vector machine with RBF kernel
- **Logistic Regression**: Linear baseline
- **KNN**: K-nearest neighbors (K=7)

---

## Citation

```
Ali Motie Nasrabadi, Armin Allahverdy, Mehdi Samavati, Mohammad Reza Mohammadi
DOI: 10.21227/rzfh-zn36
License: Creative Commons Attribution
```
