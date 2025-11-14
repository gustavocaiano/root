from sqlalchemy import Column, Integer, String, DateTime, Float, Index
from sqlalchemy.sql import func
from .database import Base


class Location(Base):
    """Model for storing location data"""
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    target_number = Column(String(20), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    product_number = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    # Composite index for common queries
    __table_args__ = (
        Index('idx_target_timestamp', 'target_number', 'timestamp'),
        Index('idx_target_date', 'target_number', 'timestamp'),
    )

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'target_number': self.target_number,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'product_number': self.product_number,
        }

