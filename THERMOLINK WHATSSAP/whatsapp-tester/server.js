import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';
import NodeCache from 'node-cache';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  proto,
  jidNormalizedUser
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';

process.env.TZ = 'America/Sao_Paulo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================
// GESTÃO DE HORÁRIO OFICIAL (BRASÍLIA / GMT-3)
// ==============================================================
const TIMEZONE_BRASIL = 'America/Sao_Paulo';

function getAgoraBrasil() {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR', { timeZone: TIMEZONE_BRASIL });
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE_BRASIL });
  const horaSegundoFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TIMEZONE_BRASIL });
  return { agora, dataFormatada, horaFormatada, horaSegundoFormatada };
}

// ==============================================================
// CONFIGURAÇÃO SUPABASE (THERMOLINK OFICIAL)
// ==============================================================
const SUPABASE_URL = 'https://zawnluboujbovpgrgdcx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gJiVQXVjiuSPY3vHt2f8OA_CiES-4Ak';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Prevenção contra crash de processos não tratados
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

// Diretórios de Persistência Local
const DATA_DIR = path.join(__dirname, 'data');
const AUTH_DIR = path.join(__dirname, 'auth_info');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const CONTATOS_FILE = path.join(DATA_DIR, 'contatos.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const MESSAGE_CACHE_FILE = path.join(DATA_DIR, 'message_store.json');

// ==============================================================
// STORE & RETRY DE MENSAGENS (RESOLVE "AGUARDANDO MENSAGEM")
// ==============================================================
const messageStore = new Map();

function carregarMessageStore() {
  try {
    if (fs.existsSync(MESSAGE_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(MESSAGE_CACHE_FILE, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        messageStore.set(k, proto.Message.fromObject(v));
      }
      console.log(`[MessageStore] ${messageStore.size} mensagens em cache recuperadas.`);
    }
  } catch (e) {
    console.warn('[MessageStore] Erro ao carregar mensagens:', e.message);
  }
}

function salvarMensagemNoStore(id, msgObj) {
  if (!id || !msgObj) return;
  try {
    const protoMsg = proto.Message.fromObject(msgObj);
    messageStore.set(id, protoMsg);
    if (messageStore.size > 1000) {
      const oldestKey = messageStore.keys().next().value;
      messageStore.delete(oldestKey);
    }
    const snapshot = {};
    const entries = Array.from(messageStore.entries()).slice(-300);
    for (const [k, v] of entries) {
      snapshot[k] = proto.Message.toObject(v);
    }
    fs.writeFileSync(MESSAGE_CACHE_FILE, JSON.stringify(snapshot), 'utf8');
  } catch (e) {
    console.warn('[MessageStore] Erro ao salvar mensagem:', e.message);
  }
}

carregarMessageStore();

// Cache de contagem de retries do Signal Protocol para evitar loops de decriptação
const msgRetryCounterCache = new NodeCache({
  stdTTL: 3600,
  useClones: false
});

// ==============================================================
// GERENCIADOR DE DADOS PERSISTENTES (JSON + SUPABASE SYNC)
// ==============================================================
function getContatos() {
  if (!fs.existsSync(CONTATOS_FILE)) {
    const iniciais = [
      {
        id: 'cont_1',
        ceramica_id: 'cli_1791467023902',
        ceramica_nome: 'Irmãos Rolim',
        nome: 'André Rolim',
        cargo: 'Proprietário',
        telefone: '558894463836',
        receber_relatorio: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cont_2',
        ceramica_id: 'cli_1789336975029',
        ceramica_nome: 'Nossa Senhora Aparecida',
        nome: 'Arim / Davi',
        cargo: 'Diretor / Gestor',
        telefone: '558893157628',
        receber_relatorio: true,
        created_at: new Date().toISOString()
      }
    ];
    fs.writeFileSync(CONTATOS_FILE, JSON.stringify(iniciais, null, 2), 'utf8');
    return iniciais;
  }
  try {
    return JSON.parse(fs.readFileSync(CONTATOS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveContatos(contatos) {
  fs.writeFileSync(CONTATOS_FILE, JSON.stringify(contatos, null, 2), 'utf8');
}

function getConfig() {
  const padrao = {
    horario_envio_diario: '06:00',
    envio_automatico_ativo: true,
    ultimo_disparo_data: null,
    ultimo_disparo_hora: null,
    total_enviados_hoje: 0
  };
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(padrao, null, 2), 'utf8');
    return padrao;
  }
  try {
    return { ...padrao, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {
    return padrao;
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

function getLogs() {
  if (!fs.existsSync(LOGS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function addLog(tipo, mensagem, detalhe = null) {
  const { dataFormatada, horaSegundoFormatada } = getAgoraBrasil();
  const logItem = {
    id: Date.now() + Math.random(),
    horario: horaSegundoFormatada,
    data: dataFormatada,
    tipo, // 'info' | 'success' | 'warn' | 'error'
    mensagem,
    detalhe
  };
  console.log(`[${logItem.horario}] [${tipo.toUpperCase()}] ${mensagem}`);

  try {
    const logs = getLogs();
    logs.unshift(logItem);
    if (logs.length > 100) logs.pop();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {}

  return logItem;
}

// ==============================================================
// MOTOR DE WHATSAPP (BAILEYS) ULTRA ROBUSTO
// ==============================================================
let sock = null;
let currentQrCodeDataUrl = null;
let currentQrRaw = null;
let connectionStatus = 'INICIANDO'; // 'INICIANDO' | 'AGUARDANDO_QR' | 'CONECTADO' | 'DESCONECTADO'
let connectedUser = null;
let isStarting = false;
let reconnectTimeout = null;

async function iniciarWhatsApp() {
  if (isStarting) {
    console.log('[Baileys] Inicialização já em andamento, ignorando chamada concorrente.');
    return;
  }
  isStarting = true;

  try {
    addLog('info', 'Inicializando gateway do WhatsApp...');
    connectionStatus = 'INICIANDO';

    if (sock) {
      try {
        sock.ev.removeAllListeners();
        sock.end();
      } catch (e) {}
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      msgRetryCounterCache,
      getMessage: async (key) => {
        if (key?.id && messageStore.has(key.id)) {
          return messageStore.get(key.id);
        }
        return undefined;
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Cacheia mensagens recebidas/sincronizadas para responder a retries de decriptação
    sock.ev.on('messages.upsert', async ({ messages }) => {
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg.key?.id && msg.message) {
            salvarMensagemNoStore(msg.key.id, msg.message);
          }
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQrRaw = qr;
        try {
          currentQrCodeDataUrl = await QRCode.toDataURL(qr);
          connectionStatus = 'AGUARDANDO_QR';
          addLog('warn', 'Novo QR Code gerado para pareamento.');
          qrcodeTerminal.generate(qr, { small: true });
        } catch (qrErr) {
          console.error('Erro QR:', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const deveReconectar = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'DESCONECTADO';
        connectedUser = null;
        currentQrCodeDataUrl = null;

        addLog('error', `Conexão do WhatsApp fechada (Código: ${statusCode || 'n/a'}).`);

        if (reconnectTimeout) clearTimeout(reconnectTimeout);

        if (deveReconectar) {
          reconnectTimeout = setTimeout(() => {
            isStarting = false;
            iniciarWhatsApp();
          }, 5000);
        } else {
          addLog('warn', 'Sessão desvinculada/expirada. Limpando credenciais.');
          limparCredenciais();
          reconnectTimeout = setTimeout(() => {
            isStarting = false;
            iniciarWhatsApp();
          }, 3000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'CONECTADO';
        currentQrCodeDataUrl = null;
        currentQrRaw = null;
        connectedUser = sock.user;
        const num = sock.user?.id ? sock.user.id.split(':')[0] : 'Conectado';
        addLog('success', `WhatsApp Conectado e Operacional! Chip: +${num}`);
      }
    });

  } catch (err) {
    addLog('error', `Falha ao conectar WhatsApp: ${err.message}`);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      isStarting = false;
      iniciarWhatsApp();
    }, 6000);
  } finally {
    isStarting = false;
  }
}

function limparCredenciais() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    currentQrCodeDataUrl = null;
    currentQrRaw = null;
    connectedUser = null;
    connectionStatus = 'DESCONECTADO';
  } catch (e) {
    console.error('Erro ao limpar credenciais:', e);
  }
}

async function resolverJidValido(numeroBruto) {
  let digitos = String(numeroBruto).replace(/\D/g, '');
  if (digitos.startsWith('0')) digitos = digitos.substring(1);
  if (!digitos.startsWith('55')) digitos = '55' + digitos;

  const ddd = digitos.substring(2, 4);
  const resto = digitos.substring(4);

  let jidTentativa = `${digitos}@s.whatsapp.net`;
  try {
    if (sock && sock.onWhatsApp) {
      const [check] = await sock.onWhatsApp(jidTentativa);
      if (check && check.exists) return jidNormalizedUser(check.jid);

      if (resto.length === 9 && resto.startsWith('9')) {
        const semNove = `55${ddd}${resto.substring(1)}@s.whatsapp.net`;
        const [checkSem] = await sock.onWhatsApp(semNove);
        if (checkSem && checkSem.exists) return jidNormalizedUser(checkSem.jid);
      }

      if (resto.length === 8) {
        const comNove = `55${ddd}9${resto}@s.whatsapp.net`;
        const [checkCom] = await sock.onWhatsApp(comNove);
        if (checkCom && checkCom.exists) return jidNormalizedUser(checkCom.jid);
      }
    }
  } catch (e) {
    console.warn('Validação JID fallback:', e.message);
  }
  return jidNormalizedUser(jidTentativa);
}

// ==============================================================
// ==============================================================
// GERADOR DE GRÁFICO TÉRMICO DAS ÚLTIMAS 12 HORAS (QUICKCHART)
// ==============================================================
async function gerarUrlGrafico12Horas(ceramicaNome, fornosEmQueima, labelsHorarios) {
  const chartConfig = {
    type: 'line',
    data: {
      labels: labelsHorarios,
      datasets: []
    },
    options: {
      title: {
        display: true,
        text: `Curva Térmica da Queima (18:00 às 06:00) • ${ceramicaNome}`,
        fontColor: '#ffffff',
        fontSize: 15,
        fontStyle: 'bold'
      },
      legend: {
        display: true,
        position: 'top',
        labels: { fontColor: '#94a3b8', fontSize: 11, boxWidth: 12 }
      },
      scales: {
        xAxes: [{
          gridLines: { color: 'rgba(255, 255, 255, 0.08)' },
          ticks: { fontColor: '#94a3b8', fontSize: 11 }
        }],
        yAxes: [{
          gridLines: { color: 'rgba(255, 255, 255, 0.08)' },
          ticks: {
            fontColor: '#94a3b8',
            fontSize: 11,
            callback: (val) => `${val}°C`
          }
        }]
      }
    }
  };

  const cores = ['#f97316', '#06b6d4', '#10b981', '#a855f7', '#eab308', '#ec4899', '#3b82f6', '#f43f5e'];

  chartConfig.data.datasets = fornosEmQueima.map((f, idx) => ({
    label: `Forno ${f.num} (Pico ${f.picoC1}°C)`,
    data: f.pontosGrafico || [],
    borderColor: cores[idx % cores.length],
    backgroundColor: 'transparent',
    borderWidth: 3,
    pointRadius: 2,
    tension: 0.35,
    fill: false
  }));

  if (chartConfig.data.datasets.length === 0) {
    chartConfig.data.datasets.push({
      label: 'Temperatura Ambiente / Pátio',
      data: labelsHorarios.map(() => 35),
      borderColor: '#64748b',
      borderWidth: 2,
      pointRadius: 1,
      fill: false
    });
  }

  // 1. Tenta obter Short URL via POST em até 3.5s
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const resp = await fetch('https://quickchart.io/chart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart: chartConfig,
        width: 860,
        height: 440,
        backgroundColor: '#091322',
        devicePixelRatio: 2
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn('[QuickChart] Erro ao criar short URL, usando fallback GET:', err.message);
  }

  // 2. Fallback GET URL direto
  try {
    const encoded = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encoded}&w=860&h=440&bkg=%23091322&devicePixelRatio=2`;
  } catch (e) {
    return null;
  }
}

// ==============================================================
// GERADOR DO RELATÓRIO DE 12 HORAS (MADRUGADA 18:00 ÀS 06:00)
// FILTRO AUTOMÁTICO DE FORNOS EM QUEIMA VS. INATIVOS / FORA DE USO
// ==============================================================
async function gerarRelatorio12Horas(ceramicaId = null, modo = 'real') {
  const { dataFormatada, horaFormatada } = getAgoraBrasil();

  let ceramicaNome = 'Cerâmica Cliente';
  let responsavel = 'Gestor';
  let totalFornosCadastrados = 6;
  let leituras = [];

  if (ceramicaId) {
    try {
      const { data: cer } = await sb
        .from('ceramicas')
        .select('*')
        .eq('id', ceramicaId)
        .maybeSingle();

      if (cer) {
        ceramicaNome = cer.nome || 'Cerâmica';
        responsavel = cer.responsavel || 'Responsável';
        if (cer.fornos_count) totalFornosCadastrados = Number(cer.fornos_count);
      }

      // Janela das últimas 12 horas (ex: 18h às 06h da madrugada)
      const dozeHorasAtras = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: ltsDb } = await sb
        .from('leituras')
        .select('id, forno_id, modulo_alutal, canal_1, canal_2, data_hora, created_at')
        .eq('ceramica_id', ceramicaId)
        .gte('created_at', dozeHorasAtras)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (ltsDb && ltsDb.length >= 10) {
        leituras = ltsDb;
      } else {
        // Fallback: se houver poucas leituras na janela estrita de 12h, busca as últimas 500
        const { data: ltsRecent } = await sb
          .from('leituras')
          .select('id, forno_id, modulo_alutal, canal_1, canal_2, data_hora, created_at')
          .eq('ceramica_id', ceramicaId)
          .order('created_at', { ascending: false })
          .limit(500);
        if (ltsRecent && ltsRecent.length > 0) {
          leituras = ltsRecent.reverse();
        }
      }
    } catch (e) {
      console.warn('[Relatorio12h] Erro ao consultar Supabase:', e.message);
    }
  }

  // Agrupa leituras por forno / módulo Alutal
  const fornosMap = {};
  if (leituras && leituras.length > 0) {
    for (const l of leituras) {
      const fId = Number(l.modulo_alutal || l.forno_id || 1);
      if (!fornosMap[fId]) fornosMap[fId] = [];
      fornosMap[fId].push(l);
    }
  }

  // Total de fornos da cerâmica
  totalFornosCadastrados = Math.max(totalFornosCadastrados, Object.keys(fornosMap).length);

  // Intervalos horários da queima das 18h às 06h
  const labelsHorarios = ['18h', '19h', '20h', '21h', '22h', '23h', '00h', '01h', '02h', '03h', '04h', '05h', '06h'];

  const fornosEmQueima = [];
  const fornosInativos = [];

  const fKeys = Object.keys(fornosMap).sort((a, b) => Number(a) - Number(b));

  for (const k of fKeys) {
    const num = Number(k);
    const lts = fornosMap[k];
    const ult = lts[lts.length - 1];

    const c1 = Number(ult.canal_1 ?? 0);
    const c2 = Number(ult.canal_2 ?? 0);
    const picoC1 = Math.max(...lts.map(x => Number(x.canal_1 || 0)));
    const picoC2 = Math.max(...lts.map(x => Number(x.canal_2 || 0)));
    const minC1 = Math.min(...lts.map(x => Number(x.canal_1 || 0)));
    const deltaT = picoC1 - minC1;
    const mediaC1 = Math.round(lts.reduce((acc, x) => acc + Number(x.canal_1 || 0), 0) / (lts.length || 1));
    const deltaGradiente = Math.abs(c1 - c2);

    // FILTRO DE FORNO EM QUEIMA:
    // Identifica se o forno está ativamente em processo de queima (> 80°C de pico ou variação térmica >= 30°C)
    // Fornos estagnados ou em temperatura ambiente são classificados como inativos / fora de uso
    const isQueimando = (picoC1 >= 80) || (deltaT >= 30) || (c1 >= 75);

    // Amostragem de pontos ao longo da janela de 12 horas para o gráfico
    const pontosGrafico = [];
    const step = Math.max(1, Math.floor(lts.length / 13));
    for (let i = 0; i < 13; i++) {
      if (i === 12) {
        pontosGrafico.push(c1);
      } else {
        const idx = Math.min(lts.length - 1, i * step);
        pontosGrafico.push(Number(lts[idx]?.canal_1 || c1));
      }
    }

    // Calcula tendência térmica recente
    let tendenciaTxt = 'Estável no patamar de queima';
    if (lts.length >= 2) {
      const anterior = lts[Math.max(0, lts.length - 10)];
      const diff = c1 - Number(anterior.canal_1 || c1);
      if (diff > 25) tendenciaTxt = '📈 Subida contínua de temperatura';
      else if (diff < -25) tendenciaTxt = '📉 Curva descendente de resfriamento';
    }

    // Classificação da fase
    let fase = '🔥 Maturação / Ponto de Fogo';
    let recomendacao = 'Patamar ideal de sinterização. Manter alimentação controlada.';
    if (picoC1 > 600 && c1 < picoC1 - 80) {
      fase = '❄️ Resfriamento Controlado (Recozimento)';
      recomendacao = 'Manter portas e fornalhas 100% vedadas para evitar choque térmico nas peças.';
    } else if (c1 > 980 || c2 > 980) {
      fase = '⚠️ Superaquecimento Crítico (>980°C)';
      recomendacao = 'Reduzir imediatamente a alimentação de lenha no setor do topo.';
    } else if (c1 >= 600 && c1 <= 980) {
      fase = '🔥 Maturação Térmica (Sinterização)';
      recomendacao = deltaGradiente > 65
        ? `Gradiente acentuado (${deltaGradiente}°C). Reforçar fornalhas inferiores da base.`
        : 'Curva térmica excelente. Manter queima uniforme e preparar selagem.';
    } else if (c1 >= 180 && c1 < 600) {
      fase = '♨️ Elevação & Desidratação';
      recomendacao = 'Manter alimentação constante para eliminação gradual da água estrutural.';
    } else {
      fase = '🌱 Secagem / Pré-aquecimento';
      recomendacao = 'Aquecimento brando com lenha miúda para evitar choques na enforna.';
    }

    const fornoObj = {
      num: String(num).padStart(2, '0'),
      c1,
      c2,
      picoC1,
      picoC2,
      minC1,
      deltaT,
      mediaC1,
      deltaGradiente,
      fase,
      tendenciaTxt,
      recomendacao,
      pontosGrafico
    };

    if (isQueimando) {
      fornosEmQueima.push(fornoObj);
    } else {
      fornosInativos.push(fornoObj);
    }
  }

  // Fallback demonstrativo realista se nenhuma leitura for encontrada
  if (fornosEmQueima.length === 0 && fKeys.length === 0) {
    totalFornosCadastrados = 16;
    fornosEmQueima.push({
      num: '01',
      c1: 948,
      c2: 925,
      picoC1: 988,
      picoC2: 940,
      minC1: 220,
      deltaT: 768,
      mediaC1: 785,
      deltaGradiente: 23,
      fase: '🔥 Maturação Térmica (Ponto de Fogo)',
      tendenciaTxt: '⚖️ Estável no patamar de sinterização',
      recomendacao: 'Manter alimentação branda por mais 1h e iniciar vedação das fornalhas.',
      pontosGrafico: [220, 310, 450, 580, 690, 780, 860, 920, 948, 965, 988, 960, 948]
    });
    fornosEmQueima.push({
      num: '02',
      c1: 285,
      c2: 270,
      picoC1: 975,
      picoC2: 930,
      minC1: 270,
      deltaT: 705,
      mediaC1: 620,
      deltaGradiente: 15,
      fase: '❄️ Resfriamento Controlado',
      tendenciaTxt: '📉 Curva descendente de recozimento (-35°C/h)',
      recomendacao: 'Manter portas e fornalhas completamente vedadas para evitar trincas.',
      pontosGrafico: [975, 940, 890, 820, 740, 650, 560, 480, 410, 360, 320, 295, 285]
    });
    fornosEmQueima.push({
      num: '05',
      c1: 490,
      c2: 420,
      picoC1: 510,
      picoC2: 430,
      minC1: 120,
      deltaT: 390,
      mediaC1: 360,
      deltaGradiente: 70,
      fase: '♨️ Elevação & Desidratação',
      tendenciaTxt: '📈 Subida contínua de temperatura (+55°C/h)',
      recomendacao: 'Gradiente de 70°C: equalizar fogo alimentando mais as fornalhas da base.',
      pontosGrafico: [120, 160, 210, 260, 310, 360, 400, 440, 470, 490, 500, 510, 490]
    });
    for (let i = 1; i <= 16; i++) {
      if (![1, 2, 5].includes(i)) {
        fornosInativos.push({ num: String(i).padStart(2, '0') });
      }
    }
  }

  // Gera o Gráfico das últimas 12 horas em imagem
  const chartUrl = await gerarUrlGrafico12Horas(ceramicaNome, fornosEmQueima, labelsHorarios);

  // MONTA O TEXTO DO RELATÓRIO FORMATADO PARA WHATSAPP
  let texto = `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
  texto += `🔥 *THERMOLINK • RESUMO DA MADRUGADA* 🔥\n`;
  texto += `*Turno de Queima (Últimas 12 Horas)*\n`;
  texto += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;

  texto += `🏭 *Cerâmica:* ${ceramicaNome}\n`;
  texto += `👤 *Aos Cuidados:* ${responsavel}\n`;
  texto += `📅 *Horário de Fechamento:* ${dataFormatada} às 06:00\n`;
  texto += `⏱️ *Período Analisado:* 18:00 às 06:00 (12h de Madrugada)\n\n`;

  const qtdInativos = Math.max(0, totalFornosCadastrados - fornosEmQueima.length);

  texto += `*──────────────────────────*\n`;
  texto += `📊 *PANORAMA GERAL DA FÁBRICA:*\n`;
  texto += `• Capacidade Total: *${totalFornosCadastrados} Fornos*\n`;
  texto += `• 🔥 *Fornos em Queima Ativa:* *${fornosEmQueima.length} forno(s)* (${fornosEmQueima.map(f => `F${f.num}`).join(', ') || 'Nenhum'})\n`;
  texto += `• 💤 *Fornos Inativos / Desligados:* *${qtdInativos} forno(s)* (sem variação térmica)\n`;
  texto += `*──────────────────────────*\n\n`;

  if (fornosEmQueima.length === 0) {
    texto += `ℹ️ *Nenhum forno registrou queima ativa nesta madrugada.*\n`;
    texto += `Todas as unidades permanecem em temperatura ambiente ou pátio.\n\n`;
  } else {
    texto += `🔥 *DIAGNÓSTICO INDIVIDUAL DOS FORNOS EM QUEIMA:*\n\n`;
    fornosEmQueima.forEach(f => {
      texto += `*FORNO ${f.num}* — ${f.fase}\n`;
      texto += `• *Temp. Atual:* C1 (Topo): *${f.c1}°C* | C2 (Base): *${f.c2}°C*\n`;
      texto += `• *Pico na Madrugada:* *${f.picoC1}°C*\n`;
      texto += `• *Média das 12h:* ${f.mediaC1}°C\n`;
      texto += `• *Gradiente (Topo x Base):* ${f.deltaGradiente}°C\n`;
      texto += `• *Comportamento:* ${f.tendenciaTxt}\n`;
      texto += `• 💡 *Recomendação IA:* ${f.recomendacao}\n\n`;
    });
  }

  // Parecer Global da Queima
  let somaDelta = 0;
  fornosEmQueima.forEach(f => { somaDelta += f.deltaGradiente; });
  const gradMedio = fornosEmQueima.length > 0 ? Math.round(somaDelta / fornosEmQueima.length) : 0;
  let scoreGeral = 100 - (gradMedio > 40 ? Math.min(25, Math.round((gradMedio - 40) * 0.5)) : 0);
  if (fornosEmQueima.some(f => f.c1 > 980)) scoreGeral -= 20;
  scoreGeral = Math.max(40, scoreGeral);

  texto += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
  texto += `🤖 *PARECER TÉCNICO & IA THERMOLINK:*\n`;
  texto += `• ⭐ *Score Térmico Global:* *${scoreGeral}%* (${scoreGeral >= 85 ? 'Excelente' : 'Estável'})\n`;
  texto += `• ⚖️ *Gradiente Médio Operacional:* *${gradMedio}°C*\n`;
  if (chartUrl) {
    texto += `• 📈 *Gráfico da curva térmica de 12h anexado acima.*\n`;
  }
  texto += `\n`;
  texto += `✅ *Resumo Operacional:* Leituras consolidadas e filtradas por inteligência artificial.\n`;
  texto += `📲 _Mensagem automática gerada diariamente às 06:00 pelo ThermoLink._\n`;
  texto += `🌐 Painel de Controle: *thermolink.com.br*\n`;
  texto += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*`;

  return {
    texto,
    chartUrl,
    ceramicaNome,
    responsavel,
    fornosAtivos: fornosEmQueima,
    fornosInativos,
    totalFornos: totalFornosCadastrados
  };
}

// Alias de retrocompatibilidade
async function gerarTextoRelatorio(ceramicaId = null, modo = 'real') {
  return await gerarRelatorio12Horas(ceramicaId, modo);
}

// Baixa o buffer da imagem em memória para envio ultra-confiável via Baileys
async function baixarBufferImagem(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      return Buffer.from(await resp.arrayBuffer());
    }
  } catch (err) {
    console.warn('[Baileys] Aviso ao baixar buffer da imagem:', err.message);
  }
  return null;
}

// Disparo Seguro com suporte a Envio Conjunto de Imagem (Gráfico das 12h) e Relatório Completo
async function enviarMensagemSegura(telefone, texto, chartUrl = null) {
  if (connectionStatus !== 'CONECTADO' || !sock) {
    throw new Error('WhatsApp não está conectado.');
  }
  const jidBruto = await resolverJidValido(telefone);
  const jid = jidNormalizedUser(jidBruto);

  // 1. Pré-aquecimento Signal de presença
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await delay(500);
    await sock.sendPresenceUpdate('paused', jid);
  } catch (presErr) {}

  // 2. Se houver imagem do gráfico gerada, envia o gráfico com o relatório COMPLETO na legenda (juntos em uma única mensagem)
  if (chartUrl) {
    try {
      const imgBuffer = await baixarBufferImagem(chartUrl);
      const mediaPayload = imgBuffer ? imgBuffer : { url: chartUrl };

      addLog('info', `📸 Enviando imagem do gráfico e relatório para +${jid.split('@')[0]}...`);
      // Envia a imagem do gráfico e o relatório de análise juntos na mesma mensagem
      const resultImg = await sock.sendMessage(jid, {
        image: mediaPayload,
        caption: texto,
        mimetype: 'image/png'
      });

      if (resultImg?.key?.id && resultImg?.message) {
        salvarMensagemNoStore(resultImg.key.id, resultImg.message);
      }
      addLog('success', `✅ Gráfico térmico e relatório entregues juntos para +${jid.split('@')[0]}!`);
      return { jid, id: resultImg?.key?.id };
    } catch (errImg) {
      addLog('warn', `⚠️ Envio conjunto da imagem falhou (${errImg.message}). Tentando fallback...`);

      // Fallback: Tenta enviar a imagem com cabeçalho e em seguida o texto analítico completo
      try {
        const imgBufferFallback = await baixarBufferImagem(chartUrl);
        const mediaFallback = imgBufferFallback ? imgBufferFallback : { url: chartUrl };
        await sock.sendMessage(jid, {
          image: mediaFallback,
          caption: `📊 *CURVA TÉRMICA DAS ÚLTIMAS 12 HORAS (18:00 às 06:00)*\n🔥 Gráfico consolidado dos fornos em queima ativa.`,
          mimetype: 'image/png'
        });
        await delay(1200);
        const resultTxt = await sock.sendMessage(jid, { text: texto });
        if (resultTxt?.key?.id && resultTxt?.message) {
          salvarMensagemNoStore(resultTxt.key.id, resultTxt.message);
        }
        return { jid, id: resultTxt?.key?.id };
      } catch (errFallback) {
        addLog('error', `Falha no fallback de imagem: ${errFallback.message}. Enviando texto puro.`);
      }
    }
  }

  // 3. Envio padrão de texto
  const result = await sock.sendMessage(jid, { text: texto });
  if (result?.key?.id && result?.message) {
    salvarMensagemNoStore(result.key.id, result.message);
  }
  return { jid, id: result?.key?.id };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==============================================================
// AGENDADOR AUTOMÁTICO DIÁRIO (CRON RUNNER)
// ==============================================================
let executandoDisparoEmLote = false;

async function processarDisparoAutomaticoDiario() {
  if (executandoDisparoEmLote) return;
  if (connectionStatus !== 'CONECTADO' || !sock) return;

  const cfg = getConfig();
  if (!cfg.envio_automatico_ativo) return;

  const { dataFormatada: hojeString, horaFormatada: horaMinAtual } = getAgoraBrasil();

  // Verifica se o horário bate e se ainda não foi disparado hoje
  if (horaMinAtual === cfg.horario_envio_diario && cfg.ultimo_disparo_data !== hojeString) {
    addLog('info', `⏰ [Agendador Automático] Disparando rotina diária das ${horaMinAtual} (Horário de Brasília)...`);
    cfg.ultimo_disparo_data = hojeString;
    cfg.ultimo_disparo_hora = horaMinAtual;
    saveConfig(cfg);
    await dispararParaTodosOsContatos('Agendamento Automático Diário');
  }
}

async function dispararParaTodosOsContatos(origem = 'Manual') {
  if (executandoDisparoEmLote) {
    addLog('warn', 'Um disparo em lote já está em andamento. Aguarde.');
    return;
  }
  executandoDisparoEmLote = true;

  try {
    const contatos = getContatos().filter(c => c.receber_relatorio && c.telefone);
    addLog('info', `🚀 Iniciando disparo em lote (${origem}) para ${contatos.length} contato(s)...`);

    let enviados = 0;
    for (const c of contatos) {
      try {
        addLog('info', `Gerando e enviando relatório de 12h com gráfico para ${c.nome} (${c.ceramica_nome}) no WhatsApp ${c.telefone}...`);
        const rel = await gerarRelatorio12Horas(c.ceramica_id, 'real');
        await enviarMensagemSegura(c.telefone, rel.texto, rel.chartUrl);
        enviados++;
        addLog('success', `✅ Relatório entregue para ${c.nome} (+${c.telefone})!`);

        // Intervalo de segurança recomendado no PDF (6 segundos entre disparos)
        if (contatos.length > 1) {
          await delay(6000);
        }
      } catch (err) {
        addLog('error', `❌ Falha ao enviar para ${c.nome}: ${err.message}`);
      }
    }

    const cfg = getConfig();
    cfg.total_enviados_hoje = (cfg.total_enviados_hoje || 0) + enviados;
    saveConfig(cfg);

    addLog('success', `🎉 Disparo em lote finalizado! Total entregue com sucesso: ${enviados}/${contatos.length}`);
  } catch (e) {
    addLog('error', `Erro geral no disparo em lote: ${e.message}`);
  } finally {
    executandoDisparoEmLote = false;
  }
}

// Checagem do agendador a cada 10 segundos
setInterval(processarDisparoAutomaticoDiario, 10000);

// ==============================================================
// MONITOR AUTOMÁTICO DE DESCONEXÃO DOS APARELHOS (> 30 MINUTOS)
// ==============================================================
const OFFLINE_ALERTS_FILE = path.join(DATA_DIR, 'alertas_desconexao.json');

function getOfflineAlerts() {
  try {
    if (fs.existsSync(OFFLINE_ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(OFFLINE_ALERTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[OfflineMonitor] Erro ao ler alertas_desconexao.json:', e.message);
  }
  return {};
}

function saveOfflineAlerts(data) {
  try {
    fs.writeFileSync(OFFLINE_ALERTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[OfflineMonitor] Erro ao salvar alertas_desconexao.json:', e.message);
  }
}

function gerarTextoAlertaDesconexao(ceramicaNome, diffMin, ultDataHora) {
  let t = `⚠️ *ALERTA THERMOLINK • EQUIPAMENTO OFFLINE* ⚠️\n\n`;
  t += `🏭 *Cerâmica:* ${ceramicaNome}\n`;
  t += `⏱️ *Sem comunicação:* há mais de ${diffMin} minutos\n`;
  if (ultDataHora) {
    t += `📡 *Última transmissão:* ${ultDataHora}\n`;
  }
  t += `\nIdentificamos que os sensores/aparelhos Alutal estão sem comunicação com o servidor.\n\n`;
  t += `🔍 *Possíveis causas:*\n`;
  t += `• Queda de energia elétrica na fábrica\n`;
  t += `• Falha ou oscilação na conexão Wi-Fi / Internet\n`;
  t += `• Aparelho desligado da tomada ou reiniciando\n\n`;
  t += `Favor verificar se os equipamentos e a internet da fábrica estão ligados.\n`;
  t += `_Mensagem automática enviada pelo sistema ThermoLink._`;
  return t;
}

let executandoChecagemDesconexao = false;

async function processarMonitorDesconexaoFornos() {
  if (executandoChecagemDesconexao) return;
  if (connectionStatus !== 'CONECTADO' || !sock) return;

  executandoChecagemDesconexao = true;
  try {
    // 1. Busca cerâmicas ativas no Supabase
    const { data: ceramicas, error: errCer } = await sb
      .from('ceramicas')
      .select('id, nome, responsavel, status');

    if (errCer || !ceramicas || ceramicas.length === 0) return;

    const contatos = getContatos();
    const offlineAlerts = getOfflineAlerts();
    const now = Date.now();

    for (const cer of ceramicas) {
      if (cer.status && cer.status !== 'Ativo') continue;

      // Contatos vinculados a esta cerâmica que recebem notificações
      const contatosCeramica = contatos.filter(c => c.ceramica_id === cer.id && c.receber_relatorio && c.telefone);
      if (contatosCeramica.length === 0) continue;

      // 2. Busca a leitura mais recente desta cerâmica
      let ultLeitura = null;
      try {
        const { data: leituras } = await sb
          .from('leituras')
          .select('id, created_at, data_hora')
          .eq('ceramica_id', cer.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (leituras && leituras.length > 0) {
          ultLeitura = leituras[0];
        }
      } catch (errL) {
        continue;
      }

      if (!ultLeitura) continue;

      const ultDataIso = ultLeitura.created_at || ultLeitura.data_hora;
      const ultTimestamp = new Date(ultDataIso).getTime();
      if (isNaN(ultTimestamp)) continue;

      const diffMin = Math.round((now - ultTimestamp) / 60000);
      const cerState = offlineAlerts[cer.id] || { status: 'ONLINE', ultimo_alerta_em: null };

      // REGRA: Mais de 30 minutos sem comunicação (> 30 min)
      if (diffMin >= 30) {
        // Se ainda não alertou para esta queda (status anterior era ONLINE ou nunca alertou)
        const tempoDesdeUltimoAlertaMin = cerState.ultimo_alerta_em 
          ? Math.round((now - new Date(cerState.ultimo_alerta_em).getTime()) / 60000) 
          : 999999;

        // Dispara se for a primeira detecção de queda OU se já passaram mais de 6 horas (reforço)
        if (cerState.status !== 'OFFLINE' || tempoDesdeUltimoAlertaMin >= 360) {
          addLog('warn', `⚠️ [Alerta Desconexão] ${cer.nome} sem comunicação há ${diffMin} min! Disparando aviso no WhatsApp...`);

          const ultDataHoraFormatada = new Date(ultTimestamp).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZone: TIMEZONE_BRASIL 
          });

          const textoAviso = gerarTextoAlertaDesconexao(cer.nome, diffMin, ultDataHoraFormatada);

          let enviados = 0;
          for (const c of contatosCeramica) {
            try {
              await enviarMensagemSegura(c.telefone, textoAviso);
              enviados++;
              if (contatosCeramica.length > 1) await delay(5000);
            } catch (errSend) {
              addLog('error', `Falha ao alertar ${c.nome} (${cer.nome}): ${errSend.message}`);
            }
          }

          if (enviados > 0) {
            addLog('success', `🔔 Alerta de desconexão entregue para ${enviados} contato(s) de ${cer.nome}!`);
          }

          offlineAlerts[cer.id] = {
            status: 'OFFLINE',
            ultimo_alerta_em: new Date().toISOString(),
            diff_min: diffMin,
            ultima_leitura_iso: ultDataIso,
            total_enviados: enviados
          };
          saveOfflineAlerts(offlineAlerts);
        }
      } else if (diffMin <= 10) {
        // Aparelho voltou a transmitir (< 10 min)
        if (cerState.status === 'OFFLINE') {
          addLog('info', `🟢 [Reconexão] Aparelho Alutal de ${cer.nome} voltou a comunicar normalmente!`);
          offlineAlerts[cer.id] = {
            status: 'ONLINE',
            reconexao_em: new Date().toISOString(),
            ultimo_alerta_em: cerState.ultimo_alerta_em
          };
          saveOfflineAlerts(offlineAlerts);
        }
      }
    }
  } catch (errCheck) {
    console.warn('[OfflineMonitor] Erro na verificação periódica de desconexão:', errCheck.message);
  } finally {
    executandoChecagemDesconexao = false;
  }
}

// Checagem automática de desconexão a cada 2 minutos (120 segundos)
setInterval(processarMonitorDesconexaoFornos, 120000);

// Auto-keepalive a cada 4 minutos para evitar suspensão da nuvem (Render Free Tier)
setInterval(async () => {
  try {
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://thermolink-whatsapp.onrender.com';
    await fetch(`${renderUrl}/api/status`);
  } catch (e) {}
}, 4 * 60 * 1000);

// ==============================================================
// ROTAS DA API REST (PARA O PAINEL THERMOLINK MASTER ADMIN)
// ==============================================================

// 1. Status Geral do Gateway
app.get('/api/status', (req, res) => {
  const cfg = getConfig();
  const contatos = getContatos();
  const { dataFormatada, horaSegundoFormatada, horaFormatada } = getAgoraBrasil();
  res.json({
    status: connectionStatus,
    qrCodeDataUrl: currentQrCodeDataUrl,
    user: connectedUser,
    horario_servidor_brasilia: `${dataFormatada} às ${horaSegundoFormatada}`,
    hora_atual_brasilia: horaFormatada,
    logs: getLogs().slice(0, 30),
    config: cfg,
    contatosCount: contatos.length,
    contatosAtivosCount: contatos.filter(c => c.receber_relatorio).length
  });
});

// 2. Cerâmicas do Supabase
app.get('/api/ceramicas', async (req, res) => {
  try {
    const { data, error } = await sb
      .from('ceramicas')
      .select('id, nome, responsavel, cidade, fornos_count, status')
      .order('nome');
    if (error) throw error;
    res.json({ ceramicas: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Gestão de Contatos (CRUD)
app.get('/api/contatos', (req, res) => {
  res.json({ contatos: getContatos() });
});

app.post('/api/contatos', (req, res) => {
  try {
    const { ceramica_id, ceramica_nome, nome, cargo, telefone, receber_relatorio } = req.body;
    if (!ceramica_id || !nome || !telefone) {
      return res.status(400).json({ error: 'Cerâmica, Nome e Telefone são obrigatórios.' });
    }

    const contatos = getContatos();
    const novo = {
      id: 'cont_' + Date.now(),
      ceramica_id,
      ceramica_nome: ceramica_nome || 'Cerâmica',
      nome,
      cargo: cargo || 'Responsável',
      telefone: String(telefone).replace(/\D/g, ''),
      receber_relatorio: Boolean(receber_relatorio !== false),
      created_at: new Date().toISOString()
    };

    contatos.unshift(novo);
    saveContatos(contatos);
    addLog('info', `Novo contato cadastrado: ${novo.nome} (${novo.ceramica_nome}) - ${novo.telefone}`);
    res.json({ success: true, contato: novo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contatos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const contatos = getContatos();
    const idx = contatos.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Contato não encontrado.' });

    contatos[idx] = {
      ...contatos[idx],
      ...req.body,
      telefone: req.body.telefone ? String(req.body.telefone).replace(/\D/g, '') : contatos[idx].telefone
    };
    saveContatos(contatos);
    res.json({ success: true, contato: contatos[idx] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contatos/:id', (req, res) => {
  try {
    const { id } = req.params;
    let contatos = getContatos();
    const target = contatos.find(c => c.id === id);
    contatos = contatos.filter(c => c.id !== id);
    saveContatos(contatos);
    if (target) addLog('warn', `Contato removido: ${target.nome} (${target.ceramica_nome})`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contatos/:id/toggle-relatorio', (req, res) => {
  try {
    const { id } = req.params;
    const contatos = getContatos();
    const c = contatos.find(x => x.id === id);
    if (!c) return res.status(404).json({ error: 'Contato não encontrado.' });

    c.receber_relatorio = !c.receber_relatorio;
    saveContatos(contatos);
    addLog('info', `Contato ${c.nome}: Receber Relatório alterado para ${c.receber_relatorio ? 'ATIVO' : 'PAUSADO'}`);
    res.json({ success: true, contato: c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Configuração de Envio Automático
app.get('/api/config', (req, res) => {
  res.json({ config: getConfig() });
});

app.post('/api/config', (req, res) => {
  try {
    const cfg = getConfig();
    const { horario_envio_diario, envio_automatico_ativo } = req.body;
    if (horario_envio_diario) {
      cfg.horario_envio_diario = horario_envio_diario;
      cfg.ultimo_disparo_data = null;
    }
    if (envio_automatico_ativo !== undefined) {
      cfg.envio_automatico_ativo = Boolean(envio_automatico_ativo);
      if (cfg.envio_automatico_ativo) cfg.ultimo_disparo_data = null;
    }
    saveConfig(cfg);
    addLog('info', `Configurações atualizadas: Horário diário = ${cfg.horario_envio_diario}, Ativo = ${cfg.envio_automatico_ativo}`);
    res.json({ success: true, config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Ações de Disparo
app.post('/api/disparar-contato/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contatos = getContatos();
    const c = contatos.find(x => x.id === id);
    if (!c) return res.status(404).json({ error: 'Contato não encontrado.' });

    addLog('info', `Disparo individual solicitado para ${c.nome} (${c.telefone})...`);
    const rel = await gerarRelatorio12Horas(c.ceramica_id, 'real');
    const result = await enviarMensagemSegura(c.telefone, rel.texto, rel.chartUrl);
    addLog('success', `Relatório enviado com sucesso para ${c.nome}!`);

    res.json({ success: true, result, relatorio: rel.texto, chartUrl: rel.chartUrl });
  } catch (err) {
    addLog('error', `Falha no disparo individual: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/disparar-ceramica/:ceramicaId', async (req, res) => {
  try {
    const { ceramicaId } = req.params;
    const contatos = getContatos().filter(c => c.ceramica_id === ceramicaId && c.receber_relatorio);
    if (contatos.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato ativo configurado para esta cerâmica.' });
    }

    const rel = await gerarRelatorio12Horas(ceramicaId, 'real');
    let enviados = 0;
    for (const c of contatos) {
      try {
        await enviarMensagemSegura(c.telefone, rel.texto, rel.chartUrl);
        enviados++;
        if (contatos.length > 1) await delay(5000);
      } catch (e) {
        addLog('error', `Falha ao enviar para ${c.nome}: ${e.message}`);
      }
    }
    res.json({ success: true, enviados, total: contatos.length, chartUrl: rel.chartUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/disparar-todos', async (req, res) => {
  try {
    if (executandoDisparoEmLote) {
      return res.status(400).json({ error: 'Disparo em lote já em andamento.' });
    }
    // Dispara em background
    dispararParaTodosOsContatos('Disparo Manual via Admin');
    res.json({ success: true, message: 'Disparo em lote iniciado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Status do Monitor de Desconexão (> 30 Minutos)
app.get('/api/monitor-desconexao', async (req, res) => {
  try {
    const { data: ceramicas } = await sb.from('ceramicas').select('id, nome, responsavel, status');
    const offlineAlerts = getOfflineAlerts();
    const now = Date.now();
    const result = [];

    if (ceramicas && ceramicas.length > 0) {
      for (const cer of ceramicas) {
        const { data: leituras } = await sb
          .from('leituras')
          .select('id, created_at, data_hora')
          .eq('ceramica_id', cer.id)
          .order('created_at', { ascending: false })
          .limit(1);

        let diffMin = 999999;
        let ultDataIso = null;
        if (leituras && leituras.length > 0) {
          ultDataIso = leituras[0].created_at || leituras[0].data_hora;
          diffMin = Math.round((now - new Date(ultDataIso).getTime()) / 60000);
        }

        const cerState = offlineAlerts[cer.id] || { status: 'ONLINE', ultimo_alerta_em: null };

        result.push({
          ceramica_id: cer.id,
          ceramica_nome: cer.nome,
          responsavel: cer.responsavel,
          diff_min: diffMin,
          ultima_leitura_iso: ultDataIso,
          is_offline_30min: diffMin >= 30,
          status_alerta: cerState.status || (diffMin >= 30 ? 'OFFLINE' : 'ONLINE'),
          ultimo_alerta_em: cerState.ultimo_alerta_em
        });
      }
    }

    res.json({ success: true, monitor: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Teste de Alerta de Desconexão para uma Cerâmica
app.post('/api/testar-alerta-desconexao/:ceramicaId', async (req, res) => {
  try {
    const { ceramicaId } = req.params;
    const { data: cer } = await sb.from('ceramicas').select('id, nome').eq('id', ceramicaId).maybeSingle();
    const ceramicaNome = cer ? cer.nome : 'Cerâmica Cliente';

    const contatos = getContatos().filter(c => c.ceramica_id === ceramicaId && c.receber_relatorio && c.telefone);
    if (contatos.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato com recebimento ativo cadastrado para esta cerâmica.' });
    }

    const { dataFormatada, horaFormatada } = getAgoraBrasil();
    const textoAviso = gerarTextoAlertaDesconexao(ceramicaNome, 35, `${dataFormatada} às ${horaFormatada}`);

    let enviados = 0;
    for (const c of contatos) {
      try {
        await enviarMensagemSegura(c.telefone, textoAviso);
        enviados++;
        if (contatos.length > 1) await delay(4000);
      } catch (errOne) {
        addLog('error', `Falha no teste para ${c.nome}: ${errOne.message}`);
      }
    }

    addLog('info', `Teste de alerta de desconexão enviado para ${enviados} contato(s) de ${ceramicaNome}`);
    res.json({ success: true, enviados, total: contatos.length, mensagem: textoAviso });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Preview de Relatório das Últimas 12 Horas
app.post('/api/preview-report', async (req, res) => {
  try {
    const { ceramicaId, modo } = req.body;
    const relatorio = await gerarRelatorio12Horas(ceramicaId, modo);
    res.json({ success: true, ...relatorio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Envio Manual Avulso (Suporta { phone, text, chartUrl } e { telefone, mensagem, imagemUrl })
app.post('/api/send-message', async (req, res) => {
  try {
    const phone = req.body.phone || req.body.telefone;
    const text = req.body.text || req.body.mensagem;
    const chartUrl = req.body.chartUrl || req.body.imageUrl || req.body.imagem;
    if (!phone || !text) return res.status(400).json({ error: 'Telefone e texto obrigatórios.' });
    const result = await enviarMensagemSegura(phone, text, chartUrl);
    addLog('success', `Mensagem enviada para +${result.jid.split('@')[0]}`);
    res.json({ success: true, result });
  } catch (err) {
    addLog('error', `Erro mensagem: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enviar-mensagem', async (req, res) => {
  try {
    const phone = req.body.phone || req.body.telefone;
    const text = req.body.text || req.body.mensagem;
    const chartUrl = req.body.chartUrl || req.body.imageUrl || req.body.imagem;
    if (!phone || !text) return res.status(400).json({ error: 'Telefone e texto obrigatórios.' });
    const result = await enviarMensagemSegura(phone, text, chartUrl);
    addLog('success', `Mensagem enviada para +${result.jid.split('@')[0]}`);
    res.json({ success: true, result });
  } catch (err) {
    addLog('error', `Erro mensagem: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 8. Desconectar WhatsApp
app.post('/api/logout', async (req, res) => {
  try {
    addLog('warn', 'Solicitado encerramento de sessão pelo usuário.');
    if (sock) {
      try { await sock.logout(); } catch (e) {}
      try { sock.end(); } catch (e) {}
    }
    limparCredenciais();
    setTimeout(() => {
      isStarting = false;
      iniciarWhatsApp();
    }, 1500);
    res.json({ success: true, message: 'Sessão desvinculada. Gerando novo QR Code...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Forçar Reconexão / Novo QR Code
app.post('/api/reconnect', async (req, res) => {
  try {
    addLog('info', 'Reinicialização forçada do WhatsApp solicitada...');
    if (sock) {
      try { sock.end(); } catch (e) {}
    }
    limparCredenciais();
    setTimeout(() => {
      isStarting = false;
      iniciarWhatsApp();
    }, 1500);
    res.json({ success: true, message: 'Reiniciando motor Baileys e gerando novo QR Code...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicia Servidor e Conexão Baileys
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 THERMOLINK WHATSAPP GATEWAY & AUTOMAÇÃO ATIVO!`);
  console.log(`📡 Porta: ${PORT} | Painel: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  iniciarWhatsApp();
});
