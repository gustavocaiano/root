from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, date
from typing import List, Optional
import os
import shutil

from .database import get_db, init_db
from .models import Location
from .schemas import (
    LocationResponse,
    TrajectoryResponse,
    TrajectoryPoint,
    UploadResponse,
    ColumnMapping,
    FileColumnsResponse
)
from .utils import (
    parse_excel_file,
    parse_csv_file,
    dataframe_to_records,
    get_file_columns
)
from pydantic import BaseModel

app = FastAPI(
    title="Trajectory Viewer API",
    description="API for tracking and visualizing location trajectories",
    version="1.0.0"
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    init_db()


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Trajectory Viewer API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/file/columns", response_model=FileColumnsResponse)
async def get_file_columns_endpoint(
    file: UploadFile = File(...)
):
    """
    Get column names from uploaded file without processing
    Used to allow user to select which columns map to which fields
    """
    # Validate file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ['.xlsx', '.xls', '.csv']:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .xlsx, .xls, and .csv files are supported."
        )
    
    # Save uploaded file temporarily
    file_path = os.path.join(UPLOAD_DIR, f"temp_{file.filename}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get columns
        columns = get_file_columns(file_path, file_extension)
        
        # Clean up
        os.remove(file_path)
        
        return FileColumnsResponse(
            columns=columns,
            message="Columns retrieved successfully"
        )
    
    except Exception as e:
        # Clean up file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    column_mapping: Optional[str] = File(None),  # JSON string with column mapping from FormData
    db: Session = Depends(get_db)
):
    """
    Upload Excel or CSV file with trajectory data
    
    Args:
        file: The file to upload
        column_mapping: Optional JSON string mapping standard names to actual column names
                       Format: {"target_number": "Actual Column Name", "timestamp": "...", ...}
    """
    # Validate file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ['.xlsx', '.xls', '.csv']:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .xlsx, .xls, and .csv files are supported."
        )
    
    # Parse column mapping if provided
    mapping_dict = None
    if column_mapping:
        try:
            import json
            mapping_dict = json.loads(column_mapping)
            # Validate mapping has all required keys
            required_keys = ['target_number', 'timestamp', 'latitude', 'longitude']
            if not all(key in mapping_dict for key in required_keys):
                raise ValueError(f"Column mapping must include: {', '.join(required_keys)}")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in column_mapping")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Parse file
    try:
        if file_extension in ['.xlsx', '.xls']:
            df = parse_excel_file(file_path, mapping_dict)
        else:
            df = parse_csv_file(file_path, mapping_dict)
        
        # Convert to records
        records = dataframe_to_records(df)
        
        if not records:
            raise HTTPException(
                status_code=400,
                detail="No valid records found in file"
            )
        
        # Insert into database in batches for better performance
        batch_size = 1000
        
        try:
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                # Create Location objects for batch
                locations = [Location(**record) for record in batch]
                db.bulk_save_objects(locations)
                db.commit()
        except Exception as batch_error:
            db.rollback()
            import traceback
            error_trace = traceback.format_exc()
            print(f"Batch insert error: {error_trace}")
            raise HTTPException(
                status_code=500,
                detail=f"Error inserting batch: {str(batch_error)}"
            )
        
        # Get unique target numbers
        targets = list(set(record['target_number'] for record in records))
        
        # Clean up uploaded file
        os.remove(file_path)
        
        return UploadResponse(
            message="File uploaded successfully",
            records_imported=len(records),
            targets=sorted(targets)
        )
    
    except ValueError as e:
        # Clean up file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Clean up file
        if os.path.exists(file_path):
            os.remove(file_path)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/targets")
def get_targets(db: Session = Depends(get_db)):
    """Get list of all unique target numbers"""
    targets = db.query(Location.target_number).distinct().all()
    return {
        "targets": sorted([t[0] for t in targets])
    }


