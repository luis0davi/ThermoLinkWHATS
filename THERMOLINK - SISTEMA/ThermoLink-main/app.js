// ==========================================================================
// THERMOLINK MOBILE - CONTROLE DE ACESSO & TELEMETRIA TÉRMICA
// ==========================================================================

const SUPABASE_URL = "https://zawnluboujbovpgrgdcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gJiVQXVjiuSPY3vHt2f8OA_CiES-4Ak";

// Supabase Client
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DEFAULT_USERS = [
    { username: "admin", password: "thermolink2026", name: "Administrador ThermoLink", role: "admin" },
    { username: "ceramica", password: "forno2026", name: "Cerâmica São José", role: "client", ceramicaId: "cli_1" },
    { username: "santarita", password: "cer8492", name: "Cerâmica Santa Rita", role: "client", ceramicaId: "cli_2" },
    { username: "paulista", password: "cer3910", name: "Cerâmica Paulista", role: "client", ceramicaId: "cli_3" },
    { username: "demo", password: "123456", name: "Cerâmica Modelo Demo", role: "client", ceramicaId: "cli_demo" }
];

function getRegisteredUsers() {
    const saved = localStorage.getItem("thermolink_users");
    if (!saved) {
        localStorage.setItem("thermolink_users", JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
    }
    try {
        return JSON.parse(saved);
    } catch {
        return DEFAULT_USERS;
    }
}

// ==========================================================================
// ESTADO GLOBAL DO APLICATIVO
// ==========================================================================
const state = {
    currentUser: null,
    activeTab: "fornos",
    activeSubTab: "tempoReal",
    selectedModule: null,
    analysisModule: null,
    analysisTimeRange: "all", // 'all', 6, 24, 48, 72
    analysisSampleSize: 1000, // 100, 250, 500, 1000
    analysisTableRowLimit: 25, // 25, 50, 100, 'all'
    ovens: [],
    readings: new Map(),
    mainChart: null,
    analysisChart: null,
    landscapeChart: null,
    isLandscapeOpen: false,
    landscapeChannelFilter: "all",
    miniCharts: new Map(),
    chartChannelFilter: "all",
    analysisChannelFilter: "all",
    currentDetailHistory: [],
    currentAnalysisRawHistory: [],
    currentAnalysisFilteredHistory: [],
    isPolling: false
};

const $ = (id) => document.getElementById(id);

// ==========================================================================
// 1. FLUXO DE LOGIN & SESSÃO DO CLIENTE
// ==========================================================================

function verificarSessaoSalva() {
    const session = localStorage.getItem("thermolink_active_session");
    if (!session) return null;
    try {
        const dados = JSON.parse(session);
        if (!dados || !dados.username) throw new Error("Sessão inválida");
        // Migração de segurança: sessões antigas podiam conter a senha — remove
        if (dados.password !== undefined) {
            delete dados.password;
            localStorage.setItem("thermolink_active_session", JSON.stringify(dados));
        }
        return dados;
    } catch {
        localStorage.removeItem("thermolink_active_session");
        return null;
    }
}

function preencherLogin(user, pass) {
    $("loginUser").value = user;
    $("loginPassword").value = pass;
    $("loginError").classList.add("hidden");
}

function toggleSenha(inputId) {
    const input = $(inputId);
    const icon = $("toggleIcon");
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa-regular fa-eye-slash";
    } else {
        input.type = "password";
        icon.className = "fa-regular fa-eye";
    }
}

// ==========================================================================
// MONITORAMENTO & TELEMETRIA DE ACESSO DO USUÁRIO
// ==========================================================================
const AccessTelemetry = {
    heartbeatTimer: null,
    currentSessionToken: null,

    detectarDispositivo() {
        const ua = navigator.userAgent || "";
        const isTouch = navigator.maxTouchPoints > 0;
        const width = window.screen?.width || window.innerWidth;

        if (/iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
            return "Tablet (iPad)";
        }
        if (/Tablet|Android/i.test(ua) && !/Mobile/i.test(ua)) {
            return "Tablet";
        }
        if (/iPhone/i.test(ua)) {
            return "Smartphone (iPhone)";
        }
        if (/Android/i.test(ua) && /Mobile/i.test(ua)) {
            return "Smartphone (Android)";
        }
        if (/Mobile|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (isTouch && width <= 768)) {
            return "Dispositivo Móvel";
        }
        if (width <= 1024 && isTouch) {
            return "Tablet / Touch";
        }
        return "Computador / Desktop";
    },

    detectarNavegador() {
        const ua = navigator.userAgent || "";
        let browser = "Navegador Web";
        let version = "";

        if (/Edg\/([0-9\.]+)/i.test(ua)) {
            browser = "Microsoft Edge";
            version = RegExp.$1.split(".")[0];
        } else if (/OPR\/([0-9\.]+)/i.test(ua) || /Opera/i.test(ua)) {
            browser = "Opera";
            version = RegExp.$1.split(".")[0];
        } else if (/SamsungBrowser\/([0-9\.]+)/i.test(ua)) {
            browser = "Samsung Internet";
            version = RegExp.$1.split(".")[0];
        } else if (/Chrome\/([0-9\.]+)/i.test(ua)) {
            browser = "Google Chrome";
            version = RegExp.$1.split(".")[0];
        } else if (/Version\/([0-9\.]+).*Safari/i.test(ua)) {
            browser = "Safari";
            version = RegExp.$1.split(".")[0];
        } else if (/Firefox\/([0-9\.]+)/i.test(ua)) {
            browser = "Mozilla Firefox";
            version = RegExp.$1.split(".")[0];
        }
        return version ? `${browser} ${version}` : browser;
    },

    detectarSO() {
        const ua = navigator.userAgent || "";
        if (/Windows NT 10.0|Windows NT 11.0/i.test(ua)) return "Windows 10/11";
        if (/Windows NT 6.3/i.test(ua)) return "Windows 8.1";
        if (/Windows NT 6.1/i.test(ua)) return "Windows 7";
        if (/Windows/i.test(ua)) return "Windows";
        if (/Android/i.test(ua)) {
            const m = ua.match(/Android\s([0-9\.]+)/i);
            return m ? `Android ${m[1].split(".")[0]}` : "Android";
        }
        if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
            return "iOS / iPadOS";
        }
        if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
        if (/Linux/i.test(ua)) return "Linux";
        return "Outro SO";
    },

    async obterIpAcesso() {
        const cached = sessionStorage.getItem("thermolink_cached_ip");
        if (cached && cached !== "Não identificado") return cached;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const resp = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.ip) {
                    sessionStorage.setItem("thermolink_cached_ip", data.ip);
                    return data.ip;
                }
            }
        } catch (e) {
            try {
                const controller2 = new AbortController();
                const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
                const resp2 = await fetch("https://ipapi.co/json/", { signal: controller2.signal });
                clearTimeout(timeoutId2);
                if (resp2.ok) {
                    const data2 = await resp2.json();
                    if (data2 && data2.ip) {
                        sessionStorage.setItem("thermolink_cached_ip", data2.ip);
                        return data2.ip;
                    }
                }
            } catch (e2) {}
        }
        return "Não identificado";
    },

    async registrarAcesso(user, isNovoLogin = false) {
        if (!user || !user.username) return;
        if (user.isImpersonateMode) return;

        let token = sessionStorage.getItem("thermolink_session_token");
        if (!token || isNovoLogin) {
            token = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem("thermolink_session_token", token);
        }
        this.currentSessionToken = token;

        const dev = this.detectarDispositivo();
        const nav = this.detectarNavegador();
        const so = this.detectarSO();
        const ip = await this.obterIpAcesso();
        const agoraIso = new Date().toISOString();

        // Incrementa contagem de acessos
        let totalAcessos = 1;
        const accessMap = JSON.parse(localStorage.getItem("thermolink_user_access_count") || "{}");
        const uKey = user.username.toLowerCase();
        accessMap[uKey] = (accessMap[uKey] || 0) + 1;
        totalAcessos = accessMap[uKey];
        localStorage.setItem("thermolink_user_access_count", JSON.stringify(accessMap));

        // Registro local para auditoria instantânea / fallback
        const localAudit = JSON.parse(localStorage.getItem("thermolink_audit_logs") || "[]");
        localAudit.unshift({
            session_token: token,
            usuario: user.username,
            nome: user.name || user.username,
            ceramica_id: user.ceramicaId || null,
            role: user.role || "client",
            login_em: agoraIso,
            ultimo_acesso: agoraIso,
            quantidade_acessos: totalAcessos,
            dispositivo: dev,
            navegador: nav,
            sistema_operacional: so,
            ip_acesso: ip,
            user_agent: navigator.userAgent
        });
        if (localAudit.length > 200) localAudit.length = 200;
        localStorage.setItem("thermolink_audit_logs", JSON.stringify(localAudit));

        // Sincronização com o Supabase
        try {
            const { data: sessaoExistente } = await sb
                .from("acessos_usuarios")
                .select("id, quantidade_acessos")
                .eq("session_token", token)
                .maybeSingle();

            if (sessaoExistente) {
                await sb
                    .from("acessos_usuarios")
                    .update({
                        ultimo_acesso: agoraIso,
                        ip_acesso: ip !== "Não identificado" ? ip : undefined
                    })
                    .eq("id", sessaoExistente.id);
            } else {
                await sb
                    .from("acessos_usuarios")
                    .insert([{
                        session_token: token,
                        usuario: user.username,
                        nome: user.name || user.username,
                        ceramica_id: user.ceramicaId || null,
                        role: user.role || "client",
                        login_em: agoraIso,
                        ultimo_acesso: agoraIso,
                        quantidade_acessos: totalAcessos,
                        dispositivo: dev,
                        navegador: nav,
                        sistema_operacional: so,
                        ip_acesso: ip,
                        user_agent: navigator.userAgent
                    }]);
            }

            if (user.ceramicaId) {
                await sb
                    .from("ceramicas")
                    .update({
                        ultimo_acesso: agoraIso,
                        total_acessos: totalAcessos
                    })
                    .eq("id", user.ceramicaId);
            }
        } catch (err) {
            console.warn("[AccessTelemetry] Sincronização offline/cache:", err);
        }

        this.iniciarHeartbeat(user, token);
    },

    iniciarHeartbeat(user, token) {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

        this.heartbeatTimer = setInterval(async () => {
            if (!state.currentUser || document.visibilityState === "hidden") return;

            const agora = new Date().toISOString();
            try {
                if (token) {
                    await sb
                        .from("acessos_usuarios")
                        .update({ ultimo_acesso: agora })
                        .eq("session_token", token);
                }

                if (user.ceramicaId) {
                    await sb
                        .from("ceramicas")
                        .update({ ultimo_acesso: agora })
                        .eq("id", user.ceramicaId);
                }
            } catch (e) {}
        }, 90000);
    },

    encerrarSessao() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        const token = sessionStorage.getItem("thermolink_session_token");
        if (token) {
            try {
                sb.from("acessos_usuarios")
                    .update({ ultimo_acesso: new Date().toISOString() })
                    .eq("session_token", token)
                    .then(() => {});
            } catch (e) {}
        }
        sessionStorage.removeItem("thermolink_session_token");
        sessionStorage.removeItem("thermolink_session_recorded");
        this.currentSessionToken = null;
    }
};

