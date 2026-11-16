// Config da loja (web/). Herda o .eslintrc.js da raiz (parser TS, regras base)
// e corrige o que lá é de backend: a raiz declara só `env: node`, então todo
// `window`/`document`/`navigator` da loja acusava "no-undef" — `npm run lint`
// em web/ falhava em main com 14 erros, todos falsos.
module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    // Em TypeScript quem confere identificador indefinido é o `tsc` (que roda
    // no build); o no-undef do ESLint não entende tipos globais como
    // `React.ChangeEvent` nem `RequestInit`. Recomendação do typescript-eslint.
    'no-undef': 'off',
  },
};
