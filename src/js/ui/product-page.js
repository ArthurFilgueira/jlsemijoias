import { WHATSAPP_NUMBER } from '../config.js';
import { categoryName } from '../data/api.js';
import { distinctAxisValues, findVariant, formatPrice, getMaxInstallments, getSubcat, installmentLabel, productPhotos, productThumb, variantEffectiveOldPrice, variantEffectivePrice, variantEffectiveSku, variantEffectiveStock, waLink } from '../lib/product.js';
import { store } from '../store.js';
import { buildCard } from './catalog.js';
import { closeMobileNav } from './layout.js';

/* ===== página do produto (overlay) ===== */
export const modalOverlay = document.getElementById('modalOverlay');
export const modalBody = document.getElementById('modalBody');
export const modalRelated = document.getElementById('modalRelated');
export let modalState = { productId:null, sel:{color:null,size:null,model:null}, installments:1 };

export function waQuestionLink(p){
  const msg = `Olá! Tenho uma dúvida sobre a peça *${p.name}*.\nLink: ${location.href.split('#')[0]}#produto-${p.id}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function renderModalBody(p){
  const variant = findVariant(p, modalState.sel);
  const price = variantEffectivePrice(p, variant);
  const oldPrice = variantEffectiveOldPrice(p, variant);
  const discount = oldPrice ? Math.round(100-(price/oldPrice*100)) : null;
  const maxN = getMaxInstallments(p);
  const stock = variantEffectiveStock(p, variant);
  const sku = variantEffectiveSku(p, variant);
  const sub = getSubcat(p);
  const isJewel = p.cat==='semijoias';

  let axesHtml = '';
  if(p.variantAxes.color){
    const values = distinctAxisValues(p,'color');
    if(values.length>1){
      axesHtml += `<div class="color-select">
        <span class="color-label">Cor: <strong>${modalState.sel.color}</strong></span>
        <div class="swatches">
          ${values.map(val=>{
            const v = p.variants.find(x=>x.color===val);
            return `<button class="swatch${modalState.sel.color===val?' active':''}" style="background:${v.hex||'#ccc'}" data-axis="color" data-val="${val}" aria-label="Cor ${val}" title="${val}"></button>`;
          }).join('')}
        </div>
      </div>`;
    }
  }
  [['size','Tamanho'],['model','Modelo']].forEach(([axis,label])=>{
    if(p.variantAxes[axis]){
      const values = distinctAxisValues(p,axis);
      if(values.length>1){
        axesHtml += `<div class="installment-select">
          <label>${label}</label>
          <select data-axis="${axis}">
            ${values.map(val=>`<option value="${val}" ${modalState.sel[axis]===val?'selected':''}>${val}</option>`).join('')}
          </select>
        </div>`;
      }
    }
  });

  const installOptions = Array.from({length:maxN},(_,i)=>i+1)
    .map(n=>`<option value="${n}" ${n===modalState.installments?'selected':''}>${installmentLabel(price,n)}</option>`).join('');

  const outOfStock = stock!=null && stock<=0;
  const lowStock = !outOfStock && stock!=null && p.minStock!=null && stock<=p.minStock;
  const stockNote = lowStock ? `<p style="font-size:.78rem;color:var(--gold-deep);font-weight:600;margin:-6px 0 18px;">Últimas ${stock} unidades</p>` : '';

  const materialHtml = isJewel
    ? `<ul><li>Banho de ouro 18k</li><li>Verniz protetor para maior durabilidade</li><li>Evite contato com perfumes, cremes, água do mar e piscina</li><li>Guarde separadamente, em local seco</li></ul>`
    : `<ul><li>Limpe com flanela macia, sem produtos abrasivos</li><li>Guarde no estojo para evitar riscos</li><li>Evite deixar exposto ao calor intenso</li></ul>`;

  return `
    <span class="crumb">${categoryName(p.cat)}${sub.label?` · ${sub.label}`:''}</span>
    <h3>${p.name}</h3>
    <div class="meta">
      <span class="${outOfStock?'':'ok'}">${outOfStock?'Esgotado nesta variação':'Em estoque'}</span>
      ${sku?`<span>Cód. ${sku}</span>`:''}
      ${p.brand?`<span>${p.brand}</span>`:''}
    </div>
    <div class="modal-price">
      <div class="price-row">
        <span class="price-new">R$ ${formatPrice(price)}</span>
        ${oldPrice?`<span class="price-old">R$ ${formatPrice(oldPrice)}</span>`:''}
        ${discount?`<span class="price-off">-${discount}%</span>`:''}
      </div>
      <p class="pix">${maxN>1?`ou em até <strong>${maxN}x de R$ ${formatPrice(price/maxN)}</strong> sem juros`:'Pagamento à vista'}</p>
    </div>
    ${p.shortDesc && p.shortDesc!==p.fullDesc ? `<p class="desc">${p.shortDesc}</p>` : ''}
    ${axesHtml}
    ${stockNote}
    <div class="installment-select">
      <label for="installmentSelect">Parcelamento</label>
      <select id="installmentSelect">${installOptions}</select>
    </div>
    <div class="modal-ctas">
      <a class="btn btn-wa btn-block" id="waConfirmBtn" href="${waLink(p,variant,modalState.installments)}" target="_blank" rel="noopener" style="${outOfStock?'pointer-events:none;opacity:.45;':''}"><svg><use href="#i-wa"/></svg>${outOfStock?'Indisponível':'Comprar pelo WhatsApp'}</a>
      <a class="btn btn-wa-outline btn-block" href="${waQuestionLink(p)}" target="_blank" rel="noopener">Tirar dúvidas com a Jéssica</a>
    </div>
    <div class="modal-assurance">
      <div><svg><use href="#i-shield"/></svg>Garantia de 1 ano</div>
      <div><svg><use href="#i-truck"/></svg>Envio para todo o Brasil</div>
      <div><svg><use href="#i-lock"/></svg>Compra segura</div>
    </div>
    <div class="accordion">
      <details open><summary>Descrição</summary><div class="acc-body">${p.fullDesc||p.shortDesc||'Peça da curadoria Jéssica Laysa.'}</div></details>
      <details><summary>${isJewel?'Material e cuidados':'Cuidados'}</summary><div class="acc-body">${materialHtml}</div></details>
      <details><summary>Garantia</summary><div class="acc-body">Garantia de 1 ano contra defeitos de fabricação. Não cobre danos por mau uso, contato com produtos químicos, perfumes, água do mar, piscina ou desgaste natural pelo uso.</div></details>
      <details><summary>Pagamento</summary><div class="acc-body"><ul>${maxN>1?`<li>Parcelamento em até ${maxN}x sem juros</li>`:''}<li>Formas de pagamento combinadas no atendimento pelo WhatsApp</li><li>Pedido confirmado diretamente com a loja</li></ul></div></details>
      <details><summary>Entrega</summary><div class="acc-body"><ul><li>Enviamos para todo o Brasil</li><li>Prazo e frete informados no atendimento, de acordo com o seu CEP</li><li>Embalagem cuidadosa, pronta para presentear</li></ul></div></details>
    </div>
  `;
}

export function modalPhotos(p){
  const variant = findVariant(p, modalState.sel);
  const photos = productPhotos(p);
  const vImg = variant && variant.img;
  if(vImg && !photos.includes(vImg)) photos.unshift(vImg);
  return photos;
}

export function updateModalMedia(p){
  const modalMedia = document.querySelector('.modal-media');
  const photos = modalPhotos(p);
  if(!photos.length){
    modalMedia.className = 'modal-media single';
    modalMedia.innerHTML = `<div class="modal-media-frame" style="cursor:default;"><span class="card-placeholder">JL</span></div>`;
    return;
  }
  if(modalState.photoIndex==null || modalState.photoIndex>=photos.length) modalState.photoIndex=0;
  const multiple = photos.length>1;
  modalMedia.className = 'modal-media' + (multiple?'':' single');
  modalMedia.innerHTML = `
    ${multiple?`<div class="modal-thumbs">${photos.map((src,i)=>`<button class="modal-thumb${i===modalState.photoIndex?' active':''}" data-idx="${i}" aria-label="Foto ${i+1}"><img src="${src}" alt=""></button>`).join('')}</div>`:''}
    <div class="modal-media-frame">
      <img src="${photos[modalState.photoIndex]}" alt="${p.name}">
      <span class="zoom-hint">Passe o mouse para ampliar</span>
      ${multiple?`
        <button class="carousel-arrow prev" id="modalPrev" aria-label="Foto anterior"><svg width="16" height="16"><use href="#i-left"/></svg></button>
        <button class="carousel-arrow next" id="modalNext" aria-label="Próxima foto"><svg width="16" height="16"><use href="#i-right"/></svg></button>`:''}
    </div>`;
  const go = i=>{ modalState.photoIndex=(i+photos.length)%photos.length; updateModalMedia(p); };
  if(multiple){
    modalMedia.querySelector('#modalPrev').addEventListener('click', e=>{ e.stopPropagation(); go(modalState.photoIndex-1); });
    modalMedia.querySelector('#modalNext').addEventListener('click', e=>{ e.stopPropagation(); go(modalState.photoIndex+1); });
    modalMedia.querySelectorAll('.modal-thumb').forEach(t=>t.addEventListener('click', ()=>go(Number(t.dataset.idx))));
  }
  // zoom: acompanha o mouse no desktop; toque alterna no celular
  const frame = modalMedia.querySelector('.modal-media-frame');
  const img = frame.querySelector('img');
  const setOrigin = e=>{
    const r = frame.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%`;
  };
  frame.addEventListener('mouseenter', e=>{ if(matchMedia('(hover:hover)').matches){ setOrigin(e); frame.classList.add('zooming'); } });
  frame.addEventListener('mousemove', setOrigin);
  frame.addEventListener('mouseleave', ()=>frame.classList.remove('zooming'));
  frame.addEventListener('click', e=>{
    if(e.target.closest('.carousel-arrow') || matchMedia('(hover:hover)').matches) return;
    setOrigin(e); frame.classList.toggle('zooming');
  });
}

