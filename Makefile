.PHONY: help build up down restart logs clean ps health test

help: ## Mostrar esta mensagem de ajuda
	@echo "Trajectory Viewer - Comandos Disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

build: ## Construir as imagens Docker
	docker-compose build

up: ## Iniciar todos os serviços
	docker-compose up -d

up-logs: ## Iniciar todos os serviços e mostrar logs
	docker-compose up

down: ## Parar todos os serviços
	docker-compose down

restart: ## Reiniciar todos os serviços
	docker-compose restart

restart-backend: ## Reiniciar apenas o backend
	docker-compose restart backend

restart-frontend: ## Reiniciar apenas o frontend
	docker-compose restart frontend

logs: ## Mostrar logs de todos os serviços
	docker-compose logs -f

logs-backend: ## Mostrar logs do backend
	docker-compose logs -f backend

logs-frontend: ## Mostrar logs do frontend
	docker-compose logs -f frontend

logs-db: ## Mostrar logs da base de dados
	docker-compose logs -f postgres

ps: ## Listar serviços em execução
	docker-compose ps

health: ## Verificar status de todos os serviços
	@echo "Checking services health..."
	@docker-compose ps
	@echo ""
	@echo "Testing backend..."
	@curl -s http://localhost:8000/api/health || echo "Backend not responding"
	@echo ""
	@echo "Testing frontend..."
	@curl -s -o /dev/null -w "Frontend status: %{http_code}\n" http://localhost:3000

clean: ## Parar e remover todos os containers, volumes e imagens
	docker-compose down -v
	docker-compose rm -f

clean-hard: ## Limpeza completa incluindo imagens
	docker-compose down -v --rmi all
	docker-compose rm -f

shell-backend: ## Abrir shell no container do backend
	docker-compose exec backend /bin/bash

shell-db: ## Abrir shell PostgreSQL
	docker-compose exec postgres psql -U trajuser -d trajectorydb

dev-backend: ## Executar backend em modo desenvolvimento (local)
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Executar frontend em modo desenvolvimento (local)
	cd frontend && npm start

install-backend: ## Instalar dependências do backend (local)
	cd backend && pip install -r requirements.txt

install-frontend: ## Instalar dependências do frontend (local)
	cd frontend && npm install

rebuild: ## Reconstruir e reiniciar tudo
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

full-reset: clean build up-logs ## Reset completo: limpar, construir e iniciar

test-upload: ## Testar upload com ficheiro de exemplo
	@echo "Testing file upload..."
	@curl -X POST -F "file=@sample-data.csv" http://localhost:8000/api/upload

test-api: ## Testar endpoints principais da API
	@echo "Testing API endpoints..."
	@echo "\n1. Health Check:"
	@curl -s http://localhost:8000/api/health | python3 -m json.tool
	@echo "\n2. Stats:"
	@curl -s http://localhost:8000/api/stats | python3 -m json.tool
	@echo "\n3. Targets:"
	@curl -s http://localhost:8000/api/targets | python3 -m json.tool

backup-db: ## Fazer backup da base de dados
	docker-compose exec -T postgres pg_dump -U trajuser trajectorydb > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore-db: ## Restaurar base de dados (specify BACKUP_FILE=filename.sql)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "Usage: make restore-db BACKUP_FILE=backup_20241113_120000.sql"; \
		exit 1; \
	fi
	docker-compose exec -T postgres psql -U trajuser trajectorydb < $(BACKUP_FILE)

open: ## Abrir aplicação no browser
	@echo "Opening application..."
	@open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || echo "Please open http://localhost:3000 in your browser"

open-docs: ## Abrir documentação da API
	@echo "Opening API documentation..."
	@open http://localhost:8000/docs 2>/dev/null || xdg-open http://localhost:8000/docs 2>/dev/null || echo "Please open http://localhost:8000/docs in your browser"

setup: build up ## Setup inicial: construir e iniciar
	@echo "Waiting for services to start..."
	@sleep 10
	@make health
	@echo ""
	@echo "Setup complete! Access the application at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

