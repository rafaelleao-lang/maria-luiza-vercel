// ===================================================================
// MARIA LUIZA — app.js
// Timezone: America/Sao_Paulo (UTC-3, sem horário de verão desde 2019)
// ===================================================================

const TZ = 'America/Sao_Paulo';

// ===== ESTADO =====
const State = {
  screen: 'dashboard',
  timer: null,
  timerEndTs: null,
  crescimentoChart: null,
  crescimentoMode: 'peso',
};

const TIMER_DURATION_MS = 15 * 60 * 1000;
const TIMER_LS_KEY = 'ml_timer_end';

// ===================================================================
// TIMEZONE — FUNÇÕES CENTRAIS
// Regra: TUDO que vai para o backend leva offset -03:00
//        TUDO que vem do backend é exibido com Intl + TZ Brasil
// ===================================================================

/**
 * Retorna a hora atual no formato YYYY-MM-DDTHH:mm (para inputs datetime-local)
 * usando o fuso horário do Brasil, independente do fuso do dispositivo.
 */
function nowBRLocal() {
  // 'sv-SE' retorna formato ISO-like: "2024-01-01 22:00:00"
  return new Date().toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 16).replace(' ', 'T');
}

/**
 * Retorna a data atual no formato YYYY-MM-DD no fuso Brasil.
 */
function todayBR() {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 10);
}

/**
 * Converte valor de input datetime-local (sem TZ) para ISO com offset Brasil.
 * Ex: "2024-01-01T22:00" → "2024-01-01T22:00:00-03:00"
 * Isso faz o Supabase salvar corretamente como UTC 01:00 do dia seguinte.
 */
function toBRIso(localValue) {
  if (!localValue) return null;
  const v = localValue.length === 16 ? localValue + ':00' : localValue;
  return v + '-03:00';
}

/**
 * Formata datetime para exibição com data e hora no fuso Brasil.
 * Ex: "2024-01-02T01:00:00+00:00" → "01/01 22:00"
 */
function fmt(dt) {
  if (!dt) return '--';
  try {
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(d);
  } catch { return dt; }
}

/**
 * Formata somente a hora no fuso Brasil.
 * Ex: "2024-01-02T01:00:00+00:00" → "22:00"
 */
function fmtTime(dt) {
  if (!dt) return '--';
  try {
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      hour: '2-digit', minute: '2-digit',
    }).format(d);
  } catch { return dt; }
}

/**
 * Formata somente a data.
 * Para strings date-only (YYYY-MM-DD), evita conversão de TZ que causaria off-by-one.
 */
function fmtDate(dt) {
  if (!dt) return '--';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
    const [y, m, d] = dt.split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(dt));
  } catch { return dt; }
}

/**
 * Retorna tempo relativo em linguagem natural.
 * "há 30min", "em 2h", "em 3 dias"
 */
function relTime(dt) {
  if (!dt) return '';
  const then = new Date(dt);
  if (isNaN(then)) return '';
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  if (diffMs < -7200000) return `há ${h}h`;
  if (diffMs < 0) return `há ${m > 0 ? m + 'min' : '< 1min'}`;
  if (h < 1) return `em ${m}min`;
  if (h < 24) return `em ${h}h${m > 0 ? m + 'min' : ''}`;
  const days = Math.ceil(h / 24);
  return `em ${days} dia${days > 1 ? 's' : ''}`;
}

// ===== API =====
async function api(method, path, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch('/api' + path, opts);
    if (!r.ok && r.status !== 400) throw new Error('HTTP ' + r.status);
    return r.json();
  } catch (e) {
    return { status: 'error', msg: e.message };
  }
}
const GET  = path        => api('GET', path);
const POST = (path, body) => api('POST', path, body);
const DEL  = path        => api('DELETE', path);

// ===== TOAST =====
function toast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = (type === 'success' ? '✓ ' : '⚠ ') + msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

function loader() {
  return `<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div>`;
}