async function realizarLogin(e) {
    e.preventDefault();
    const userVal = $("loginUser").value.trim().toLowerCase();
    const passVal = $("loginPassword").value.trim();

    // 1. Usuários locais/pré-definidos
    const users = getRegisteredUsers();
    let found = users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);

    // 2. Se não encontrou, busca diretamente no Supabase na tabela 'ceramicas'
    if (!found) {
        try {
            const { data: ceramicaData } = await sb
                .from("ceramicas")
                .select("id, nome, username, status, motivo_bloqueio")
                .ilike("username", userVal)
                .eq("senha", passVal)
                .maybeSingle();

            if (ceramicaData) {
                found = {
                    username: ceramicaData.username,
                    name: ceramicaData.nome,
                    role: "client",
                    status: ceramicaData.status || "Ativo",
                    motivoBloqueio: ceramicaData.motivo_bloqueio || null,
                    ceramicaId: ceramicaData.id
                };
            }
        } catch (err) {
            console.warn("[Login] Erro ao consultar ceramicas no Supabase:", err);
        }
    }

    if (found) {
        if (found.role === "client") {
            try {
                let query = sb.from("ceramicas").select("id, nome, status, motivo_bloqueio");
                if (found.ceramicaId && !String(found.ceramicaId).startsWith("cli_")) {
                    query = query.eq("id", found.ceramicaId);
                } else {
                    query = query.ilike("username", found.username);
                }
                const { data: cData } = await query.maybeSingle();
                if (cData) {
                    if (!found.ceramicaId) found.ceramicaId = cData.id;
                    if (cData.nome) found.name = cData.nome;
                    if (cData.status) found.status = cData.status;
                    if (cData.motivo_bloqueio) found.motivoBloqueio = cData.motivo_bloqueio;
                }
            } catch (e) {}

            const localClients = JSON.parse(localStorage.getItem("thermolink_clients_admin") || "[]");
            const matched = localClients.find(c => 
                (found.ceramicaId && c.id === found.ceramicaId) || 
                (c.username && c.username.toLowerCase() === found.username?.toLowerCase())
            );
            if (matched) {
                if (!found.ceramicaId) found.ceramicaId = matched.id;
                if (!found.name || found.name === found.username) found.name = matched.nome;
                if (matched.status) found.status = matched.status;
                if (matched.motivoBloqueio) found.motivoBloqueio = matched.motivoBloqueio;
            }

            const motivosMap = JSON.parse(localStorage.getItem("thermolink_motivos_bloqueio") || "{}");
            if (found.ceramicaId && motivosMap[found.ceramicaId]) {
                found.motivoBloqueio = motivosMap[found.ceramicaId];
            } else if (found.username && motivosMap[found.username.toLowerCase()]) {
                found.motivoBloqueio = motivosMap[found.username.toLowerCase()];
            }

            if (!found.ceramicaId && found.username === "ceramica") {
                found.ceramicaId = "cli_1";
            }
        }

        $("loginError").classList.add("hidden");

        const sessao = {
            username: found.username,
            name: found.name,
            role: found.role,
            status: found.status || "Ativo",
            motivoBloqueio: found.motivoBloqueio || null,
            ceramicaId: found.ceramicaId || null,
            loginAt: new Date().toISOString()
        };

        if ($("rememberMe").checked) {
            localStorage.setItem("thermolink_active_session", JSON.stringify(sessao));
        }

        iniciarPainelUsuario(sessao, false);
        AccessTelemetry.registrarAcesso(sessao, true);
    } else {
        $("loginError").textContent = "Usuário ou senha incorretos.";
        $("loginError").classList.remove("hidden");
    }
}

function iniciarPainelUsuario(user, usarSplash = false) {
    state.currentUser = user;

    // Registra sessão ativa e telemetria de acesso
    if (sessionStorage.getItem("thermolink_session_recorded") !== user.username) {
        sessionStorage.setItem("thermolink_session_recorded", user.username);
        AccessTelemetry.registrarAcesso(user, false);
    }

    // Sincroniza status de bloqueio e motivo mais recente
    if (user.role !== "admin" && !user.isImpersonateMode) {
        const clientsAdmin = JSON.parse(localStorage.getItem("thermolink_clients_admin") || "[]");
        const clientRecord = clientsAdmin.find(c => 
            (user.ceramicaId && c.id === user.ceramicaId) || 
            (c.username && c.username.toLowerCase() === user.username?.toLowerCase())
        );
        if (clientRecord) {
            if (clientRecord.status) user.status = clientRecord.status;
            if (clientRecord.motivoBloqueio) user.motivoBloqueio = clientRecord.motivoBloqueio;
        }

        const motivosMap = JSON.parse(localStorage.getItem("thermolink_motivos_bloqueio") || "{}");
        if (user.ceramicaId && motivosMap[user.ceramicaId]) {
            user.motivoBloqueio = motivosMap[user.ceramicaId];
        } else if (user.username && motivosMap[user.username.toLowerCase()]) {
            user.motivoBloqueio = motivosMap[user.username.toLowerCase()];
        }
    }

    $("loginScreen").classList.add("hidden");

    const abrirApp = () => {
        $("splashScreen").classList.add("hidden");
        $("mainApp").classList.remove("hidden");

        voltarListaFornos();

        if (user.role !== "admin" && !user.isImpersonateMode && user.status === "Bloqueado") {
            const overlay = $("clientBlockedOverlay");
            if (overlay) {
                if ($("clientBlockedCeramicaNome")) {
                    $("clientBlockedCeramicaNome").textContent = user.name || user.username || "Cerâmica Cliente";
                }
                if ($("clientBlockedReasonText")) {
                    const msg = user.motivoBloqueio || "Acesso temporariamente suspenso pela administração do sistema. Entre em contato com o suporte da ThermoLink para regularização.";
                    $("clientBlockedReasonText").textContent = msg;
                }
                overlay.classList.remove("hidden");
            }
            limparPainelBloqueado();
            return;
        } else {
            $("clientBlockedOverlay")?.classList.add("hidden");
            carregarFornosELeituras();
        }
    };

    if (usarSplash) {
        $("splashScreen").classList.remove("hidden");
        $("splashScreen").classList.remove("splash-out");
        setTimeout(() => {
            $("splashScreen").classList.add("splash-out");
            setTimeout(abrirApp, 500);
        }, 2500);
    } else {
        abrirApp();
    }

    const impBanner = $("impersonateBanner");
    if (impBanner) {
        if (user.isImpersonateMode) {
            $("impClientName").textContent = user.name || user.username;
            impBanner.classList.remove("hidden");
        } else {
            impBanner.classList.add("hidden");
        }
    }

    $("currentUserDisplay").textContent = user.name || user.username;
    $("profileName").textContent = user.name || user.username;
    $("profileRole").textContent = user.role === "admin" ? "Administrador Master" : "Acesso Cliente Cerâmica";

    // Hook: sincroniza o painel de notificações push com o usuário autenticado
    if (window.ThermoPush) window.ThermoPush.onAuthChanged();
}

