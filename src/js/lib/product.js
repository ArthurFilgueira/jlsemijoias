import { WHATSAPP_NUMBER } from '../config.js';

export function formatPrice(v){ return v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

export function getBadge(p){
  if(p.promo) return {cls:'badge promo',text:'Promoção'};
  if(p.isLaunch) return {cls:'badge new',text:'Novidade'};
  if(p.featured) return {cls:'badge',text:'Destaque'};
  return null;
}

export function maxInstallments(price){
  return Math.max(1, Math.min(12, Math.floor(price/30)));
}
export function getMaxInstallments(p){
  return p.maxParcelas || maxInstallments(p.promo ?? p.price);
}

export function installmentLabel(price, n){
  return n<=1 ? `À vista - R$ ${formatPrice(price)}` : `${n}x de R$ ${formatPrice(price/n)} sem juros`;
}

/* ===== variações (cor / tamanho / modelo) ===== */
export function variantLabel(v){
  return [v.color,v.size,v.model].filter(Boolean).join(' · ') || 'Único';
}
export function variantEffectivePrice(p, v){ return v && v.price!=null ? v.price : (p.promo ?? p.price); }
export function variantEffectiveOldPrice(p, v){ return v && v.price!=null ? null : (p.promo ? p.price : null); }
export function variantEffectiveStock(p, v){ return v && v.stock!=null ? v.stock : p.stock; }
export function variantEffectiveSku(p, v){ return (v && v.sku) ? v.sku : p.sku; }
export function variantEffectiveImg(p, v){ return (v && v.img) || p.gallery?.[0] || null; }
export function findVariant(p, sel){
  return p.variants.find(v=>
    (!p.variantAxes.color || v.color===sel.color) &&
    (!p.variantAxes.size || v.size===sel.size) &&
    (!p.variantAxes.model || v.model===sel.model)
  ) || p.variants[0];
}
export function distinctAxisValues(p, axis){
  return [...new Set(p.variants.map(v=>v[axis]).filter(Boolean))];
}

export function buildWaMessage(p, variant, installments){
  const price = variantEffectivePrice(p, variant);
  const productUrl = location.href.split('#')[0] + '#produto-' + p.id;
  const valorTxt = installments<=1
    ? `à vista, R$ ${formatPrice(price)}`
    : `em ${installments}x de R$ ${formatPrice(price/installments)} sem juros (total R$ ${formatPrice(price)})`;
  const variacaoTxt = variant && variantLabel(variant)!=='Único' ? ` (${variantLabel(variant)})` : '';
  const skuTxt = variantEffectiveSku(p, variant) ? `\nCódigo: ${variantEffectiveSku(p, variant)}` : '';
  return `Olá! Tenho interesse na peça *${p.name}*${variacaoTxt}, ${valorTxt}.${skuTxt}\nLink do produto: ${productUrl}`;
}

export function waLink(p, variant, installments){
  const msg = buildWaMessage(p, variant ?? p.variants[0], installments ?? 1);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* ===== subcategorias (agrupamento visual do catálogo) ===== */
export const SUBCAT_RULES = [
  {key:'conjuntos', label:'Conjuntos', cat:'semijoias', order:1, test:n=>/conjunto/i.test(n)},
  {key:'colares', label:'Colares', cat:'semijoias', order:2, test:n=>/colar/i.test(n)},
  {key:'brincos', label:'Brincos', cat:'semijoias', order:3, test:n=>/brinco/i.test(n)},
  {key:'pulseiras', label:'Pulseiras', cat:'semijoias', order:4, test:n=>/pulseira/i.test(n)},
  {key:'aneis', label:'Anéis', cat:'semijoias', order:5, test:n=>/anel|anéis|aliança/i.test(n)},
  {key:'oculos-grau', label:'Óculos de Grau', cat:'oculos', order:1, test:n=>/grau/i.test(n)},
  {key:'oculos-sol', label:'Óculos de Sol', cat:'oculos', order:2, test:()=>true},
];
export function getSubcat(p){
  const rules = SUBCAT_RULES.filter(r=>r.cat===p.cat);
  if(!rules.length) return {key:'geral', label:null, order:0};
  return rules.find(r=>r.test(p.name)) || {key:p.cat+'-outros', label:'Outros', order:99};
}

export function productPhotos(p){
  const gallery = (p.gallery||[]).filter(Boolean);
  if(gallery.length) return gallery;
  return [...new Set(p.variants.map(v=>v.img).filter(Boolean))];
}
export function productThumb(p){ return productPhotos(p)[0] || null; }