// ===== NAVEGAÇÃO =====
function navigate(screen) {
  State.screen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const scr = document.getElementById('screen-' + screen);
  if (scr) scr.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-screen="${screen}"]`);
  if (nav) nav.classList.add('active');
  const fab = document.getElementById('fab');
  const noFab = ['dashboard', 'proximos', 'mais'];
  if (fab) fab.style.display = noFab.includes(screen) ? 'none' : 'flex';
  // Scroll topo ao trocar tela
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Sincroniza floating timer: esconde na tela de mamadas (tem timer inline), mostra no resto
  if (State.timerEndTs) {
    const ft = document.getElementById('floating-timer');
    const onMamadas = screen === 'mamadas';
    if (ft) ft.classList.toggle('visible', !onMamadas);
    document.body.classList.toggle('timer-active', !onMamadas);
  }
  loadScreen(screen);
}

function loadScreen(s) {
  const map = {
    dashboard:   loadDashboard,
    mamadas:     loadMamadas,
    remedios:    loadRemedios,
    consultas:   loadConsultas,
    exames:      loadExames,
    vacinas:     loadVacinas,
    crescimento: loadCrescimento,
    compras:     loadCompras,
    lembretes:   loadLembretes,
    proximos:    loadProximos,
  };
  if (map[s]) map[s]();
}

// ===================================================================
// FOTO DA MARIA LUIZA
// Armazenada localmente como base64 (funciona offline, sem server)
// ===================================================================
function loadPhoto() {
  const photo = localStorage.getItem('ml_photo');
  const img   = document.getElementById('avatar-img');
  const emoji = document.getElementById('avatar-emoji');
  if (photo && img) {
    img.src = photo;
    img.style.display = 'block';
    if (emoji) emoji.style.display = 'none';
  }
}

async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Selecione uma imagem', 'error');
  if (file.size > 10 * 1024 * 1024) return toast('Foto muito grande (máx 10MB)', 'error');

  try {
    const dataUrl = await resizeImage(file, 300);
    localStorage.setItem('ml_photo', dataUrl);
    loadPhoto();
    toast('Foto atualizada! 💖');
  } catch {
    toast('Erro ao processar foto', 'error');
  }
}

function resizeImage(file, maxPx) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const img    = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function triggerPhotoInput() {
  document.getElementById('photo-input').click();
}

// ===================================================================
// DASHBOARD
// ===================================================================
async function loadDashboard() {
  const r = await GET('/dashboard');
  if (r.status !== 'ok') { toast('Erro ao carregar dashboard', 'error'); return; }
  const d = r.data;

  document.getElementById('stat-mamadas').textContent  = d.mamadas_hoje ?? 0;
  document.getElementById('stat-remedios').textContent  = d.remedios.length;
  document.getElementById('stat-consultas').textContent = d.consultas.length;

  // Última mamada
  const mamWrap = document.getElementById('dash-ultima-mamada');
  const ul = d.ultima_mamada;
  if (ul) {
    mamWrap.innerHTML = `
      <div class="row">
        <div>
          <h3>Última mamada</h3>
          <div class="big">${fmtTime(ul.horario)}</div>
          <div class="sub">${relTime(ul.horario)}${ul.ml ? ' · ' + ul.ml + 'ml' : ''}</div>
        </div>
        <div class="emoji">🍼</div>
      </div>`;
  } else {
    mamWrap.innerHTML = `<div class="row"><div><h3>Última mamada</h3><div class="big">--</div><div class="sub">Nenhuma hoje</div></div><div class="emoji">🍼</div></div>`;
  }

  // Remédios
  const remEl = document.getElementById('dash-remedios');
  remEl.innerHTML = d.remedios.length
    ? d.remedios.slice(0,3).map(rem => {
        const cls = proximityClass(rem.proximo_horario);
        return `<div class="flex-between mb-8"><span class="fw-600 fs-sm">${esc(rem.nome)}</span><span class="rem-next ${cls} fs-sm">${fmtTime(rem.proximo_horario)}</span></div>`;
      }).join('')
    : `<div class="text-muted fs-sm">Nenhum cadastrado</div>`;

  // Consultas
  const conEl = document.getElementById('dash-consultas');
  conEl.innerHTML = d.consultas.length
    ? d.consultas.slice(0,3).map(c =>
        `<div class="flex-between mb-8"><span class="fw-600 fs-sm">${esc(c.nome)}</span><span class="text-muted fs-sm">${fmt(c.horario)}</span></div>`
      ).join('')
    : `<div class="text-muted fs-sm">Nenhuma agendada</div>`;

  // Vacinas
  const vacEl = document.getElementById('dash-vacinas');
  vacEl.innerHTML = d.vacinas.length
    ? d.vacinas.slice(0,3).map(v =>
        `<div class="flex-between mb-8"><span class="fw-600 fs-sm">${esc(v.nome)}</span><span class="badge badge-${v.tipo==='SUS'?'blue':'purple'}">${v.tipo}</span></div>`
      ).join('')
    : `<div class="text-muted fs-sm">Nenhuma pendente</div>`;

  // Lembretes
  const lemEl = document.getElementById('dash-lembretes');
  lemEl.innerHTML = d.lembretes.length
    ? d.lembretes.slice(0,3).map(l => `<div class="mb-8 fs-sm">📌 ${esc(l.texto)}</div>`).join('')
    : `<div class="text-muted fs-sm">Sem lembretes</div>`;
}

function proximityClass(horario) {
  if (!horario) return '';
  const diff = new Date(horario) - Date.now();
  if (diff < 0) return 'due';
  if (diff < 30 * 60000) return 'soon';
  return '';
}

// ===================================================================
// MAMADAS
// ===================================================================
async function loadMamadas() {
  const list = document.getElementById('mamadas-list');
  list.innerHTML = loader();
  const r = await GET('/mamadas');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('🍼', 'Nenhuma mamada registrada'); return;
  }
  list.innerHTML = r.data.map(m => `
    <div class="mamada-card" id="mamada-${m.id}">
      <div class="mamada-icon">🍼</div>
      <div class="mamada-info">
        <div class="mamada-time">${fmt(m.horario)}</div>
        <div class="mamada-ml">${m.ml ? m.ml + ' ml' : 'Qtd não informada'} · ${relTime(m.horario)}</div>
      </div>
      <button class="btn btn-sm btn-danger btn-icon" onclick="delMamada('${m.id}')">🗑</button>
    </div>`).join('');
}

async function saveMamada() {
  const localVal = document.getElementById('mam-horario').value;
  const ml       = document.getElementById('mam-ml').value;
  if (!localVal) return toast('Informe o horário', 'error');
  // Envia com offset Brasil para Supabase salvar UTC correto
  const r = await POST('/mamadas', { horario: toBRIso(localVal), ml });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  document.getElementById('mam-horario').value = '';
  document.getElementById('mam-ml').value = '';
  closeModal('modal-mamada');
  loadMamadas();
  iniciarTimerArroto();
}

async function delMamada(id) {
  if (!confirm('Remover esta mamada?')) return;
  const r = await DEL('/mamadas/' + id);
  if (r.status !== 'ok') return toast(r.msg, 'error');
  document.getElementById('mamada-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// TIMER ARROTO — baseado em timestamp real (funciona em background)
// ===================================================================
async function iniciarTimerArroto() {
  await _pedirPermissaoNotificacao();
  const endTs = Date.now() + TIMER_DURATION_MS;
  localStorage.setItem(TIMER_LS_KEY, String(endTs));
  State.timerEndTs = endTs;
  _mostrarTimers();
  _startTimerInterval();
}

function _startTimerInterval() {
  if (State.timer) clearInterval(State.timer);
  State.timer = setInterval(_tickTimer, 500);
}

function _tickTimer() {
  if (!State.timerEndTs) return;
  const remaining = State.timerEndTs - Date.now();
  if (remaining <= 0) {
    clearInterval(State.timer);
    State.timer = null;
    localStorage.removeItem(TIMER_LS_KEY);
    State.timerEndTs = null;
    _esconderTimers();
    toast('Tempo de arrotar concluído! 🎉');
    _notificarArroto();
    return;
  }
  _renderTimerDisplay(remaining);
}

function _renderTimerDisplay(remaining) {
  const m   = Math.floor(remaining / 60000);
  const s   = Math.floor((remaining % 60000) / 1000);
  const str = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct = (remaining / TIMER_DURATION_MS * 100) + '%';

  const td = document.getElementById('timer-display');
  const tf = document.getElementById('timer-fill');
  if (td) td.textContent = str;
  if (tf) tf.style.width = pct;

  const ft = document.getElementById('ft-time');
  const fb = document.getElementById('ft-bar-fill');
  if (ft) ft.textContent = str;
  if (fb) fb.style.width = pct;
}

function _mostrarTimers() {
  document.getElementById('timer-wrap')?.classList.add('visible');
  if (State.screen !== 'mamadas') {
    document.getElementById('floating-timer')?.classList.add('visible');
    document.body.classList.add('timer-active');
  }
}

function _esconderTimers() {
  document.getElementById('timer-wrap')?.classList.remove('visible');
  document.getElementById('floating-timer')?.classList.remove('visible');
  document.body.classList.remove('timer-active');
}

function stopTimer() {
  if (State.timer) { clearInterval(State.timer); State.timer = null; }
  localStorage.removeItem(TIMER_LS_KEY);
  State.timerEndTs = null;
  _esconderTimers();
}

function restaurarTimer() {
  const saved = localStorage.getItem(TIMER_LS_KEY);
  if (!saved) return;
  const endTs = Number(saved);
  if (isNaN(endTs) || Date.now() >= endTs) {
    localStorage.removeItem(TIMER_LS_KEY);
    return;
  }
  State.timerEndTs = endTs;
  _renderTimerDisplay(endTs - Date.now());
  _mostrarTimers();
  _startTimerInterval();
}

async function _notificarArroto() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('Maria Luiza 💖', {
      body: 'Hora de arrotar! Os 15 minutos terminaram. 🎉',
      icon: '/static/icons/ml.svg',
      badge: '/static/icons/ml.svg',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'ml-arroto',
      renotify: false,
    });
  } catch {
    try {
      new Notification('Maria Luiza 💖', { body: 'Hora de arrotar! Os 15 minutos terminaram. 🎉' });
    } catch {}
  }
}

async function _pedirPermissaoNotificacao() {
  if ('Notification' in window && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch {}
  }
}

// ===================================================================
// REMÉDIOS
// ===================================================================
async function loadRemedios() {
  const list = document.getElementById('remedios-list');
  list.innerHTML = loader();
  const r = await GET('/remedios');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('💊', 'Nenhum remédio cadastrado'); return;
  }
  list.innerHTML = r.data.map(rem => {
    const cls = proximityClass(rem.proximo_horario);
    return `
    <div class="card" id="rem-${rem.id}">
      <div class="card-row">
        <div class="card-info">
          <div class="card-name">💊 ${esc(rem.nome)}</div>
          <div class="rem-next ${cls}">Próxima: ${fmtTime(rem.proximo_horario)} <span class="fs-sm">${relTime(rem.proximo_horario)}</span></div>
          <div class="card-sub">A cada ${rem.intervalo_horas}h · Início ${fmt(rem.horario_inicio)}</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-green-ghost" onclick="tomarRemedio('${rem.id}')">Tomei ✓</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="delRemedio('${rem.id}')">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function saveRemedio() {
  const nome     = document.getElementById('rem-nome').value.trim();
  const localVal = document.getElementById('rem-inicio').value;
  const intervalo = document.getElementById('rem-intervalo').value;
  if (!nome || !localVal || !intervalo) return toast('Preencha todos os campos', 'error');
  const r = await POST('/remedios', { nome, inicio: toBRIso(localVal), intervalo });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  closeModal('modal-remedio');
  loadRemedios();
}

