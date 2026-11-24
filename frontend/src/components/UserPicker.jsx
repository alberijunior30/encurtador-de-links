import { avatarEmoji } from '../avatars.js';

export default function UserPicker({ users, activeUserId, onSelect }) {
  return (
    <section className="card">
      <h2>Escolher usuário</h2>
      {users.length === 0 ? (
        <p>Nenhum usuário ainda. Crie o primeiro acima.</p>
      ) : (
        <ul className="user-list">
          {users.map((user) => {
            const active = user.id === activeUserId;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  className={`user-item${active ? ' active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onSelect(user.id)}
                >
                  <span className="user-avatar" aria-hidden="true">
                    {avatarEmoji(user.avatar)}
                  </span>
                  <span className="user-name">{user.name}</span>
                  {active && <span className="badge">ativo</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