function limparPainelBloqueado() {
    state.readings = new Map();
    const grid = $("ovensGrid");
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: rgba(15, 23, 42, 0.6); border: 1px dashed rgba(244, 63, 94, 0.3); border-radius: 16px; color: #94a3b8;">
                <i class="fa-solid fa-lock" style="font-size: 32px; color: #f43f5e; margin-bottom: 12px; display: block;"></i>
                <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 6px;">Visualização de Telemetria Oculta</h3>
                <p style="font-size: 13px; max-width: 420px; margin: 0 auto; line-height: 1.5;">O acesso em tempo real aos módulos e canais térmicos está suspenso temporariamente pela administração.</p>
            </div>
        `;
    }
}

async function verificarDesbloqueio() {
    const btn = $("btnVerificarDesbloqueio");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Verificando regularização...</span>`;
    }

    try {
        let isLiberado = false;
        const cid = state.currentUser?.ceramicaId;
        const username = state.currentUser?.username;

        // 1. Consulta no Supabase
        if (cid || username) {
            try {
                let query = sb.from("ceramicas").select("status, motivo_bloqueio");
                if (cid && !String(cid).startsWith("cli_")) {
                    query = query.eq("id", cid);
                } else if (username) {
                    query = query.ilike("username", username);
                }
                const { data, error } = await query.maybeSingle();
                if (!error && data) {
                    if (data.status === "Ativo") {
                        isLiberado = true;
                    } else if (data.motivo_bloqueio) {
                        state.currentUser.motivoBloqueio = data.motivo_bloqueio;
                        if ($("clientBlockedReasonText")) {
                            $("clientBlockedReasonText").textContent = data.motivo_bloqueio;
                        }
                    }
                }
            } catch (e) {
                console.warn("[ThermoLink] Erro ao verificar status no Supabase:", e);
            }
        }

        // 2. Consulta no armazenamento local do Master Admin
        if (!isLiberado) {
            const localClients = JSON.parse(localStorage.getItem("thermolink_clients_admin") || "[]");
            const matched = localClients.find(c => 
                (cid && c.id === cid) || 
                (username && c.username?.toLowerCase() === username?.toLowerCase())
            );
            if (matched && matched.status === "Ativo") {
                isLiberado = true;
            }
        }

        if (isLiberado) {
            if (state.currentUser) {
                state.currentUser.status = "Ativo";
                state.currentUser.motivoBloqueio = null;
                const saved = localStorage.getItem("thermolink_active_session");
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        parsed.status = "Ativo";
                        parsed.motivoBloqueio = null;
                        localStorage.setItem("thermolink_active_session", JSON.stringify(parsed));
                    } catch (e) {}
                }
            }
            $("clientBlockedOverlay")?.classList.add("hidden");
            alert("Acesso liberado! Seus fornos e telemetria estão sendo carregados.");
            await carregarFornosELeituras();
        } else {
            alert("Seu acesso ainda consta como suspenso pela administração.\nCaso já tenha efetuado a regularização, aguarde a liberação pelo administrador.");
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span>Verificar Regularização</span>`;
        }
    }
}

function sairModoSuporte() {
    localStorage.removeItem("thermolink_active_session");
    window.location.href = "admin.html";
}

function realizarLogout() {
    AccessTelemetry.encerrarSessao();
    localStorage.removeItem("thermolink_active_session");
    state.currentUser = null;
    $("mainApp").classList.add("hidden");
    $("splashScreen").classList.add("hidden");
    $("clientBlockedOverlay").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
    $("loginUser").value = "";
    $("loginPassword").value = "";

    // Hook: atualiza o painel de notificações push após sair da conta
    if (window.ThermoPush) window.ThermoPush.onAuthChanged();
}

// ==========================================================================
// 2. CONSULTAS AO BANCO SUPABASE (ISOLAMENTO MULTI-TENANT POR CERÂMICA)
// ==========================================================================

async function carregarFornosELeituras() {
    if (state.currentUser && state.currentUser.status === "Bloqueado") {
        return;
    }
    if (state.isPolling) return;
    state.isPolling = true;

    try {
        let clientDevices = [];
        let allowedSerials = [];
        let allowedDeviceIds = [];

        // 1. IDENTIFICAÇÃO DOS APARELHOS VINCULADOS AO CLIENTE LOGADO
        if (state.currentUser && state.currentUser.role !== "admin") {
            const cid = state.currentUser.ceramicaId;

            // Busca no Supabase apenas os dispositivos vinculados a esta cerâmica
            try {
                const { data: devs, error: errDevs } = await sb
                    .from("dispositivos")
                    .select("id, serial, numero_serie, modelo, modulo_num, forno_id, status, ceramica_id")
                    .eq("ceramica_id", cid)
                    .eq("status", "Vinculado");

                if (!errDevs && devs && devs.length > 0) {
                    clientDevices = devs;
                }
            } catch (errDev) {
                console.warn("[ThermoLink] Falha ao consultar dispositivos no Supabase:", errDev);
            }

            // Fallback no localStorage
            if (!clientDevices.length) {
                const localDevs = JSON.parse(localStorage.getItem("thermolink_devices_admin") || "[]");
                clientDevices = localDevs.filter(d => (d.ceramicaId === cid || d.ceramica_id === cid) && d.status === "Vinculado");
            }

            allowedSerials = clientDevices.map(d => d.serial || d.numero_serie).filter(Boolean);
            allowedDeviceIds = clientDevices.map(d => Number(d.id)).filter(n => !isNaN(n) && n > 0);

            state.allowedSerials = allowedSerials;
            state.allowedDeviceIds = allowedDeviceIds;
            state.clientDevices = clientDevices;

            // SE A CERÂMICA NÃO POSSUI DISPOSITIVO VINCULADO:
            // Não carrega dados de outros aparelhos nem exibe fornos de terceiros!
            if (clientDevices.length === 0) {
                state.ovens = [];
                state.readings = new Map();
                updateLivePill(false);
                renderListaFornos();
                return;
            }
        }

        // 2. CARREGA APENAS AS LEITURAS DESTE(S) APARELHO(S) VINCULADO(S)
        let leiturasQuery = sb
            .from("leituras")
            .select("id, dispositivo_id, forno_id, modulo_alutal, canal_1, canal_2, numero_serie, ceramica_id, created_at, data_hora");

        if (state.currentUser && state.currentUser.role !== "admin") {
            const devFilters = [];
            if (allowedSerials.length > 0) {
                devFilters.push(`numero_serie.in.(${allowedSerials.join(',')})`);
            }
            if (allowedDeviceIds.length > 0) {
                devFilters.push(`dispositivo_id.in.(${allowedDeviceIds.join(',')})`);
            }

            // Puxa ESTRITAMENTE as leituras geradas pelo dispositivo vinculado (ex: THX-00002)
            if (devFilters.length > 0) {
                leiturasQuery = leiturasQuery.or(devFilters.join(','));
            } else {
                state.ovens = [];
                state.readings = new Map();
                updateLivePill(true);
                renderListaFornos();
                return;
            }
        }

        const { data: rawLeiturasData, error } = await leiturasQuery
            .order("created_at", { ascending: false })
            .limit(1000);

        if (error) {
            console.error("[ThermoLink] Erro nas leituras:", error);
            updateLivePill(false);
            return;
        }

        // Filtro estrito em memória: garante que apenas leituras do hardware vinculado entrem
        const leiturasData = (rawLeiturasData || []).filter(r => {
            if (state.currentUser && state.currentUser.role !== "admin") {
                const sOk = r.numero_serie && allowedSerials.includes(r.numero_serie);
                const idOk = r.dispositivo_id && allowedDeviceIds.includes(Number(r.dispositivo_id));
                return sOk || idOk;
            }
            return true;
        });

        updateLivePill(true);

        // 3. MAPEIA AS LEITURAS RECENTES (MÓDULO = FORNO!)
        const latestMap = new Map();
        const detectedModules = new Set();

        for (const r of leiturasData || []) {
            const mod = Number(r.modulo_alutal || r.forno_id || 1);
            if (Number.isFinite(mod)) {
                detectedModules.add(mod);
                if (!latestMap.has(mod)) {
                    latestMap.set(mod, r);
                }
            }
        }

        state.readings = latestMap;

        // 4. CONSTRÓI A LISTA DE FORNOS PARA O CLIENTE
        if (state.currentUser && state.currentUser.role !== "admin") {
            const primaryDev = clientDevices[0];
            const serialLabel = primaryDev ? (primaryDev.serial || primaryDev.numero_serie) : "THX";

            // Se o ESP enviou leituras de módulos, usamos os módulos ativos
            let mods = Array.from(detectedModules).sort((a, b) => a - b);
            if (mods.length === 0) {
                // Caso o aparelho esteja recém-vinculado sem envio ainda, exibe o forno configurado no aparelho
                const configuredMods = clientDevices
                    .map(d => Number(d.modulo_num || d.forno_id || 1))
                    .filter(n => Number.isFinite(n) && n > 0);
                mods = configuredMods.length > 0 ? Array.from(new Set(configuredMods)).sort((a, b) => a - b) : [1];
            }

            state.ovens = mods.map(m => {
                const devMatched = clientDevices.find(d => Number(d.modulo_num || d.forno_id) === Number(m)) || primaryDev;
                return {
                    id: m,
                    numero: m,
                    nome: `Forno ${String(m).padStart(2, '0')}`,
                    dispositivo_serial: devMatched ? (devMatched.serial || devMatched.numero_serie) : serialLabel,
                    modelo: devMatched?.modelo || primaryDev?.modelo || "TLK-ESP8266-ALUTAL",
                    ativo: true
                };
            });
        } else {
            // Modo Master Admin: exibe os módulos detectados ou de 1 a 31
            const allMods = detectedModules.size > 0
                ? Array.from(detectedModules).sort((a, b) => a - b)
                : Array.from({ length: 31 }, (_, i) => i + 1);

            state.ovens = allMods.map(m => ({
                id: m,
                numero: m,
                nome: `Forno ${String(m).padStart(2, '0')}`,
                ativo: true
            }));
        }

        // Hook: motor de alertas em tempo real
        if (window.ThermoAlertas) window.ThermoAlertas.verificarLeituras();

        // Renderiza telas
        if (state.selectedModule === null) {
            renderListaFornos();
        } else {
            if (state.analysisModule) atualizarFaixaResumoAnalise(state.analysisModule);
            // IMPORTANTE: NÃO chamamos carregarDadosAnalise() em segundo plano!
            // Isso evita que o gráfico sofra refresh periódico e perca o zoom ou a navegação do usuário.
        }
    } catch (err) {
        console.error("[ThermoLink] Falha na sincronização:", err);
        updateLivePill(false);
    } finally {
        state.isPolling = false;
    }
}

async function getHistoricoModulo(modulo, limit = 1000) {
    try {
        let q = sb
            .from("leituras")
            .select("canal_1, canal_2, modulo_alutal, created_at, data_hora, numero_serie, dispositivo_id, ceramica_id")
            .eq("modulo_alutal", modulo);

        if (state.currentUser && state.currentUser.role !== "admin") {
            const devFilters = [];
            if (state.allowedSerials && state.allowedSerials.length > 0) {
                devFilters.push(`numero_serie.in.(${state.allowedSerials.join(',')})`);
            }
            if (state.allowedDeviceIds && state.allowedDeviceIds.length > 0) {
                devFilters.push(`dispositivo_id.in.(${state.allowedDeviceIds.join(',')})`);
            }

            if (devFilters.length > 0) {
                q = q.or(devFilters.join(','));
            } else {
                return [];
            }
        }

        const { data, error } = await q
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) return [];

        const filtered = (data || []).filter(r => {
            if (state.currentUser && state.currentUser.role !== "admin") {
                const sOk = r.numero_serie && state.allowedSerials?.includes(r.numero_serie);
                const idOk = r.dispositivo_id && state.allowedDeviceIds?.includes(Number(r.dispositivo_id));
                return sOk || idOk;
            }
            return true;
        });

        return filtered.reverse();
    } catch {
        return [];
    }
}

// ==========================================================================
// 3. TELA INICIAL (LISTAGEM DE FORNOS)
// ==========================================================================

function isFornoOnline(reading) {
    if (!reading || !reading.created_at) return false;
    const date = new Date(reading.created_at);
    if (Number.isNaN(date.getTime())) return false;
    return (Date.now() - date.getTime()) <= 3 * 60 * 1000;
}

function getNomeForno(modulo) {
    const oven = state.ovens.find(o => Number(o.numero) === Number(modulo));
    if (oven && oven.nome) {
        return oven.nome;
    }
    return `Forno ${String(modulo).padStart(2, "0")}`;
}

function renderListaFornos() {
    if (state.selectedModule !== null) return;

    state.miniCharts.forEach(c => c.destroy());
    state.miniCharts.clear();

    const container = $("listaFornos");

    // Se o cliente não tem nenhum aparelho vinculado ainda
    if (!state.ovens || !state.ovens.length) {
        $("statOnlineCount").textContent = "0 Fornos";
        container.innerHTML = `
            <div class="loading-box" style="padding: 40px 20px; text-align: center;">
                <i class="fa-solid fa-microchip" style="font-size: 40px; color: #f97316; margin-bottom: 14px;"></i>
                <h4 style="color: #ffffff; margin-bottom: 6px; font-size: 16px;">Nenhum Aparelho Vinculado</h4>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; max-width: 320px; margin: 0 auto;">
                    Sua cerâmica ainda não possui aparelhos ThermoX (ex: <b>THX-00003</b>) vinculados.<br>
                    Solicite ao administrador a vinculação do seu hardware para visualizar seus fornos.
                </p>
            </div>
        `;
        return;
    }

    // Ordenação estrita sequencial de 1 até N (conforme solicitado pelo cliente)
    const sortedOvens = [...state.ovens].sort((a, b) => Number(a.numero) - Number(b.numero));

    const onlineOvens = sortedOvens.filter(o => isFornoOnline(state.readings.get(Number(o.numero))));
    $("statOnlineCount").textContent = `${onlineOvens.length} de ${sortedOvens.length} ${sortedOvens.length === 1 ? 'Forno' : 'Fornos'}`;

    container.innerHTML = sortedOvens.map(o => {
        const mod = Number(o.numero);
        const r = state.readings.get(mod);
        const online = isFornoOnline(r);
        const c1Val = numVal(r?.canal_1);
        const c2Val = numVal(r?.canal_2);
        const relTime = r ? formatRelativo(r.created_at) : "Sem leituras";
        const horaLeitura = r ? formatHora(r.created_at) : "--:--:--";
        const delta = (c1Val !== null && c2Val !== null) ? Math.abs(c1Val - c2Val) : null;
        const nomeForno = o.nome || `Forno ${String(mod).padStart(2, '0')}`;

        return `
            <article class="kiln-3d-card kiln-card-interactive" onclick="abrirDetalheForno(${mod}, 'grafico')" title="Toque para ver gráficos do ${escapeHtml(nomeForno)}">
                <div class="kiln-top-meta">
                    <div class="kiln-card-title-box">
                        <h3 class="kiln-card-title">${escapeHtml(nomeForno)}</h3>
                        ${o.dispositivo_serial ? `<span class="kiln-card-serial"><i class="fa-solid fa-microchip"></i> ${escapeHtml(o.dispositivo_serial)}</span>` : ''}
                    </div>
                    <span class="status-indicator-badge ${online ? 'is-online' : 'is-standby'}">
                        <span class="pulse-dot"></span>
                        <span class="status-text">${online ? 'ONLINE' : 'STANDBY'}</span>
                    </span>
                </div>

                <!-- IMAGEM DO FORNO 3D COM OVERLAYS DE TEMPERATURA FLUTUANTES -->
                <div class="kiln-3d-visual-container">
                    <img src="nova imagen de um forno.png" alt="${escapeHtml(nomeForno)}" class="kiln-3d-image">
                    
                    <!-- SENSOR SUPERIOR (CANAL 1) -->
                    <div class="sensor-overlay-tag overlay-top">
                        <div class="overlay-tag-header">
                            <span class="sensor-dot c1"></span>
                            <span>CANAL 1 (SUPERIOR)</span>
                        </div>
                        <div class="overlay-tag-temp text-orange">
                            ${c1Val !== null ? Math.round(c1Val) + ' °C' : '-- °C'}
                        </div>
                    </div>

                    <!-- SENSOR INFERIOR (CANAL 2) -->
                    <div class="sensor-overlay-tag overlay-bottom">
                        <div class="overlay-tag-header">
                            <span class="sensor-dot c2"></span>
                            <span>CANAL 2 (INFERIOR)</span>
                        </div>
                        <div class="overlay-tag-temp text-blue">
                            ${c2Val !== null ? Math.round(c2Val) + ' °C' : '-- °C'}
                        </div>
                    </div>
                </div>

                <div class="gauge-footer-meta">
                    <div class="gauge-meta-item">
                        <span>ÚLTIMA LEITURA</span>
                        <strong><i class="fa-regular fa-clock"></i> ${horaLeitura} <small class="meta-reltime">(${relTime})</small></strong>
                    </div>
                    <div class="gauge-meta-item text-right">
                        <span>DIFERENCIAL (ΔT)</span>
                        <strong class="text-orange">${delta !== null ? Math.round(delta) + ' °C' : '-- °C'}</strong>
                    </div>
                </div>

                <div class="kiln-cta-banner">
                    <div class="cta-left">
                        <i class="fa-solid fa-chart-line text-orange"></i>
                        <span>Ver Análise do Forno</span>
                    </div>
                    <i class="fa-solid fa-chevron-right cta-arrow"></i>
                </div>
            </article>
        `;
    }).join("");
}

// ==========================================================================
// 4. ANÁLISE DO FORNO SELECIONADO (ABERTA AO CLICAR NO FORNO)
// ==========================================================================

async function abrirDetalheForno(modulo) {
    const mod = Number(modulo);
    state.selectedModule = mod;
    state.analysisModule = mod;

    $("headerTitle").textContent = getNomeForno(mod);
    $("headerBackBtn").classList.remove("hidden");

    $("screenFornos").classList.add("hidden");
    $("screenConfig").classList.add("hidden");
    $("screenHistoricoQueimas").classList.add("hidden");
    $("screenAnaliseForno").classList.remove("hidden");

    // Mantém aba Fornos ativa no rodapé pois a análise fica dentro do forno
    document.querySelectorAll(".bottom-tab-bar .tab-item").forEach(b => b.classList.remove("active"));
    $("tabNavFornos").classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });

    atualizarFaixaResumoAnalise(mod);
    await carregarDadosAnalise();
}

function voltarListaFornos() {
    state.selectedModule = null;

    $("headerTitle").textContent = "ThermoLink";
    $("headerBackBtn").classList.add("hidden");

    $("screenAnaliseForno").classList.add("hidden");
    $("screenHistoricoQueimas").classList.add("hidden");
    $("screenConfig").classList.add("hidden");
    $("screenFornos").classList.remove("hidden");

    document.querySelectorAll(".bottom-tab-bar .tab-item").forEach(b => b.classList.remove("active"));
    $("tabNavFornos").classList.add("active");
    state.activeTab = "fornos";

    renderListaFornos();
}

function atualizarFaixaResumoAnalise(modulo) {
    const mod = Number(modulo);
    const reading = state.readings.get(mod);
    const online = isFornoOnline(reading);
    const c1 = numVal(reading?.canal_1);
    const c2 = numVal(reading?.canal_2);
    const delta = (c1 !== null && c2 !== null) ? Math.abs(c1 - c2) : null;

    if ($("anLiveTitle")) $("anLiveTitle").textContent = getNomeForno(mod);
    if ($("anLiveStatus")) {
        $("anLiveStatus").className = `status-indicator-badge ${online ? 'is-online' : 'is-standby'}`;
    }
    if ($("anLiveStatusText")) {
        $("anLiveStatusText").textContent = online ? 'ONLINE' : 'STANDBY';
    }
    if ($("anLiveC1")) $("anLiveC1").textContent = c1 !== null ? Math.round(c1) + ' °C' : '-- °C';
    if ($("anLiveC2")) $("anLiveC2").textContent = c2 !== null ? Math.round(c2) + ' °C' : '-- °C';
    if ($("anLiveDelta")) $("anLiveDelta").textContent = delta !== null ? Math.round(delta) + ' °C' : '-- °C';
}

// ==========================================================================
// 5. ABA DE ANÁLISE DETALHADA (EXCLUSIVA DO FORNO ABERTO)
// ==========================================================================

async function carregarDadosAnalise() {
    const mod = state.analysisModule || state.selectedModule;
    if (!mod) return;

    atualizarFaixaResumoAnalise(mod);

    // Carrega leituras históricas do forno selecionado (amostragem máxima de até 1000 leituras)
    const rows = await getHistoricoModulo(mod, 1000);
    state.currentAnalysisRawHistory = rows;

    aplicarFiltrosEAtualizarAnalise();
}

// FILTRO DE PERÍODO / TEMPO (HORAS)
function filtrarTempoAnalise(horas, btn) {
    state.analysisTimeRange = horas;
    document.querySelectorAll("#anTimeFilter .pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    aplicarFiltrosEAtualizarAnalise();
}

// FILTRO DE CANAIS (AMBOS, C1, C2)
function filtrarCanaisAnalise(canal, btn) {
    state.analysisChannelFilter = canal;
    document.querySelectorAll("#anChannelFilter .pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    if (state.currentAnalysisFilteredHistory.length) {
        renderGraficoAnalise(state.currentAnalysisFilteredHistory);
    }
}

// FILTRO DE QUANTIDADE DE LINHAS NA TABELA
function trocarLimiteTabela(limite) {
    state.analysisTableRowLimit = limite === "all" ? "all" : Number(limite);
    renderTabelaAnalise(state.currentAnalysisFilteredHistory);
}

// EXPANDIR / RECOLHER TABELA DE LEITURAS
function toggleTabelaAnalise() {
    const wrapper = $("anTableScrollWrapper");
    const chevron = $("anTableChevron");
    if (!wrapper) return;
    wrapper.classList.toggle("collapsed");
    if (chevron) chevron.classList.toggle("collapsed");
}

function aplicarFiltrosEAtualizarAnalise() {
    let rows = [...state.currentAnalysisRawHistory];

    // Aplica filtro de tempo em horas
    if (state.analysisTimeRange !== "all") {
        const threshold = Date.now() - (Number(state.analysisTimeRange) * 60 * 60 * 1000);
        rows = rows.filter(r => {
            const time = new Date(r.created_at).getTime();
            return time >= threshold;
        });
    }

    state.currentAnalysisFilteredHistory = rows;
    atualizarPainelAnalise(rows);
}

function limparEstatisticasAnalise() {
    if ($("anStatMax")) $("anStatMax").textContent = "-- °C";
    if ($("anStatMin")) $("anStatMin").textContent = "-- °C";
    if ($("anStatAvg")) $("anStatAvg").textContent = "-- °C";
    if ($("anStatCount")) $("anStatCount").textContent = "--";
    if ($("anStatCountPill")) $("anStatCountPill").textContent = "0 leituras";
    if ($("anTableBody")) $("anTableBody").innerHTML = `<tr><td colspan="4" class="table-empty-msg">Nenhum dado disponível.</td></tr>`;
    if (state.analysisChart) {
        state.analysisChart.destroy();
        state.analysisChart = null;
    }
}

function atualizarPainelAnalise(rows) {
    if (!rows.length) {
        limparEstatisticasAnalise();
        return;
    }

    const c1Vals = rows.map(r => numVal(r.canal_1)).filter(v => v !== null);

    if (c1Vals.length) {
        const max = Math.max(...c1Vals);
        const min = Math.min(...c1Vals);
        const avg = c1Vals.reduce((a, b) => a + b, 0) / c1Vals.length;

        if ($("anStatMax")) $("anStatMax").textContent = `${Math.round(max)} °C`;
        if ($("anStatMin")) $("anStatMin").textContent = `${Math.round(min)} °C`;
        if ($("anStatAvg")) $("anStatAvg").textContent = `${Math.round(avg)} °C`;
        if ($("anStatCount")) $("anStatCount").textContent = `${rows.length} pts`;
        if ($("anStatCountPill")) $("anStatCountPill").textContent = `${rows.length} leituras`;
        if ($("anChartSub")) $("anChartSub").textContent = `Curva detalhada de ${rows.length} leituras`;
    }

    renderTabelaAnalise(rows);
    renderGraficoAnalise(rows);
}

function renderTabelaAnalise(rows) {
    const tbody = $("anTableBody");
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty-msg">Nenhum dado no período filtrado.</td></tr>`;
        return;
    }

    // Calcula pico máximo e mínimo do canal 1 (temperatura principal)
    const c1Vals = rows.map(r => numVal(r.canal_1)).filter(v => v !== null);
    const globalMax = c1Vals.length ? Math.max(...c1Vals) : null;
    const globalMin = c1Vals.length ? Math.min(...c1Vals) : null;

    // Índices das primeiras ocorrências de máx e mín
    const idxMax = globalMax !== null ? rows.findIndex(r => numVal(r.canal_1) === globalMax) : -1;
    const idxMin = globalMin !== null ? rows.findIndex(r => numVal(r.canal_1) === globalMin) : -1;

    let exibicao = [...rows].reverse();
    const totalRows = rows.length;

    // Converte índices do array original (não invertido) para o invertido
    const idxMaxInv = idxMax !== -1 ? totalRows - 1 - idxMax : -1;
    const idxMinInv = idxMin !== -1 ? totalRows - 1 - idxMin : -1;

    if (state.analysisTableRowLimit !== "all") {
        exibicao = exibicao.slice(0, state.analysisTableRowLimit);
    }

    tbody.innerHTML = exibicao.map((r, i) => {
        const c1 = numVal(r.canal_1);
        const c2 = numVal(r.canal_2);
        const delta = (c1 !== null && c2 !== null) ? `${Math.round(Math.abs(c1 - c2))} °C` : "--";

        const isMax = (i === idxMaxInv);
        const isMin = (i === idxMinInv);

        const rowClass = isMax ? "row-peak-max" : (isMin ? "row-peak-min" : "");
        const badgeMax = isMax ? `<span class="peak-badge peak-badge-max"><i class="fa-solid fa-arrow-up"></i> MÁX</span>` : "";
        const badgeMin = isMin ? `<span class="peak-badge peak-badge-min"><i class="fa-solid fa-arrow-down"></i> MÍN</span>` : "";

        return `
            <tr class="${rowClass}">
                <td><b>${formatHora(r.created_at)}</b>${badgeMax}${badgeMin}</td>
                <td class="text-orange"><b>${c1 !== null ? Math.round(c1) + " °C" : "--"}</b></td>
                <td class="text-blue"><b>${c2 !== null ? Math.round(c2) + " °C" : "--"}</b></td>
                <td>${delta}</td>
            </tr>
        `;
    }).join("");
}

