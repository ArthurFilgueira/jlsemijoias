import { CAT_ICONS, categoryName, deleteBannerDb, deleteCategoryDb, deleteProductDb, iconSvg, saveBannerDb, saveCategoryDb, saveProductDb } from '../data/api.js';
import { formatPrice, variantEffectiveSku } from '../lib/product.js';
import { sb, uploadProductImage } from '../lib/supabase.js';
import { store } from '../store.js';
import { render, renderCatTeaser } from '../ui/catalog.js';

/* ===== painel administrativo ===== */
export let adminView = 'produtos';        // 'produtos' | 'categorias' | 'banners'
export let adminEditingId = null;         // null = lista | 'new' = criando | id = editando
export let adminDraft = null;
export let adminProductFilter = { search:'', cat:'todos' };

export async function isAdminLoggedIn(){ const { data } = await sb.auth.getSession(); return !!data.session; }

export function slugify(s){
  return (s||'').toString().toLowerCase().trim()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || ('cat-'+Date.now());
}

/* ---- uploader de imagens reutilizável (drag&drop, múltiplas, preview, excluir, reordenar) ---- */
export function renderUploader(images, opts={}){
  const multiple = !!opts.multiple;
  const imgs = (images||[]).filter(Boolean);
  const thumbs = imgs.map((src,i)=>`
    <div class="admin-thumb">
      <img src="${src}" alt="">
      ${multiple && i===0?'<span class="admin-thumb-tag">Principal</span>':''}
      <div class="admin-thumb-controls">
        ${multiple && i>0?`<button type="button" class="admin-thumb-up" data-idx="${i}" title="Mover para cima">↑</button>`:''}
        ${multiple && i<imgs.length-1?`<button type="button" class="admin-thumb-down" data-idx="${i}" title="Mover para baixo">↓</button>`:''}
        <button type="button" class="admin-thumb-del" data-idx="${i}" title="Remover">✕</button>
      </div>
    </div>
  `).join('');
  return `
    <div class="admin-uploader" data-multiple="${multiple?1:0}">
      <div class="admin-dropzone">Arraste ${multiple?'imagens':'uma imagem'} aqui ou <strong>clique para selecionar</strong>
        <input type="file" accept="image/*" ${multiple?'multiple':''} hidden>
      </div>
      <div class="admin-thumb-grid">${thumbs}</div>
    </div>
  `;
}
export function attachUploader(rootEl, getArr, setArr, onChange){
  const uploaderEl = rootEl.querySelector('.admin-uploader');
  const dz = rootEl.querySelector('.admin-dropzone');
  const input = dz.querySelector('input[type=file]');
  const multiple = uploaderEl.dataset.multiple==='1';

  dz.addEventListener('click', ()=>input.click());
  dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', ()=>dz.classList.remove('drag'));
  dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
  input.addEventListener('change', ()=>{ handleFiles(input.files); input.value=''; });

  async function handleFiles(fileList){
    const files = Array.from(fileList).filter(f=>f.type.startsWith('image/'));
    if(!files.length) return;
    const originalText = dz.innerHTML;
    dz.innerHTML = 'Enviando...';
    let arr = (getArr()||[]).filter(Boolean);
    try{
      if(!multiple){
        arr = [await uploadProductImage(files[0])];
      }else{
        for(const f of files){
          try{ arr.push(await uploadProductImage(f)); }catch(e){}
        }
      }
      setArr(arr);
      onChange();
    }finally{
      dz.innerHTML = originalText;
    }
  }
  rootEl.querySelectorAll('.admin-thumb-del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = (getArr()||[]).filter(Boolean);
      arr.splice(Number(btn.dataset.idx),1);
      setArr(arr); onChange();
    });
  });
  rootEl.querySelectorAll('.admin-thumb-up').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = (getArr()||[]).filter(Boolean);
      const i = Number(btn.dataset.idx);
      [arr[i-1],arr[i]] = [arr[i],arr[i-1]];
      setArr(arr); onChange();
    });
  });
  rootEl.querySelectorAll('.admin-thumb-down').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = (getArr()||[]).filter(Boolean);
      const i = Number(btn.dataset.idx);
      [arr[i+1],arr[i]] = [arr[i],arr[i+1]];
      setArr(arr); onChange();
    });
  });
}

/* ---- login / criação de senha ---- */
export const adminAuthOverlay = document.getElementById('adminAuthOverlay');
export const adminAuthContent = document.getElementById('adminAuthContent');

export function openAdminAuth(){ adminAuthOverlay.classList.add('show'); renderAdminAuth(); }
export function closeAdminAuth(){ adminAuthOverlay.classList.remove('show'); }
document.getElementById('adminAuthClose').addEventListener('click', closeAdminAuth);
adminAuthOverlay.addEventListener('click', e=>{ if(e.target===adminAuthOverlay) closeAdminAuth(); });

document.getElementById('adminTrigger').addEventListener('click', async ()=>{
  if(await isAdminLoggedIn()) enterAdminApp();
  else openAdminAuth();
});

