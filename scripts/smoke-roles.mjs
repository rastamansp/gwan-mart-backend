#!/usr/bin/env node
// Smoke da change lock-role-assignment (issue #14): repete, contra a API real,
// a sonda que achou o buraco — qualquer pessoa conseguia virar ADMIN — e
// confere cada cenário de openspec/changes/lock-role-assignment/specs.
//
// Depende do ValidationPipe, dos guards e do banco juntos, que é exatamente o
// que um teste unitário não cobre.
//
// Uso:
//   MART_ADMIN_EMAIL=... MART_ADMIN_PASSWORD=... node scripts/smoke-roles.mjs
//   MART_API=http://localhost:3011/api   (default)
//
// O ADMIN vem de `npm run admin:create`. O script cria usuários com e-mail
// `smoke-roles-<n>-<ts>@test.local` e apaga todos ao final, inclusive em falha.
// Sem dependências: só o fetch do Node 18+.

const API = (process.env.MART_API || 'http://localhost:3011/api').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.MART_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MART_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Defina MART_ADMIN_EMAIL e MART_ADMIN_PASSWORD (um usuário ADMIN existente).');
  process.exit(2);
}

const TS = Date.now();
const SENHA = 'smoke-roles-senha-123';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const PRODUTO_INEXISTENTE = 2147480000;

const criados = new Set();
let falhas = 0;
let total = 0;
let passou = 0;

async function req(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, body: json, text };
}