function renderGraficoAnalise(rows) {
    const canvas = $("analysisChartCanvas");
    if (!canvas || !rows.length) return;

    if (state.analysisChart) {
        state.analysisChart.destroy();
        state.analysisChart = null;
    }

    const labels = rows.map(r => {
        const d = new Date(r.created_at);
        return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    });

    const c1Data = rows.map(r => numVal(r.canal_1));
    const c2Data = rows.map(r => numVal(r.canal_2));

    const ctx = canvas.getContext("2d");

    const gradC1 = ctx.createLinearGradient(0, 0, 0, 280);
    gradC1.addColorStop(0, "rgba(244, 123, 32, 0.40)");
    gradC1.addColorStop(1, "rgba(244, 123, 32, 0.0)");

    const gradC2 = ctx.createLinearGradient(0, 0, 0, 280);
    gradC2.addColorStop(0, "rgba(59, 130, 182, 0.30)");
    gradC2.addColorStop(1, "rgba(59, 130, 182, 0.0)");

    const datasets = [];

    if (state.analysisChannelFilter === "all" || state.analysisChannelFilter === "c1") {
        datasets.push({
            label: "Canal 1 (Superior)",
            data: c1Data,
            borderColor: "#f47b20",
            backgroundColor: gradC1,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true
        });
    }

    if (state.analysisChannelFilter === "all" || state.analysisChannelFilter === "c2") {
        datasets.push({
            label: "Canal 2 (Inferior)",
            data: c2Data,
            borderColor: "#5ba6d5",
            backgroundColor: gradC2,
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true
        });
    }

    state.analysisChart = new Chart(canvas, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const item = rows[idx];
                    if (item) {
                        atualizarInspectorAnalise(item);
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(7, 27, 43, 0.95)",
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + " °C" : "--"}`
                    },
                    external: (context) => {
                        const tooltip = context.tooltip;
                        if (!tooltip || !tooltip.dataPoints || !tooltip.dataPoints.length) return;
                        const idx = tooltip.dataPoints[0].dataIndex;
                        const item = rows[idx];
                        if (item) {
                            atualizarInspectorAnalise(item);
                        }
                    }
                },
                zoom: {
                    pan: { enabled: false },
                    zoom: { wheel: { enabled: false }, pinch: { enabled: false } }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#71899a", maxTicksLimit: 8, font: { size: 10 } },
                    grid: { color: "rgba(255, 255, 255, 0.04)" }
                },
                y: {
                    ticks: { color: "#71899a", font: { size: 10 }, callback: (v) => `${v}°` },
                    grid: { color: "rgba(255, 255, 255, 0.05)" }
                }
            }
        }
    });

    // Inicializa inspector com a leitura mais recente
    atualizarInspectorAnalise(rows[rows.length - 1]);

    // Toque no gráfico em pé abre imediatamente o modo horizontal de lado
    canvas.onclick = () => abrirGraficoLandscape();

    // Habilita gestos fluidos multi-touch (pinch-zoom + pan)
    habilitarGestosGrafico("analysisChartCanvas", () => state.analysisChart, () => state.currentAnalysisFilteredHistory, false);

    if (state.isLandscapeOpen) {
        renderGraficoLandscape(rows);
    }
}

// ==========================================================================
// 5.1 GRÁFICO FULLSCREEN LANDSCAPE (VISUALIZAÇÃO DE LADO NO CELULAR)
// ==========================================================================

function aoClicarCanvasAnalise(event) {
    // Ao clicar no gráfico em pé, abre imediatamente o modo horizontal de lado
    abrirGraficoLandscape();
}

async function abrirGraficoLandscape() {
    const modal = $("modalGraficoLandscape");
    if (!modal) return;

    state.isLandscapeOpen = true;
    modal.classList.remove("hidden");

    // Atualiza cabeçalho do modal landscape
    const mod = state.analysisModule || state.selectedModule || 1;
    const r = state.readings.get(Number(mod));
    const online = isFornoOnline(r);

    if ($("landFornoTitle")) $("landFornoTitle").textContent = getNomeForno(mod);
    if ($("landStatusBadge")) {
        $("landStatusBadge").className = `status-indicator-badge ${online ? 'is-online' : 'is-standby'}`;
    }
    if ($("landStatusText")) {
        $("landStatusText").textContent = online ? 'ONLINE' : 'STANDBY';
    }

    // Tenta solicitar tela cheia e travamento horizontal nativo se suportado
    try {
        if (modal.requestFullscreen) {
            await modal.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape");
        }
    } catch (e) {
        // Fallback garantido via CSS rotate(90deg)
    }

    // Renderiza dados no canvas landscape
    const rows = state.currentAnalysisFilteredHistory || [];
    renderGraficoLandscape(rows);
}

function fecharGraficoLandscape() {
    const modal = $("modalGraficoLandscape");
    if (!modal) return;

    state.isLandscapeOpen = false;
    modal.classList.add("hidden");

    // Destrói gráfico landscape
    if (state.landscapeChart) {
        state.landscapeChart.destroy();
        state.landscapeChart = null;
    }

    // Restaura orientação da tela e sai de tela cheia se ativo
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
    } catch (e) {}

    // Garante que o gráfico padrão continue perfeitamente dimensionado
    if (state.analysisChart) {
        state.analysisChart.resize();
    }
}

function renderGraficoLandscape(rows) {
    const canvas = $("landscapeChartCanvas");
    if (!canvas || !rows.length) return;

    if (state.landscapeChart) {
        state.landscapeChart.destroy();
        state.landscapeChart = null;
    }

    // Atualiza estatísticas do rodapé landscape
    const c1Vals = rows.map(r => numVal(r.canal_1)).filter(v => v !== null);
    if (c1Vals.length) {
        const max = Math.max(...c1Vals);
        const min = Math.min(...c1Vals);
        const avg = c1Vals.reduce((a, b) => a + b, 0) / c1Vals.length;
        if ($("landStatPico")) $("landStatPico").textContent = `${Math.round(max)} °C`;
        if ($("landStatMin")) $("landStatMin").textContent = `${Math.round(min)} °C`;
        if ($("landStatAvg")) $("landStatAvg").textContent = `${Math.round(avg)} °C`;
        if ($("landStatCount")) $("landStatCount").textContent = `${rows.length} leituras`;
    }

    const labels = rows.map(r => {
        const d = new Date(r.created_at);
        return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    });

    const c1Data = rows.map(r => numVal(r.canal_1));
    const c2Data = rows.map(r => numVal(r.canal_2));

    const ctx = canvas.getContext("2d");
    const h = canvas.clientHeight || 360;

    const gradC1 = ctx.createLinearGradient(0, 0, 0, h);
    gradC1.addColorStop(0, "rgba(244, 123, 32, 0.45)");
    gradC1.addColorStop(1, "rgba(244, 123, 32, 0.0)");

    const gradC2 = ctx.createLinearGradient(0, 0, 0, h);
    gradC2.addColorStop(0, "rgba(59, 130, 182, 0.35)");
    gradC2.addColorStop(1, "rgba(59, 130, 182, 0.0)");

    const datasets = [];

    if (state.landscapeChannelFilter === "all" || state.landscapeChannelFilter === "c1") {
        datasets.push({
            label: "Canal 1 (Superior)",
            data: c1Data,
            borderColor: "#f47b20",
            backgroundColor: gradC1,
            borderWidth: 2.2,
            pointRadius: 2,
            pointHoverRadius: 7,
            pointBackgroundColor: "#f47b20",
            pointHoverBackgroundColor: "#ffffff",
            tension: 0.28,
            fill: true
        });
    }

    if (state.landscapeChannelFilter === "all" || state.landscapeChannelFilter === "c2") {
        datasets.push({
            label: "Canal 2 (Inferior)",
            data: c2Data,
            borderColor: "#5ba6d5",
            backgroundColor: gradC2,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 7,
            pointBackgroundColor: "#5ba6d5",
            pointHoverBackgroundColor: "#ffffff",
            tension: 0.28,
            fill: true
        });
    }

    state.landscapeChart = new Chart(canvas, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const item = rows[idx];
                    if (item) {
                        atualizarPillLeituraLandscape(item);
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(7, 27, 43, 0.95)",
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + " °C" : "--"}`
                    },
                    external: (context) => {
                        const tooltip = context.tooltip;
                        if (!tooltip || !tooltip.dataPoints || !tooltip.dataPoints.length) return;
                        const idx = tooltip.dataPoints[0].dataIndex;
                        const item = rows[idx];
                        if (item) {
                            atualizarPillLeituraLandscape(item);
                        }
                    }
                },
                zoom: {
                    pan: { enabled: false },
                    zoom: { wheel: { enabled: false }, pinch: { enabled: false } }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#94a3b8", maxTicksLimit: 14, font: { size: 11, weight: "bold" } },
                    grid: { color: "rgba(255, 255, 255, 0.05)" }
                },
                y: {
                    ticks: { color: "#94a3b8", font: { size: 11 }, callback: (v) => `${v}°` },
                    grid: { color: "rgba(255, 255, 255, 0.06)" }
                }
            }
        }
    });

    atualizarPillLeituraLandscape(rows[rows.length - 1]);
    habilitarGestosGrafico("landscapeChartCanvas", () => state.landscapeChart, () => state.currentAnalysisFilteredHistory, true);
}

