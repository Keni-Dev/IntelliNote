"""
Pre-warmed OCR Service - Loads SymPy at startup for instant solving
Eliminates the ~2.7s SymPy import delay on first request
"""

import base64
import io
import os
import sys
import subprocess
import json as json_lib
import time
from typing import Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

# PRE-WARM: Import fast solver at module level (happens at server startup)
print("[STARTUP] Pre-warming math solver...")
startup_time = time.time()
from fast_math_solver import get_fast_solver
_solver = get_fast_solver()  # Initialize SymPy now, not on first request
print(f"[STARTUP] ✅ Math solver ready in {(time.time() - startup_time):.2f}s")

app = FastAPI(title="TrOCR Math OCR Service (Pre-warmed)", version="0.4.0")

# Create directory for saving images
SAVE_DIR = Path(__file__).parent / "ocr_images"
SAVE_DIR.mkdir(exist_ok=True)

# Create directory for math solver history
MATH_HISTORY_DIR = Path(__file__).parent / "media" / "texts"
MATH_HISTORY_DIR.mkdir(parents=True, exist_ok=True)
MATH_HISTORY_FILE = MATH_HISTORY_DIR / "math_solver_history.jsonl"

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-load Hugging Face TrOCR model
_trocr = {
    "processor": None,
    "model": None,
    "device": "cpu",
}

MODEL_ID = os.environ.get("TROCR_MODEL", "fhswf/TrOCR_Math_handwritten")


def load_trocr():
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel  # type: ignore
    import torch  # type: ignore

    if _trocr["processor"] is None or _trocr["model"] is None:
        try:
            processor = TrOCRProcessor.from_pretrained(MODEL_ID)
            model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)
            model.eval()
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)
            _trocr.update({"processor": processor, "model": model, "device": device})
        except Exception as e:
            raise RuntimeError(
                "Failed to load TrOCR model. Ensure 'transformers' and 'torch' are installed. "
                f"Tried model '{MODEL_ID}'. Original error: {e}"
            )
    return _trocr["processor"], _trocr["model"], _trocr["device"]


class RecognizeBody(BaseModel):
    image: str  # data URL or base64


class RecognizeResult(BaseModel):
    latex: str
    confidence: Optional[float] = None
    boxes: Optional[list] = None
    classification: Optional[dict] = None
    solution: Optional[dict] = None


class SolveMathBody(BaseModel):
    equation: str
    note_type: Optional[str] = None  # 'algebra', 'calculus', 'physics', etc.


class SolveMathResult(BaseModel):
    success: bool
    classification: Optional[dict] = None
    result: Optional[dict] = None
    explanation: Optional[str] = None
    error: Optional[str] = None


