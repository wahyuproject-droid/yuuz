/* Shared display helpers; every database operation remains subject to RLS. */
'use strict';
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const icon=(name,size=20)=>{const svg=window.YUUZ_ICONS?.[name]||window.YUUZ_ICONS?.game;if(!svg)return '';return svg.replace(/width="24"/,`width="${size}"`).replace(/height="24"/,`height="${size}"`).replace(/<svg\b/,'<svg aria-hidden="true" focusable="false"');};
const safeURL=(u,fallback='')=>{try{if(String(u).startsWith('assets/'))return u;const a=new URL(u);return ['https:','http:'].includes(a.protocol)?a.href:fallback;}catch{return fallback;}};
const statusLabels={pending:'Menunggu Pembayaran',verification:'Menunggu Verifikasi',processing:'Diproses',completed:'Selesai',cancelled:'Dibatalkan'};
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function fail(error){const raw=error?.message||String(error);toast(/fetch|network|koneksi|Failed to fetch/i.test(raw)?'Koneksi terputus. Periksa internet dan coba lagi.':raw);}
async function checked(query){const {data,error}=await query;if(error)throw error;return data;}
function busy(button,on,label){if(!button)return;button.disabled=on;if(on){button.dataset.label=button.innerHTML;button.textContent=label||'Memproses…';}else button.innerHTML=button.dataset.label||button.innerHTML;}
function modal(content){const d=$('#modal');if(d.open&&typeof d.onclose==='function')d.onclose();d.onclose=null;d.onkeydown=null;d.onclick=null;d.innerHTML=`<button class="icon-btn modal-close" aria-label="Tutup">${icon('close')}</button>${content}`;if(!d.open)(typeof d.showModal==='function'?d.showModal():d.setAttribute('open',''));$('.modal-close',d).onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close();};return d;}
const config=window.YUUZ_CONFIG||{};
let setupIssue='',client=null;
try{if(!config.SUPABASE_URL||/^(ISI_|YOUR_)/i.test(config.SUPABASE_URL))throw Error('Isi Project URL dan publishable/anon key Supabase pada config.js.');const url=new URL(config.SUPABASE_URL||'');if(url.protocol!=='https:'||!url.hostname.includes('.'))throw Error('Tempel Project URL Supabase dengan awalan https:// ke config.js.');const key=String(config.SUPABASE_ANON_KEY||'');if(!key||/^(ISI_|YOUR_)/i.test(key))throw Error('Tempel publishable/anon key Supabase ke config.js.');if(key.startsWith('sb_secret_'))throw Error('Gunakan publishable/anon key, bukan secret key.');if(key.split('.').length===3){try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role==='service_role')throw Error('service_role tidak boleh dipasang di frontend.');}catch(error){if(error.message.includes('service_role'))throw error;}}
 if(!window.supabase?.createClient)throw Error('SDK Supabase belum termuat. Periksa koneksi atau file assets/supabase.js.');client=window.supabase.createClient(url.href.replace(/\/$/,''),key);
}catch(error){setupIssue=error.message;}
const db=client,configured=!!client;
const setupHTML=()=>`<div class="notice setup-notice"><span class="setup-icon">${icon('settings',24)}</span><div><strong>Hubungkan toko ke Supabase</strong><p>${esc(setupIssue||'Isi dua nilai pada config.js dan jalankan database.sql dari ZIP Admin.')}</p><small>Jalankan database.sql dari ZIP Admin, isi config.js di User dan Admin, lalu muat ulang. Panduan lengkap tersedia di README.md.</small></div></div>`;
const memoryStorage=new Map();let storageWarningShown=false;
const storageGet=(name,key)=>{try{return window[name].getItem(key)??memoryStorage.get(name+':'+key)??null;}catch{return memoryStorage.get(name+':'+key)??null;}};
function storageSet(name,key,value){memoryStorage.set(name+':'+key,value);try{window[name].setItem(key,value);return true;}catch{if(!storageWarningShown){storageWarningShown=true;toast('Penyimpanan browser diblokir. Data sementara hanya bertahan selama halaman ini terbuka.');}return false;}}
function storageRemove(name,key){memoryStorage.delete(name+':'+key);try{window[name].removeItem(key);}catch{}}
const imageTag=(url,alt,cls='')=>`<img class="${cls}" src="${esc(safeURL(url,'assets/logo.svg'))}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='assets/logo.svg'">`;
function bindSwipe(element,callback){let start=null;element.addEventListener('touchstart',e=>{if(e.touches.length===1)start={x:e.touches[0].clientX,y:e.touches[0].clientY};else start=null;},{passive:true});element.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))callback(dx<0?1:-1);start=null;},{passive:true});}