function atualizarPillLeituraLandscape(item) {
    if (!item) return;
    const c1 = numVal(item.canal_1);
    const c2 = numVal(item.canal_2);
    const delta = (c1 !== null && c2 !== null) ? Math.abs(c1 - c2) : null;
    const d = new Date(item.created_at);
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    if ($("landReadoutTime")) $("landReadoutTime").textContent = hora;
    if ($("landReadoutC1")) $("landReadoutC1").textContent = `C1: ${c1 !== null ? Math.round(c1) + ' °C' : '--'}`;
    if ($("landReadoutC2")) $("landReadoutC2").textContent = `C2: ${c2 !== null ? Math.round(c2) + ' °C' : '--'}`;
    if ($("landReadoutDelta")) $("landReadoutDelta").textContent = `ΔT: ${delta !== null ? Math.round(delta) + ' °C' : '--'}`;
}

function filtrarCanaisLandscape(canal, btn) {
    state.landscapeChannelFilter = canal;
    document.querySelectorAll("#landChannelFilter .pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (state.currentAnalysisFilteredHistory.length) {
        renderGraficoLandscape(state.currentAnalysisFilteredHistory);
    }
}

// ==========================================================================
// 5.2 FERRAMENTAS INTERATIVAS DE NAVEGAÇÃO, INSPEÇÃO, ARRASTO E ZOOM
// ==========================================================================