async function tomarRemedio(id) {
  const r = await POST('/remedios/' + id + '/tomar');
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast('Dose registrada! ✓');
  loadRemedios();
}

async function delRemedio(id) {
  if (!confirm('Remover este remédio?')) return;
  await DEL('/remedios/' + id);
  document.getElementById('rem-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// CONSULTAS
// ===================================================================
async function loadConsultas() {
  const list = document.getElementById('consultas-list');
  list.innerHTML = loader();
  const r = await GET('/consultas');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('🏥', 'Nenhuma consulta agendada'); return;
  }
  list.innerHTML = r.data.map(c => {
    const passada = new Date(c.horario) < Date.now();
    return `
    <div class="consulta-card${passada ? ' passada' : ''}" id="con-${c.id}">
      <div class="con-header">
        <div class="con-icon">🏥</div>
        <div class="con-info">
          <div class="con-nome">${esc(c.nome)}</div>
          <span class="badge badge-${modalidadeBadge(c.modalidade)} con-badge">${esc(c.modalidade||'Consulta')}</span>
        </div>
        <button class="btn btn-sm btn-danger btn-icon" onclick="delConsulta('${c.id}')">🗑</button>
      </div>
      <div class="con-details">
        <span class="con-chip">📆 ${fmtDate(c.horario)}</span>
        <span class="con-chip">🕐 ${fmtTime(c.horario)}</span>
        ${c.local ? `<span class="con-chip">📍 ${esc(c.local)}</span>` : ''}
      </div>
      <div class="con-footer">
        ${passada
          ? '<span class="badge badge-gray">Concluída</span>'
          : `<span class="con-rel text-pink">⏳ ${relTime(c.horario)}</span>`}
      </div>
    </div>`;
  }).join('');
}

const modalidadeBadge = m => ({ Pediatra:'pink', Fisioterapeuta:'green', Gastro:'orange', Neurologista:'purple', Cardiologista:'blue' })[m] || 'gray';

async function saveConsulta() {
  const nome       = document.getElementById('con-nome').value.trim();
  const data       = document.getElementById('con-data').value;
  const hora       = document.getElementById('con-hora').value;
  const local      = document.getElementById('con-local').value.trim();
  const modalidade = document.getElementById('con-modalidade').value;
  if (!nome || !data || !hora) return toast('Preencha nome, data e horário', 'error');
  const localVal = `${data}T${hora}`;
  const r = await POST('/consultas', { nome, horario: toBRIso(localVal), local, modalidade });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  closeModal('modal-consulta');
  loadConsultas();
}

async function delConsulta(id) {
  if (!confirm('Remover esta consulta?')) return;
  await DEL('/consultas/' + id);
  document.getElementById('con-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// EXAMES
// ===================================================================
async function loadExames() {
  const list = document.getElementById('exames-list');
  list.innerHTML = loader();
  const r = await GET('/exames');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('🔬', 'Nenhum exame agendado'); return;
  }
  list.innerHTML = r.data.map(e => `
    <div class="card" id="exa-${e.id}">
      <div class="card-row">
        <div class="card-info">
          <div class="card-name">🔬 ${esc(e.nome)}</div>
          <div class="card-sub">${fmt(e.horario)}${e.local ? ' · ' + esc(e.local) : ''}</div>
          ${e.observacao ? `<div class="card-sub mt-8">${esc(e.observacao)}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-danger btn-icon" onclick="delExame('${e.id}')">🗑</button>
      </div>
    </div>`).join('');
}

async function saveExame() {
  const nome      = document.getElementById('exa-nome').value.trim();
  const localVal  = document.getElementById('exa-horario').value;
  const local     = document.getElementById('exa-local').value.trim();
  const observacao = document.getElementById('exa-obs').value.trim();
  if (!nome || !localVal) return toast('Preencha os campos obrigatórios', 'error');
  const r = await POST('/exames', { nome, horario: toBRIso(localVal), local, observacao });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  closeModal('modal-exame');
  loadExames();
}

async function delExame(id) {
  if (!confirm('Remover este exame?')) return;
  await DEL('/exames/' + id);
  document.getElementById('exa-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// VACINAS
// ===================================================================
async function loadVacinas() {
  const pendList = document.getElementById('vacinas-pendentes');
  const aplList  = document.getElementById('vacinas-aplicadas');
  pendList.innerHTML = aplList.innerHTML = loader();
  const r = await GET('/vacinas');
  if (r.status !== 'ok') return;
  const pendentes = r.data.filter(v => !v.aplicada);
  const aplicadas = r.data.filter(v =>  v.aplicada);

  pendList.innerHTML = pendentes.length ? pendentes.map(vacinaCard).join('')
    : empty('💉', 'Nenhuma vacina pendente');
  aplList.innerHTML = aplicadas.length ? aplicadas.map(vacinaCard).join('')
    : `<div class="text-muted fs-sm" style="padding:16px 0">Nenhuma aplicada ainda</div>`;
}

function vacinaCard(v) {
  return `
    <div class="card" id="vac-${v.id}">
      <div class="card-row">
        <div class="vacina-card">
          <div class="vacina-check ${v.aplicada ? 'checked' : ''}"
               ${!v.aplicada ? `onclick="aplicarVacina('${v.id}')"` : ''}>
            ${v.aplicada ? '✓' : ''}
          </div>
          <div class="card-info">
            <div class="card-name">💉 ${esc(v.nome)}</div>
            <div class="card-sub">${v.aplicada
              ? 'Aplicada em ' + fmtDate(v.data_aplicacao)
              : 'Prevista: ' + fmtDate(v.data_prevista)}</div>
          </div>
        </div>
        <div class="card-actions">
          <span class="badge badge-${v.tipo==='SUS'?'blue':'purple'}">${v.tipo}</span>
          <button class="btn btn-sm btn-danger btn-icon" onclick="delVacina('${v.id}')">🗑</button>
        </div>
      </div>
    </div>`;
}

async function aplicarVacina(id) {
  const r = await POST('/vacinas/' + id + '/aplicar');
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast('Vacina aplicada! 💉');
  loadVacinas();
}

async function saveVacina() {
  const nome         = document.getElementById('vac-nome').value.trim();
  const data_prevista = document.getElementById('vac-data').value;
  const tipo         = document.getElementById('vac-tipo').value;
  if (!nome || !data_prevista) return toast('Preencha os campos', 'error');
  const r = await POST('/vacinas', { nome, data_prevista, tipo });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  closeModal('modal-vacina');
  loadVacinas();
}

async function delVacina(id) {
  if (!confirm('Remover esta vacina?')) return;
  await DEL('/vacinas/' + id);
  document.getElementById('vac-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// CRESCIMENTO
// ===================================================================
async function loadCrescimento() {
  const list = document.getElementById('crescimento-list');
  list.innerHTML = loader();
  const r = await GET('/crescimento');
  if (r.status !== 'ok') return;

  renderCrescimentoChart(r.data);

  if (!r.data.length) {
    list.innerHTML = empty('📏', 'Nenhuma medida registrada'); return;
  }
  list.innerHTML = r.data.slice().reverse().map(m => `
    <div class="card flex-between" id="cres-${m.id}">
      <div>
        <div class="fw-600">${fmtDate(m.data)}</div>
        <div class="fs-sm text-muted">
          ${m.peso ? m.peso + ' kg' : ''}${m.peso && m.altura ? ' · ' : ''}${m.altura ? m.altura + ' cm' : ''}
        </div>
      </div>
      <button class="btn btn-sm btn-danger btn-icon" onclick="delCrescimento('${m.id}')">🗑</button>
    </div>`).join('');
}

function renderCrescimentoChart(data) {
  const canvas = document.getElementById('chart-crescimento');
  if (!canvas || typeof Chart === 'undefined') return;
  if (State.crescimentoChart) State.crescimentoChart.destroy();
  const isPeso = State.crescimentoMode === 'peso';
  const color  = isPeso ? '#ff4da6' : '#5ba4f5';
  State.crescimentoChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: data.map(d => fmtDate(d.data)),
      datasets: [{
        label: isPeso ? 'Peso (kg)' : 'Altura (cm)',
        data: data.map(d => isPeso ? d.peso : d.altura),
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2.5, tension: .4, fill: true,
        pointBackgroundColor: color, pointRadius: 5, pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: '#f0e0f0' }, ticks: { font: { size: 10 } } },
      }
    }
  });
}

function switchChartMode(mode) {
  State.crescimentoMode = mode;
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.chart-tab[data-mode="${mode}"]`)?.classList.add('active');
  loadCrescimento();
}

async function saveCrescimento() {
  const peso   = document.getElementById('cres-peso').value;
  const altura = document.getElementById('cres-altura').value;
  const data   = document.getElementById('cres-data').value;
  if (!peso && !altura) return toast('Informe peso ou altura', 'error');
  const r = await POST('/crescimento', { peso, altura, data });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  closeModal('modal-crescimento');
  loadCrescimento();
}

async function delCrescimento(id) {
  if (!confirm('Remover este registro?')) return;
  await DEL('/crescimento/' + id);
  document.getElementById('cres-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// COMPRAS
// ===================================================================
async function loadCompras() {
  const list = document.getElementById('compras-list');
  list.innerHTML = loader();
  const r = await GET('/compras');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('🛒', 'Lista de compras vazia'); return;
  }
  const pendentes = r.data.filter(c => !c.comprado);
  const comprados = r.data.filter(c =>  c.comprado);

  const renderItem = c => `
    <div class="card" id="comp-${c.id}">
      <div class="compra-item">
        <div class="compra-check ${c.comprado ? 'checked' : ''}" onclick="toggleCompra('${c.id}',${!c.comprado})">
          ${c.comprado ? '✓' : ''}
        </div>
        <div class="flex-between" style="flex:1;min-width:0">
          <div style="min-width:0;overflow:hidden">
            <div class="compra-nome ${c.comprado?'riscado':''}">${esc(c.nome)}</div>
            ${c.quantidade ? `<div class="compra-qtd">${esc(c.quantidade)}</div>` : ''}
          </div>
          <button class="btn btn-sm btn-danger btn-icon" onclick="delCompra('${c.id}')">🗑</button>
        </div>
      </div>
    </div>`;

  let html = '';
  if (pendentes.length) html += `<p class="section-title fs-sm mb-8"><span class="icon">🛍</span> A comprar (${pendentes.length})</p>` + pendentes.map(renderItem).join('');
  if (comprados.length) html += `<p class="section-title fs-sm mt-16 mb-8"><span class="icon">✅</span> Comprado (${comprados.length})</p>` + comprados.map(renderItem).join('');
  list.innerHTML = html;
}

async function toggleCompra(id, comprado) {
  await POST('/compras/' + id + '/comprado', { comprado });
  loadCompras();
}

async function saveCompra() {
  const nome      = document.getElementById('comp-nome').value.trim();
  const quantidade = document.getElementById('comp-qtd').value.trim();
  if (!nome) return toast('Nome obrigatório', 'error');
  const r = await POST('/compras', { nome, quantidade });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  closeModal('modal-compra');
  loadCompras();
}

async function delCompra(id) {
  if (!confirm('Remover este item?')) return;
  await DEL('/compras/' + id);
  document.getElementById('comp-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// LEMBRETES
// ===================================================================
async function loadLembretes() {
  const list = document.getElementById('lembretes-list');
  list.innerHTML = loader();
  const r = await GET('/lembretes');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('📌', 'Nenhum lembrete salvo'); return;
  }
  list.innerHTML = r.data.map(l => `
    <div class="card" id="lem-${l.id}">
      <div class="lembrete-card">
        <div class="lembrete-icon">📌</div>
        <div class="lembrete-text">${esc(l.texto)}</div>
        <button class="btn btn-sm btn-danger btn-icon" onclick="delLembrete('${l.id}')">🗑</button>
      </div>
    </div>`).join('');
}

async function saveLembrete() {
  const texto = document.getElementById('lem-texto').value.trim();
  if (!texto) return toast('Escreva o lembrete', 'error');
  const r = await POST('/lembretes', { texto });
  if (r.status !== 'ok') return toast(r.msg, 'error');
  toast(r.msg);
  document.getElementById('lem-texto').value = '';
  closeModal('modal-lembrete');
  loadLembretes();
}

async function delLembrete(id) {
  if (!confirm('Remover este lembrete?')) return;
  await DEL('/lembretes/' + id);
  document.getElementById('lem-' + id)?.remove();
  toast('Removido!');
}

// ===================================================================
// PRÓXIMOS EVENTOS
// ===================================================================
async function loadProximos() {
  const list = document.getElementById('proximos-list');
  list.innerHTML = loader();
  const r = await GET('/proximos');
  if (r.status !== 'ok' || !r.data.length) {
    list.innerHTML = empty('📅', 'Nenhum evento próximo'); return;
  }
  const icons  = { consulta:'🏥', exame:'🔬', vacina:'💉', remedio:'💊' };
  const colors = { consulta:'pink', exame:'blue', vacina:'green', remedio:'purple' };
  list.innerHTML = `<div class="timeline">` + r.data.map(e => `
    <div class="tl-item">
      <div class="flex-between">
        <div class="tl-name">${icons[e.tipo]||'📌'} ${esc(e.nome)}</div>
        <span class="badge badge-${colors[e.tipo]||'gray'}">${e.tipo}</span>
      </div>
      <div class="tl-time">${fmt(e.horario)} · ${relTime(e.horario)}${e.info ? ' · ' + esc(e.info) : ''}</div>
    </div>`).join('') + `</div>`;
}

// ===================================================================
// MODAIS
// ===================================================================
function openModal(id) {
  if (id === 'modal-mamada') {
    const h = document.getElementById('mam-horario');
    if (h) h.value = nowBRLocal();
  }
  if (id === 'modal-crescimento') {
    const d = document.getElementById('cres-data');
    if (d && !d.value) d.value = todayBR();
  }
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function openFab() {
  const map = {
    mamadas:'modal-mamada', remedios:'modal-remedio',
    consultas:'modal-consulta', exames:'modal-exame',
    vacinas:'modal-vacina', crescimento:'modal-crescimento',
    compras:'modal-compra', lembretes:'modal-lembrete',
  };
  const m = map[State.screen];
  if (m) openModal(m);
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ===================================================================
// UTILITÁRIOS
// ===================================================================
function empty(icon, msg) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}

// Escapa HTML para evitar XSS ao inserir dados do usuário na DOM
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===================================================================
// SERVICE WORKER (PWA)
// ===================================================================
function registrarSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(e => console.warn('SW:', e));
  }
}

// ===================================================================
// INIT
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Header: data em pt-BR usando TZ Brasil
  const hoje = new Date();
  const opts = { timeZone: TZ, weekday:'short', day:'numeric', month:'short', year:'numeric' };
  const partes = new Intl.DateTimeFormat('pt-BR', opts).formatToParts(hoje);
  const dia  = partes.find(p => p.type === 'day')?.value;
  const mes  = partes.find(p => p.type === 'month')?.value;
  const ano  = partes.find(p => p.type === 'year')?.value;
  const sem  = partes.find(p => p.type === 'weekday')?.value;
  const dateEl = document.getElementById('header-date');
  if (dateEl) dateEl.innerHTML = `${sem}, ${dia} ${mes}<strong>${ano}</strong>`;

  // Foto
  loadPhoto();

  // SW
  registrarSW();

  // Restaura timer se estava rodando antes (usa timestamp real)
  restaurarTimer();

  // Tela inicial
  navigate('dashboard');
});

// Quando a página volta ao foco: recalcula o timer com o timestamp real
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !State.timerEndTs) return;
  const remaining = State.timerEndTs - Date.now();
  if (remaining <= 0) {
    if (State.timer) { clearInterval(State.timer); State.timer = null; }
    localStorage.removeItem(TIMER_LS_KEY);
    State.timerEndTs = null;
    _esconderTimers();
    toast('Tempo de arrotar concluído! 🎉');
  } else {
    _renderTimerDisplay(remaining);
  }
});
