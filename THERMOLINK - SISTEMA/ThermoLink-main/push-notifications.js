// ==========================================================================
// THERMOLINK - NOTIFICAÇÕES E CENTRAL DE ALERTAS
// --------------------------------------------------------------------------
// Dois canais complementares:
//   A) WEB PUSH (navegador/PWA): Service Worker + notificação do sistema.
//   B) ALERTAS NO APP (funciona em qualquer lugar, INCLUSIVE NO APK KODULAR):
//      polling na tabela "notificacoes" do Supabase + banner visual +
//      alerta sonoro (WebAudio) + vibração do celular.
//
// Extras:
//   - Modal "Configurar alertas": tipos e parâmetros por forno
//     (offline em X minutos, temperatura limite, volta online, empresa).
//   - Botão "Testar alerta" (visual + som + vibração).
//   - Nunca bloqueia o aplicativo se algo falhar.
// ==========================================================================

(function () {
    "use strict";

    // ------------------------------------------------------------------
    // CONFIGURAÇÃO
    // ------------------------------------------------------------------
    const SUPABASE_URL = "https://zawnluboujbovpgrgdcx.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_gJiVQXVjiuSPY3vHt2f8OA_CiES-4Ak";
    const API_PUSH = SUPABASE_URL + "/functions/v1/push-api";

    const LS_SESSAO = "thermolink_active_session";
    const LS_ATIVADO = "thermolink_push_ativado";
    const LS_USUARIO_VINC = "thermolink_push_usuario";
    const LS_LIDAS = "thermolink_notif_lidas";

    const INTERVALO_POLLING_MS = 30000;

    let swRegistration = null;
    let audioCtx = null;
    let timerPolling = null;
    let cacheConfigs = [];
    let bannerAtivo = null;

    const suportado =
        "serviceWorker" in navigator &&
        typeof window.PushManager !== "undefined" &&
        typeof window.Notification !== "undefined";

    // WebView de APK (Kodular/App Inventor) → Web Push não existe lá,
    // mas a central de alertas do app funciona normalmente.
    const ehWebView = /;\s*wv\)/.test(navigator.userAgent);

    // ------------------------------------------------------------------
    // UTILITÁRIOS
    // ------------------------------------------------------------------
    function $(id) { return document.getElementById(id); }

    function getSessao() {
        try {
            return JSON.parse(localStorage.getItem(LS_SESSAO) || "null");
        } catch {
            return null;
        }
    }

    function urlBase64ParaUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }

    async function apiPush(corpo) {
        const resp = await fetch(API_PUSH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo)
        });
        const dados = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(dados.erro || ("HTTP " + resp.status));
        return dados;
    }

    async function restSupabase(recurso) {
        const resp = await fetch(SUPABASE_URL + "/rest/v1/" + recurso, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: "Bearer " + SUPABASE_ANON_KEY
            }
        });
        if (!resp.ok) throw new Error("REST HTTP " + resp.status);
        return resp.json();
    }

    function estaAtivado() {
        return localStorage.getItem(LS_ATIVADO) === "1";
    }

    async function getSubscriptionAtual() {
        if (!swRegistration) return null;
        try {
            return await swRegistration.pushManager.getSubscription();
        } catch {
            return null;
        }
    }

    // ------------------------------------------------------------------
    // CANAL A: WEB PUSH (navegador / PWA instalada)
    // ------------------------------------------------------------------
    async function registrarServiceWorker() {
        if (!suportado || ehWebView) return;
        if (window.location.protocol === "file:") return;
        try {
            swRegistration = await navigator.serviceWorker.register("sw.js");
        } catch (err) {
            console.warn("[ThermoLink Push] Service Worker não registrado:", err);
        }
    }

    async function ativar() {
        if (!suportado || ehWebView) { render(); return; }

        let permissao = Notification.permission;
        if (permissao === "default") {
            try {
                permissao = await Notification.requestPermission();
            } catch {
                permissao = "denied";
            }
        }
        if (permissao !== "granted") {
            render();
            return;
        }

        try {
            await registrarServiceWorker();
            const reg = swRegistration || (await navigator.serviceWorker.ready);
            swRegistration = reg;

            const respKey = await fetch(API_PUSH);
            if (!respKey.ok) throw new Error("Falha ao obter chave VAPID");
            const { vapidPublicKey } = await respKey.json();

            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ParaUint8Array(vapidPublicKey)
                });
            }

            await enviarInscricao(sub);
            localStorage.setItem(LS_ATIVADO, "1");
        } catch (err) {
            console.error("[ThermoLink Push] Falha ao ativar:", err);
        }
        render();
    }

    async function desativar() {
        try {
            const sub = await getSubscriptionAtual();
            if (sub && sub.endpoint) {
                await apiPush({ action: "unsubscribe", endpoint: sub.endpoint }).catch(() => {});
                await sub.unsubscribe().catch(() => {});
            }
        } catch (err) {
            console.warn("[ThermoLink Push] Falha ao desativar:", err);
        }
        localStorage.setItem(LS_ATIVADO, "0");
        render();
    }

    async function enviarInscricao(sub) {
        const sessao = getSessao() || {};
        await apiPush({
            action: "subscribe",
            endpoint: sub.endpoint,
            keys: sub.toJSON().keys,
            usuario: sessao.username || "desconhecido",
            empresa: sessao.name || sessao.username || "",
            userAgent: String(navigator.userAgent).slice(0, 300)
        });
        localStorage.setItem(LS_USUARIO_VINC, sessao.username || "");
    }

    function onAuthChanged() {
        render();
        renderCentral();
        (async () => {
            if (!estaAtivado()) return;
            const sub = await getSubscriptionAtual();
            if (!sub) return;
            const sessao = getSessao();
            const vinculado = localStorage.getItem(LS_USUARIO_VINC);
            if (sessao && sessao.username && sessao.username !== vinculado) {
                try { await enviarInscricao(sub); } catch { /* silencioso */ }
            }
        })();
    }

    function toggleFromUi() {
        if (!suportado || ehWebView) return;
        if (Notification.permission === "granted" && estaAtivado()) {
            desativar();
        } else {
            ativar();
        }
    }

    // ------------------------------------------------------------------
    // CANAL B: ALERTAS DENTRO DO APP (banner + som + vibração)
    // Funciona no navegador e dentro do WebView do APK Kodular.
    // ------------------------------------------------------------------

    // --- SOM (WebAudio: sem arquivos externos) ---
    function garantirAudio() {
        try {
            if (!audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) audioCtx = new Ctx();
            }
            if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        } catch { /* áudio indisponível */ }
        return audioCtx;
    }

    function bip(freq, inicio, duracao) {
        const ctx = garantirAudio();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime + inicio;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
        osc.start(t0);
        osc.stop(t0 + duracao + 0.05);
    }

    function tocarAlertaSonoro() {
        bip(880, 0, 0.14);
        bip(1100, 0.18, 0.14);
        bip(1320, 0.36, 0.2);
    }

    // --- VIBRAÇÃO ---
    function vibrar() {
        try {
            if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 500]);
        } catch { /* sem suporte */ }
    }

    // --- BANNER VISUAL ---
    function mostrarBanner(tipo, titulo, corpo, fornoNumero) {
        const existente = $("tlBannerAlerta");
        if (existente) existente.remove();

        const cores = {
            offline: "var(--red)",
            online: "var(--green)",
            temp: "var(--orange)",
            evento: "var(--blue)"
        };
        const icones = { offline: "fa-plug-circle-xmark", online: "fa-plug-circle-check", temp: "fa-fire", evento: "fa-bell" };

        const el = document.createElement("div");
        el.id = "tlBannerAlerta";
        el.className = "tl-banner tl-banner-" + tipo;
        el.style.setProperty("--tl-cor", cores[tipo] || cores.evento);
        el.innerHTML =
            '<div class="tl-banner-icon"><i class="fa-solid ' + (icones[tipo] || icones.evento) + '"></i></div>' +
            '<div class="tl-banner-texto"><b>' + escapeHtml(titulo) + '</b><span>' + escapeHtml(corpo) + '</span></div>' +
            '<i class="fa-solid fa-chevron-right tl-banner-seta"></i>';

        el.addEventListener("click", () => {
            fecharBanner();
            navegarParaForno(fornoNumero != null ? Number(fornoNumero) : null);
        });

        document.body.appendChild(el);
        bannerAtivo = el;
        setTimeout(fecharBanner, 7000);
    }

    function fecharBanner() {
        if (bannerAtivo) {
            bannerAtivo.classList.add("tl-banner-sair");
            const b = bannerAtivo;
            setTimeout(() => b.remove(), 350);
            bannerAtivo = null;
        }
    }

    // --- LEITURAS LOCAIS (marca "lida" sem precisar de escrita no banco) ---
    function carregarLidas() {
        try { return new Set(JSON.parse(localStorage.getItem(LS_LIDAS) || "[]")); }
        catch { return new Set(); }
    }

    function salvarLidas(setLidas) {
        const arr = Array.from(setLidas);
        localStorage.setItem(LS_LIDAS, JSON.stringify(arr.slice(-400)));
    }

    // --- POLLING DA OUTBOX ---
    function notificaVisivelParaSessao(n, sessao) {
        if (!sessao) return false;
        if (sessao.role === "admin") return true;
        if (!n.empresa) return true; // null = todas as empresas
        return n.empresa === (sessao.name || sessao.username);
    }

    async function verificarNotificacoes() {
        const sessao = getSessao();
        if (!sessao) return;

        let novas = [];
        let recentes = [];

        try {
            const linhas = await restSupabase(
                "notificacoes?select=id,tipo,titulo,corpo,forno_numero,empresa,criada_em&order=criada_em.desc&limit=20"
            );

            const limite24h = Date.now() - 24 * 60 * 60 * 1000;
            const lidas = carregarLidas();

            recentes = (linhas || [])
                .filter(n => new Date(n.criada_em).getTime() >= limite24h)
                .filter(n => notificaVisivelParaSessao(n, sessao));

            novas = recentes.filter(n => !lidas.has(n.id));

            if (novas.length) {
                // Alerta sonoro + vibração + banner (uma vez por lote)
                tocarAlertaSonoro();
                vibrar();
                const principal = novas[0];
                mostrarBanner(principal.tipo, principal.titulo, principal.corpo, principal.forno_numero);

                novas.forEach(n => lidas.add(n.id));
                salvarLidas(lidas);
            }
        } catch (err) {
            console.warn("[ThermoLink Alertas] Sem conexão com a central:", err);
        }

        renderCentral(recentes);
    }

    function formatHoraCurta(iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    function renderCentral(recentes) {
        const contagemEl = $("pushNaoLidas");
        const listaEl = $("pushListaAlertas");

        if (recentes === undefined) {
            // Chamada sem dados: apenas recalcula pelo estado local
            const lidas = carregarLidas();
            if (contagemEl) contagemEl.textContent = "—";
            return;
        }

        if (contagemEl) contagemEl.textContent = String(recentes.length);

        if (!listaEl) return;

        if (!recentes.length) {
            listaEl.innerHTML = '<div class="push-alerta-vazio">Nenhum alerta nas últimas 24 horas.</div>';
            return;
        }

        const cores = { offline: "var(--red)", online: "var(--green)", temp: "var(--orange)", evento: "var(--blue)" };
        listaEl.innerHTML = recentes.slice(0, 8).map(n =>
            '<div class="push-alerta-item" onclick="ThermoPush.abrirAlerta(\'' + n.id + '\',' + Number(n.forno_numero ?? -1) + ')">' +
                '<i class="fa-solid fa-circle" style="color: ' + (cores[n.tipo] || cores.evento) + '; font-size: 7px;"></i>' +
                '<div class="push-alerta-item-texto"><b>' + escapeHtml(n.titulo) + '</b><span>' + escapeHtml(n.corpo) + '</span></div>' +
                '<span class="push-alerta-hora">' + formatHoraCurta(n.criada_em) + '</span>' +
            '</div>'
        ).join("");
    }

    function abrirAlerta(id, fornoNumero) {
        // Marca como vista localmente e navega ao forno relacionado
        const lidas = carregarLidas();
        lidas.add(id);
        salvarLidas(lidas);
        navegarParaForno(fornoNumero >= 0 ? fornoNumero : null);
    }

    function iniciarPolling() {
        if (window.location.protocol === "file:") return;
        if (timerPolling) clearInterval(timerPolling);
        verificarNotificacoes();
        timerPolling = setInterval(verificarNotificacoes, INTERVALO_POLLING_MS);
    }

    // ------------------------------------------------------------------
    // MODAL: CONFIGURAR TIPOS E PARÂMETROS DOS ALERTAS
    // ------------------------------------------------------------------
    function fornosDisponiveis() {
        try {
            if (typeof state !== "undefined" && state && Array.isArray(state.ovens)) return state.ovens;
        } catch { /* ignore */ }
        return [];
    }

    async function abrirConfig() {
        const modal = $("modalConfigAlertas");
        if (!modal) return;
        modal.classList.remove("hidden");
        definirMsgConfig("");

        const select = $("cfgFornoSelect");
        const fornos = fornosDisponiveis();

        select.innerHTML = fornos.length
            ? fornos.map(o => {
                const mod = Number(o.numero);
                return '<option value="' + mod + '">' + escapeHtml(o.nome || ("Forno " + String(mod).padStart(2, "0"))) + '</option>';
              }).join("")
            : '<option value="">Nenhum forno carregado</option>';

        try {
            const resp = await fetch(API_PUSH, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "config_get" })
            });
            const dados = await resp.json();
            cacheConfigs = Array.isArray(dados.configs) ? dados.configs : [];
        } catch {
            cacheConfigs = [];
            definirMsgConfig("Não foi possível carregar as configurações salvas.", true);
        }

        if (fornos.length) preencherFormConfig(Number(fornos[0].numero));
    }

    function fecharConfig() {
        const modal = $("modalConfigAlertas");
        if (modal) modal.classList.add("hidden");
    }

    function preencherFormConfig(modulo) {
        const cfg = cacheConfigs.find(c => Number(c.modulo_alutal) === Number(modulo));

        $("cfgOfflineChk").checked = cfg ? cfg.notificar_offline !== false : true;
        $("cfgOfflineMin").value = cfg?.offline_minutos ?? 5;
        $("cfgOnlineChk").checked = cfg ? cfg.notificar_online !== false : true;
        $("cfgTempChk").checked = cfg ? cfg.notificar_temp !== false : true;
        $("cfgTempLimite").value = (cfg && cfg.limite_temp_c != null) ? cfg.limite_temp_c : "";
        $("cfgEmpresa").value = cfg?.empresa || "";
        $("cfgAplicarTodos").checked = false;
    }

    function selecionarFornoConfig(valor) {
        if (valor !== "") preencherFormConfig(Number(valor));
    }

    function definirMsgConfig(texto, erro) {
        const msg = $("cfgMsg");
        if (!msg) return;
        msg.textContent = texto;
        msg.classList.toggle("cfg-msg-erro", Boolean(erro));
        msg.classList.toggle("hidden", !texto);
    }

    async function salvarConfig() {
        const select = $("cfgFornoSelect");
        if (!select || !select.value) {
            definirMsgConfig("Selecione um forno.", true);
            return;
        }

        const minutos = Math.round(Number($("cfgOfflineMin").value));
        if (!Number.isFinite(minutos) || minutos < 1 || minutos > 120) {
            definirMsgConfig("Minutos sem comunicação deve estar entre 1 e 120.", true);
            return;
        }

        const limiteBruto = $("cfgTempLimite").value.trim();
        let limite = null;
        if (limiteBruto !== "") {
            limite = Number(limiteBruto.replace(",", "."));
            if (!Number.isFinite(limite) || limite < 30 || limite > 2000) {
                definirMsgConfig("Temperatura limite deve estar entre 30 e 2000 °C.", true);
                return;
            }
        }

        const base = {
            offline_minutos: minutos,
            limite_temp_c: limite,
            notificar_offline: $("cfgOfflineChk").checked,
            notificar_online: $("cfgOnlineChk").checked,
            notificar_temp: $("cfgTempChk").checked,
            empresa: $("cfgEmpresa").value.trim()
        };

        const aplicarTodos = $("cfgAplicarTodos").checked;
        const alvos = aplicarTodos
            ? fornosDisponiveis().map(o => Number(o.numero))
            : [Number(select.value)];

        const itens = alvos.map(m => Object.assign({ modulo_alutal: m }, base));

        try {
            definirMsgConfig("Salvando...");
            await apiPush({ action: "config", itens });
            cacheConfigs = [];
            definirMsgConfig("Alertas salvos com sucesso ✓");
            setTimeout(fecharConfig, 900);
        } catch (err) {
            definirMsgConfig("Erro ao salvar: " + err.message, true);
        }
    }

    // ------------------------------------------------------------------
    // UI: SEÇÃO NOTIFICAÇÕES (CONFIGURAÇÕES)
    // ------------------------------------------------------------------
    function render() {
        const badge = $("pushStateBadge");
        const btn = $("btnTogglePush");
        const btnIcon = $("btnTogglePushIcon");
        const btnLabel = $("btnTogglePushLabel");
        const hint = $("pushHint");
        if (!badge || !btn) return;

        badge.classList.remove("push-on", "push-off");

        // APK Kodular / WebView: central de alertas ativa, Web Push não existe
        if (ehWebView) {
            badge.textContent = "Modo App";
            badge.classList.add("push-on");
            btn.disabled = true;
            btnIcon.className = "fa-solid fa-mobile-screen-button";
            btnLabel.textContent = "Alertas ativos dentro do aplicativo";
            hint.textContent = "No APK, os alertas aparecem dentro do ThermoLink com aviso visual, som e vibração automaticamente.";
            hint.classList.remove("hidden");
            return;
        }

        if (!suportado || window.location.protocol === "file:") {
            badge.textContent = "Indisponível";
            badge.classList.add("push-off");
            btn.disabled = true;
            btnLabel.textContent = "Notificações não suportadas neste navegador";
            hint.textContent = "Este dispositivo/navegador não suporta notificações Push. O ThermoLink continua funcionando normalmente.";
            hint.classList.remove("hidden");
            return;
        }

        btn.disabled = false;
        const perm = Notification.permission;
        const ativado = estaAtivado();

        if (perm === "denied") {
            badge.textContent = "Bloqueadas";
            badge.classList.add("push-off");
            btnIcon.className = "fa-solid fa-bell-slash";
            btnLabel.textContent = "Permissão bloqueada no navegador";
            hint.textContent = "As notificações foram negadas neste navegador. Para reativá-las, libere a permissão nas configurações do site/navegador.";
            hint.classList.remove("hidden");
            return;
        }

        hint.classList.add("hidden");

        if (perm === "granted" && ativado) {
            badge.textContent = "Ativadas";
            badge.classList.add("push-on");
            btnIcon.className = "fa-solid fa-bell-slash";
            btnLabel.textContent = "Desativar notificações";
        } else {
            badge.textContent = "Desativadas";
            badge.classList.add("push-off");
            btnIcon.className = "fa-solid fa-bell";
            btnLabel.textContent = "Ativar notificações";
        }
    }

    // ------------------------------------------------------------------
    // DEEP-LINK: abrir direto no forno vindo da notificação (?forno=XX)
    // ------------------------------------------------------------------
    function extrairFornoDaUrl(url) {
        try {
            const u = new URL(url, window.location.href);
            const v = Number(u.searchParams.get("forno"));
            return Number.isFinite(v) ? v : null;
        } catch {
            return null;
        }
    }

    function navegarParaForno(modulo) {
        if (modulo === null || modulo === undefined) return;
        if (typeof window.abrirDetalheForno !== "function") return;
        // `state` é declarado com const no app.js (não fica em window)
        if (typeof state === "undefined" || !state || !state.currentUser) return;

        state.selectedModule = null;
        window.abrirDetalheForno(Number(modulo));
    }

    function processarDeepLinkInicial() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has("ntf")) return;

        const forno = extrairFornoDaUrl(window.location.href);
        history.replaceState(null, "", window.location.pathname);
        if (forno === null) return;

        let tentativas = 0;
        const timer = setInterval(() => {
            tentativas++;
            const appVisivel = !$("mainApp").classList.contains("hidden");
            if (appVisivel && typeof state !== "undefined" && state && state.currentUser) {
                clearInterval(timer);
                navegarParaForno(forno);
            } else if (tentativas > 60) {
                clearInterval(timer);
            }
        }, 250);
    }

    // Mensagem do Service Worker quando uma janela já estava aberta
    navigator.serviceWorker?.addEventListener?.("message", (event) => {
        if (event.data && event.data.type === "thermolink-navegar") {
            navegarParaForno(extrairFornoDaUrl(event.data.url));
        }
    });

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // ------------------------------------------------------------------
    // INICIALIZAÇÃO
    // ------------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        render();
        registrarServiceWorker().then(() => render());
        processarDeepLinkInicial();
        iniciarPolling();

        // Desbloqueio do áudio no primeiro toque (política dos navegadores)
        const desbloquear = () => { garantirAudio(); document.removeEventListener("pointerdown", desbloquear); };
        document.addEventListener("pointerdown", desbloquear);
    });

    // API pública usada pelos hooks do app.js e pelos botões da interface
    window.ThermoPush = {
        toggleFromUi,
        onAuthChanged,
        abrirConfig,
        fecharConfig,
        selecionarFornoConfig,
        salvarConfig,
        abrirAlerta
    };
})();