function atualizarInspectorAnalise(item) {
    if (!item) return;
    const c1 = numVal(item.canal_1);
    const c2 = numVal(item.canal_2);
    const delta = (c1 !== null && c2 !== null) ? Math.abs(c1 - c2) : null;
    const d = new Date(item.created_at);
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    if ($("anReadoutTime")) $("anReadoutTime").textContent = hora;
    if ($("anReadoutC1")) $("anReadoutC1").textContent = c1 !== null ? `${Math.round(c1)} °C` : '-- °C';
    if ($("anReadoutC2")) $("anReadoutC2").textContent = c2 !== null ? `${Math.round(c2)} °C` : '-- °C';
    if ($("anReadoutDelta")) $("anReadoutDelta").textContent = delta !== null ? `${Math.round(delta)} °C` : '--';
}

function getActiveChart() {
    return state.isLandscapeOpen ? state.landscapeChart : state.analysisChart;
}

// NAVEGAÇÃO HORIZONTAL IMEDIATA (PAN)
function panGrafico(direcao) {
    const chart = getActiveChart();
    if (!chart || !chart.data || !chart.data.labels || !chart.data.labels.length) return;

    const scale = chart.scales.x;
    if (!scale) return;
    const total = chart.data.labels.length;
    if (total <= 1) return;

    let min = (typeof scale.min === 'number') ? scale.min : 0;
    let max = (typeof scale.max === 'number') ? scale.max : (total - 1);
    let span = max - min;

    // Se estiver em visão 100% ampla (sem zoom):
    // Ao clicar em anterior ou posterior, foca imediatamente em uma janela confortável (~35% dos dados)
    // para responder INSTANTANEAMENTE ao toque do usuário sem ficar travado!
    if (span >= total - 1) {
        const initialWindow = Math.max(4, Math.min(35, Math.round(total * 0.35)));
        if (direcao === 'left') {
            min = 0;
            max = min + initialWindow;
        } else {
            max = total - 1;
            min = Math.max(0, max - initialWindow);
        }
        scale.options.min = min;
        scale.options.max = max;
        chart.update('none');
        return;
    }

    // Passo de navegação ágil proporcional à janela visível (25% do span visível)
    const step = Math.max(2, Math.round(span * 0.25));

    if (direcao === 'left') {
        if (min <= 0) return;
        const newMin = Math.max(0, min - step);
        const newMax = newMin + span;
        scale.options.min = newMin;
        scale.options.max = Math.min(total - 1, newMax);
    } else {
        if (max >= total - 1) return;
        const newMax = Math.min(total - 1, max + step);
        const newMin = newMax - span;
        scale.options.min = Math.max(0, newMin);
        scale.options.max = newMax;
    }

    chart.update('none');
}

// ZOOM PRECISO E ÁGIL (+ / -)
function zoomGrafico(fator) {
    const chart = getActiveChart();
    if (!chart || !chart.data || !chart.data.labels || !chart.data.labels.length) return;

    const scale = chart.scales.x;
    if (!scale) return;
    const total = chart.data.labels.length;
    if (total <= 1) return;

    let min = (typeof scale.min === 'number') ? scale.min : 0;
    let max = (typeof scale.max === 'number') ? scale.max : (total - 1);
    let span = max - min;
    const center = (min + max) / 2;

    if (fator > 1) {
        // APROXIMAR ZOOM (+)
        const newSpan = Math.max(4, Math.round(span / 1.35));
        const half = newSpan / 2;
        let newMin = Math.max(0, Math.round(center - half));
        let newMax = newMin + newSpan;
        if (newMax >= total) {
            newMax = total - 1;
            newMin = Math.max(0, newMax - newSpan);
        }
        scale.options.min = newMin;
        scale.options.max = newMax;
        chart.update('none');
    } else {
        // AFASTAR ZOOM (-)
        const newSpan = Math.round(span * 1.35);
        if (newSpan >= total - 1) {
            resetZoomGrafico();
            return;
        }
        const half = newSpan / 2;
        let newMin = Math.max(0, Math.round(center - half));
        let newMax = newMin + newSpan;
        if (newMax >= total) {
            newMax = total - 1;
            newMin = Math.max(0, newMax - newSpan);
        }
        scale.options.min = newMin;
        scale.options.max = newMax;
        chart.update('none');
    }
}

// RESTAURAR ZOOM ORIGINAL (100% VISÃO COMPLETA)
function resetZoomGrafico() {
    const chart = getActiveChart();
    if (!chart) return;

    if (chart.scales && chart.scales.x) {
        delete chart.scales.x.options.min;
        delete chart.scales.x.options.max;
        delete chart.scales.x.min;
        delete chart.scales.x.max;
    }

    if (typeof chart.resetZoom === 'function') {
        try { chart.resetZoom('none'); } catch (e) {}
    }

    chart.update('none');
}

// MOTOR DE GESTOS MULTI-TOUCH FLUIDO (PINCH-TO-ZOOM COM 2 DEDOS + PAN COM 1 DEDO)
const _canvasGesturesBound = new Set();

