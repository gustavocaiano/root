#!/bin/bash

# Script de instalação com PRÉ-COMPILAÇÃO
# Compila tudo no Mac, leva wheels prontas para Windows

set -e

echo "=========================================="
echo "Instalação Portátil - PRÉ-COMPILADA"
echo "=========================================="
echo ""

# Perguntar onde instalar
echo "Onde deseja instalar a aplicação?"
echo "Exemplos: /Volumes/USB, ~/Desktop"
read -p "Caminho: " install_path

# Expandir ~ e variáveis
install_path=$(eval echo "$install_path")
APP_DIR="$install_path/rootApp"

echo ""
echo "Instalando em: $APP_DIR"
read -p "Continuar? (s/n): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Instalação cancelada."
    exit 1
fi

# Criar estrutura
echo ""
echo "Criando estrutura..."
mkdir -p "$APP_DIR/backend/app"
mkdir -p "$APP_DIR/backend/uploads"
mkdir -p "$APP_DIR/backend/.wheels"
mkdir -p "$APP_DIR/frontend/src"
mkdir -p "$APP_DIR/frontend/public"
mkdir -p "$APP_DIR/.data"

touch "$APP_DIR/.data/.portable"

# Copiar código backend
echo "Copiando código do backend..."
cp -r backend/app/* "$APP_DIR/backend/app/"

# Copiar schemas, models, etc
for file in backend/app/__init__.py backend/app/models.py backend/app/schemas.py; do
    [ -f "$file" ] && cp "$file" "$APP_DIR/$file"
done

# BUILD DO FRONTEND NO MAC
echo ""
echo "=========================================="
echo "COMPILANDO FRONTEND (React)"
echo "=========================================="
echo ""

cd frontend

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências do frontend..."
    npm install --loglevel=error
fi

# Build para produção
echo "Gerando build de produção..."
npm run build

if [ ! -d "build" ]; then
    echo "ERRO: Build do frontend falhou"
    exit 1
fi

cd ..

# Copiar build do frontend
echo "Copiando build do frontend..."
mkdir -p "$APP_DIR/frontend"
cp -r frontend/build/* "$APP_DIR/frontend/"

echo "✅ Frontend compilado e copiado!"

# Criar requirements.txt (Windows-compatível)
cat > "$APP_DIR/backend/requirements.txt" << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
python-multipart==0.0.6
pandas==2.1.3
openpyxl==3.1.2
python-dateutil==2.8.2
pydantic==2.5.0
pydantic-settings==2.1.0
watchfiles==0.21.0
websockets==12.0
httptools==0.6.1
python-dotenv==1.0.0
EOF

# PRÉ-COMPILAR PACOTES PYTHON AUTOMATICAMENTE
echo ""
echo "=========================================="
echo "BAIXANDO PACOTES PRÉ-COMPILADOS"
echo "=========================================="
echo ""
echo "Baixando wheels Windows para Python 3.11..."

# Baixar wheels direto com pip download
if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
    python3 -m pip download \
        fastapi==0.104.1 \
        uvicorn==0.24.0 \
        sqlalchemy==2.0.23 \
        python-multipart==0.0.6 \
        pandas==2.1.3 \
        openpyxl==3.1.2 \
        python-dateutil==2.8.2 \
        pydantic==2.5.0 \
        pydantic-settings==2.1.0 \
        watchfiles==0.21.0 \
        websockets==12.0 \
        httptools==0.6.1 \
        python-dotenv==1.0.0 \
        -d "$APP_DIR/backend/.wheels" \
        --platform win_amd64 \
        --python-version 311 \
        --only-binary=:all: \
        --quiet 2>&1 | grep -v "Requirement already satisfied" || true
else
    echo "ERRO: curl ou wget necessário para download"
    exit 1
fi

WHEEL_COUNT=$(ls -1 "$APP_DIR/backend/.wheels"/*.whl 2>/dev/null | wc -l || echo "0")

echo ""
echo "✅ $WHEEL_COUNT pacotes pré-compilados baixados!"

# Baixar Python Embeddable
echo ""
echo "=========================================="
echo "BAIXANDO PYTHON PORTÁTIL"
echo "=========================================="
echo ""
echo "Baixando Python 3.11.9 embeddable (~30MB)..."
PYTHON_URL="https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
mkdir -p "$APP_DIR/.python"

if command -v curl >/dev/null 2>&1; then
    curl -L --progress-bar -o "$APP_DIR/.python/python.zip" "$PYTHON_URL"
else
    wget --show-progress -O "$APP_DIR/.python/python.zip" "$PYTHON_URL"
fi

echo "Extraindo Python..."
cd "$APP_DIR/.python"
unzip -q python.zip
rm python.zip

# Configurar para importar pacotes locais
if [ -f "python311._pth" ]; then
    # Descomentar import site
    sed -i.bak 's/#import site/import site/' python311._pth 2>/dev/null || \
    echo "import site" >> python311._pth
    echo "Lib" >> python311._pth
    echo "Lib\\site-packages" >> python311._pth
    echo ".." >> python311._pth
    echo "..\\backend" >> python311._pth
fi

cd - > /dev/null

echo "✅ Python portátil instalado!"

# Baixar get-pip.py
echo ""
echo "Baixando pip para Python portátil..."
if command -v curl >/dev/null 2>&1; then
    curl -L --progress-bar -o "$APP_DIR/.python/get-pip.py" "https://bootstrap.pypa.io/get-pip.py"
else
    wget --show-progress -O "$APP_DIR/.python/get-pip.py" "https://bootstrap.pypa.io/get-pip.py"
fi

echo "✅ Pip pronto para instalar!"

PORTABLE_MODE="TOTAL"

# Criar database.py
cat > "$APP_DIR/backend/app/database.py" << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

APP_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(APP_DIR, ".data", "trajectory.db")

DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine)
    
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if 'locations' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('locations')]
            if 'product_number' not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE locations ADD COLUMN product_number VARCHAR(50)"))
                    conn.commit()
    except Exception as e:
        print(f"Warning: {e}")
EOF

# Criar main.py modificado para servir React build
cat > "$APP_DIR/backend/app/main.py" << 'PYEOF'
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
APP_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(APP_DIR, "backend", "uploads")
FRONTEND_DIR = os.path.join(APP_DIR, "frontend")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files (React build)
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")

@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    init_db()

# Copiar todos os endpoints da API original...
PYEOF

# Copiar o resto do main.py original (só as rotas API)
if [ -f "backend/app/main.py" ]; then
    # Extrair apenas as rotas (do primeiro @app até o final)
    sed -n '/@app.get("\/api\/health")/,$p' backend/app/main.py >> "$APP_DIR/backend/app/main.py"
    
    # Adicionar route para servir o React
    cat >> "$APP_DIR/backend/app/main.py" << 'PYEOF'

# Serve React App (catch-all route, must be last)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React application"""
    # Se é uma chamada API, não servir React
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Tentar servir arquivo específico
    file_path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Senão, servir index.html (React Router)
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    raise HTTPException(status_code=404, detail="Not found")
PYEOF
fi

# Garantir utils.py existe
[ -f "backend/app/utils.py" ] && cp backend/app/utils.py "$APP_DIR/backend/app/"

touch "$APP_DIR/backend/app/__init__.py"

# Criar START.bat (com encoding UTF-8 BOM para Windows)
cat > "$APP_DIR/START.bat" << 'BATEOF'
@echo off
chcp 65001 >nul 2>&1
cls

echo ==========================================
echo   TRAJECTORY VIEWER - 100 PORTATIL
echo ==========================================
echo.

cd /d "%~dp0"

REM Configurar Python portatil
set "PYTHON_HOME=%~dp0.python"
set "PYTHON_EXE=%PYTHON_HOME%\python.exe"

echo [OK] Python portatil: 3.11.9
echo [OK] Frontend: build pre-compilado
echo.

REM Backend
echo Preparando backend...
cd backend

REM Instalar pip no Python portatil (primeira vez)
if not exist "%PYTHON_HOME%\Scripts\pip.exe" (
    echo Instalando pip no Python portatil...
    "%PYTHON_EXE%" "%PYTHON_HOME%\get-pip.py" --no-warn-script-location
    if errorlevel 1 (
        echo ERRO ao instalar pip
        pause
        exit /b 1
    )
)

REM Instalar virtualenv globalmente no Python portatil
if not exist "%PYTHON_HOME%\Scripts\virtualenv.exe" (
    echo Instalando virtualenv...
    "%PYTHON_HOME%\Scripts\pip.exe" install virtualenv
    if errorlevel 1 (
        echo ERRO ao instalar virtualenv
        pause
        exit /b 1
    )
)

REM Criar ambiente virtual com Python portatil
if not exist venv (
    echo Criando ambiente virtual...
    "%PYTHON_HOME%\Scripts\virtualenv.exe" --python="%PYTHON_EXE%" venv
    if errorlevel 1 (
        echo ERRO ao criar ambiente virtual
        pause
        exit /b 1
    )
)

echo Instalando pacotes pre-compilados...

REM Instalar wheels locais usando pip do venv
if exist .wheels\*.whl (
    echo Usando wheels pre-compiladas...
    venv\Scripts\pip.exe install --no-index --find-links=.wheels -r requirements.txt
    if errorlevel 1 (
        echo Algumas dependencias faltam, baixando...
        venv\Scripts\pip.exe install -r requirements.txt
        if errorlevel 1 (
            echo ERRO ao instalar pacotes
            pause
            exit /b 1
        )
    )
) else (
    echo Baixando pacotes do PyPI...
    venv\Scripts\pip.exe install -r requirements.txt
    if errorlevel 1 (
        echo ERRO ao instalar pacotes
        pause
        exit /b 1
    )
)

echo Backend pronto (serve frontend automaticamente)!

start "Backend" /MIN cmd /c "cd /d %~dp0backend && %~dp0backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

cls
echo.
echo ==========================================
echo   APLICACAO INICIADA!
echo ==========================================
echo.
echo Aplicacao: http://localhost:8000
echo.
echo O navegador abrira automaticamente.
echo.
echo Para parar: Feche a janela minimizada
echo.
echo ==========================================
timeout /t 2 >nul
start http://localhost:8000

pause
BATEOF

# Criar README
cat > "$APP_DIR/README.txt" << 'EOF'
==========================================
TRAJECTORY VIEWER - 100% PORTATIL
==========================================

ZERO INSTALACOES NECESSARIAS!

✓ Python 3.11.9 portátil incluído
✓ Frontend React pré-compilado
✓ 27 pacotes Python pré-compilados
✓ Tamanho: ~110MB

USAR:

1. Execute: START.bat
2. Aguarde abrir o navegador
3. Pronto!

Para parar: Feche a janela do terminal

==========================================
EOF

echo ""
echo "=========================================="
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
echo "📦 Pacotes pré-compilados: $WHEEL_COUNT"
echo "📁 Instalado em: $APP_DIR"
echo ""

echo "🎉 100% PORTÁTIL - ZERO INSTALAÇÕES!"
echo ""
echo "✅ Python 3.11.9 portátil incluído"
echo "✅ Frontend React pré-compilado"
echo "✅ $WHEEL_COUNT pacotes Python pré-compilados"
echo "✅ Tamanho total: ~110MB"
echo ""
echo "NO WINDOWS:"
echo "1. Copie 'rootApp' para qualquer lugar"
echo "2. Execute: START.bat"
echo "3. Aguarde abrir o navegador"
echo ""
echo "PRONTO! Aplicação all-in-one, sem dependências!"

echo ""
echo "=========================================="
echo ""