/* ---- popup "nova categoria" (substitui o prompt() nativo do navegador) ---- */
export let quickCatOnResult = null;
export function openQuickCatModal(onResult){
  quickCatOnResult = onResult;
  document.getElementById('quickCatName').value = '';
  document.getElementById('quickCatError').textContent = '';
  document.getElementById('adminQuickCatOverlay').classList.add('show');
  setTimeout(()=>document.getElementById('quickCatName').focus(), 50);
}
export function closeQuickCatModal(result){
  document.getElementById('adminQuickCatOverlay').classList.remove('show');
  const cb = quickCatOnResult;
  quickCatOnResult = null;
  if(cb) cb(result);
}
document.getElementById('adminQuickCatForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = document.getElementById('quickCatName').value.trim();
  const errorEl = document.getElementById('quickCatError');
  if(!name){ errorEl.textContent='Digite um nome.'; return; }
  const id = slugify(name);
  if(store.categories.some(c=>c.id===id)){ errorEl.textContent='Já existe uma categoria com esse nome.'; return; }
  const newCat = {id, name, img:null, desc:'', icon:'tag', order:store.categories.length+1};
  try{ await saveCategoryDb(newCat); }catch(err){ return; }
  store.categories.push(newCat);
  render(); renderCatTeaser();
  closeQuickCatModal(id);
});
document.getElementById('adminQuickCatClose').addEventListener('click', ()=>closeQuickCatModal(null));
document.getElementById('adminQuickCatCancel').addEventListener('click', ()=>closeQuickCatModal(null));
document.getElementById('adminQuickCatOverlay').addEventListener('click', e=>{
  if(e.target.id==='adminQuickCatOverlay') closeQuickCatModal(null);
});

export function renderAdminAuth(){
  adminAuthContent.innerHTML = renderLoginForm();
  document.getElementById('adminLoginForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const email = document.getElementById('adminEmailInput').value.trim();
    const password = document.getElementById('adminPassInput').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if(!error){
      closeAdminAuth();
      enterAdminApp();
    }else{
      document.getElementById('adminLoginError').textContent = 'E-mail ou senha incorretos.';
    }
  });
}
export function renderLoginForm(){
  return `
    <h3 class="serif admin-title">Área Admin</h3>
    <p class="admin-sub">Entre com seu e-mail e senha para editar o catálogo.</p>
    <form id="adminLoginForm">
      <div class="form-field"><label for="adminEmailInput">E-mail</label><input id="adminEmailInput" type="email" required autocomplete="username"></div>
      <div class="form-field"><label for="adminPassInput">Senha</label><input id="adminPassInput" type="password" required autocomplete="current-password"></div>
      <p class="admin-error" id="adminLoginError"></p>
      <button type="submit" class="btn btn-gold" style="width:100%;justify-content:center;">Entrar</button>
    </form>
  `;
}

/* ---- app admin de página inteira ---- */
export function enterAdminApp(){
  document.body.classList.add('admin-mode');
  adminView='produtos'; adminEditingId=null; adminDraft=null;
  document.querySelectorAll('#adminNav .admin-nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='produtos'));
  renderAdminMain();
}
export function exitAdminApp(){ document.body.classList.remove('admin-mode'); }
document.getElementById('adminExitBtn').addEventListener('click', exitAdminApp);
document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
  await sb.auth.signOut();
  exitAdminApp();
});
document.getElementById('adminNav').addEventListener('click', e=>{
  const btn = e.target.closest('.admin-nav-btn');
  if(!btn) return;
  adminView = btn.dataset.view;
  adminEditingId = null; adminDraft = null;
  document.querySelectorAll('#adminNav .admin-nav-btn').forEach(b=>b.classList.toggle('active', b===btn));
  renderAdminMain();
});

export function renderAdminMain(){
  const main = document.getElementById('adminMain');
  if(adminView==='produtos'){
    if(adminEditingId!==null){ main.innerHTML = renderProdutosForm(); attachProdutosFormEvents(); }
    else{ main.innerHTML = renderProdutosList(); attachProdutosListEvents(); }
  }else if(adminView==='categorias'){
    if(adminEditingId!==null){ main.innerHTML = renderCategoriasForm(); attachCategoriasFormEvents(); }
    else{ main.innerHTML = renderCategoriasList(); attachCategoriasListEvents(); }
  }else if(adminView==='banners'){
    if(adminEditingId!==null){ main.innerHTML = renderBannersForm(); attachBannersFormEvents(); }
    else{ main.innerHTML = renderBannersList(); attachBannersListEvents(); }
  }
}

