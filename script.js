const relationshipStart = new Date('2026-08-20T00:00:00');
const today = new Date();
const daysTogether = Math.max(1, Math.floor((today - relationshipStart) / 86400000) + 1);

const daysElement = document.querySelector('#days-together');
const dateElement = document.querySelector('#relationship-date');
const hoursElement = document.querySelector('#hours-together');
const minutesElement = document.querySelector('#minutes-together');
const secondsElement = document.querySelector('#seconds-together');
if (dateElement) dateElement.textContent = relationshipStart.toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).replaceAll('/', '.');

function updateLiveCounter() {
  const elapsedMilliseconds = Math.max(0, Date.now() - relationshipStart.getTime());
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
  const totalDays = Math.floor(elapsedSeconds / 86400);
  const hours = Math.floor((elapsedSeconds % 86400) / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  if (daysElement) daysElement.textContent = totalDays + 1;
  if (hoursElement) hoursElement.textContent = String(hours).padStart(2, '0');
  if (minutesElement) minutesElement.textContent = String(minutes).padStart(2, '0');
  if (secondsElement) secondsElement.textContent = String(seconds).padStart(2, '0');
}

updateLiveCounter();
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
musicPlayer.innerHTML = '<button type="button" aria-label="Tocar música"><span class="music-player-icon">▶</span></button><span class="music-player-info"><span class="music-player-title">Last Night On Earth</span><span class="music-player-status">música do nosso amor</span></span>';
document.body.appendChild(musicPlayer);

const musicButton = musicPlayer.querySelector('button');
const musicIcon = musicPlayer.querySelector('.music-player-icon');
const musicStatus = musicPlayer.querySelector('.music-player-status');

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