// Guarda de testes: substitui o fetch global para que NENHUMA requisição de verdade saia
// (em especial para o backend real em http://localhost:3000, que usa o banco do humano).
// Testes que precisam de fetch o mockam com vi.stubGlobal('fetch', ...); ao desfazer o stub,
// o fetch volta a ser esta guarda. Qualquer chamada não mockada é registrada e o teste falha.
const unmockedCalls = [];

export function guardFetch(input) {
  const url = typeof input === 'string' ? input : (input?.url ?? String(input));
  unmockedCalls.push(url);
  return Promise.reject(new Error(`fetch não mockado bloqueado nos testes: ${url}`));
}

export function installFetchGuard() {
  globalThis.fetch = guardFetch;
}

// Devolve e limpa as chamadas não mockadas registradas.
export function takeUnmockedCalls() {
  return unmockedCalls.splice(0, unmockedCalls.length);
}
