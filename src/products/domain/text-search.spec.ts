import {
  ACCENTED_CHARS,
  MAX_SEARCH_TOKENS,
  PLAIN_CHARS,
  escapeLikePattern,
  normalizeSearchText,
  searchTokens,
} from './text-search';

describe('normalização da busca textual', () => {
  it('as duas tabelas do translate() têm o mesmo tamanho', () => {
    // translate() descarta o caractere que não tem par: tabela desalinhada
    // apagaria letras em vez de tirar o acento.
    expect([...ACCENTED_CHARS]).toHaveLength([...PLAIN_CHARS].length);
  });

  it('tira acento e caixa', () => {
    expect(normalizeSearchText('  Café com AÇÚCAR  ')).toBe('cafe com acucar');
    expect(normalizeSearchText('Pão de Ló')).toBe('pao de lo');
  });

  it('quebra a frase em palavras, sem as curtas e sem repetir', () => {
    expect(searchTokens('Fone de ouvido Bluetooth, fone')).toEqual([
      'fone',
      'ouvido',
      'bluetooth',
    ]);
    expect(searchTokens('quero um fone sem fio')).toEqual([
      'quero',
      'fone',
      'sem',
      'fio',
    ]);
  });

  it('mantém palavras curtas quando são tudo o que há', () => {
    expect(searchTokens('TV')).toEqual(['tv']);
    expect(searchTokens('   ')).toEqual([]);
  });

  it('limita a quantidade de palavras', () => {
    expect(
      searchTokens('aaa bbb ccc ddd eee fff ggg hhh iii jjj'),
    ).toHaveLength(MAX_SEARCH_TOKENS);
  });

  it('escapa os curingas do LIKE', () => {
    expect(escapeLikePattern('100%_ok\\')).toBe('100\\%\\_ok\\\\');
  });
});
