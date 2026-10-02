import { store } from '../store.js';

/* ===== hero carousel ===== */
export const DEFAULT_HERO_PHOTOS = [
  {img:"Fotos Oculos/WhatsApp Image 2026-07-31 at 14.59.54 (4).jpeg", alt:"Cliente usando óculos e brinco Jéssica Laysa"},
  {img:"Fotos Oculos/WhatsApp Image 2026-07-31 at 14.59.54.jpeg", alt:"Óculos solar em detalhe"},
  {img:"Fotos Oculos/WhatsApp Image 2026-07-31 at 14.59.56 (3).jpeg", alt:"Cliente usando óculos oval Jéssica Laysa"},
  {img:"Fotos Oculos/WhatsApp Image 2026-07-31 at 14.59.58 (3).jpeg", alt:"Cliente usando óculos retangular Jéssica Laysa"},
  {img:"Fotos Oculos/WhatsApp Image 2026-07-31 at 15.00.00 (1).jpeg", alt:"Brincos e óculos Jéssica Laysa"},
  {img:"Fotos Oculos/WhatsApp Image 2026-07-31 at 14.59.59 (1).jpeg", alt:"Óculos e colar dourado Jéssica Laysa"},
];

export function renderHeroCarousel(){
  const track = document.getElementById('carouselTrack');
  const activeBanners = store.banners.filter(b=>b.active).sort((a,b)=>a.order-b.order);
  if(activeBanners.length>0){
    track.innerHTML = activeBanners.map((b,i)=>`
      <div class="carousel-slide">
        <picture>
          ${b.imgMobile?`<source media="(max-width:720px)" srcset="${b.imgMobile}">`:''}
          <img src="${b.imgDesktop}" alt="${b.title||''}" ${i===0?'fetchpriority="high"':'loading="lazy"'}>
        </picture>
        ${(b.title||b.subtitle)?`
          <div class="banner-overlay">
            ${b.title?`<h3 class="serif">${b.title}</h3>`:''}
            ${b.subtitle?`<p>${b.subtitle}</p>`:''}
            ${(b.btnText&&b.btnLink)?`<a class="btn btn-gold btn-sm" href="${b.btnLink}" target="_blank" rel="noopener">${b.btnText}</a>`:''}
          </div>`:''}
      </div>`).join('');
  }else{
    track.innerHTML = DEFAULT_HERO_PHOTOS.map((p,i)=>`<div class="carousel-slide"><img src="${p.img}" alt="${p.alt}" ${i===0?'fetchpriority="high"':'loading="lazy"'}></div>`).join('');
  }
}

export let heroTimer;
export function initHeroCarousel(){
  const wrap = document.getElementById('heroCarousel');
  const track = document.getElementById('carouselTrack');
  const dotsWrap = document.getElementById('carouselDots');
  if(!wrap || !track) return;
  renderHeroCarousel();
  track.style.transform = '';
  const total = track.children.length;
  let current = 0;
  clearInterval(heroTimer);

  dotsWrap.innerHTML = '';
  for(let i=0;i<total;i++){
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i===0?' active':'');
    dot.setAttribute('aria-label', `Ir para foto ${i+1}`);
    dot.addEventListener('click', ()=>{ goTo(i); restart(); });
    dotsWrap.appendChild(dot);
  }

  function goTo(i){
    current = (i+total)%total;
    track.style.transform = `translateX(-${current*100}%)`;
    dotsWrap.querySelectorAll('.carousel-dot').forEach((d,idx)=>d.classList.toggle('active', idx===current));
  }
  function restart(){
    clearInterval(heroTimer);
    heroTimer = setInterval(()=>goTo(current+1), 4500);
  }

  /* onclick/onmouse* (em vez de addEventListener) para poder reinicializar sem duplicar eventos */
  document.getElementById('carouselNext').onclick = ()=>{ goTo(current+1); restart(); };
  document.getElementById('carouselPrev').onclick = ()=>{ goTo(current-1); restart(); };
  wrap.onmouseenter = ()=>clearInterval(heroTimer);
  wrap.onmouseleave = restart;

  restart();
}
