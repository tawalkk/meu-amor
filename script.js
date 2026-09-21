const relationshipStart = new Date('2026-08-20T00:00:00');
const today = new Date();
const daysTogether = Math.max(1, Math.floor((today - relationshipStart) / 86400000) + 1);

const daysElement = document.querySelector('#days-together');
const dateElement = document.querySelector('#relationship-date');
const summaryElement = document.querySelector('#relationship-summary');
const hoursElement = document.querySelector('#hours-together');
const minutesElement = document.querySelector('#minutes-together');
const secondsElement = document.querySelector('#seconds-together');
const relationshipTitleElement = document.querySelector('#relationship-title');

const footerPhrases = [
  'com carinho, sempre',
  'feito para o meu lugar favorito',
  'um amor que continua florescendo',
  'com você, todos os dias'
];

function addThemeToggle() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.querySelector('.theme-toggle')) return;

  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Ativar modo noturno');
  button.textContent = '☾';
  topbar.appendChild(button);

  const savedTheme = localStorage.getItem('meu-amor-theme');
  document.body.classList.toggle('night-mode', savedTheme === 'night');
  button.textContent = savedTheme === 'night' ? '☀' : '☾';

  button.addEventListener('click', () => {
    const isNight = document.body.classList.toggle('night-mode');
    localStorage.setItem('meu-amor-theme', isNight ? 'night' : 'day');
    button.textContent = isNight ? '☀' : '☾';
    button.setAttribute('aria-label', isNight ? 'Desativar modo noturno' : 'Ativar modo noturno');
  });
}

function applySpecialTheme() {
  const now = new Date();
  const isAnniversary = now.getMonth() === relationshipStart.getMonth() && now.getDate() === relationshipStart.getDate();
  document.body.classList.toggle('special-day', isAnniversary);
}

function addFooterPhrase() {
  const footer = document.querySelector('footer');
  if (!footer || footer.querySelector('.footer-phrase')) return;

  const phrase = document.createElement('span');
  phrase.className = 'footer-phrase';
  footer.appendChild(phrase);
  let phraseIndex = 0;
  const updatePhrase = () => {
    phrase.textContent = footerPhrases[phraseIndex];
    phraseIndex = (phraseIndex + 1) % footerPhrases.length;
  };
  updatePhrase();
  setInterval(updatePhrase, 5000);
}

function addHeartRainLink() {
  const footer = document.querySelector('footer');
  if (!footer || footer.querySelector('.footer-special-link')) return;
  const link = document.createElement('a');
  link.className = 'footer-special-link';
  link.href = 'chuva.html';
  link.textContent = 'chuva de carinho';
  footer.appendChild(link);
}

