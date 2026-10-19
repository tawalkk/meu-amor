import { createClient } from '@supabase/supabase-js';

const config = window.MeuAmorSupabaseConfig;
const isLoginPage = document.body.classList.contains('login-page');
const pagePath = window.location.pathname;
const pagesIndex = pagePath.indexOf('/pages/');
const siteBasePath = pagesIndex >= 0
  ? pagePath.slice(0, pagesIndex + 1)
  : pagePath.endsWith('/') ? pagePath : pagePath.slice(0, pagePath.lastIndexOf('/') + 1);
const siteBase = new URL(siteBasePath, window.location.origin);

if (!config?.url || !config?.anonKey) {
  if (isLoginPage) {
    showLoginMessage('A conexão ainda não está configurada. Tente novamente mais tarde.', true);
  } else {
    redirectToLogin();
  }
} else {
  const client = createClient(config.url, config.anonKey);
  window.MeuAmorAuth = client;
  if (isLoginPage) setupLoginPage(client);
  else protectSitePage(client);
}

function setupLoginPage(client) {
  const form = document.querySelector('#site-login-form');
  const submit = form.querySelector('button[type="submit"]');

  client.auth.getSession().then(({ data, error }) => {
    if (error) showLoginMessage(`não consegui verificar o acesso: ${error.message}`, true);
    if (data.session) redirectAfterLogin();
    else document.documentElement.classList.remove('auth-pending');
  }).catch((error) => {
    showLoginMessage(`não consegui verificar o acesso: ${error.message}`, true);
    document.documentElement.classList.remove('auth-pending');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = form.elements.username.value.trim().toLowerCase();
    const password = form.elements.password.value;
    if (!username) {
      showLoginMessage('digite seu usuário.', true);
      return;
    }
    submit.disabled = true;
    showLoginMessage('entrando no nosso cantinho...');
    try {
      const { data: email, error: lookupError } = await client.rpc('resolve_couple_login', {
        p_username: username,
      });
      if (lookupError) {
        if (lookupError.code === 'PGRST202' || lookupError.code === '42883') {
          showLoginMessage('a tabela de login ainda não está pronta. Execute novamente o arquivo supabase/setup.sql no Supabase.', true);
        } else {
          showLoginMessage(`não consegui consultar o usuário (${lookupError.status ?? 'sem status'}): ${lookupError.message}`, true);
        }
        return;
      }
      if (typeof email !== 'string' || !email) {
        showLoginMessage('usuário não encontrado. Confira se a conta foi criada e incluída na tabela de membros do Supabase.', true);
        return;
      }
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('invalid login credentials')) {
          showLoginMessage('usuário ou senha não conferem. Confira se a conta existe no Supabase e use a senha definida para ela.', true);
        } else if (message.includes('email not confirmed')) {
          showLoginMessage('esta conta ainda não foi confirmada. Marque o e-mail como confirmado em Authentication → Users no Supabase.', true);
        } else {
          showLoginMessage(`falha ao entrar (${error.status ?? 'sem status'}): ${error.message}`, true);
        }
        return;
      }
      redirectAfterLogin();
    } catch (error) {
      showLoginMessage(`não consegui entrar: ${error.message}`, true);
    } finally {
      submit.disabled = false;
    }
  });
}

function protectSitePage(client) {
  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      redirectToLogin();
      return;
    }
    if (!data.session) {
      redirectToLogin();
      return;
    }
    document.documentElement.classList.remove('auth-pending');
    addSignOutButton(client);
  }).catch(() => {
    redirectToLogin();
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) redirectToLogin();
  });
}

function addSignOutButton(client) {
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.site-signout')) return;
  const button = document.createElement('button');
  button.className = 'site-signout';
  button.type = 'button';
  button.textContent = 'sair';
  button.addEventListener('click', async () => {
    button.disabled = true;
    const { error } = await client.auth.signOut();
    if (error) {
      button.disabled = false;
      window.alert(`Não consegui encerrar a sessão: ${error.message}`);
    }
  });
  topbar.append(button);
}

function redirectToLogin() {
  const loginUrl = new URL('pages/login.html', siteBase);
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (window.location.pathname === loginUrl.pathname) {
    document.documentElement.classList.remove('auth-pending');
    return;
  }
  loginUrl.searchParams.set('returnTo', currentPath);
  window.location.replace(loginUrl.href);
}

function redirectAfterLogin() {
  const defaultUrl = siteBase;
  const requested = new URLSearchParams(window.location.search).get('returnTo');
  if (requested) {
    const target = new URL(requested, window.location.origin);
    if (target.origin === window.location.origin && target.pathname.startsWith(defaultUrl.pathname)) {
      window.location.replace(target.href);
      return;
    }
  }
  window.location.replace(defaultUrl.href);
}

function showLoginMessage(message, isError = false) {
  const status = document.querySelector('#login-status');
  if (!status) return;
  status.textContent = message;
  if (isError) status.dataset.kind = 'error';
  else delete status.dataset.kind;
}