// ==========================================================================
// THERMOLINK - MOTOR DE ALERTAS EM TEMPO REAL (LOCAL)
// --------------------------------------------------------------------------
// • Interruptor geral + limites de temperatura máx/mín por forno (C1 e C2)
// • Preferências persistidas no localStorage (sobrevivem ao fechar o app)
// • Verificação injetada no ciclo de 8 segundos do app (carregarFornosELeituras)
// • Estímulos: borda piscante vermelha + modal de emergência, bip industrial
//   em loop enquanto o problema persistir e vibração nativa via ponte Kodular
//     → window.AppInventor.setWebViewString("vibrar")  /  window.Kodular...
// ==========================================================================

(function () {
    "use strict";

    const LS_KEY = "thermolink_alertas_config_v1";
    const TEXTO_PONTE_VIBRAR = "vibrar";

    function padrao() {
        return {
            geralAtivo: false,
            estimulos: { visual: true, sonoro: true, vibracao: true },
            fornos: {} // "numero": { limiteMax: number|null, limiteMin: number|null }
        };
    }

    let config = carregarConfig();
    let selecaoAtual = "";          // número do forno em edição ou "todos"
    let ultimoTotalOpcoes = -1;
    const alarmes = new Map();      // chave "forno|canal|tipo" -> info da violação
    let silenciado = false;
    let dispensado = false;
    let timerSom = null;
    let timerVibra = null;
    let flashEl = null;
    let modalEl = null;

    // ------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------
    function $id(id) { return document.getElementById(id); }

    function carregarConfig() {
        try {
            const salvo = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
            const base = padrao();
            return {
                geralAtivo: Boolean(salvo.geralAtivo),
                estimulos: Object.assign(base.estimulos, salvo.estimulos || {}),
                fornos: salvo.fornos || {}
            };
        } catch {
            return padrao();
        }
    }

    function salvarConfig() {
        try { localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch { /* ignore */ }
    }

    function num(v) {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function getOvens() {
        try {
            if (typeof state !== "undefined" && state && Array.isArray(state.ovens)) return state.ovens;
        } catch { /* app.js ainda não pronto */ }
        return [];
    }

    function nomeForno(mod) {
        const o = getOvens().find(x => Number(x.numero) === Number(mod));
        if (o && o.nome) return o.nome;
        return "Forno " + String(mod).padStart(2, "0");
    }

    // ------------------------------------------------------------------
    // ÁUDIO PRÓPRIO DO MOTOR (bip industrial em duas notas)
    // ------------------------------------------------------------------
    let audioMotor = null;

    function garantirAudioMotor() {
        try {
            if (!audioMotor) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) audioMotor = new Ctx();
            }
            if (audioMotor && audioMotor.state === "suspended") audioMotor.resume();
        } catch { /* sem áudio */ }
        return audioMotor;
    }

    function bip(freq, inicio, duracao) {
        const ctx = garantirAudioMotor();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime + inicio;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
        osc.start(t0);
        osc.stop(t0 + duracao + 0.05);
    }

    // Mesmo som do antigo "Testar alerta": três bips ascendentes
    function tocarBipAlarme() {
        bip(880, 0, 0.14);
        bip(1100, 0.18, 0.14);
        bip(1320, 0.36, 0.2);
    }

    function iniciarLoopSonoro() {
        if (timerSom) return;
        garantirAudioMotor();
        tocarBipAlarme();
        timerSom = setInterval(tocarBipAlarme, 1600);
    }

    function pararLoopSonoro() {
        if (timerSom) { clearInterval(timerSom); timerSom = null; }
    }

    // ------------------------------------------------------------------
    // VIBRAÇÃO: API nativa do navegador + PONTE KODULAR (WebViewString)
    // ------------------------------------------------------------------
    function vibrarAgora() {
        try { if (navigator.vibrate) navigator.vibrate(500); } catch { /* sem suporte */ }
        // Ponte JavaScript ➡️ Kodular/App Inventor:
        // No Kodular, o bloco "When WebViewer.WebViewStringChange" recebe "vibrar"
        // e aciona o componente nativo de vibração.
        try {
            if (window.AppInventor && typeof window.AppInventor.setWebViewString === "function") {
                window.AppInventor.setWebViewString(TEXTO_PONTE_VIBRAR);
            }
        } catch { /* fora do WebView */ }
        try {
            if (window.Kodular && typeof window.Kodular.setWebViewString === "function") {
                window.Kodular.setWebViewString(TEXTO_PONTE_VIBRAR);
            }
        } catch { /* fora do WebView */ }
    }

    function iniciarLoopVibracao() {
        if (timerVibra) return;
        vibrarAgora();
        timerVibra = setInterval(vibrarAgora, 3000);
    }

    function pararLoopVibracao() {
        if (timerVibra) { clearInterval(timerVibra); timerVibra = null; }
    }

    // ------------------------------------------------------------------
    // ESTÍMULO VISUAL: borda piscante vermelha + modal flutuante de emergência
    // ------------------------------------------------------------------
    function garantirFlash() {
        if (flashEl) return;
        flashEl = document.createElement("div");
        flashEl.className = "tl-flash-overlay";
        document.body.appendChild(flashEl);
    }

    function removerFlash() {
        if (flashEl) { flashEl.remove(); flashEl = null; }
    }

    function garantirModalEmergencia() {
        if (modalEl) return;
        modalEl = document.createElement("div");
        modalEl.className = "tl-emergencia";
        document.body.appendChild(modalEl);
    }

    function fecharModalEmergencia() {
        if (modalEl) { modalEl.remove(); modalEl = null; }
    }

    function atualizarModalEmergencia() {
        if (!alarmes.size) { fecharModalEmergencia(); return; }
        garantirModalEmergencia();

        const itens = Array.from(alarmes.values()).map(a => {
            const acima = a.tipo === "max";
            const cor = acima ? "var(--red)" : "var(--blue-light)";
            const rotulo = acima ? "acima do limite" : "abaixo do limite";
            const iconeCanal = a.canal === 1 ? "Canal 1 • Superior" : "Canal 2 • Inferior";
            return '<div class="tl-emerg-item">' +
                       '<i class="fa-solid fa-triangle-exclamation" style="color:' + cor + '; margin-top:2px;"></i>' +
                       '<span><b>' + escapeHtml(nomeForno(a.mod)) + '</b> — ' + iconeCanal + ': ' +
                       '<b style="color:' + cor + ';">' + Math.round(a.valor).toLocaleString("pt-BR") + ' °C</b> ' +
                       '(' + rotulo + ': ' + Math.round(a.limite).toLocaleString("pt-BR") + ' °C)</span>' +
                   '</div>';
        }).join("");

        modalEl.innerHTML =
            '<div class="tl-emergencia-card">' +
                '<div class="tl-emergencia-head"><i class="fa-solid fa-radiation"></i><span>ALERTA CRÍTICO DE TEMPERATURA</span></div>' +
                '<div class="tl-emergencia-lista">' + itens + '</div>' +
                '<div class="tl-emergencia-foot">' +
                    '<button type="button" class="btn-silenciar">' +
                        '<i class="fa-solid fa-bell-slash"></i><span>Silenciar som e vibração</span>' +
                    '</button>' +
                    '<button type="button" class="btn-fechar-alerta">' +
                        '<i class="fa-solid fa-xmark"></i><span>Fechar alerta e usar o aplicativo</span>' +
                    '</button>' +
                    '<p class="tl-emerg-dica">Fecha apenas este aviso — a temperatura continua sendo monitorada. Se romper de novo, o alerta reaparece.</p>' +
                '</div>' +
            '</div>';

        // Handlers únicos (após recriar o innerHTML)
        const btnSilenciar = modalEl.querySelector(".btn-silenciar");
        if (btnSilenciar) btnSilenciar.addEventListener("click", () => window.ThermoAlertas.silenciar());
        const btnFechar = modalEl.querySelector(".btn-fechar-alerta");
        if (btnFechar) btnFechar.addEventListener("click", () => window.ThermoAlertas.fechar());
    }

    // ------------------------------------------------------------------
    // SINCRONIA DOS ESTÍMULOS COM O ESTADO ATUAL DOS ALARMES
    // ------------------------------------------------------------------
    function sincronizarEstimulos() {
        const ativo = config.geralAtivo && alarmes.size > 0;

        // VISUAL (pisca até normalizar; some se o usuário fechar o alerta)
        if (ativo && config.estimulos.visual && !dispensado) {
            garantirFlash();
            atualizarModalEmergencia();
        } else {
            removerFlash();
            fecharModalEmergencia();
        }

        // SONORO E VIBRAÇÃO (em loop enquanto o problema persistir)
        if (ativo && config.estimulos.sonoro && !silenciado && !dispensado) iniciarLoopSonoro();
        else pararLoopSonoro();

        if (ativo && config.estimulos.vibracao && !silenciado && !dispensado) iniciarLoopVibracao();
        else pararLoopVibracao();

        // Tudo normalizou → limpa os estados de silêncio/fechamento
        if (!ativo) { silenciado = false; dispensado = false; }
    }

    function pararTudo() {
        alarmes.clear();
        silenciado = false;
        dispensado = false;
        pararLoopSonoro();
        pararLoopVibracao();
        removerFlash();
        fecharModalEmergencia();
    }

    // ------------------------------------------------------------------
    // VERIFICAÇÃO EM TEMPO REAL (chamada pelo app.js a cada 8 segundos)
    // Compara canal_1 e canal_2 com os limites salvos no localStorage.
    // ------------------------------------------------------------------
    function verificarLeituras() {
        popularSeletor(false);

        if (!config.geralAtivo) return;

        let leituras = null;
        try { leituras = (typeof state !== "undefined") ? state.readings : null; } catch { /* ignore */ }

        const violacoes = new Map();

        Object.keys(config.fornos).forEach(chave => {
            const mod = Number(chave);
            const cfg = config.fornos[chave] || {};
            const limMax = num(cfg.limiteMax);
            const limMin = num(cfg.limiteMin);
            if (limMax === null && limMin === null) return;

            // Sem leitura não gera alerta aqui (equipamento offline é tratado pelo Push)
            const r = leituras ? leituras.get(mod) : null;
            if (!r) return;

            [["canal_1", 1], ["canal_2", 2]].forEach(([campo, canal]) => {
                const valor = num(r[campo]);
                if (valor === null) return;
                if (limMax !== null && valor > limMax) {
                    violacoes.set(mod + "|" + canal + "|max", { mod, canal, tipo: "max", valor, limite: limMax });
                }
                if (limMin !== null && valor < limMin) {
                    violacoes.set(mod + "|" + canal + "|min", { mod, canal, tipo: "min", valor, limite: limMin });
                }
            });
        });

        // Transições: novo alerta dispara estímulos; normalização encerra tudo
        let iniciouNovo = false;
        violacoes.forEach((info, chave) => {
            if (!alarmes.has(chave)) { alarmes.set(chave, info); iniciouNovo = true; }
        });
        Array.from(alarmes.keys()).forEach(chave => {
            if (!violacoes.has(chave)) alarmes.delete(chave);
        });

        if (iniciouNovo) {
            silenciado = false;
            dispensado = false; // nova violação reabre o aviso, mesmo se antes foi fechado
            if (config.estimulos.vibracao) vibrarAgora(); // pulso imediato
        }

        sincronizarEstimulos();
    }

    // ------------------------------------------------------------------
    // UI: INTERRUPTOR GERAL + PAINEL RETRÁTIL + AUTO-SAVE
    // ------------------------------------------------------------------
    function alternarGeral(ativo) {
        config.geralAtivo = Boolean(ativo);
        salvarConfig();
        const painel = $id("painelAlertas");
        if (painel) painel.classList.toggle("hidden", !config.geralAtivo);
        if (!config.geralAtivo) pararTudo();
        feedbackSalvo();
    }

    function resolverAlvos() {
        if (selecaoAtual === "todos") return getOvens().map(o => String(Number(o.numero)));
        return selecaoAtual ? [selecaoAtual] : [];
    }

    function preencherCampos() {
        const inpMax = $id("inpLimiteMax");
        const inpMin = $id("inpLimiteMin");
        if (!inpMax || !inpMin) return;

        const alvos = resolverAlvos();
        if (!alvos.length) { inpMax.value = ""; inpMin.value = ""; return; }

        const primeiro = config.fornos[alvos[0]] || {};
        const todosIguais = alvos.every(m => {
            const c = config.fornos[m] || {};
            return num(c.limiteMax) === num(primeiro.limiteMax) && num(c.limiteMin) === num(primeiro.limiteMin);
        });

        inpMax.value = todosIguais && primeiro.limiteMax != null ? primeiro.limiteMax : "";
        inpMin.value = todosIguais && primeiro.limiteMin != null ? primeiro.limiteMin : "";
    }

    function selecionarForno(valor) {
        selecaoAtual = valor || "";
        preencherCampos();
    }

    function salvarLimites() {
        const inpMax = $id("inpLimiteMax");
        const inpMin = $id("inpLimiteMin");
        if (!inpMax || !inpMin) return;

        const mx = inpMax.value.trim() === "" ? null : Number(inpMax.value);
        const mn = inpMin.value.trim() === "" ? null : Number(inpMin.value);
        if (mx !== null && (!Number.isFinite(mx) || mx < 0 || mx > 2000)) return;
        if (mn !== null && (!Number.isFinite(mn) || mn < 0 || mn > 2000)) return;

        resolverAlvos().forEach(m => {
            config.fornos[m] = config.fornos[m] || {};
            config.fornos[m].limiteMax = mx;
            config.fornos[m].limiteMin = mn;
        });
        salvarConfig();
        feedbackSalvo();
    }

    function salvarEstimulos() {
        config.estimulos = {
            visual: Boolean($id("chkEstVisual") && $id("chkEstVisual").checked),
            sonoro: Boolean($id("chkEstSonoro") && $id("chkEstSonoro").checked),
            vibracao: Boolean($id("chkEstVibracao") && $id("chkEstVibracao").checked)
        };
        salvarConfig();
        feedbackSalvo();
        sincronizarEstimulos(); // aplica na hora (ex.: desligou o sonoro, para o loop)
    }

    let fbTimer = null;
    function feedbackSalvo() {
        const el = $id("alertasSalvoFeedback");
        if (!el) return;
        el.classList.add("visivel");
        clearTimeout(fbTimer);
        fbTimer = setTimeout(() => el.classList.remove("visivel"), 1500);
    }

    function popularSeletor(forcar) {
        const sel = $id("selFornoAlerta");
        if (!sel) return;

        const fornos = getOvens();
        if (!fornos.length) return;
        if (!forcar && fornos.length === ultimoTotalOpcoes) return;
        ultimoTotalOpcoes = fornos.length;

        const anterior = selecaoAtual;
        sel.innerHTML =
            '<option value="todos">Todos os fornos</option>' +
            fornos.map(o => {
                const m = Number(o.numero);
                return '<option value="' + m + '">' + escapeHtml(o.nome || nomeForno(m)) + '</option>';
            }).join("");

        const opcoes = Array.from(sel.options).map(op => op.value);
        selecaoAtual = opcoes.includes(String(anterior)) ? String(anterior) : String(Number(fornos[0].numero));
        sel.value = selecaoAtual;
        preencherCampos();
    }

    // ------------------------------------------------------------------
    // INICIALIZAÇÃO
    // ------------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        const chk = $id("chkAlertasGeral");
        if (chk) chk.checked = Boolean(config.geralAtivo);

        const painel = $id("painelAlertas");
        if (painel) painel.classList.toggle("hidden", !config.geralAtivo);

        const ev = $id("chkEstVisual"), es = $id("chkEstSonoro"), eb = $id("chkEstVibracao");
        if (ev) ev.checked = Boolean(config.estimulos.visual);
        if (es) es.checked = Boolean(config.estimulos.sonoro);
        if (eb) eb.checked = Boolean(config.estimulos.vibracao);

        popularSeletor(true);
    });

    // API pública (usada pelo HTML e pelo hook no app.js)
    window.ThermoAlertas = {
        alternarGeral,
        selecionarForno,
        salvarLimites,
        salvarEstimulos,
        verificarLeituras,
        silenciar: () => { silenciado = true; sincronizarEstimulos(); },
        fechar: () => { dispensado = true; sincronizarEstimulos(); }
    };
})();
