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
  setupLoginThemeToggle();
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

function setupLoginThemeToggle() {
  const button = document.querySelector('.login-theme-toggle');
  if (!button) return;
  let savedTheme = 'day';
  try { savedTheme = localStorage.getItem('meu-amor-theme') || 'day'; } catch {}
  const applyTheme = (isNight) => {
    document.body.classList.toggle('night-mode', isNight);
    button.textContent = isNight ? '☀' : '☾';
    button.setAttribute('aria-label', isNight ? 'Ativar modo claro' : 'Ativar modo escuro');
  };
  applyTheme(savedTheme === 'night');
  button.addEventListener('click', () => {
    const isNight = !document.body.classList.contains('night-mode');
    try { localStorage.setItem('meu-amor-theme', isNight ? 'night' : 'day'); } catch {}
    applyTheme(isNight);
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

  const changePasswordButton = document.createElement('button');
  changePasswordButton.className = 'site-password-change';
  changePasswordButton.type = 'button';
  changePasswordButton.textContent = 'alterar senha';
  const passwordDialog = createPasswordDialog(client);
  changePasswordButton.addEventListener('click', () => passwordDialog.showModal());
  topbar.append(changePasswordButton);

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

function createPasswordDialog(client) {
  const dialog = document.createElement('dialog');
  dialog.className = 'password-change-dialog';
  dialog.setAttribute('aria-labelledby', 'password-change-title');

  const heading = document.createElement('h2');
  heading.id = 'password-change-title';
  heading.textContent = 'trocar sua senha';
  const intro = document.createElement('p');
  intro.textContent = 'Confirme a senha atual e escolha uma nova senha para esta conta.';

  const form = document.createElement('form');
  form.className = 'password-change-form';
  const fields = [
    { name: 'current-password', label: 'senha atual', autocomplete: 'current-password', minLength: 1 },
    { name: 'new-password', label: 'nova senha (mínimo 8 caracteres)', autocomplete: 'new-password', minLength: 8 },
    { name: 'confirm-password', label: 'confirme a nova senha', autocomplete: 'new-password', minLength: 8 },
  ];
  const inputs = {};
  for (const field of fields) {
    const label = document.createElement('label');
    label.htmlFor = `password-${field.name}`;
    label.textContent = field.label;
    const input = document.createElement('input');
    input.id = label.htmlFor;
    input.name = field.name;
    input.type = 'password';
    input.autocomplete = field.autocomplete;
    input.required = true;
    input.minLength = field.minLength;
    inputs[field.name] = input;
    form.append(label, input);
  }

  const status = document.createElement('p');
  status.className = 'password-change-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div');
  actions.className = 'password-change-actions';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'password-change-cancel';
  closeButton.textContent = 'cancelar';
  closeButton.addEventListener('click', () => dialog.close());
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'password-change-save';
  saveButton.textContent = 'salvar nova senha';
  actions.append(closeButton, saveButton);
  form.append(status, actions);
  dialog.append(heading, intro, form);
  document.body.append(dialog);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentPassword = inputs['current-password'].value;
    const newPassword = inputs['new-password'].value;
    if (newPassword !== inputs['confirm-password'].value) {
      status.textContent = 'as novas senhas não são iguais.';
      status.dataset.kind = 'error';
      inputs['confirm-password'].focus();
      return;
    }

    saveButton.disabled = true;
    status.textContent = 'atualizando sua senha...';
    delete status.dataset.kind;
    try {
      const { error } = await client.auth.updateUser({ password: newPassword, current_password: currentPassword });
      if (error) {
        const message = error.message.toLowerCase();
        status.textContent = message.includes('password') || message.includes('credential')
          ? 'não foi possível alterar. Confira a senha atual e os requisitos de segurança da nova senha.'
          : 'não foi possível alterar a senha agora. Tente novamente em instantes.';
        status.dataset.kind = 'error';
        return;
      }
      form.reset();
      status.textContent = 'senha alterada com sucesso ♥';
      status.dataset.kind = 'success';
    } catch {
      status.textContent = 'não foi possível alterar a senha agora. Tente novamente em instantes.';
      status.dataset.kind = 'error';
    } finally {
      saveButton.disabled = false;
    }
  });

  return dialog;
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
  window.location.replace(new URL('index.html', siteBase).href);
}

function showLoginMessage(message, isError = false) {
  const status = document.querySelector('#login-status');
  if (!status) return;
  status.textContent = message;
  if (isError) status.dataset.kind = 'error';
  else delete status.dataset.kind;
}
