"""
FastAPI backend for the ADHD EEG Classification dashboard.

Serves:
 - EDA data (figures, dataset stats)
 - Model training results
 - Real-time prediction on uploaded EEG data
 - Feature importance data
"""
import os
import sys
import json
import glob
import numpy as np
import pandas as pd
import joblib
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add project root (parent of server/) to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from config import (
    CHANNEL_NAMES, FIGURES_DIR, MODELS_DIR, RESULTS_DIR, OUTPUT_DIR,
    SAMPLING_RATE, WINDOW_SIZE, STEP_SIZE,
)

app = FastAPI(
    title="ADHD Brainwave Decoder API",
    description="ML-powered ADHD classification from EEG data",
    version="1.0.0",
)

# CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve figures as static files
if os.path.exists(FIGURES_DIR):
    app.mount("/figures", StaticFiles(directory=FIGURES_DIR), name="figures")


# -- Helpers ----------------------------------------------------------

from pydantic import BaseModel
from typing import Optional, List

class ChannelValues(BaseModel):
    Fp1: float
    Fp2: float
    F3: float
    F4: float
    C3: float
    C4: float
    P3: float
    P4: float
    O1: float
    O2: float
    F7: float
    F8: float
    T7: float
    T8: float
    P7: float
    P8: float
    Fz: float
    Cz: float
    Pz: float

class PredictValuesPayload(BaseModel):
    values: ChannelValues

class ChatPayload(BaseModel):
    message: str
    session_id: str
    chat_provider: str
    chat_model: str
    chat_api_key: Optional[str] = None
    simulator_state: Optional[dict] = None


chat_histories = {}
_latest_prediction = None

_model_cache = {}
_results_cache = {}
_dataset_info_cache = None
_feature_importances_cache = None
_sample_values_df_cache = None


def _get_available_data_path():
    """
    Return the best available dataset CSV path.
    Checks for the full dataset first, then falls back to the small sample.
    Works identically on local dev and deployed containers.
    """
    from config import DATA_PATH, DATA_PARTS_DIR
    if os.path.exists(DATA_PATH):
        return DATA_PATH
    # Fallback to sample CSV (always committed to both repos)
    sample_path = os.path.join(DATA_PARTS_DIR, "adhdata_sample.csv")
    if os.path.exists(sample_path):
        return sample_path
    return None



def _load_model():
    if "model" not in _model_cache:
        model_path = os.path.join(MODELS_DIR, "best_model.joblib")
        scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
        if not os.path.exists(model_path):
            return None, None
        try:
            _model_cache["model"] = joblib.load(model_path)
            _model_cache["scaler"] = joblib.load(scaler_path)
        except Exception as e:
            print(f"[ModelLoader] Error loading model/scaler: {e}")
            return None, None
    return _model_cache.get("model"), _model_cache.get("scaler")


def _load_results():
    path = os.path.join(RESULTS_DIR, "model_results.json")
    if not os.path.exists(path):
        return None
    if "results" not in _results_cache:
        with open(path) as f:
            _results_cache["results"] = json.load(f)
    return _results_cache["results"]


