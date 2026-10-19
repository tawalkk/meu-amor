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
  const status = element('p', 'shared-status', 'conferindo o acesso ao nosso cantinho...');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(status);

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

  const load = async () => {
    const { data, error } = await client.from(feature.table).select('*').order(feature.order, { ascending: feature.ascending }).limit(200);
    if (error) {
      showStatus(status, `${tableErrorMessage(error)} (${error.message})`, 'error');
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
    await load();
  });
  void load();
  client.channel(`shared-${feature.table}`).on('postgres_changes', { event: '*', schema: 'public', table: feature.table }, () => { void load(); }).subscribe();
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
  if (theirs && mine) answerList.append(answerItem('resposta do seu amor', theirs.answer));
  if (answerList.childElementCount) card.append(answerList);
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
