from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class LocationBase(BaseModel):
    target_number: str = Field(..., description="Target number (9 digits)")
    timestamp: datetime = Field(..., description="Timestamp of interception")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    product_number: Optional[str] = Field(None, description="Product number (0 or unique number per target)")


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: int

    class Config:
        from_attributes = True


class TrajectoryPoint(BaseModel):
    id: int
    target_number: str
    timestamp: str
    latitude: float
    longitude: float
    product_number: Optional[str] = None


class TrajectoryResponse(BaseModel):
    target_number: str
    points: list[TrajectoryPoint]


class ColumnMapping(BaseModel):
    target_number: str = Field(..., description="Column name for target number")
    timestamp: str = Field(..., description="Column name for timestamp")
    latitude: str = Field(..., description="Column name for latitude")
    longitude: str = Field(..., description="Column name for longitude")
    product_number: Optional[str] = Field(None, description="Column name for product number (optional)")


class FileColumnsResponse(BaseModel):
    columns: list[str]
    message: str


class UploadResponse(BaseModel):
    message: str
    records_imported: int
    targets: list[str]