def _load_feature_importances():
    global _feature_importances_cache
    if _feature_importances_cache is not None:
        return _feature_importances_cache
    path = os.path.join(RESULTS_DIR, "feature_importances.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        _feature_importances_cache = json.load(f)
    return _feature_importances_cache


# -- API Endpoints ----------------------------------------------------

@app.get("/")
def root():
    return {"status": "ok", "message": "ADHD Brainwave Decoder API"}


@app.get("/api/status")
def get_status():
    """Check if model and results are available."""
    model, scaler = _load_model()
    results = _load_results()
    return {
        "model_trained": model is not None,
        "results_available": results is not None,
        "figures_available": os.path.exists(FIGURES_DIR) and
                            len(os.listdir(FIGURES_DIR)) > 0,
    }


import base64

@app.post("/api/load-sample")
def load_sample():
    """
    Load sample dataset, train model pipeline (or verify trained),
    and return status.
    """
    from main import model_exists, train_pipeline, load_saved_model
    try:
        # Clear cache first to ensure reload
        _model_cache.clear()
        _results_cache.clear()
        global _dataset_info_cache, _feature_importances_cache, _sample_values_df_cache
        _dataset_info_cache = None
        _feature_importances_cache = None
        _sample_values_df_cache = None

        if model_exists():
            # Already trained, load it
            model, scaler, model_name = load_saved_model()
            return {"status": "success", "message": f"Model loaded from cache: {model_name}"}
        else:
            # Run training pipeline
            results, best_name = train_pipeline()
            return {"status": "success", "message": f"Model trained successfully: {best_name}"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reset-session")
def reset_session():
    """
    Reset active session: delete model and results.
    """
    try:
        # Clear caches
        _model_cache.clear()
        _results_cache.clear()
        global _dataset_info_cache, _feature_importances_cache, _sample_values_df_cache
        _dataset_info_cache = None
        _feature_importances_cache = None
        _sample_values_df_cache = None
        
        # Remove output files
        model_path = os.path.join(MODELS_DIR, "best_model.joblib")
        scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
        results_path = os.path.join(RESULTS_DIR, "model_results.json")
        
        for path in [model_path, scaler_path, results_path]:
            if os.path.exists(path):
                os.remove(path)
        
        # Clean up figures if they were generated
        if os.path.exists(FIGURES_DIR):
            for f in glob.glob(os.path.join(FIGURES_DIR, "*.png")):
                try:
                    os.remove(f)
                except:
                    pass
                    
        return {"status": "success", "message": "Session reset successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/confusion-matrix-base64")
def get_confusion_matrix_base64():
    """
    Return the base64 encoded confusion matrix image.
    """
    # Find confusion matrix image in FIGURES_DIR
    cm_path = os.path.join(FIGURES_DIR, "cm_test_set.png")
    if not os.path.exists(cm_path):
        # Fallback to any other cm file
        cm_files = glob.glob(os.path.join(FIGURES_DIR, "cm_*.png"))
        if cm_files:
            cm_path = cm_files[0]
        else:
            return {"image": None}
    try:
        with open(cm_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return {"image": f"data:image/png;base64,{encoded_string}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dataset-info")
def get_dataset_info():
    """
    Return dataset statistics WITHOUT loading the full CSV.
    Uses pre-computed info from the results or reads only ID/Class columns.
    """
    global _dataset_info_cache
    if _dataset_info_cache is not None:
        return _dataset_info_cache
    try:
        data_path = _get_available_data_path()
        if data_path is None:
            raise HTTPException(status_code=503, detail="No dataset available.")

        # Fast path: read only ID and Class columns
        df_meta = pd.read_csv(data_path, usecols=["ID", "Class"])
        total_samples = len(df_meta)
        unique_ids = df_meta.groupby(["ID", "Class"]).size().reset_index(name="num_samples")

        adhd_info = unique_ids[unique_ids["Class"] == "ADHD"]
        ctrl_info = unique_ids[unique_ids["Class"] == "Control"]

        # Handle nan/inf values gracefully for JSON compliance
        def safe_float(val, default=0.0):
            try:
                if pd.isna(val) or np.isnan(val) or np.isinf(val):
                    return default
                return float(val)
            except:
                return default

        result = {
            "total_samples": int(total_samples),
            "total_subjects": int(unique_ids["ID"].nunique()),
            "adhd_subjects": int(len(adhd_info)),
            "control_subjects": int(len(ctrl_info)),
            "channels": CHANNEL_NAMES,
            "sampling_rate": SAMPLING_RATE,
            "adhd_samples": int(df_meta[df_meta["Class"] == "ADHD"].shape[0]),
            "control_samples": int(df_meta[df_meta["Class"] == "Control"].shape[0]),
            "per_subject_stats": {
                "ADHD": {
                    "mean_samples": safe_float(adhd_info["num_samples"].mean()),
                    "std_samples": safe_float(adhd_info["num_samples"].std()),
                    "mean_duration_s": safe_float(adhd_info["num_samples"].mean() / SAMPLING_RATE if len(adhd_info) > 0 else 0.0),
                },
                "Control": {
                    "mean_samples": safe_float(ctrl_info["num_samples"].mean()),
                    "std_samples": safe_float(ctrl_info["num_samples"].std()),
                    "mean_duration_s": safe_float(ctrl_info["num_samples"].mean() / SAMPLING_RATE if len(ctrl_info) > 0 else 0.0),
                },
            },
        }
        _dataset_info_cache = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/figures")
def list_figures():
    """List available EDA/evaluation figures."""
    if not os.path.exists(FIGURES_DIR):
        return {"figures": []}
    files = sorted(glob.glob(os.path.join(FIGURES_DIR, "*.png")))
    figures = []
    for f in files:
        name = os.path.basename(f)
        title = name.replace(".png", "").replace("_", " ").title()
        if title[:3].strip().isdigit():
            title = title[3:].strip()
        figures.append({
            "filename": name,
            "title": title,
            "url": f"/figures/{name}",
        })
    return {"figures": figures}


@app.get("/api/results")
def get_results():
    """Return model training results."""
    results = _load_results()
    if results is None:
        raise HTTPException(
            status_code=404,
            detail="No results found. Run `python main.py` first."
        )
    # Filter out internal test set key for clean display
    filtered = {k: v for k, v in results.items() if k != "__test_set__"}
    test_set = results.get("__test_set__")
    return {
        "cv_results": filtered,
        "test_set_results": test_set,
    }


@app.get("/api/feature-importance")
def get_feature_importance():
    """Return feature importance data."""
    fi = _load_feature_importances()
    if fi is None:
        raise HTTPException(
            status_code=404,
            detail="No feature importance data. Run `python main.py` first."
        )
    top = dict(list(fi.items())[:30])
    return {"feature_importances": top, "total_features": len(fi)}


@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    """
    Predict ADHD/Control from uploaded EEG CSV.
    Expected CSV format: columns must include the 19 EEG channel names.
    """
    import asyncio
    from src.preprocessing import preprocess_and_window_subject
    from src.feature_engineering import extract_features_from_windows

    model, scaler = _load_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run `python main.py` first."
        )

    global _latest_prediction
    try:
        content = await file.read()

        def _do_predict(content_bytes):
            df = pd.read_csv(BytesIO(content_bytes))

            missing_cols = [c for c in CHANNEL_NAMES if c not in df.columns]
            if missing_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing EEG channels: {missing_cols}"
                )

            # Drop rows with NaNs in channel columns to prevent calculation errors
            df = df.dropna(subset=CHANNEL_NAMES)

            eeg_data = df[CHANNEL_NAMES].values

            # Cap raw EEG samples to 5120 rows (~40 seconds of data at 128Hz)
            # This matches training settings and prevents request timeouts (HTTP 502/504) on large uploads
            max_samples = 5120
            if len(eeg_data) > max_samples:
                start_idx = (len(eeg_data) - max_samples) // 2
                eeg_data = eeg_data[start_idx: start_idx + max_samples]

            if len(eeg_data) < WINDOW_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Need at least {WINDOW_SIZE} samples "
                           f"({WINDOW_SIZE / SAMPLING_RATE}s of data). "
                           f"Got {len(eeg_data)} samples."
                )

            windows = preprocess_and_window_subject(eeg_data)
            if windows.shape[0] == 0:
                raise HTTPException(
                    status_code=400,
                    detail="All windows rejected during artifact removal."
                )

            X = extract_features_from_windows(windows, show_progress=False)
            X_scaled = scaler.transform(X)
            X_scaled = np.nan_to_num(X_scaled, nan=0, posinf=0, neginf=0)

            predictions = model.predict(X_scaled)
            probabilities = (model.predict_proba(X_scaled)[:, 1]
                             if hasattr(model, "predict_proba") else None)

            adhd_count = int(np.sum(predictions == 1))
            control_count = int(np.sum(predictions == 0))
            total_windows = len(predictions)
            final_prediction = "ADHD" if adhd_count > control_count else "Control"
            confidence = max(adhd_count, control_count) / total_windows
            avg_prob = float(np.mean(probabilities)) if probabilities is not None else None

            return {
                "prediction": final_prediction,
                "confidence": float(confidence),
                "adhd_probability": avg_prob,
                "total_windows": total_windows,
                "adhd_windows": adhd_count,
                "control_windows": control_count,
                "samples_received": len(eeg_data),
                "window_size": WINDOW_SIZE,
            }

        result = await asyncio.to_thread(_do_predict, content)
        _latest_prediction = result
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sample-values")
def get_sample_values(random: bool = False):
    """
    Return a single row of EEG channel values from the dataset.
    Used to populate slider defaults. If random=true, picks a random subject.
    """
    global _sample_values_df_cache
    try:
        import random as rnd

        if _sample_values_df_cache is None:
            data_path = _get_available_data_path()
            if data_path is None:
                raise HTTPException(status_code=503, detail="No dataset available. Upload a CSV first.")
            _sample_values_df_cache = pd.read_csv(data_path, usecols=CHANNEL_NAMES + ["ID"],
                                                 nrows=50000)

        df = _sample_values_df_cache

        if random:
            # Pick a random row
            idx = rnd.randint(0, len(df) - 1)
        else:
            # Pick the median row
            idx = len(df) // 2

        row = df.iloc[idx][CHANNEL_NAMES]
        values = {ch: round(float(row[ch]), 1) for ch in CHANNEL_NAMES}
        return {"values": values, "source_index": idx}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-values")
