import { useEffect, useState } from 'react';

export type NoticeKind = 'success' | 'error';

export interface NoticeState {
  kind: NoticeKind;
  message: string;
}

/**
 * Aviso temporário (cópia de link, falha de compartilhamento).
 *
 * Uma dependência de toast a menos: a loja precisa de uma mensagem que aparece e
 * some, não de um sistema de notificações.
 */
export function useNotice(timeoutMs = 3500) {
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), timeoutMs);
    return () => clearTimeout(timer);
  }, [notice, timeoutMs]);

  return {
    notice,
    notify: (kind: NoticeKind, message: string) => setNotice({ kind, message }),
  };
}

export function Notice({ notice }: { notice: NoticeState | null }) {
  if (!notice) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
        notice.kind === 'success'
          ? 'bg-zinc-900 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {notice.message}
    </div>
  );
}
