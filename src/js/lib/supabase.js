import { createClient } from '@supabase/supabase-js';

/* ===== Supabase ===== */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mpvxhjvbmgobzqcebxxg.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hKLVRa-XZMPTLYyKkYvx3A_lNwSAiN6';
export const STORAGE_BUCKET = 'product-images';
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* reduz a foto antes de enviar (fotos de celular têm 3-8MB e deixavam o catálogo lento) */
export function compressImage(file, maxSide=1600, quality=0.82){
  return new Promise(resolve=>{
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide/Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width*scale);
      canvas.height = Math.round(img.height*scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>resolve(blob && blob.size<file.size ? blob : file), 'image/jpeg', quality);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export async function uploadProductImage(file){
  const body = await compressImage(file);
  const baseName = file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9\-_]/g,'_');
  const ext = body===file ? (file.name.match(/\.[a-zA-Z0-9]+$/)||['.jpg'])[0] : '.jpg';
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${baseName}${ext}`;
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, body, { cacheControl:'31536000', upsert:false, contentType: body.type || file.type });
  if(error){ alert('Erro ao enviar imagem: '+error.message); throw error; }
  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