def predict_from_values(payload: PredictValuesPayload):
    """
    Predict ADHD/Control from slider input values (19 EEG channel values).
    Creates a synthetic window and classifies it.
    """
    from src.feature_engineering import extract_features_from_windows

    model, scaler = _load_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run `python main.py` first."
        )

    global _latest_prediction
    global _sample_values_df_cache
    try:
        # Safely convert Pydantic model to dictionary for both Pydantic v1 & v2
        values = payload.values.model_dump() if hasattr(payload.values, "model_dump") else payload.values.dict()

        # Get channel statistics for normalization from the dataset
        if _sample_values_df_cache is None:
            data_path = _get_available_data_path()
            if data_path is None:
                raise HTTPException(status_code=503, detail="No dataset available for normalization.")
            _sample_values_df_cache = pd.read_csv(data_path, usecols=CHANNEL_NAMES + ["ID"],
                                                 nrows=50000)
            
        df_chunk = _sample_values_df_cache[CHANNEL_NAMES]
        channel_means = df_chunk.mean().to_dict()
        channel_stds = df_chunk.std().to_dict()

        # Normalize raw slider values using dataset channel stats to avoid extreme outliers
        norm_values = {}
        for ch in CHANNEL_NAMES:
            mean_val = channel_means.get(ch, 0.0)
            std_val = channel_stds.get(ch, 1.0)
            if std_val <= 0:
                std_val = 1.0
            norm_values[ch] = (float(values.get(ch, 0.0)) - mean_val) / std_val

        # Create a synthetic EEG segment by repeating the normalized values
        row = np.array([norm_values[ch] for ch in CHANNEL_NAMES])
        # Add slight normalized noise (since signals are normalized, noise std=0.2)
        rng = np.random.RandomState(42)
        noise = rng.randn(WINDOW_SIZE, len(CHANNEL_NAMES)) * 0.2
        eeg_window = np.tile(row, (WINDOW_SIZE, 1)) + noise

        # Shape: (1, WINDOW_SIZE, n_channels)
        windows = eeg_window.reshape(1, WINDOW_SIZE, len(CHANNEL_NAMES))

        # Extract features
        X = extract_features_from_windows(windows, show_progress=False)
        X_scaled = scaler.transform(X)
        X_scaled = np.nan_to_num(X_scaled, nan=0, posinf=0, neginf=0)

        # Predict
        prediction = int(model.predict(X_scaled)[0])
        proba = (float(model.predict_proba(X_scaled)[0, 1])
                 if hasattr(model, "predict_proba") else 0.5)

        label = "ADHD" if prediction == 1 else "Control"
        confidence = proba if prediction == 1 else (1 - proba)

        result = {
            "prediction": label,
            "confidence": float(confidence),
            "adhd_probability": float(proba),
        }
        _latest_prediction = result
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/download-model")
def download_model():
    """Download the trained model file."""
    from fastapi.responses import FileResponse

    model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")

    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=404,
            detail="No trained model found. Run `python main.py` first."
        )

    # Package model + scaler into a single zip
    import zipfile
    import tempfile

    zip_path = os.path.join(MODELS_DIR, "neuroscan_model.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(model_path, "best_model.joblib")
        if os.path.exists(scaler_path):
            zf.write(scaler_path, "scaler.joblib")
        # Include feature names for portability
        fn_path = os.path.join(RESULTS_DIR, "feature_names.json")
        if os.path.exists(fn_path):
            zf.write(fn_path, "feature_names.json")

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="neuroscan_model.zip",
    )

