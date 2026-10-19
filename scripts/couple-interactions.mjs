import { createClient } from '@supabase/supabase-js';

const config = window.MeuAmorSupabaseConfig;
const root = document.querySelector('#couple-chat, #couple-space');

if (root && config?.url && config?.anonKey) startCoupleSpace();

function startCoupleSpace() {
  const client = createClient(config.url, config.anonKey);
  const isChatPage = root.dataset.coupleView === 'chat';
  const isMomentsPage = root.dataset.coupleView === 'photos';
  const status = document.createElement('p');
  status.className = 'couple-status';
  status.dataset.status = '';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'conectando ao nosso cantinho...';

  if (isChatPage) {
    root.innerHTML = `
      <section class="couple-panel chat-panel">
        <header class="chat-heading">
          <a class="chat-back" href="../index.html" aria-label="Voltar ao início">‹</a>
          <span class="chat-avatar" aria-hidden="true">♥</span>
          <div class="chat-heading-copy">
            <p class="eyebrow">nosso cantinho privado</p>
            <h1>nós dois</h1>
            <span class="chat-presence" data-presence>conectando...</span>
          </div>
          <a class="chat-gallery-link" href="momentos.html" aria-label="Abrir nossos momentos">✦</a>
        </header>
        <div class="couple-status-wrap"></div>
        <ol class="chat-feed" data-feed aria-live="polite" aria-label="Mensagens da conversa"></ol>
        <form class="chat-composer" data-message-form>
          <label class="visually-hidden" for="chat-message">Escreva uma mensagem</label>
          <textarea id="chat-message" name="message" rows="1" maxlength="300" placeholder="escreva uma mensagem..." required></textarea>
          <button class="chat-send" type="submit" aria-label="Enviar mensagem">➤</button>
        </form>
        <p class="chat-hint">só vocês dois, sempre ♥</p>
      </section>`;
  } else if (isMomentsPage) {
    root.innerHTML = `
      <section class="couple-panel">
        <div class="couple-heading">
          <div><p class="eyebrow"><span>♡</span> nosso álbum compartilhado</p><h2>guardar um momento</h2></div>
          <span class="couple-heading-heart" aria-hidden="true">✦</span>
        </div>
        <div class="couple-status-wrap"></div>
        <div class="couple-private" data-private hidden>
          <form class="couple-photo-form" data-photo-form>
            <label for="couple-photo">escolha uma foto JPG, PNG ou WebP (até 10 MB)</label>
            <input id="couple-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
            <label for="couple-caption">legenda (opcional)</label>
            <input id="couple-caption" name="caption" maxlength="120" placeholder="um dia muito especial..." />
            <button class="couple-button" type="submit">adicionar aos nossos momentos ✦</button>
          </form>
        </div>
      </section>`;
  } else {
    return;
  }

  root.querySelector('.couple-status-wrap').append(status);
  const privateRegion = root.querySelector('[data-private]');
  const feed = root.querySelector('[data-feed]');
  const presence = root.querySelector('[data-presence]');
  let currentUser = null;
  let realtimeChannel = null;
  let handlingSession = false;

  const showStatus = (message, type = 'info') => {
    status.textContent = message;
    status.dataset.kind = type;
  };

  const loadMessages = async () => {
    if (!isChatPage) return;
    const { data, error } = await client
      .from('couple_messages')
      .select('id,sender_id,message,created_at')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      showStatus(`não consegui carregar as mensagens: ${error.message}`, 'error');
      return;
    }
    const wasAtBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
    feed.replaceChildren();
    if (!data.length) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'chat-empty';
      emptyMessage.textContent = 'mandem a primeira mensagem um para o outro ♥';
      feed.append(emptyMessage);
      return;
    }
    let previousDay = '';
    for (const message of data) {
      const date = new Date(message.created_at);
      const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      if (day !== previousDay) {
        const separator = document.createElement('li');
        separator.className = 'chat-day';
        separator.textContent = day;
        feed.append(separator);
        previousDay = day;
      }
      const item = document.createElement('li');
      item.className = `chat-bubble${message.sender_id === currentUser.id ? ' is-mine' : ''}`;
      const content = document.createElement('p');
      content.textContent = message.message;
      const time = document.createElement('time');
      time.dateTime = message.created_at;
      time.textContent = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      item.append(content, time);
      feed.append(item);
    }
    if (wasAtBottom) feed.scrollTop = feed.scrollHeight;
  };

  const loadPhotos = async () => {
    if (!isMomentsPage) return;
    const gallery = document.querySelector('.photo-grid');
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
      caption.className = 'memory-caption shared-memory-caption';
      const title = document.createElement('strong');
      title.textContent = photo.caption || 'um momento nosso';
      const subtitle = document.createElement('span');
      subtitle.textContent = photo.sender_id === currentUser.id ? 'adicionado por você' : 'adicionado pelo seu amor';
      caption.append(title, subtitle);
      if (photo.sender_id === currentUser.id) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'couple-delete-photo';
        deleteButton.type = 'button';
        deleteButton.textContent = 'remover foto';
        deleteButton.setAttribute('aria-label', `Remover a foto ${title.textContent}`);
        deleteButton.addEventListener('click', () => { void deletePhoto(photo, deleteButton); });
        caption.append(deleteButton);
      }
      card.append(placeholder, caption);
      gallery.append(card);
    }
  };

  const deletePhoto = async (photo, button) => {
    if (!window.confirm('Remover esta foto compartilhada? Essa ação não pode ser desfeita.')) return;
    button.disabled = true;
    showStatus('removendo a foto...');
    const { error: storageError } = await client.storage
      .from('couple-moments')
      .remove([photo.object_path]);
    if (storageError) {
      button.disabled = false;
      showStatus(`não consegui remover o arquivo da foto: ${storageError.message}`, 'error');
      return;
    }
    const { error: recordError } = await client
      .from('couple_photos')
      .delete()
      .eq('id', photo.id)
      .eq('sender_id', currentUser.id);
    if (recordError) {
      button.disabled = false;
      showStatus(`o arquivo foi removido, mas o registro da foto não: ${recordError.message}. Atualize o álbum e, se continuar, peça para corrigir o registro no Supabase.`, 'error');
      return;
    }
    showStatus('foto removida dos momentos.');
    await loadPhotos();
  };

  const activateMember = async () => {
    const { data, error } = await client.rpc('is_couple_member');
    if (error) {
      showStatus(`a configuração privada ainda não está completa: ${error.message}`, 'error');
      return;
    }
    if (!data) {
      showStatus('sua conta ainda não foi liberada para o cantinho privado.', 'error');
      return;
    }
    if (privateRegion) privateRegion.hidden = false;
    if (presence) presence.textContent = 'conversa privada';
    showStatus(isChatPage ? 'conversa conectada em tempo real.' : 'álbum privado — envie e remova suas fotos.');
    if (isChatPage) await loadMessages();
    if (isMomentsPage) await loadPhotos();
    realtimeChannel = client
      .channel('couple-private-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_messages' }, () => { void loadMessages(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_photos' }, () => { void loadPhotos(); })
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
      if (!currentUser) return;
      await activateMember();
    } finally {
      handlingSession = false;
    }
  };

  const messageForm = root.querySelector('[data-message-form]');
  if (messageForm) {
    const messageInput = messageForm.elements.message;
    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
    });
    messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        messageForm.requestSubmit();
      }
    });
    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = messageInput.value.trim();
      if (!message || !currentUser) return;
      const sendButton = messageForm.querySelector('button[type="submit"]');
      sendButton.disabled = true;
      const { error } = await client.from('couple_messages').insert({
        sender_id: currentUser.id,
        message,
      });
      sendButton.disabled = false;
      if (error) {
        showStatus(`não consegui enviar a mensagem: ${error.message}`, 'error');
        return;
      }
      messageInput.value = '';
      messageInput.style.height = 'auto';
      showStatus('mensagem enviada ♥');
      await loadMessages();
      messageInput.focus();
    });
  }

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
      const uploadButton = photoForm.querySelector('button[type="submit"]');
      uploadButton.disabled = true;
      showStatus('enviando a lembrança privada...');
      const { error: uploadError } = await client.storage
        .from('couple-moments')
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        uploadButton.disabled = false;
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
        const cleanupNote = cleanupError ? ` O arquivo também não pôde ser limpo: ${cleanupError.message}` : '';
        uploadButton.disabled = false;
        showStatus(`não consegui adicionar a foto ao álbum: ${recordError.message}.${cleanupNote}`, 'error');
        return;
      }
      photoForm.reset();
      uploadButton.disabled = false;
      showStatus('foto adicionada aos momentos ✦');
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