function habilitarGestosGrafico(canvasId, getChartFn, getRowsFn, isLandscape) {
    const canvas = $(canvasId);
    if (!canvas || _canvasGesturesBound.has(canvasId)) return;
    _canvasGesturesBound.add(canvasId);

    let touchMode = "none"; // "none" | "pan" | "pinch"
    let startX = 0;
    let initialMin = 0;
    let initialMax = 0;
    let initialSpan = 0;
    let initialDist = 0;
    let centerIndex = 0;
    let centerRatio = 0.5;
    let hasMoved = false;

    const getScale = () => {
        const chart = getChartFn();
        if (!chart || !chart.data || !chart.data.labels || !chart.data.labels.length) return null;
        const total = chart.data.labels.length;
        if (total <= 1) return null;
        const scale = chart.scales.x;
        if (!scale) return null;
        const min = (typeof scale.min === "number") ? scale.min : 0;
        const max = (typeof scale.max === "number") ? scale.max : (total - 1);
        return { chart, scale, total, min, max, span: Math.max(1, max - min) };
    };

    // TOUCH START
    canvas.addEventListener("touchstart", (e) => {
        const s = getScale();
        if (!s) return;

        hasMoved = false;

        if (e.touches.length === 1) {
            // 1 Dedo: prepara arrasto
            touchMode = "pan";
            startX = e.touches[0].clientX;
            initialMin = s.min;
            initialMax = s.max;
            initialSpan = s.span;
        } else if (e.touches.length >= 2) {
            // 2 Dedos: prepara PINCH-TO-ZOOM
            touchMode = "pinch";
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY) || 10;

            const rect = canvas.getBoundingClientRect();
            const centerClientX = (t1.clientX + t2.clientX) / 2;
            centerRatio = Math.max(0, Math.min(1, (centerClientX - rect.left) / Math.max(1, rect.width)));

            initialMin = s.min;
            initialMax = s.max;
            initialSpan = s.span;
            centerIndex = initialMin + (initialSpan * centerRatio);
        }
    }, { passive: false });

    // TOUCH MOVE
    canvas.addEventListener("touchmove", (e) => {
        const s = getScale();
        if (!s) return;

        if (touchMode === "pan" && e.touches.length === 1) {
            const currentX = e.touches[0].clientX;
            const dx = currentX - startX;

            // Só ativa arrasto se o usuário realmente moveu o dedo (> 6px)
            if (Math.abs(dx) > 6) {
                hasMoved = true;
                e.preventDefault();

                // Se estiver em 100% da visualização, dá um foco de 40% inicial para começar a navegar
                if (initialSpan >= s.total - 1) {
                    const rect = canvas.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (startX - rect.left) / Math.max(1, rect.width)));
                    initialSpan = Math.max(4, Math.min(40, Math.round(s.total * 0.4)));
                    initialMin = Math.max(0, Math.min(s.total - 1 - initialSpan, Math.round(ratio * s.total - initialSpan / 2)));
                    initialMax = initialMin + initialSpan;
                    startX = currentX;
                    s.scale.options.min = initialMin;
                    s.scale.options.max = initialMax;
                    s.chart.update("none");
                    return;
                }

                const rect = canvas.getBoundingClientRect();
                const unitsPerPixel = initialSpan / Math.max(1, rect.width);
                const shiftUnits = dx * unitsPerPixel;

                let newMin = Math.round(initialMin - shiftUnits);
                let newMax = Math.round(newMin + initialSpan);

                if (newMin < 0) {
                    newMin = 0;
                    newMax = Math.min(s.total - 1, initialSpan);
                } else if (newMax > s.total - 1) {
                    newMax = s.total - 1;
                    newMin = Math.max(0, s.total - 1 - initialSpan);
                }

                s.scale.options.min = newMin;
                s.scale.options.max = newMax;
                s.chart.update("none");
            }
        } else if (touchMode === "pinch" && e.touches.length >= 2) {
            e.preventDefault();
            hasMoved = true;

            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY) || 10;
            const pinchRatio = currDist / Math.max(1, initialDist);

            // pinchRatio > 1 => dedos se afastando => ZOOM IN (span menor)
            // pinchRatio < 1 => dedos se aproximando => ZOOM OUT (span maior)
            let targetSpan = Math.round(initialSpan / pinchRatio);
            targetSpan = Math.max(3, Math.min(s.total - 1, targetSpan));

            if (targetSpan >= s.total - 1) {
                // Afastou totalmente -> visão 100% sem travar
                delete s.scale.options.min;
                delete s.scale.options.max;
                s.chart.update("none");
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const currCenterClientX = (t1.clientX + t2.clientX) / 2;
            const currCenterRatio = Math.max(0, Math.min(1, (currCenterClientX - rect.left) / Math.max(1, rect.width)));

            let newMin = Math.round(centerIndex - (targetSpan * currCenterRatio));
            let newMax = Math.round(newMin + targetSpan);

            if (newMin < 0) {
                newMin = 0;
                newMax = Math.min(s.total - 1, targetSpan);
            }
            if (newMax > s.total - 1) {
                newMax = s.total - 1;
                newMin = Math.max(0, s.total - 1 - targetSpan);
            }

            s.scale.options.min = newMin;
            s.scale.options.max = newMax;
            s.chart.update("none");
        }
    }, { passive: false });

    // TOUCH END
    const onTouchEnd = (e) => {
        if (!hasMoved && touchMode === "pan" && e.changedTouches && e.changedTouches.length === 1) {
            // Toque simples (sem arrastar)
            if (isLandscape) {
                const rect = canvas.getBoundingClientRect();
                const clickX = e.changedTouches[0].clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / Math.max(1, rect.width)));
                const s = getScale();
                if (s) {
                    const idx = Math.max(0, Math.min(s.total - 1, Math.round(s.min + (s.span * ratio))));
                    const rows = getRowsFn ? getRowsFn() : [];
                    if (rows && rows[idx]) {
                        atualizarPillLeituraLandscape(rows[idx]);
                    }
                }
            } else {
                abrirGraficoLandscape();
            }
        }

        if (e.touches.length === 0) {
            touchMode = "none";
            hasMoved = false;
        } else if (e.touches.length === 1) {
            // Tirou um dedo do pinch: continua em pan suave sem saltar
            touchMode = "pan";
            startX = e.touches[0].clientX;
            const s = getScale();
            if (s) {
                initialMin = s.min;
                initialMax = s.max;
                initialSpan = s.span;
            }
        }
    };

    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    // MOUSE DRAG (DESKTOP)
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseInitialMin = 0;
    let mouseInitialSpan = 0;

    canvas.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const s = getScale();
        if (!s) return;
        isMouseDown = true;
        mouseStartX = e.clientX;
        mouseInitialMin = s.min;
        mouseInitialSpan = s.span;
    });

    window.addEventListener("mousemove", (e) => {
        if (!isMouseDown) return;
        const s = getScale();
        if (!s) return;

        const dx = e.clientX - mouseStartX;
        if (Math.abs(dx) < 3) return;

        const rect = canvas.getBoundingClientRect();
        const unitsPerPixel = mouseInitialSpan / Math.max(1, rect.width);
        const shiftUnits = dx * unitsPerPixel;

        let newMin = Math.round(mouseInitialMin - shiftUnits);
        let newMax = Math.round(newMin + mouseInitialSpan);

        if (newMin < 0) {
            newMin = 0;
            newMax = Math.min(s.total - 1, mouseInitialSpan);
        } else if (newMax > s.total - 1) {
            newMax = s.total - 1;
            newMin = Math.max(0, s.total - 1 - mouseInitialSpan);
        }

        s.scale.options.min = newMin;
        s.scale.options.max = newMax;
        s.chart.update("none");
    });

    window.addEventListener("mouseup", () => {
        isMouseDown = false;
    });

    // MOUSE WHEEL ZOOM (DESKTOP)
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const s = getScale();
        if (!s) return;

        const rect = canvas.getBoundingClientRect();
        const cursorRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
        const centerIndex = s.min + (s.span * cursorRatio);

        const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25;
        const targetSpan = Math.max(4, Math.min(s.total - 1, Math.round(s.span * zoomFactor)));

        if (targetSpan >= s.total - 1) {
            delete s.scale.options.min;
            delete s.scale.options.max;
            s.chart.update("none");
            return;
        }

        let newMin = Math.round(centerIndex - (targetSpan * cursorRatio));
        let newMax = Math.round(newMin + targetSpan);

        if (newMin < 0) {
            newMin = 0;
            newMax = Math.min(s.total - 1, targetSpan);
        }
        if (newMax > s.total - 1) {
            newMax = s.total - 1;
            newMin = Math.max(0, s.total - 1 - targetSpan);
        }

        s.scale.options.min = newMin;
        s.scale.options.max = newMax;
        s.chart.update("none");
    }, { passive: false });
}

// PRESSIONAMENTO CONTÍNUO DOS BOTÕES DE NAVEGAÇÃO (SEGURAR O BOTÃO NAVEGA CONTINUAMENTE)
function configurarBotoesNavegacaoContinuo() {
    const bindBtn = (id, action) => {
        const btn = $(id);
        if (!btn || btn._continuousBound) return;
        btn._continuousBound = true;

        let timer = null;
        let interval = null;

        const start = (e) => {
            e.preventDefault();
            action();
            timer = setTimeout(() => {
                interval = setInterval(action, 85);
            }, 300);
        };

        const stop = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            if (interval) { clearInterval(interval); interval = null; }
        };

        btn.addEventListener("pointerdown", start);
        btn.addEventListener("pointerup", stop);
        btn.addEventListener("pointercancel", stop);
        btn.addEventListener("pointerleave", stop);
    };

    bindBtn("btnPanLeft", () => panGrafico('left'));
    bindBtn("btnPanRight", () => panGrafico('right'));
    bindBtn("btnZoomIn", () => zoomGrafico(1.35));
    bindBtn("btnZoomOut", () => zoomGrafico(0.75));

    bindBtn("btnLandPanLeft", () => panGrafico('left'));
    bindBtn("btnLandPanRight", () => panGrafico('right'));
    bindBtn("btnLandZoomIn", () => zoomGrafico(1.35));
    bindBtn("btnLandZoomOut", () => zoomGrafico(0.75));
}

