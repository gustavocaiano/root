# Quick Start Guide

## Início Rápido (5 minutos)

### 1. Inicie a aplicação

```bash
docker-compose up --build
```

Aguarde até ver as mensagens:
- `trajectory-db | database system is ready to accept connections`
- `trajectory-backend | Application startup complete`
- `trajectory-frontend | webpack compiled successfully`

### 2. Abra o browser

Aceda a: **http://localhost:3000**

### 3. Faça upload de dados

Use o ficheiro de exemplo incluído `sample-data.csv`:

1. Clique na área de upload na barra lateral
2. Selecione o ficheiro `sample-data.csv`
3. Clique em "Upload File"

### 4. Explore o mapa

- **Zoom**: Use a roda do rato ou os botões +/-
- **Pan**: Clique e arraste o mapa
- **Ponto**: Clique num ponto para ver detalhes
- **Filtros**: Use a barra lateral para filtrar por alvo ou data

### 5. Teste os filtros

- Selecione um TargetNumber específico no dropdown
- Defina uma data de início e fim
- Active/desactive "Show trajectory lines"

## Estrutura de Dados

O ficheiro CSV/Excel deve ter estas colunas:

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| TargetNumber | String (9 dígitos) | 912345678 |
| timestamp | DateTime | 2024-01-15 10:30:00 |
| Latitude | Float (-90 a 90) | 38.7223 |
| Longitude | Float (-180 a 180) | -9.1393 |

## Comandos Úteis

### Parar a aplicação
```bash
docker-compose down
```

### Ver logs
```bash
docker-compose logs -f
```

### Limpar tudo (incluindo dados)
```bash
docker-compose down -v
```

### Reiniciar apenas um serviço
```bash
docker-compose restart backend
```

## Acesso aos Serviços

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Frontend | http://localhost:3000 | Interface web |
| Backend API | http://localhost:8000 | API REST |
| API Docs | http://localhost:8000/docs | Documentação Swagger |
| PostgreSQL | localhost:5432 | Base de dados |

## Credenciais da Base de Dados

- **Host**: localhost
- **Port**: 5432
- **Database**: trajectorydb
- **User**: trajuser
- **Password**: trajpass

## Troubleshooting

### "Port is already allocated"
Alguma porta está em uso. Edite `docker-compose.yml` e mude as portas.

### "Connection refused"
Aguarde mais tempo. O backend espera o PostgreSQL estar pronto.

### "Cannot read file"
Verifique se o ficheiro tem as colunas corretas (TargetNumber, timestamp, Latitude, Longitude).

### Resetar tudo
```bash
docker-compose down -v
docker-compose up --build
```

## Próximos Passos

1. ✅ Teste com os dados de exemplo
2. ✅ Faça upload dos seus próprios dados
3. ✅ Explore os filtros e funcionalidades
4. ✅ Verifique a API em http://localhost:8000/docs
5. ✅ Leia o README.md completo para mais detalhes

## Suporte

Se encontrar problemas, verifique:
- Os logs: `docker-compose logs`
- A documentação completa em `README.md`
- Se todos os serviços estão a correr: `docker-compose ps`

---

**Pronto! A sua aplicação está a funcionar. Bom trabalho! 🎉**

