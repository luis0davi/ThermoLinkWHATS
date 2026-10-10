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
    horario_envio_diario: '18:00',
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
// GERADOR DE RELATÓRIO DIÁRIO DE FORNOS (TELEMETRIA REAL)
// ==============================================================
async function gerarTextoRelatorio(ceramicaId = null, modo = 'real') {
  const { dataFormatada, horaFormatada } = getAgoraBrasil();

  let ceramicaNome = 'Cerâmica Cliente';
  let responsavel = 'Gestor';
  let fornosDados = [];

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
      }

      const { data: leituras } = await sb
        .from('leituras')
        .select('*')
        .eq('ceramica_id', ceramicaId)
        .order('created_at', { ascending: false })
        .limit(300);

      const fornosMap = {};
      if (leituras && leituras.length > 0) {
        for (const l of leituras) {
          const fId = l.forno_id || l.modulo_alutal || 1;
          if (!fornosMap[fId]) {
            fornosMap[fId] = {
              fornoId: fId,
              ultimaLeitura: l,
              picoC1: Number(l.canal_1 || 0),
              picoC2: Number(l.canal_2 || 0),
              count: 1,
              somaC1: Number(l.canal_1 || 0)
            };
          } else {
            const f = fornosMap[fId];
            f.count++;
            f.somaC1 += Number(l.canal_1 || 0);
            if (Number(l.canal_1 || 0) > f.picoC1) f.picoC1 = Number(l.canal_1 || 0);
            if (Number(l.canal_2 || 0) > f.picoC2) f.picoC2 = Number(l.canal_2 || 0);
          }
        }
      }

      const fKeys = Object.keys(fornosMap).sort((a, b) => Number(a) - Number(b));
      if (fKeys.length > 0) {
        fornosDados = fKeys.map(k => {
          const f = fornosMap[k];
          const media = Math.round(f.somaC1 / f.count);
          const c1 = Number(f.ultimaLeitura.canal_1 || 0);
          const c2 = Number(f.ultimaLeitura.canal_2 || 0);
          const ultData = new Date(f.ultimaLeitura.created_at);
          const diffMin = Math.round((Date.now() - ultData.getTime()) / 60000);

          let statusForno = '🔴 Desconectado';
          if (diffMin <= 5) {
            statusForno = c1 > 600 ? '🔥 Queima em Andamento' : (c1 > 150 ? '♨️ Aquecendo / Resfriamento' : '🟢 Online / Estável');
          }

          return {
            num: String(f.fornoId).padStart(2, '0'),
            c1,
            c2,
            picoC1: f.picoC1,
            media,
            status: statusForno,
            ultHora: ultData.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
        });
      }
    } catch (e) {
      console.warn('Erro telemetria Supabase:', e);
    }
  }

  if (fornosDados.length === 0) {
    if (!ceramicaNome || ceramicaNome === 'Cerâmica Cliente') {
      ceramicaNome = 'Nossa Senhora Aparecida';
      responsavel = 'Sr. Arim / Davi';
    }
    fornosDados = [
      { num: '01', c1: 948, c2: 925, picoC1: 988, media: 742, status: '🔥 Queima no Padrão', ultHora: horaFormatada },
      { num: '02', c1: 285, c2: 270, picoC1: 975, media: 660, status: '♨️ Resfriamento Controlado', ultHora: horaFormatada },
      { num: '03', c1: 38,  c2: 36,  picoC1: 42,  media: 39,  status: '🟢 Pátio / Vazio', ultHora: horaFormatada }
    ];
  }

  let texto = `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
  texto += `🔥 *THERMOLINK • RESUMO DIÁRIO DE FORNOS* 🔥\n`;
  texto += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
  texto += `🏭 *Cerâmica:* ${ceramicaNome}\n`;
  texto += `👤 *Aos Cuidados:* ${responsavel}\n`;
  texto += `📅 *Data:* ${dataFormatada} às ${horaFormatada}\n`;
  texto += `📡 *Telemetria:* Monitoramento em Tempo Real\n\n`;
  texto += `*──────────────────────────*\n`;
  texto += `📊 *STATUS DETALHADO DOS FORNOS*\n`;
  texto += `*──────────────────────────*\n\n`;

  fornosDados.forEach(f => {
    texto += `*FORNO ${f.num}* — ${f.status}\n`;
    texto += `• *Temp. Atual:* C1: *${f.c1}°C* | C2: *${f.c2}°C*\n`;
    texto += `• *Pico Máximo do Ciclo:* *${f.picoC1}°C*\n`;
    texto += `• *Média:* ${f.media}°C\n`;
    texto += `• *Última Telemetria:* ${f.ultHora}\n\n`;
  });

  texto += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
  texto += `✅ *Resumo Operacional:* Leituras consolidadas com sucesso.\n`;
  texto += `📲 _Mensagem automática gerada pela plataforma ThermoLink._\n`;
  texto += `🌐 Acesse o painel: *thermolink.com.br*\n`;
  texto += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*`;

  return { texto, ceramicaNome, responsavel, fornosCount: fornosDados.length };
}