def get_workspace_context_report() -> str:
    """
    Generate a lightweight context report (optimized for token count).
    """
    results = _load_results()
    fi = _load_feature_importances()
    
    report = []
    report.append("--- NEUROSCAN WORKSPACE CONTEXT REPORT ---")
    report.append("Domain: Pediatric ADHD EEG Classification (19 ch, 128Hz)")
    report.append("Dataset: 121 subjects (61 ADHD / 60 Healthy Controls)")
    
    if results:
        # Get only the best model performance to optimize tokens
        best_model = "Unknown"
        best_acc = 0.0
        best_metrics = {}
        cv_res = results.get("cv_results", results)
        for model_name, metrics in cv_res.items():
            if model_name == "__test_set__":
                continue
            mean_metrics = metrics.get("subject_metrics_mean", {})
            acc = mean_metrics.get('accuracy', 0)
            if acc > best_acc:
                best_acc = acc
                best_model = model_name
                best_metrics = mean_metrics
        
        report.append(f"Active Model: {best_model}")
        report.append(f"- CV Metrics: Acc={best_metrics.get('accuracy', 0):.1%}, F1={best_metrics.get('f1', 0):.1%}, Recall={best_metrics.get('recall', 0):.1%}, Precision={best_metrics.get('precision', 0):.1%}")
        
        test_set = results.get("__test_set__") or results.get("test_set_results")
        if test_set:
            subj_m = test_set.get("subject_metrics", {})
            report.append(f"- Test Set Metrics: Acc={subj_m.get('accuracy', 0):.1%}, F1={subj_m.get('f1', 0):.1%}, Recall={subj_m.get('recall', 0):.1%}, Precision={subj_m.get('precision', 0):.1%}")
            
    if fi:
        # Top 3 feature importances only
        top_fi = list(fi.items())[:3]
        fi_str = ", ".join([f"{feat} ({val:.4f})" for feat, val in top_fi])
        report.append(f"Top 3 Biomarkers: {fi_str}")
        
    global _latest_prediction
    if _latest_prediction:
        report.append(f"Latest Prediction: {_latest_prediction.get('prediction')} (Conf: {_latest_prediction.get('confidence', 0):.1%})")
        
    report.append("------------------------------------------")
    return "\n".join(report)

