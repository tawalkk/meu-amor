import { createClient } from '@supabase/supabase-js';

const config = window.MeuAmorSupabaseConfig;
const coupleSpace = document.querySelector('#couple-space');
if (!coupleSpace) {
  // Interaction UI is only needed on the home and shared-moments pages.
} else if (!config?.url || !config?.anonKey) {
  coupleSpace.innerHTML = `
    <section class="couple-panel">
      <p class="eyebrow"><span>♡</span> nosso cantinho a dois</p>
      <h2>um carinho de cada celular</h2>
      <p class="couple-status" role="status">A conexão privada ainda precisa ser configurada para sincronizar recadinhos e fotos entre vocês.</p>
    </section>`;
} else {
  startCoupleSpace();
}

function startCoupleSpace() {
  const client = createClient(config.url, config.anonKey);
  const root = coupleSpace;
  const isMomentsPage = Boolean(document.querySelector('.photo-grid'));
  root.innerHTML = `
    <section class="couple-panel">
      <div class="couple-heading">
        <div>
          <p class="eyebrow"><span>♡</span> nosso cantinho a dois</p>
          <h2>um carinho de cada celular</h2>
        </div>
        <span class="couple-heading-heart" aria-hidden="true">♥</span>
      </div>
      <p class="couple-status" data-status role="status" aria-live="polite">conectando ao nosso cantinho...</p>
      <div class="couple-auth" data-auth></div>
      <div class="couple-private" data-private hidden>
        <div class="couple-account"><span data-account></span></div>
        <form class="couple-message-form" data-message-form>
          <label for="couple-message">mande um carinho para aparecer no celular dela</label>
          <div class="couple-message-controls">
            <input id="couple-message" name="message" maxlength="300" placeholder="estou pensando em você..." required />
            <button class="couple-button" type="submit">enviar ♥</button>
          </div>
          <button class="couple-heart-button" type="button" data-send-heart>mandar um coração agora ♥</button>
        </form>
        <div class="couple-feed-wrap">
          <h3>carinhos de vocês</h3>
          <ol class="couple-feed" data-feed aria-live="polite"></ol>
        </div>
        ${isMomentsPage ? `
          <form class="couple-photo-form" data-photo-form>
            <h3>guardar um momento de vocês</h3>
            <label for="couple-photo">escolha uma foto para adicionar automaticamente ao álbum</label>
            <input id="couple-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
            <label for="couple-caption">legenda (opcional)</label>
            <input id="couple-caption" name="caption" maxlength="120" placeholder="um dia muito especial..." />
            <button class="couple-button" type="submit">adicionar aos nossos momentos ✦</button>
          </form>` : `
          <a class="couple-moments-link" href="pages/momentos.html">adicionar fotos em nossos momentos ↗</a>`}
      </div>
    </section>`;

  const status = root.querySelector('[data-status]');
  const authRegion = root.querySelector('[data-auth]');
  const privateRegion = root.querySelector('[data-private]');
  const feed = root.querySelector('[data-feed]');
  let currentUser = null;
  let realtimeChannel = null;
  let handlingSession = false;

  const showStatus = (message, type = 'info') => {
    status.textContent = message;
    status.dataset.kind = type;
  };

  const showLogin = () => {
    privateRegion.hidden = true;
    authRegion.innerHTML = `
      <form class="couple-login-form" data-login-form>
        <label for="couple-email">seu e-mail</label>
        <input id="couple-email" name="email" type="email" autocomplete="email" required />
        <label for="couple-password">senha (mínimo 8 caracteres)</label>
        <input id="couple-password" name="password" type="password" minlength="8" autocomplete="current-password" required />
        <div class="couple-auth-buttons">
          <button class="couple-button" type="submit">entrar</button>
          <button class="couple-outline-button" type="button" data-signup>criar minha conta</button>
        </div>
      </form>`;

    authRegion.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      showStatus('entrando no cantinho de vocês...');
      const { error } = await client.auth.signInWithPassword({
        email: form.get('email').trim(),
        password: form.get('password'),
      });
      if (error) showStatus(authErrorMessage(error), 'error');
    });

    authRegion.querySelector('[data-signup]').addEventListener('click', async () => {
      const form = authRegion.querySelector('[data-login-form]');
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      showStatus('criando sua conta...');
      const { data, error } = await client.auth.signUp({
        email: values.get('email').trim(),
        password: values.get('password'),
      });
      if (error) {
        showStatus(authErrorMessage(error), 'error');
      } else if (!data.session) {
        showStatus('conta criada! confirme seu e-mail pelo link que enviamos e depois entre por aqui.');
      }
    });
  };

  const loadMessages = async () => {
    const { data, error } = await client
      .from('couple_messages')
      .select('id,sender_id,message,created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      showStatus(`não consegui carregar os recadinhos: ${error.message}`, 'error');
      return;
    }
    feed.replaceChildren();
    if (!data.length) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'couple-feed-empty';
      emptyMessage.textContent = 'o primeiro carinho de vocês pode aparecer aqui ♥';
      feed.append(emptyMessage);
      return;
    }
    for (const message of data) {
      const item = document.createElement('li');
      item.className = `couple-feed-item${message.sender_id === currentUser.id ? ' is-mine' : ''}`;
      const sender = document.createElement('strong');
      sender.textContent = message.sender_id === currentUser.id ? 'você' : 'seu amor';
      const content = document.createElement('p');
      content.textContent = message.message;
      const time = document.createElement('time');
      time.dateTime = message.created_at;
      time.textContent = new Date(message.created_at).toLocaleString('pt-BR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      item.append(sender, content, time);
      feed.append(item);
    }
  };

  const loadPhotos = async () => {
    const gallery = document.querySelector('.photo-grid');
    if (!gallery) return;
    const { data, error } = await client
      .from('couple_photos')
      .select('id,object_path,caption,sender_id,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      showStatus(`não consegui carregar as fotos compartilhadas: ${error.message}`, 'error');
      return;
    }
    gallery.querySelectorAll('[data-shared-photo]').forEach((photo) => photo.remove());
    for (const [index, photo] of data.entries()) {
      const { data: image, error: imageError } = await client.storage
        .from('couple-moments')
        .createSignedUrl(photo.object_path, 3600);
      if (imageError) {
        showStatus(`não consegui abrir uma foto compartilhada: ${imageError.message}`, 'error');
        continue;
      }
      const card = document.createElement('article');
      card.className = `memory ${['memory-pink', 'memory-yellow', 'memory-blue'][index % 3]}`;
      card.dataset.sharedPhoto = 'true';
      const placeholder = document.createElement('div');
      placeholder.className = 'photo-placeholder';
      const imageElement = document.createElement('img');
      imageElement.src = image.signedUrl;
      imageElement.alt = photo.caption || 'Lembrança compartilhada do casal';
      placeholder.append(imageElement);
      const caption = document.createElement('div');
      caption.className = 'memory-caption';
      const title = document.createElement('strong');
      title.textContent = photo.caption || 'um momento nosso';
      const subtitle = document.createElement('span');
      subtitle.textContent = photo.sender_id === currentUser.id ? 'adicionado por você' : 'adicionado pelo seu amor';
      caption.append(title, subtitle);
      card.append(placeholder, caption);
      gallery.append(card);
    }
  };

  const refreshSharedContent = async () => {
    await Promise.all([loadMessages(), loadPhotos()]);
  };

  const activateMember = async () => {
    const { data, error } = await client.rpc('is_couple_member');
    if (error) {
      showStatus(`a configuração privada ainda não está completa: ${error.message}`, 'error');
      return;
    }
    if (!data) {
      showStatus('sua conta está criada, mas ainda não foi liberada para o cantinho privado. Siga a etapa de liberar as duas contas no guia do Supabase.', 'error');
      return;
    }

    privateRegion.hidden = false;
    root.querySelector('[data-account]').textContent = `conectado como ${currentUser.email}`;
    showStatus('cantinho conectado — recados e novas fotos sincronizam entre vocês.');
    await refreshSharedContent();
    realtimeChannel = client
      .channel('couple-private-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_messages' }, loadMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_photos' }, loadPhotos)
      .subscribe((channelStatus) => {
        if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          showStatus('a conexão em tempo real caiu. Confira a rede e recarregue a página.', 'error');
        }
      });
  };

  const handleSession = async (session) => {
    if (handlingSession) return;
    handlingSession = true;
    try {
      if (realtimeChannel) {
        await client.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      currentUser = session?.user || null;
      if (!currentUser) {
        showLogin();
        feed.replaceChildren();
        document.querySelectorAll('[data-shared-photo]').forEach((photo) => photo.remove());
        showStatus('entre com sua conta para mandar carinhos e compartilhar fotos.');
        return;
      }
      authRegion.innerHTML = `
        <div class="couple-account">
          <span>conectado como ${escapeHtml(currentUser.email || '')}</span>
          <button class="couple-text-button" type="button" data-signout>sair</button>
        </div>`;
      authRegion.querySelector('[data-signout]').addEventListener('click', async () => {
        const { error } = await client.auth.signOut();
        if (error) showStatus(`não consegui sair da conta: ${error.message}`, 'error');
      });
      privateRegion.hidden = true;
      await activateMember();
    } finally {
      handlingSession = false;
    }
  };

  root.querySelector('[data-message-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const message = input.value.trim();
    if (!message || !currentUser) return;
    const { error } = await client.from('couple_messages').insert({
      sender_id: currentUser.id,
      message,
    });
    if (error) {
      showStatus(`não consegui enviar o recadinho: ${error.message}`, 'error');
      return;
    }
    input.value = '';
    showStatus('recadinho enviado para o celular do seu amor ♥');
    await loadMessages();
  });

  root.querySelector('[data-send-heart]').addEventListener('click', async () => {
    if (!currentUser) return;
    const { error } = await client.from('couple_messages').insert({
      sender_id: currentUser.id,
      message: 'estou pensando em você! ♥',
    });
    if (error) {
      showStatus(`não consegui mandar o coração: ${error.message}`, 'error');
      return;
    }
    showStatus('coração enviado para o outro celular ♥');
    await loadMessages();
  });

  const photoForm = root.querySelector('[data-photo-form]');
  if (photoForm) {
    photoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const file = photoForm.elements.photo.files[0];
      const caption = photoForm.elements.caption.value.trim();
      if (!file || !currentUser) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showStatus('escolha uma imagem JPG, PNG ou WebP.', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showStatus('essa imagem passa de 10 MB. Escolha uma menor para compartilhar.', 'error');
        return;
      }
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const objectPath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
      showStatus('enviando a lembrança privada...');
      const { error: uploadError } = await client.storage
        .from('couple-moments')
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        showStatus(`não consegui enviar a foto: ${uploadError.message}`, 'error');
        return;
      }
      const { error: recordError } = await client.from('couple_photos').insert({
        object_path: objectPath,
        caption,
        sender_id: currentUser.id,
      });
      if (recordError) {
        const { error: cleanupError } = await client.storage.from('couple-moments').remove([objectPath]);
        const cleanupNote = cleanupError ? ' A imagem foi enviada, mas precisa de limpeza no armazenamento.' : '';
        showStatus(`não consegui adicionar a foto ao álbum: ${recordError.message}.${cleanupNote}`, 'error');
        return;
      }
      photoForm.reset();
      showStatus('foto adicionada aos momentos — ela já pode ver no celular dela! ✦');
      await loadPhotos();
    });
  }

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => { void handleSession(session); }, 0);
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) showStatus(`não consegui verificar a sessão: ${error.message}`, 'error');
    else void handleSession(data.session);
  });
}

function authErrorMessage(error) {
  if (error.message.includes('Invalid login credentials')) return 'e-mail ou senha incorretos.';
  if (error.message.includes('Email not confirmed')) return 'confirme o e-mail pelo link enviado antes de entrar.';
  return `não consegui autenticar: ${error.message}`;
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
