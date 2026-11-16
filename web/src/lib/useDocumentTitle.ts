import { useEffect } from 'react';

export const SITE_NAME = 'Gwan Mart';

/**
 * Título da aba por página: "<título> | Gwan Mart", ou só "Gwan Mart" sem
 * título (home). É o título da ABA — o da prévia de link (WhatsApp) é montado
 * no servidor, porque quem monta a prévia não executa JavaScript. Os dois saem
 * do mesmo nome de produto. Ver openspec/changes/add-storefront-seo/design.md.
 */
export function pageTitle(title?: string | null): string {
  const trimmed = title?.trim();
  return trimmed ? `${trimmed} | ${SITE_NAME}` : SITE_NAME;
}

export function useDocumentTitle(title?: string | null): void {
  const value = pageTitle(title);
  useEffect(() => {
    document.title = value;
  }, [value]);
}
