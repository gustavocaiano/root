from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://trajuser:trajpass@localhost:5432/trajectorydb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    
    # Add product_number column if it doesn't exist (for existing databases)
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        
        # Check if locations table exists
        if 'locations' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('locations')]
            
            if 'product_number' not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE locations ADD COLUMN product_number VARCHAR(50)"))
                    conn.commit()
    except Exception as e:
        # If migration fails, log but don't crash - table will be created with column on next create_all
        print(f"Warning: Could not migrate product_number column: {e}")

