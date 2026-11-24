# Encurtador de Links

## Objetivo
Aplicação web que transforma qualquer link longo em um link curto. Quem acessa o link curto é **redirecionado** para o link original.

## Funcionalidades

### Usuário (sem login)
- Criar um usuário informando apenas **nome** e escolhendo **um avatar** de uma lista de 6 ícones prontos (sem upload de imagem).
- Selecionar o usuário ativo em uma lista de usuários existentes.
- O id do usuário ativo fica salvo no `localStorage` do navegador.

### Encurtar link
- O usuário ativo cola uma URL e recebe um link curto (ex.: `http://localhost:3000/aB3xK9`).
- URLs inválidas (sem `http://` ou `https://`) devem ser recusadas com mensagem de erro.

### Redirecionar
- Acessar `/:codigo` redireciona (HTTP 302) para a URL original.
- Código inexistente retorna 404.

### Histórico
- Lista **apenas os links do usuário ativo**, do mais recente para o mais antigo.
- Cada item mostra: URL original, link curto e data de criação.

### Tema dark/light
- Botão que alterna entre tema escuro e claro.
- **Apenas no frontend**: a escolha fica no `localStorage`. O backend não sabe nada sobre tema.

## Fora do escopo (não implementar agora)
- Login, senha e cadastro com e-mail.
- Upload de imagem de avatar.
- Contagem de cliques e estatísticas.
- Data de expiração do link.
- Editar ou apagar links.
- Domínio personalizado.

## Stack
- **Backend:** Node.js + Express + SQLite, na pasta `/backend`.
- **Frontend:** React + Vite, na pasta `/frontend`.

## Regras para os agentes

### Gerais
- O contrato da API está em `API.md`. Ele é a única fonte de verdade sobre endpoints, formatos de requisição e resposta.
- **Nenhum agente altera o `API.md`.** Se precisar de mudança no contrato, o agente para e pede ao Planejador, que só altera após aprovação humana.
- Nada fora do escopo deste documento deve ser implementado, mesmo que pareça útil.

### Planejador
- Lê este `SPEC.md` e o `API.md` e divide o trabalho em tarefas pequenas.
- Delega tarefas ao Back e ao Front. **Não escreve código.**

### Back
- Só cria ou altera arquivos dentro de `/backend`.
- Implementa exatamente os endpoints descritos no `API.md`.

### Front
- Só cria ou altera arquivos dentro de `/frontend`.
- Consome a API seguindo o `API.md`. Se o backend ainda não estiver pronto, usa dados simulados no mesmo formato do contrato.

### Revisor
- **Não edita código.** Apenas lê e devolve comentários ao agente responsável.
- Verifica: respeito ao `API.md`, respeito ao escopo e se cada agente ficou na sua pasta.

## Definição de pronto
Uma tarefa só está terminada quando:
1. O projeto roda sem erros (`npm run dev` na pasta correspondente).
2. Os testes da pasta passam (`npm test`).
3. O Revisor aprovou.