function addNextAnniversary() {
  const main = document.querySelector('#inicio');
  const homeLinks = main?.querySelector('.home-links');
  if (!main || !homeLinks || main.querySelector('.next-anniversary')) return;

  const now = new Date();
  const nextDate = new Date(now.getFullYear(), now.getMonth(), relationshipStart.getDate());
  if (nextDate <= now) nextDate.setMonth(nextDate.getMonth() + 1);

  const card = document.createElement('section');
  card.className = 'next-anniversary section-wrap';
  card.innerHTML = '<span class="next-anniversary-icon">✦</span><div><small>próximo mês de namoro</small><strong class="next-anniversary-countdown">calculando...</strong></div><span class="next-anniversary-date"></span>';
  main.insertBefore(card, homeLinks);

  const countdown = card.querySelector('.next-anniversary-countdown');
  const dateLabel = card.querySelector('.next-anniversary-date');
  dateLabel.textContent = nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const updateCountdown = () => {
    const remaining = Math.max(0, nextDate.getTime() - Date.now());
    const days = Math.ceil(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    countdown.textContent = `${days} dias, ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  };
  updateCountdown();
  setInterval(updateCountdown, 60000);
}

function addGalleryLightbox() {
  const images = document.querySelectorAll('.photo-placeholder img');
  if (!images.length || document.querySelector('.lightbox')) return;

  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button type="button" class="lightbox-close" aria-label="Fechar imagem">×</button><img alt="" />';
  document.body.appendChild(lightbox);
  const lightboxImage = lightbox.querySelector('img');
  const close = () => lightbox.classList.remove('is-open');

  images.forEach((image) => image.addEventListener('click', () => {
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightbox.classList.add('is-open');
  }));
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target === lightbox.querySelector('.lightbox-close')) close();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

function addLetterSharing() {
  const letter = document.querySelector('.letter');
  const surpriseButton = document.querySelector('#surprise-button');
  if (!letter || !surpriseButton || letter.querySelector('.share-letter')) return;

  const button = document.createElement('button');
  button.className = 'share-letter';
  button.type = 'button';
  button.textContent = '↗ compartilhar minha cartinha';
  surpriseButton.insertAdjacentElement('afterend', button);
  button.addEventListener('click', async () => {
    const shareData = { title: 'Minha cartinha de amor', text: 'Uma cartinha feita com carinho para você ♥', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      button.textContent = navigator.share ? 'cartinha compartilhada ♥' : 'link copiado ♥';
    } catch {
      button.textContent = 'compartilhamento cancelado';
    }
    setTimeout(() => { button.textContent = '↗ compartilhar minha cartinha'; }, 2500);
  });
}

function addGenericConfetti() {
  document.querySelectorAll('button:not(.theme-toggle)').forEach((button) => {
    if (button.id === 'surprise-button' || button.dataset.confettiReady) return;
    button.dataset.confettiReady = 'true';
    button.addEventListener('click', () => {
      for (let index = 0; index < 8; index += 1) {
        const particle = document.createElement('span');
        particle.textContent = index % 2 ? '✦' : '♥';
        particle.className = 'click-confetti';
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = '62vh';
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1200);
      }
    });
  });
}
if (dateElement) dateElement.textContent = relationshipStart.toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).replaceAll('/', '.');

function getElapsedYearsMonthsDays(now = new Date()) {
  let years = now.getFullYear() - relationshipStart.getFullYear();
  let months = now.getMonth() - relationshipStart.getMonth();
  let days = now.getDate() - relationshipStart.getDate();

  if (days < 0) {
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += previousMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    years = 0;
    months = 0;
    days = 0;
  }

  return { years, months, days };
}

function updateRelationshipTitle() {
  if (!relationshipTitleElement) return;

  const { years, months, days } = getElapsedYearsMonthsDays();
  const totalMonths = Math.max(1, years * 12 + months);
  const monthNames = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono', 'décimo', 'décimo primeiro', 'décimo segundo'];
  const monthLabel = monthNames[totalMonths - 1] || `${totalMonths}º`;
  relationshipTitleElement.innerHTML = `Nosso ${monthLabel}<br /><em>mês</em> juntinhos.`;
}

function updateLiveCounter() {
  const elapsedMilliseconds = Math.max(0, Date.now() - relationshipStart.getTime());
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
  const totalDays = Math.floor(elapsedSeconds / 86400);
  const hours = Math.floor((elapsedSeconds % 86400) / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const { years, months, days } = getElapsedYearsMonthsDays();

  if (daysElement) daysElement.textContent = totalDays + 1;
  if (summaryElement) {
    const yearLabel = years === 1 ? 'ano' : 'anos';
    const monthLabel = months === 1 ? 'mês' : 'meses';

    if (years > 0 && months > 0) {
      summaryElement.textContent = `${years} ${yearLabel} e ${months} ${monthLabel}`;
    } else if (years > 0) {
      summaryElement.textContent = `${years} ${yearLabel}`;
    } else if (months > 0) {
      summaryElement.textContent = `${months} ${monthLabel}`;
    } else {
      summaryElement.textContent = `${days} dia${days === 1 ? '' : 's'}`;
    }
  }

  if (hoursElement) hoursElement.textContent = String(hours).padStart(2, '0');
  if (minutesElement) minutesElement.textContent = String(minutes).padStart(2, '0');
  if (secondsElement) secondsElement.textContent = String(seconds).padStart(2, '0');
}

updateLiveCounter();
updateRelationshipTitle();
setInterval(updateLiveCounter, 1000);

const surpriseButton = document.querySelector('#surprise-button');
const toast = document.querySelector('#toast');
surpriseButton?.addEventListener('click', () => {
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
  for (let index = 0; index < 16; index += 1) {
    const heart = document.createElement('span');
    heart.textContent = index % 2 ? '✦' : '♥';
    heart.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:58vh;color:${index % 2 ? '#f5c842' : '#f45d9b'};font-size:${12 + Math.random() * 18}px;z-index:4;pointer-events:none;animation:burst 1.5s ease-out forwards;`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1500);
  }
});

const style = document.createElement('style');
style.textContent = '@keyframes burst{to{transform:translateY(-180px) translateX(calc((var(--x, 0) - 50) * 1px)) rotate(180deg);opacity:0}}';
document.head.appendChild(style);

const musicKey = 'meu-amor-music';
const musicFile = 'Vietsub  Last Night On Earth - Green Day  Lyrics Video - Vietsub Mỗi Ngày (youtube).mp3';
const musicState = JSON.parse(sessionStorage.getItem(musicKey) || localStorage.getItem(musicKey) || '{"playing":false,"time":0}');
const musicAudio = new Audio(musicFile);
musicAudio.loop = true;
musicAudio.preload = 'auto';
musicAudio.load();

