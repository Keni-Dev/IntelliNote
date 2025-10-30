# IntelliNote OCR Service# Pix2Text OCR Service (Local)



Local FastAPI server providing handwritten math equation recognition using TrOCR.This optional local service uses pix2tex (LaTeX-OCR) to transcribe small handwritten math crops into LaTeX. It’s designed to complement IntelliNote’s stroke grouping so we only send tight regions that likely contain an equation.



## What It DoesNote: Installing pix2tex is compute-heavy and may take several minutes on Windows. If you prefer a lighter option, use the built-in OpenRouter Vision provider instead.



- **TrOCR Math OCR**: Recognizes handwritten math equations using `fhswf/TrOCR_Math_handwritten` from Hugging Face## Prerequisites

- **Handwriting Synthesis**: (Planned) RNN-based stroke generation for authentic handwritten answers

- Python 3.10+

## Installation- Visual C++ Build Tools (for some wheels, if needed on Windows)

- Optionally install CPU-only PyTorch if you don’t have CUDA

### 1. Install Python Dependencies

## Setup (Windows PowerShell)

```bash

cd server```powershell

# From repo root
pip install -r requirements.txt

```cd server



### 2. Install PyTorch# Create and activate venv

python -m venv .venv

**For CPU only:**. .venv\Scripts\Activate.ps1

```bash

pip install torch torchvision torchaudio# Install requirements (may take several minutes)

```pip install --upgrade pip wheel setuptools

pip install -r requirements.txt

**For CUDA (GPU acceleration):**

```bash# If torch failed, install a CPU build explicitly (example for PyTorch 2.2+)

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118# Visit https://pytorch.org/get-started/locally/ for the correct command

```# Example (CPU):

# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

### 3. Start the Server

# Run the server

```bashpython pix2text_service.py

python ocr_service.py```

```

The server listens on http://127.0.0.1:8000 by default.

Server starts at `http://localhost:8000`.

## How it integrates (when running)

## Configuration in IntelliNote

- Frontend renders strokes in a group to a small PNG data URL

1. Start the service: `python server/ocr_service.py`- Sends it to `POST /recognize` as JSON `{ image: "data:image/png;base64,..." }`

2. Open **Settings** → **OCR Settings**- Receives `{ latex, confidence }`

3. Select **"Local TrOCR"** provider

4. Ensure URL is `http://127.0.0.1:8000`Configure IntelliNote to use it:

5. Use **Hybrid** mode (recommended)

1. Start the service: `python server/pix2text_service.py`

## Troubleshooting2. Open OCR Settings in the app → Cloud provider → Pix2Text (Local)

3. Ensure Pix2Text server URL is `http://127.0.0.1:8000`

See full documentation in this README for:4. Use Hybrid or Cloud mode; hybrid escalates to Pix2Text when local confidence is below threshold

- Model download issues

- CUDA/GPU configuration**Reminder:** If you couldn't install pix2tex due to network issues, use OpenRouter or MyScript instead (no Python service needed).

- Port conflicts

- Import errors## Tips for large canvases and many equations



## Credits- Let the frontend propose ROIs from strokes (what IntelliNote already does):

  - Group temporally/spatially close strokes into clusters

- **TrOCR**: [fhswf/TrOCR_Math_handwritten](https://huggingface.co/fhswf/TrOCR_Math_handwritten)  - Call the service on those clusters only

- **Transformers**: Hugging Face- Avoid full-canvas captures; instead, tile or only render the union bounds of a suspected equation plus padding

- **FastAPI**: Modern Python web framework- Cache results by stroke signature; the app already does this to skip rework when strokes haven’t changed


## Troubleshooting

- If you see import errors for pix2tex, make sure torch, timm, and transformers installed successfully
- If recognition is slow, reduce image size or increase downscale factor in the client renderer
- To allow cross-origin dev from Vite, the service already enables permissive CORS