export function renderRelated(p){
  const sub = getSubcat(p).key;
  let related = store.products.filter(x=>x.id!==p.id && x.cat===p.cat && getSubcat(x).key===sub);
  if(related.length<4) related = related.concat(store.products.filter(x=>x.id!==p.id && x.cat===p.cat && !related.includes(x)));
  related = related.sort((a,b)=>(!!productThumb(b))-(!!productThumb(a)) || (b.featured-a.featured)).slice(0,4);
  if(!related.length){ modalRelated.style.display='none'; return; }
  modalRelated.style.display='';
  modalRelated.innerHTML = `<h4>Você também pode gostar</h4><div class="product-grid"></div>`;
  const g = modalRelated.querySelector('.product-grid');
  related.forEach(x=>g.appendChild(buildCard(x)));
}

export function attachModalEvents(p){
  modalBody.querySelectorAll('.swatch').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      modalState.sel[btn.dataset.axis] = btn.dataset.val;
      modalState.photoIndex = 0;
      refreshModal(p);
    });
  });
  modalBody.querySelectorAll('select[data-axis]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      modalState.sel[sel.dataset.axis] = sel.value;
      refreshModal(p);
    });
  });
  document.getElementById('installmentSelect').addEventListener('change', e=>{
    modalState.installments = Number(e.target.value);
    refreshModal(p);
  });
}

