import { useEffect, useState } from 'react';
import { listUserLinks, listUsers } from './api/index.js';
import { clearActiveUserId, getActiveUserId, setActiveUserId } from './activeUser.js';
import CreateUserForm from './components/CreateUserForm.jsx';
import UserPicker from './components/UserPicker.jsx';
import ShortenForm from './components/ShortenForm.jsx';
import LinkHistory from './components/LinkHistory.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

export default function App() {
  const [users, setUsers] = useState([]);
  const [activeUserId, setActive] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
        const stored = getActiveUserId();
        if (stored !== null && list.some((u) => u.id === stored)) {
          setActive(stored);
        } else {
          clearActiveUserId();
          setActive(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.error ?? 'Erro ao carregar usuários');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Histórico: recarrega sempre que o usuário ativo muda.
  useEffect(() => {
    setLinks([]);
    setLinksError('');
    if (activeUserId === null) {
      setLinksLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLinksLoading(true);
    listUserLinks(activeUserId)
      .then((list) => {
        if (!cancelled) setLinks(list);
      })
      .catch((err) => {
        if (!cancelled) setLinksError(err?.error ?? 'Erro ao carregar o histórico');
      })
      .finally(() => {
        if (!cancelled) setLinksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  // Link recém-criado entra no topo, sem novo pedido à API.
  function handleLinkCreated(link) {
    if (link.userId !== activeUserId) return;
    setLinks((prev) => [link, ...prev.filter((l) => l.id !== link.id)]);
  }

  function selectUser(id) {
    setActiveUserId(id);
    setActive(id);
  }

  function handleCreated(user) {
    setUsers((prev) => [...prev, user]);
    selectUser(user.id);
  }

  return (
    <main className="container">
      <header className="app-header">
        <h1>Encurtador de Links</h1>
        <ThemeToggle />
      </header>
      {loadError && (
        <p role="alert" className="error">
          {loadError}
        </p>
      )}
      <CreateUserForm onCreated={handleCreated} />
      <UserPicker users={users} activeUserId={activeUserId} onSelect={selectUser} />
      {/* key: ao trocar de usuário ativo, o formulário recomeça limpo */}
      <ShortenForm key={activeUserId ?? 'none'} activeUserId={activeUserId} onCreated={handleLinkCreated} />
      <LinkHistory activeUserId={activeUserId} links={links} loading={linksLoading} error={linksError} />
    </main>
  );
}
