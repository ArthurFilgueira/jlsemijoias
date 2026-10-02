import { SUBCAT_RULES, formatPrice, getBadge, getMaxInstallments, getSubcat, productThumb } from '../lib/product.js';
import { state, store } from '../store.js';
import { closeMobileNav } from './layout.js';
import { openModal } from './product-page.js';

export const grid = document.getElementById('productGrid');
export const emptyState = document.getElementById('emptyState');

export function buildCard(p){
  const badge = getBadge(p);
  const price = p.promo ?? p.price;
  const discount = p.promo ? Math.round(100-(p.promo/p.price*100)) : null;
  const colorVariants = p.variantAxes.color ? [...new Map(p.variants.map(v=>[v.color,v])).values()].filter(v=>v.img) : [];
  const galleryPhotos = (p.gallery||[]).filter(Boolean);
  const hasColorCarousel = colorVariants.length>1;
  const hasGalleryCarousel = !hasColorCarousel && galleryPhotos.length>1;
  const carouselType = hasColorCarousel ? 'color' : (hasGalleryCarousel ? 'gallery' : null);
  const carouselItems = hasColorCarousel
    ? colorVariants.map(v=>({img:v.img,label:v.color}))
    : (hasGalleryCarousel ? galleryPhotos.map((img,i)=>({img,label:`Foto ${i+1}`})) : []);
  const thumb = productThumb(p);
  const outOfStock = p.stock!=null && p.stock<=0;
  const lowStock = !outOfStock && p.stock!=null && p.minStock!=null && p.stock<=p.minStock;
  const n = getMaxInstallments(p);
  const card = document.createElement('article');
  card.className='card';
  card.innerHTML = `
    <div class="card-media${outOfStock?' is-out':''}">
      <div class="badges">
        ${outOfStock?`<span class="badge muted">Esgotado</span>`:(badge?`<span class="${badge.cls}">${badge.text}</span>`:'')}
        ${lowStock?`<span class="badge muted">Últimas unidades</span>`:''}
      </div>
      <div class="card-media-frame" data-open="${p.id}">
        ${carouselItems.length ? `
          <div class="mini-carousel" data-pid="${p.id}" data-type="${carouselType}">
            <div class="mini-track">
              ${carouselItems.map(it=>`<div class="mini-slide"><img src="${it.img}" alt="${p.name} - ${it.label}" loading="lazy"></div>`).join('')}
            </div>
            <div class="mini-dots">
              ${carouselItems.map((it,i)=>`<button class="mini-dot${i===0?' active':''}" data-idx="${i}" aria-label="${it.label}" title="${it.label}"></button>`).join('')}
            </div>
          </div>`
        : (thumb?`<img src="${thumb}" alt="${p.name}" loading="lazy">`:`<span class="card-placeholder">JL</span>`)}
      </div>
      <div class="card-actions">
        <button class="buy-btn" data-open="${p.id}" ${outOfStock?'disabled':''}>${outOfStock?'Indisponível':'Comprar'}</button>
        <button class="quick" data-open="${p.id}" aria-label="Ver detalhes" title="Ver detalhes"><svg width="18" height="18"><use href="#i-eye"/></svg></button>
      </div>
    </div>
    <div class="card-body">
      <h3 data-open="${p.id}">${p.name}</h3>
      <div class="price-row">
        ${p.promo?`<span class="price-old">R$ ${formatPrice(p.price)}</span>`:''}
        <span class="price-new">R$ ${formatPrice(price)}</span>
        ${discount?`<span class="price-off">-${discount}%</span>`:''}
      </div>
      ${n>1?`<span class="installment-hint">ou ${n}x de R$ ${formatPrice(price/n)} sem juros</span>`:''}
    </div>`;
  return card;
}

/* ===== catálogo: filtros, ordenação e "carregar mais" ===== */
export const PAGE_SIZE = 12;
export let visibleCount = PAGE_SIZE;
export let cardVariantIndex = {};

