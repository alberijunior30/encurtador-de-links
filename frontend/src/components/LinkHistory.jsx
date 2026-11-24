import { formatDateTime } from '../formatDate.js';

export default function LinkHistory({ activeUserId, links, loading, error }) {
  return (
    <section className="card" aria-label="Histórico">
      <h2>Histórico</h2>
      {activeUserId === null ? (
        <p className="notice">Escolha um usuário para ver o histórico.</p>
      ) : error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : loading ? (
        <p>Carregando…</p>
      ) : links.length === 0 ? (
        <p>Nenhum link ainda</p>
      ) : (
        <ul className="link-list">
          {links.map((link) => (
            <li key={link.id} className="link-item">
              <span className="link-original" title={link.originalUrl}>
                {link.originalUrl}
              </span>
              <a className="link-short" href={link.shortUrl} target="_blank" rel="noopener noreferrer">
                {link.shortUrl}
              </a>
              <time className="link-date" dateTime={link.createdAt}>
                {formatDateTime(link.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
