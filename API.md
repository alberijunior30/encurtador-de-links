# Contrato da API — Encurtador de Links

> Este arquivo é a única fonte de verdade entre Back e Front.
> **Nenhum agente altera este arquivo** sem aprovação humana (ver `SPEC.md`).

## Convenções

- **Base URL do backend:** `http://localhost:3000`
- **Frontend (Vite):** `http://localhost:5173` — o backend deve liberar CORS para essa origem.
- Rotas da API ficam sob o prefixo **`/api`**. A única rota fora dele é o redirecionamento (`GET /:codigo`), para o link curto ficar curto.
- Corpo de requisição e resposta em **JSON** (`Content-Type: application/json`).
- Datas em **ISO 8601** (ex.: `"2026-11-23T18:55:00.000Z"`).
- IDs são **inteiros**.

### Formato de erro (igual em todos os endpoints)

```json
{ "error": "mensagem legível para o usuário" }
```

### Erros gerais (qualquer rota)

| Status | Caso                                   | `error`                              |
|--------|----------------------------------------|--------------------------------------|
| 400    | JSON malformado no corpo               | JSON malformado na requisição        |
| 404    | rota inexistente                       | Rota não encontrada                  |
| 413    | corpo da requisição grande demais      | Corpo da requisição grande demais    |
| 415    | charset diferente de utf-8             | Charset não suportado; use utf-8     |
| 415    | codificação de conteúdo não suportada  | Codificação de conteúdo não suportada |
| 500    | erro inesperado                        | Erro interno do servidor             |

### Avatares permitidos

O campo `avatar` é uma string e só aceita um destes valores:

```
"cat" | "dog" | "rocket" | "robot" | "ghost" | "star"
```

O backend só valida o valor. Os ícones ficam no frontend.

### Código do link curto

- 6 caracteres, letras maiúsculas, minúsculas e números (`[A-Za-z0-9]{6}`).
- Gerado pelo backend e único.

---

## Usuários

### `POST /api/users` — Criar usuário

**Requisição**
```json
{
  "name": "Alberi",
  "avatar": "rocket"
}
```

| Campo    | Tipo   | Regras                                   |
|----------|--------|------------------------------------------|
| `name`   | string | obrigatório; espaços nas pontas são removidos (trim); depois do trim, 1 a 30 caracteres |
| `avatar` | string | obrigatório, um dos avatares permitidos  |

**Resposta `201 Created`**
```json
{
  "id": 1,
  "name": "Alberi",
  "avatar": "rocket",
  "createdAt": "2026-11-23T18:55:00.000Z"
}
```

**Erros** (validados nesta ordem; a resposta traz o primeiro erro encontrado)

| Status | Caso                                        | `error`                                                                |
|--------|---------------------------------------------|------------------------------------------------------------------------|
| 400    | `name` ausente ou `null`                    | O nome é obrigatório                                                   |
| 400    | `name` não é texto                          | O nome deve ser um texto                                               |
| 400    | `name` vazio ou só espaços (após trim)      | O nome não pode ficar vazio                                            |
| 400    | `name` com mais de 30 caracteres (após trim; emoji conta 1) | O nome deve ter no máximo 30 caracteres                |
| 400    | `avatar` ausente ou `null`                  | O avatar é obrigatório                                                 |
| 400    | `avatar` inválido ou não é texto            | Avatar inválido. Use um destes: cat, dog, rocket, robot, ghost, star   |

---

### `GET /api/users` — Listar usuários

**Resposta `200 OK`**
```json
[
  {
    "id": 1,
    "name": "Alberi",
    "avatar": "rocket",
    "createdAt": "2026-11-23T18:55:00.000Z"
  }
]
```

Ordenado por `createdAt`, do mais antigo para o mais recente. Lista vazia retorna `[]`.

---

## Links

### `POST /api/links` — Encurtar URL

**Requisição**
```json
{
  "userId": 1,
  "url": "https://www.exemplo.com/um/caminho/muito/longo"
}
```

| Campo    | Tipo    | Regras                                              |
|----------|---------|-----------------------------------------------------|
| `userId` | inteiro | obrigatório, usuário precisa existir                |
| `url`    | string  | obrigatório; começa com `http://` ou `https://`, tem host e não contém espaços; sem trim, guardada exatamente como enviada |

