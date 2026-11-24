# Encurtador de Links

Aplicação web que transforma qualquer link longo em um link curto. Quem acessa o link curto é redirecionado (HTTP 302) para o link original.

## Funcionalidades

- **Usuários sem login:** crie um usuário informando só o nome e escolhendo um de 6 avatares (cat, dog, rocket, robot, ghost e star). Depois, escolha o usuário ativo numa lista. O id do usuário ativo fica salvo no `localStorage`.
- **Encurtar link:** cole uma URL e receba um link curto, como `http://localhost:3000/aB3xK9`. URLs sem `http://` ou `https://` são recusadas com uma mensagem de erro.
- **Redirecionar:** `/:codigo` redireciona para a URL original, e um código inexistente retorna 404.
- **Histórico:** mostra só os links do usuário ativo, do mais recente para o mais antigo, com a URL original, o link curto e a data de criação.
- **Tema dark/light:** um botão alterna entre os temas. A escolha fica no `localStorage`, só no frontend.

**Fora do escopo:** login e senha, upload de avatar, contagem de cliques, expiração, edição ou exclusão de links e domínio personalizado.

## Stack

| Parte | Tecnologias |
|-------|-------------|
| **Backend** (`/backend`) | Node.js ≥ 22, Express `^4.22.3`, better-sqlite3 `^13.2.0`, cors `^2.8.6` · testes: Jest `^30.5.2`, Supertest `^7.3.2` |
| **Frontend** (`/frontend`) | React `^19.3.1`, Vite `^8.3.8` · testes: Vitest `^5.1.1`, Testing Library, jsdom |
| **Docker** | `node:22-slim` (backend e build do frontend), `nginx:stable-alpine` (frontend), Docker Compose com volume para o SQLite |

## Rodando com Docker (jeito mais rápido)

Pré-requisito: [Docker](https://docs.docker.com/get-docker/) com o plugin Compose. Você não precisa ter Node.js instalado.

**1. Clone o repositório**

```bash
git clone https://github.com/alberijunior30/encurtador-de-links.git
cd encurtador-de-links
```

**2. Suba o backend e o frontend**

```bash
docker compose up --build -d
```

O `--build` gera as imagens; a primeira vez leva alguns minutos. O `-d` deixa os containers rodando em segundo plano.

**3. Confira se subiu**

```bash
docker compose ps                 # os dois serviços devem aparecer como "running"
docker compose logs -f backend    # deve mostrar "Servidor rodando em http://localhost:3000" (Ctrl+C sai dos logs)
```

**4. Use**

- Frontend: http://localhost:5173 (nginx servindo o build do Vite, usando a API real)
- Backend: http://localhost:3000 (API e links curtos)

**5. Pare**

```bash
docker compose down       # para os containers e mantém os dados
docker compose down -v    # para os containers e APAGA o banco
```

Observações:

- As portas no host precisam ser 3000 e 5173, porque o CORS do backend só aceita `http://localhost:5173` e os links curtos usam `http://localhost:3000`. Se o `npm run dev` estiver usando essas portas, pare-o antes.
- O banco fica em `/data/encurtador.sqlite`, dentro do volume `encurtador-data`. Ele é separado do `backend/encurtador.sqlite` usado fora do Docker e continua existindo entre um `up` e outro.
- Os containers usam `restart: unless-stopped`: se você não der `docker compose down`, eles voltam sozinhos quando o Docker reiniciar.
- Depois de mudar o código, rode `docker compose up --build -d` de novo para gerar imagens atualizadas.

## Rodando sem Docker (desenvolvimento)

Pré-requisito: Node.js 22 ou mais novo.

### Backend (porta 3000)

```bash
cd backend
npm install
npm run dev      # ou: npm start
```

O banco SQLite é criado em `backend/encurtador.sqlite`. Para usar outro arquivo, defina `DB_PATH`, como em `DB_PATH=/tmp/teste.sqlite npm run dev`. A porta pode ser trocada com `PORT`.

### Frontend (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173. O frontend usa a API real em `http://localhost:3000/api` por padrão.

Para usar a **simulação** (dados no `localStorage`, sem backend):

```bash
VITE_USE_MOCK=true npm run dev
```

### Testes

```bash
cd backend && npm test    # Jest + Supertest, banco SQLite em memória
cd frontend && npm test   # Vitest + Testing Library, com a simulação
```

## API

| Método | Rota                   | Descrição            | Sucesso |
|--------|------------------------|----------------------|---------|
| POST   | `/api/users`           | Criar usuário        | 201     |
| GET    | `/api/users`           | Listar usuários      | 200     |
| POST   | `/api/links`           | Encurtar URL         | 201     |
| GET    | `/api/users/:id/links` | Histórico do usuário | 200     |
| GET    | `/:codigo`             | Redirecionar         | 302     |

Os erros seguem sempre o formato `{ "error": "mensagem" }`. O contrato completo, com campos, regras de validação e todas as mensagens de erro, está em [`API.md`](API.md). O escopo está em [`SPEC.md`](SPEC.md).

## Feito com Maestri

![Canvas do Maestri](docs/canvas.png)

Este projeto foi desenvolvido por agentes **Claude Code** orquestrados no [Maestri](https://www.themaestri.app), com um humano aprovando cada etapa.

### Os agentes

| Agente | Pasta de trabalho | Papel |
|--------|-------------------|-------|
| **Planejador** | raiz | Divide o trabalho em tarefas e as delega. Não escreve código. |
| **Back** | `/backend` | Implementa a API seguindo o `API.md`. |
| **Front** | `/frontend` | Implementa a interface, com simulação até a API ficar pronta. |
| **Revisor** | raiz | Revisa cada entrega, aprova ou reprova. Não edita código. |
| **DevOps** | raiz | Cria os Dockerfiles e o `docker-compose.yml`. Não altera código. |

### O que cada um fez

**Back**
- T1: estrutura do projeto
- T2: banco SQLite
- T3: usuários
- T4: encurtar
- T5: histórico
- T6: redirecionamento
- T7: checagem final
- T8: testes de contrato

**Front**
- F1: usuários
- F2: encurtar
- F3: histórico
- F4: tema dark/light
- F5: API real por padrão e checagem final
- F6: correções no `toUserId` e no `Content-Type`

**DevOps**
- K1: Dockerfiles do backend e do frontend, `docker-compose.yml` e `.dockerignore`

**Revisor**
- Entrou na F6 e revisou a F6 e a K1. Aprovou as duas de primeira.

### O fluxo

1. O `SPEC.md` (escopo) e o `API.md` (contrato) são a fonte de verdade. Nenhum agente altera o contrato sem aprovação humana.
2. Com o contrato fechado, o Back e o Front trabalharam **em paralelo**. No fim, o DevOps empacotou os dois com Docker. O Front usou uma simulação com o mesmo formato da API até o backend ficar pronto.
3. O Planejador delegava uma tarefa pequena por vez e esperava o agente confirmar que tinha terminado.
4. O humano aprovava cada tarefa e testava a integração entre frontend e backend. A partir da F6, cada entrega também passou pelo Revisor antes de chegar ao humano.