export function refreshModal(p){
  const open = [...modalBody.querySelectorAll('.accordion details')].map(d=>d.open);
  modalBody.innerHTML = renderModalBody(p);
  if(open.length) modalBody.querySelectorAll('.accordion details').forEach((d,i)=>d.open=open[i]);
  updateModalMedia(p);
  attachModalEvents(p);
}

export function openModal(id, opts={}){
  const p = store.products.find(x=>x.id===id);
  if(!p) return;
  const colorVariantIndex = opts.colorIdx || 0;
  let initialColor = p.variants[0]?.color ?? null;
  if(p.variantAxes.color){
    const withImg = [...new Map(p.variants.map(v=>[v.color,v])).values()].filter(v=>v.img);
    if(withImg[colorVariantIndex]) initialColor = withImg[colorVariantIndex].color;
  }
  modalState = {
    productId:id,
    sel:{ color:initialColor, size:p.variants[0]?.size ?? null, model:p.variants[0]?.model ?? null },
    installments:1,
    photoIndex: opts.photoIdx || 0
  };
  modalBody.innerHTML = '';
  refreshModal(p);
  renderRelated(p);
  modalOverlay.classList.add('show');
  modalOverlay.scrollTop = 0;
  document.body.classList.add('no-scroll');
}
export function closeModal(){ modalOverlay.classList.remove('show'); document.body.classList.remove('no-scroll'); }
document.getElementById('modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e=>{ if(e.target===modalOverlay) closeModal(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeModal(); closeMobileNav(); } });
