# Troubleshooting Guide

## Problemas Comuns e Soluções

### 1. Erro: "Port is already allocated"

**Problema:** Uma das portas (3000, 8000, 5432) já está em uso.

**Solução:**

```bash
# Descobrir o que está a usar a porta
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Matar o processo (substitua PID pelo número do processo)
kill -9 PID

# OU alterar as portas no docker-compose.yml
# Por exemplo, mudar frontend de 3000 para 3001:
# ports:
#   - "3001:3000"
```

### 2. Erro: "Connection refused" ao aceder ao backend

**Problema:** O backend ainda não está pronto ou não iniciou.

**Solução:**

```bash
# Verificar status dos containers
docker-compose ps

# Ver logs do backend
docker-compose logs backend

# Aguardar mais tempo - o backend espera o PostgreSQL
# Se depois de 30 segundos ainda não funciona:
docker-compose restart backend
```

### 3. Erro: "Database connection failed"

**Problema:** PostgreSQL não está pronto ou não conecta.

**Solução:**

```bash
# Verificar se PostgreSQL está healthy
docker-compose ps

# Ver logs do PostgreSQL
docker-compose logs postgres

# Se não estiver healthy, reiniciar:
docker-compose restart postgres

# Se persistir, reset completo:
docker-compose down -v
docker-compose up --build
```

### 4. Erro: "Cannot read file" ao fazer upload

**Problema:** Ficheiro com formato ou estrutura incorreta.

**Solução:**

Verifique se o ficheiro tem as colunas corretas:
- TargetNumber
- timestamp
- Latitude
- Longitude

**Exemplo correto (CSV):**
```csv
TargetNumber,timestamp,Latitude,Longitude
912345678,2024-01-15 10:30:00,38.7223,-9.1393
```

**Formatos de data aceites:**
- `2024-01-15 10:30:00`
- `2024/01/15 10:30:00`
- `15-01-2024 10:30:00`
- Qualquer formato reconhecido pelo pandas

### 5. Frontend não carrega / Página em branco

**Problema:** Frontend não iniciou corretamente ou erro de compilação.

**Solução:**

```bash
# Ver logs do frontend
docker-compose logs frontend

# Se houver erros de compilação, reconstruir:
docker-compose down
docker-compose up --build frontend

# Se persistir, limpar node_modules:
docker-compose down
docker volume prune
docker-compose up --build
```

### 6. Mapa não aparece / Folhas em branco

**Problema:** Leaflet CSS não carregou ou erro de rede.

**Solução:**

1. Verifique a consola do browser (F12)
2. Limpe a cache do browser (Ctrl+Shift+R ou Cmd+Shift+R)
3. Verifique se tem internet (Leaflet precisa de tiles do OpenStreetMap)

### 7. Upload fica a processar infinitamente

**Problema:** Ficheiro muito grande ou erro no backend.

**Solução:**

```bash
# Ver logs do backend em tempo real
docker-compose logs -f backend

# Se houver erro, o ficheiro pode ser inválido
# Teste com o sample-data.csv primeiro

# Se o ficheiro é muito grande (>100MB):
# - Divida em ficheiros menores
# - Ou aumente o timeout no axios (frontend/src/services/api.ts)
```

### 8. Pontos aparecem no sítio errado

**Problema:** Coordenadas invertidas (lat/long trocados).

**Solução:**

Verifique se as coordenadas estão corretas:
- Latitude: -90 a 90 (vertical, Norte/Sul)
- Longitude: -180 a 180 (horizontal, Este/Oeste)

Se estiverem invertidas no ficheiro, troque as colunas antes do upload.

### 9. Erro: "No matching manifest for linux/arm64"

**Problema:** Usando Mac M1/M2 com imagens que não suportam ARM.

**Solução:**

Adicione ao docker-compose.yml em cada serviço:

```yaml
platform: linux/amd64
```

Ou use as imagens nativas ARM quando disponíveis.

### 10. Containers param inesperadamente

**Problema:** Falta de memória ou recursos.

**Solução:**

```bash
# Verificar uso de recursos
docker stats

# Aumentar recursos do Docker:
# Docker Desktop → Settings → Resources → Memory (mínimo 4GB)

# Ver o que causou o crash
docker-compose logs --tail=50
```

## Comandos Úteis para Debug

### Ver logs em tempo real

```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

# Apenas frontend
docker-compose logs -f frontend

# Apenas database
docker-compose logs -f postgres
```

### Entrar nos containers

```bash
# Backend (bash)
docker-compose exec backend /bin/bash

# Frontend (sh - alpine)
docker-compose exec frontend /bin/sh

# PostgreSQL
docker-compose exec postgres psql -U trajuser -d trajectorydb
```

