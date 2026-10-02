/* ===== tema claro/escuro ===== */
export const THEME_KEY = 'jl_theme';
export function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.querySelector('.icon-sun').style.display = theme==='dark' ? 'block' : 'none';
  btn.querySelector('.icon-moon').style.display = theme==='dark' ? 'none' : 'block';
}
applyTheme(document.documentElement.getAttribute('data-theme')==='dark' ? 'dark' : 'light');
document.getElementById('themeToggle').addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
