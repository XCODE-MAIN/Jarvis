const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut, safeStorage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');

const GROQ = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
let win = null;

/* ---------- Configuração (a chave fica cifrada quando o sistema permite) ---------- */
const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
function readCfg() {
  try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch { return {}; }
}
function writeCfg(c) {
  fs.mkdirSync(path.dirname(cfgFile()), { recursive: true });
  fs.writeFileSync(cfgFile(), JSON.stringify(c));
}
function getKey() {
  const c = readCfg();
  if (c.keyEnc && safeStorage.isEncryptionAvailable()) {
    try { return safeStorage.decryptString(Buffer.from(c.keyEnc, 'base64')); } catch { /* ignora */ }
  }
  return c.key || '';
}
function setKey(k) {
  const c = readCfg();
  delete c.key; delete c.keyEnc;
  if (k) {
    if (safeStorage.isEncryptionAvailable()) c.keyEnc = safeStorage.encryptString(k).toString('base64');
    else c.key = k;
  }
  writeCfg(c);
}

/* ---------- Utilitários ---------- */
const ALIASES = {
  downloads: 'downloads', 'transferências': 'downloads', transferencias: 'downloads',
  documents: 'documents', documentos: 'documents',
  desktop: 'desktop', 'secretária': 'desktop', secretaria: 'desktop', 'área de trabalho': 'desktop',
  pictures: 'pictures', imagens: 'pictures',
  music: 'music', 'música': 'music', musica: 'music',
  videos: 'videos', 'vídeos': 'videos',
  home: 'home', '~': 'home'
};
function resolvePath(p = '') {
  const raw = String(p).trim();
  if (!raw) return os.homedir();
  const parts = raw.split(/[\\/]/);
  const first = (parts[0] || '').toLowerCase();
  if (ALIASES[first]) return path.join(app.getPath(ALIASES[first]), ...parts.slice(1));
  if (raw.startsWith('~')) return path.join(os.homedir(), raw.slice(1));
  return path.resolve(raw);
}
const fmtSize = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const confirm = async (message, detail, ok) => {
  const r = await dialog.showMessageBox(win, {
    type: 'question', buttons: ['Cancelar', ok], defaultId: 0, cancelId: 0, message, detail, noLink: true
  });
  return r.response === 1;
};
const launch = (cmd, args) => new Promise((resolve, reject) => {
  const c = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
  c.once('error', reject);
  c.once('spawn', () => { c.unref(); resolve(); });
});

const APPS_WIN = { calculadora: 'calc', 'bloco de notas': 'notepad', explorador: 'explorer', terminal: 'wt', spotify: 'spotify:', discord: 'discord:', definições: 'ms-settings:' };
const APPS_LINUX = { calculadora: 'gnome-calculator', terminal: 'x-terminal-emulator', ficheiros: 'nautilus', explorador: 'nautilus', 'definições': 'gnome-control-center' };

