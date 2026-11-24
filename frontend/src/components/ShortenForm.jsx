import { useState } from 'react';
import { createLink } from '../api/index.js';
import { toUserId } from '../activeUser.js';
import { validateUrl } from '../linkRules.js';

export default function ShortenForm({ activeUserId, onCreated }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [link, setLink] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const userId = toUserId(activeUserId);
  const enabled = userId !== null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!enabled) return;
    setLink(null);
    // Sem trim: a URL é enviada exatamente como digitada.
    const urlError = validateUrl(url);
    if (urlError) {
      setError(urlError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const created = await createLink({ userId, url });
      setLink(created);
      setUrl('');
      onCreated?.(created);
    } catch (err) {
      setError(err?.error ?? 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate aria-label="Encurtar link">
      <h2>Encurtar link</h2>
      {!enabled && <p className="notice">Crie ou escolha um usuário para encurtar links.</p>}
      <label htmlFor="link-url">URL</label>
      <input
        id="link-url"
        type="text"
        inputMode="url"
        placeholder="https://www.exemplo.com/um/caminho/muito/longo"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={!enabled}
        autoComplete="off"
      />

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {link && (
        <p className="short-link">
          Link curto:{' '}
          <a href={link.shortUrl} target="_blank" rel="noopener noreferrer">
            {link.shortUrl}
          </a>
        </p>
      )}

      <button type="submit" disabled={!enabled || submitting}>
        Encurtar
      </button>
    </form>
  );
}
