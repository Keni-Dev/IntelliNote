import base64
import io
import os
from typing import Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="TrOCR Math OCR Service", version="0.2.0")

# Create directory for saving images
SAVE_DIR = Path(__file__).parent / "ocr_images"
SAVE_DIR.mkdir(exist_ok=True)

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

# Lazy-load handwriting synthesis model
_handwriting_rnn = {
    "model": None,
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


def load_handwriting_rnn():
    """Lazy-load handwriting synthesis RNN model"""
    if _handwriting_rnn["model"] is None:
        # Note: The original handwriting-synthesis library (https://github.com/sjvasquez/handwriting-synthesis)
        # uses TensorFlow 1.6 which is incompatible with modern Python environments.
        # This is a placeholder for future integration with a modern alternative.
        raise RuntimeError(
            "Handwriting synthesis is not yet available. "
            "The original library uses deprecated TensorFlow 1.6. "
            "Falling back to font-based rendering on the frontend."
        )
    return _handwriting_rnn["model"]


class RecognizeBody(BaseModel):
    image: str  # data URL or base64


class RecognizeResult(BaseModel):
    latex: str
    confidence: Optional[float] = None
    boxes: Optional[list] = None


class GenerateHandwritingBody(BaseModel):
    text: str
    bias: Optional[float] = 0.5  # Controls randomness (0.1-1.5 typical range)
    style: Optional[int] = None  # Optional style index from training data


class StrokePoint(BaseModel):
    x: float
    y: float
    penUp: bool


class GenerateHandwritingResult(BaseModel):
    strokes: list[StrokePoint]
    width: float
    height: float
    success: bool
    error: Optional[str] = None


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
    return {"status": "ok", "message": "TrOCR Math OCR Service running"}


@app.get("/health")
async def health():
    """Health check endpoint for server monitoring"""
    return {
        "status": "ok",
        "service": "TrOCR Math OCR Service",
        "version": "0.2.0",
        "model_loaded": _trocr["model"] is not None,
        "model_id": MODEL_ID,
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
        # TrOCR may not output strict LaTeX; we pass through and let the front-end handle.
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


@app.post("/generate_handwriting", response_model=GenerateHandwritingResult)
async def generate_handwriting(req: GenerateHandwritingBody):
    """
    Generate handwritten strokes for the given text using RNN-based synthesis.
    Returns stroke data compatible with fabric.js Path rendering.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        model = load_handwriting_rnn()
        import numpy as np
        
        # Generate strokes using the RNN model
        # bias controls randomness: lower = more uniform, higher = more varied
        bias = max(0.1, min(1.5, req.bias))  # Clamp to safe range
        
        # Generate handwriting (returns numpy array of shape [n_points, 3])
        # Each point is [dx, dy, pen_up] where pen_up is 0 or 1
        strokes_array = model.sample(
            text=req.text,
            bias=bias,
            style=req.style
        )
        
        # Convert cumulative offsets to absolute coordinates
        x, y = 0.0, 0.0
        stroke_points = []
        min_x, max_x = float('inf'), float('-inf')
        min_y, max_y = float('inf'), float('-inf')
        
        for dx, dy, pen_up in strokes_array:
            x += float(dx)
            y += float(dy)
            
            stroke_points.append({
                "x": x,
                "y": y,
                "penUp": bool(pen_up)
            })
            
            # Track bounds
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
        
        # Normalize coordinates to start at (0, 0)
        for point in stroke_points:
            point["x"] -= min_x
            point["y"] -= min_y
        
        width = max_x - min_x
        height = max_y - min_y
        
        return {
            "strokes": stroke_points,
            "width": width,
            "height": height,
            "success": True,
            "error": None
        }
        
    except RuntimeError as e:
        return {
            "strokes": [],
            "width": 0,
            "height": 0,
            "success": False,
            "error": str(e)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Handwriting generation failed: {e}"
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("ocr_service:app", host="0.0.0.0", port=port, reload=False)
