import { useEffect, useRef, useState } from 'react';
import { ApiError, sendChatMessage } from '../lib/api';
import { ChatMarkdown } from './ChatMarkdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Quais produtos vocês têm?',
  'Me mostre os tablets',
  'Qual o mais barato?',
];

/**
 * Assistente do Mart.
 *
 * A sessão (`sessionId`) devolvida na primeira resposta é reenviada nas
 * seguintes: sem ela, cada mensagem começaria uma conversa nova e o bot perderia
 * o contexto do que já foi perguntado.
 */
export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function submit(text: string) {
    const question = text.trim();
    if (!question || sending) return;

    setInput('');
    setError(null);
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setSending(true);

    try {
      const reply = await sendChatMessage(question, sessionId);
      if (reply.sessionId) setSessionId(reply.sessionId);
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: reply.answer },
      ]);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Falha inesperada ao falar com o assistente.',
      );
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-brand-600 px-5 py-3 font-medium text-white shadow-lg transition hover:bg-brand-700"
      >
        Falar com o assistente
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div>
          <p className="font-semibold text-zinc-900">Assistente Gwan Mart</p>
          <p className="text-xs text-zinc-500">Pergunte sobre o catálogo</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar assistente"
          className="rounded-lg px-2 py-1 text-zinc-500 transition hover:bg-zinc-200"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              O assistente consulta o catálogo real. Experimente:
            </p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void submit(suggestion)}
                className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 transition hover:border-brand-500 hover:bg-brand-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white'
                : 'mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800'
            }
          >
            {message.role === 'assistant' ? (
              <ChatMarkdown content={message.content} />
            ) : (
              message.content
            )}
          </div>
        ))}

        {sending && (
          <p className="mr-auto rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
            Consultando o catálogo…
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
        className="flex gap-2 border-t border-zinc-200 p-3"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Digite sua pergunta"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={sending || input.trim().length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Enviar
        </button>
      </form>
    </aside>
  );
}
