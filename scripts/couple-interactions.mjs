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
          <button class="chat-notification-toggle" data-notifications type="button" aria-pressed="false" aria-label="Ativar notificações de mensagens" title="Ativar notificações de mensagens">♧</button>
          <a class="chat-gallery-link" href="momentos.html" aria-label="Abrir nossos momentos">✦</a>
        </header>
        <div class="couple-status-wrap"></div>
        <ol class="chat-feed" data-feed aria-live="polite" aria-label="Mensagens da conversa"></ol>
        <form class="chat-composer" data-message-form>
          <div class="chat-attachment" data-attachment hidden>
            <img data-image-preview alt="Prévia da foto selecionada" hidden />
            <audio data-audio-preview controls hidden></audio>
            <span data-attachment-name></span>
            <button type="button" data-clear-attachment aria-label="Remover anexo">×</button>
          </div>
          <div class="chat-composer-row">
            <input class="visually-hidden" data-photo-file type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolha uma foto para enviar" />
            <input class="visually-hidden" data-audio-file type="file" accept="audio/webm,audio/mp4,audio/ogg,audio/mpeg,audio/aac,.m4a,.mp3,.ogg,.webm" aria-label="Escolha um áudio para enviar" />
            <button class="chat-tool" type="button" data-photo-pick aria-label="Anexar uma foto" title="Anexar uma foto">▧</button>
            <button class="chat-tool" type="button" data-audio-pick aria-label="Anexar um áudio" title="Anexar um áudio">♫</button>
            <button class="chat-tool" type="button" data-record aria-label="Gravar mensagem de voz" title="Gravar mensagem de voz">🎙</button>
            <span class="chat-record-time" data-record-time aria-live="polite"></span>
            <label class="visually-hidden" for="chat-message">Escreva uma mensagem</label>
            <textarea id="chat-message" name="message" rows="1" maxlength="300" placeholder="escreva uma mensagem..."></textarea>
            <button class="chat-send" type="submit" aria-label="Enviar mensagem">➤</button>
          </div>
        </form>
        <p class="chat-hint">fotos e mensagens de voz, só para vocês dois ♥</p>
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
            <label class="couple-file-picker" for="couple-photo">
              <span class="couple-file-icon" aria-hidden="true">↑</span>
              <span class="couple-file-copy"><strong>escolha uma foto</strong><small>JPG, PNG ou WebP · até 10 MB</small></span>
              <span class="couple-file-name" data-file-name>Nenhum arquivo escolhido</span>
              <input class="visually-hidden" id="couple-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolha uma foto para adicionar aos momentos" required />
            </label>
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
  let presenceChannel = null;
  let handlingSession = false;
  let pendingAttachment = null;
  let previewUrl = null;
  let mediaRecorder = null;
  let recordingStream = null;
  let recordingChunks = [];
  let recordingStartedAt = 0;
  let recordingTimer = null;
  let supportsChatMedia = true;
  const chatMediaMigrationNotice = 'as mensagens de texto funcionam; execute supabase/setup.sql no Supabase para habilitar fotos e mensagens de voz.';

  const showStatus = (message, type = 'info') => {
    status.textContent = message;
    status.dataset.kind = type;
  };

  const notificationButton = root.querySelector('[data-notifications]');
  const notificationPreferenceKey = () => `meu-amor-chat-notifications-${currentUser?.id || 'guest'}`;
  const updateNotificationButton = () => {
    if (!notificationButton) return;
    const enabled = currentUser && localStorage.getItem(notificationPreferenceKey()) === 'true';
    notificationButton.textContent = enabled ? '🔔' : '♧';
    notificationButton.classList.toggle('is-enabled', Boolean(enabled));
    notificationButton.setAttribute('aria-pressed', String(Boolean(enabled)));
    notificationButton.setAttribute('aria-label', `${enabled ? 'Desativar' : 'Ativar'} notificações de mensagens`);
    notificationButton.title = `${enabled ? 'Desativar' : 'Ativar'} notificações de mensagens`;
    notificationButton.disabled = !('Notification' in window);
  };

  if (notificationButton) {
    updateNotificationButton();
    notificationButton.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        showStatus('este navegador não oferece notificações de mensagens.', 'error');
        return;
      }
      if (Notification.permission === 'denied') {
        showStatus('as notificações estão bloqueadas nas permissões do navegador.', 'error');
        return;
      }
      const enabled = localStorage.getItem(notificationPreferenceKey()) === 'true';
      if (enabled) {
        localStorage.removeItem(notificationPreferenceKey());
        updateNotificationButton();
        showStatus('notificações de mensagens desativadas.');
        return;
      }
      let permission = Notification.permission;
      if (permission !== 'granted') {
        try {
          permission = await Notification.requestPermission();
        } catch {
          showStatus('não consegui pedir permissão para notificações neste navegador.', 'error');
          return;
        }
      }
      if (permission !== 'granted') {
        showStatus('permita notificações para receber avisos de novas mensagens.', 'error');
        return;
      }
      localStorage.setItem(notificationPreferenceKey(), 'true');
      updateNotificationButton();
      showStatus('notificações de mensagens ativadas neste navegador ♥');
    });
  }

  const notifyIncomingMessage = async (message) => {
    if (!currentUser || message.sender_id === currentUser.id || !('Notification' in window)) return;
    if (Notification.permission !== 'granted' || localStorage.getItem(notificationPreferenceKey()) !== 'true') return;
    if (document.visibilityState === 'visible') return;
    const body = message.message?.trim()
      || (message.media_type?.startsWith('audio/') ? 'Seu amor enviou uma mensagem de voz.' : 'Seu amor enviou uma foto.');
    const options = {
      body: body.slice(0, 120),
      icon: new URL('../assets/images/icon_appandsite-192.png', location.href).href,
      tag: `couple-message-${message.id}`,
      data: { url: new URL('conversa.html', location.href).href },
    };
    try {
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
      if (registration?.showNotification) {
        await registration.showNotification('Mensagem do seu amor ♥', options);
      } else {
        new Notification('Mensagem do seu amor ♥', options);
      }
    } catch {
      // Notifications are optional; chat delivery must continue if the browser blocks them.
    }
  };

  const loadMessages = async () => {
    if (!isChatPage) return;
    let { data, error } = await client
      .from('couple_messages')
      .select(supportsChatMedia
        ? 'id,sender_id,message,media_path,media_type,created_at'
        : 'id,sender_id,message,created_at')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error?.code === '42703' && /media_path|media_type/.test(error.message)) {
      supportsChatMedia = false;
      showStatus(chatMediaMigrationNotice);
      ({ data, error } = await client
        .from('couple_messages')
        .select('id,sender_id,message,created_at')
        .order('created_at', { ascending: true })
        .limit(200));
    }
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
    const signedMessages = await Promise.all(data.map(async (message) => {
      if (!message.media_path) return { ...message, mediaUrl: null };
      const { data: file, error: fileError } = await client.storage
        .from('couple-chat')
        .createSignedUrl(message.media_path, 3600);
      if (fileError) {
        showStatus(`não consegui abrir um anexo da conversa: ${fileError.message}`, 'error');
        return { ...message, mediaUrl: null };
      }
      return { ...message, mediaUrl: file.signedUrl };
    }));
    for (const message of signedMessages) {
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
      if (message.message) {
        const content = document.createElement('p');
        content.textContent = message.message;
        item.append(content);
      }
      if (message.mediaUrl && message.media_type?.startsWith('image/')) {
        const image = document.createElement('img');
        image.className = 'chat-media-image';
        image.src = message.mediaUrl;
        image.alt = 'Foto enviada na conversa';
        image.loading = 'lazy';
        item.append(image);
      } else if (message.mediaUrl && message.media_type?.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.className = 'chat-media-audio';
        audio.src = message.mediaUrl;
        audio.controls = true;
        audio.preload = 'metadata';
        audio.setAttribute('aria-label', 'Mensagem de voz');
        item.append(audio);
      }
      const time = document.createElement('time');
      time.dateTime = message.created_at;
      time.textContent = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      item.append(time);
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
    updateNotificationButton();
    if (presence) presence.textContent = isChatPage ? 'procurando seu amor...' : 'conversa privada';
    showStatus(isChatPage ? 'conversa conectada em tempo real.' : 'álbum privado — envie e remova suas fotos.');
    if (isChatPage) await loadMessages();
    if (isMomentsPage) await loadPhotos();
    if (isChatPage && presence) {
      const updatePresence = () => {
        const state = presenceChannel?.presenceState() || {};
        const partnerOnline = Object.entries(state).some(([userId, instances]) => userId !== currentUser.id && instances.length > 0);
        presence.textContent = partnerOnline ? 'seu amor está online ♥' : 'seu amor está offline';
        presence.dataset.online = String(partnerOnline);
      };
      presenceChannel = client.channel('couple-chat-presence', { config: { presence: { key: currentUser.id } } });
      presenceChannel
        .on('presence', { event: 'sync' }, updatePresence)
        .on('presence', { event: 'join' }, updatePresence)
        .on('presence', { event: 'leave' }, updatePresence)
        .subscribe(async (channelStatus) => {
          if (channelStatus === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
            updatePresence();
          } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
            presence.textContent = 'presença indisponível';
          }
        });
    }
    realtimeChannel = client
      .channel('couple-private-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couple_messages' }, (payload) => {
        void loadMessages();
        void notifyIncomingMessage(payload.new);
      })
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
      if (presenceChannel) {
        await client.removeChannel(presenceChannel);
        presenceChannel = null;
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
    const photoInput = messageForm.querySelector('[data-photo-file]');
    const audioInput = messageForm.querySelector('[data-audio-file]');
    const attachmentPanel = messageForm.querySelector('[data-attachment]');
    const imagePreview = messageForm.querySelector('[data-image-preview]');
    const audioPreview = messageForm.querySelector('[data-audio-preview]');
    const attachmentName = messageForm.querySelector('[data-attachment-name]');
    const photoPickButton = messageForm.querySelector('[data-photo-pick]');
    const audioPickButton = messageForm.querySelector('[data-audio-pick]');
    const recordButton = messageForm.querySelector('[data-record]');
    const recordTime = messageForm.querySelector('[data-record-time]');
    const sendButton = messageForm.querySelector('.chat-send');
    const maxAttachmentBytes = 10 * 1024 * 1024;

    const clearPendingAttachment = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      pendingAttachment = null;
      imagePreview.hidden = true;
      imagePreview.removeAttribute('src');
      audioPreview.pause();
      audioPreview.hidden = true;
      audioPreview.removeAttribute('src');
      attachmentName.textContent = '';
      attachmentPanel.hidden = true;
      photoInput.value = '';
      audioInput.value = '';
    };

    const showPendingAttachment = (file, type) => {
      clearPendingAttachment();
      pendingAttachment = { file, type };
      previewUrl = URL.createObjectURL(file);
      attachmentPanel.hidden = false;
      if (type.startsWith('image/')) {
        imagePreview.src = previewUrl;
        imagePreview.hidden = false;
        attachmentName.textContent = 'foto pronta para enviar';
      } else {
        audioPreview.src = previewUrl;
        audioPreview.hidden = false;
        attachmentName.textContent = 'mensagem de voz pronta para enviar';
      }
    };

    photoPickButton.addEventListener('click', () => photoInput.click());
    audioPickButton.addEventListener('click', () => audioInput.click());
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        clearPendingAttachment();
        showStatus('escolha uma foto JPG, PNG ou WebP.', 'error');
        return;
      }
      if (file.size > maxAttachmentBytes) {
        clearPendingAttachment();
        showStatus('essa foto passa de 10 MB. Escolha uma menor para enviar.', 'error');
        return;
      }
      showPendingAttachment(file, file.type);
      showStatus('foto pronta para enviar na conversa.');
    });
    audioInput.addEventListener('change', () => {
      const file = audioInput.files[0];
      if (!file) return;
      const extension = file.name.split('.').pop().toLowerCase();
      const typeByExtension = { webm: 'audio/webm', mp4: 'audio/mp4', m4a: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg', aac: 'audio/aac' };
      const reportedType = file.type.toLowerCase().split(';')[0];
      const normalizedType = reportedType === 'audio/x-m4a' ? 'audio/mp4' : reportedType;
      const type = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/aac'].includes(normalizedType)
        ? normalizedType
        : typeByExtension[extension];
      if (!type) {
        clearPendingAttachment();
        showStatus('escolha um áudio MP3, M4A, AAC, OGG ou WebM.', 'error');
        return;
      }
      if (file.size > maxAttachmentBytes) {
        clearPendingAttachment();
        showStatus('esse áudio passa de 10 MB. Escolha um menor para enviar.', 'error');
        return;
      }
      const normalizedFile = file.type === type ? file : new File([file], file.name, { type });
      showPendingAttachment(normalizedFile, type);
      showStatus('áudio pronto para enviar na conversa.');
    });
    messageForm.querySelector('[data-clear-attachment]').addEventListener('click', clearPendingAttachment);

    const stopRecordingTracks = () => {
      if (recordingTimer) window.clearInterval(recordingTimer);
      recordingTimer = null;
      recordingStream?.getTracks().forEach((track) => track.stop());
      recordingStream = null;
      recordButton.textContent = '🎙';
      recordButton.classList.remove('is-recording');
      recordButton.setAttribute('aria-label', 'Gravar mensagem de voz');
      recordButton.title = 'Gravar mensagem de voz';
      recordTime.textContent = '';
    };

    recordButton.addEventListener('click', async () => {
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
        return;
      }
      if (pendingAttachment) {
        showStatus('remova o anexo atual antes de gravar uma mensagem de voz.', 'error');
        return;
      }
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        showStatus('a gravação de voz precisa de um navegador compatível e conexão segura (HTTPS).', 'error');
        return;
      }
      recordButton.disabled = true;
      try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg'];
        const mimeType = audioTypes.find((type) => MediaRecorder.isTypeSupported(type));
        mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
        recordingChunks = [];
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size) recordingChunks.push(event.data);
        });
        mediaRecorder.addEventListener('stop', () => {
          stopRecordingTracks();
          const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || recordingChunks[0]?.type || 'audio/webm' });
          recordingChunks = [];
          if (!blob.size) {
            showStatus('não consegui capturar o áudio. Tente gravar novamente.', 'error');
            return;
          }
          if (blob.size > maxAttachmentBytes) {
            showStatus('o áudio passou de 10 MB. Grave uma mensagem mais curta.', 'error');
            return;
          }
          const type = blob.type.split(';')[0];
          const extension = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac' }[type];
          if (!extension) {
            showStatus(`este navegador gravou em um formato não compatível (${type || 'desconhecido'}).`, 'error');
            return;
          }
          showPendingAttachment(new File([blob], `mensagem-de-voz.${extension}`, { type }), type);
          showStatus('mensagem de voz pronta para enviar.');
        });
        mediaRecorder.addEventListener('error', () => {
          stopRecordingTracks();
          showStatus('ocorreu um erro durante a gravação de voz.', 'error');
        });
        mediaRecorder.start(1000);
        recordingStartedAt = Date.now();
        recordButton.textContent = '■';
        recordButton.classList.add('is-recording');
        recordButton.setAttribute('aria-label', 'Parar gravação');
        recordButton.title = 'Parar gravação';
        recordTime.textContent = '00:00';
        recordingTimer = window.setInterval(() => {
          const elapsed = Math.floor((Date.now() - recordingStartedAt) / 1000);
          recordTime.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
          if (elapsed >= 120) mediaRecorder.stop();
        }, 1000);
        showStatus('gravando sua mensagem de voz... toque em parar quando terminar.');
      } catch (error) {
        stopRecordingTracks();
        const message = error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? 'permita o acesso ao microfone nas configurações do navegador e tente novamente.'
          : error.name === 'NotFoundError'
            ? 'não encontrei um microfone disponível neste aparelho.'
            : error.name === 'NotReadableError'
              ? 'o microfone está sendo usado por outro aplicativo.'
              : `não consegui iniciar a gravação: ${error.message}`;
        showStatus(message, 'error');
      } finally {
        recordButton.disabled = false;
      }
    });

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
      if ((!message && !pendingAttachment) || !currentUser || mediaRecorder?.state === 'recording') return;
      if (pendingAttachment && !supportsChatMedia) {
        showStatus(chatMediaMigrationNotice, 'error');
        return;
      }
      sendButton.disabled = true;
      let objectPath = null;
      if (pendingAttachment) {
        const extension = pendingAttachment.file.name.split('.').pop();
        objectPath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
          .from('couple-chat')
          .upload(objectPath, pendingAttachment.file, { contentType: pendingAttachment.type, upsert: false });
        if (uploadError) {
          sendButton.disabled = false;
          showStatus(`não consegui enviar o anexo: ${uploadError.message}`, 'error');
          return;
        }
      }
      const newMessage = {
        sender_id: currentUser.id,
        message: message || '',
      };
      if (supportsChatMedia) {
        newMessage.media_path = objectPath;
        newMessage.media_type = pendingAttachment?.type || null;
      }
      const { error } = await client.from('couple_messages').insert(newMessage);
      sendButton.disabled = false;
      if (error) {
        let cleanupNote = '';
        if (objectPath) {
          const { error: cleanupError } = await client.storage.from('couple-chat').remove([objectPath]);
          if (cleanupError) cleanupNote = ` O anexo também não pôde ser removido: ${cleanupError.message}`;
        }
        showStatus(`não consegui enviar a mensagem: ${error.message}.${cleanupNote}`, 'error');
        return;
      }
      messageInput.value = '';
      messageInput.style.height = 'auto';
      clearPendingAttachment();
      showStatus('mensagem enviada ♥');
      await loadMessages();
      messageInput.focus();
    });
    window.addEventListener('pagehide', () => {
      if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
      stopRecordingTracks();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, { once: true });
  }

  const photoForm = root.querySelector('[data-photo-form]');
  if (photoForm) {
    const photoInput = photoForm.elements.photo;
    const filePicker = photoForm.querySelector('.couple-file-picker');
    const fileName = photoForm.querySelector('[data-file-name]');
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      fileName.textContent = file?.name || 'Nenhum arquivo escolhido';
      filePicker.classList.toggle('has-file', Boolean(file));
    });
    photoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const file = photoInput.files[0];
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
      fileName.textContent = 'Nenhum arquivo escolhido';
      filePicker.classList.remove('has-file');
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
