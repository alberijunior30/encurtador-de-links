import { useState } from 'react';
import { AVATAR_KEYS, avatarEmoji } from '../avatars.js';
import { createUser } from '../api/index.js';
import { validateName } from '../userRules.js';

export default function CreateUserForm({ onCreated }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    const nameError = validateName(trimmed);
    if (nameError) {
      setError(nameError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await createUser({ name: trimmed, avatar });
      setName('');
      setAvatar(null);
      onCreated(user);
    } catch (err) {
      setError(err?.error ?? 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Criar usuário</h2>
      <label htmlFor="user-name">Nome</label>
      <input
        id="user-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
      />

      <fieldset className="avatars">
        <legend>Avatar</legend>
        {AVATAR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`avatar-option${avatar === key ? ' selected' : ''}`}
            aria-pressed={avatar === key}
            aria-label={key}
            title={key}
            onClick={() => setAvatar(key)}
          >
            {avatarEmoji(key)}
          </button>
        ))}
      </fieldset>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting}>
        Criar
      </button>
    </form>
  );
}
