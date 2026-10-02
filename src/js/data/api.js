import { sb } from '../lib/supabase.js';
import { store } from '../store.js';

/* ===== DADOS: categorias ===== */
export function categoryName(id){ const c = store.categories.find(x=>x.id===id); return c ? c.name : id; }
export async function loadCategories(){
  const { data, error } = await sb.from('categories').select('*').order('order');
  if(error){ console.error(error); return null; }
  return data.map(r=>({id:r.id, name:r.name, img:r.img, desc:r.description, icon:r.icon, order:r.order}));
}
export async function saveCategoryDb(c){
  const { error } = await sb.from('categories').upsert({ id:c.id, name:c.name, img:c.img, description:c.desc, icon:c.icon, order:c.order });
  if(error){ alert('Não foi possível salvar a categoria: '+error.message); throw error; }
}
export async function deleteCategoryDb(id){
  const { error } = await sb.from('categories').delete().eq('id', id);
  if(error){ alert('Não foi possível excluir a categoria: '+error.message); throw error; }
}

export const CAT_ICONS = {
  gem:'<path d="M12 2l2.2 6.6H21l-5.4 4 2.1 6.6L12 15.8 6.3 19.2l2.1-6.6L3 8.6h6.8z"/>',
  glasses:'<circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><path d="M10 14h4M2 12l2-6h2M22 12l-2-6h-2"/>',
  heart:'<path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
  star:'<path d="M12 2l2.2 6.6H21l-5.4 4 2.1 6.6L12 15.8 6.3 19.2l2.1-6.6L3 8.6h6.8z"/>',
  tag:'<path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.5 3H4a1 1 0 0 0-1 1v5.5a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l5.59-5.59a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
};
export function iconSvg(key){
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">${CAT_ICONS[key]||CAT_ICONS.tag}</svg>`;
}

/* ===== DADOS: carrossel do topo (store.banners) ===== */
export function dbToBanner(row){
  return {id:row.id, title:row.title, subtitle:row.subtitle, imgDesktop:row.img_desktop, imgMobile:row.img_mobile, btnText:row.btn_text, btnLink:row.btn_link, order:row.order, active:row.active};
}
export function bannerToDb(b){
  return {title:b.title, subtitle:b.subtitle, img_desktop:b.imgDesktop, img_mobile:b.imgMobile, btn_text:b.btnText, btn_link:b.btnLink, order:b.order, active:b.active};
}
export async function loadBanners(){
  const { data, error } = await sb.from('banners').select('*').order('order');
  if(error){ console.error(error); return null; }
  return data.map(dbToBanner);
}
export async function saveBannerDb(b){
  const payload = bannerToDb(b);
  if(b.id){
    const { error } = await sb.from('banners').update(payload).eq('id', b.id);
    if(error){ alert('Não foi possível salvar o banner: '+error.message); throw error; }
  }else{
    const { data, error } = await sb.from('banners').insert(payload).select().single();
    if(error){ alert('Não foi possível criar o banner: '+error.message); throw error; }
    b.id = data.id;
  }
}
export async function deleteBannerDb(id){
  const { error } = await sb.from('banners').delete().eq('id', id);
  if(error){ alert('Não foi possível excluir o banner: '+error.message); throw error; }
}

/* ===== DADOS DE PRODUTOS (Supabase) ===== */
export function dbToProduct(row){
  return {
    id: row.id, name: row.name, cat: row.cat, brand: row.brand, sku: row.sku,
    shortDesc: row.short_desc, fullDesc: row.full_desc,
    price: row.price!=null?Number(row.price):null, promo: row.promo!=null?Number(row.promo):null,
    stock: row.stock, minStock: row.min_stock, maxParcelas: row.max_parcelas,
    featured: row.featured, isLaunch: row.is_launch, order: row.order,
    gallery: row.gallery||[], variantAxes: row.variant_axes||{color:true,size:false,model:false},
    variants: (row.variants&&row.variants.length) ? row.variants : [{color:'Único',size:null,model:null,img:null,price:null,stock:null,sku:null}]
  };
}
export function productToDb(p){
  return {
    name:p.name, cat:p.cat, brand:p.brand, sku:p.sku, short_desc:p.shortDesc, full_desc:p.fullDesc,
    price:p.price, promo:p.promo, stock:p.stock, min_stock:p.minStock, max_parcelas:p.maxParcelas,
    featured:p.featured, is_launch:p.isLaunch, order:p.order, gallery:p.gallery,
    variant_axes:p.variantAxes, variants:p.variants
  };
}
export function normalizeProduct(p){
  if(!p.variantAxes) p.variantAxes = {color:true,size:false,model:false};
  if(!Array.isArray(p.variants) || !p.variants.length){
    p.variants = [{color:'Único',size:null,model:null,img:null,price:null,stock:null,sku:null}];
  }
  if(p.gallery==null) p.gallery = [];
  if(p.brand==null) p.brand = 'Jéssica Laysa';
  if(p.sku==null) p.sku = '';
  if(p.shortDesc==null) p.shortDesc = '';
  if(p.fullDesc==null) p.fullDesc = p.shortDesc || '';
  if(p.featured==null) p.featured = false;
  if(p.isLaunch==null) p.isLaunch = false;
  if(p.maxParcelas===undefined) p.maxParcelas = null;
  if(p.order==null) p.order = p.id || 0;
  return p;
}
export async function loadProducts(){
  const { data, error } = await sb.from('products').select('*').order('order');
  if(error){ console.error(error); return null; }
  return data.map(dbToProduct).map(normalizeProduct);
}
export async function saveProductDb(p){
  const payload = productToDb(p);
  if(p.id){
    const { error } = await sb.from('products').update(payload).eq('id', p.id);
    if(error){ alert('Não foi possível salvar o produto: '+error.message); throw error; }
  }else{
    const { data, error } = await sb.from('products').insert(payload).select().single();
    if(error){ alert('Não foi possível criar o produto: '+error.message); throw error; }
    p.id = data.id;
  }
}
export async function deleteProductDb(id){
  const { error } = await sb.from('products').delete().eq('id', id);
  if(error){ alert('Não foi possível excluir o produto: '+error.message); throw error; }
}
