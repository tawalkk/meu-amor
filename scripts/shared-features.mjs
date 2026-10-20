import { createClient } from '@supabase/supabase-js';

const root = document.querySelector('[data-shared-feature]');
const config = window.MeuAmorSupabaseConfig;

const features = {
  timeline: {
    table: 'couple_timeline', title: 'Nossa linha do tempo', accent: 'memórias que fizeram a gente chegar até aqui',
    intro: 'Guardem datas especiais, pequenas conquistas e os capítulos que querem lembrar para sempre.',
    date: { name: 'happened_on', label: 'quando aconteceu', type: 'date', required: true },
    fields: [{ name: 'title', label: 'o que aconteceu?', required: true, max: 100 }, { name: 'details', label: 'conte um pouquinho', area: true, max: 800, wide: true }],
    order: 'happened_on', ascending: false, body: 'details', empty: 'A primeira memória especial ainda está esperando por vocês.'
  },
  letters: {
    table: 'couple_letters', title: 'Cartinhas para guardar', accent: 'palavras que ficam com vocês',
    intro: 'Escrevam cartinhas um para o outro. Elas ficam guardadas aqui para reler quando der saudade.',
    fields: [{ name: 'title', label: 'um título para esta carta', required: true, max: 100 }, { name: 'content', label: 'escreva sua cartinha', area: true, required: true, max: 3000, wide: true }],
    order: 'created_at', ascending: false, body: 'content', empty: 'A primeira cartinha pode começar com um simples “estava pensando em você”.'
  },
  diary: {
    table: 'couple_diary', title: 'Diário a dois', accent: 'um lugar para registrar o dia',
    intro: 'Anotem momentos, pensamentos e detalhes do cotidiano. Os registros ficam compartilhados entre vocês.',
    date: { name: 'entry_on', label: 'data', type: 'date', required: true },
    fields: [{ name: 'title', label: 'título (opcional)', max: 100 }, { name: 'content', label: 'o que você quer guardar deste dia?', area: true, required: true, max: 2000, wide: true }],
    order: 'entry_on', ascending: false, body: 'content', empty: 'O diário está em branco. Guardem hoje um pedacinho do dia.'
  },
  plans: {
    table: 'couple_plans', title: 'Planos e contagem regressiva', accent: 'o próximo capítulo começa com um plano',
    intro: 'Guardem encontros, passeios e viagens. A contagem regressiva aparece em cada plano com data marcada.',
    date: { name: 'planned_for', label: 'data (opcional)', type: 'date' },
    fields: [{ name: 'title', label: 'qual é o plano?', required: true, max: 100 }, { name: 'details', label: 'detalhes', area: true, max: 800, wide: true }],
    order: 'planned_for', ascending: true, body: 'details', done: true, dateLabel: 'marcado para', empty: 'Que tal escolherem juntos o próximo passeio?'
  },
  wishes: {
    table: 'couple_wishes', title: 'Lista de desejos', accent: 'ideias para viver juntinhos',
    intro: 'Filmes para ver, lugares para conhecer e vontades para realizar. Marquem cada ideia quando acontecer.',
    fields: [{ name: 'title', label: 'o que vocês querem fazer?', required: true, max: 120 }, { name: 'category', label: 'categoria', select: ['passeio', 'comida', 'filme ou série', 'viagem', 'outro'] }],
    order: 'created_at', ascending: false, body: 'category', done: true, empty: 'Adicionem a primeira vontade à lista.'
  },
  notes: {
    table: 'couple_notes', title: 'Mural de recadinhos', accent: 'bilhetes para encontrar no meio do dia',
    intro: 'Deixem uma mensagem rápida, um elogio ou aquele lembrete carinhoso que merece ficar visível.',
    fields: [{ name: 'title', label: 'recadinho curto', required: true, max: 140 }, { name: 'content', label: 'um detalhe a mais (opcional)', area: true, max: 500, wide: true }],
    order: 'created_at', ascending: false, body: 'content', empty: 'O mural está esperando o primeiro recadinho.'
  },
  calendar: {
    table: 'couple_events', title: 'Calendário do casal', accent: 'datas que merecem um lugar especial',
    intro: 'Aniversários, encontros e compromissos importantes ficam reunidos no calendário de vocês.',
    date: { name: 'starts_at', label: 'data e hora', type: 'datetime-local', required: true },
    fields: [{ name: 'title', label: 'nome da ocasião', required: true, max: 100 }, { name: 'details', label: 'detalhes', area: true, max: 800, wide: true }],
    order: 'starts_at', ascending: true, body: 'details', dateLabel: 'data', empty: 'Adicionem a próxima data importante.'
  }
};

