import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  canEditCatalog,
  fetchProfile,
  getToken,
  logout,
  SessionExpiredError,
  type AdminUser,
} from '../../lib/admin-api';
import { ErrorState } from '../../components/States';

interface AdminSessionValue {
  user: AdminUser;
  signOut: () => void;
  /** Encaminha erro de sessão vencida para o login; devolve a mensagem dos demais. */
  handleError: (error: unknown) => string;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error('useAdminSession fora da área do lojista');
  return value;
}

export function loginPath(next: string): string {
  return `/admin/login?next=${encodeURIComponent(next)}`;
}

/**
 * Guarda das rotas `/admin/*`.
 *
 * O papel vem do `/auth/profile` a cada entrada (a API relê o usuário do
 * banco), não do que foi guardado no login: papel retirado vale na hora.
 */
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const here = location.pathname + location.search;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const hasToken = Boolean(getToken());

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    fetchProfile()
      .then((profile) => !cancelled && setUser(profile))
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof SessionExpiredError) {
          navigate(loginPath(here), { replace: true, state: { expired: true } });
        } else {
          setFailure(error instanceof Error ? error.message : 'Erro inesperado.');
        }
      });
    return () => {
      cancelled = true;
    };
    // Só na entrada da área: trocar de tela lá dentro não relê o perfil.
  }, [hasToken]);

  const signOut = useCallback(() => {
    logout();
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof SessionExpiredError) {
        navigate(loginPath(window.location.pathname), {
          replace: true,
          state: { expired: true },
        });
        return error.message;
      }
      return error instanceof Error ? error.message : 'Erro inesperado.';
    },
    [navigate],
  );

  if (!hasToken) return <Navigate to={loginPath(here)} replace />;
  if (failure) return <ErrorState message={failure} onRetry={() => window.location.reload()} />;
  if (!user) {
    return <p className="py-16 text-center text-sm text-zinc-500">Conferindo sua sessão…</p>;
  }

  return (
    <AdminSessionContext.Provider value={{ user, signOut, handleError }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <Link to="/admin" className="text-xl font-bold text-zinc-900">
            Área do lojista
          </Link>
          <p className="text-sm text-zinc-500">
            {user.name} · {user.email}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Sair
        </button>
      </div>

      {canEditCatalog(user) ? (
        <Outlet />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="font-medium text-amber-900">Sua conta não tem acesso ao catálogo.</p>
          <p className="mt-1 text-sm text-amber-800">
            Peça a um administrador para liberar o acesso, e entre de novo depois.
          </p>
        </div>
      )}
    </AdminSessionContext.Provider>
  );
}
