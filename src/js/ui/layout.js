import { WHATSAPP_NUMBER } from '../config.js';
import { modalOverlay } from './product-page.js';

/* ===== header scroll state ===== */
export const header = document.getElementById('siteHeader');
window.addEventListener('scroll', ()=>{
  header.classList.toggle('scrolled', window.scrollY>40);
}, {passive:true});

/* ===== mobile nav ===== */
export const mobileNav = document.getElementById('mobileNav');
document.getElementById('menuToggle').addEventListener('click', ()=>{ mobileNav.classList.add('open'); document.body.classList.add('no-scroll'); });
document.getElementById('mobileNavClose').addEventListener('click', closeMobileNav);
document.getElementById('mobileNavBackdrop').addEventListener('click', closeMobileNav);
export function closeMobileNav(){
  if(!mobileNav.classList.contains('open')) return;
  mobileNav.classList.remove('open');
  if(!modalOverlay.classList.contains('show')) document.body.classList.remove('no-scroll');
}
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click', closeMobileNav));

/* ===== reveal on scroll ===== */
export const io = new IntersectionObserver(entries=>{
  entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ===== toast ===== */
export const toast = document.getElementById('toast');
export function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 3200);
}

/* ===== formulário de contato → abre conversa no WhatsApp ===== */
document.getElementById('contactForm').addEventListener('submit', e=>{
  e.preventDefault();
  const name = document.getElementById('cName').value.trim();
  const msg = document.getElementById('cMsg').value.trim();
  const text = `Olá! Meu nome é ${name}.\n${msg}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  e.target.reset();
});

document.getElementById('footerAdminLink').addEventListener('click', ()=>document.getElementById('adminTrigger').click());
document.getElementById('mobileAdminBtn').addEventListener('click', ()=>{ closeMobileNav(); document.getElementById('adminTrigger').click(); });
document.getElementById('mobileThemeBtn').addEventListener('click', ()=>document.getElementById('themeToggle').click());

document.getElementById('year').textContent = new Date().getFullYear();

/* ===== inicialização (carrega dados do Supabase) ===== */
