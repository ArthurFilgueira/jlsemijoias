import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/catalog.css';
import './styles/product.css';
import './styles/admin.css';

import './js/ui/theme.js';
import './js/ui/layout.js';
import './js/ui/catalog.js';
import './js/ui/product-page.js';
import './js/admin/admin.js';
import { loadBanners, loadCategories, loadProducts, normalizeProduct } from './js/data/api.js';
import { store } from './js/store.js';
import { emptyState, grid, render, renderCatTeaser } from './js/ui/catalog.js';
import { initHeroCarousel } from './js/ui/hero.js';
import { openModal } from './js/ui/product-page.js';

/* O catálogo da última visita fica em cache no navegador: a página aparece na hora
   e é atualizada assim que o Supabase responde. */
const CATALOG_CACHE_KEY = 'jl_catalog_cache_v1';
function readCatalogCache(){
  try{ return JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY)); }catch(e){ return null; }
}
function writeCatalogCache(data){
  try{ localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data)); }catch(e){}
}
function showCatalogLoading(){
  grid.innerHTML = '<div class="catalog-loading"><span class="catalog-spinner"></span>Carregando peças...</div>';
  emptyState.classList.remove('show');
}

(async function init(){
  const cached = readCatalogCache();
  if(cached){
    store.categories = cached.categories||[];
    store.banners = cached.banners||[];
    store.products = (cached.products||[]).map(normalizeProduct);
    render();
    renderCatTeaser();
    initHeroCarousel();
  }else{
    showCatalogLoading();
    initHeroCarousel(); // mostra as fotos padrão enquanto os store.banners carregam
  }

  const [freshCats, freshBanners, freshProducts] = await Promise.all([loadCategories(), loadBanners(), loadProducts()]);
  const before = JSON.stringify({categories:store.categories, banners:store.banners, products:store.products});
  if(freshCats) store.categories = freshCats;
  if(freshBanners) store.banners = freshBanners;
  if(freshProducts) store.products = freshProducts;
  const fresh = {categories:store.categories, banners:store.banners, products:store.products};
  const changed = JSON.stringify(fresh)!==before;
  if(freshCats && freshBanners && freshProducts) writeCatalogCache(fresh);

  if(changed || !cached){
    const heroBefore = cached ? JSON.stringify(cached.banners||[]) : '[]';
    render();
    renderCatTeaser();
    if(JSON.stringify(store.banners)!==heroBefore) initHeroCarousel();
  }
  const m = location.hash.match(/^#produto-(\d+)$/);
  if(m) openModal(Number(m[1]));
  if(!freshProducts && !store.products.length){
    grid.innerHTML = '<div class="catalog-loading">Não foi possível carregar o catálogo. Verifique sua conexão e recarregue a página.</div>';
  }
})();