function check(nome, ok, detalhe = '') {
  total += 1;
  if (ok) {
    passou += 1;
    console.log(`ok    ${nome}`);
  } else {
    falhas += 1;
    console.log(`FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  }
}

function status(r, esperado) {
  const lista = Array.isArray(esperado) ? esperado : [esperado];
  return [lista.includes(r.status), `HTTP ${r.status} (esperado ${lista.join('/')}) ${r.text.slice(0, 160)}`];
}

function email(n) {
  return `smoke-roles-${n}-${TS}@test.local`;
}

async function login(e, senha) {
  const r = await req('POST', '/auth/login', { body: { email: e, password: senha } });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`login de ${e} falhou: HTTP ${r.status} ${r.text.slice(0, 200)}`);
  }
  return r.body.access_token;
}

async function cadastrar(n) {
  const r = await req('POST', '/auth/register', {
    body: { name: `Smoke ${n}`, email: email(n), password: SENHA, phone: '11999990000' },
  });
  if (r.status !== 201) {
    throw new Error(`cadastro de ${email(n)} falhou: HTTP ${r.status} ${r.text.slice(0, 200)}`);
  }
  criados.add(r.body.id);
  const token = await login(email(n), SENHA);
  return { id: r.body.id, token, cadastro: r.body };
}

async function main() {
  console.log(`API: ${API}`);
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const perfilAdmin = await req('GET', '/auth/profile', { token: admin });
  if (perfilAdmin.body?.role !== 'ADMIN') {
    throw new Error(`${ADMIN_EMAIL} não é ADMIN (papel: ${perfilAdmin.body?.role}). Confira o npm run admin:create.`);
  }

  // --- Requirement: Cadastro público não define papel
  {
    const e = email('papel-admin');
    const r = await req('POST', '/auth/register', {
      body: { name: 'Smoke', email: e, password: SENHA, role: 'ADMIN' },
    });
    if (r.body?.id) criados.add(r.body.id);
    check('cadastro com papel ADMIN responde 400', ...status(r, 400));
    // Conferido pela lista do ADMIN, e não por login: login com credencial
    // inválida responde 500 hoje (defeito à parte do LoginUserUseCase).
    const todos = await req('GET', '/users', { token: admin });
    check(
      'cadastro com papel ADMIN não cria usuário',
      Array.isArray(todos.body) && !todos.body.some((u) => u.email === e),
      `lista HTTP ${todos.status}`,
    );

    const rUser = await req('POST', '/auth/register', {
      body: { name: 'Smoke', email: email('papel-user'), password: SENHA, role: 'USER' },
    });
    if (rUser.body?.id) criados.add(rUser.body.id);
    check('cadastro com papel USER explícito também responde 400', ...status(rUser, 400));
  }

  const a = await cadastrar('a');
  const b = await cadastrar('b');
  check('cadastro sem papel cria usuário USER', a.cadastro.role === 'USER', `papel ${a.cadastro.role}`);

  // --- Requirement: Papel só muda pela promoção feita por administrador
  {
    const r = await req('PUT', `/users/${a.id}`, { token: a.token, body: { role: 'ADMIN' } });
    check('usuário editando o próprio papel responde 400', ...status(r, 400));
    const p = await req('GET', '/auth/profile', { token: a.token });
    check('papel continua USER depois da tentativa', p.body?.role === 'USER', `papel ${p.body?.role}`);

    const rAdm = await req('PUT', `/users/${a.id}`, { token: admin, body: { role: 'CORRETOR' } });
    check('ADMIN editando papel pelo PUT /users/:id responde 400', ...status(rAdm, 400));

    const rNome = await req('PUT', `/users/${a.id}`, {
      token: admin,
      body: { name: 'Smoke A', role: 'ADMIN' },
    });
    check('edição com papel não grava nem os outros campos', rNome.status === 400, `HTTP ${rNome.status}`);
    const depois = await req('GET', `/users/${a.id}`, { token: admin });
    check('papel do alvo intacto após edições recusadas', depois.body?.role === 'USER', `papel ${depois.body?.role}`);

    const self = await req('PUT', `/users/${a.id}/promote`, { token: a.token, body: { targetRole: 'ADMIN' } });
    check('usuário comum se promovendo responde 403', ...status(self, 403));
    const outro = await req('PUT', `/users/${b.id}/promote`, { token: a.token, body: { targetRole: 'ADMIN' } });
    check('usuário comum promovendo outro responde 403', ...status(outro, 403));
    const bDepois = await req('GET', `/users/${b.id}`, { token: admin });
    check('nenhum papel alterado pelas promoções recusadas', bDepois.body?.role === 'USER', `papel ${bDepois.body?.role}`);
  }

  // --- Requirement: Usuário acessa apenas o próprio cadastro
  {
    check('usuário comum lista usuários: 403', ...status(await req('GET', '/users', { token: a.token }), 403));
    const lista = await req('GET', '/users', { token: a.token });
    check('403 da lista não devolve dado de usuário', !Array.isArray(lista.body) && !lista.text.includes('@test.local'));

    check('usuário comum lê outro usuário: 403', ...status(await req('GET', `/users/${b.id}`, { token: a.token }), 403));
    check(
      'usuário comum lê id inexistente: 403 (não revela existência)',
      ...status(await req('GET', `/users/${UUID_INEXISTENTE}`, { token: a.token }), 403),
    );
    const proprio = await req('GET', `/users/${a.id}`, { token: a.token });
    check('usuário comum lê o próprio cadastro: 200', ...status(proprio, 200));

    const edit = await req('PUT', `/users/${a.id}`, {
      token: a.token,
      body: { name: 'Smoke A editado', phone: '11988887777' },
    });
    check(
      'usuário comum edita o próprio nome e telefone',
      edit.status === 200 && edit.body?.name === 'Smoke A editado' && edit.body?.phone === '11988887777',
      `HTTP ${edit.status} ${edit.text.slice(0, 160)}`,
    );
    check(
      'usuário comum edita outro usuário: 403',
      ...status(await req('PUT', `/users/${b.id}`, { token: a.token, body: { name: 'invasor' } }), 403),
    );

    check('usuário comum apaga alguém: 403', ...status(await req('DELETE', `/users/${b.id}`, { token: a.token }), 403));
    check('usuário comum apaga a si mesmo: 403', ...status(await req('DELETE', `/users/${a.id}`, { token: a.token }), 403));
    const bExiste = await req('GET', `/users/${b.id}`, { token: admin });
    check('usuário continua existindo após DELETE recusado', ...status(bExiste, 200));

    const listaAdm = await req('GET', '/users', { token: admin });
    check('ADMIN lista usuários: 200', ...status(listaAdm, 200));
    const vaza = Array.isArray(listaAdm.body) && listaAdm.body.some((u) => 'password' in u || /\$2[aby]\$/.test(JSON.stringify(u)));
    check('lista do ADMIN sem senha nem hash', Array.isArray(listaAdm.body) && !vaza);

    check('sem credencial, GET /users: 401', ...status(await req('GET', '/users'), 401));
    check('sem credencial, GET /users/:id: 401', ...status(await req('GET', `/users/${a.id}`), 401));
    check('sem credencial, PUT /users/:id: 401', ...status(await req('PUT', `/users/${a.id}`, { body: { name: 'x' } }), 401));
    check('sem credencial, DELETE /users/:id: 401', ...status(await req('DELETE', `/users/${a.id}`), 401));
  }

  // --- Requirement: Área administrativa exige papel administrativo
  {
    check('usuário comum no dashboard admin: 403', ...status(await req('GET', '/admin/dashboard', { token: a.token }), 403));
    check(
      'usuário comum em /admin/users/:id/analytics: 403',
      ...status(await req('GET', `/admin/users/${a.id}/analytics`, { token: a.token }), 403),
    );
    check('sem credencial no dashboard admin: 401', ...status(await req('GET', '/admin/dashboard'), 401));
    check('ADMIN no dashboard: 200', ...status(await req('GET', '/admin/dashboard', { token: admin }), 200));
    check(
      'ADMIN em /admin/users/:id/analytics: 200',
      ...status(await req('GET', `/admin/users/${a.id}/analytics`, { token: admin }), 200),
    );
  }

  // --- Requirement: Papel é avaliado pelo estado atual do usuário
  {
    const c = await cadastrar('c');
    check('antes da promoção, token de C não abre o dashboard', ...status(await req('GET', '/admin/dashboard', { token: c.token }), 403));
    const prom = await req('PUT', `/users/${c.id}/promote`, { token: admin, body: { targetRole: 'ADMIN' } });
    check('ADMIN promove usuário comum', prom.status === 200 && prom.body?.role === 'ADMIN', `HTTP ${prom.status} ${prom.text.slice(0, 160)}`);
    check('resposta da promoção sem senha nem hash', !!prom.body && !('password' in prom.body) && !/\$2[aby]\$/.test(prom.text));
    check(
      'mesmo token de antes da promoção já abre o dashboard',
      ...status(await req('GET', '/admin/dashboard', { token: c.token }), 200),
    );
  }

  // --- Requirement: Usuário inexistente responde 404
  {
    check('ADMIN lê usuário inexistente: 404', ...status(await req('GET', `/users/${UUID_INEXISTENTE}`, { token: admin }), 404));
    check(
      'ADMIN edita usuário inexistente: 404',
      ...status(await req('PUT', `/users/${UUID_INEXISTENTE}`, { token: admin, body: { name: 'x' } }), 404),
    );
    check('ADMIN apaga usuário inexistente: 404', ...status(await req('DELETE', `/users/${UUID_INEXISTENTE}`, { token: admin }), 404));
    check('ADMIN com id que não é UUID: 400, não 500', ...status(await req('GET', '/users/nao-e-uuid', { token: admin }), 400));
  }

  // --- Regressão (task 5.2): login, perfil, escrita de catálogo por ADMIN e vitrine anônima
  {
    const perfil = await req('GET', '/auth/profile', { token: a.token });
    check('regressão: GET /auth/profile do usuário logado', perfil.status === 200 && perfil.body?.id === a.id, `HTTP ${perfil.status}`);

    // Escrita de catálogo sem deixar resíduo: um id que não existe passa pelo
    // guard do catálogo e chega ao handler (404); usuário comum para no guard (403).
    check(
      'regressão: ADMIN passa pelo guard de escrita do catálogo (PUT → 404 do handler)',
      ...status(await req('PUT', `/products/${PRODUTO_INEXISTENTE}`, { token: admin, body: { name: 'x' } }), 404),
    );
    check(
      'regressão: ADMIN passa pelo guard de exclusão do catálogo (DELETE → 404 do handler)',
      ...status(await req('DELETE', `/products/${PRODUTO_INEXISTENTE}`, { token: admin }), 404),
    );
    check(
      'regressão: usuário comum barrado na escrita do catálogo (403)',
      ...status(await req('PUT', `/products/${PRODUTO_INEXISTENTE}`, { token: a.token, body: { name: 'x' } }), 403),
    );

    const produtos = await req('GET', '/products?limit=1');
    check('regressão: vitrine anônima GET /products', ...status(produtos, 200));
    check('regressão: vitrine anônima GET /products/featured', ...status(await req('GET', '/products/featured'), 200));
    const lista = produtos.body?.data?.products || produtos.body?.data || [];
    const codigo = Array.isArray(lista) && lista[0]?.code;
    if (codigo) {
      check(
        `regressão: vitrine anônima GET /products/${codigo}`,
        ...status(await req('GET', `/products/${encodeURIComponent(codigo)}`), 200),
      );
    } else {
      console.log('pula  regressão: GET /products/:code — catálogo vazio');
    }
    // O chat depende de chave de LLM no ambiente; o que se confere aqui é só que
    // continua público (não pede credencial nem papel).
    const chat = await req('POST', '/chat', { body: { message: 'oi' } });
    check('regressão: POST /chat continua público (nem 401 nem 403)', ![401, 403].includes(chat.status), `HTTP ${chat.status}`);
    if (chat.status >= 500) {
      console.log(`aviso POST /chat respondeu ${chat.status} — ver chave de LLM do ambiente, não é papel`);
    }
  }
}

async function limpar() {
  if (criados.size === 0) return;
  try {
    const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    // Também recolhe o que um cadastro indevido possa ter criado sem devolver id.
    const lista = await req('GET', '/users', { token: admin });
    if (Array.isArray(lista.body)) {
      for (const u of lista.body) {
        if (u.email?.startsWith('smoke-roles-') && u.email.endsWith(`-${TS}@test.local`)) criados.add(u.id);
      }
    }
    for (const id of criados) {
      const r = await req('DELETE', `/users/${id}`, { token: admin });
      if (r.status !== 200 && r.status !== 404) {
        console.log(`aviso não apagou ${id}: HTTP ${r.status}`);
      }
    }
    console.log(`limpeza: ${criados.size} usuário(s) de teste removido(s)`);
  } catch (e) {
    console.log(`aviso limpeza falhou: ${e.message}`);
  }
}

main()
  .catch((e) => {
    falhas += 1;
    console.log(`FALHA erro inesperado — ${e.message}`);
  })
  .finally(async () => {
    await limpar();
    console.log(`\n${passou}/${total} verificações ok${falhas ? `, ${falhas} falha(s)` : ''}`);
    process.exit(falhas ? 1 : 0);
  });