> `userId` deve ser **número** no JSON: `"1"` (string) é recusado. O front converte o valor lido do `localStorage` antes de enviar.

**Resposta `201 Created`**
```json
{
  "id": 10,
  "code": "aB3xK9",
  "shortUrl": "http://localhost:3000/aB3xK9",
  "originalUrl": "https://www.exemplo.com/um/caminho/muito/longo",
  "userId": 1,
  "createdAt": "2026-11-23T19:00:00.000Z"
}
```

**Erros** (validados nesta ordem; a resposta traz o primeiro erro encontrado)

| Status | Caso                                                         | `error`                                                          |
|--------|--------------------------------------------------------------|------------------------------------------------------------------|
| 400    | `url` ausente ou `null` (inclui corpo vazio ou não-JSON)     | A URL é obrigatória                                              |
| 400    | `url` não é texto                                            | A URL deve ser um texto                                          |
| 400    | `url` inválida (esquema não http/https, sem host, com espaço) | URL inválida. Use um endereço começando com http:// ou https://  |
| 400    | `userId` ausente ou `null`                                   | O userId é obrigatório                                           |
| 400    | `userId` não é inteiro (`"1"`, `1.5`, `true`…)               | O userId deve ser um número inteiro                              |
| 404    | usuário não existe (inclui `0` e negativos)                  | Usuário não encontrado                                           |
| 500    | código único não gerado após 5 tentativas                    | Não foi possível gerar um código único. Tente novamente.         |

> Encurtar a mesma URL duas vezes gera **dois links diferentes**.

---

### `GET /api/users/:id/links` — Histórico do usuário

**Resposta `200 OK`**
```json
[
  {
    "id": 10,
    "code": "aB3xK9",
    "shortUrl": "http://localhost:3000/aB3xK9",
    "originalUrl": "https://www.exemplo.com/um/caminho/muito/longo",
    "userId": 1,
    "createdAt": "2026-11-23T19:00:00.000Z"
  }
]
```

Ordenado por `createdAt`, **do mais recente para o mais antigo**. Sem links retorna `[]`.

**Erros**

| Status | Caso                                                                 | `error`                |
|--------|----------------------------------------------------------------------|------------------------|
| 404    | `:id` não é só dígitos (`abc`, `1.5`, `-1`, `1e3`…) ou acima de `Number.MAX_SAFE_INTEGER` | Usuário não encontrado |
| 404    | usuário não existe (inclui `0`)                                      | Usuário não encontrado |

`:id` com zeros à esquerda é aceito (`01` → `1`). `:id` vazio (`/api/users//links`) cai no erro geral "Rota não encontrada".

---

## Redirecionamento

### `GET /:codigo` — Abrir link curto

- **`302 Found`** com header `Location: <originalUrl>`. Também responde a `HEAD`.
- O código diferencia maiúsculas de minúsculas (`aB3xK9` ≠ `AB3XK9`).
- Query string e barra final na URL curta são ignoradas.
- Caracteres não-ASCII da URL original saem codificados no `Location` (`á` → `%C3%A1`); no banco a URL fica como foi enviada.
- Nada é gravado durante o redirecionamento.

**Erros**

| Status | Caso                                                                 | `error`              |
|--------|----------------------------------------------------------------------|----------------------|
| 404    | código no formato `[A-Za-z0-9]{6}`, mas inexistente                  | Link não encontrado  |
| 404    | caminho fora do formato do código (`/abc`, `/a-b_c1`, `/`…)          | Rota não encontrada (erro geral) |

Esta rota fica **fora** do prefixo `/api`.

---

## Resumo

| Método | Rota                      | Descrição               | Sucesso |
|--------|---------------------------|-------------------------|---------|
| POST   | `/api/users`              | Criar usuário           | 201     |
| GET    | `/api/users`              | Listar usuários         | 200     |
| POST   | `/api/links`              | Encurtar URL            | 201     |
| GET    | `/api/users/:id/links`    | Histórico do usuário    | 200     |
| GET    | `/:codigo`                | Redirecionar            | 302     |