const CATEGORIES = {
  'Imagens': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'],
  'Documentos': ['pdf', 'doc', 'docx', 'odt', 'txt', 'md', 'rtf', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'],
  'Vídeos': ['mp4', 'mkv', 'avi', 'mov', 'webm'],
  'Áudio': ['mp3', 'wav', 'flac', 'ogg', 'm4a'],
  'Arquivos': ['zip', 'rar', '7z', 'tar', 'gz', 'iso'],
  'Programas': ['exe', 'msi', 'deb', 'appimage', 'rpm']
};
const categoryOf = (file) => {
  const ext = path.extname(file).slice(1).toLowerCase();
  for (const [cat, list] of Object.entries(CATEGORIES)) if (list.includes(ext)) return cat;
  return 'Outros';
};

/* ---------- Ferramentas que o Jarvis pode usar ---------- */
const TOOL_IMPL = {
  async open_app({ name }) {
    const key = String(name || '').toLowerCase().trim();
    if (!/^[\w .+\-:]{1,60}$/.test(key)) throw new Error('Nome de app inválido.');
    if (process.platform === 'win32') {
      await launch('cmd.exe', ['/c', 'start', '', APPS_WIN[key] || key]);
    } else if (process.platform === 'darwin') {
      await launch('open', ['-a', name]);
    } else {
      await launch(APPS_LINUX[key] || key.replace(/\s+/g, '-'), []);
    }
    return `Aberto: ${name}`;
  },
  async open_url({ url }) {
    if (!/^https?:\/\//i.test(url || '')) throw new Error('Só aceito links http ou https.');
    await shell.openExternal(url);
    return `Aberto: ${url}`;
  },
  async web_search({ query }) {
    await shell.openExternal('https://duckduckgo.com/?q=' + encodeURIComponent(query));
    return `Pesquisa aberta no browser: ${query}`;
  },
  async list_files({ path: p }) {
    const dir = resolvePath(p);
    const items = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 120);
    const lines = items.map((d) => {
      if (d.isDirectory()) return `[pasta] ${d.name}`;
      let size = '';
      try { size = fmtSize(fs.statSync(path.join(dir, d.name)).size); } catch { /* ignora */ }
      return `${d.name}  (${size})`;
    });
    return `${dir}\n${lines.join('\n') || '(vazia)'}`;
  },
  async read_file({ path: p }) {
    const file = resolvePath(p);
    const st = fs.statSync(file);
    if (!st.isFile()) throw new Error('Isso não é um ficheiro.');
    if (st.size > 2 * 1024 * 1024) throw new Error('Ficheiro grande demais (máximo 2 MB).');
    return fs.readFileSync(file, 'utf8').slice(0, 12000);
  },
  async organize_folder({ path: p }) {
    const dir = resolvePath(p);
    const files = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile() && !d.name.startsWith('.'));
    if (!files.length) return 'Não há ficheiros para organizar.';
    const plan = {};
    for (const f of files) (plan[categoryOf(f.name)] ||= []).push(f.name);
    const resumo = Object.entries(plan).map(([c, l]) => `${c}: ${l.length}`).join('\n');
    if (!(await confirm(`Organizar ${dir}?`, `${files.length} ficheiros vão para subpastas por tipo:\n${resumo}`, 'Organizar'))) {
      return 'Cancelado pelo utilizador.';
    }
    let moved = 0;
    for (const [cat, names] of Object.entries(plan)) {
      const destDir = path.join(dir, cat);
      fs.mkdirSync(destDir, { recursive: true });
      for (const n of names) {
        let dest = path.join(destDir, n);
        if (fs.existsSync(dest)) {
          const { name, ext } = path.parse(n);
          dest = path.join(destDir, `${name}-${Date.now()}${ext}`);
        }
        fs.renameSync(path.join(dir, n), dest);
        moved++;
      }
    }
    return `Organizados ${moved} ficheiros:\n${resumo}`;
  },
  async system_info() {
    const cpu = os.cpus();
    return [
      `Sistema: ${os.type()} ${os.release()} (${os.arch()})`,
      `CPU: ${cpu[0]?.model} (${cpu.length} threads)`,
      `RAM: ${fmtSize(os.totalmem() - os.freemem())} usados de ${fmtSize(os.totalmem())}`,
      `Ligado há ${(os.uptime() / 3600).toFixed(1)} horas`
    ].join('\n');
  },
  async run_command({ command }) {
    if (!(await confirm('Executar este comando?', String(command), 'Executar'))) return 'Cancelado pelo utilizador.';
    return new Promise((resolve) => {
      exec(command, { timeout: 15000, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
        const out = (stdout || '') + (stderr || '');
        resolve((err && !out ? 'Erro: ' + err.message : out).slice(0, 6000) || '(sem saída)');
      });
    });
  }
};

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function', function: { name, description, parameters: { type: 'object', properties, required } }
});
const str = (description) => ({ type: 'string', description });
const TOOLS = [
  fn('open_app', 'Abre uma aplicação instalada no PC', { name: str('Nome da app, ex.: spotify, calculadora, firefox') }, ['name']),
  fn('open_url', 'Abre um link http(s) no browser', { url: str('URL completo') }, ['url']),
  fn('web_search', 'Abre uma pesquisa na web no browser', { query: str('Texto da pesquisa') }, ['query']),
  fn('list_files', 'Lista ficheiros de uma pasta (aceita Transferências, Documentos, Secretária ou um caminho)', { path: str('Pasta') }, ['path']),
  fn('read_file', 'Lê o texto de um ficheiro pequeno', { path: str('Caminho do ficheiro') }, ['path']),
  fn('organize_folder', 'Arruma os ficheiros de uma pasta em subpastas por tipo (pede confirmação)', { path: str('Pasta') }, ['path']),
  fn('system_info', 'Mostra CPU, RAM e tempo ligado'),
  fn('run_command', 'Executa um comando na shell (pede sempre confirmação)', { command: str('Comando') }, ['command'])
];