@app.get("/api/trajectories")
def get_trajectories(
    target_number: str = Query(..., description="Target number (required)"),
    start_date: date = Query(..., description="Start date filter (YYYY-MM-DD) - only one day allowed"),
    hour: Optional[int] = Query(None, ge=0, le=23, description="Filter by hour (0-23)"),
    product_filter: Optional[str] = Query(None, description="Filter products: 'zero' (only 0), 'nonzero' (not 0), or None (all)"),
    db: Session = Depends(get_db)
):
    """
    Get trajectories for a specific target and date
    Returns points for ONE target and ONE day only (performance optimization)
    """
    # Validate: only one day allowed
    end_date = start_date  # Same day
    
    # Build query with required filters
    filters = [
        Location.target_number == target_number,
        Location.timestamp >= datetime.combine(start_date, datetime.min.time()),
        Location.timestamp <= datetime.combine(end_date, datetime.max.time())
    ]
    
    # Add hour filter if provided
    if hour is not None:
        filters.append(
            func.extract('hour', Location.timestamp) == hour
        )
    
    # Add product filter
    if product_filter == 'zero':
        filters.append(
            or_(
                Location.product_number == '0',
                Location.product_number.is_(None)
            )
        )
    elif product_filter == 'nonzero':
        filters.append(
            and_(
                Location.product_number.isnot(None),
                Location.product_number != '0'
            )
        )
    
    query = db.query(Location).filter(and_(*filters))
    
    # Order by timestamp
    locations = query.order_by(Location.timestamp).limit(10000).all()  # Limit to 10k points max
    
    # Create trajectory points
    points = [
        TrajectoryPoint(
            id=loc.id,
            target_number=loc.target_number,
            timestamp=loc.timestamp.isoformat(),
            latitude=loc.latitude,
            longitude=loc.longitude,
            product_number=loc.product_number
        )
        for loc in locations
    ]
    
    return {
        "trajectories": [
            TrajectoryResponse(target_number=target_number, points=points)
        ]
    }


@app.get("/api/points/{target_number}")
def get_target_history(
    target_number: str,
    db: Session = Depends(get_db)
):
    """Get complete history for a specific target number"""
    locations = db.query(Location).filter(
        Location.target_number == target_number
    ).order_by(Location.timestamp).all()
    
    if not locations:
        raise HTTPException(status_code=404, detail="Target number not found")
    
    points = [
        TrajectoryPoint(
            id=loc.id,
            target_number=loc.target_number,
            timestamp=loc.timestamp.isoformat(),
            latitude=loc.latitude,
            longitude=loc.longitude,
            product_number=loc.product_number
        )
        for loc in locations
    ]
    
    return {
        "target_number": target_number,
        "total_points": len(points),
        "points": points
    }


@app.get("/api/location/{target_number}")
def get_location_history(
    target_number: str,
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    db: Session = Depends(get_db)
):
    """
    Get all triggers for a target at a specific location (exact coordinates)
    Shows all products that were at this exact location
    """
    # Use small tolerance for exact location matching (0.000001 degrees ≈ 11cm)
    tolerance = 0.000001
    
    locations = db.query(Location).filter(
        and_(
            Location.target_number == target_number,
            Location.latitude >= latitude - tolerance,
            Location.latitude <= latitude + tolerance,
            Location.longitude >= longitude - tolerance,
            Location.longitude <= longitude + tolerance
        )
    ).order_by(Location.timestamp).all()
    
    if not locations:
        raise HTTPException(status_code=404, detail="No data found for this location")
    
    # Group by product_number and count
    product_counts = {}
    points = []
    
    for loc in locations:
        product_key = loc.product_number if loc.product_number else '0'
        if product_key not in product_counts:
            product_counts[product_key] = 0
        product_counts[product_key] += 1
        
        points.append(TrajectoryPoint(
            id=loc.id,
            target_number=loc.target_number,
            timestamp=loc.timestamp.isoformat(),
            latitude=loc.latitude,
            longitude=loc.longitude,
            product_number=loc.product_number
        ))
    
    return {
        "target_number": target_number,
        "latitude": latitude,
        "longitude": longitude,
        "total_triggers": len(points),
        "product_counts": product_counts,
        "points": points
    }


@app.get("/api/stats")
def get_statistics(db: Session = Depends(get_db)):
    """Get general statistics about the data"""
    total_points = db.query(func.count(Location.id)).scalar()
    total_targets = db.query(func.count(func.distinct(Location.target_number))).scalar()
    
    # Get date range
    date_range = db.query(
        func.min(Location.timestamp),
        func.max(Location.timestamp)
    ).first()
    
    return {
        "total_points": total_points,
        "total_targets": total_targets,
        "date_range": {
            "start": date_range[0].isoformat() if date_range[0] else None,
            "end": date_range[1].isoformat() if date_range[1] else None
        }
    }


@app.delete("/api/data")
def clear_all_data(db: Session = Depends(get_db)):
    """Clear all location data (use with caution!)"""
    try:
        deleted = db.query(Location).delete()
        db.commit()
        return {
            "message": "All data cleared successfully",
            "records_deleted": deleted
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing data: {str(e)}")