const musicPlayer = document.createElement('div');
musicPlayer.className = 'music-player';
musicPlayer.setAttribute('aria-label', 'Player de música');
musicPlayer.innerHTML = '<div class="music-player-cover">♥</div><button type="button" aria-label="Tocar música"><span class="music-player-icon">▶</span></button><span class="music-player-info"><span class="music-player-title">Last Night On Earth</span><span class="music-player-status">música do nosso amor</span><input class="music-player-progress" type="range" min="0" max="100" value="0" aria-label="Progresso da música" /></span><label class="music-player-volume" aria-label="Volume">⌁<input type="range" min="0" max="1" step="0.01" value="0.7" /></label>';
document.body.appendChild(musicPlayer);

const musicButton = musicPlayer.querySelector('button');
const musicIcon = musicPlayer.querySelector('.music-player-icon');
const musicStatus = musicPlayer.querySelector('.music-player-status');
const musicProgress = musicPlayer.querySelector('.music-player-progress');
const musicVolume = musicPlayer.querySelector('.music-player-volume input');
musicAudio.volume = Number(musicVolume.value);

function saveMusicState() {
  const state = {
    playing: !musicAudio.paused,
    time: Number.isFinite(musicAudio.currentTime) ? musicAudio.currentTime : 0,
  };

  musicState.playing = state.playing;
  musicState.time = state.time;

  sessionStorage.setItem(musicKey, JSON.stringify(state));
  localStorage.setItem(musicKey, JSON.stringify(state));
}

function updateMusicUi() {
  const playing = !musicAudio.paused;
  musicPlayer.classList.toggle('is-playing', playing);
  musicIcon.textContent = playing ? 'Ⅱ' : '▶';
  musicButton.setAttribute('aria-label', playing ? 'Pausar música' : 'Tocar música');
  musicStatus.textContent = playing ? 'tocando agora' : 'pausada';
}

function resumeMusicIfNeeded() {
  if (!musicState.playing || musicAudio.paused === false) {
    return;
  }

  if (musicAudio.readyState >= 2) {
    if (musicState.time > 0 && musicAudio.duration && musicState.time < musicAudio.duration) {
      musicAudio.currentTime = musicState.time;
    }

    musicAudio.play().catch(() => {
      musicStatus.textContent = 'clique para liberar o áudio';
    });
  }
}

musicButton.addEventListener('click', async () => {
  if (musicAudio.paused) {
    if (musicState.time > 0 && musicAudio.duration && musicState.time < musicAudio.duration) {
      musicAudio.currentTime = musicState.time;
    }

    try {
      await musicAudio.play();
    } catch {
      musicStatus.textContent = 'clique para liberar o áudio';
      return;
    }
  } else {
    musicAudio.pause();
  }

  saveMusicState();
  updateMusicUi();
});

musicAudio.addEventListener('play', () => {
  musicState.playing = true;
  updateMusicUi();
});

musicAudio.addEventListener('pause', () => {
  musicState.playing = false;
  saveMusicState();
  updateMusicUi();
});

musicAudio.addEventListener('timeupdate', saveMusicState);
musicAudio.addEventListener('timeupdate', () => {
  if (musicAudio.duration) musicProgress.value = String((musicAudio.currentTime / musicAudio.duration) * 100);
});
musicAudio.addEventListener('loadedmetadata', () => { musicProgress.max = '100'; });
musicProgress.addEventListener('input', () => {
  if (musicAudio.duration) musicAudio.currentTime = (Number(musicProgress.value) / 100) * musicAudio.duration;
});
musicVolume.addEventListener('input', () => { musicAudio.volume = Number(musicVolume.value); });

musicAudio.addEventListener('loadedmetadata', () => {
  if (musicState.time > 0 && musicState.time < (musicAudio.duration || Number.POSITIVE_INFINITY)) {
    musicAudio.currentTime = musicState.time;
  }

  if (musicState.playing) {
    resumeMusicIfNeeded();
  }
});

musicAudio.addEventListener('canplay', () => {
  if (musicState.playing) {
    resumeMusicIfNeeded();
  }
});

window.addEventListener('pagehide', saveMusicState);
window.addEventListener('pageshow', () => {
  if (musicState.playing && musicAudio.paused) {
    resumeMusicIfNeeded();
  }
});

updateMusicUi();
addThemeToggle();
applySpecialTheme();
addFooterPhrase();
addHeartRainLink();
addNextAnniversary();
addGalleryLightbox();
addLetterSharing();
addGenericConfetti();