if (root && config?.url && config?.anonKey) initialize();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function initialize() {
  const client = createClient(config.url, config.anonKey);
  const featureName = root.dataset.sharedFeature;
  if (featureName === 'portal') return renderPortal();
  const status = root.querySelector('.shared-status') || element('p', 'shared-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  if (!status.isConnected) {
    status.textContent = 'conferindo o acesso ao nosso cantinho...';
    root.append(status);
  }

  const { data: sessionResult, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionResult.session) {
    showStatus(status, 'entre no cantinho para ver e guardar as lembranças de vocês.', 'error');
    return;
  }
  const user = sessionResult.session.user;
  const { data: isMember, error: memberError } = await client.rpc('is_couple_member');
  if (memberError || !isMember) {
    showStatus(status, 'esta conta ainda não tem acesso ao espaço compartilhado.', 'error');
    return;
  }
  if (featureName === 'questions') {
    await setupQuestions(client, user, status);
    return;
  }
  const feature = features[featureName];
  if (!feature) {
    showStatus(status, 'não encontrei esta página do cantinho.', 'error');
    return;
  }
  setupFeature(client, user, status, feature);
}

function showStatus(status, message, kind = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function renderPortal() {
  const content = root.querySelector('[data-portal-links]');
  if (content.childElementCount) return;
  const pages = [
    ['conversa.html', '♡', 'Nossa conversa', 'Mensagens em tempo real.'],
    ['momentos.html', '✦', 'Álbum compartilhado', 'Fotos e legendas de vocês.'],
    ['linha-do-tempo.html', '⌁', 'Linha do tempo', 'Datas e capítulos especiais.'],
    ['cartinhas.html', '✉', 'Cartinhas', 'Palavras para guardar.'],
    ['diario.html', '☼', 'Diário a dois', 'Registros do cotidiano.'],
    ['planos.html', '↗', 'Planos e contagem', 'Próximos encontros e passeios.'],
    ['desejos.html', '☆', 'Lista de desejos', 'Ideias para realizar juntos.'],
    ['recadinhos.html', '♡', 'Mural de recados', 'Bilhetes para deixar com carinho.'],
    ['perguntas.html', '?', 'Caixinha de perguntas', 'Respondam e comparem.'],
    ['calendario.html', '▦', 'Calendário', 'Datas importantes do casal.']
  ];
  for (const [href, icon, title, description] of pages) {
    const link = element('a', 'shared-portal-card');
    link.href = href;
    link.append(element('span', '', icon), element('strong', '', title), element('small', '', description));
    content.append(link);
  }
}

function setupFeature(client, user, status, feature) {
  const form = root.querySelector('[data-shared-form]');
  const feed = root.querySelector('[data-shared-feed]');
  const isCalendar = feature.table === 'couple_events';
  let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = localDateKey(new Date());
  const reminderStorageKey = `meu-amor-calendar-reminders-${user.id}`;
  const browserReminderTimers = new Map();
  const nativeNotifications = window.MeuAmorLocalNotifications;
  const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.() && nativeNotifications);
  const readReminders = () => {
    try {
      return JSON.parse(localStorage.getItem(reminderStorageKey) || '{}');
    } catch {
      return {};
    }
  };
  const saveReminders = (reminders) => localStorage.setItem(reminderStorageKey, JSON.stringify(reminders));
  const notificationIdFor = (eventId) => {
    let hash = 2166136261;
    for (const character of `${user.id}:${eventId}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return (hash >>> 0) & 0x7fffffff || 1;
  };
  const showBrowserReminder = async (record) => {
    const options = {
      body: `Está chegando: ${record.title} ♥`,
      icon: new URL('../assets/images/icon_appandsite-192.png', location.href).href,
      tag: `couple-event-${record.id}`,
      data: { url: new URL('calendario.html', location.href).href }
    };
    try {
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
      if (registration?.showNotification) {
        await registration.showNotification('Lembrete de vocês ♥', options);
      } else {
        const notification = new Notification('Lembrete de vocês ♥', options);
        notification.onclick = () => { window.focus(); location.href = options.data.url; };
      }
    } catch {
      showStatus(status, 'não consegui mostrar a notificação neste navegador.', 'error');
    }
  };
  const armBrowserReminder = (record, reminder) => {
    if (browserReminderTimers.has(record.id)) return;
    const fire = () => {
      const remaining = reminder.at - Date.now();
      if (remaining <= 0) {
        browserReminderTimers.delete(record.id);
        const reminders = readReminders();
        delete reminders[record.id];
        saveReminders(reminders);
        void showBrowserReminder(record);
        void load();
        return;
      }
      browserReminderTimers.set(record.id, window.setTimeout(fire, Math.min(remaining, 2147000000)));
    };
    fire();
  };
  const cancelReminder = async (eventId, notificationId = notificationIdFor(eventId)) => {
    const timer = browserReminderTimers.get(eventId);
    if (timer) window.clearTimeout(timer);
    browserReminderTimers.delete(eventId);
    if (isNativeApp) await nativeNotifications.cancel({ notifications: [{ id: notificationId }] }).catch(() => {});
  };
  const syncReminders = async (records) => {
    const reminders = readReminders();
    const currentRecords = new Map(records.map((record) => [record.id, record]));
    for (const [eventId, reminder] of Object.entries(reminders)) {
      if (!currentRecords.has(eventId) || reminder.eventAt !== currentRecords.get(eventId).starts_at || reminder.at <= Date.now()) {
        await cancelReminder(eventId, reminder.notificationId);
        delete reminders[eventId];
      }
    }
    saveReminders(reminders);
    if (!isNativeApp && 'Notification' in window && Notification.permission === 'granted') {
      for (const record of records) {
        const reminder = reminders[record.id];
        if (reminder && reminder.eventAt === record.starts_at) armBrowserReminder(record, reminder);
      }
    }
  };
  const requestReminderPermission = async () => {
    if (isNativeApp) {
      let permission = await nativeNotifications.checkPermissions();
      if (permission.display !== 'granted') permission = await nativeNotifications.requestPermissions();
      return permission.display === 'granted';
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  };
  const addReminderControl = (card, record) => {
    const actions = card.querySelector('.shared-card-actions') || element('div', 'shared-card-actions');
    if (!actions.isConnected) card.append(actions);
    const control = element('div', 'calendar-reminder-control');
    const select = document.createElement('select');
    select.className = 'calendar-reminder-select';
    select.setAttribute('aria-label', `Quanto antes avisar sobre ${record.title}`);
    for (const [minutes, label] of [[0, 'na hora'], [10, '10 min antes'], [60, '1 hora antes'], [1440, '1 dia antes'], [10080, '1 semana antes']]) {
      const option = element('option', '', label);
      option.value = String(minutes);
      select.append(option);
    }
    const reminders = readReminders();
    const reminder = reminders[record.id];
    if (reminder) select.value = String(reminder.minutes);
    const isCurrentReminder = reminder?.eventAt === record.starts_at;
    const toggle = element('button', `shared-action calendar-reminder-button${isCurrentReminder ? ' is-reminder-active' : ''}`, isCurrentReminder ? '🔔 lembrete ativo' : reminder ? 'atualizar lembrete' : '♡ me lembrar');
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', String(Boolean(isCurrentReminder)));
    const eventTimestamp = new Date(record.starts_at).getTime();
    if (eventTimestamp <= Date.now() && !isCurrentReminder) {
      select.disabled = true;
      toggle.disabled = true;
      toggle.title = 'Este evento já passou';
    }
    control.append(select, toggle);
    actions.prepend(control);
    toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      try {
        const current = readReminders();
        const savedReminder = current[record.id];
        if (savedReminder?.eventAt === record.starts_at) {
          await cancelReminder(record.id, savedReminder.notificationId);
          delete current[record.id];
          saveReminders(current);
          showStatus(status, 'lembrete desativado neste dispositivo.');
          await load();
          return;
        }
        const leadMinutes = Number(select.value);
        const remindAt = eventTimestamp - leadMinutes * 60000;
        if (remindAt <= Date.now()) {
          showStatus(status, 'escolha um aviso que aconteça antes do evento.', 'error');
          return;
        }
        const permitted = await requestReminderPermission();
        if (!permitted) {
          showStatus(status, isNativeApp
            ? 'permita notificações nas configurações do dispositivo para ativar o lembrete.'
            : 'permita notificações do navegador para ativar o lembrete.', 'error');
          return;
        }
        const notificationId = notificationIdFor(record.id);
        if (savedReminder) await cancelReminder(record.id, savedReminder.notificationId);
        const nextReminder = { eventAt: record.starts_at, at: remindAt, minutes: leadMinutes, notificationId };
        if (isNativeApp) {
          await nativeNotifications.schedule({ notifications: [{
            id: notificationId,
            title: 'Lembrete de vocês ♥',
            body: `${record.title} está chegando. Abra o calendário para ver os detalhes.`,
            extra: { url: new URL('calendario.html', location.href).href },
            schedule: { at: new Date(remindAt) }
          }] });
        }
        current[record.id] = nextReminder;
        saveReminders(current);
        if (!isNativeApp) armBrowserReminder(record, nextReminder);
        showStatus(status, isNativeApp
          ? 'lembrete agendado neste dispositivo; ele pode avisar mesmo com o app fechado ♥'
          : 'lembrete ativado enquanto o site estiver aberto. Para avisos confiáveis com ele fechado, use o app instalado.');
        await load();
      } catch {
        showStatus(status, 'não consegui agendar o lembrete. Confira as permissões de notificação do dispositivo.', 'error');
      } finally {
        toggle.disabled = false;
      }
    });
  };
  for (const field of [...(feature.date ? [feature.date] : []), ...feature.fields]) {
    const label = element('label', field.wide ? 'wide' : '', field.label);
    let input;
    if (field.area) {
      input = document.createElement('textarea');
      input.rows = 4;
    } else if (field.select) {
      input = document.createElement('select');
      const emptyOption = element('option', '', 'escolha uma categoria');
      emptyOption.value = '';
      input.append(emptyOption);
      for (const value of field.select) {
        const option = element('option', '', value);
        option.value = value;
        input.append(option);
      }
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
    }
    input.name = field.name;
    if (field.required) input.required = true;
    if (field.max) input.maxLength = field.max;
    label.append(input);
    form.append(label);
  }
  const submit = element('button', 'shared-submit', 'guardar no nosso cantinho ♥');
  submit.type = 'submit';
  form.append(submit);

  const renderCalendar = (records) => {
    const eventsByDate = new Map();
    for (const record of records) {
      const eventDate = new Date(record.starts_at);
      const key = localDateKey(eventDate);
      eventsByDate.set(key, [...(eventsByDate.get(key) || []), record]);
    }
    const calendar = element('section', 'calendar-view');
    const toolbar = element('div', 'calendar-toolbar');
    const monthControls = element('div', 'calendar-month-controls');
    const previous = element('button', 'calendar-nav', '‹');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Mês anterior');
    const monthTitle = element('h2', 'calendar-month-title', displayedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
    const next = element('button', 'calendar-nav', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Próximo mês');
    monthControls.append(previous, monthTitle, next);
    const todayButton = element('button', 'calendar-today', 'hoje');
    todayButton.type = 'button';
    toolbar.append(monthControls, todayButton);
    calendar.append(toolbar);

    const weekdayRow = element('div', 'calendar-weekdays');
    for (const weekday of ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']) {
      weekdayRow.append(element('span', '', weekday));
    }
    calendar.append(weekdayRow);

    const grid = element('div', 'calendar-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', `Dias de ${displayedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
    const firstOfMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7));
    const todayKey = localDateKey(new Date());
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = localDateKey(date);
      const events = eventsByDate.get(key) || [];
      const classes = ['calendar-day'];
      if (date.getMonth() !== displayedMonth.getMonth()) classes.push('is-outside-month');
      if (key === todayKey) classes.push('is-today');
      if (key === selectedDate) classes.push('is-selected');
      if (events.length) classes.push('has-events');
      const day = element('button', classes.join(' '), String(date.getDate()));
      day.type = 'button';
      day.dataset.date = key;
      day.setAttribute('aria-pressed', String(key === selectedDate));
      day.setAttribute('aria-label', `${date.toLocaleDateString('pt-BR', { dateStyle: 'full' })}${events.length ? `, ${events.length} ${events.length === 1 ? 'evento' : 'eventos'}` : ''}`);
      if (events.length) day.append(element('span', 'calendar-day-count', String(events.length)));
      else day.append(element('span', 'calendar-day-dot', ''));
      grid.append(day);
    }
    calendar.append(grid);

    const agenda = element('section', 'calendar-agenda');
    const heading = element('div', 'calendar-agenda-heading');
    const selected = new Date(`${selectedDate}T12:00:00`);
    const selectedEvents = eventsByDate.get(selectedDate) || [];
    heading.append(
      element('div', 'calendar-agenda-date', selected.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })),
      element('span', 'calendar-agenda-count', `${selectedEvents.length} ${selectedEvents.length === 1 ? 'momento' : 'momentos'}`)
    );
    agenda.append(heading);
    if (selectedEvents.length) {
      const agendaEvents = element('div', 'calendar-agenda-events');
      for (const record of selectedEvents) {
        const card = renderRecord(record, feature, user, client, status, load);
        card.classList.add('calendar-event-card');
        addReminderControl(card, record);
        agendaEvents.append(card);
      }
      agenda.append(agendaEvents);
    } else {
      agenda.append(element('p', 'calendar-agenda-empty', 'nenhum plano neste dia — que tal guardar um momento especial? ♡'));
    }
    calendar.append(agenda);
    feed.replaceChildren(calendar);

    previous.addEventListener('click', () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
      renderCalendar(records);
    });
    next.addEventListener('click', () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
      renderCalendar(records);
    });
    todayButton.addEventListener('click', () => {
      const today = new Date();
      displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      selectedDate = localDateKey(today);
      renderCalendar(records);
    });
    grid.addEventListener('click', (event) => {
      const day = event.target.closest('[data-date]');
      if (!day) return;
      selectedDate = day.dataset.date;
      const [year, month] = selectedDate.split('-').map(Number);
      displayedMonth = new Date(year, month - 1, 1);
      renderCalendar(records);
    });
  };

  const load = async () => {
    const { data, error } = await client.from(feature.table).select('*').order(feature.order, { ascending: feature.ascending }).limit(200);
    if (error) {
      showStatus(status, `${tableErrorMessage(error)} (${error.message})`, 'error');
      return;
    }
    if (isCalendar) {
      await syncReminders(data);
      showStatus(status, `sincronizado com o banco · ${data.length} ${data.length === 1 ? 'ocasião' : 'ocasiões'} de vocês ♥`);
      renderCalendar(data);
      return;
    }
    feed.replaceChildren();
    showStatus(status, `sincronizado com o banco · ${data.length} ${data.length === 1 ? 'registro' : 'registros'} ♥`);
    if (!data.length) {
      feed.append(element('div', 'shared-empty', feature.empty));
      return;
    }
    for (const record of data) feed.append(renderRecord(record, feature, user, client, status, load));
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    showStatus(status, 'guardando para vocês dois...');
    const formData = new FormData(form);
    const record = { created_by: user.id };
    if (feature.date) {
      const value = formData.get(feature.date.name);
      if (value) record[feature.date.name] = feature.date.type === 'datetime-local' ? new Date(value).toISOString() : value;
    }
    for (const field of feature.fields) {
      const value = String(formData.get(field.name) || '').trim();
      if (value) record[field.name] = value;
    }
    if (feature.done) record.is_done = false;
    const { error } = await client.from(feature.table).insert(record);
    submit.disabled = false;
    if (error) {
      showStatus(status, `${tableErrorMessage(error)} (${error.message})`, 'error');
      return;
    }
    form.reset();
    showStatus(status, 'guardado no cantinho de vocês ♥');
    if (isCalendar) {
      const savedDate = new Date(record.starts_at);
      selectedDate = localDateKey(savedDate);
      displayedMonth = new Date(savedDate.getFullYear(), savedDate.getMonth(), 1);
    }
    await load();
  });
  void load();
  client.channel(`shared-${feature.table}`).on('postgres_changes', { event: '*', schema: 'public', table: feature.table }, () => { void load(); }).subscribe();
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function renderRecord(record, feature, user, client, status, reload) {
  const card = element('article', 'shared-card');
  const title = record.title || record.item || 'um pedacinho do nosso dia';
  card.append(element('h2', '', title));
  if (feature.date) {
    const value = record[feature.date.name];
    if (value) {
      const date = new Date(`${value}${feature.date.type === 'date' ? 'T12:00:00' : ''}`);
      const label = feature.dateLabel || feature.date.label;
      card.append(element('time', 'shared-meta', `${label}: ${date.toLocaleString('pt-BR', feature.date.type === 'date' ? { dateStyle: 'long' } : { dateStyle: 'long', timeStyle: 'short' })}`));
      if (feature.table === 'couple_plans' && !record.is_done) {
        const days = Math.ceil((new Date(`${value}T23:59:59`).getTime() - Date.now()) / 86400000);
        const countdown = days < 0 ? 'esse plano já pode virar lembrança ♥' : days === 0 ? 'é hoje! ♥' : `faltam ${days} ${days === 1 ? 'dia' : 'dias'} ♥`;
        card.append(element('p', 'shared-countdown', countdown));
      }
    }
  }
  const description = feature.body && record[feature.body];
  if (description) card.append(element('p', '', description));
  const author = record.created_by === user.id ? 'adicionado por você' : 'adicionado pelo seu amor';
  card.append(element('small', 'shared-meta', `${author} · ${new Date(record.created_at).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}`));
  const actions = element('div', 'shared-card-actions');
  if (feature.done) {
    const done = element('button', `shared-action${record.is_done ? ' is-done' : ''}`, record.is_done ? 'já aconteceu ♥' : 'marcar como feito');
    done.type = 'button';
    done.addEventListener('click', async () => {
      done.disabled = true;
      const { error } = await client.from(feature.table).update({ is_done: !record.is_done }).eq('id', record.id);
      if (error) showStatus(status, `não consegui atualizar: ${error.message}`, 'error');
      await reload();
    });
    actions.append(done);
  }
  if (record.created_by === user.id) {
    const remove = element('button', 'shared-action', 'remover');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!window.confirm('Remover este registro do espaço compartilhado?')) return;
      remove.disabled = true;
      const { error } = await client.from(feature.table).delete().eq('id', record.id);
      if (error) showStatus(status, `não consegui remover: ${error.message}`, 'error');
      await reload();
    });
    actions.append(remove);
  }
  if (actions.childElementCount) card.append(actions);
  return card;
}

