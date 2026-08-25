import { Link, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { ChatPanel } from './components/ChatPanel';

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-zinc-900">
            Gwan <span className="text-brand-600">Mart</span>
          </Link>
          <nav className="flex gap-5 text-sm font-medium text-zinc-600">
            <Link to="/" className="transition hover:text-brand-700">
              Início
            </Link>
            <Link to="/catalog" className="transition hover:text-brand-700">
              Catálogo
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          {/* Mesma rota que o backend monta em buildProductUrl(). */}
          <Route path="/product/:code" element={<ProductPage />} />
          <Route
            path="*"
            element={
              <div className="py-16 text-center">
                <p className="text-lg font-medium text-zinc-800">
                  Página não encontrada
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white transition hover:bg-zinc-700"
                >
                  Voltar ao início
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-zinc-500">
          Gwan Mart — parte do ecossistema{' '}
          <a
            href="https://gwan.cloud"
            className="font-medium text-zinc-700 hover:underline"
          >
            gwan.cloud
          </a>
        </div>
      </footer>

      <ChatPanel />
    </div>
  );
}