### Verificar estado

```bash
# Status dos containers
docker-compose ps

# Uso de recursos
docker stats

# Redes
docker network ls

# Volumes
docker volume ls
```

### Testar conectividade

```bash
# Testar backend
curl http://localhost:8000/api/health

# Testar upload
curl -X POST -F "file=@sample-data.csv" http://localhost:8000/api/upload

# Testar database (dentro do container postgres)
docker-compose exec postgres psql -U trajuser -d trajectorydb -c "SELECT COUNT(*) FROM locations;"
```

## Reset Completo

Se nada funcionar, reset completo:

```bash
# Parar tudo
docker-compose down

# Remover volumes (apaga dados!)
docker-compose down -v

# Remover imagens
docker-compose down -v --rmi all

# Limpar sistema Docker
docker system prune -a --volumes

# Reconstruir do zero
docker-compose build --no-cache

# Iniciar
docker-compose up
```

## Problemas de Performance

### Upload lento

- Ficheiros grandes demoram mais
- Verifique a conexão de rede
- O processamento de Excel é mais lento que CSV

### Mapa lento com muitos pontos

- Use filtros para reduzir pontos visíveis
- Considere desativar as linhas (checkbox)
- Para >10k pontos, considere implementar clustering

### Database lenta

```bash
# Ver queries lentas (dentro do container postgres)
docker-compose exec postgres psql -U trajuser -d trajectorydb

# No psql:
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Verificar tamanho da database
SELECT pg_size_pretty(pg_database_size('trajectorydb'));

# Reindexar se necessário
REINDEX DATABASE trajectorydb;
```

## Verificação de Integridade

### Verificar se tudo está OK

```bash
# 1. Containers a correr
docker-compose ps
# Todos devem estar "Up"

# 2. Backend responde
curl http://localhost:8000/api/health
# Deve retornar: {"status":"healthy"}

# 3. Frontend acessível
curl -I http://localhost:3000
# Deve retornar: HTTP/1.1 200 OK

# 4. Database conecta
docker-compose exec postgres pg_isready -U trajuser
# Deve retornar: accepting connections
```

### Verificar dados

```bash
# Entrar na database
docker-compose exec postgres psql -U trajuser -d trajectorydb

# Dentro do psql:
# Ver tabelas
\dt

# Contar registos
SELECT COUNT(*) FROM locations;

# Ver targets únicos
SELECT DISTINCT target_number FROM locations;

# Ver últimos 10 registos
SELECT * FROM locations ORDER BY created_at DESC LIMIT 10;

# Sair
\q
```

## Logs Detalhados

### Backend

```bash
# Logs completos
docker-compose logs backend

# Últimas 100 linhas
docker-compose logs --tail=100 backend

# Com timestamps
docker-compose logs -t backend

# Grep por erros
docker-compose logs backend | grep ERROR
```

### Frontend

```bash
# Logs do webpack
docker-compose logs frontend | grep -i compiled

# Erros de build
docker-compose logs frontend | grep -i error
```

## Problemas Específicos do Browser

### Console Errors

Abra DevTools (F12) e verifique:

1. **Console**: Erros JavaScript
2. **Network**: Requests falhados (API calls)
3. **Application**: LocalStorage, Cookies

### CORS Errors

Se vir erros CORS:

```bash
# Verificar configuração CORS no backend
docker-compose logs backend | grep CORS

# Deve permitir: http://localhost:3000
```

## Contacto para Suporte

Se o problema persistir:

1. ✅ Consulte este guia
2. ✅ Verifique os logs: `docker-compose logs`
3. ✅ Tente o reset completo
4. ✅ Verifique os requisitos (Docker, RAM, Portas)
5. ✅ Teste com sample-data.csv

## Checklist de Problemas

Antes de reportar um problema, verifique:

- [ ] Docker está instalado e a correr
- [ ] Portas 3000, 8000, 5432 estão livres
- [ ] Tem pelo menos 4GB RAM disponível
- [ ] Executou `docker-compose up --build`
- [ ] Aguardou pelo menos 30 segundos após iniciar
- [ ] Todos os containers estão "Up" (`docker-compose ps`)
- [ ] Backend responde em http://localhost:8000/api/health
- [ ] Tentou com o ficheiro sample-data.csv
- [ ] Verificou os logs (`docker-compose logs`)
- [ ] Tentou reiniciar (`docker-compose restart`)
- [ ] Tentou reset completo (`docker-compose down -v && docker-compose up --build`)

---

**Se tudo mais falhar, comece do zero com os comandos de reset completo acima!**

