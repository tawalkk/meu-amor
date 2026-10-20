import { createClient } from '@supabase/supabase-js';

const section = document.querySelector('[data-home-moments]');
const config = window.MeuAmorSupabaseConfig;

if (section) {
  const track = section.querySelector('[data-home-moments-track]');
  const dots = section.querySelector('[data-home-moments-dots]');
  const status = section.querySelector('[data-home-moments-status]');
  const previousButton = section.querySelector('[data-home-moments-prev]');
  const nextButton = section.querySelector('[data-home-moments-next]');
  const staticMoments = [
    { src: 'assets/images/WhatsApp Image 2026-09-20 at 20.42.50.jpeg', caption: 'aquele sorriso', alt: 'Casal abraçado no sofá' },
    { src: 'assets/images/WhatsApp Image 2026-09-20 at 20.42.51.jpeg', caption: 'dias leves', alt: 'Casal trocando um beijo' },
    { src: 'assets/images/WhatsApp Image 2026-09-20 at 20s.42.50.jpeg', caption: 'meu lugar', alt: 'Casal junto no computador' },
    { src: 'assets/images/WhatsApp Image 2026-10-04 at 12.18.10.jpeg', caption: 'mais um pedacinho', alt: 'Uma lembrança especial do casal' },
    { src: 'assets/images/WhatsApp Image 2026-10-09 at 19.39.15.jpeg', caption: 'do seu lado', alt: 'Uma lembrança especial do casal' },
    { src: 'assets/images/WhatsApp Image 2026-10-12 at 20.12.01.jpeg', caption: 'nós dois', alt: 'Uma lembrança especial do casal' },
    { src: 'assets/images/WhatsApp Image 2026-10-16 at 15.13.24.jpeg', caption: 'mais uma memória', alt: 'Uma lembrança especial do casal' },
  ];
  let slides = [];
  let activeIndex = 0;
  let scrollFrame = 0;

  const goTo = (index) => {
    if (!slides.length) return;
    activeIndex = (index + slides.length) % slides.length;
    slides[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    updateControls();
  };

  const updateControls = () => {
    [...dots.children].forEach((dot, index) => {
      if (index === activeIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    status.textContent = slides.length ? `Foto ${activeIndex + 1} de ${slides.length}` : '';
  };

  const render = (items) => {
    slides = items.map((moment, index) => {
      const slide = document.createElement('figure');
      slide.className = 'home-moment-slide';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `Foto ${index + 1} de ${items.length}`);

      const image = document.createElement('img');
      image.src = moment.src;
      image.alt = moment.alt || moment.caption || 'Lembrança especial do casal';
      image.loading = index < 3 ? 'eager' : 'lazy';
      image.decoding = 'async';
      slide.append(image);

      const caption = document.createElement('figcaption');
      caption.className = 'home-moment-caption';
      const title = document.createElement('strong');
      title.textContent = moment.caption || 'um momento nosso';
      const subtitle = document.createElement('span');
      subtitle.textContent = moment.isShared ? 'do nosso álbum compartilhado' : 'um pedacinho da nossa história';
      caption.append(title, subtitle);
      slide.append(caption);
      return slide;
    });
    track.replaceChildren(...slides);
    dots.replaceChildren(...items.map((moment, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'home-moments-dot';
      dot.setAttribute('aria-label', `Mostrar foto ${index + 1}: ${moment.caption || 'momento do casal'}`);
      dot.addEventListener('click', () => goTo(index));
      return dot;
    }));
    activeIndex = 0;
    section.hidden = !slides.length;
    const showControls = slides.length > 1;
    previousButton.hidden = !showControls;
    nextButton.hidden = !showControls;
    dots.hidden = !showControls;
    updateControls();
  };

  const getSharedMoments = async () => {
    if (!config?.url || !config?.anonKey) return [];
    const client = createClient(config.url, config.anonKey);
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session?.user) return [];

    const { data: isMember, error: membershipError } = await client.rpc('is_couple_member');
    if (membershipError || !isMember) return [];

    const { data, error } = await client
      .from('couple_photos')
      .select('object_path,caption')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error || !data?.length) return [];

    const uniquePhotos = [...new Map(data.map((photo) => [photo.object_path, photo])).values()];
    return (await Promise.all(uniquePhotos.map(async (photo) => {
      const { data: image, error: imageError } = await client.storage
        .from('couple-moments')
        .createSignedUrl(photo.object_path, 3600);
      if (imageError || !image?.signedUrl) return null;
      return {
        src: image.signedUrl,
        caption: photo.caption || 'um momento nosso',
        alt: photo.caption || 'Lembrança compartilhada do casal',
        isShared: true,
      };
    }))).filter(Boolean);
  };

  previousButton.addEventListener('click', () => goTo(activeIndex - 1));
  nextButton.addEventListener('click', () => goTo(activeIndex + 1));
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(activeIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(activeIndex - 1); }
  });
  track.addEventListener('scroll', () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
      const nextIndex = slides.reduce((closest, slide, index) => {
        const distance = Math.abs(slide.getBoundingClientRect().left + slide.offsetWidth / 2 - trackCenter);
        const bestDistance = Math.abs(slides[closest].getBoundingClientRect().left + slides[closest].offsetWidth / 2 - trackCenter);
        return distance < bestDistance ? index : closest;
      }, 0);
      if (nextIndex !== activeIndex) {
        activeIndex = nextIndex;
        updateControls();
      }
    });
  }, { passive: true });

  render(staticMoments);
  getSharedMoments()
    .then((sharedMoments) => { if (sharedMoments.length) render([...sharedMoments, ...staticMoments]); })
    .catch(() => {});
}