const SYSTEM = `És o Jarvis, um assistente que controla o computador do utilizador (${process.platform}).
Responde em português europeu, de forma curta e direta.
Quando o pedido pode ser feito com uma ferramenta, usa-a em vez de explicar como se faz.
Nomes como "Transferências" ou "Documentos" são aceites como pasta.
Mover ficheiros e executar comandos pedem confirmação ao utilizador; se ele recusar, aceita e não insistas.
Nunca inventes o resultado de uma ferramenta.`;

/* ---------- Groq ---------- */
async function groq(messages) {
  const key = getKey();
  if (!key) throw new Error('Falta a chave da Groq. Abre as definições (engrenagem) e cola a chave.');
  const res = await fetch(`${GROQ}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: readCfg().model || DEFAULT_MODEL, messages, tools: TOOLS, tool_choice: 'auto', temperature: 0.4
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(res.status === 401 ? 'A chave da Groq foi recusada. Confirma-a nas definições.' : `Groq ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()).choices[0].message;
}

async function runChat(history) {
  const msgs = [{ role: 'system', content: SYSTEM }, ...history];
  for (let i = 0; i < 6; i++) {
    const m = await groq(msgs);
    if (!m.tool_calls?.length) return m.content || '';
    msgs.push({ role: 'assistant', content: m.content || '', tool_calls: m.tool_calls });
    for (const tc of m.tool_calls) {
      const name = tc.function.name;
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignora */ }
      let result;
      try {
        if (!TOOL_IMPL[name]) throw new Error('Ferramenta desconhecida.');
        result = await TOOL_IMPL[name](args);
      } catch (e) {
        result = 'Erro: ' + e.message;
      }
      win?.webContents.send('tool:event', { name, args, result: String(result) });
      msgs.push({ role: 'tool', tool_call_id: tc.id, content: String(result).slice(0, 8000) });
    }
  }
  return 'Cheguei ao limite de passos para este pedido.';
}

/* ---------- IPC ---------- */
ipcMain.handle('cfg:get', () => ({ hasKey: !!getKey(), model: readCfg().model || DEFAULT_MODEL }));
ipcMain.handle('cfg:set', (_e, { key, model }) => {
  if (typeof key === 'string' && key.trim()) setKey(key.trim());
  const c = readCfg();
  if (model && model.trim()) c.model = model.trim();
  writeCfg(c);
  return true;
});
ipcMain.handle('chat', (_e, history) => runChat(history));
ipcMain.handle('stt', async (_e, buf) => {
  const key = getKey();
  if (!key) throw new Error('Falta a chave da Groq.');
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(buf)], { type: 'audio/webm' }), 'audio.webm');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
  const res = await fetch(`${GROQ}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`Não consegui transcrever o áudio (${res.status}).`);
  return ((await res.json()).text || '').trim();
});
ipcMain.on('win:min', () => win?.minimize());
ipcMain.on('win:close', () => app.quit());

/* ---------- Janela ---------- */
function createWindow() {
  win = new BrowserWindow({
    width: 440, height: 700, minWidth: 360, minHeight: 480,
    frame: false, transparent: true, backgroundColor: '#00000000', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

const toggle = () => {
  if (!win) return createWindow();
  if (win.isVisible() && win.isFocused()) win.hide();
  else { win.show(); win.focus(); }
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === 'media'));
    createWindow();
    globalShortcut.register('CommandOrControl+Shift+J', toggle);
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