export function filteredProducts(){
  const q = state.search.trim().toLowerCase();
  let list = store.products.filter(p=>{
    if(state.cat!=='todos' && p.cat!==state.cat) return false;
    if(state.sub && getSubcat(p).key!==state.sub) return false;
    if(state.promoOnly && !p.promo) return false;
    if(q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });
  if(state.sort==='maior') list.sort((a,b)=>(b.promo??b.price)-(a.promo??a.price));
  if(state.sort==='menor') list.sort((a,b)=>(a.promo??a.price)-(b.promo??b.price));
  if(state.sort==='vendidos') list.sort((a,b)=>(b.featured-a.featured) || (b.order-a.order));
  if(state.sort==='recentes') list.sort((a,b)=>b.order-a.order);
  return list;
}

export function renderSubTabs(){
  const wrap = document.getElementById('subTabs');
  if(state.cat==='todos'){ wrap.innerHTML=''; return; }
  const subs = new Map();
  store.products.filter(p=>p.cat===state.cat).forEach(p=>{
    const s = getSubcat(p);
    if(s.label && !subs.has(s.key)) subs.set(s.key, s);
  });
  if(subs.size<2){ wrap.innerHTML=''; return; }
  wrap.innerHTML = `<button class="subtab${!state.sub?' active':''}" data-sub="">Todos</button>` +
    [...subs.values()].sort((a,b)=>a.order-b.order)
      .map(s=>`<button class="subtab${state.sub===s.key?' active':''}" data-sub="${s.key}">${s.label}</button>`).join('');
}

export function render(){
  renderCatTabs();
  renderSubTabs();
  const list = filteredProducts();
  grid.innerHTML='';
  cardVariantIndex = {};
  emptyState.classList.toggle('show', list.length===0);
  list.slice(0, visibleCount).forEach(p=>grid.appendChild(buildCard(p)));

  const countEl = document.getElementById('catalogCount');
  countEl.textContent = list.length ? `${list.length} ${list.length===1?'peça':'peças'}${state.promoOnly?' em promoção':''}` : '';

  const more = document.getElementById('catalogMore');
  if(list.length>visibleCount){
    const shown = Math.min(visibleCount, list.length);
    more.innerHTML = `
      <small>Você viu ${shown} de ${list.length} peças</small>
      <div class="progress"><span style="width:${Math.round(shown/list.length*100)}%"></span></div>
      <button class="btn btn-outline" id="loadMoreBtn">Carregar mais peças</button>`;
  }else{
    more.innerHTML = '';
  }
  renderShowcases();
}

export function renderCatTabs(){
  const tabsWrap = document.getElementById('catTabs');
  const isAll = state.cat==='todos' && !state.promoOnly;
  tabsWrap.innerHTML = `<button class="tab${isAll?' active':''}" data-cat="todos">Todos</button>` +
    store.categories.slice().sort((a,b)=>a.order-b.order).map(c=>`<button class="tab${state.cat===c.id&&!state.promoOnly?' active':''}" data-cat="${c.id}">${c.name}</button>`).join('') +
    (store.products.some(p=>p.promo) ? `<button class="tab${state.promoOnly?' active':''}" data-promo="1">Promoções</button>` : '');
}

/* ===== vitrines da home ===== */
export function fillShelf(id, list){
  const el = document.getElementById(id);
  const section = el.closest('section');
  section.style.display = list.length ? '' : 'none';
  el.innerHTML = '';
  list.forEach(p=>el.appendChild(buildCard(p)));
}
export function renderShowcases(){
  const byOrder = store.products.slice().sort((a,b)=>b.order-a.order);
  const withPhoto = p=>!!productThumb(p);
  let featured = byOrder.filter(p=>p.featured && withPhoto(p));
  if(featured.length<4) featured = featured.concat(byOrder.filter(p=>!p.featured && withPhoto(p))).slice(0,8);
  fillShelf('featuredShelf', featured.slice(0,12));
  fillShelf('launchShelf', byOrder.filter(p=>p.isLaunch).slice(0,12));
  fillShelf('promoShelf', byOrder.filter(p=>p.promo).sort((a,b)=>(b.featured-a.featured)).slice(0,12));

  const insta = document.getElementById('instaGrid');
  const photos = [...new Set(byOrder.filter(p=>p.featured).concat(byOrder).map(productThumb).filter(Boolean))].slice(0,6);
  insta.innerHTML = photos.map(src=>`
    <a class="insta-tile" href="https://www.instagram.com/jessicalaysa_acessorios/" target="_blank" rel="noopener" aria-label="Ver no Instagram">
      <img src="${src}" alt="" loading="lazy"><svg><use href="#i-ig"/></svg>
    </a>`).join('');
}

/* ===== filtros / busca / ordenação ===== */
document.getElementById('searchInput').addEventListener('input', e=>{ state.search=e.target.value; visibleCount=PAGE_SIZE; render(); });
document.getElementById('sortSelect').addEventListener('change', e=>{ state.sort=e.target.value; visibleCount=PAGE_SIZE; render(); });

export function handleCatLinkClick(a){
  const { cat, sub, promo } = a.dataset;
  if(promo){ state.promoOnly=true; state.cat='todos'; state.sub=null; }
  else if(cat){ state.cat=cat; state.sub=sub||null; state.promoOnly=false; }
  visibleCount = PAGE_SIZE;
  render();
  closeMobileNav();
}

/* ===== categorias da home (subcategorias de semi joias + demais categorias) ===== */
export function renderCatTeaser(){
  const wrap = document.getElementById('catTeaser');
  const tiles = [];
  const pickImg = list=>{ const best = list.find(p=>p.featured && productThumb(p)) || list.find(p=>productThumb(p)); return best ? productThumb(best) : null; };
  store.categories.slice().sort((a,b)=>a.order-b.order).forEach(c=>{
    const catProducts = store.products.filter(p=>p.cat===c.id);
    const rules = SUBCAT_RULES.filter(r=>r.cat===c.id);
    const groups = new Map();
    catProducts.forEach(p=>{ const s=getSubcat(p); if(!groups.has(s.key)) groups.set(s.key,{sub:s,items:[]}); groups.get(s.key).items.push(p); });
    // categorias com várias subcategorias (ex.: semi joias) viram um bloco por subcategoria
    if(rules.length && groups.size>1 && c.id==='semijoias'){
      [...groups.values()].filter(g=>g.sub.label).sort((a,b)=>a.sub.order-b.sub.order).forEach(g=>{
        tiles.push({name:g.sub.label, count:g.items.length, img:pickImg(g.items), attrs:`data-cat="${c.id}" data-sub="${g.sub.key}"`});
      });
    }else if(catProducts.length){
      tiles.push({name:c.name, count:catProducts.length, img:c.img || pickImg(catProducts), attrs:`data-cat="${c.id}"`});
    }
  });
  const promoCount = store.products.filter(p=>p.promo).length;
  const promoHtml = promoCount ? `
    <a href="#produtos" class="cat-tile promo-tile cat-link${tiles.length%4===2?' wide':''}" data-promo="1">
      <span class="promo-word">Promo&shy;ções</span>
      <div class="cat-tile-body">
        <div><h3>Condições especiais</h3><small>${promoCount} peças selecionadas</small></div>
        <span class="arrow"><svg width="16" height="16"><use href="#i-arrow"/></svg></span>
      </div>
    </a>` : '';
  wrap.innerHTML = tiles.map(t=>`
    <a href="#produtos" class="cat-tile cat-link" ${t.attrs}>
      ${t.img?`<img src="${t.img}" alt="${t.name}" loading="lazy">`:''}
      <div class="cat-tile-body">
        <div><h3>${t.name}</h3><small>${t.count} ${t.count===1?'peça':'peças'}</small></div>
        <span class="arrow"><svg width="16" height="16"><use href="#i-arrow"/></svg></span>
      </div>
    </a>`).join('') + promoHtml;
}

/* ===== cliques (delegados: funcionam também nos cards criados depois) ===== */
document.addEventListener('click', e=>{
  const dot = e.target.closest('.mini-carousel .mini-dot');
  if(dot){
    e.stopPropagation();
    const mc = dot.closest('.mini-carousel');
    const idx = Number(dot.dataset.idx);
    mc.querySelector('.mini-track').style.transform = `translateX(-${idx*100}%)`;
    mc.querySelectorAll('.mini-dot').forEach((d,i)=>d.classList.toggle('active', i===idx));
    cardVariantIndex[Number(mc.dataset.pid)] = {type:mc.dataset.type, idx};
    return;
  }
  const opener = e.target.closest('[data-open]');
  if(opener && !opener.disabled){
    const pid = Number(opener.dataset.open);
    const cv = cardVariantIndex[pid];
    openModal(pid, {colorIdx: cv&&cv.type==='color'?cv.idx:0, photoIdx: cv&&cv.type==='gallery'?cv.idx:0});
    return;
  }
  const shelfBtn = e.target.closest('.shelf-btn');
  if(shelfBtn){
    const shelf = document.getElementById(shelfBtn.dataset.shelf);
    shelf.scrollBy({left: Number(shelfBtn.dataset.dir)*shelf.clientWidth*0.8, behavior:'smooth'});
    return;
  }
  const catLink = e.target.closest('.cat-link');
  if(catLink){ handleCatLinkClick(catLink); return; }
  const tab = e.target.closest('#catTabs .tab');
  if(tab){ handleCatLinkClick(tab); return; }
  const subtab = e.target.closest('#subTabs .subtab');
  if(subtab){ state.sub = subtab.dataset.sub || null; visibleCount=PAGE_SIZE; render(); return; }
  if(e.target.closest('#loadMoreBtn')){ visibleCount += PAGE_SIZE; render(); }
});