@app.post("/api/chat")
async def chat_endpoint(payload: ChatPayload):
    """
    Handle chat request from user.
    """
    try:
        from server.chat_agent import run_chat
        
        session_id = payload.session_id
        provider = payload.chat_provider
        model = payload.chat_model
        api_key = payload.chat_api_key
        user_message = payload.message
        
        # Get history or initialize
        if session_id not in chat_histories:
            chat_histories[session_id] = []
            
        history = chat_histories[session_id]
        
        # Build workspace context report
        context_report = get_workspace_context_report()
        
        # Inject simulator state context if present
        if payload.simulator_state:
            sim_state = payload.simulator_state
            mode = sim_state.get("mode", "unknown")
            res = sim_state.get("result", {})
            pred_label = res.get("prediction", "N/A")
            conf = res.get("confidence", 0.0)
            
            sim_report = []
            sim_report.append("\nActive Screen State (Live from User's Screen):")
            sim_report.append(f"- Screen Mode: {mode.upper()} Simulator")
            if mode == "sliders":
                inputs = sim_state.get("inputs", {})
                # Show first 5 channels as sample
                inputs_str = ", ".join([f"{ch}: {val}" for ch, val in list(inputs.items())[:5]])
                sim_report.append(f"- Channel Inputs (First 5): {inputs_str}")
            elif mode == "upload":
                sim_report.append(f"- Uploaded Filename: {sim_state.get('filename', 'N/A')}")
            sim_report.append(f"- Simulator Result: {pred_label} (Confidence: {conf:.1%})")
            if "adhd_probability" in res:
                sim_report.append(f"- ADHD Probability: {res.get('adhd_probability', 0.0):.1%}")
            
            context_report += "\n" + "\n".join(sim_report)
        
        # Run agent
        response_text = run_chat(
            provider=provider,
            api_key=api_key,
            model=model,
            messages_history=history,
            new_message=user_message,
            context_report=context_report
        )
        
        # Save to history
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": response_text})
        
        return {
            "response": response_text,
            "session_id": session_id
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        
        err_msg = str(e)
        status_code = 500
        detail_msg = err_msg
        
        # Check if error message suggests 429 / rate limiting
        is_rate_limit = False
        if "429" in err_msg or "rate limit" in err_msg.lower() or "too many requests" in err_msg.lower():
            is_rate_limit = True
        
        # Check if exception has status_code attribute
        if hasattr(e, 'status_code') and getattr(e, 'status_code') == 429:
            is_rate_limit = True
        elif hasattr(e, 'status') and getattr(e, 'status') == 429:
            is_rate_limit = True
            
        if is_rate_limit:
            status_code = 429
            detail_msg = (
                "Rate limit exceeded (Error 429). The model provider is currently busy or "
                "you have reached your free tier limits. Please wait a moment before trying again, "
                "or switch to a different model/provider."
            )
            
        raise HTTPException(status_code=status_code, detail=detail_msg)

@app.delete("/api/chat/{session_id}")
def clear_chat(session_id: str):
    """Clear chat history for a session."""
    if session_id in chat_histories:
        del chat_histories[session_id]
    return {"status": "ok", "message": "Chat history cleared"}

@app.get("/api/chat/greeting")
def get_chat_greeting():
    """Fetch a parent-friendly customized initial greeting."""
    return {"greeting": "Welcome to the NeuroScan AI Workspace. I am here to help you explain and interpret pediatric EEG ADHD classification results. How can I assist you today?"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8002, reload=True)