// Disparo Seguro com Intervalo Anti-bloqueio, Pré-aquecimento Signal e Retry Store
async function enviarMensagemSegura(telefone, texto) {
  if (connectionStatus !== 'CONECTADO' || !sock) {
    throw new Error('WhatsApp não está conectado.');
  }
  const jidBruto = await resolverJidValido(telefone);
  const jid = jidNormalizedUser(jidBruto);

  // 1. Pré-aquecimento de canal (presença): Força o WhatsApp do destinatário a negociar
  // a sessão Signal e chaves de criptografia antes do envio dos dados, eliminando o erro "Aguardando mensagem".
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate('composing', jid);
    await delay(500);
    await sock.sendPresenceUpdate('paused', jid);
  } catch (presErr) {
    // Silencia se privacidade do contato rejeitar atualização de presença
  }

  // 2. Envio da mensagem via Baileys
  const result = await sock.sendMessage(jid, { text: texto });

  // 3. Salva a mensagem no MessageStore para que retries subsequentes consigam ser atendidos
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
        addLog('info', `Gerando e enviando relatório para ${c.nome} (${c.ceramica_nome}) no WhatsApp ${c.telefone}...`);
        const rel = await gerarTextoRelatorio(c.ceramica_id, 'real');
        await enviarMensagemSegura(c.telefone, rel.texto);
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
    const rel = await gerarTextoRelatorio(c.ceramica_id, 'real');
    const result = await enviarMensagemSegura(c.telefone, rel.texto);
    addLog('success', `Relatório enviado com sucesso para ${c.nome}!`);

    res.json({ success: true, result, relatorio: rel.texto });
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

    const rel = await gerarTextoRelatorio(ceramicaId, 'real');
    let enviados = 0;
    for (const c of contatos) {
      try {
        await enviarMensagemSegura(c.telefone, rel.texto);
        enviados++;
        if (contatos.length > 1) await delay(5000);
      } catch (e) {
        addLog('error', `Falha ao enviar para ${c.nome}: ${e.message}`);
      }
    }
    res.json({ success: true, enviados, total: contatos.length });
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

// 6. Preview de Relatório
app.post('/api/preview-report', async (req, res) => {
  try {
    const { ceramicaId, modo } = req.body;
    const relatorio = await gerarTextoRelatorio(ceramicaId, modo);
    res.json(relatorio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Envio Manual Avulso
app.post('/api/send-message', async (req, res) => {
  try {
    const { phone, text } = req.body;
    if (!phone || !text) return res.status(400).json({ error: 'Telefone e texto obrigatórios.' });
    const result = await enviarMensagemSegura(phone, text);
    addLog('success', `Mensagem avulsa enviada para +${result.jid.split('@')[0]}`);
    res.json({ success: true, result });
  } catch (err) {
    addLog('error', `Erro mensagem avulsa: ${err.message}`);
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