// ==========================================================================
// 6. NAVEGAÇÃO ENTRE ABAS DO MENU INFERIOR
// ==========================================================================

function navegarAba(aba) {
    state.activeTab = aba;

    if (aba === "fornos") {
        voltarListaFornos();
    } else if (aba === "historico") {
        state.selectedModule = null;
        $("headerTitle").textContent = "Histórico de Queimas";
        $("headerBackBtn").classList.add("hidden");

        $("screenFornos").classList.add("hidden");
        $("screenAnaliseForno").classList.add("hidden");
        $("screenConfig").classList.add("hidden");
        $("screenHistoricoQueimas").classList.remove("hidden");

        document.querySelectorAll(".bottom-tab-bar .tab-item").forEach(b => b.classList.remove("active"));
        $("tabNavHistorico").classList.add("active");

        carregarHistoricoQueimas();
    } else if (aba === "config") {
        state.selectedModule = null;
        $("headerTitle").textContent = "Configurações";
        $("headerBackBtn").classList.add("hidden");

        $("screenFornos").classList.add("hidden");
        $("screenAnaliseForno").classList.add("hidden");
        $("screenHistoricoQueimas").classList.add("hidden");
        $("screenConfig").classList.remove("hidden");

        document.querySelectorAll(".bottom-tab-bar .tab-item").forEach(b => b.classList.remove("active"));
        $("tabNavConfig").classList.add("active");
    }
}

// ==========================================================================
// 5.1 HISTÓRICO DE QUEIMAS (CICLOS, LOTES & RELATÓRIOS)
// ==========================================================================

state.historicoFornoFiltro = "all";

function carregarHistoricoQueimas() {
    const filterContainer = $("histFiltroForno");
    const container = $("listaQueimasHistorico");
    if (!container) return;

    const availableOvens = state.ovens && state.ovens.length > 0 ? state.ovens : [];
    if (filterContainer) {
        const btnsHtml = [
            `<button class="pill-btn ${state.historicoFornoFiltro === 'all' ? 'active' : ''}" onclick="filtrarHistoricoForno('all', this)">Todos</button>`,
            ...availableOvens.map(o => {
                const mod = Number(o.numero);
                const isActive = state.historicoFornoFiltro === String(mod);
                return `<button class="pill-btn ${isActive ? 'active' : ''}" onclick="filtrarHistoricoForno('${mod}', this)">${escapeHtml(o.nome || `Forno ${String(mod).padStart(2, '0')}`)}</button>`;
            })
        ].join("");
        filterContainer.innerHTML = btnsHtml;
    }

    const queimasBase = [
        { id: "QUEIMA #54", lote: "LOTE-920", mod: 1, fornoNome: "Forno 01", data: "10/09/2026", horario: "06:15 às 15:00", duracao: "8h 45m", picoC1: 984, picoC2: 960, media: 742, delta: 24, status: "Concluída no Padrão" },
        { id: "QUEIMA #53", lote: "LOTE-919", mod: 2, fornoNome: "Forno 02", data: "09/09/2026", horario: "07:00 às 15:30", duracao: "8h 30m", picoC1: 976, picoC2: 955, media: 735, delta: 21, status: "Concluída no Padrão" },
        { id: "QUEIMA #52", lote: "LOTE-918", mod: 1, fornoNome: "Forno 01", data: "07/09/2026", horario: "06:30 às 15:45", duracao: "9h 15m", picoC1: 988, picoC2: 962, media: 748, delta: 26, status: "Concluída no Padrão" },
        { id: "QUEIMA #51", lote: "LOTE-917", mod: 2, fornoNome: "Forno 02", data: "05/09/2026", horario: "06:00 às 14:45", duracao: "8h 45m", picoC1: 968, picoC2: 948, media: 729, delta: 20, status: "Concluída no Padrão" },
        { id: "QUEIMA #50", lote: "LOTE-916", mod: 3, fornoNome: "Forno 03", data: "04/09/2026", horario: "08:00 às 16:30", duracao: "8h 30m", picoC1: 980, picoC2: 958, media: 738, delta: 22, status: "Concluída no Padrão" },
        { id: "QUEIMA #49", lote: "LOTE-915", mod: 1, fornoNome: "Forno 01", data: "02/09/2026", horario: "06:15 às 15:15", duracao: "9h 00m", picoC1: 982, picoC2: 961, media: 740, delta: 21, status: "Concluída no Padrão" }
    ];

    const queimasAdaptadas = queimasBase.map(q => {
        const found = availableOvens.find(o => Number(o.numero) === q.mod);
        return {
            ...q,
            fornoNome: found ? (found.nome || `Forno ${String(q.mod).padStart(2, '0')}`) : q.fornoNome
        };
    });

    const filtradas = state.historicoFornoFiltro === "all"
        ? queimasAdaptadas
        : queimasAdaptadas.filter(q => String(q.mod) === state.historicoFornoFiltro);

    if ($("kpiTotalQueimas")) $("kpiTotalQueimas").textContent = `${filtradas.length}`;
    if ($("kpiTempoMedio")) $("kpiTempoMedio").textContent = "8h 45m";
    if ($("kpiTaxaSucesso")) $("kpiTaxaSucesso").textContent = "100%";
    if ($("statHistoricoCount")) $("statHistoricoCount").textContent = `${filtradas.length} Ciclos`;

    if (filtradas.length) {
        const picos = filtradas.map(q => q.picoC1);
        const avgPico = Math.round(picos.reduce((a, b) => a + b, 0) / picos.length);
        if ($("kpiPicoMedio")) $("kpiPicoMedio").textContent = `${avgPico} °C`;
    } else {
        if ($("kpiPicoMedio")) $("kpiPicoMedio").textContent = "-- °C";
    }

    if (!filtradas.length) {
        container.innerHTML = `
            <div class="loading-box" style="padding: 30px; text-align: center;">
                <i class="fa-solid fa-clock-rotate-left" style="font-size: 32px; color: #f97316; margin-bottom: 10px;"></i>
                <p style="color: #94a3b8; font-size: 13px;">Nenhuma queima registrada para este filtro.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtradas.map(q => `
        <article class="queima-card">
            <div class="queima-card-top">
                <div class="queima-card-title-group">
                    <span class="queima-id-tag">${escapeHtml(q.id)} • ${escapeHtml(q.lote)}</span>
                    <h3 class="queima-forno-nome">${escapeHtml(q.fornoNome)}</h3>
                </div>
                <span class="queima-status-badge">
                    <i class="fa-solid fa-circle-check"></i>
                    ${escapeHtml(q.status)}
                </span>
            </div>

            <div class="queima-metrics-grid">
                <div class="queima-metric-item">
                    <span class="queima-metric-lbl">Duração</span>
                    <strong class="queima-metric-val">${escapeHtml(q.duracao)}</strong>
                </div>
                <div class="queima-metric-item">
                    <span class="queima-metric-lbl">Pico Máx</span>
                    <strong class="queima-metric-val text-orange">${q.picoC1} °C</strong>
                </div>
                <div class="queima-metric-item">
                    <span class="queima-metric-lbl">Média Ciclo</span>
                    <strong class="queima-metric-val text-blue">${q.media} °C</strong>
                </div>
            </div>

            <div class="queima-cycle-bar">
                <div class="queima-cycle-fill" style="width: 100%;"></div>
            </div>

            <div class="queima-card-foot">
                <span><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i> ${escapeHtml(q.data)} • ${escapeHtml(q.horario)}</span>
                <button class="queima-btn-action" onclick="abrirDetalheForno(${q.mod})">
                    <i class="fa-solid fa-chart-line"></i>
                    <span>Ver Análise</span>
                </button>
            </div>
        </article>
    `).join("");
}

function filtrarHistoricoForno(modulo, btn) {
    state.historicoFornoFiltro = String(modulo);
    document.querySelectorAll("#histFiltroForno .pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    carregarHistoricoQueimas();
}

// ==========================================================================
// 7. UTILITÁRIOS E HELPERS
// ==========================================================================

function numVal(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function formatHora(val) {
    if (!val) return "--:--:--";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "--:--:--";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRelativo(val) {
    if (!val) return "--";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "--";
    const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (sec < 5) return "agora";
    if (sec < 60) return `há ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `há ${min}m`;
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function updateLivePill(online) {
    const pill = $("liveSyncPill");
    if (!pill) return;
    if (online) {
        pill.innerHTML = `<span class="pulse-dot"></span><span class="live-label">ONLINE</span>`;
        pill.style.color = "var(--green)";
        pill.style.background = "var(--green-bg)";
    } else {
        pill.innerHTML = `<span class="pulse-dot" style="background: var(--red); box-shadow: none; animation: none;"></span><span class="live-label">RECONECTANDO</span>`;
        pill.style.color = "var(--red)";
        pill.style.background = "var(--red-bg)";
    }
}

async function atualizarManual() {
    const icon = $("refreshIcon");
    if (icon) icon.style.transform = "rotate(360deg)";
    await carregarFornosELeituras();
    if (state.selectedModule !== null) {
        await carregarDadosAnalise();
    }
    setTimeout(() => { if (icon) icon.style.transform = "none"; }, 400);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ==========================================================================
// 8. INICIALIZAÇÃO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Sessão válida → Splash ThermoLink (2,5s) → app principal
    // Sem sessão / sessão inválida → tela de login direto
    const sessao = verificarSessaoSalva();
    if (sessao) {
        iniciarPainelUsuario(sessao, true);
    } else {
        $("splashScreen").classList.add("hidden");
        $("loginScreen").classList.remove("hidden");
    }

    // Sincronização automática a cada 8 segundos (apenas para clientes ativos)
    setInterval(() => {
        if (state.currentUser && state.currentUser.status !== "Bloqueado") {
            carregarFornosELeituras();
        }
    }, 8000);

    // Configura botões de navegação contínua e gestos táteis do gráfico
    configurarBotoesNavegacaoContinuo();

    // Redimensionamento fluido em rotação de tela e resize de janela
    window.addEventListener("resize", () => {
        if (state.analysisChart) {
            state.analysisChart.resize();
        }
        if (state.landscapeChart) {
            state.landscapeChart.resize();
        }
    });
});
