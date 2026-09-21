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