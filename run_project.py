import os
import sys
import subprocess
import time

# ── 1. Python Dependency Self-Setup ───────────────────────────────────
print("[run_project.py] Checking Python library dependencies...")
required_imports = [
    "pandas", "numpy", "scipy", "sklearn", "xgboost", "lightgbm", 
    "matplotlib", "seaborn", "joblib", "fastapi", "uvicorn", 
    "multipart", "pywt", "langchain", "langchain_core", 
    "langchain_google_genai", "langchain_openai",
    "google_auth_oauthlib", "googleapiclient"
]
missing_libs = []
for lib in required_imports:
    try:
        __import__(lib)
    except ImportError:
        missing_libs.append(lib)

if missing_libs:
    print(f"[run_project.py] Missing Python libraries: {missing_libs}")
    print("[run_project.py] Automatically installing dependencies from requirements.txt...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("[run_project.py] Python dependencies setup completed successfully.")
    except Exception as e:
        print(f"[run_project.py] ERROR installing Python dependencies: {e}")
        sys.exit(1)
else:
    print("[run_project.py] All Python libraries are already present. Skipping installation.")

# Now we can safely import standard libraries and set up the stack
import socket
import webbrowser

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")

    print("=" * 60)
    print("NeuroScan AI Startup Process")
    print("=" * 60)

    # ── 2. Frontend Dependency Self-Setup ───────────────────────────────
    print("[run_project.py] Checking Node.js (JavaScript) dependencies...")
    if not os.path.exists(node_modules_dir):
        print("[run_project.py] Frontend node_modules not found. Automatically running npm install...")
        try:
            subprocess.check_call("npm install", shell=True, cwd=frontend_dir)
            print("[run_project.py] Frontend node modules installed successfully.")
        except Exception as e:
            print(f"[run_project.py] ERROR running npm install: {e}")
            sys.exit(1)
    else:
        print("[run_project.py] Frontend node_modules already present. Skipping npm install.")

    # ── 3. Auto ML Training/Compilation ─────────────────────────────────
    print("[run_project.py] Pre-running ML training pipeline script...")
    try:
        subprocess.check_call([sys.executable, "main.py"], cwd=root_dir)
        print("[run_project.py] ML training pipeline check successful.")
    except Exception as e:
        print(f"[run_project.py] ERROR running training script: {e}")
        sys.exit(1)

    # ── 4. Concurrent Servers Launch & Dynamic Port Check ───────────────
    print("[run_project.py] Starting FastAPI backend on port 8002...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8002", "--reload"],
        cwd=root_dir,
    )

    print("[run_project.py] Waiting dynamically for backend to be active on port 8002...")
    port_active = False
    start_time = time.time()
    while time.time() - start_time < 60:
        try:
            with socket.create_connection(("127.0.0.1", 8002), timeout=1):
                port_active = True
                break
        except (OSError, ConnectionRefusedError):
            time.sleep(0.5)

    if not port_active:
        print("[run_project.py] ERROR: Backend did not start on port 8002.")
        backend_process.terminate()
        sys.exit(1)

    print("[run_project.py] Backend is active! Starting Vite frontend on port 5173...")
    frontend_process = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=frontend_dir,
    )

    # ── 5. Auto-Browser Open ──────────────────────────────────────────
    # Wait briefly for Vite dev server to start
    time.sleep(2.0)
    print("[run_project.py] Launching default web browser to http://localhost:5173...")
    webbrowser.open("http://localhost:5173")

    # Print a prominent, easy-to-copy URL box for the user
    print("\n" + "=" * 60)
    print("                  NeuroScan AI Launched")
    print("=" * 60)
    print("  Copy and paste this URL into your default web browser:")
    print("\n              http://localhost:5173")
    print("=" * 60)
    print("  - Frontend Dashboard:  http://localhost:5173")
    print("  - Backend API Gateway: http://127.0.0.1:8002")
    print("  Press Ctrl+C to terminate both servers.")
    print("=" * 60 + "\n")

    try:
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print("Backend server stopped.")
                break
            if frontend_process.poll() is not None:
                print("Frontend server stopped.")
                break
    except KeyboardInterrupt:
        print("\nShutting down both servers...")
    finally:
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