async function setupQuestions(client, user, status) {
  const questionForm = root.querySelector('[data-question-form]');
  const questionFeed = root.querySelector('[data-shared-feed]');
  const questionSubmit = questionForm.querySelector('button[type=submit]');
  const load = async () => {
    const { data: questions, error } = await client.from('couple_questions').select('id,question,created_by,created_at').order('created_at', { ascending: false }).limit(100);
    if (error) {
      showStatus(status, `${tableErrorMessage(error)} (${error.message})`, 'error');
      return;
    }
    const questionIds = questions.map((question) => question.id);
    let answers = [];
    if (questionIds.length) {
      const result = await client.from('couple_answers').select('id,question_id,responder_id,answer,updated_at').in('question_id', questionIds);
      if (result.error) {
        showStatus(status, `não consegui carregar as respostas: ${result.error.message}`, 'error');
        return;
      }
      answers = result.data;
    }
    questionFeed.replaceChildren();
    showStatus(status, `sincronizado com o banco · ${questions.length} ${questions.length === 1 ? 'pergunta' : 'perguntas'} ♥`);
    if (!questions.length) questionFeed.append(element('div', 'shared-empty', 'Deixem uma pergunta para responderem juntinhos.'));
    for (const question of questions) questionFeed.append(renderQuestion(question, answers.filter((answer) => answer.question_id === question.id), user, client, status, load));
  };
  questionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = questionForm.elements.question.value.trim();
    if (!question) return;
    questionSubmit.disabled = true;
    const { error } = await client.from('couple_questions').insert({ question, created_by: user.id });
    questionSubmit.disabled = false;
    if (error) {
      showStatus(status, `não consegui guardar a pergunta: ${error.message}`, 'error');
      return;
    }
    questionForm.reset();
    showStatus(status, 'pergunta guardada para vocês dois ♥');
    await load();
  });
  void load();
  client.channel('shared-couple-questions').on('postgres_changes', { event: '*', schema: 'public', table: 'couple_questions' }, () => { void load(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'couple_answers' }, () => { void load(); }).subscribe();
}

