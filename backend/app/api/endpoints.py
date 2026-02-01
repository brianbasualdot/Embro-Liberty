from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Response
from app.core.image_processor import process_image_kmeans
from app.core.export_processor import create_embroidery_file
from typing import Dict, Any, List
from pydantic import BaseModel

router = APIRouter()

class ExportRequest(BaseModel):
    layers: List[Dict[str, Any]]
    format: str = "dst"

@router.post("/process-image")
async def process_image(
    file: UploadFile = File(...),
    k: int = Form(5)
) -> Dict[str, Any]:
    """
    Endpoint to process an uploaded image and return K-Means segmented vector paths.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        result = process_image_kmeans(contents, k)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-embroidery")
async def export_embroidery(request: ExportRequest):
    """
    Takes JSON layers and generates a binary stitch file.
    """
    try:
        file_bytes = create_embroidery_file(request.layers, request.format)
        
        media_type = "application/octet-stream"
        filename = f"export.{request.format}"
        
        return Response(content=file_bytes, media_type=media_type, headers={
            "Content-Disposition": f"attachment; filename={filename}"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