/* ================= PRODUTOS ================= */
export function buildProductRowsHtml(){
  const filtered = store.products.filter(p=>{
    if(adminProductFilter.cat!=='todos' && p.cat!==adminProductFilter.cat) return false;
    if(adminProductFilter.search){
      const s = adminProductFilter.search.toLowerCase();
      if(!p.name.toLowerCase().includes(s) && !p.sku.toLowerCase().includes(s) && !(p.brand||'').toLowerCase().includes(s)) return false;
    }
    return true;
  });
  if(!filtered.length) return '<p class="admin-sub">Nenhum produto encontrado.</p>';
  return filtered.map(p=>{
    const thumb = p.gallery?.[0] || p.variants[0]?.img || null;
    return `
    <div class="admin-row">
      <div class="admin-row-thumb">${thumb?`<img src="${thumb}" alt="">`:'<div class="ring"></div>'}</div>
      <div class="admin-row-info">
        <strong>${p.name}</strong>
        <span>${categoryName(p.cat)}${p.sku?` · ${p.sku}`:''} · R$ ${formatPrice(p.promo??p.price)}${p.promo?` (de R$ ${formatPrice(p.price)})`:''}${p.stock!=null?` · estoque ${p.stock}`:''}</span>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-outline btn-sm admin-edit-btn" data-id="${p.id}">Editar</button>
        <button class="btn btn-outline btn-sm admin-dup-btn" data-id="${p.id}">Duplicar</button>
        <button class="btn btn-outline btn-sm admin-del-btn" data-id="${p.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}
export function refreshProductRows(){
  const wrap = document.getElementById('adminProductRows');
  wrap.innerHTML = buildProductRowsHtml();
  attachProductRowEvents();
}
export function attachProductRowEvents(){
  document.querySelectorAll('.admin-edit-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = Number(btn.dataset.id);
      adminDraft = JSON.parse(JSON.stringify(store.products.find(x=>x.id===id)));
      adminEditingId = id;
      renderAdminMain();
    });
  });
  document.querySelectorAll('.admin-dup-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = Number(btn.dataset.id);
      const p = store.products.find(x=>x.id===id);
      const copy = JSON.parse(JSON.stringify(p));
      delete copy.id;
      copy.name = p.name+' (cópia)';
      copy.sku = p.sku+'-COPIA';
      copy.order = store.products.length+1;
      try{ await saveProductDb(copy); }catch(err){ return; }
      store.products.push(copy);
      render();
      refreshProductRows();
    });
  });
  document.querySelectorAll('.admin-del-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = Number(btn.dataset.id);
      const p = store.products.find(x=>x.id===id);
      if(confirm(`Excluir "${p.name}"? Essa ação não pode ser desfeita.`)){
        try{ await deleteProductDb(id); }catch(err){ return; }
        store.products = store.products.filter(x=>x.id!==id);
        render();
        refreshProductRows();
      }
    });
  });
}
export function renderProdutosList(){
  const catOptions = `<option value="todos">Todas categorias</option>` + store.categories.map(c=>`<option value="${c.id}" ${adminProductFilter.cat===c.id?'selected':''}>${c.name}</option>`).join('');
  return `
    <div class="admin-header"><h3 class="serif admin-title">Produtos (${store.products.length})</h3></div>
    <div class="admin-toolbar">
      <button type="button" class="btn btn-gold btn-sm" id="adminNewBtn">+ Novo produto</button>
      <input type="text" id="adminSearchInput" placeholder="Buscar por nome, SKU ou marca…" value="${adminProductFilter.search}">
      <select id="adminCatFilter">${catOptions}</select>
    </div>
    <div class="admin-toolbar">
      <button type="button" class="btn btn-outline btn-sm" id="adminExportBtn">⬇ Exportar Excel</button>
      <button type="button" class="btn btn-outline btn-sm" id="adminImportExcelBtn">⬆ Importar Excel/CSV</button>
      <input type="file" id="adminImportFile" accept=".xlsx,.xls,.csv" hidden>
      <button type="button" class="btn btn-outline btn-sm" id="adminImportPdfBtn">⬆ Importar de PDF / texto</button>
    </div>
    <div class="admin-paste-panel" id="adminPastePanel" style="display:none;margin-bottom:22px;border:1px solid var(--stone);background:var(--white);padding:18px;max-width:760px;">
      <p class="admin-sub" style="margin-top:0;">Abra o PDF, selecione o texto da lista de produtos (Ctrl+A / Ctrl+C) e cole abaixo. Reorganize cada produto em uma linha, campos separados por ponto e vírgula, nesta ordem:<br><strong>Nome; SKU; Categoria; Preço; Preço promocional; Estoque</strong><br>(deixe um campo em branco entre dois ";" se não tiver essa informação)</p>
      <textarea id="adminPasteText" rows="8" style="width:100%;border:1px solid var(--stone);padding:10px;font-family:inherit;font-size:.82rem;border-radius:2px;" placeholder="Colar Argola Dourada; JL-BR099; Semi Joias; 129.90; 99.90; 15"></textarea>
      <div class="admin-form-actions" style="margin-top:12px;">
        <button type="button" class="btn btn-gold btn-sm" id="adminPasteConfirm">Importar texto</button>
        <button type="button" class="btn btn-outline btn-sm" id="adminPasteCancel">Cancelar</button>
      </div>
    </div>
    <div class="admin-list" id="adminProductRows"></div>
  `;
}
export function attachProdutosListEvents(){
  document.getElementById('adminNewBtn').addEventListener('click', ()=>{
    adminDraft = {
      id:null, name:'', cat:store.categories[0]?.id||'', brand:'Jéssica Laysa', sku:'',
      shortDesc:'', fullDesc:'', price:null, promo:null, stock:null, minStock:null, maxParcelas:null,
      featured:false, isLaunch:false, order:store.products.length+1, gallery:[],
      variantAxes:{color:true,size:false,model:false},
      variants:[{color:'Único',size:null,model:null,img:null,price:null,stock:null,sku:null}]
    };
    adminEditingId = 'new';
    renderAdminMain();
  });
  document.getElementById('adminSearchInput').addEventListener('input', e=>{ adminProductFilter.search=e.target.value; refreshProductRows(); });
  document.getElementById('adminCatFilter').addEventListener('change', e=>{ adminProductFilter.cat=e.target.value; refreshProductRows(); });

  document.getElementById('adminExportBtn').addEventListener('click', exportProductsExcel);

  document.getElementById('adminImportExcelBtn').addEventListener('click', ()=>{
    loadXlsx(); // já começa a baixar a biblioteca enquanto o arquivo é escolhido
    document.getElementById('adminImportFile').click();
  });
  document.getElementById('adminImportFile').addEventListener('change', e=>{
    const file = e.target.files[0];
    e.target.value = '';
    if(file) importProductsExcelFile(file);
  });

  document.getElementById('adminImportPdfBtn').addEventListener('click', ()=>{
    document.getElementById('adminPastePanel').style.display = 'block';
  });
  document.getElementById('adminPasteCancel').addEventListener('click', ()=>{
    document.getElementById('adminPastePanel').style.display = 'none';
    document.getElementById('adminPasteText').value = '';
  });
  document.getElementById('adminPasteConfirm').addEventListener('click', ()=>{
    const text = document.getElementById('adminPasteText').value;
    const rows = parsePastedText(text);
    if(!rows.length){ alert('Nenhuma linha reconhecida. Confira o formato (Nome; SKU; Categoria; Preço; Preço promocional; Estoque).'); return; }
    importProductsFromRows(rows);
    document.getElementById('adminPastePanel').style.display = 'none';
    document.getElementById('adminPasteText').value = '';
  });

  refreshProductRows();
}

/* ---- exportar / importar em Excel (e colar texto de PDF) ---- */
/* a biblioteca xlsx é pesada: só é baixada quando o admin usa planilhas */
export let xlsxModule = null;
export async function loadXlsx(){ return xlsxModule ||= await import('xlsx'); }

export async function exportProductsExcel(){
  const XLSX = await loadXlsx();
  const rows = [];
  store.products.forEach(p=>{
    p.variants.forEach(v=>{
      rows.push({
        ID: p.id,
        Nome: p.name,
        Categoria: categoryName(p.cat),
        Marca: p.brand||'',
        SKU: variantEffectiveSku(p,v)||'',
        'Descrição Curta': p.shortDesc||'',
        'Descrição Completa': p.fullDesc||'',
        'Preço Original': p.price,
        'Preço Promocional': p.promo??'',
        'Estoque': p.stock,
        'Estoque Mínimo': p.minStock,
        'Parcelas Máximas': p.maxParcelas??'',
        Destaque: p.featured?'Sim':'Não',
        'Lançamento': p.isLaunch?'Sim':'Não',
        Cor: v.color||'',
        Tamanho: v.size||'',
        Modelo: v.model||'',
        'Preço da Variação': v.price??'',
        'Estoque da Variação': v.stock??'',
        'SKU da Variação': v.sku||'',
      });
    });
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, `produtos-jessica-laysa-${new Date().toISOString().slice(0,10)}.xlsx`);
}

export async function importProductsExcelFile(file){
  const XLSX = await loadXlsx();
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
      if(!rows.length){ alert('A planilha está vazia.'); return; }
      importProductsFromRows(rows);
    }catch(err){
      alert('Não foi possível ler esse arquivo. Confira se é um .xlsx, .xls ou .csv válido.');
    }
  };
  reader.readAsArrayBuffer(file);
}

export function parsePastedText(text){
  return text.split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{
    const cols = line.split(';').map(c=>c.trim());
    return {
      Nome: cols[0]||'', SKU: cols[1]||'', Categoria: cols[2]||'',
      'Preço Original': cols[3]||'', 'Preço Promocional': cols[4]||'', 'Estoque': cols[5]||''
    };
  }).filter(r=>r.Nome && !/^nome$/i.test(r.Nome));
}

export function rowsToProducts(rows){
  const groups = new Map();
  rows.forEach(r=>{
    const key = (r.ID!==undefined && r.ID!=='') ? 'id:'+r.ID : 'sku:'+(r.Nome||'')+'|'+(r.SKU||'');
    if(!groups.has(key)){
      const cat = store.categories.find(c=>c.name.toLowerCase()===String(r.Categoria||'').toLowerCase());
      groups.set(key, {
        id: (r.ID!==undefined && r.ID!=='') ? Number(r.ID) : (Date.now()+Math.floor(Math.random()*10000)),
        name: r.Nome||'',
        cat: cat ? cat.id : (store.categories[0]?.id||''),
        brand: r.Marca||'',
        sku: r.SKU||'',
        shortDesc: r['Descrição Curta']||'',
        fullDesc: r['Descrição Completa']||r['Descrição Curta']||'',
        price: parseFloat(r['Preço Original'])||0,
        promo: (r['Preço Promocional']!==''&&r['Preço Promocional']!=null&&!isNaN(parseFloat(r['Preço Promocional']))) ? parseFloat(r['Preço Promocional']) : null,
        stock: parseInt(r['Estoque'],10)||0,
        minStock: parseInt(r['Estoque Mínimo'],10)||0,
        maxParcelas: (r['Parcelas Máximas']!==''&&r['Parcelas Máximas']!=null&&!isNaN(parseInt(r['Parcelas Máximas'],10))) ? parseInt(r['Parcelas Máximas'],10) : null,
        featured: /^sim$/i.test(String(r.Destaque||'')),
        isLaunch: /^sim$/i.test(String(r['Lançamento']||'')),
        order: Date.now(), gallery:[],
        variantAxes:{color:!!r.Cor, size:!!r.Tamanho, model:!!r.Modelo},
        variants: []
      });
    }
    const prod = groups.get(key);
    prod.variants.push({
      color:r.Cor||null, size:r.Tamanho||null, model:r.Modelo||null, img:null,
      price:(r['Preço da Variação']!==''&&r['Preço da Variação']!=null&&!isNaN(parseFloat(r['Preço da Variação'])))?parseFloat(r['Preço da Variação']):null,
      stock:(r['Estoque da Variação']!==''&&r['Estoque da Variação']!=null&&!isNaN(parseInt(r['Estoque da Variação'],10)))?parseInt(r['Estoque da Variação'],10):null,
      sku:r['SKU da Variação']||r.SKU||null
    });
  });
  return [...groups.values()].map(p=>{
    if(!p.variants.length) p.variants=[{color:'Único',size:null,model:null,img:null,price:null,stock:null,sku:null}];
    return p;
  });
}

export async function importProductsFromRows(rows){
  const imported = rowsToProducts(rows);
  let updated=0, created=0;
  for(const imp of imported){
    const existing = store.products.find(p=>p.id===imp.id) ||
      (imp.sku ? store.products.find(p=>p.sku && p.sku.toLowerCase()===imp.sku.toLowerCase()) : null);
    if(existing){
      imp.gallery = existing.gallery;
      imp.variants.forEach((v,i)=>{
        const exV = existing.variants.find(ev=>(ev.color||null)===(v.color||null) && (ev.size||null)===(v.size||null) && (ev.model||null)===(v.model||null)) || existing.variants[i];
        if(exV) v.img = exV.img;
      });
      Object.assign(existing, imp, {id:existing.id});
      try{ await saveProductDb(existing); updated++; }catch(err){}
    }else{
      delete imp.id;
      try{ await saveProductDb(imp); store.products.push(imp); created++; }catch(err){}
    }
  }
  render(); refreshProductRows();
  alert(`Importação concluída: ${created} produto(s) novo(s), ${updated} atualizado(s). Fotos já existentes foram mantidas.`);
}

export function renderVariantsBlock(p){
  const axesHtml = [['color','Cor'],['size','Tamanho'],['model','Modelo']].map(([axis,label])=>
    `<label class="admin-checkbox-row"><input type="checkbox" class="admin-axis-toggle" data-axis="${axis}" ${p.variantAxes[axis]?'checked':''}> ${label}</label>`
  ).join('');
  const rowsHtml = p.variants.map((v,i)=>`
    <div class="admin-variant-row">
      ${p.variantAxes.color?`<div class="admin-variant-field"><label>Cor</label><input type="text" class="v-color" data-idx="${i}" value="${v.color||''}"></div>`:''}
      ${p.variantAxes.size?`<div class="admin-variant-field"><label>Tamanho</label><input type="text" class="v-size" data-idx="${i}" value="${v.size||''}"></div>`:''}
      ${p.variantAxes.model?`<div class="admin-variant-field"><label>Modelo</label><input type="text" class="v-model" data-idx="${i}" value="${v.model||''}"></div>`:''}
      <div class="admin-variant-field"><label>Preço próprio</label><input type="number" step="0.01" class="v-price" data-idx="${i}" value="${v.price??''}" placeholder="do produto"></div>
      <div class="admin-variant-field"><label>Estoque próprio</label><input type="number" class="v-stock" data-idx="${i}" value="${v.stock??''}" placeholder="do produto"></div>
      <div class="admin-variant-field"><label>SKU próprio</label><input type="text" class="v-sku" data-idx="${i}" value="${v.sku||''}" placeholder="do produto"></div>
      <div class="admin-variant-field" style="min-width:100px;"><label>Imagem</label><div id="variantUploader${i}"></div></div>
      ${p.variants.length>1?`<button type="button" class="admin-variant-remove" data-idx="${i}" aria-label="Remover variação">✕</button>`:''}
    </div>
  `).join('');
  return `
    <fieldset class="admin-fieldset">
      <legend>Variações</legend>
      <div class="admin-axis-toggles">${axesHtml}</div>
      <div id="adminVariantsList">${rowsHtml}</div>
      <button type="button" class="btn btn-outline btn-sm" id="adminAddVariantBtn">+ Adicionar variação</button>
    </fieldset>
  `;
}
export function renderProdutosForm(){
  const p = adminDraft;
  const catOptions = store.categories.map(c=>`<option value="${c.id}" ${p.cat===c.id?'selected':''}>${c.name}</option>`).join('')
    + `<option value="__new__">+ Nova categoria…</option>`;
  return `
    <div class="admin-header">
      <h3 class="serif admin-title">${adminEditingId==='new'?'Novo produto':'Editar produto'}</h3>
      <button type="button" class="admin-back-btn" id="adminBackBtn">← Voltar à lista</button>
    </div>
    <form id="adminForm" class="admin-form">
      <fieldset class="admin-fieldset">
        <legend>Informações básicas</legend>
        <div class="admin-grid">
          <div class="form-field"><label for="fName">Nome *</label><input id="fName" type="text" required value="${p.name||''}"></div>
          <div class="form-field"><label for="fCat">Categoria</label><select id="fCat">${catOptions}</select></div>
          <div class="form-field"><label for="fBrand">Marca</label><input id="fBrand" type="text" value="${p.brand||''}"></div>
          <div class="form-field"><label for="fSku">SKU</label><input id="fSku" type="text" value="${p.sku||''}"></div>
        </div>
        <div class="form-field"><label for="fShortDesc">Descrição curta</label><input id="fShortDesc" type="text" value="${p.shortDesc||''}"></div>
        <div class="form-field"><label for="fFullDesc">Descrição completa</label><textarea id="fFullDesc">${p.fullDesc||''}</textarea></div>
      </fieldset>

      <fieldset class="admin-fieldset">
        <legend>Preço e estoque</legend>
        <div class="admin-grid">
          <div class="form-field"><label for="fPrice">Preço original (R$) *</label><input id="fPrice" type="number" step="0.01" min="0" required value="${p.price??''}"></div>
          <div class="form-field"><label for="fPromo">Preço promocional (R$)</label><input id="fPromo" type="number" step="0.01" min="0" value="${p.promo??''}"></div>
          <div class="form-field"><label for="fStock">Quantidade em estoque</label><input id="fStock" type="number" min="0" value="${p.stock??''}"></div>
          <div class="form-field"><label for="fMinStock">Quantidade mínima</label><input id="fMinStock" type="number" min="0" value="${p.minStock??''}"></div>
          <div class="form-field"><label for="fParcelas">Parcelamento máximo (vazio = automático)</label><input id="fParcelas" type="number" min="1" max="12" value="${p.maxParcelas||''}"></div>
        </div>
        <label class="admin-checkbox-row"><input type="checkbox" id="fFeatured" ${p.featured?'checked':''}> Produto em destaque</label>
        <label class="admin-checkbox-row"><input type="checkbox" id="fLaunch" ${p.isLaunch?'checked':''}> Lançamento</label>
      </fieldset>

      <fieldset class="admin-fieldset">
        <legend>Galeria do produto</legend>
        <p class="admin-sub" style="margin:-6px 0 14px;">Adicione 2 ou mais fotos do mesmo produto (ângulos diferentes, detalhes, etc.). Elas aparecem automaticamente em um mini carrossel no card e na visualização rápida.</p>
        <div id="galleryUploader"></div>
      </fieldset>

      ${renderVariantsBlock(p)}

      <p class="admin-error" id="adminFormError"></p>
      <div class="admin-form-actions">
        <button type="submit" class="btn btn-gold">Salvar</button>
        <button type="button" class="btn btn-outline" id="adminCancelBtn">Cancelar</button>
      </div>
    </form>
  `;
}
export function attachProdutosFormEvents(){
  document.getElementById('adminBackBtn').addEventListener('click', ()=>{ adminEditingId=null; adminDraft=null; renderAdminMain(); });
  document.getElementById('adminCancelBtn').addEventListener('click', ()=>{ adminEditingId=null; adminDraft=null; renderAdminMain(); });

  const bind = (id, field, opts={})=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener(opts.evt||'input', ()=>{ adminDraft[field] = opts.parser ? opts.parser(el.value) : el.value; });
  };
  bind('fName','name'); bind('fBrand','brand'); bind('fSku','sku');
  bind('fShortDesc','shortDesc'); bind('fFullDesc','fullDesc');

  document.getElementById('fCat').addEventListener('change', e=>{
    if(e.target.value==='__new__'){
      const prevCat = adminDraft.cat;
      const selectEl = e.target;
      openQuickCatModal(newId=>{
        if(newId){ adminDraft.cat = newId; renderAdminMain(); }
        else{ selectEl.value = prevCat; }
      });
      return;
    }
    adminDraft.cat = e.target.value;
  });
  bind('fPrice','price',{parser:v=>v===''?null:parseFloat(v)});
  bind('fPromo','promo',{parser:v=>v===''?null:parseFloat(v)});
  bind('fStock','stock',{parser:v=>v===''?null:parseInt(v,10)});
  bind('fMinStock','minStock',{parser:v=>v===''?null:parseInt(v,10)});
  bind('fParcelas','maxParcelas',{parser:v=>v?Math.max(1,Math.min(12,parseInt(v,10))):null});
  document.getElementById('fFeatured').addEventListener('change', e=>{ adminDraft.featured=e.target.checked; });
  document.getElementById('fLaunch').addEventListener('change', e=>{ adminDraft.isLaunch=e.target.checked; });

  const galWrap = document.getElementById('galleryUploader');
  galWrap.innerHTML = renderUploader(adminDraft.gallery,{multiple:true});
  attachUploader(galWrap, ()=>adminDraft.gallery, arr=>{ adminDraft.gallery=arr; }, ()=>renderAdminMain());

  document.querySelectorAll('.admin-axis-toggle').forEach(cb=>{
    cb.addEventListener('change', ()=>{ adminDraft.variantAxes[cb.dataset.axis]=cb.checked; renderAdminMain(); });
  });
  document.getElementById('adminAddVariantBtn').addEventListener('click', ()=>{
    adminDraft.variants.push({color:'',size:'',model:'',img:null,price:null,stock:null,sku:null});
    renderAdminMain();
  });
  document.querySelectorAll('.admin-variant-remove').forEach(btn=>{
    btn.addEventListener('click', ()=>{ adminDraft.variants.splice(Number(btn.dataset.idx),1); renderAdminMain(); });
  });
  ['color','size','model','sku'].forEach(field=>{
    document.querySelectorAll('.v-'+field).forEach(inp=>{
      inp.addEventListener('input', ()=>{ adminDraft.variants[Number(inp.dataset.idx)][field]=inp.value||null; });
    });
  });
  ['price','stock'].forEach(field=>{
    document.querySelectorAll('.v-'+field).forEach(inp=>{
      inp.addEventListener('input', ()=>{ const v=inp.value; adminDraft.variants[Number(inp.dataset.idx)][field]=v===''?null:Number(v); });
    });
  });
  adminDraft.variants.forEach((v,i)=>{
    const wrap = document.getElementById('variantUploader'+i);
    if(!wrap) return;
    wrap.innerHTML = renderUploader(v.img?[v.img]:[],{multiple:false});
    attachUploader(wrap, ()=>adminDraft.variants[i].img?[adminDraft.variants[i].img]:[], arr=>{ adminDraft.variants[i].img=arr[0]||null; }, ()=>renderAdminMain());
  });

  document.getElementById('adminForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const errs = [];
    if(!adminDraft.name) errs.push('nome');
    if(!adminDraft.price || adminDraft.price<=0) errs.push('preço');
    if(errs.length){
      document.getElementById('adminFormError').textContent = 'Preencha corretamente: '+errs.join(', ')+'.';
      return;
    }
    if(adminDraft.promo!=null && adminDraft.promo>=adminDraft.price){
      document.getElementById('adminFormError').textContent = 'O preço promocional deve ser menor que o preço original.';
      return;
    }
    if(!adminDraft.variants.length) adminDraft.variants=[{color:'Único',size:null,model:null,img:null,price:null,stock:null,sku:null}];
    if(!adminDraft.order) adminDraft.order = Date.now();

    try{ await saveProductDb(adminDraft); }catch(err){ return; }
    if(adminEditingId==='new'){ store.products.push(adminDraft); }
    else{ const i=store.products.findIndex(x=>x.id===adminEditingId); if(i>-1) store.products[i]=adminDraft; }
    render();
    adminEditingId = null; adminDraft = null;
    renderAdminMain();
  });
}

/* ================= CATEGORIAS ================= */
export function renderCategoriasList(){
  const rows = store.categories.slice().sort((a,b)=>a.order-b.order).map(c=>`
    <div class="admin-row">
      <div class="admin-row-thumb">${c.img?`<img src="${c.img}" alt="">`:iconSvg(c.icon)}</div>
      <div class="admin-row-info"><strong>${c.name}</strong><span>Ordem ${c.order} · ${store.products.filter(p=>p.cat===c.id).length} produto(s)</span></div>
      <div class="admin-row-actions">
        <button class="btn btn-outline btn-sm admin-cat-edit" data-id="${c.id}">Editar</button>
        <button class="btn btn-outline btn-sm admin-cat-del" data-id="${c.id}">Excluir</button>
      </div>
    </div>
  `).join('');
  return `
    <div class="admin-header"><h3 class="serif admin-title">Categorias (${store.categories.length})</h3></div>
    <div class="admin-toolbar"><button type="button" class="btn btn-gold btn-sm" id="adminCatNewBtn">+ Nova categoria</button></div>
    <div class="admin-list">${rows || '<p class="admin-sub">Nenhuma categoria cadastrada.</p>'}</div>
  `;
}
export function attachCategoriasListEvents(){
  document.getElementById('adminCatNewBtn').addEventListener('click', ()=>{
    adminDraft = {id:null,name:'',img:null,desc:'',icon:'tag',order:store.categories.length+1};
    adminEditingId = 'new';
    renderAdminMain();
  });
  document.querySelectorAll('.admin-cat-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      adminDraft = JSON.parse(JSON.stringify(store.categories.find(c=>c.id===btn.dataset.id)));
      adminEditingId = btn.dataset.id;
      renderAdminMain();
    });
  });
  document.querySelectorAll('.admin-cat-del').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.id;
      const inUse = store.products.filter(p=>p.cat===id).length;
      if(inUse>0){ alert(`Não é possível excluir: ${inUse} produto(s) usam essa categoria. Altere a categoria desses produtos primeiro.`); return; }
      if(store.categories.length<=1){ alert('É preciso manter ao menos uma categoria.'); return; }
      if(confirm('Excluir esta categoria?')){
        try{ await deleteCategoryDb(id); }catch(err){ return; }
        store.categories = store.categories.filter(c=>c.id!==id);
        render(); renderCatTeaser();
        renderAdminMain();
      }
    });
  });
}
export function renderCategoriasForm(){
  const c = adminDraft;
  const iconOptions = Object.keys(CAT_ICONS).map(k=>`<option value="${k}" ${c.icon===k?'selected':''}>${k}</option>`).join('');
  return `
    <div class="admin-header">
      <h3 class="serif admin-title">${adminEditingId==='new'?'Nova categoria':'Editar categoria'}</h3>
      <button type="button" class="admin-back-btn" id="adminBackBtn">← Voltar à lista</button>
    </div>
    <form id="adminForm" class="admin-form">
      <div class="admin-grid">
        <div class="form-field"><label for="fCatName">Nome *</label><input id="fCatName" type="text" required value="${c.name||''}"></div>
        <div class="form-field"><label for="fCatOrder">Ordem de exibição</label><input id="fCatOrder" type="number" min="1" value="${c.order??1}"></div>
      </div>
      <div class="form-field"><label for="fCatIcon">Ícone</label><select id="fCatIcon">${iconOptions}</select></div>
      <div class="form-field"><label for="fCatDesc">Descrição</label><textarea id="fCatDesc">${c.desc||''}</textarea></div>
      <fieldset class="admin-fieldset"><legend>Imagem da categoria</legend><div id="catImgUploader"></div></fieldset>
      <p class="admin-error" id="adminFormError"></p>
      <div class="admin-form-actions">
        <button type="submit" class="btn btn-gold">Salvar</button>
        <button type="button" class="btn btn-outline" id="adminCancelBtn">Cancelar</button>
      </div>
    </form>
  `;
}
export function attachCategoriasFormEvents(){
  document.getElementById('adminBackBtn').addEventListener('click', ()=>{ adminEditingId=null; adminDraft=null; renderAdminMain(); });
  document.getElementById('adminCancelBtn').addEventListener('click', ()=>{ adminEditingId=null; adminDraft=null; renderAdminMain(); });
  document.getElementById('fCatName').addEventListener('input', e=>{ adminDraft.name=e.target.value; });
  document.getElementById('fCatOrder').addEventListener('input', e=>{ adminDraft.order=e.target.value?parseInt(e.target.value,10):1; });
  document.getElementById('fCatIcon').addEventListener('change', e=>{ adminDraft.icon=e.target.value; });
  document.getElementById('fCatDesc').addEventListener('input', e=>{ adminDraft.desc=e.target.value; });

  const wrap = document.getElementById('catImgUploader');
  wrap.innerHTML = renderUploader(adminDraft.img?[adminDraft.img]:[],{multiple:false});
  attachUploader(wrap, ()=>adminDraft.img?[adminDraft.img]:[], arr=>{ adminDraft.img=arr[0]||null; }, ()=>renderAdminMain());

  document.getElementById('adminForm').addEventListener('submit', async e=>{
    e.preventDefault();
    if(!adminDraft.name){ document.getElementById('adminFormError').textContent='Preencha o nome da categoria.'; return; }
    if(adminEditingId==='new'){
      adminDraft.id = slugify(adminDraft.name);
      if(store.categories.some(c=>c.id===adminDraft.id)){ document.getElementById('adminFormError').textContent='Já existe uma categoria com esse nome.'; return; }
      try{ await saveCategoryDb(adminDraft); }catch(err){ return; }
      store.categories.push(adminDraft);
    }else{
      try{ await saveCategoryDb(adminDraft); }catch(err){ return; }
      const i = store.categories.findIndex(c=>c.id===adminEditingId);
      if(i>-1) store.categories[i] = adminDraft;
    }
    render(); renderCatTeaser();
    adminEditingId=null; adminDraft=null;
    renderAdminMain();
  });
}

/* ================= BANNERS ================= */
export function renderBannersList(){
  const rows = store.banners.slice().sort((a,b)=>a.order-b.order).map(b=>`
    <div class="admin-row">
      <div class="admin-row-thumb">${b.imgDesktop?`<img src="${b.imgDesktop}" alt="">`:'<div class="ring"></div>'}</div>
      <div class="admin-row-info"><strong>${b.title||'(sem título)'}</strong><span>Ordem ${b.order} · ${b.active?'Ativo':'Inativo'}</span></div>
      <div class="admin-row-actions">
        <button class="btn btn-outline btn-sm admin-ban-edit" data-id="${b.id}">Editar</button>
        <button class="btn btn-outline btn-sm admin-ban-del" data-id="${b.id}">Excluir</button>
      </div>
    </div>
  `).join('');
  return `
    <div class="admin-header"><h3 class="serif admin-title">Carrossel do site (${store.banners.length})</h3></div>
    <p class="admin-sub">Essas são as fotos exibidas no carrossel do topo do site. Adicione, remova, reordene (campo "Ordem") ou desative sem excluir. Título, subtítulo e botão são opcionais — deixe em branco para mostrar só a foto.</p>
    <div class="admin-toolbar"><button type="button" class="btn btn-gold btn-sm" id="adminBanNewBtn">+ Adicionar foto</button></div>
    <div class="admin-list">${rows || '<p class="admin-sub">Nenhuma foto cadastrada — o carrossel do site está vazio.</p>'}</div>
  `;
}
export function attachBannersListEvents(){
  document.getElementById('adminBanNewBtn').addEventListener('click', ()=>{
    adminDraft = {id:null,title:'',subtitle:'',imgDesktop:null,imgMobile:null,btnText:'',btnLink:'',order:store.banners.length+1,active:true};
    adminEditingId = 'new';
    renderAdminMain();
  });
  document.querySelectorAll('.admin-ban-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = Number(btn.dataset.id);
      adminDraft = JSON.parse(JSON.stringify(store.banners.find(b=>b.id===id)));
      adminEditingId = id;
      renderAdminMain();
    });
  });
  document.querySelectorAll('.admin-ban-del').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = Number(btn.dataset.id);
      if(confirm('Remover esta foto do carrossel?')){
        try{ await deleteBannerDb(id); }catch(err){ return; }
        store.banners = store.banners.filter(b=>b.id!==id);
        renderAdminMain();
      }
    });
  });
}
export function renderBannersForm(){
  const b = adminDraft;
  return `
    <div class="admin-header">
      <h3 class="serif admin-title">${adminEditingId==='new'?'Adicionar foto ao carrossel':'Editar foto do carrossel'}</h3>
      <button type="button" class="admin-back-btn" id="adminBackBtn">← Voltar à lista</button>
    </div>
    <form id="adminForm" class="admin-form">
      <fieldset class="admin-fieldset"><legend>Foto (obrigatória)</legend><div id="banDesktopUploader"></div></fieldset>
      <fieldset class="admin-fieldset"><legend>Versão mobile (opcional — usa a foto acima se não enviar)</legend><div id="banMobileUploader"></div></fieldset>
      <div class="admin-grid">
        <div class="form-field"><label for="fBanTitle">Título (opcional)</label><input id="fBanTitle" type="text" value="${b.title||''}"></div>
        <div class="form-field"><label for="fBanSubtitle">Subtítulo (opcional)</label><input id="fBanSubtitle" type="text" value="${b.subtitle||''}"></div>
        <div class="form-field"><label for="fBanBtnText">Texto do botão (opcional)</label><input id="fBanBtnText" type="text" value="${b.btnText||''}"></div>
        <div class="form-field"><label for="fBanBtnLink">Link do botão (opcional)</label><input id="fBanBtnLink" type="text" placeholder="https://" value="${b.btnLink||''}"></div>
        <div class="form-field"><label for="fBanOrder">Ordem</label><input id="fBanOrder" type="number" min="1" value="${b.order??1}"></div>
      </div>
      <label class="admin-checkbox-row"><input type="checkbox" id="fBanActive" ${b.active?'checked':''}> Ativo (aparece no site)</label>
      <p class="admin-error" id="adminFormError"></p>
      <div class="admin-form-actions">
        <button type="submit" class="btn btn-gold">Salvar</button>
        <button type="button" class="btn btn-outline" id="adminCancelBtn">Cancelar</button>
      </div>
    </form>
  `;
}
export function attachBannersFormEvents(){
  document.getElementById('adminBackBtn').addEventListener('click', ()=>{ adminEditingId=null; adminDraft=null; renderAdminMain(); });
  document.getElementById('adminCancelBtn').addEventListener('click', ()=>{ adminEditingId=null; adminDraft=null; renderAdminMain(); });
  const bind = (id, field, opts={})=>{
    const el = document.getElementById(id);
    el.addEventListener(opts.evt||'input', ()=>{ adminDraft[field] = opts.parser ? opts.parser(el.value) : el.value; });
  };
  bind('fBanTitle','title'); bind('fBanSubtitle','subtitle'); bind('fBanBtnText','btnText'); bind('fBanBtnLink','btnLink');
  bind('fBanOrder','order',{parser:v=>v?parseInt(v,10):1});
  document.getElementById('fBanActive').addEventListener('change', e=>{ adminDraft.active=e.target.checked; });

  const bd = document.getElementById('banDesktopUploader');
  bd.innerHTML = renderUploader(adminDraft.imgDesktop?[adminDraft.imgDesktop]:[],{multiple:false});
  attachUploader(bd, ()=>adminDraft.imgDesktop?[adminDraft.imgDesktop]:[], arr=>{ adminDraft.imgDesktop=arr[0]||null; }, ()=>renderAdminMain());

  const bm = document.getElementById('banMobileUploader');
  bm.innerHTML = renderUploader(adminDraft.imgMobile?[adminDraft.imgMobile]:[],{multiple:false});
  attachUploader(bm, ()=>adminDraft.imgMobile?[adminDraft.imgMobile]:[], arr=>{ adminDraft.imgMobile=arr[0]||null; }, ()=>renderAdminMain());

  document.getElementById('adminForm').addEventListener('submit', async e=>{
    e.preventDefault();
    if(!adminDraft.imgDesktop){ document.getElementById('adminFormError').textContent='Adicione ao menos a imagem desktop.'; return; }
    try{ await saveBannerDb(adminDraft); }catch(err){ return; }
    if(adminEditingId==='new'){ store.banners.push(adminDraft); }
    else{ const i=store.banners.findIndex(x=>x.id===adminEditingId); if(i>-1) store.banners[i]=adminDraft; }
    adminEditingId=null; adminDraft=null;
    renderAdminMain();
  });
}
