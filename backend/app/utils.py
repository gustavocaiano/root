import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
import os


def validate_columns(df: pd.DataFrame) -> bool:
    """Validate that the dataframe has required columns"""
    required_columns = ['TargetNumber', 'timestamp', 'Latitude', 'Longitude']
    
    # Case-insensitive column check
    df_columns_lower = [col.lower() for col in df.columns]
    required_lower = [col.lower() for col in required_columns]
    
    for req_col in required_lower:
        if req_col not in df_columns_lower:
            return False
    return True


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to standard format"""
    column_mapping = {}
    
    for col in df.columns:
        col_lower = col.lower()
        if 'target' in col_lower and 'number' in col_lower:
            column_mapping[col] = 'TargetNumber'
        elif 'timestamp' in col_lower or 'date' in col_lower or 'time' in col_lower:
            column_mapping[col] = 'timestamp'
        elif 'lat' in col_lower:
            column_mapping[col] = 'Latitude'
        elif 'lon' in col_lower or 'lng' in col_lower:
            column_mapping[col] = 'Longitude'
    
    return df.rename(columns=column_mapping)


def get_file_columns(file_path: str, file_extension: str) -> list[str]:
    """Get column names from file without processing"""
    if file_extension in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, nrows=0)
    else:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        df = None
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, encoding=encoding, nrows=0)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            raise ValueError("Could not decode CSV file with any standard encoding")
    
    return list(df.columns)


def parse_excel_file(file_path: str, column_mapping: dict = None) -> pd.DataFrame:
    """Parse Excel file and return DataFrame"""
    df = pd.read_excel(file_path)
    return process_dataframe(df, column_mapping)


def parse_csv_file(file_path: str, column_mapping: dict = None) -> pd.DataFrame:
    """Parse CSV file and return DataFrame"""
    # Try different encodings
    encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
    
    for encoding in encodings:
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            return process_dataframe(df, column_mapping)
        except UnicodeDecodeError:
            continue
    
    raise ValueError("Could not decode CSV file with any standard encoding")


def process_dataframe(df: pd.DataFrame, column_mapping: dict = None) -> pd.DataFrame:
    """
    Process and clean dataframe
    
    Args:
        df: Input dataframe
        column_mapping: Optional dict mapping standard names to actual column names
                       Format: {'target_number': 'Actual Column', 'timestamp': '...', ...}
    """
    # If column mapping provided, rename columns first
    if column_mapping:
        # Validate that all mapped columns exist
        missing_cols = [col for col in column_mapping.values() if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found in file: {', '.join(missing_cols)}")
        
        # Map from user's column names to standard names
        # Standard names: TargetNumber, timestamp, Latitude, Longitude, ProductNumber
        standard_mapping = {
            'target_number': 'TargetNumber',
            'timestamp': 'timestamp',
            'latitude': 'Latitude',
            'longitude': 'Longitude',
            'product_number': 'ProductNumber'
        }
        
        # Create reverse mapping (actual column name -> standard name)
        reverse_mapping = {}
        for key, actual_col in column_mapping.items():
            if key in standard_mapping and actual_col:  # Only map if column is provided
                reverse_mapping[actual_col] = standard_mapping[key]
        
        df = df.rename(columns=reverse_mapping)
    else:
        # Normalize column names automatically
        df = normalize_column_names(df)
    
    # Validate columns
    if not validate_columns(df):
        raise ValueError(
            "Missing required columns. Expected: TargetNumber, timestamp, Latitude, Longitude. "
            "Please select the correct columns or ensure your file has columns with similar names."
        )
    
    # Keep required columns and optional ProductNumber
    columns_to_keep = ['TargetNumber', 'timestamp', 'Latitude', 'Longitude']
    if 'ProductNumber' in df.columns:
        columns_to_keep.append('ProductNumber')
    df = df[columns_to_keep]
    
    # Clean data - only remove rows with missing required columns
    df = df.dropna(subset=['TargetNumber', 'timestamp', 'Latitude', 'Longitude'])
    
    # Convert TargetNumber to string
    df['TargetNumber'] = df['TargetNumber'].astype(str)
    
    # Parse timestamp
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    
    # Remove rows with invalid timestamps
    df = df.dropna(subset=['timestamp'])
    
    # Convert coordinates to float
    df['Latitude'] = pd.to_numeric(df['Latitude'], errors='coerce')
    df['Longitude'] = pd.to_numeric(df['Longitude'], errors='coerce')
    
    # Remove rows with invalid coordinates
    df = df.dropna(subset=['Latitude', 'Longitude'])
    
    # Validate coordinate ranges
    df = df[
        (df['Latitude'] >= -90) & (df['Latitude'] <= 90) &
        (df['Longitude'] >= -180) & (df['Longitude'] <= 180)
    ]
    
    return df


def dataframe_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert dataframe to list of dictionaries for database insertion"""
    records = []
    
    for _, row in df.iterrows():
        # Convert TargetNumber to string, removing .0 if it's a float
        target_num = row['TargetNumber']
        if isinstance(target_num, float):
            # Remove .0 if it's a whole number
            if target_num.is_integer():
                target_num = str(int(target_num))
            else:
                target_num = str(target_num).rstrip('0').rstrip('.')
        else:
            target_num = str(target_num)
        
        record = {
            'target_number': target_num,
            'timestamp': row['timestamp'].to_pydatetime(),
            'latitude': float(row['Latitude']),
            'longitude': float(row['Longitude'])
        }
        
        # Add product_number if present, removing .0 if it's a float
        if 'ProductNumber' in row and pd.notna(row['ProductNumber']):
            product_num = row['ProductNumber']
            if isinstance(product_num, float):
                # Remove .0 if it's a whole number
                if product_num.is_integer():
                    product_num = str(int(product_num))
                else:
                    product_num = str(product_num).rstrip('0').rstrip('.')
            else:
                product_num = str(product_num).strip()
            record['product_number'] = product_num
        else:
            record['product_number'] = None
        
        records.append(record)
    
    return records