function renderQuestion(question, answers, user, client, status, reload) {
  const card = element('article', 'shared-card answer-card');
  card.append(element('h2', '', question.question));
  card.append(element('small', 'shared-meta', `pergunta ${new Date(question.created_at).toLocaleDateString('pt-BR')}`));
  const mine = answers.find((answer) => answer.responder_id === user.id);
  const answerForm = element('form', 'answer-form');
  const input = document.createElement('input');
  input.name = 'answer';
  input.maxLength = 500;
  input.placeholder = mine ? 'atualize sua resposta...' : 'escreva sua resposta...';
  input.required = true;
  input.setAttribute('aria-label', `Sua resposta para: ${question.question}`);
  const submit = element('button', 'shared-action', mine ? 'atualizar' : 'responder');
  submit.type = 'submit';
  answerForm.append(input, submit);
  answerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    const { error } = await client.from('couple_answers').upsert({ question_id: question.id, responder_id: user.id, answer: input.value.trim() }, { onConflict: 'question_id,responder_id' });
    if (error) {
      showStatus(status, `não consegui guardar sua resposta: ${error.message}`, 'error');
      submit.disabled = false;
      return;
    }
    showStatus(status, 'resposta guardada ♥');
    await reload();
  });
  card.append(answerForm);
  const answerList = element('div', 'answer-list');
  if (mine) answerList.append(answerItem('sua resposta', mine.answer));
  const theirs = answers.find((answer) => answer.responder_id !== user.id);
  if (theirs) answerList.append(answerItem('resposta do seu amor', theirs.answer));
  if (!mine || !theirs) {
    const progress = !mine && theirs
      ? 'seu amor já respondeu; falta a sua resposta.'
      : mine && !theirs
        ? 'sua resposta está guardada; seu amor ainda não respondeu.'
        : 'esta pergunta ainda está esperando as respostas de vocês.';
    answerList.append(element('p', 'answer-progress', progress));
  }
  card.append(answerList);
  if (question.created_by === user.id) {
    const remove = element('button', 'shared-action', 'remover pergunta');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!window.confirm('Remover esta pergunta e as respostas?')) return;
      const { error } = await client.from('couple_questions').delete().eq('id', question.id);
      if (error) showStatus(status, `não consegui remover a pergunta: ${error.message}`, 'error');
      await reload();
    });
    card.append(remove);
  }
  return card;
}

function answerItem(label, answer) {
  const item = element('div', 'answer-item');
  item.append(element('small', '', label), document.createTextNode(answer));
  return item;
}

function tableErrorMessage(error) {
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST200') return 'as tabelas ainda não foram criadas. Execute supabase/setup.sql no projeto Supabase.';
  if (error.code === '42501' || error.code === 'PGRST301') return 'o banco não autorizou esta ação. Confira o login e as regras do banco.';
  return 'não consegui sincronizar com o banco';
}