class MathHistoryStats(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    latency_percentiles: dict
    classification_breakdown: dict
    recent_requests: list


def decode_image(data: str) -> Image.Image:
    # Supports data URLs (data:image/png;base64,...) or raw base64
    if data.startswith("data:"):
        _header, b64 = data.split(",", 1)
    else:
        b64 = data
    try:
        binary = base64.b64decode(b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")
    try:
        img = Image.open(io.BytesIO(binary)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")
    return img


@app.get("/")
async def root():
    return {"status": "ok", "message": "Pre-warmed TrOCR Math OCR Service running", "version": "0.4.0"}


@app.get("/health")
async def health():
    """Health check endpoint for server monitoring"""
    return {
        "status": "ok",
        "service": "TrOCR Math OCR Service (Pre-warmed)",
        "version": "0.4.0",
        "model_loaded": _trocr["model"] is not None,
        "model_id": MODEL_ID,
        "math_solver_ready": _solver is not None,
        "features": ["ocr", "fast_math_solver", "pre_warmed"]
    }


@app.post("/recognize", response_model=RecognizeResult)
async def recognize(req: RecognizeBody):
    try:
        img = decode_image(req.image)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save the image with timestamp
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"equation_{timestamp}.png"
        filepath = SAVE_DIR / filename
        img.save(filepath)
        print(f"[OCR] Saved image to: {filepath}")
    except Exception as e:
        print(f"[OCR] Warning: Failed to save image: {e}")

    try:
        processor, model, device = load_trocr()
        import torch  # type: ignore

        pixel_values = processor(images=img, return_tensors="pt").pixel_values
        if device == "cuda":
            pixel_values = pixel_values.to(device)
        with torch.no_grad():
            generated_ids = model.generate(pixel_values, max_new_tokens=256)
        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        text = (text or "").strip()
        confidence = 0.8 if text else 0.0
        
        print(f"[OCR] Recognized: '{text}' (confidence: {confidence})")
        
        return {"latex": text, "confidence": confidence, "boxes": None}
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "trocr_not_ready",
                "message": str(e),
                "hint": "Install torch and transformers. Optionally set TROCR_MODEL env var.",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {e}")


@app.post("/solve_math", response_model=SolveMathResult)
async def solve_math(req: SolveMathBody):
    """
    Solve mathematical equations using the pre-warmed fast solver.
    Ultra-fast solving with <50ms latency (after SymPy is pre-loaded).
    
    Args:
        equation: The mathematical equation to solve
        note_type: Type hint ('algebra', 'calculus', 'physics', etc.)
    
    Returns:
        Classification, solution, and step-by-step explanation
    """
    start_time = time.time()
    
    try:
        # Use pre-warmed solver (SymPy already loaded!)
        from fast_math_solver import fast_solve
        
        solve_start = time.time()
        result = fast_solve(req.equation, req.note_type or 'algebra')
        solve_end = time.time()
        
        total_latency = (time.time() - start_time) * 1000
        solve_latency = (solve_end - solve_start) * 1000
        
        # Log to history
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'equation': req.equation,
            'note_type': req.note_type,
            'success': result.get('success', False),
            'classification': result.get('classification', {}).get('problem_type'),
            'latency_ms': {
                'total': round(total_latency, 2),
                'solve': round(solve_latency, 2)
            },
            'pre_warmed': True,
            'has_solution': result.get('result') is not None,
            'error': result.get('error')
        }
        
        try:
            with open(MATH_HISTORY_FILE, 'a', encoding='utf-8') as f:
                f.write(json_lib.dumps(history_entry) + '\n')
        except Exception as e:
            print(f"[MATH] Warning: Failed to write history: {e}")
        
        print(f"[MATH] ⚡ INSTANT: '{req.equation}' | "
              f"Type: {history_entry['classification']} | "
              f"Latency: {total_latency:.2f}ms")
        
        return {
            'success': result.get('success', False),
            'classification': result.get('classification'),
            'result': result.get('result'),
            'explanation': result.get('explanation'),
            'error': result.get('error')
        }
        
    except Exception as e:
        total_latency = (time.time() - start_time) * 1000
        
        error_entry = {
            'timestamp': datetime.now().isoformat(),
            'equation': req.equation,
            'note_type': req.note_type,
            'success': False,
            'classification': None,
            'latency_ms': {'total': round(total_latency, 2)},
            'pre_warmed': True,
            'has_solution': False,
            'error': str(e)
        }
        
        try:
            with open(MATH_HISTORY_FILE, 'a', encoding='utf-8') as f:
                f.write(json_lib.dumps(error_entry) + '\n')
        except:
            pass
        
        print(f"[MATH] ❌ Error: '{req.equation}' | {str(e)} | {total_latency:.2f}ms")
        
        return {
            'success': False,
            'classification': None,
            'result': None,
            'explanation': None,
            'error': str(e)
        }


@app.get("/math_history", response_model=MathHistoryStats)
async def get_math_history(limit: int = 100):
    """Get statistics and history of math solver requests"""
    try:
        if not MATH_HISTORY_FILE.exists():
            return {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'average_latency_ms': 0,
                'min_latency_ms': 0,
                'max_latency_ms': 0,
                'latency_percentiles': {},
                'classification_breakdown': {},
                'recent_requests': []
            }
        
        entries = []
        with open(MATH_HISTORY_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entries.append(json_lib.loads(line))
        
        if not entries:
            return {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'average_latency_ms': 0,
                'min_latency_ms': 0,
                'max_latency_ms': 0,
                'latency_percentiles': {},
                'classification_breakdown': {},
                'recent_requests': []
            }
        
        total_requests = len(entries)
        successful_requests = sum(1 for e in entries if e.get('success', False))
        failed_requests = total_requests - successful_requests
        
        latencies = [e['latency_ms']['total'] for e in entries]
        latencies_sorted = sorted(latencies)
        
        average_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        
        def percentile(data, p):
            n = len(data)
            idx = int(n * p / 100)
            return data[min(idx, n - 1)]
        
        latency_percentiles = {
            'p50': percentile(latencies_sorted, 50),
            'p75': percentile(latencies_sorted, 75),
            'p90': percentile(latencies_sorted, 90),
            'p95': percentile(latencies_sorted, 95),
            'p99': percentile(latencies_sorted, 99)
        }
        
        classification_breakdown = {}
        for entry in entries:
            classification = entry.get('classification', 'unknown')
            if classification:
                classification_breakdown[classification] = classification_breakdown.get(classification, 0) + 1
        
        recent_requests = entries[-limit:] if len(entries) > limit else entries
        recent_requests.reverse()
        
        return {
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'failed_requests': failed_requests,
            'average_latency_ms': round(average_latency, 2),
            'min_latency_ms': round(min_latency, 2),
            'max_latency_ms': round(max_latency, 2),
            'latency_percentiles': {k: round(v, 2) for k, v in latency_percentiles.items()},
            'classification_breakdown': classification_breakdown,
            'recent_requests': recent_requests
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve math history: {e}"
        )


@app.delete("/math_history")
async def clear_math_history():
    """Clear the math solver history file"""
    try:
        if MATH_HISTORY_FILE.exists():
            MATH_HISTORY_FILE.unlink()
        return {
            'success': True,
            'message': 'Math solver history cleared'
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear history: {e}"
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    print(f"[STARTUP] Starting pre-warmed server on port {port}...")
    uvicorn.run("ocr_service_fast:app", host="0.0.0.0", port=port, reload=False)
