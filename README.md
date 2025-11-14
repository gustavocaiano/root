# Trajectory Viewer

Uma aplicação web para visualizar e analisar trajetos baseados em dados de localização GPS. A aplicação permite fazer upload de ficheiros Excel ou CSV com dados de interceção e visualizá-los num mapa interativo OpenStreetMap.

## Características

- 📤 **Upload de Ficheiros**: Suporte para ficheiros .xlsx, .xls e .csv
- 🗺️ **Mapa Interativo**: Visualização baseada em OpenStreetMap com Leaflet
- 📍 **Trajetos**: Linhas conectando pontos por ordem temporal
- 🔍 **Filtros**: Filtre por número de alvo (TargetNumber) e intervalo de datas
- 📊 **Histórico Completo**: Clique em qualquer ponto para ver todo o histórico do alvo
- 🎨 **Interface Moderna**: Design responsivo e intuitivo

## Estrutura de Dados

O ficheiro de upload deve conter as seguintes colunas:

- `TargetNumber`: Número de identificação do alvo (9 dígitos)
- `timestamp`: Data e hora da interceção
- `Latitude`: Coordenada de latitude (-90 a 90)
- `Longitude`: Coordenada de longitude (-180 a 180)

**Exemplo de CSV:**
```csv
TargetNumber,timestamp,Latitude,Longitude
912345678,2024-01-15 10:30:00,38.7223,-9.1393
912345678,2024-01-15 11:45:00,38.7250,-9.1400
987654321,2024-01-15 12:00:00,38.7100,-9.1500
```

## Tecnologias

### Backend
- **FastAPI** (Python) - API REST
- **PostgreSQL** - Base de dados
- **SQLAlchemy** - ORM
- **Pandas** - Processamento de dados
- **Uvicorn** - Servidor ASGI

### Frontend
- **React** + **TypeScript** - Framework UI
- **Leaflet** + **React-Leaflet** - Mapa interativo
- **Axios** - Cliente HTTP

### Infraestrutura
- **Docker** + **Docker Compose** - Containerização

## Requisitos

- Docker Desktop ou Docker Engine + Docker Compose
- Mínimo 4GB de RAM
- Portas disponíveis: 3000 (frontend), 8000 (backend), 5432 (postgres)

## Instalação e Execução

### 1. Clone o repositório

```bash
git clone <repository-url>
cd root
```

### 2. Inicie a aplicação com Docker Compose

```bash
docker-compose up --build
```

Este comando irá:
- Construir as imagens Docker
- Iniciar o PostgreSQL
- Iniciar o backend FastAPI
- Iniciar o frontend React

### 3. Aceda à aplicação

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação API**: http://localhost:8000/docs

## Utilização

### 1. Upload de Dados

1. Na barra lateral esquerda, clique na área de upload ou arraste um ficheiro
2. Selecione um ficheiro Excel (.xlsx, .xls) ou CSV
3. Clique em "Upload File"
4. Aguarde a confirmação do upload

### 2. Visualização

- Os pontos aparecem automaticamente no mapa
- Diferentes alvos têm cores diferentes
- Linhas conectam os pontos de cada alvo por ordem cronológica

### 3. Filtros

- **Target Number**: Selecione um alvo específico no dropdown
- **Start Date / End Date**: Defina um intervalo de datas
- **Show trajectory lines**: Active/desative a visualização das linhas

### 4. Detalhes do Ponto

- Clique em qualquer ponto no mapa
- Uma janela modal mostra:
  - Informações do ponto (número, timestamp, coordenadas)
  - Histórico completo do TargetNumber
  - Lista cronológica de todas as posições

### 5. Limpar Dados

- Use o botão "Clear All Data" para remover todos os dados da base de dados
- Esta ação não pode ser revertida

## API Endpoints

### Upload
- `POST /api/upload` - Upload de ficheiro Excel/CSV

### Consulta
- `GET /api/targets` - Lista de TargetNumbers únicos
- `GET /api/trajectories` - Obter trajetos (com filtros opcionais)
- `GET /api/points/{target_number}` - Histórico completo de um alvo
- `GET /api/stats` - Estatísticas gerais

### Gestão
- `DELETE /api/data` - Limpar todos os dados

Documentação completa disponível em: http://localhost:8000/docs

## Desenvolvimento

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Base de Dados

O PostgreSQL está configurado com:
- **Host**: localhost (ou postgres dentro do Docker)
- **Port**: 5432
- **Database**: trajectorydb
- **User**: trajuser
- **Password**: trajpass

## Estrutura do Projeto

```
.
├── docker-compose.yml          # Orquestração dos serviços
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # API FastAPI
│       ├── models.py          # Modelos SQLAlchemy
│       ├── schemas.py         # Schemas Pydantic
│       ├── database.py        # Configuração BD
│       └── utils.py           # Processamento de ficheiros
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx            # Componente principal
│       ├── components/
│       │   ├── MapView.tsx    # Mapa Leaflet
│       │   ├── FileUpload.tsx # Upload de ficheiros
│       │   └── Filters.tsx    # Filtros
│       └── services/
│           └── api.ts         # Cliente API
└── README.md
```

## Troubleshooting

### Portas já em uso

Se alguma porta estiver em uso, edite `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3001:3000"  # Mude 3000 para outra porta
```

### Problemas com Docker

```bash
# Parar todos os containers
docker-compose down

# Remover volumes (limpa a base de dados)
docker-compose down -v

# Reconstruir tudo do zero
docker-compose up --build --force-recreate
```

### Base de dados não conecta

Certifique-se que o PostgreSQL está healthy:

```bash
docker-compose ps
```

Aguarde até o serviço postgres estar "healthy" antes dos outros serviços iniciarem.

## Performance

- A aplicação usa índices PostgreSQL para queries rápidas
- Suporta facilmente milhares de pontos
- Para datasets muito grandes (>100k pontos), considere:
  - Filtrar por data/alvo
  - Implementar paginação
  - Usar clustering de pontos no mapa

## Segurança

⚠️ **Nota**: Esta é uma aplicação de demonstração. Para produção:

- Altere as credenciais da base de dados
- Adicione autenticação e autorização
- Use HTTPS
- Implemente rate limiting
- Valide e sanitize todos os inputs
- Use variáveis de ambiente para secrets

## Licença

MIT License

## Suporte

Para questões ou problemas, abra uma issue no repositório.