// v2 payment display helpers. Database timestamps are authoritative.
const paymentLabels={awaiting_payment:'Menunggu Pembayaran',awaiting_proof:'Menunggu Bukti Transfer',awaiting_verification:'Menunggu Verifikasi',rejected:'Pembayaran Ditolak',verified:'Pembayaran Terverifikasi',expired:'Kedaluwarsa',cancelled:'Dibatalkan'};
const refundLabels={none:'Tidak Ada Refund',requested:'Refund Diajukan',processing:'Refund Diproses',refunded:'Refund Selesai'};
statusLabels.expired='Kedaluwarsa';
const formatDate=t=>t?new Date(t).toLocaleString('id-ID'):'—';
const serverClock={baseMs:Date.now(),basePerf:performance.now(),synced:false};
async function syncClock(){if(!db)return;const start=performance.now();const stamp=await checked(db.rpc('get_server_time'));serverClock.baseMs=new Date(stamp).getTime()+(performance.now()-start)/2;serverClock.basePerf=performance.now();serverClock.synced=Number.isFinite(serverClock.baseMs);}
const serverNow=()=>serverClock.baseMs+(performance.now()-serverClock.basePerf);
function timeRemaining(deadline){const diff=Math.max(0,Math.ceil((new Date(deadline).getTime()-serverNow())/1000));return `${Math.floor(diff/3600)} Jam ${Math.floor(diff%3600/60)} Menit ${diff%60} Detik`;}
function historyHTML(history){return (history||[]).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(h=>`<div class="timeline-item"><strong>${esc((h.new_status||'').split(' / ').map(s=>paymentLabels[s]||statusLabels[s]||s).join(' · '))}</strong><small>${formatDate(h.created_at)}</small><p>${esc(h.notes)}</p></div>`).join('')||'<p class="muted">Belum ada riwayat.</p>';}
async function openEvidence(path){try{const {signedUrl}=await checked(db.storage.from('payment-proofs').createSignedUrl(path,300));const d=modal(`<h2>Bukti Transfer</h2><div class="lightbox">${imageTag(signedUrl,'Screenshot bukti transfer')}</div><button class="btn secondary" id="proof-zoom">Zoom</button><small> Tautan gambar berlaku 5 menit.</small>`);$('#proof-zoom',d).onclick=()=>$('.lightbox',d).classList.toggle('zoom');}catch(e){fail(e);}}
async function validateProofFile(file){if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Pilih JPG, PNG, atau WEBP.');if(file.size<1||file.size>5*1024*1024)throw Error('Bukti transfer maksimal 5 MB.');const bmp=await createImageBitmap(file);if(bmp.width*bmp.height>40000000){bmp.close();throw Error('Gambar maksimal 40 megapiksel.');}bmp.close();}

const listify=v=>Array.isArray(v)?v:v?[v]:[];
const topupLabels={pending:'Menunggu Pembayaran',verification:'Menunggu ACC',approved:'Berhasil',rejected:'Ditolak',expired:'Kedaluwarsa',cancelled:'Dibatalkan'};
paymentLabels.awaiting_approval='Menunggu ACC Admin';statusLabels.rejected='Ditolak';statusLabels.approved='Berhasil';

// A high-contrast black/white switch; its label names the next appearance.
function themeButtonHTML(){const dark=document.documentElement.dataset.theme==='dark';return `<button type="button" class="icon-btn theme-toggle" data-theme-toggle aria-label="Aktifkan tema ${dark?'terang':'gelap'}" aria-pressed="${dark}" title="Aktifkan tema ${dark?'terang':'gelap'}">${icon(dark?'sun':'moon',19)}<span class="theme-label">${dark?'Terang':'Gelap'}</span></button>`;}
function setAppearance(theme,persist=true){const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';if(persist)storageSet('localStorage','yuuz_theme',dark?'dark':'light');const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#09090b':'#ffffff';document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.innerHTML=icon(dark?'sun':'moon',19)+`<span class="theme-label">${dark?'Terang':'Gelap'}</span>`;b.setAttribute('aria-label','Aktifkan tema '+(dark?'terang':'gelap'));b.setAttribute('aria-pressed',String(dark));b.title='Aktifkan tema '+(dark?'terang':'gelap');});}
document.addEventListener('click',e=>{if(e.target.closest('[data-theme-toggle]'))setAppearance(document.documentElement.dataset.theme==='dark'?'light':'dark');});
window.addEventListener('storage',e=>{if(e.key==='yuuz_theme'&&['light','dark'].includes(e.newValue))setAppearance(e.newValue,false);});
// Close payment assets at the deadline even if the page remains open.
setInterval(()=>document.querySelectorAll('[data-payment-until]').forEach(el=>{if(new Date(el.dataset.paymentUntil).getTime()<=serverNow())el.outerHTML='<div class="notice warning">Batas pembayaran berakhir. QRIS ditutup. Menunggu pembaruan status dari server.</div>';}),1000);

async function validateBannerFile(file){if(!file||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Gunakan foto PNG/JPG/WebP atau GIF.');if(file.size<1||file.size>8388608)throw Error('Banner maksimal 8 MB.');const bitmap=await createImageBitmap(file);try{if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>40000000)throw Error('Dimensi banner maksimal 40 megapiksel.');}finally{bitmap.close();}}
