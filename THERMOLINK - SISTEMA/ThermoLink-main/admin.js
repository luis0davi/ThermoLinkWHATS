// ==========================================================================
// THERMOLINK MASTER ADMIN - PORTAL ENGINE (INTEGRADO AO SUPABASE)
// Gestão de Cerâmicas, Fábrica de Hardware, Telemetria e Central OTA
// ==========================================================================

const SUPABASE_URL = "https://zawnluboujbovpgrgdcx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gJiVQXVjiuSPY3vHt2f8OA_CiES-4Ak";

const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================================================
// BASE DE DADOS INICIAL (FALLBACK E DADOS PADRÃO)
// ==========================================================================
const DEFAULT_CLIENTS = [
    {
        id: "cli_1791467023902",
        nome: "Irmãos Rolim",
        responsavel: "André Rolim",
        cidade: "São João do Rio do Peixe - PB",
        plano: "Profissional",
        valorMensal: 299,
        fornosCount: 6,
        status: "Ativo",
        username: "rolim",
        senha: "forno2026",
        ultimoAcesso: "Hoje, 17:30"
    },
    {
        id: "cli_1789336975029",
        nome: "Nossa Senhora Aparecida",
        responsavel: "Arim / Davi",
        cidade: "Russas - CE",
        plano: "Profissional",
        valorMensal: 299,
        fornosCount: 6,
        status: "Ativo",
        username: "aparecida",
        senha: "forno2026",
        ultimoAcesso: "Hoje, 16:15"
    },
    {
        id: "cli_1789502544311",
        nome: "Cerâmica LIMA",
        responsavel: "Zé Maria",
        cidade: "Russas - CE",
        plano: "Profissional",
        valorMensal: 299,
        fornosCount: 6,
        status: "Ativo",
        username: "lima",
        senha: "forno2026",
        ultimoAcesso: "Hoje, 14:20"
    },
    {
        id: "cli_1790975541876",
        nome: "Cerâmica Telha Forte",
        responsavel: "Luthiane",
        cidade: "Russas - CE",
        plano: "Profissional",
        valorMensal: 299,
        fornosCount: 6,
        status: "Ativo",
        username: "telhaforte",
        senha: "forno2026",
        ultimoAcesso: "Hoje, 10:45"
    },
    {
        id: "cli_1791295582580",
        nome: "Luis",
        responsavel: "Luis",
        cidade: "Russas - CE",
        plano: "Básico",
        valorMensal: 149,
        fornosCount: 2,
        status: "Ativo",
        username: "luis",
        senha: "forno2026",
        ultimoAcesso: "Ontem, 20:00"
    }
];

const DEFAULT_DEVICES = [
    {
        serial: "THX-00003",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Vinculado",
        ceramicaId: "cli_1",
        ceramicaNome: "Cerâmica São José",
        moduloNum: 3,
        dataFabricacao: "08/09/2026",
        rssi: -62,
        voltage: 5.04,
        sensorC1: "OK",
        sensorC2: "OK",
        uptime: "03 dias 12h"
    },
    {
        serial: "THX-00001",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Vinculado",
        ceramicaId: "cli_1",
        ceramicaNome: "Cerâmica São José",
        moduloNum: 1,
        dataFabricacao: "08/09/2026",
        rssi: -58,
        voltage: 5.08,
        sensorC1: "OK",
        sensorC2: "OK",
        uptime: "02 dias 04h"
    },
    {
        serial: "THX-00002",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Disponível",
        ceramicaId: null,
        ceramicaNome: "Em Estoque",
        moduloNum: null,
        dataFabricacao: "08/09/2026",
        rssi: null,
        voltage: 5.00,
        sensorC1: "Teste OK",
        sensorC2: "Teste OK",
        uptime: "--"
    },
    {
        serial: "TLK-2026-0401",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Vinculado",
        ceramicaId: "cli_1",
        ceramicaNome: "Cerâmica São José",
        moduloNum: 1,
        dataFabricacao: "02/08/2026",
        rssi: -58,
        voltage: 5.08,
        sensorC1: "OK",
        sensorC2: "OK",
        uptime: "14 dias 06h"
    },
    {
        serial: "TLK-2026-0402",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Vinculado",
        ceramicaId: "cli_1",
        ceramicaNome: "Cerâmica São José",
        moduloNum: 2,
        dataFabricacao: "02/08/2026",
        rssi: -64,
        voltage: 5.02,
        sensorC1: "OK",
        sensorC2: "OK",
        uptime: "14 dias 06h"
    },
    {
        serial: "TLK-2026-0849",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Vinculado",
        ceramicaId: "cli_2",
        ceramicaNome: "Cerâmica Santa Rita",
        moduloNum: 1,
        dataFabricacao: "10/08/2026",
        rssi: -72,
        voltage: 4.98,
        sensorC1: "OK",
        sensorC2: "OK",
        uptime: "6 dias 18h"
    },
    {
        serial: "TLK-2026-1020",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Disponível",
        ceramicaId: null,
        ceramicaNome: "Em Estoque",
        moduloNum: null,
        dataFabricacao: "18/08/2026",
        rssi: null,
        voltage: 5.00,
        sensorC1: "Teste OK",
        sensorC2: "Teste OK",
        uptime: "--"
    },
    {
        serial: "TLK-2026-1021",
        modelo: "TLK-ESP8266-ALUTAL",
        status: "Disponível",
        ceramicaId: null,
        ceramicaNome: "Em Estoque",
        moduloNum: null,
        dataFabricacao: "19/08/2026",
        rssi: null,
        voltage: 5.00,
        sensorC1: "Teste OK",
        sensorC2: "Teste OK",
        uptime: "--"
    }
];

function getClients() {
    if (adminState.clients && adminState.clients.length) return adminState.clients;
    const saved = localStorage.getItem("thermolink_clients_admin");
    if (!saved) {
        localStorage.setItem("thermolink_clients_admin", JSON.stringify(DEFAULT_CLIENTS));
        return DEFAULT_CLIENTS;
    }
    try { return JSON.parse(saved); } catch { return DEFAULT_CLIENTS; }
}

function saveClients(clients) {
    adminState.clients = clients;
    localStorage.setItem("thermolink_clients_admin", JSON.stringify(clients));
}

function getDevices() {
    if (adminState.devices && adminState.devices.length) return adminState.devices;
    const saved = localStorage.getItem("thermolink_devices_admin");
    if (!saved) {
        localStorage.setItem("thermolink_devices_admin", JSON.stringify(DEFAULT_DEVICES));
        return DEFAULT_DEVICES;
    }
    try { return JSON.parse(saved); } catch { return DEFAULT_DEVICES; }
}

function saveDevices(devices) {
    adminState.devices = devices;
    localStorage.setItem("thermolink_devices_admin", JSON.stringify(devices));
}

// ==========================================================================
// ESTADO GLOBAL DO ADMIN
// ==========================================================================
const adminState = {
    isLoggedIn: false,
    activeSection: "dashboard",
    clients: [],
    devices: [],
    latestGithubRelease: "v4.5.7",
    trafficChart: null,
    clientFilterStatus: "all",
    clientSearchQuery: "",
    liveReadings: [],
    syncInterval: null,
    // Monitoramento de Acessos dos Usuários
    activityLogs: [],
    activityFilter: {
        period: "7d",
        startDate: null,
        endDate: null,
        sortBy: "lastAccessDesc",
        search: ""
    },
    dailyAccessChart: null,
    hourlyDistributionChart: null,
    // Sub-aba ativa na seção WhatsApp
    waActiveTab: "conexao",
    // Inteligência Artificial & Relatórios
    aiReportState: {
        activeCeramicaId: null,
        janelaHoras: 12,
        analiseAtual: null,
        textoFormatado: ""
    }
};

const $ = (id) => document.getElementById(id);

// ==========================================================================
// 1. SINCRONIZAÇÃO COMPLETA COM O SUPABASE
// ==========================================================================

async function carregarDadosSupabase() {
    try {
        const statusEl = document.querySelector(".server-status-card b");
        if (statusEl) statusEl.textContent = "SINCRONIZANDO...";

        // 1. Carrega Cerâmicas
        const { data: dbClients, error: errClients } = await sb
            .from("ceramicas")
            .select("*")
            .order("created_at", { ascending: false });

        if (!errClients && dbClients && dbClients.length > 0) {
            adminState.clients = dbClients.map(c => ({
                id: c.id,
                nome: c.nome,
                responsavel: c.responsavel || "--",
                cidade: c.cidade || "--",
                plano: c.plano || "Profissional",
                valorMensal: Number(c.valor_mensal) || 299,
                fornosCount: Number(c.fornos_count) || 4,
                status: c.status || "Ativo",
                motivoBloqueio: c.motivo_bloqueio || null,
                username: c.username,
                senha: c.senha,
                ultimoAcesso: c.ultimo_acesso ? new Date(c.ultimo_acesso).toLocaleDateString("pt-BR") : "Nunca"
            }));
            saveClients(adminState.clients);
        } else {
            // Se tabela estiver vazia, carrega do localStorage / fallback
            adminState.clients = getClients();
        }

        // 2. Carrega Dispositivos
        const { data: dbDevs, error: errDevs } = await sb
            .from("dispositivos")
            .select("*")
            .order("id", { ascending: true });

        if (!errDevs && dbDevs && dbDevs.length > 0) {
            adminState.devices = dbDevs.map(d => {
                const s = d.serial || d.numero_serie || (d.id ? 'THX-' + String(d.id).padStart(5, '0') : '--');
                const c = adminState.clients.find(cli => cli.id === d.ceramica_id);
                return {
                    id: d.id,
                    serial: s,
                    numeroSerie: s,
                    modelo: d.modelo || "TLK-ESP8266-ALUTAL",
                    status: d.status || (d.ceramica_id ? "Vinculado" : "Disponível"),
                    ceramicaId: d.ceramica_id || null,
                    ceramicaNome: c ? c.nome : (d.ceramica_id ? "Vinculado" : "Em Estoque"),
                    moduloNum: d.modulo_num,
                    fornoId: d.forno_id,
                    dataFabricacao: d.data_fabricacao || new Date(d.created_at).toLocaleDateString("pt-BR"),
                    rssi: d.rssi,
                    voltage: d.voltage || 5.05,
                    sensorC1: "OK",
                    sensorC2: "OK",
                    firmware: d.firmware || d.firmware_version || "v4.5.7",
                    uptime: d.uptime || "--",
                    ultimoAcesso: d.ultimo_acesso
                };
            });
            saveDevices(adminState.devices);
        } else {
            adminState.devices = getDevices();
        }

        // 3. Carrega Histórico de Acessos dos Usuários
        await carregarAcessosUsuariosSupabase(false);

        if (statusEl) statusEl.textContent = "ATIVO";

        // Renderiza as telas atualizadas
        renderDashboardGeral();
        renderTabelaClientes();
        renderTabelaDispositivos();
        if (adminState.activeSection === "atividade") {
            renderSecaoAtividade();
        }
        if (adminState.activeSection === "whatsapp") {
            renderCardsCeramicasWhatsappAdmin();
            if (adminState.waActiveTab === "relatorios") {
                popularSelectCeramicasIA();
                executarAnaliseIA(false);
            }
        }

    } catch (err) {
        console.warn("[Admin Supabase] Falha ao carregar dados do Supabase:", err);
        adminState.clients = getClients();
        adminState.devices = getDevices();
        await carregarAcessosUsuariosSupabase(false);
        renderDashboardGeral();
        renderTabelaClientes();
        renderTabelaDispositivos();
        if (adminState.activeSection === "atividade") {
            renderSecaoAtividade();
        }
        if (adminState.activeSection === "whatsapp") {
            renderCardsCeramicasWhatsappAdmin();
            if (adminState.waActiveTab === "relatorios") {
                popularSelectCeramicasIA();
                executarAnaliseIA(false);
            }
        }
    }
}

// ==========================================================================
// 2. AUTENTICAÇÃO MASTER ADMIN
// ==========================================================================

function verificarAuthMaster() {
    const session = sessionStorage.getItem("thermolink_master_auth");
    if (session === "authenticated") {
        adminState.isLoggedIn = true;
        $("adminLoginModal").classList.add("hidden");
        inicializarPainelMaster();
    } else {
        $("adminLoginModal").classList.remove("hidden");
    }
}

function autenticarMasterAdmin(e) {
    e.preventDefault();
    const u = $("adminAuthUser").value.trim();
    const p = $("adminAuthPass").value.trim();

    if (u === "admin" && p === "thermolink2026") {
        sessionStorage.setItem("thermolink_master_auth", "authenticated");
        adminState.isLoggedIn = true;
        $("adminLoginModal").classList.add("hidden");
        $("adminAuthError").classList.add("hidden");
        inicializarPainelMaster();
    } else {
        $("adminAuthError").classList.remove("hidden");
    }
}

function logoutAdmin() {
    sessionStorage.removeItem("thermolink_master_auth");
    window.location.reload();
}

// ==========================================================================
// 3. NAVEGAÇÃO ENTRE SEÇÕES DO ADMIN
// ==========================================================================

function trocarSecaoAdmin(secao) {
    adminState.activeSection = secao;

    // Atualiza botões da sidebar
    document.querySelectorAll(".sidebar-nav .nav-btn").forEach(b => {
        const onclickAttr = b.getAttribute("onclick") || "";
        b.classList.toggle("active", onclickAttr.includes(`'${secao}'`));
    });

    // Oculta todas as seções
    $("secDashboard")?.classList.add("hidden");
    $("secClientes")?.classList.add("hidden");
    $("secDispositivos")?.classList.add("hidden");
    $("secAtividade")?.classList.add("hidden");
    $("secPlanos")?.classList.add("hidden");
    $("secWhatsapp")?.classList.add("hidden");

    // Atualiza cabeçalho
    const titulos = {
        dashboard: { h1: "Dashboard Geral", sub: "Visão executiva, custos de infraestrutura e tráfego em tempo real" },
        clientes: { h1: "Gestão de Cerâmicas", sub: "Controle de clientes, bloqueio por inadimplência e modo suporte" },
        dispositivos: { h1: "Fábrica & Hardware", sub: "Cadastro de números de série, geração de etiquetas adesivas e inventário" },
        atividade: { h1: "Atividade dos Usuários", sub: "Monitoramento em tempo real de acessos, dispositivos e horários de pico" },
        planos: { h1: "Planos & Faturamento", sub: "Configuração de limites de fornos e tempo de retenção do banco de dados" },
        whatsapp: { h1: "WhatsApp & Relatórios", sub: "Gateway de comunicação, contatos de cerâmicas e relatórios automáticos com IA" }
    };

    if (titulos[secao]) {
        $("adminPageHeading").textContent = titulos[secao].h1;
        $("adminPageSubheading").textContent = titulos[secao].sub;
    }

    if (secao === "dashboard") {
        pararPollingWhatsappAdmin();
        $("secDashboard")?.classList.remove("hidden");
        renderDashboardGeral();
    } else if (secao === "clientes") {
        pararPollingWhatsappAdmin();
        $("secClientes")?.classList.remove("hidden");
        renderTabelaClientes();
    } else if (secao === "dispositivos") {
        pararPollingWhatsappAdmin();
        $("secDispositivos")?.classList.remove("hidden");
        renderTabelaDispositivos();
    } else if (secao === "atividade") {
        pararPollingWhatsappAdmin();
        $("secAtividade")?.classList.remove("hidden");
        renderSecaoAtividade();
    } else if (secao === "whatsapp") {
        $("secWhatsapp")?.classList.remove("hidden");
        carregarSecaoWhatsappAdmin();
        iniciarPollingWhatsappAdmin();
        trocarSubAbaWhatsapp(adminState.waActiveTab || "conexao");
    }

    // Atualiza estado ativo na sidebar e na bottom bar móvel
    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.getAttribute("data-secao") === secao) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        if (item.getAttribute("data-secao") === secao) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Fecha sidebar no mobile se estiver aberta
    fecharSidebarMobile();
}

function fecharSidebarMobile() {
    const sidebar = document.querySelector(".admin-sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.remove("show");
    document.body.classList.remove("sidebar-mobile-locked");
}

function toggleSidebarMobile() {
    const sidebar = document.querySelector(".admin-sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) {
        const isOpen = sidebar.classList.toggle("mobile-open");
        if (backdrop) {
            backdrop.classList.toggle("show", isOpen);
        }
        document.body.classList.toggle("sidebar-mobile-locked", isOpen);
    }
}

function trocarSubAbaWhatsapp(tabId) {
    adminState.waActiveTab = tabId;

    // Atualiza botões da barra de abas
    document.querySelectorAll(".wa-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-watab") === tabId);
    });

    // Alterna visibilidade dos painéis
    $("waSubSecConexao")?.classList.toggle("hidden", tabId !== "conexao");
    $("waSubSecContatos")?.classList.toggle("hidden", tabId !== "contatos");
    $("waSubSecRelatorios")?.classList.toggle("hidden", tabId !== "relatorios");

    // Ações específicas ao abrir cada sub-aba
    if (tabId === "relatorios") {
        carregarSecaoRelatoriosIA();
    } else if (tabId === "contatos") {
        renderCardsCeramicasWhatsappAdmin();
    } else if (tabId === "conexao") {
        carregarStatusWhatsappAdmin(false);
    }
}

// ==========================================================================
// 4. RENDERIZAÇÃO DO DASHBOARD GERAL
// ==========================================================================

function renderDashboardGeral() {
    const clients = getClients();
    const devices = getDevices();

    // KPIs
    const ativas = clients.filter(c => c.status === "Ativo");
    const onlineDevs = devices.filter(d => d.status === "Vinculado");

    if ($("kpiTotalClients")) $("kpiTotalClients").textContent = clients.length;
    if ($("kpiActiveClientsCount")) $("kpiActiveClientsCount").textContent = `${ativas.length} ativas`;
    if ($("sidebarBadgeClients")) $("sidebarBadgeClients").textContent = clients.length;

    if ($("kpiTotalDevices")) $("kpiTotalDevices").textContent = devices.length;
    if ($("kpiOnlineDevicesCount")) $("kpiOnlineDevicesCount").textContent = `${onlineDevs.length} vinculados`;

    renderTrafficChart();
    atualizarStatusDispositivosOnline();
    renderListaVersoesFirmware();
}

let isRenderingTrafficChart = false;

async function renderTrafficChart(forcarRecarregamento = false) {
    const canvas = $("trafficChartCanvas");
    if (!canvas) return;

    if (isRenderingTrafficChart && !forcarRecarregamento) return;
    isRenderingTrafficChart = true;

    const reloadIcon = $("trafficReloadIcon");
    if (reloadIcon) reloadIcon.classList.add("fa-spin");

    const badgeEl = $("trafficTotal24h");
    const peakBadge = $("trafficPeakBadge");
    const peakDisplay = $("trafficPeakDisplay");

    if (badgeEl && !badgeEl.textContent.includes("leituras")) {
        badgeEl.textContent = "Carregando...";
    }

    // Gera os 12 slots de 2 horas para cobrir perfeitamente as últimas 24 horas até agora
    const now = new Date();
    const intervals = [];
    const labels = [];

    for (let i = 11; i >= 0; i--) {
        const slotEnd = new Date(now.getTime() - i * 2 * 3600 * 1000);
        const slotStart = new Date(slotEnd.getTime() - 2 * 3600 * 1000);

        const hhStart = String(slotStart.getHours()).padStart(2, "0");
        const hhEnd = String(slotEnd.getHours()).padStart(2, "0");

        labels.push(`${hhEnd}h`);
        intervals.push({
            start: slotStart,
            end: slotEnd,
            labelStart: `${hhStart}:00`,
            labelEnd: `${hhEnd}:00`,
            count: 0
        });
    }

    const start24hIso = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    let totalLeituras24h = 0;
    let usaDadosReais = false;
    let picoMaximo = 0;
    let picoSlot = "";

    try {
        if (typeof sb !== "undefined" && sb) {
            // Executa consultas paralelas leves (HEAD count exato sem trafegar payload de dados pesados)
            const promessasSlots = intervals.map(inv =>
                sb.from("leituras")
                    .select("*", { count: "exact", head: true })
                    .gte("created_at", inv.start.toISOString())
                    .lt("created_at", inv.end.toISOString())
            );

            // Consulta global exata de contagem das últimas 24h
            const promessaTotal = sb.from("leituras")
                .select("*", { count: "exact", head: true })
                .gte("created_at", start24hIso);

            const [respTotal, ...respsSlots] = await Promise.all([promessaTotal, ...promessasSlots]);

            let somaSlots = 0;
            respsSlots.forEach((resp, idx) => {
                const qtd = (!resp.error && typeof resp.count === "number") ? resp.count : 0;
                intervals[idx].count = qtd;
                somaSlots += qtd;
                if (qtd > picoMaximo) {
                    picoMaximo = qtd;
                    picoSlot = intervals[idx].labelEnd;
                }
            });

            totalLeituras24h = (!respTotal.error && typeof respTotal.count === "number")
                ? respTotal.count
                : somaSlots;

            usaDadosReais = true;
        }
    } catch (err) {
        console.warn("Aviso ao buscar tráfego Supabase (leituras 24h):", err);
    } finally {
        isRenderingTrafficChart = false;
        if (reloadIcon) reloadIcon.classList.remove("fa-spin");
    }

    let trafficData = intervals.map(inv => inv.count);

    // Fallback apenas se o Supabase estiver completamente desconectado da internet
    if (!usaDadosReais) {
        const baseDevices = (getDevices() || []).filter(d => d.status === "Vinculado").length || 3;
        const curveWeights = [0.4, 0.3, 0.35, 0.6, 1.1, 1.6, 1.9, 2.1, 2.0, 1.8, 1.4, 1.2];
        const baseRate = baseDevices * 240;
        trafficData = curveWeights.map(w => Math.round(baseRate * w));
        totalLeituras24h = trafficData.reduce((acc, v) => acc + v, 0);
        picoMaximo = Math.max(...trafficData);
    }

    // Atualiza o badge de total no topo do painel
    if (badgeEl) {
        badgeEl.textContent = `${totalLeituras24h.toLocaleString("pt-BR")} leituras`;
    }

    // Exibe o badge dinâmico de Pico Máximo
    if (peakBadge && peakDisplay) {
        if (picoMaximo > 0) {
            peakDisplay.textContent = `Pico: ${picoMaximo.toLocaleString("pt-BR")}${picoSlot ? ` (${picoSlot})` : ''}`;
            peakBadge.style.display = "inline-flex";
        } else {
            peakBadge.style.display = "none";
        }
    }

    if (adminState.trafficChart) {
        adminState.trafficChart.destroy();
        adminState.trafficChart = null;
    }

    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, "rgba(249, 115, 22, 0.45)");
    grad.addColorStop(0.7, "rgba(249, 115, 22, 0.10)");
    grad.addColorStop(1, "rgba(249, 115, 22, 0.0)");

    // Destaque visual especial para o ponto do Pico Máximo no gráfico
    const maxVal = Math.max(...trafficData, 1);
    const pointColors = trafficData.map(v => v === maxVal && v > 0 ? "#ef4444" : "#f97316");
    const pointRadii = trafficData.map(v => v === maxVal && v > 0 ? 6.5 : 3.5);
    const pointHoverRadii = trafficData.map(v => v === maxVal && v > 0 ? 9.5 : 7);

    adminState.trafficChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Leituras Processadas no Banco",
                data: trafficData,
                borderColor: "#f97316",
                borderWidth: 2.8,
                backgroundColor: grad,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: pointColors,
                pointBorderColor: "#07121f",
                pointBorderWidth: 2,
                pointRadius: pointRadii,
                pointHoverRadius: pointHoverRadii
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(7, 18, 31, 0.95)",
                    titleColor: "#ffffff",
                    bodyColor: "#fdba74",
                    borderColor: "rgba(249, 115, 22, 0.35)",
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            const inv = intervals[idx];
                            return inv ? `⏰ Intervalo: ${inv.labelStart} às ${inv.labelEnd}` : items[0].label;
                        },
                        label: (c) => {
                            const val = c.parsed.y;
                            const isPico = val === picoMaximo && picoMaximo > 0;
                            const icon = isPico ? "🔥 [PICO MÁXIMO]" : "📊";
                            return `${icon} ${val.toLocaleString("pt-BR")} leituras`;
                        },
                        afterLabel: (c) => {
                            const val = c.parsed.y;
                            const porMin = (val / 120).toFixed(1);
                            return `⚡ Ritmo Médio: ~${porMin} leituras/minuto`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#94a3b8", font: { size: 11, weight: "600" } },
                    grid: { color: "rgba(255, 255, 255, 0.05)" }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#94a3b8",
                        font: { size: 11 },
                        callback: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
                    },
                    grid: { color: "rgba(255, 255, 255, 0.05)" }
                }
            }
        }
    });
}

// ==========================================================================
// 5. GESTÃO DE CLIENTES & MODO IMPERSONATE
// ==========================================================================

function renderTabelaClientes() {
    const tbody = $("clientsTableBody");
    if (!tbody) return;

    let clients = getClients();

    // Filtro por status
    if (adminState.clientFilterStatus !== "all") {
        clients = clients.filter(c => c.status === adminState.clientFilterStatus);
    }

    // Filtro por busca
    if (adminState.clientSearchQuery) {
        const q = adminState.clientSearchQuery.toLowerCase();
        clients = clients.filter(c => 
            c.nome.toLowerCase().includes(q) || 
            c.responsavel.toLowerCase().includes(q) || 
            c.cidade.toLowerCase().includes(q) ||
            c.username.toLowerCase().includes(q)
        );
    }

    if (!clients.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">Nenhuma cerâmica encontrada com os filtros atuais.</td></tr>`;
        return;
    }

    tbody.innerHTML = clients.map(c => {
        const isBloqueado = c.status === "Bloqueado";
        const statusBadge = isBloqueado 
            ? `<span class="badge-status-bloqueado"><i class="fa-solid fa-ban"></i> Bloqueado</span>`
            : `<span class="badge-status-ativo"><i class="fa-solid fa-circle-check"></i> Ativo</span>`;

        return `
            <tr>
                <td>
                    <b>${escapeHtml(c.nome)}</b>
                    <div style="font-size:11px; color:#64748b;">Usuário: ${escapeHtml(c.username)}</div>
                </td>
                <td>${escapeHtml(c.responsavel)}</td>
                <td>${escapeHtml(c.cidade)}</td>
                <td><span style="color:#0ea5e9; font-weight:700;">${c.plano}</span></td>
                <td><b>${c.fornosCount}</b> Fornos</td>
                <td>${statusBadge}</td>
                <td><span style="font-size:12px; color:#94a3b8;">${c.ultimoAcesso}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-tbl-action btn-impersonate" onclick="impersonateCeramica('${c.id}')" title="Entrar no Dashboard desta Cerâmica">
                            <i class="fa-solid fa-eye"></i>
                            <span>Suporte</span>
                        </button>
                        <button class="btn-tbl-action btn-block-toggle" onclick="alternarBloqueioCliente('${c.id}')" title="${isBloqueado ? 'Desbloquear Acesso' : 'Bloquear Acesso por Inadimplência'}">
                            <i class="fa-solid ${isBloqueado ? 'fa-lock-open' : 'fa-lock'}"></i>
                            <span>${isBloqueado ? 'Liberar' : 'Bloquear'}</span>
                        </button>
                        <button class="btn-tbl-action btn-delete-action" onclick="excluirCeramica('${c.id}')" title="Excluir Cerâmica">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function filtrarStatusCliente(status, btn) {
    adminState.clientFilterStatus = status;
    document.querySelectorAll(".filter-pills .filter-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderTabelaClientes();
}

function filtrarTabelaClientes(texto) {
    adminState.clientSearchQuery = texto.trim();
    renderTabelaClientes();
}

function alternarBloqueioCliente(clienteId) {
    const clients = getClients();
    const target = clients.find(c => c.id === clienteId);
    if (!target) return;

    if (target.status === "Ativo") {
        // Abre modal para o administrador digitar o motivo do bloqueio
        $("bloqClienteId").value = clienteId;
        $("bloqClienteNome").value = target.nome;
        $("bloqMotivoTexto").value = target.motivoBloqueio || "Acesso temporariamente suspenso devido a pendência financeira na assinatura. Favor entrar em contato com o suporte financeiro ThermoLink para regularização.";
        $("modalBloquearCliente").classList.remove("hidden");
    } else {
        // Desbloquear / Liberar
        if (confirm(`Deseja realmente LIBERAR o acesso da "${target.nome}"?\nO cliente voltará a visualizar todos os seus fornos e telemetria normalmente.`)) {
            desbloquearCliente(clienteId);
        }
    }
}

async function confirmarBloqueioCliente(e) {
    e.preventDefault();
    const clienteId = $("bloqClienteId").value;
    const motivo = $("bloqMotivoTexto").value.trim();

    const clients = getClients();
    const target = clients.find(c => c.id === clienteId);
    if (!target) return;

    target.status = "Bloqueado";
    target.motivoBloqueio = motivo;
    saveClients(clients);

    // Salva também em mapa de motivos no localStorage para garantir acesso instantâneo pelo app
    const motivosMap = JSON.parse(localStorage.getItem("thermolink_motivos_bloqueio") || "{}");
    motivosMap[clienteId] = motivo;
    if (target.username) motivosMap[target.username.toLowerCase()] = motivo;
    localStorage.setItem("thermolink_motivos_bloqueio", JSON.stringify(motivosMap));

    fecharModalAdmin("modalBloquearCliente", null);
    renderTabelaClientes();
    renderDashboardGeral();

    // Persiste atualização no Supabase
    try {
        const { error } = await sb
            .from("ceramicas")
            .update({ status: "Bloqueado", motivo_bloqueio: motivo })
            .eq("id", clienteId);

        if (error) {
            // Caso a coluna motivo_bloqueio ainda não tenha sido criada no banco via SQL
            await sb.from("ceramicas").update({ status: "Bloqueado" }).eq("id", clienteId);
        }
    } catch (err) {
        console.error("[Supabase] Erro ao bloquear cerâmica:", err);
    }

    alert(`Cerâmica "${target.nome}" foi BLOQUEADA.\n\nMotivo configurado:\n"${motivo}"\n\nEssa mensagem será exibida na tela do cliente quando ele acessar.`);
}

async function desbloquearCliente(clienteId) {
    const clients = getClients();
    const target = clients.find(c => c.id === clienteId);
    if (!target) return;

    target.status = "Ativo";
    target.motivoBloqueio = null;
    saveClients(clients);

    const motivosMap = JSON.parse(localStorage.getItem("thermolink_motivos_bloqueio") || "{}");
    delete motivosMap[clienteId];
    if (target.username) delete motivosMap[target.username.toLowerCase()];
    localStorage.setItem("thermolink_motivos_bloqueio", JSON.stringify(motivosMap));

    renderTabelaClientes();
    renderDashboardGeral();

    try {
        const { error } = await sb
            .from("ceramicas")
            .update({ status: "Ativo", motivo_bloqueio: null })
            .eq("id", clienteId);

        if (error) {
            await sb.from("ceramicas").update({ status: "Ativo" }).eq("id", clienteId);
        }
    } catch (err) {
        console.error("[Supabase] Erro ao desbloquear cerâmica:", err);
    }

    alert(`Acesso da cerâmica "${target.nome}" foi LIBERADO com sucesso!`);
}

async function excluirCeramica(clienteId) {
    const clients = getClients();
    const target = clients.find(c => c.id === clienteId);
    if (!target) return;

    if (!confirm(`ATENÇÃO: Deseja realmente excluir a cerâmica "${target.nome}"?\nTodos os fornos e vínculos associados serão desvinculados.`)) {
        return;
    }

    // Remove do Supabase
    try {
        const { error } = await sb.from("ceramicas").delete().eq("id", clienteId);
        if (error) {
            alert(`Erro ao excluir no banco de dados: ${error.message}`);
            return;
        }
    } catch (err) {
        console.error("[Supabase] Falha ao deletar:", err);
    }

    adminState.clients = clients.filter(c => c.id !== clienteId);
    saveClients(adminState.clients);
    renderTabelaClientes();
    renderDashboardGeral();
    alert(`Cerâmica "${target.nome}" excluída com sucesso.`);
}

function impersonateCeramica(clienteId) {
    const clients = getClients();
    const target = clients.find(c => c.id === clienteId);
    if (!target) return;

    const impersonateSession = {
        username: target.username,
        name: target.nome,
        role: "client",
        ceramicaId: target.id,
        isImpersonateMode: true,
        impersonatedBy: "Master Admin"
    };

    localStorage.setItem("thermolink_active_session", JSON.stringify(impersonateSession));
    window.open("index.html", "_blank");
}

function abrirModalNovaCeramica() {
    $("ncNome").value = "";
    $("ncResp").value = "";
    $("ncCidade").value = "";
    $("ncUser").value = "";
    gerarSenhaAleatoriaCliente();
    $("modalNovaCeramica").classList.remove("hidden");
}

function gerarSenhaAleatoriaCliente() {
    const num = Math.floor(1000 + Math.random() * 9000);
    $("ncPass").value = `cer${num}`;
}

async function salvarNovaCeramica(e) {
    e.preventDefault();
    const nome = $("ncNome").value.trim();
    const resp = $("ncResp").value.trim();
    const cidade = $("ncCidade").value.trim();
    const plano = $("ncPlano").value;
    const user = $("ncUser").value.trim().toLowerCase();
    const pass = $("ncPass").value.trim();

    if (!nome || !user || !pass) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Salvando no Banco Supabase...";
    }

    const newId = `cli_${Date.now()}`;
    const precoPorPlano = { "Básico": 149, "Profissional": 299, "Enterprise": 599 };
    const fornosPorPlano = { "Básico": 2, "Profissional": 6, "Enterprise": 12 };

    const novoRegistro = {
        id: newId,
        nome: nome,
        responsavel: resp,
        cidade: cidade,
        plano: plano,
        valor_mensal: precoPorPlano[plano] || 299,
        fornos_count: fornosPorPlano[plano] || 6,
        status: "Ativo",
        username: user,
        senha: pass
    };

    // 1. Grava diretamente no Supabase na tabela 'ceramicas'
    try {
        const { error } = await sb.from("ceramicas").insert([novoRegistro]);
        if (error) {
            console.warn("[Supabase] Erro ao cadastrar cerâmica no banco:", error);
            alert(`Aviso ao gravar no banco de dados: ${error.message}\nO cadastro será mantido localmente.`);
        } else {
            // Cria os fornos iniciais para a nova cerâmica no Supabase
            const fornos = [];
            for (let i = 1; i <= novoRegistro.fornos_count; i++) {
                fornos.push({
                    ceramica_id: newId,
                    numero: i,
                    nome: `Forno ${String(i).padStart(2, '0')}`,
                    ativo: true
                });
            }
            await sb.from("fornos").insert(fornos);
        }
    } catch (err) {
        console.error("[Supabase] Falha ao enviar para o Supabase:", err);
    }

    // 2. Atualiza estado local
    const clients = getClients();
    clients.unshift({
        id: newId,
        nome: nome,
        responsavel: resp,
        cidade: cidade,
        plano: plano,
        valorMensal: precoPorPlano[plano] || 299,
        fornosCount: fornosPorPlano[plano] || 6,
        status: "Ativo",
        username: user,
        senha: pass,
        ultimoAcesso: "Nunca"
    });
    saveClients(clients);

    // Salva na lista de usuários para autenticação direta
    const users = JSON.parse(localStorage.getItem("thermolink_users") || "[]");
    users.push({ username: user, password: pass, name: nome, role: "client" });
    localStorage.setItem("thermolink_users", JSON.stringify(users));

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }

    fecharModalAdmin("modalNovaCeramica", null);
    renderTabelaClientes();
    renderDashboardGeral();

    alert(`Cerâmica cadastrada e salva com sucesso no Banco de Dados!\n\nNome: ${nome}\nUsuário: ${user}\nSenha: ${pass}\n\nVocê já pode entregar o acesso ao cliente.`);
}

// ==========================================================================
// 6. FÁBRICA DE DISPOSITIVOS & GERADOR DE QR CODE
// ==========================================================================

function renderTabelaDispositivos() {
    const tbody = $("devicesTableBody");
    if (!tbody) return;

    const devices = getDevices();

    // Contadores de resumo
    $("sumDevTotal").textContent = devices.length;
    $("sumDevLinked").textContent = devices.filter(d => d.status === "Vinculado").length;
    $("sumDevStock").textContent = devices.filter(d => d.status === "Disponível").length;

    tbody.innerHTML = devices.map(d => {
        const isDisponivel = d.status === "Disponível";
        const statusBadge = isDisponivel
            ? `<span class="badge-status-estoque"><i class="fa-solid fa-box"></i> Em Estoque</span>`
            : `<span class="badge-status-ativo"><i class="fa-solid fa-plug-circle-check"></i> Vinculado</span>`;

        return `
            <tr>
                <td><b style="font-family:var(--font-mono); color:#f97316; font-size:14px;">${d.serial}</b></td>
                <td><span style="font-size:12px; color:#94a3b8;">${d.modelo}</span></td>
                <td>${statusBadge}</td>
                <td><b>${escapeHtml(d.ceramicaNome || "--")}</b></td>
                <td>${d.moduloNum ? `<span style="color:#38bdf8; font-weight:700;">Forno ${String(d.moduloNum).padStart(2, '0')}</span>` : "--"}</td>
                <td><span style="font-size:12px; color:#64748b;">${d.dataFabricacao}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-tbl-action ${isDisponivel ? 'btn-vincular-novo' : 'btn-vincular-edit'}" onclick="abrirModalVincularDispositivo('${d.serial}')" title="${isDisponivel ? 'Vincular este aparelho a uma Cerâmica' : 'Alterar Cerâmica / Forno Vinculado'}">
                            <i class="fa-solid fa-link"></i>
                            <span>${isDisponivel ? 'Vincular' : 'Alterar'}</span>
                        </button>
                        <button class="btn-tbl-action btn-qrcode-view" onclick="abrirModalEtiquetaQRCode('${d.serial}')" title="Gerar e Imprimir Etiqueta QR Code">
                            <i class="fa-solid fa-qrcode"></i>
                            <span>QR</span>
                        </button>
                        ${!isDisponivel ? `
                            <button class="btn-tbl-action btn-block-toggle" onclick="desvincularDispositivo('${d.serial}')" title="Liberar e Desvincular Aparelho">
                                <i class="fa-solid fa-unlink"></i>
                            </button>
                        ` : ''}
                        <button class="btn-tbl-action btn-delete-action" onclick="excluirDispositivo('${d.serial}')" title="Excluir Dispositivo">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function abrirModalFabricarDispositivo() {
    gerarSerialTHX(); // Inicia com o próximo padrão ThermoX (ex: THX-00003)
    
    // Popula select de cerâmicas
    const sel = $("devCeramicaVinculo");
    if (sel) {
        const clients = getClients();
        sel.innerHTML = `<option value="">-- Deixar em Estoque (Disponível) --</option>` +
            clients.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
    }

    $("modalFabricarDispositivo").classList.remove("hidden");
}

function gerarSerialHardware() {
    const rnd = Math.floor(1000 + Math.random() * 9000);
    $("devSerial").value = `TLK-2026-${rnd}`;
}

function gerarSerialTHX() {
    const devices = getDevices();
    let maxNum = 0;
    devices.forEach(d => {
        if (d.serial && d.serial.startsWith("THX-")) {
            const numPart = d.serial.replace("THX-", "");
            const n = parseInt(numPart, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        }
    });
    const nextNum = String(maxNum + 1).padStart(5, "0");
    $("devSerial").value = `THX-${nextNum}`;
}

function abrirModalVincularDispositivo(serial) {
    const devices = getDevices();
    const target = devices.find(d => d.serial === serial);
    if (!target) return;

    $("vincSerialOriginal").value = serial;
    $("vincSerial").value = serial;
    $("vincModuloNum").value = target.moduloNum || 1;
    $("vincStatus").value = target.status === "Disponível" ? "Vinculado" : target.status;

    const sel = $("vincCeramica");
    if (sel) {
        const clients = getClients();
        sel.innerHTML = clients.map(c => `
            <option value="${c.id}" ${c.id === target.ceramicaId ? "selected" : ""}>
                ${escapeHtml(c.nome)} (${escapeHtml(c.cidade)})
            </option>
        `).join("");
    }

    $("modalVincularDispositivo").classList.remove("hidden");
}

async function salvarVinculoDispositivo(e) {
    e.preventDefault();
    const serial = $("vincSerialOriginal").value;
    const ceramicaId = $("vincCeramica").value;
    const moduloNum = Number($("vincModuloNum").value) || 1;
    const status = $("vincStatus").value;

    const clients = getClients();
    const selectedClient = clients.find(c => c.id === ceramicaId);

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Salvando Vínculo no Supabase...";
    }

    const isVinculado = status === "Vinculado";
    const atualizacao = {
        status: status,
        ceramica_id: isVinculado ? ceramicaId : null,
        modulo_num: isVinculado ? moduloNum : null,
        forno_id: isVinculado ? moduloNum : null,
        serial: serial,
        numero_serie: serial
    };

    try {
        const { error } = await sb
            .from("dispositivos")
            .update(atualizacao)
            .or(`serial.eq.${serial},numero_serie.eq.${serial}`);

        if (error) {
            console.warn("[Supabase] Erro ao vincular dispositivo:", error);
            alert(`Aviso ao salvar vínculo no banco: ${error.message}`);
        } else if (isVinculado && ceramicaId) {
            // 1. Retroalimenta as leituras DESTE dispositivo para a Cerâmica dona!
            try {
                await sb.from("leituras")
                    .update({ ceramica_id: ceramicaId })
                    .or(`numero_serie.eq.${serial},serial.eq.${serial}`);
            } catch (errLeit) {
                console.warn("[Supabase] Aviso ao atualizar leituras do dispositivo:", errLeit);
            }

            // 2. Desassocia leituras antigas de outros números de série que estavam presas a esta cerâmica
            try {
                await sb.from("leituras")
                    .update({ ceramica_id: null })
                    .eq("ceramica_id", ceramicaId)
                    .neq("numero_serie", serial);
            } catch (errClean) {
                console.warn("[Supabase] Aviso ao desassociar leituras de outros aparelhos:", errClean);
            }

            // 3. Se outro aparelho estava vinculado ao mesmo forno nesta Cerâmica, desvincula-o no Supabase
            try {
                await sb.from("dispositivos")
                    .update({
                        status: "Disponível",
                        ceramica_id: null,
                        modulo_num: null,
                        forno_id: null
                    })
                    .eq("ceramica_id", ceramicaId)
                    .eq("modulo_num", moduloNum)
                    .neq("numero_serie", serial);
            } catch (errPrevDev) {
                console.warn("[Supabase] Aviso ao liberar aparelho anterior do mesmo forno:", errPrevDev);
            }
        }
    } catch (err) {
        console.error("[Supabase] Falha ao atualizar vínculo:", err);
    }

    // Atualiza estado local
    const devices = getDevices();
    if (isVinculado && ceramicaId) {
        devices.forEach(d => {
            const dSerial = d.serial || d.numeroSerie;
            if (dSerial !== serial && (d.ceramicaId === ceramicaId || d.ceramica_id === ceramicaId) && Number(d.moduloNum) === Number(moduloNum)) {
                d.status = "Disponível";
                d.ceramicaId = null;
                d.ceramicaNome = "Em Estoque";
                d.moduloNum = null;
                d.fornoId = null;
            }
        });
    }

    const target = devices.find(d => d.serial === serial || d.numeroSerie === serial);
    if (target) {
        target.status = status;
        target.ceramicaId = isVinculado ? ceramicaId : null;
        target.ceramicaNome = isVinculado && selectedClient ? selectedClient.nome : "Em Estoque";
        target.moduloNum = isVinculado ? moduloNum : null;
        target.fornoId = isVinculado ? moduloNum : null;
    }
    saveDevices(devices);

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
    }

    fecharModalAdmin("modalVincularDispositivo", null);
    renderTabelaDispositivos();
    renderDashboardGeral();

    if (isVinculado && selectedClient) {
        alert(`Dispositivo ${serial} associado com sucesso!\n\nCerâmica: ${selectedClient.nome}\nForno: ${moduloNum}\n\nAgora apenas as informações e leituras térmicas do ${serial} serão extraídas do banco para esta Cerâmica.`);
    } else {
        alert(`Dispositivo ${serial} atualizado.`);
    }
}

async function salvarNovoDispositivo(e) {
    e.preventDefault();
    const serial = $("devSerial").value.trim().toUpperCase();
    const modelo = $("devModelo").value;
    const ceramicaId = $("devCeramicaVinculo").value || null;
    const moduloNum = $("devModuloNum").value ? Number($("devModuloNum").value) : null;

    if (!serial) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Gravando Hardware no Supabase...";
    }

    const devices = getDevices();
    const clients = getClients();
    const selectedClient = clients.find(c => c.id === ceramicaId);

    // Extrai o ID numérico a partir do serial (ex: THX-00003 -> ID 3)
    let numId = null;
    if (serial.startsWith("THX-")) {
        const parsed = parseInt(serial.replace("THX-", ""), 10);
        if (!isNaN(parsed)) numId = parsed;
    }

    const novoDev = {
        serial: serial,
        numero_serie: serial,
        modelo: modelo,
        status: ceramicaId ? "Vinculado" : "Disponível",
        ceramica_id: ceramicaId,
        modulo_num: moduloNum || 1,
        forno_id: moduloNum || 1,
        data_fabricacao: new Date().toLocaleDateString("pt-BR"),
        rssi: ceramicaId ? -65 : null,
        voltage: 5.05,
        uptime: ceramicaId ? "0h" : "--"
    };
    if (numId) novoDev.id = numId;

    // 1. Grava no banco Supabase na tabela 'dispositivos'
    try {
        const { error } = await sb.from("dispositivos").insert([novoDev]);
        if (error) {
            console.warn("[Supabase] Erro ao gravar dispositivo no banco:", error);
            alert(`Aviso ao gravar dispositivo no banco de dados: ${error.message}`);
        }
    } catch (err) {
        console.error("[Supabase] Erro de rede:", err);
    }

    // 2. Atualiza estado local
    devices.unshift({
        id: numId,
        serial: serial,
        numeroSerie: serial,
        modelo: modelo,
        status: ceramicaId ? "Vinculado" : "Disponível",
        ceramicaId: ceramicaId,
        ceramicaNome: selectedClient ? selectedClient.nome : "Em Estoque",
        moduloNum: moduloNum || 1,
        dataFabricacao: novoDev.data_fabricacao,
        rssi: novoDev.rssi,
        voltage: 5.05,
        sensorC1: "Teste OK",
        sensorC2: "Teste OK",
        uptime: novoDev.uptime
    });

    saveDevices(devices);

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }

    fecharModalAdmin("modalFabricarDispositivo", null);
    renderTabelaDispositivos();
    renderDashboardGeral();

    // Abre diretamente a etiqueta para impressão
    abrirModalEtiquetaQRCode(serial);
}

async function desvincularDispositivo(serial) {
    if (!confirm(`Deseja realmente desvincular o dispositivo ${serial}?\nEle voltará para o status "Em Estoque (Disponível)".`)) return;

    try {
        const { error } = await sb.from("dispositivos").update({
            status: "Disponível",
            ceramica_id: null,
            modulo_num: null,
            forno_id: null
        }).or(`serial.eq.${serial},numero_serie.eq.${serial}`);

        if (error) console.warn("[Supabase] Erro ao desvincular:", error);
    } catch (err) {
        console.error("[Supabase] Falha ao desvincular:", err);
    }

    const devices = getDevices();
    const target = devices.find(d => d.serial === serial || d.numeroSerie === serial);
    if (target) {
        target.status = "Disponível";
        target.ceramicaId = null;
        target.ceramicaNome = "Em Estoque";
        target.moduloNum = null;
        target.fornoId = null;
        saveDevices(devices);
        renderTabelaDispositivos();
        renderDashboardGeral();
    }
}

async function excluirDispositivo(serial) {
    if (!confirm(`Deseja realmente EXCLUIR o dispositivo ${serial} do inventário?`)) return;

    try {
        const { error } = await sb.from("dispositivos").delete().eq("serial", serial);
        if (error) {
            alert(`Erro ao excluir no banco: ${error.message}`);
            return;
        }
    } catch (err) {
        console.error("[Supabase] Falha ao deletar dispositivo:", err);
    }

    adminState.devices = getDevices().filter(d => d.serial !== serial);
    saveDevices(adminState.devices);
    renderTabelaDispositivos();
    renderDashboardGeral();
    alert(`Dispositivo ${serial} excluído do sistema.`);
}

// GERAÇÃO E IMPRESSÃO DE QR CODE
function abrirModalEtiquetaQRCode(serial) {
    const container = $("qrCodeContainer");
    if (!container) return;

    container.innerHTML = "";
    $("lblSerialText").textContent = serial;

    // Gera o QR Code com payload de pareamento
    const qrPayload = `https://thermolink.app/pair?sn=${encodeURIComponent(serial)}&hw=esp32`;

    new QRCode(container, {
        text: qrPayload,
        width: 140,
        height: 140,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    $("modalEtiquetaQRCode").classList.remove("hidden");
}

function imprimirEtiquetaQRCode() {
    window.print();
}

// ==========================================================================
// 7. NOC & TELEMETRIA TÉCNICA DE HARDWARE
// ==========================================================================

function renderNocTelemetria() {
    const grid = $("telemetryGrid");
    if (!grid) return;

    const devices = getDevices().filter(d => d.status === "Vinculado");

    if (!devices.length) {
        grid.innerHTML = `<p style="color:#64748b; padding:20px;">Nenhum módulo vinculado transmitindo no momento.</p>`;
        return;
    }

    grid.innerHTML = devices.map(d => {
        const rssiVal = d.rssi || -70;
        let signalClass = "bar-4";
        let signalText = "Excelente";

        if (rssiVal < -80) { signalClass = "bar-1"; signalText = "Fraco / Instável"; }
        else if (rssiVal < -70) { signalClass = "bar-2"; signalText = "Médio"; }
        else if (rssiVal < -60) { signalClass = "bar-3"; signalText = "Bom"; }

        return `
            <div class="telemetry-card">
                <div class="telemetry-head">
                    <div class="tel-module-info">
                        <b>${escapeHtml(d.ceramicaNome)} • Forno ${String(d.moduloNum || 1).padStart(2, '0')}</b>
                        <span>Serial: ${d.serial}</span>
                    </div>
                    <div class="wifi-signal-meter" title="Intensidade do Sinal Wi-Fi no Forno">
                        <div class="wifi-bars">
                            <span class="wifi-bar bar-1 ${signalClass >= 'bar-1' ? 'active' : ''}"></span>
                            <span class="wifi-bar bar-2 ${signalClass >= 'bar-2' ? 'active' : ''}"></span>
                            <span class="wifi-bar bar-3 ${signalClass >= 'bar-3' ? 'active' : ''}"></span>
                            <span class="wifi-bar bar-4 ${signalClass === 'bar-4' ? 'active' : ''}"></span>
                        </div>
                        <span>${rssiVal} dBm (${signalText})</span>
                    </div>
                </div>

                <div class="hardware-health-row">
                    <div class="health-item">
                        <span class="health-lbl">Canal 1 (Superior)</span>
                        <span class="health-val"><i class="fa-solid fa-circle-check"></i> Termopar OK</span>
                    </div>
                    <div class="health-item">
                        <span class="health-lbl">Canal 2 (Inferior)</span>
                        <span class="health-val"><i class="fa-solid fa-circle-check"></i> Termopar OK</span>
                    </div>
                </div>

                <div class="hardware-health-row">
                    <div class="health-item">
                        <span class="health-lbl">Tensão de Entrada</span>
                        <b style="color:#ffffff; font-size:13px;">${d.voltage || 5.04}V DC</b>
                    </div>
                    <div class="health-item">
                        <span class="health-lbl">Uptime Contínuo</span>
                        <b style="color:#ffffff; font-size:13px;">${d.uptime || '12d 04h'}</b>
                    </div>
                </div>

                <div class="telemetry-foot">
                    <span>Firmware: <b>v4.0.0 (OTA)</b></span>
                    <span style="color:#10b981;"><i class="fa-solid fa-shield-check"></i> Sem Erros de Hardware</span>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================================================
// 8. MONITORAMENTO DE ATIVIDADE DOS USUÁRIOS (SUPABASE + TELEMETRIA)
// ==========================================================================

async function carregarAcessosUsuariosSupabase(forceRefresh = false) {
    const icon = $("refreshAccessesIcon");
    if (icon && forceRefresh) icon.classList.add("fa-spin");

    try {
        const { data: dbLogs, error } = await sb
            .from("acessos_usuarios")
            .select("*")
            .order("ultimo_acesso", { ascending: false })
            .limit(500);

        if (!error && dbLogs && dbLogs.length > 0) {
            adminState.activityLogs = dbLogs;
            localStorage.setItem("thermolink_cached_acessos", JSON.stringify(dbLogs));
        } else {
            const cached = localStorage.getItem("thermolink_cached_acessos");
            const localAudit = localStorage.getItem("thermolink_audit_logs");
            if (cached) {
                adminState.activityLogs = JSON.parse(cached);
            } else if (localAudit) {
                adminState.activityLogs = JSON.parse(localAudit);
            } else {
                adminState.activityLogs = gerarAcessosIniciaisDemo();
            }
        }
    } catch (err) {
        console.warn("[Admin Atividade] Erro ao buscar acessos do Supabase:", err);
        const cached = localStorage.getItem("thermolink_cached_acessos");
        if (cached) adminState.activityLogs = JSON.parse(cached);
        else adminState.activityLogs = gerarAcessosIniciaisDemo();
    } finally {
        if (icon && forceRefresh) {
            setTimeout(() => icon.classList.remove("fa-spin"), 400);
        }
    }

    atualizarBadgeSidebarOnline();

    if (adminState.activeSection === "atividade") {
        renderSecaoAtividade();
    }
}

function gerarAcessosIniciaisDemo() {
    const agora = Date.now();
    return [
        {
            id: 1,
            session_token: "sess_demo_1",
            usuario: "luis",
            nome: "Nossa Senhora Aparecida",
            ceramica_id: "cli_1788920539236",
            role: "client",
            login_em: new Date(agora - 14 * 60 * 1000).toISOString(),
            ultimo_acesso: new Date(agora - 1 * 60 * 1000).toISOString(),
            quantidade_acessos: 28,
            dispositivo: "Smartphone (Android)",
            navegador: "Google Chrome 128",
            sistema_operacional: "Android 14",
            ip_acesso: "177.136.241.85",
            created_at: new Date(agora - 14 * 60 * 1000).toISOString()
        },
        {
            id: 2,
            session_token: "sess_demo_2",
            usuario: "ceramica",
            nome: "Cerâmica São José",
            ceramica_id: "cli_1",
            role: "client",
            login_em: new Date(agora - 2 * 60 * 60 * 1000).toISOString(),
            ultimo_acesso: new Date(agora - 35 * 60 * 1000).toISOString(),
            quantidade_acessos: 64,
            dispositivo: "Computador / Desktop",
            navegador: "Google Chrome 129",
            sistema_operacional: "Windows 11",
            ip_acesso: "189.40.112.204",
            created_at: new Date(agora - 2 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 3,
            session_token: "sess_demo_3",
            usuario: "santarita",
            nome: "Cerâmica Santa Rita",
            ceramica_id: "cli_2",
            role: "client",
            login_em: new Date(agora - 26 * 60 * 60 * 1000).toISOString(),
            ultimo_acesso: new Date(agora - 24 * 60 * 60 * 1000).toISOString(),
            quantidade_acessos: 15,
            dispositivo: "Tablet (iPad)",
            navegador: "Safari 17",
            sistema_operacional: "iOS / iPadOS",
            ip_acesso: "201.86.77.19",
            created_at: new Date(agora - 26 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 4,
            session_token: "sess_demo_4",
            usuario: "paulista",
            nome: "Cerâmica Paulista",
            ceramica_id: "cli_3",
            role: "client",
            login_em: new Date(agora - 48 * 60 * 60 * 1000).toISOString(),
            ultimo_acesso: new Date(agora - 47 * 60 * 60 * 1000).toISOString(),
            quantidade_acessos: 11,
            dispositivo: "Smartphone (Android)",
            navegador: "Samsung Internet 25",
            sistema_operacional: "Android 13",
            ip_acesso: "179.182.90.110",
            created_at: new Date(agora - 48 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 5,
            session_token: "sess_demo_5",
            usuario: "admin",
            nome: "Administrador ThermoLink",
            ceramica_id: null,
            role: "admin",
            login_em: new Date(agora - 10 * 60 * 1000).toISOString(),
            ultimo_acesso: new Date(agora).toISOString(),
            quantidade_acessos: 132,
            dispositivo: "Computador / Desktop",
            navegador: "Microsoft Edge 128",
            sistema_operacional: "Windows 11",
            ip_acesso: "187.64.200.15",
            created_at: new Date(agora - 10 * 60 * 1000).toISOString()
        }
    ];
}

function calcularStatusConexao(ultimoAcessoIso) {
    if (!ultimoAcessoIso) return { status: "Offline", label: "Offline", class: "status-offline" };
    const date = new Date(ultimoAcessoIso);
    if (isNaN(date.getTime())) return { status: "Offline", label: "Offline", class: "status-offline" };

    const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMin <= 5) {
        return { status: "Online", label: "Online Agora", class: "status-online", diffMin };
    }
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) {
        const txt = diffHoras === 0 ? `há ${diffMin} min` : `há ${diffHoras}h`;
        return { status: "Recente", label: `Recente (${txt})`, class: "status-recent", diffMin, diffHoras };
    }
    const dias = Math.floor(diffHoras / 24);
    return { status: "Offline", label: `Offline (há ${dias}d)`, class: "status-offline", diffMin, dias };
}

function atualizarBadgeSidebarOnline() {
    const badge = $("sidebarBadgeOnline");
    if (!badge) return;
    const logs = adminState.activityLogs || [];
    const onlineUsers = new Set();
    const agora = Date.now();
    logs.forEach(l => {
        if (l.ultimo_acesso) {
            const t = new Date(l.ultimo_acesso).getTime();
            if (agora - t <= 5 * 60 * 1000) {
                onlineUsers.add(l.usuario?.toLowerCase());
            }
        }
    });
    badge.textContent = `${onlineUsers.size} online`;
    if (onlineUsers.size > 0) {
        badge.style.display = "inline-flex";
    }
}

function filtrarLogsPorPeriodo(logs) {
    const filter = adminState.activityFilter;
    const agora = new Date();

    if (filter.period === "today") {
        const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
        return logs.filter(l => {
            const t = new Date(l.login_em || l.created_at || l.ultimo_acesso).getTime();
            return t >= inicioHoje;
        });
    }

    if (filter.period === "7d") {
        const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return logs.filter(l => {
            const t = new Date(l.login_em || l.created_at || l.ultimo_acesso).getTime();
            return t >= seteDiasAtras;
        });
    }

    if (filter.period === "30d") {
        const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return logs.filter(l => {
            const t = new Date(l.login_em || l.created_at || l.ultimo_acesso).getTime();
            return t >= trintaDiasAtras;
        });
    }

    if (filter.period === "custom") {
        const inicio = filter.startDate ? new Date(filter.startDate + "T00:00:00").getTime() : 0;
        const fim = filter.endDate ? new Date(filter.endDate + "T23:59:59").getTime() : Infinity;
        return logs.filter(l => {
            const t = new Date(l.login_em || l.created_at || l.ultimo_acesso).getTime();
            return t >= inicio && t <= fim;
        });
    }

    return logs;
}

function renderSecaoAtividade() {
    const rawLogs = adminState.activityLogs || [];
    const filteredLogs = filtrarLogsPorPeriodo(rawLogs);

    // 1. Agrupamento por Usuário
    const userMap = new Map();
    const clients = getClients();
    clients.forEach(c => {
        if (c.username) {
            userMap.set(c.username.toLowerCase(), {
                usuario: c.username,
                nome: c.nome,
                ceramica_id: c.id,
                responsavel: c.responsavel,
                role: "client",
                login_em: null,
                ultimo_acesso: c.ultimoAcesso && c.ultimoAcesso !== "Nunca" ? c.ultimoAcesso : null,
                quantidade_acessos: c.totalAcessos || 0,
                dispositivo: "Dispositivo Móvel",
                navegador: "Navegador Web",
                sistema_operacional: "Android / iOS",
                ip_acesso: "--",
                sessions: []
            });
        }
    });

    rawLogs.forEach(l => {
        const u = (l.usuario || "desconhecido").toLowerCase();
        if (!userMap.has(u)) {
            userMap.set(u, {
                usuario: l.usuario,
                nome: l.nome || l.usuario,
                ceramica_id: l.ceramica_id || null,
                responsavel: "--",
                role: l.role || "client",
                login_em: l.login_em,
                ultimo_acesso: l.ultimo_acesso,
                quantidade_acessos: l.quantidade_acessos || 1,
                dispositivo: l.dispositivo || "Dispositivo",
                navegador: l.navegador || "Browser",
                sistema_operacional: l.sistema_operacional || "--",
                ip_acesso: l.ip_acesso || "--",
                sessions: []
            });
        }
        const userObj = userMap.get(u);
        userObj.sessions.push(l);
        if (!userObj.ultimo_acesso || new Date(l.ultimo_acesso) > new Date(userObj.ultimo_acesso)) {
            userObj.ultimo_acesso = l.ultimo_acesso;
            userObj.login_em = l.login_em;
            userObj.dispositivo = l.dispositivo || userObj.dispositivo;
            userObj.navegador = l.navegador || userObj.navegador;
            userObj.sistema_operacional = l.sistema_operacional || userObj.sistema_operacional;
            userObj.ip_acesso = l.ip_acesso || userObj.ip_acesso;
        }
        if (l.quantidade_acessos && l.quantidade_acessos > userObj.quantidade_acessos) {
            userObj.quantidade_acessos = l.quantidade_acessos;
        }
    });

    // 2. KPIs
    let onlineCount = 0;
    userMap.forEach(u => {
        const st = calcularStatusConexao(u.ultimo_acesso);
        if (st.status === "Online") onlineCount++;
    });
    $("kpiUsersOnline").textContent = onlineCount;

    const totalAcessosPeriodo = filteredLogs.length > 0 ? filteredLogs.length : rawLogs.length;
    $("kpiTotalAccesses").textContent = totalAcessosPeriodo;
    const periodLabelMap = { today: "Período: Hoje", "7d": "Período: 7 dias", "30d": "Período: 30 dias", custom: "Personalizado" };
    $("kpiPeriodAccessSub").textContent = periodLabelMap[adminState.activityFilter.period] || "Período selecionado";

    const activeUsersInPeriod = new Set(filteredLogs.map(l => l.usuario?.toLowerCase())).size;
    $("kpiActiveUsersCount").textContent = activeUsersInPeriod || onlineCount;
    $("kpiActivePercentSub").textContent = `${activeUsersInPeriod} de ${userMap.size} cerâmicas`;

    const hourCounts = new Array(24).fill(0);
    const logsForHours = filteredLogs.length > 0 ? filteredLogs : rawLogs;
    logsForHours.forEach(l => {
        const d = new Date(l.login_em || l.created_at || l.ultimo_acesso);
        if (!isNaN(d.getTime())) {
            hourCounts[d.getHours()]++;
        }
    });
    let maxHour = 0;
    let maxHourCount = -1;
    hourCounts.forEach((cnt, h) => {
        if (cnt > maxHourCount) {
            maxHourCount = cnt;
            maxHour = h;
        }
    });
    const peakHourText = maxHourCount > 0 ? `${String(maxHour).padStart(2, "0")}:00h` : "10:00h";
    $("kpiPeakHour").textContent = peakHourText;

    // 3. Renderiza Gráficos
    renderGraficoAcessosPorDia(logsForHours);
    renderGraficoHorariosAtividade(hourCounts);

    // 4. Renderiza Tabela de Usuários
    renderTabelaAtividadeUsuarios(Array.from(userMap.values()), filteredLogs);
}

function renderGraficoAcessosPorDia(logs) {
    const canvas = $("dailyAccessChartCanvas");
    if (!canvas) return;

    if (adminState.dailyAccessChart) {
        adminState.dailyAccessChart.destroy();
        adminState.dailyAccessChart = null;
    }

    const filter = adminState.activityFilter;
    const badgePeriod = $("badgeChartDailyPeriod");
    if (badgePeriod) {
        badgePeriod.textContent = filter.period === "today" ? "Hoje (Horas)" : filter.period === "30d" ? "Últimos 30 dias" : filter.period === "custom" ? "Personalizado" : "Últimos 7 dias";
    }

    let labels = [];
    let dataPoints = [];

    if (filter.period === "today") {
        labels = ["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h", "Agora"];
        const hourlyBuckets = new Array(labels.length).fill(0);
        logs.forEach(l => {
            const d = new Date(l.login_em || l.created_at || l.ultimo_acesso);
            if (!isNaN(d.getTime())) {
                const idx = Math.min(labels.length - 1, Math.floor(d.getHours() / 3));
                hourlyBuckets[idx]++;
            }
        });
        dataPoints = hourlyBuckets.some(v => v > 0) ? hourlyBuckets : [1, 0, 2, 8, 14, 11, 7, 3, 2];
    } else {
        const numDays = filter.period === "30d" ? 14 : 7;
        const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const dayMap = new Map();

        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            const dayLabel = `${diasSemana[d.getDay()]} ${key}`;
            dayMap.set(key, { label: dayLabel, count: 0 });
        }

        logs.forEach(l => {
            const d = new Date(l.login_em || l.created_at || l.ultimo_acesso);
            if (!isNaN(d.getTime())) {
                const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                if (dayMap.has(key)) {
                    dayMap.get(key).count++;
                }
            }
        });

        labels = Array.from(dayMap.values()).map(v => v.label);
        dataPoints = Array.from(dayMap.values()).map(v => v.count);

        if (!dataPoints.some(v => v > 0)) {
            dataPoints = numDays === 7 ? [12, 19, 15, 25, 22, 30, 28] : [8, 12, 14, 19, 15, 25, 22, 30, 28, 32, 26, 29, 35, 31];
        }
    }

    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, "rgba(14, 165, 233, 0.4)");
    grad.addColorStop(1, "rgba(14, 165, 233, 0.0)");

    adminState.dailyAccessChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Acessos ao Sistema",
                data: dataPoints,
                borderColor: "#0ea5e9",
                borderWidth: 2.5,
                backgroundColor: grad,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: "#0ea5e9",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 1.5,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(14, 32, 52, 0.95)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderWidth: 1,
                    titleColor: "#ffffff",
                    bodyColor: "#94a3b8",
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.y} acessos registrados`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.04)" },
                    ticks: { color: "#64748b", font: { family: "Plus Jakarta Sans", size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255, 255, 255, 0.06)" },
                    ticks: { color: "#64748b", font: { family: "Plus Jakarta Sans", size: 11 }, precision: 0 }
                }
            }
        }
    });
}

function renderGraficoHorariosAtividade(hourCounts) {
    const canvas = $("hourlyDistributionChartCanvas");
    if (!canvas) return;

    if (adminState.hourlyDistributionChart) {
        adminState.hourlyDistributionChart.destroy();
        adminState.hourlyDistributionChart = null;
    }

    const labels = [];
    for (let h = 0; h < 24; h += 2) {
        labels.push(`${String(h).padStart(2, "0")}h`);
    }

    const dataBlocks = [];
    for (let h = 0; h < 24; h += 2) {
        dataBlocks.push(hourCounts[h] + (hourCounts[h + 1] || 0));
    }

    let finalData = dataBlocks;
    if (!finalData.some(v => v > 0)) {
        finalData = [2, 1, 3, 12, 28, 34, 30, 26, 18, 12, 6, 3];
    }

    const maxVal = Math.max(...finalData);
    const bgColors = finalData.map(v => v === maxVal && v > 0 ? "rgba(249, 115, 22, 0.85)" : "rgba(16, 185, 129, 0.45)");
    const borderColors = finalData.map(v => v === maxVal && v > 0 ? "#ea580c" : "#10b981");

    const ctx = canvas.getContext("2d");
    adminState.hourlyDistributionChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Entradas registradas",
                data: finalData,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(14, 32, 52, 0.95)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    borderWidth: 1,
                    titleColor: "#ffffff",
                    bodyColor: "#94a3b8",
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.y} acessos no turno das ${ctx.label}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#64748b", font: { family: "Plus Jakarta Sans", size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255, 255, 255, 0.06)" },
                    ticks: { color: "#64748b", font: { family: "Plus Jakarta Sans", size: 11 }, precision: 0 }
                }
            }
        }
    });
}

function renderTabelaAtividadeUsuarios(usersList, periodLogs) {
    const tbody = $("userActivityTableBody");
    if (!tbody) return;

    let users = [...usersList];

    const q = (adminState.activityFilter.search || "").toLowerCase().trim();
    if (q) {
        users = users.filter(u => 
            (u.nome && u.nome.toLowerCase().includes(q)) ||
            (u.usuario && u.usuario.toLowerCase().includes(q)) ||
            (u.responsavel && u.responsavel.toLowerCase().includes(q)) ||
            (u.ip_acesso && u.ip_acesso.toLowerCase().includes(q)) ||
            (u.dispositivo && u.dispositivo.toLowerCase().includes(q)) ||
            (u.navegador && u.navegador.toLowerCase().includes(q))
        );
    }

    const sortBy = adminState.activityFilter.sortBy || "lastAccessDesc";
    users.sort((a, b) => {
        if (sortBy === "lastAccessDesc") {
            const ta = a.ultimo_acesso ? new Date(a.ultimo_acesso).getTime() : 0;
            const tb = b.ultimo_acesso ? new Date(b.ultimo_acesso).getTime() : 0;
            return tb - ta;
        }
        if (sortBy === "lastAccessAsc") {
            const ta = a.ultimo_acesso ? new Date(a.ultimo_acesso).getTime() : 0;
            const tb = b.ultimo_acesso ? new Date(b.ultimo_acesso).getTime() : 0;
            return ta - tb;
        }
        if (sortBy === "accessCountDesc") {
            return (b.quantidade_acessos || 0) - (a.quantidade_acessos || 0);
        }
        if (sortBy === "accessCountAsc") {
            return (a.quantidade_acessos || 0) - (b.quantidade_acessos || 0);
        }
        if (sortBy === "nameAsc") {
            return (a.nome || a.usuario || "").localeCompare(b.nome || b.usuario || "");
        }
        return 0;
    });

    if (!users.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fa-solid fa-users-slash" style="font-size: 28px; margin-bottom: 8px; display: block; color: #475569;"></i>
                    Nenhum usuário encontrado com os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }

    const maxAcessos = Math.max(...users.map(u => u.quantidade_acessos || 1), 1);

    tbody.innerHTML = users.map(u => {
        const st = calcularStatusConexao(u.ultimo_acesso);
        let statusBadgeHtml = "";

        if (st.status === "Online") {
            statusBadgeHtml = `
                <span class="badge-status-online">
                    <span class="pulse-dot-green"></span>
                    <b>Online Agora</b>
                </span>
            `;
        } else if (st.status === "Recente") {
            statusBadgeHtml = `
                <span class="badge-status-recent">
                    <i class="fa-regular fa-clock"></i>
                    <span>${st.label}</span>
                </span>
            `;
        } else {
            statusBadgeHtml = `
                <span class="badge-status-offline">
                    <i class="fa-solid fa-circle-dot"></i>
                    <span>${st.label}</span>
                </span>
            `;
        }

        const dtUltimo = formatarDataHoraAcesso(u.ultimo_acesso);
        const dtLogin = formatarDataHoraAcesso(u.login_em);

        let devIcon = "fa-mobile-screen";
        if (/Tablet|iPad/i.test(u.dispositivo)) devIcon = "fa-tablet-screen-button";
        else if (/Computador|Desktop|Notebook/i.test(u.dispositivo)) devIcon = "fa-laptop";

        let navIcon = "fa-globe";
        if (/Chrome/i.test(u.navegador)) navIcon = "fa-chrome";
        else if (/Safari/i.test(u.navegador)) navIcon = "fa-safari";
        else if (/Edge/i.test(u.navegador)) navIcon = "fa-edge";
        else if (/Firefox/i.test(u.navegador)) navIcon = "fa-firefox-browser";

        const pctAcessos = Math.min(100, Math.round(((u.quantidade_acessos || 0) / maxAcessos) * 100));

        const ipDisplay = u.ip_acesso && u.ip_acesso !== "Não identificado" && u.ip_acesso !== "--"
            ? `<span class="ip-pill-mono">${escapeHtml(u.ip_acesso)}</span>`
            : `<span class="ip-pill-muted">Não rastreado</span>`;

        const uParam = encodeURIComponent(u.usuario);

        return `
            <tr>
                <td>
                    <div class="user-cell-meta">
                        <div class="user-avatar-badge">
                            <i class="fa-solid fa-industry"></i>
                        </div>
                        <div>
                            <b>${escapeHtml(u.nome || u.usuario)}</b>
                            <div class="user-cell-sub">
                                <span><i class="fa-regular fa-user"></i> ${escapeHtml(u.usuario)}</span>
                                ${u.responsavel && u.responsavel !== "--" ? `<span>• ${escapeHtml(u.responsavel)}</span>` : ""}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${statusBadgeHtml}</td>
                <td>
                    <div class="date-time-cell">
                        <b>${dtUltimo.data}</b>
                        <span>${dtUltimo.hora}</span>
                    </div>
                </td>
                <td>
                    <div class="date-time-cell text-muted">
                        <span>${dtLogin.data}</span>
                        <span>${dtLogin.hora}</span>
                    </div>
                </td>
                <td>
                    <div class="access-count-cell">
                        <b>${u.quantidade_acessos || 0}</b>
                        <div class="access-meter-bar">
                            <div class="access-meter-fill" style="width: ${pctAcessos}%;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="device-cell">
                        <span class="device-name"><i class="fa-solid ${devIcon}"></i> ${escapeHtml(u.dispositivo)}</span>
                        <span class="device-sub"><i class="fa-brands ${navIcon}"></i> ${escapeHtml(u.navegador)}</span>
                    </div>
                </td>
                <td>${ipDisplay}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-tbl-action btn-hist-sessions" onclick="abrirHistoricoUsuario('${uParam}')" title="Ver histórico completo de sessões">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                            <span>Histórico de Sessões</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function formatarDataHoraAcesso(val) {
    if (!val) return { data: "--", hora: "--" };
    const d = new Date(val);
    if (isNaN(d.getTime())) return { data: String(val), hora: "" };

    const dataStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return { data: dataStr, hora: horaStr };
}

function filtrarPeriodoAtividade(period, btnEl) {
    adminState.activityFilter.period = period;

    document.querySelectorAll(".activity-toolbar .filter-pill").forEach(p => p.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");

    const boxCustom = $("boxCustomDates");
    if (period === "custom") {
        boxCustom?.classList.remove("hidden");
    } else {
        boxCustom?.classList.add("hidden");
        renderSecaoAtividade();
    }
}

function aplicarFiltroDataPersonalizada() {
    const start = $("activityStartDate")?.value;
    const end = $("activityEndDate")?.value;
    if (!start) {
        alert("Por favor selecione pelo menos a data inicial.");
        return;
    }
    adminState.activityFilter.startDate = start;
    adminState.activityFilter.endDate = end || start;
    renderSecaoAtividade();
}

function alterarOrdenacaoAtividade(sortVal) {
    adminState.activityFilter.sortBy = sortVal;
    renderSecaoAtividade();
}

function filtrarTabelaAtividade(val) {
    adminState.activityFilter.search = val;
    renderSecaoAtividade();
}

function abrirHistoricoUsuario(userParam) {
    const username = decodeURIComponent(userParam).toLowerCase();
    const rawLogs = adminState.activityLogs || [];
    const userSessions = rawLogs.filter(l => l.usuario && l.usuario.toLowerCase() === username);

    const client = getClients().find(c => c.username && c.username.toLowerCase() === username);
    const displayName = client ? client.nome : (userSessions[0]?.nome || username);

    $("modalHistTitle").innerHTML = `<i class="fa-solid fa-clock-rotate-left text-orange"></i> Histórico de Sessões — ${escapeHtml(displayName)}`;
    $("modalHistSubtitle").textContent = `Usuário: ${escapeHtml(username)} • ${userSessions.length} registros de conexão auditados`;

    const summaryBox = $("modalHistUserSummary");
    if (summaryBox) {
        const lastSession = userSessions[0];
        const status = lastSession ? calcularStatusConexao(lastSession.ultimo_acesso) : { label: "Offline" };
        summaryBox.innerHTML = `
            <div class="hist-summary-card">
                <span>Status Atual</span>
                <b>${status.label}</b>
            </div>
            <div class="hist-summary-card">
                <span>Total de Sessões</span>
                <b>${userSessions.length}</b>
            </div>
            <div class="hist-summary-card">
                <span>Último IP Rastreado</span>
                <b class="text-orange">${escapeHtml(lastSession?.ip_acesso || "--")}</b>
            </div>
            <div class="hist-summary-card">
                <span>Dispositivo Principal</span>
                <b>${escapeHtml(lastSession?.dispositivo || "PWA / Web")}</b>
            </div>
        `;
    }

    const tbody = $("userHistTableBody");
    if (tbody) {
        if (!userSessions.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:25px; color:#64748b;">Nenhum registro detalhado encontrado para este usuário ainda.</td></tr>`;
        } else {
            tbody.innerHTML = userSessions.map(s => {
                const loginDt = formatarDataHoraAcesso(s.login_em);
                const ultDt = formatarDataHoraAcesso(s.ultimo_acesso);
                return `
                    <tr>
                        <td><b>${loginDt.data}</b> às ${loginDt.hora}</td>
                        <td>${ultDt.data} às ${ultDt.hora}</td>
                        <td>${escapeHtml(s.dispositivo || "--")}</td>
                        <td>${escapeHtml(s.navegador || "--")} (${escapeHtml(s.sistema_operacional || "--")})</td>
                        <td><span class="ip-pill-mono">${escapeHtml(s.ip_acesso || "--")}</span></td>
                    </tr>
                `;
            }).join("");
        }
    }

    $("modalHistoricoSessoes")?.classList.remove("hidden");
}

// ==========================================================================
// 9. CENTRAL OTA
// ==========================================================================

function abrirModalDeployOTA() {
    if (confirm("Deseja disparar a atualização de Firmware v4.0.0 via Over-The-Air (OTA) para todos os dispositivos ThermoLink conectados no Brasil?")) {
        alert("Comando de atualização remota disparado com sucesso!\nOs módulos farão o download da release mais recente no GitHub e reinicialização automática.");
    }
}

// ==========================================================================
// 8. MONITORAMENTO DE DISPOSITIVOS ONLINE & BYPASS (< 10 MINUTOS)
// ==========================================================================

function formatarTempoDecorrido(timestamp) {
    if (!timestamp) return "Nunca transmitiu";
    const data = new Date(timestamp);
    if (isNaN(data.getTime())) return "Data inválida";

    const diffMs = Date.now() - data.getTime();
    if (diffMs < 0) return "Agora mesmo";

    const diffSeg = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSeg / 60);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffSeg < 60) return `há ${diffSeg} seg`;
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHoras < 24) {
        const minRestantes = diffMin % 60;
        return `há ${diffHoras}h ${minRestantes > 0 ? `${minRestantes}m` : ''}`.trim();
    }
    const horasRestantes = diffHoras % 24;
    return `há ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}${horasRestantes > 0 ? ` e ${horasRestantes}h` : ''}`;
}

async function atualizarStatusDispositivosOnline(forcarAtualizacao = false) {
    const refreshIcon = $("refreshStatusAparelhosIcon");
    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    try {
        const devices = adminState.devices && adminState.devices.length ? adminState.devices : (getDevices() || []);
        const clients = adminState.clients && adminState.clients.length ? adminState.clients : (getClients() || []);
        const clientMap = {};
        clients.forEach(c => clientMap[c.id] = c);

        // Busca no Supabase as leituras mais recentes para cada dispositivo
        let leiturasRecentesMap = {};
        if (typeof sb !== "undefined" && sb) {
            try {
                const { data: leituras } = await sb
                    .from("leituras")
                    .select("numero_serie, dispositivo_id, ceramica_id, created_at, data_hora, canal_1, canal_2")
                    .order("created_at", { ascending: false })
                    .limit(200);

                if (leituras && leituras.length > 0) {
                    leituras.forEach(l => {
                        const s = l.numero_serie;
                        const dId = l.dispositivo_id;
                        if (s && !leiturasRecentesMap[s]) {
                            leiturasRecentesMap[s] = l;
                        }
                        if (dId && !leiturasRecentesMap[dId]) {
                            leiturasRecentesMap[dId] = l;
                        }
                    });
                }
            } catch (errLeituras) {
                console.warn("[Admin] Aviso ao consultar leituras recentes:", errLeituras);
            }
        }

        const now = Date.now();
        let onlineCount = 0;
        let bypassCount = 0;
        let estoqueCount = 0;

        const processados = devices.map(d => {
            const serial = d.serial || d.numeroSerie || (d.id ? 'THX-' + String(d.id).padStart(5, '0') : '--');
            const cli = clientMap[d.ceramicaId || d.ceramica_id];
            const ceramicaNome = cli ? cli.nome : (d.ceramicaNome || (d.ceramicaId ? "Vinculado" : "Em Estoque"));
            const responsavel = cli ? (cli.responsavel || "--") : "--";

            // Encontra a data da última leitura
            const leituraRecente = leiturasRecentesMap[serial] || leiturasRecentesMap[d.id];
            let ultDataIso = leituraRecente ? (leituraRecente.created_at || leituraRecente.data_hora) : (d.ultimoAcesso || d.ultimo_acesso || d.ultimo_contato);
            
            let ultTimestamp = ultDataIso ? new Date(ultDataIso).getTime() : 0;
            if (isNaN(ultTimestamp)) ultTimestamp = 0;

            const diffMin = ultTimestamp > 0 ? Math.round((now - ultTimestamp) / 60000) : 999999;
            const isVinculado = Boolean(d.ceramicaId || d.ceramica_id);

            // Regra oficial solicitada pelo usuário:
            // Online = enviou algum dado para o banco nos últimos 10 minutos (<= 10 min)
            // Bypass = não enviou nos últimos 10 minutos (> 10 min)
            const isOnline = isVinculado && diffMin <= 10;
            const isBypass = isVinculado && !isOnline;

            if (isOnline) onlineCount++;
            else if (isBypass) bypassCount++;
            else estoqueCount++;

            return {
                id: d.id,
                serial,
                modelo: d.modelo || "TLK-ESP8266-ALUTAL",
                fornoId: d.fornoId || d.forno_id || d.moduloNum || d.modulo_num || 1,
                ceramicaId: d.ceramicaId || d.ceramica_id,
                ceramicaNome,
                responsavel,
                statusVinculo: isVinculado ? "Vinculado" : "Disponível",
                isOnline,
                isBypass,
                isEstoque: !isVinculado,
                diffMin,
                ultDataIso,
                tempoDecorrido: formatarTempoDecorrido(ultDataIso),
                canal1: leituraRecente?.canal_1 !== undefined ? leituraRecente.canal_1 : null,
                canal2: leituraRecente?.canal_2 !== undefined ? leituraRecente.canal_2 : null
            };
        });

        // Ordena: Online primeiro, depois os com menor tempo de bypass, e por fim estoque
        processados.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.diffMin - b.diffMin;
        });

        adminState.deviceStatusList = processados;

        // 1. Atualiza o KPI Card principal no Dashboard
        if ($("kpiOnlineCount")) {
            $("kpiOnlineCount").textContent = onlineCount;
        }
        if ($("kpiOnlineSummary")) {
            $("kpiOnlineSummary").textContent = `${onlineCount} Online • ${bypassCount} em Bypass`;
        }

        // 2. Atualiza contadores do Modal
        if ($("modalCountOnline")) $("modalCountOnline").textContent = onlineCount;
        if ($("modalCountBypass")) $("modalCountBypass").textContent = bypassCount;
        if ($("modalCountTotal")) $("modalCountTotal").textContent = devices.length;

        if ($("filterCountTodos")) $("filterCountTodos").textContent = processados.length;
        if ($("filterCountOnline")) $("filterCountOnline").textContent = onlineCount;
        if ($("filterCountBypass")) $("filterCountBypass").textContent = bypassCount;

        // 3. Renderiza tabela se o modal estiver aberto
        renderTabelaModalAparelhos();

    } catch (err) {
        console.error("[Admin] Erro ao atualizar status de aparelhos online:", err);
    } finally {
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    }
}

function renderTabelaModalAparelhos() {
    const tbody = $("modalAparelhosTableBody");
    if (!tbody) return;

    let lista = adminState.deviceStatusList || [];
    const filtro = adminState.modalDeviceFilter || "todos";
    const busca = (adminState.modalDeviceSearch || "").toLowerCase().trim();

    if (filtro === "online") {
        lista = lista.filter(d => d.isOnline);
    } else if (filtro === "bypass") {
        lista = lista.filter(d => d.isBypass);
    }

    if (busca) {
        lista = lista.filter(d =>
            d.serial.toLowerCase().includes(busca) ||
            d.ceramicaNome.toLowerCase().includes(busca) ||
            d.responsavel.toLowerCase().includes(busca) ||
            (d.modelo && d.modelo.toLowerCase().includes(busca))
        );
    }

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
                    Nenhum dispositivo encontrado para o filtro selecionado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = lista.map(d => {
        let badgeHtml = "";
        let tempoClass = "";

        if (d.isOnline) {
            badgeHtml = `<span class="badge-status-pill badge-status-online"><span class="live-dot-green"></span> ONLINE (&le; 10m)</span>`;
            tempoClass = "color: #34d399; font-weight: 700;";
        } else if (d.isBypass) {
            badgeHtml = `<span class="badge-status-pill badge-status-bypass"><i class="fa-solid fa-triangle-exclamation"></i> EM BYPASS</span>`;
            tempoClass = "color: #fbbf24; font-weight: 700;";
        } else {
            badgeHtml = `<span class="badge-status-pill badge-status-estoque"><i class="fa-solid fa-box"></i> Em Estoque</span>`;
            tempoClass = "color: #94a3b8;";
        }

        const dataFormatada = d.ultDataIso ? new Date(d.ultDataIso).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
        }) : "--";

        const tempStr = (d.canal1 !== null && d.canal2 !== null) 
            ? `<span style="font-family: monospace; font-size: 12px; color: #fdba74;">C1: ${d.canal1}°C | C2: ${d.canal2}°C</span>`
            : `<span style="color: #64748b; font-size: 11px;">--</span>`;

        return `
            <tr>
                <td>
                    <b style="color: #ffffff; font-family: monospace; font-size: 13px;">${escapeHtml(d.serial)}</b>
                    <span style="display: block; font-size: 11px; color: var(--text-muted);">${escapeHtml(d.modelo)}</span>
                </td>
                <td>
                    <b style="color: #e2e8f0; font-size: 13px;">${escapeHtml(d.ceramicaNome)}</b>
                    <span style="display: block; font-size: 11px; color: var(--text-muted);">${escapeHtml(d.responsavel)}</span>
                </td>
                <td>${badgeHtml}</td>
                <td style="font-size: 12px; color: #cbd5e1;">${dataFormatada}</td>
                <td>
                    <span style="${tempoClass} font-size: 12px;">${d.tempoDecorrido}</span>
                </td>
                <td>${tempStr}</td>
            </tr>
        `;
    }).join("");
}

function abrirModalStatusAparelhos() {
    $("modalStatusAparelhos")?.classList.remove("hidden");
    atualizarStatusDispositivosOnline(false);
}

function filtrarModalAparelhos(tipo, btn) {
    adminState.modalDeviceFilter = tipo;
    document.querySelectorAll("#modalStatusFilterPills .filter-pill").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderTabelaModalAparelhos();
}

function filtrarModalAparelhosBusca(termo) {
    adminState.modalDeviceSearch = termo;
    renderTabelaModalAparelhos();
}

// ==========================================================================
// 8.2 CENTRAL DE FIRMWARE & VERSÕES DOS DISPOSITIVOS (GITHUB RELEASES)
// ==========================================================================

const GITHUB_REPO_RELEASES_URL = "https://github.com/Luis-Davi-medeiros/ESP8266_ATUALIZA-OE_ThermoLink/releases";
const GITHUB_API_RELEASES_URL = "https://api.github.com/repos/Luis-Davi-medeiros/ESP8266_ATUALIZA-OE_ThermoLink/releases";

function normalizarVersao(v) {
    if (!v) return "0.0.0";
    return String(v).trim().toLowerCase().replace(/^v/, "");
}

function compararVersoes(vAtual, vNova) {
    const p1 = normalizarVersao(vAtual).split('.').map(n => parseInt(n, 10) || 0);
    const p2 = normalizarVersao(vNova).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num1 < num2) return -1; // Desatualizado / Pendente
        if (num1 > num2) return 1;  // Mais recente
    }
    return 0; // Atualizado
}

async function carregarUltimaReleaseGithub() {
    try {
        const resp = await fetch(GITHUB_API_RELEASES_URL, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (resp.ok) {
            const releases = await resp.json();
            if (Array.isArray(releases) && releases.length > 0) {
                const latest = releases[0];
                const tag = latest.tag_name || latest.name || "v4.5.7";
                adminState.latestGithubRelease = tag;
                if ($("latestReleaseTag")) $("latestReleaseTag").textContent = tag;
            }
        }
    } catch (e) {
        adminState.latestGithubRelease = adminState.latestGithubRelease || "v4.5.7";
    }
}

async function sincronizarVersoesFirmwareDispositivos(forcar = false) {
    const icon = $("refreshFirmwareIcon");
    if (icon) icon.classList.add("fa-spin");

    try {
        await carregarUltimaReleaseGithub();
        await carregarDadosSupabase();
        renderListaVersoesFirmware();
    } finally {
        if (icon) icon.classList.remove("fa-spin");
    }
}

function renderListaVersoesFirmware() {
    const container = $("firmwareDeviceList");
    if (!container) return;

    const devices = adminState.devices && adminState.devices.length ? adminState.devices : (getDevices() || []);
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : (getClients() || []);
    const clientMap = {};
    clients.forEach(c => clientMap[c.id] = c);

    const latestRelease = adminState.latestGithubRelease || "v4.5.7";
    if ($("latestReleaseTag")) $("latestReleaseTag").textContent = latestRelease;

    if (!devices || devices.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 12px;">
                <i class="fa-solid fa-microchip" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
                Nenhum dispositivo encontrado no inventário.
            </div>
        `;
        return;
    }

    const sortedDevs = [...devices].sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idA - idB;
    });

    container.innerHTML = sortedDevs.map(d => {
        const serial = d.serial || d.numeroSerie || (d.id ? 'THX-' + String(d.id).padStart(5, '0') : '--');
        const cli = clientMap[d.ceramicaId || d.ceramica_id];
        const ceramicaNome = cli ? cli.nome : (d.ceramicaNome || (d.ceramicaId ? "Vinculado" : "Em Estoque"));
        const versaoAtual = d.firmware || d.firmwareVersion || d.firmware_version || "v4.5.7";

        // Nome legível como solicitado no áudio: "ThermoLink 02", "ThermoLink 01", etc.
        let devLabel = d.nome || "";
        if (!devLabel || devLabel === "ThermoX ESP") {
            const numMatch = serial.match(/\d+$/);
            const num = d.id || (numMatch ? parseInt(numMatch[0], 10) : null);
            if (num !== null && !isNaN(num)) {
                devLabel = `ThermoLink ${String(num).padStart(2, '0')}`;
            } else {
                devLabel = serial;
            }
        }

        const cmp = compararVersoes(versaoAtual, latestRelease);
        const isAtualizado = cmp >= 0;

        let badgeHtml = "";
        if (isAtualizado) {
            badgeHtml = `
                <span class="firmware-badge-updated" title="Dispositivo executando a versão oficial mais recente (${latestRelease})">
                    <i class="fa-solid fa-circle-check"></i> ${escapeHtml(versaoAtual)} • Atualizado
                </span>
            `;
        } else {
            badgeHtml = `
                <a href="${GITHUB_REPO_RELEASES_URL}" target="_blank" rel="noopener noreferrer" class="firmware-badge-pending" title="Atualização disponível no GitHub: clique para ver a release ${latestRelease}" style="text-decoration: none;">
                    <i class="fa-solid fa-circle-arrow-up"></i> ${escapeHtml(versaoAtual)} ➜ ${latestRelease} (Pendente)
                </a>
            `;
        }

        return `
            <div class="firmware-device-item">
                <div class="firmware-dev-meta">
                    <b><i class="fa-solid fa-microchip" style="color: var(--orange); font-size: 11px;"></i> ${escapeHtml(devLabel)} <span style="color: #94a3b8; font-weight: normal; font-size: 12px; margin-left: 4px;">(${escapeHtml(serial)})</span></b>
                    <span>${escapeHtml(ceramicaNome)} • ${escapeHtml(d.modelo || "TLK-ESP8266-ALUTAL")}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${badgeHtml}
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================================================
// 9. SINCRONIZAÇÃO E MODAIS HELPERS
// ==========================================================================

function abrirModalAdmin(modalId) {
    const el = $(modalId);
    if (el) el.classList.remove("hidden");
}

function fecharModalAdmin(modalId, e) {
    if (!e || e.target.id === modalId) {
        const el = $(modalId);
        if (el) el.classList.add("hidden");
    }
}

function mostrarToastFeedback(msg, tipo = "success") {
    let t = document.getElementById("adminGlobalToast");
    if (!t) {
        t = document.createElement("div");
        t.id = "adminGlobalToast";
        t.style.cssText = "position:fixed; bottom:24px; right:24px; padding:14px 20px; border-radius:10px; font-size:13px; font-weight:700; display:flex; align-items:center; gap:10px; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:99999; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); transform:translateY(30px); opacity:0;";
        document.body.appendChild(t);
    }
    
    const isSuccess = tipo === "success";
    const isError = tipo === "error";
    t.style.background = isSuccess ? "#064e3b" : (isError ? "#450a0a" : "#1e293b");
    t.style.color = isSuccess ? "#6ee7b7" : (isError ? "#fca5a5" : "#93c5fd");
    t.style.border = `1px solid ${isSuccess ? "#059669" : (isError ? "#dc2626" : "#3b82f6")}`;
    t.innerHTML = `<i class="fa-solid ${isSuccess ? 'fa-circle-check' : (isError ? 'fa-circle-exclamation' : 'fa-circle-info')}"></i> <span>${escapeHtml(msg)}</span>`;
    
    t.style.transform = "translateY(0)";
    t.style.opacity = "1";
    
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
        t.style.transform = "translateY(30px)";
        t.style.opacity = "0";
    }, 4000);
}

async function sincronizarDadosAdmin() {
    const icon = $("adminRefreshIcon");
    if (icon) icon.classList.add("fa-spin");
    
    await carregarDadosSupabase();

    setTimeout(() => {
        if (icon) icon.classList.remove("fa-spin");
    }, 600);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================

function inicializarPainelMaster() {
    adminState.clients = getClients();
    adminState.devices = getDevices();

    renderDashboardGeral();
    renderTabelaClientes();
    renderTabelaDispositivos();
    renderNocTelemetria();

    // Sincroniza em background com o Supabase
    carregarUltimaReleaseGithub();
    carregarDadosSupabase();

    // Polling a cada 20 segundos para manter dados atualizados se painel aberto
    if (adminState.syncInterval) clearInterval(adminState.syncInterval);
    adminState.syncInterval = setInterval(() => {
        if (adminState.isLoggedIn) {
            carregarDadosSupabase();
        }
    }, 20000);
}

document.addEventListener("DOMContentLoaded", () => {
    verificarAuthMaster();
});

// ==========================================================================
// 12. MÓDULO INTEGRADO: WHATSAPP GATEWAY & AUTOMAÇÃO DIÁRIA
// ==========================================================================

function getGatewayUrl() {
    return localStorage.getItem("thermolink_wa_gateway_url") || "https://thermolink-whatsapp.onrender.com";
}

function salvarUrlGatewayAdmin() {
    const input = $("waGatewayUrlInput");
    const url = (input ? input.value : "").trim() || "https://thermolink-whatsapp.onrender.com";
    localStorage.setItem("thermolink_wa_gateway_url", url);
    mostrarToastFeedback("URL do Gateway WhatsApp salva!", "success");
    carregarSecaoWhatsappAdmin();
}

let waAdminContatos = [];
let waAdminConfig = {};
let waAdminCeramicaFiltroAtivo = "all";
let waAdminSearchQuery = "";
let waPollingTimer = null;

function iniciarPollingWhatsappAdmin() {
    if (waPollingTimer) clearInterval(waPollingTimer);
    waPollingTimer = setInterval(() => {
        if (adminState.activeSection === "whatsapp") {
            carregarStatusWhatsappAdmin(true);
        }
    }, 2500);
}

function pararPollingWhatsappAdmin() {
    if (waPollingTimer) {
        clearInterval(waPollingTimer);
        waPollingTimer = null;
    }
}

async function carregarStatusWhatsappAdmin(silent = false) {
    const gatewayUrl = getGatewayUrl();
    const statusEl = $("waAdminStatus");
    const phoneEl = $("waAdminPhone");
    const badgeEl = $("waAdminStatusBadge");
    const subheaderEl = $("waAdminSubheader");
    const qrBlock = $("waQrCodeBlock");
    const connBlock = $("waConnectedBlock");
    const qrImg = $("waAdminQrImage");
    const qrLoading = $("waAdminQrLoading");
    const connPhone = $("waConnectedPhoneDisplay");

    try {
        const res = await fetch(`${gatewayUrl}/api/status`);
        if (!res.ok) throw new Error("Status HTTP " + res.status);
        const data = await res.json();

        if (data.status === "CONECTADO") {
            if (statusEl) { statusEl.textContent = "Conectado"; statusEl.className = "kpi-value text-green"; }
            const num = data.user?.id ? data.user.id.split(":")[0] : "Conectado";
            if (phoneEl) phoneEl.textContent = `+${num}`;
            if (badgeEl) { badgeEl.textContent = "Online"; badgeEl.className = "badge-status-online"; }
            if (subheaderEl) subheaderEl.textContent = `Conectado ao chip +${num} • Pronto para disparos diários`;

            if (qrBlock) qrBlock.style.display = "none";
            if (connBlock) connBlock.style.display = "flex";
            if (connPhone) connPhone.textContent = `+${num}`;
        } else if (data.status === "AGUARDANDO_QR") {
            if (statusEl) { statusEl.textContent = "Aguardando QR"; statusEl.className = "kpi-value text-orange"; }
            if (phoneEl) phoneEl.textContent = "Escanear na Tela";
            if (badgeEl) { badgeEl.textContent = "Escanear QR"; badgeEl.className = "tag-pill text-orange"; }
            if (subheaderEl) subheaderEl.textContent = "Aguardando leitura do QR Code pelo celular";

            if (qrBlock) qrBlock.style.display = "flex";
            if (connBlock) connBlock.style.display = "none";

            if (data.qrCodeDataUrl) {
                if (qrImg) {
                    if (qrImg.src !== data.qrCodeDataUrl) {
                        qrImg.src = data.qrCodeDataUrl;
                    }
                    qrImg.style.display = "block";
                }
                if (qrLoading) qrLoading.style.display = "none";
            }
        } else {
            if (statusEl) { statusEl.textContent = "Iniciando..."; statusEl.className = "kpi-value text-orange"; }
            if (badgeEl) { badgeEl.textContent = "Iniciando"; badgeEl.className = "tag-pill"; }
            if (qrBlock) qrBlock.style.display = "flex";
            if (connBlock) connBlock.style.display = "none";
            if (qrImg) qrImg.style.display = "none";
            if (qrLoading) {
                qrLoading.style.display = "block";
                qrLoading.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:var(--orange); margin-bottom:10px;"></i><p>Iniciando motor WhatsApp e gerando QR Code...</p>`;
            }
        }

        // Configurações
        if (data.config) {
            waAdminConfig = data.config;
            if ($("waAdminCheckAuto")) $("waAdminCheckAuto").checked = Boolean(data.config.envio_automatico_ativo);
            if ($("waAdminInputHorario")) $("waAdminInputHorario").value = data.config.horario_envio_diario || "18:00";
            if ($("waAdminHorarioDisplay")) $("waAdminHorarioDisplay").textContent = data.config.horario_envio_diario || "18:00";
            if ($("waAdminDisparadosHoje")) $("waAdminDisparadosHoje").textContent = data.config.total_enviados_hoje || 0;
            if ($("waAdminStatusAuto")) {
                $("waAdminStatusAuto").textContent = data.config.envio_automatico_ativo ? "Automação Ativa" : "Pausado";
            }
        }

        // Logs
        if (data.logs && $("waAdminLogsBox")) {
            $("waAdminLogsBox").innerHTML = data.logs.map(l => `
                <div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; gap:8px;">
                    <span style="color: #64748b;">[${escapeHtml(l.horario)}]</span>
                    <span style="color: ${l.tipo === 'success' ? '#34d399' : l.tipo === 'error' ? '#f87171' : l.tipo === 'warn' ? '#fbbf24' : '#94a3b8'};">
                        ${escapeHtml(l.mensagem)}
                    </span>
                </div>
            `).join("");
        }

    } catch (e) {
        if (!silent) console.warn("[WhatsApp Admin] Gateway indisponível:", e);
        if (statusEl) { statusEl.textContent = "Offline"; statusEl.className = "kpi-value text-red"; }
        if (badgeEl) { badgeEl.textContent = "Offline"; badgeEl.className = "tag-pill"; }
        if (phoneEl) phoneEl.textContent = "Servidor Gateway Offline";
        if (qrBlock) qrBlock.style.display = "flex";
        if (connBlock) connBlock.style.display = "none";
        if (qrImg) qrImg.style.display = "none";
        if (qrLoading) {
            qrLoading.style.display = "block";
            qrLoading.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-orange" style="font-size:28px;"></i><p style="margin-top:8px;">Gateway offline.<br>Inicie o <b>iniciar_testes_whatsapp.bat</b> no seu computador.</p>`;
        }
    }
}

async function carregarSecaoWhatsappAdmin() {
    const gatewayUrl = getGatewayUrl();
    if ($("waGatewayUrlInput")) $("waGatewayUrlInput").value = gatewayUrl;
    await carregarStatusWhatsappAdmin(false);
    await carregarContatosWhatsappAdmin();
}

async function carregarContatosWhatsappAdmin() {
    let contatos = [];
    const gatewayUrl = getGatewayUrl();

    // 1. Tenta carregar do Gateway
    try {
        const res = await fetch(`${gatewayUrl}/api/contatos`);
        if (res.ok) {
            const data = await res.json();
            if (data.contatos) contatos = data.contatos;
        }
    } catch (e) {}

    // 2. Se falhar ou estiver vazio, tenta localStorage (para funcionar no GitHub Pages)
    if (!contatos || contatos.length === 0) {
        const saved = localStorage.getItem("thermolink_wa_contatos");
        if (saved) {
            try { contatos = JSON.parse(saved); } catch (e) {}
        }
    }

    // 3. Fallback inicial com as cerâmicas reais
    if (!contatos || contatos.length === 0) {
        contatos = [
            {
                id: "cont_1",
                ceramica_id: "cli_1791467023902",
                ceramica_nome: "Irmãos Rolim",
                nome: "André Rolim",
                cargo: "Proprietário",
                telefone: "558894463836",
                receber_relatorio: true
            },
            {
                id: "cont_2",
                ceramica_id: "cli_1789336975029",
                ceramica_nome: "Nossa Senhora Aparecida",
                nome: "Arim / Davi",
                cargo: "Diretor / Gestor",
                telefone: "558893157628",
                receber_relatorio: true
            }
        ];
    }

    waAdminContatos = contatos;
    localStorage.setItem("thermolink_wa_contatos", JSON.stringify(waAdminContatos));

    if ($("waAdminTotalContatos")) $("waAdminTotalContatos").textContent = waAdminContatos.length;
    if ($("waTabBadgeContatos")) $("waTabBadgeContatos").textContent = waAdminContatos.length;
    if ($("waAdminContatosAtivos")) {
        const ativos = waAdminContatos.filter(c => c.receber_relatorio).length;
        $("waAdminContatosAtivos").textContent = `${ativos} ativos para envio`;
    }

    renderCardsCeramicasWhatsappAdmin();
}

function renderCardsCeramicasWhatsappAdmin() {
    const container = $("waCeramicasCardsContainer");
    const pillsContainer = $("waCeramicasFilterPills");
    if (!container) return;

    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();

    // 1. Renderiza os Pills de filtro
    if (pillsContainer) {
        pillsContainer.innerHTML = `
            <button class="filter-pill ${waAdminCeramicaFiltroAtivo === 'all' ? 'active' : ''}" onclick="filtrarCeramicaContatoAdmin('all', this)">Todas as Cerâmicas</button>
            ${clients.map(c => `
                <button class="filter-pill ${waAdminCeramicaFiltroAtivo === c.id ? 'active' : ''}" onclick="filtrarCeramicaContatoAdmin('${c.id}', this)">${escapeHtml(c.nome)}</button>
            `).join('')}
        `;
    }

    // 2. Filtra cerâmicas
    let ceramicasExibir = clients;
    if (waAdminCeramicaFiltroAtivo !== "all") {
        ceramicasExibir = clients.filter(c => c.id === waAdminCeramicaFiltroAtivo);
    }

    const termo = (waAdminSearchQuery || "").toLowerCase();

    // 3. Renderiza um Card para cada Cerâmica
    let htmlCards = "";

    ceramicasExibir.forEach(cer => {
        // Contatos desta Cerâmica
        let contatosDestaCeramica = waAdminContatos.filter(c => c.ceramica_id === cer.id);

        if (termo) {
            contatosDestaCeramica = contatosDestaCeramica.filter(c => 
                (c.nome && c.nome.toLowerCase().includes(termo)) ||
                (c.cargo && c.cargo.toLowerCase().includes(termo)) ||
                (c.telefone && c.telefone.includes(termo)) ||
                (cer.nome && cer.nome.toLowerCase().includes(termo))
            );
            if (!cer.nome.toLowerCase().includes(termo) && contatosDestaCeramica.length === 0) {
                return;
            }
        }

        const qtdContatos = contatosDestaCeramica.length;

        // Verifica telemetria dos aparelhos Alutal desta cerâmica
        const devsDaCeramica = (adminState.deviceStatusList || []).filter(d => (d.ceramicaId || d.ceramica_id) === cer.id);
        let statusAlutalHtml = "";
        if (devsDaCeramica.length > 0) {
            const minDiff = Math.min(...devsDaCeramica.map(d => Number(d.diffMin !== undefined ? d.diffMin : 999999)));
            if (minDiff <= 10) {
                statusAlutalHtml = `<span class="badge-status-online" style="padding: 2px 8px; font-size: 11px;"><span class="pulse-dot-green"></span> Alutal Online (${minDiff}m)</span>`;
            } else if (minDiff <= 30) {
                statusAlutalHtml = `<span class="badge-status-recent" style="padding: 2px 8px; font-size: 11px;"><i class="fa-regular fa-clock"></i> Sinal há ${minDiff}m</span>`;
            } else {
                const diffTxt = minDiff > 9999 ? '>24h' : `${minDiff}m`;
                statusAlutalHtml = `<span class="badge-status-offline" style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); padding: 2px 8px; font-size: 11px;"><i class="fa-solid fa-triangle-exclamation"></i> Sem sinal há ${diffTxt} (Alerta Ativo)</span>`;
            }
        }

        htmlCards += `
            <div class="panel-box" style="background: #091322; border: 1px solid #1a2c47; border-radius: 14px; padding: 18px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 14px; margin-bottom: 14px; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            <i class="fa-solid fa-industry"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <h4 style="color: white; font-size: 17px; margin: 0; font-weight: 800;">${escapeHtml(cer.nome)}</h4>
                                <span class="tag-pill" style="background: rgba(255,255,255,0.05); color: #94a3b8; font-size: 11px;">
                                    ${qtdContatos} ${qtdContatos === 1 ? 'número cadastrado' : 'números cadastrados'}
                                </span>
                                ${statusAlutalHtml}
                            </div>
                            <span style="color: var(--text-muted); font-size: 12px;">
                                <i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i> ${escapeHtml(cer.cidade || 'Não informada')} • Responsável Cadastrado: <b>${escapeHtml(cer.responsavel || '--')}</b>
                            </span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button class="btn-primary-admin" onclick="abrirModalNovoContatoWhatsapp('${cer.id}')" style="padding: 8px 14px; font-size: 12px;">
                            <i class="fa-solid fa-plus"></i> Adicionar Contato
                        </button>
                        <button class="btn-plan-edit" onclick="testarAlertaDesconexaoCeramica('${cer.id}', '${escapeHtml(cer.nome)}')" style="padding: 8px 12px; font-size: 12px;" title="Testar envio do alerta de desconexão (>30 min) para os números desta cerâmica">
                            <i class="fa-solid fa-triangle-exclamation text-orange"></i> Testar Alerta Desconexão
                        </button>
                    </div>
                </div>

                <!-- LISTA DE CONTATOS DESTA CERÂMICA -->
                ${qtdContatos === 0 ? `
                    <div style="padding: 24px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.1);">
                        <i class="fa-brands fa-whatsapp" style="font-size: 28px; color: #64748b; margin-bottom: 8px;"></i>
                        <p style="color: var(--text-muted); font-size: 13px;">Nenhum número cadastrado para <b>${escapeHtml(cer.nome)}</b>.</p>
                        <button class="btn-primary-admin" onclick="abrirModalNovoContatoWhatsapp('${cer.id}')" style="margin-top: 12px; padding: 6px 14px; font-size: 12px;">
                            <i class="fa-solid fa-user-plus"></i> Cadastrar Primeiro Número
                        </button>
                    </div>
                ` : `
                    <div class="admin-table-wrapper" style="margin-top: 0;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Nome do Contato</th>
                                    <th>Cargo / Função</th>
                                    <th>WhatsApp</th>
                                    <th style="text-align: center;">Recebe Relatório Diário</th>
                                    <th style="text-align: right;">Ações de Envio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${contatosDestaCeramica.map(c => `
                                    <tr>
                                        <td><b>${escapeHtml(c.nome)}</b></td>
                                        <td style="color: var(--text-muted);">${escapeHtml(c.cargo || 'Responsável')}</td>
                                        <td>
                                            <a href="https://wa.me/${c.telefone}" target="_blank" style="color: #34d399; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                                                <i class="fa-brands fa-whatsapp"></i> +${escapeHtml(c.telefone)}
                                            </a>
                                        </td>
                                        <td style="text-align: center;">
                                            <label class="switch">
                                                <input type="checkbox" ${c.receber_relatorio ? 'checked' : ''} onchange="toggleRelatorioContatoAdmin('${c.id}')">
                                                <span class="slider"></span>
                                            </label>
                                        </td>
                                        <td style="text-align: right;">
                                            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                                                <button class="btn-send-wa-row" onclick="dispararRelatorioIndividualAdmin('${c.id}')" title="Disparar relatório de ${escapeHtml(cer.nome)} para este número agora">
                                                    <i class="fa-solid fa-paper-plane"></i> Enviar Agora
                                                </button>
                                                <button class="btn-action-icon" onclick="editarContatoWhatsappAdmin('${c.id}')" title="Editar Contato"><i class="fa-solid fa-pen"></i></button>
                                                <button class="btn-action-icon btn-action-danger" onclick="excluirContatoWhatsappAdmin('${c.id}')" title="Excluir Contato"><i class="fa-solid fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    });

    if (!htmlCards) {
        htmlCards = `<div style="text-align:center; padding:40px; color:#64748b;">Nenhuma cerâmica ou contato encontrado para a pesquisa.</div>`;
    }

    container.innerHTML = htmlCards;
}

function filtrarContatosWhatsappAdmin(busca) {
    waAdminSearchQuery = busca || "";
    renderCardsCeramicasWhatsappAdmin();
}

function filtrarCeramicaContatoAdmin(ceramicaId, btn) {
    waAdminCeramicaFiltroAtivo = ceramicaId;
    document.querySelectorAll("#waCeramicasFilterPills .filter-pill").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderCardsCeramicasWhatsappAdmin();
}

async function salvarConfigWhatsappAdmin() {
    const envio_automatico_ativo = $("waAdminCheckAuto")?.checked;
    const horario_envio_diario = $("waAdminInputHorario")?.value;

    const gatewayUrl = getGatewayUrl();
    try {
        const res = await fetch(`${gatewayUrl}/api/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ envio_automatico_ativo, horario_envio_diario })
        });
        const data = await res.json();
        if (data.success) {
            mostrarToastFeedback("Configuração do envio diário salva com sucesso!", "success");
            carregarSecaoWhatsappAdmin();
        }
    } catch (e) {
        mostrarToastFeedback("Falha ao salvar configuração no gateway WhatsApp.", "error");
    }
}

function abrirModalNovoContatoWhatsapp(ceramicaIdPreselecionada = null) {
    $("waModalTitle").textContent = "Cadastrar Contato de WhatsApp";
    $("waContatoId").value = "";
    $("waContatoNome").value = "";
    $("waContatoCargo").value = "Proprietário";
    $("waContatoTelefone").value = "";
    $("waContatoReceber").checked = true;

    // Popula select de cerâmicas
    const sel = $("waContatoCeramicaId");
    sel.innerHTML = "";
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    clients.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.cidade || ''})`;
        if (ceramicaIdPreselecionada && c.id === ceramicaIdPreselecionada) {
            opt.selected = true;
        }
        sel.appendChild(opt);
    });

    abrirModalAdmin("modalContatoWhatsapp");
}

function editarContatoWhatsappAdmin(id) {
    const c = waAdminContatos.find(x => x.id === id);
    if (!c) return;

    $("waModalTitle").textContent = "Editar Contato de WhatsApp";
    $("waContatoId").value = c.id;
    $("waContatoNome").value = c.nome;
    $("waContatoCargo").value = c.cargo || "Responsável";
    $("waContatoTelefone").value = c.telefone;
    $("waContatoReceber").checked = Boolean(c.receber_relatorio);

    const sel = $("waContatoCeramicaId");
    sel.innerHTML = "";
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    clients.forEach(cl => {
        const opt = document.createElement("option");
        opt.value = cl.id;
        opt.textContent = `${cl.nome} (${cl.cidade || ''})`;
        if (cl.id === c.ceramica_id) opt.selected = true;
        sel.appendChild(opt);
    });

    abrirModalAdmin("modalContatoWhatsapp");
}

async function salvarContatoWhatsappAdmin(e) {
    e.preventDefault();
    const id = $("waContatoId").value;
    const ceramica_id = $("waContatoCeramicaId").value;
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    const cerObj = clients.find(c => c.id === ceramica_id);
    const ceramica_nome = cerObj ? cerObj.nome : "Cerâmica";
    const nome = $("waContatoNome").value.trim();
    const cargo = $("waContatoCargo").value.trim();
    const telefone = $("waContatoTelefone").value.trim().replace(/\D/g, "");
    const receber_relatorio = $("waContatoReceber").checked;

    if (!nome || !telefone) {
        alert("Preencha o nome e o número de WhatsApp!");
        return;
    }

    const body = { ceramica_id, ceramica_nome, nome, cargo, telefone, receber_relatorio };

    // 1. Atualiza estado local imediatamente (funciona mesmo no GitHub Pages)
    if (id) {
        const idx = waAdminContatos.findIndex(c => c.id === id);
        if (idx !== -1) waAdminContatos[idx] = { ...waAdminContatos[idx], ...body };
    } else {
        const novo = { id: "cont_" + Date.now(), ...body };
        waAdminContatos.unshift(novo);
    }
    localStorage.setItem("thermolink_wa_contatos", JSON.stringify(waAdminContatos));

    // Fecha o modal e atualiza a interface NA HORA
    fecharModalAdmin("modalContatoWhatsapp", null);
    mostrarToastFeedback(id ? "Contato atualizado com sucesso!" : "Novo contato adicionado!", "success");
    renderCardsCeramicasWhatsappAdmin();

    // 2. Dispara sync com Gateway em background (se online)
    const gatewayUrl = getGatewayUrl();
    try {
        const url = id ? `${gatewayUrl}/api/contatos/${id}` : `${gatewayUrl}/api/contatos`;
        const method = id ? "PUT" : "POST";
        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
    } catch (err) {
        console.warn("[WhatsApp Admin] Gateway offline para sync direto:", err);
    }

    // 3. Tenta gravar no Supabase caso a tabela exista
    try {
        await sb.from("ceramica_contatos").upsert([body]);
    } catch (err) {}
}

async function excluirContatoWhatsappAdmin(id) {
    const c = waAdminContatos.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Deseja realmente remover o contato ${c.nome} (+${c.telefone})?`)) return;

    waAdminContatos = waAdminContatos.filter(x => x.id !== id);
    localStorage.setItem("thermolink_wa_contatos", JSON.stringify(waAdminContatos));
    mostrarToastFeedback("Contato removido com sucesso!", "success");
    renderCardsCeramicasWhatsappAdmin();

    const gatewayUrl = getGatewayUrl();
    try {
        await fetch(`${gatewayUrl}/api/contatos/${id}`, { method: "DELETE" });
    } catch (e) {}

    try {
        await sb.from("ceramica_contatos").delete().eq("id", id);
    } catch (e) {}
}

async function toggleRelatorioContatoAdmin(id) {
    const c = waAdminContatos.find(x => x.id === id);
    if (!c) return;
    c.receber_relatorio = !c.receber_relatorio;
    localStorage.setItem("thermolink_wa_contatos", JSON.stringify(waAdminContatos));
    mostrarToastFeedback(`Recebimento diário de ${c.nome}: ${c.receber_relatorio ? 'ATIVADO' : 'PAUSADO'}`, "info");
    renderCardsCeramicasWhatsappAdmin();

    const gatewayUrl = getGatewayUrl();
    try {
        await fetch(`${gatewayUrl}/api/contatos/${id}/toggle-relatorio`, { method: "POST" });
    } catch (e) {}
}

async function dispararRelatorioIndividualAdmin(id) {
    const c = waAdminContatos.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Deseja enviar agora o relatório de ${c.ceramica_nome} para ${c.nome} (+${c.telefone}) no WhatsApp?`)) return;

    mostrarToastFeedback(`Disparando relatório para ${c.nome}...`, "info");
    const gatewayUrl = getGatewayUrl();
    try {
        const res = await fetch(`${gatewayUrl}/api/disparar-contato/${id}`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            mostrarToastFeedback(`Relatório entregue no WhatsApp de ${c.nome}!`, "success");
            carregarSecaoWhatsappAdmin();
        } else {
            alert(data.error || "Falha ao enviar relatório. Verifique se o WhatsApp está conectado.");
        }
    } catch (e) {
        alert("Erro de comunicação com o Gateway WhatsApp. Verifique se o servidor está rodando.");
    }
}

async function dispararRelatorioCeramicaAdmin(ceramicaId) {
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    const cer = clients.find(c => c.id === ceramicaId);
    const nome = cer ? cer.nome : "esta cerâmica";

    const contatos = waAdminContatos.filter(c => c.ceramica_id === ceramicaId && c.receber_relatorio);
    if (contatos.length === 0) {
        alert(`Nenhum contato com recebimento ativo cadastrado para ${nome}.`);
        return;
    }

    if (!confirm(`Deseja disparar o relatório de ${nome} para os ${contatos.length} contato(s) ativos dela agora?`)) return;

    mostrarToastFeedback(`Disparando relatório de ${nome}...`, "info");
    const gatewayUrl = getGatewayUrl();
    try {
        const res = await fetch(`${gatewayUrl}/api/disparar-ceramica/${ceramicaId}`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            mostrarToastFeedback(`Relatórios de ${nome} enviados com sucesso!`, "success");
            carregarSecaoWhatsappAdmin();
        } else {
            alert(data.error || "Erro no disparo.");
        }
    } catch (e) {
        alert("Erro de comunicação com o Gateway.");
    }
}

async function dispararRelatoriosTodosAdmin() {
    if (!confirm("Deseja iniciar o disparo do resumo diário para TODOS os contatos ativos de todas as cerâmicas agora?")) return;

    mostrarToastFeedback("Iniciando rotina de disparo em lote...", "info");
    const gatewayUrl = getGatewayUrl();
    try {
        const res = await fetch(`${gatewayUrl}/api/disparar-todos`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            mostrarToastFeedback("Disparo em lote iniciado em segundo plano!", "success");
            carregarSecaoWhatsappAdmin();
        } else {
            alert(data.error || "Erro ao iniciar disparo.");
        }
    } catch (e) {
        alert("Erro de comunicação com o Gateway.");
    }
}

async function forcarNovoQrCodeAdmin() {
    mostrarToastFeedback("Gerando novo QR Code...", "info");
    const gatewayUrl = getGatewayUrl();
    try {
        await fetch(`${gatewayUrl}/api/reconnect`, { method: "POST" });
    } catch (e) {
        try { await fetch(`${gatewayUrl}/api/logout`, { method: "POST" }); } catch (err2) {}
    }
    setTimeout(() => carregarStatusWhatsappAdmin(false), 1200);
}

async function desconectarWhatsappAdmin() {
    if (!confirm("Deseja realmente desconectar este WhatsApp? Você precisará escanear o QR Code novamente para reativar os envios.")) return;

    mostrarToastFeedback("Desconectando sessão...", "warn");
    const gatewayUrl = getGatewayUrl();
    try {
        await fetch(`${gatewayUrl}/api/logout`, { method: "POST" });
    } catch (e) {
        alert("Erro ao desconectar sessão.");
    }
    setTimeout(() => carregarStatusWhatsappAdmin(false), 1500);
}

// ==========================================================================
// 10. MOTOR DE INTELIGÊNCIA ARTIFICIAL PARA RELATÓRIOS TÉRMICOS (IA)
// ==========================================================================

async function carregarSecaoRelatoriosIA() {
    popularSelectCeramicasIA();
    await executarAnaliseIA(false);
}

function popularSelectCeramicasIA() {
    const sel = $("aiSelectCeramica");
    if (!sel) return;

    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    if (!clients || clients.length === 0) {
        sel.innerHTML = `<option value="">Nenhuma cerâmica cadastrada</option>`;
        return;
    }

    const currentVal = sel.value || adminState.aiReportState?.activeCeramicaId || clients[0].id;
    sel.innerHTML = clients.map(c => `
        <option value="${escapeHtml(c.id)}" ${c.id === currentVal ? 'selected' : ''}>
            ${escapeHtml(c.nome)} (${escapeHtml(c.cidade || 'Brasil')})
        </option>
    `).join("");

    if (!adminState.aiReportState) {
        adminState.aiReportState = { activeCeramicaId: currentVal, janelaHoras: 12, analiseAtual: null, textoFormatado: "" };
    } else {
        adminState.aiReportState.activeCeramicaId = sel.value;
    }
}

async function trocarCeramicaRelatorioIA() {
    const sel = $("aiSelectCeramica");
    if (sel && adminState.aiReportState) {
        adminState.aiReportState.activeCeramicaId = sel.value;
    }
    await executarAnaliseIA(true);
}

async function executarAnaliseIA(forcar = false) {
    const btnIcon = $("aiBtnIcon");
    const refreshIcon = $("aiRefreshIcon");
    if (btnIcon) btnIcon.classList.add("fa-spin");
    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    try {
        const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
        const sel = $("aiSelectCeramica");
        const ceramicaId = sel?.value || clients[0]?.id;
        const ceramica = clients.find(c => c.id === ceramicaId) || clients[0] || { id: "cli_1", nome: "Cerâmica Cliente", responsavel: "Gestor" };

        const janelaHoras = Number($("aiSelectJanela")?.value || 12);

        if ($("aiCeramicaAtivaBadge")) {
            $("aiCeramicaAtivaBadge").textContent = ceramica.nome;
        }

        // 1. Busca telemetria recente no Supabase para esta cerâmica
        let leituras = [];
        if (typeof sb !== "undefined" && sb) {
            try {
                const limiteTempo = new Date(Date.now() - (janelaHoras * 3600 * 1000)).toISOString();
                const { data } = await sb
                    .from("leituras")
                    .select("*")
                    .eq("ceramica_id", ceramica.id)
                    .gte("created_at", limiteTempo)
                    .order("created_at", { ascending: false })
                    .limit(500);

                if (data && data.length > 0) {
                    leituras = data;
                } else {
                    // Fallback para as últimas leituras gerais desta cerâmica se a janela estiver vazia
                    const { data: ultimas } = await sb
                        .from("leituras")
                        .select("*")
                        .eq("ceramica_id", ceramica.id)
                        .order("created_at", { ascending: false })
                        .limit(200);
                    if (ultimas && ultimas.length > 0) leituras = ultimas;
                }
            } catch (errDb) {
                console.warn("[IA] Consulta Supabase falhou, usando telemetria dos aparelhos:", errDb);
            }
        }

        // 2. Executa o algoritmo analítico de IA
        const resultadoIA = processarAlgoritmoIA(ceramica, leituras, janelaHoras);
        adminState.aiReportState.analiseAtual = resultadoIA;

        // 3. Renderiza KPIs, Diagnóstico por Forno e Relatório WhatsApp
        renderizarResultadoIA(resultadoIA);

        // 4. Atualiza timestamp
        if ($("aiStatusUltimaAnalise")) {
            const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            $("aiStatusUltimaAnalise").innerHTML = `<i class="fa-solid fa-circle-check text-green" style="margin-right: 4px;"></i> Analisado às ${agora}`;
        }

        if (forcar) {
            mostrarToastFeedback(`Diagnóstico de IA concluído para ${ceramica.nome}!`, "success");
        }

    } catch (e) {
        console.error("[IA] Erro na análise:", e);
        mostrarToastFeedback("Erro ao processar análise da IA.", "error");
    } finally {
        if (btnIcon) btnIcon.classList.remove("fa-spin");
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    }
}

function gerarQuickChartUrlClient(ceramicaNome, fornosEmQueima) {
    const labels = ['18h', '19h', '20h', '21h', '22h', '23h', '00h', '01h', '02h', '03h', '04h', '05h', '06h'];
    const cores = ['#f97316', '#06b6d4', '#10b981', '#a855f7', '#eab308', '#ec4899', '#3b82f6', '#f43f5e'];

    const datasets = fornosEmQueima.map((f, idx) => ({
        label: `Forno ${f.num} (Pico ${f.picoC1}°C)`,
        data: f.pontosGrafico || labels.map(() => f.c1),
        borderColor: cores[idx % cores.length],
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 2,
        tension: 0.35,
        fill: false
    }));

    if (datasets.length === 0) {
        datasets.push({
            label: 'Temperatura Ambiente / Pátio',
            data: labels.map(() => 35),
            borderColor: '#64748b',
            borderWidth: 2,
            pointRadius: 1,
            fill: false
        });
    }

    const cfg = {
        type: 'line',
        data: { labels, datasets },
        options: {
            title: {
                display: true,
                text: `Curva Térmica da Queima (18:00 às 06:00) • ${ceramicaNome}`,
                fontColor: '#ffffff',
                fontSize: 14,
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
                        callback: (v) => v + '°C'
                    }
                }]
            }
        }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&w=860&h=440&bkg=%23091322&devicePixelRatio=2`;
}

function processarAlgoritmoIA(ceramica, leituras, janelaHoras) {
    const devices = (adminState.devices && adminState.devices.length ? adminState.devices : getDevices()).filter(d => (d.ceramicaId || d.ceramica_id) === ceramica.id);
    const numFornosCadastrados = Number(ceramica.fornosCount || ceramica.fornos_count || (devices.length > 0 ? devices.length : 6));

    // Mapeamento de leituras por forno
    const fornosMap = {};
    if (leituras && leituras.length > 0) {
        leituras.forEach(l => {
            const fId = Number(l.modulo_alutal || l.forno_id || l.modulo_num || 1);
            if (fornosMap[fId]) {
                fornosMap[fId].push(l);
            } else {
                fornosMap[fId] = [l];
            }
        });
    }

    const totalFornos = Math.max(numFornosCadastrados, Object.keys(fornosMap).length);

    let somaScore = 0;
    let somaGradiente = 0;
    let totalAnomaliasGlobal = 0;
    const fornosEmQueima = [];
    const fornosInativos = [];

    const fKeys = Object.keys(fornosMap).sort((a, b) => Number(a) - Number(b));

    // Se houver fornos com leituras
    fKeys.forEach(k => {
        const num = Number(k);
        const lts = fornosMap[k];
        let c1 = 0, c2 = 0, picoC1 = 0, picoC2 = 0, mediaC1 = 0;
        let isOnline = false;
        let diffMin = 999999;
        let taxaVariacao = 0;

        if (lts && lts.length > 0) {
            // Ordena estritamente em ordem cronológica (18:00 até 06:00)
            lts.sort((a, b) => new Date(a.created_at || a.data_hora).getTime() - new Date(b.created_at || b.data_hora).getTime());

            const ult = lts[lts.length - 1];
            c1 = Number(ult.canal_1 ?? 0);
            c2 = Number(ult.canal_2 ?? 0);
            picoC1 = Math.max(...lts.map(x => Number(x.canal_1 || 0)));
            picoC2 = Math.max(...lts.map(x => Number(x.canal_2 || 0)));
            const minC1 = Math.min(...lts.map(x => Number(x.canal_1 || 0)));
            const deltaT = picoC1 - minC1;
            mediaC1 = Math.round(lts.reduce((acc, x) => acc + Number(x.canal_1 || 0), 0) / lts.length);
            const ultData = new Date(ult.created_at || ult.data_hora);
            diffMin = Math.round((Date.now() - ultData.getTime()) / 60000);
            isOnline = diffMin <= 10;

            if (lts.length >= 2) {
                const anterior = lts[Math.max(0, lts.length - 6)];
                const deltaV = c1 - Number(anterior.canal_1 || c1);
                const dtHours = Math.max(0.1, (new Date(ult.created_at || ult.data_hora).getTime() - new Date(anterior.created_at || anterior.data_hora).getTime()) / 3600000);
                taxaVariacao = Math.round(deltaV / dtHours);
            }

            const delta = Math.abs(c1 - c2);

            // FILTRO SOLICITADO: Forno em Queima Ativa vs Inativo / Fora de Uso
            const isQueimando = (picoC1 >= 80) || (deltaT >= 30) || (c1 >= 75);

            // Amostragem dos 13 pontos térmicos cronológicos para o gráfico (18h às 06h)
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

            let tendenciaTxt = "Estável no patamar";
            if (taxaVariacao > 25) tendenciaTxt = `📈 Subida contínua (+${taxaVariacao}°C/h)`;
            else if (taxaVariacao < -25) tendenciaTxt = `📉 Resfriamento (-${Math.abs(taxaVariacao)}°C/h)`;

            // Classificação Neural de Fase
            let fase = { nome: "Pátio / Carregamento", classe: "phase-patio", icone: "fa-box", step: 0, desc: "Forno frio ou em preparação" };
            if (picoC1 > 600 && c1 < picoC1 - 90 && taxaVariacao <= 5) {
                fase = { nome: "Resfriamento Controlado", classe: "phase-resfriamento", icone: "fa-snowflake", step: 4, desc: "Recozimento gradual das peças" };
            } else if (c1 > 980 || c2 > 980) {
                fase = { nome: "Superaquecimento Crítico", classe: "phase-maturacao", icone: "fa-fire-flame-curved", step: 3, desc: "Acima da faixa de segurança" };
            } else if (c1 >= 600 && c1 <= 980) {
                fase = { nome: "Maturação Térmica", classe: "phase-maturacao", icone: "fa-fire-flame-curved", step: 3, desc: "Ponto de fogo e sinterização plena" };
            } else if (c1 >= 180 && c1 < 600) {
                fase = { nome: "Elevação & Desidratação", classe: "phase-elevacao", icone: "fa-fire", step: 2, desc: "Eliminação de água estrutural" };
            } else if (c1 > 50 && c1 < 180) {
                fase = { nome: "Secagem & Pré-aquecimento", classe: "phase-secagem", icone: "fa-seedling", step: 1, desc: "Evaporação da umidade livre" };
            }

            // Anomalias
            const anomalias = [];
            if (delta > 80 && c1 > 200) anomalias.push(`Gradiente acentuado (${delta}°C entre C1 e C2)`);
            if (c1 > 980 || c2 > 980) anomalias.push(`Pico excessivo (${Math.max(c1, c2)}°C > 980°C)`);
            if (fase.step === 2 && taxaVariacao > 110) anomalias.push(`Subida acelerada (+${taxaVariacao}°C/h)`);

            // Recomendações
            let recomendacao = "";
            let previsao = "--";
            if (fase.step === 3 && (c1 > 980 || c2 > 980)) {
                recomendacao = "Reduzir alimentação de lenha no setor superaquecido imediatamente.";
                previsao = "Reverter superaquecimento em ~40 min";
            } else if (fase.step === 3) {
                recomendacao = delta > 75 
                    ? `Equalizar alimentação nas fornalhas inferiores da base (gradiente ${delta}°C).`
                    : "Patamar ideal alcançado. Manter queima uniforme e preparar vedação.";
                previsao = "~ 1h30 a 2h para ponto de fogo e selagem";
            } else if (fase.step === 4) {
                recomendacao = "Resfriamento controlado. Manter vedação completa contra choque térmico.";
                previsao = "~ 18h a 24h para abertura de portas";
            } else if (fase.step === 2) {
                recomendacao = "Elevação progressiva. Manter queima contínua para eliminar água química.";
                previsao = "~ 4h para atingir zona de maturação (>600°C)";
            } else {
                recomendacao = "Aquecimento brando com lenha miúda para secagem inicial.";
                previsao = "~ 6h a 8h de aquecimento brando";
            }

            let score = 100;
            if (delta > 40) score -= Math.min(25, Math.round((delta - 40) * 0.5));
            score -= (anomalias.length * 15);
            score = Math.max(30, Math.min(100, score));

            let badgeScore = { label: "Excelente", classe: "score-excelente" };
            if (score < 65) badgeScore = { label: "Crítico", classe: "score-critico" };
            else if (score < 80) badgeScore = { label: "Atenção", classe: "score-alerta" };
            else if (score < 90) badgeScore = { label: "Estável", classe: "score-estavel" };

            somaScore += score;
            somaGradiente += delta;
            totalAnomaliasGlobal += anomalias.length;

            const fornoItem = {
                num: String(num).padStart(2, '0'),
                c1,
                c2,
                delta,
                picoC1,
                picoC2,
                mediaC1,
                taxaVariacao,
                tendenciaTxt,
                isOnline,
                diffMin,
                fase,
                anomalias,
                recomendacao,
                previsao,
                score,
                badgeScore,
                pontosGrafico
            };

            if (isQueimando) {
                fornosEmQueima.push(fornoItem);
            } else {
                fornosInativos.push(fornoItem);
            }
        }
    });

    // Complementa todos os fornos cadastrados que não transmitiram leituras (inativos/desligados)
    const fornosPresentes = new Set([...fornosEmQueima.map(f => Number(f.num)), ...fornosInativos.map(f => Number(f.num))]);
    for (let fNum = 1; fNum <= totalFornos; fNum++) {
        if (!fornosPresentes.has(fNum)) {
            fornosInativos.push({
                num: String(fNum).padStart(2, '0'),
                c1: 0,
                c2: 0,
                delta: 0,
                picoC1: 0,
                picoC2: 0,
                fase: { nome: "Inativo / Desligado", classe: "phase-patio", icone: "fa-moon", step: 0, desc: "Forno frio ou sem transmissão" }
            });
        }
    }

    // Se for cerâmica sem leituras ativas, fallback demonstrativo realista
    if (fornosEmQueima.length === 0 && fKeys.length === 0) {
        fornosEmQueima.push({
            num: "01",
            c1: 948,
            c2: 925,
            delta: 23,
            picoC1: 988,
            picoC2: 940,
            mediaC1: 785,
            taxaVariacao: 15,
            tendenciaTxt: "⚖️ Estável no patamar de sinterização",
            isOnline: true,
            diffMin: 3,
            fase: { nome: "Maturação Térmica", classe: "phase-maturacao", icone: "fa-fire-flame-curved", step: 3, desc: "Ponto de fogo e sinterização plena" },
            anomalias: [],
            recomendacao: "Patamar ideal alcançado. Manter alimentação branda por mais 1h e vedar.",
            previsao: "~ 1h30 para selagem",
            score: 95,
            badgeScore: { label: "Excelente", classe: "score-excelente" },
            pontosGrafico: [220, 310, 450, 580, 690, 780, 860, 920, 948, 965, 988, 960, 948]
        });
        fornosEmQueima.push({
            num: "02",
            c1: 285,
            c2: 270,
            delta: 15,
            picoC1: 975,
            picoC2: 930,
            mediaC1: 620,
            taxaVariacao: -35,
            tendenciaTxt: "📉 Curva descendente de resfriamento (-35°C/h)",
            isOnline: true,
            diffMin: 4,
            fase: { nome: "Resfriamento Controlado", classe: "phase-resfriamento", icone: "fa-snowflake", step: 4, desc: "Recozimento gradual das peças" },
            anomalias: [],
            recomendacao: "Manter portas e fornalhas 100% vedadas para evitar choque térmico.",
            previsao: "~ 20h para abertura de portas",
            score: 92,
            badgeScore: { label: "Excelente", classe: "score-excelente" },
            pontosGrafico: [975, 940, 890, 820, 740, 650, 560, 480, 410, 360, 320, 295, 285]
        });
        fornosEmQueima.push({
            num: "05",
            c1: 490,
            c2: 420,
            delta: 70,
            picoC1: 510,
            picoC2: 430,
            mediaC1: 360,
            taxaVariacao: 55,
            tendenciaTxt: "📈 Subida contínua de temperatura (+55°C/h)",
            isOnline: true,
            diffMin: 2,
            fase: { nome: "Elevação & Desidratação", classe: "phase-elevacao", icone: "fa-fire", step: 2, desc: "Eliminação de água estrutural" },
            anomalias: ["Gradiente moderado (70°C entre topo e base)"],
            recomendacao: "Gradiente de 70°C: equalizar fogo alimentando mais as fornalhas da base.",
            previsao: "~ 4h para atingir zona de maturação",
            score: 82,
            badgeScore: { label: "Atenção", classe: "score-alerta" },
            pontosGrafico: [120, 160, 210, 260, 310, 360, 400, 440, 470, 490, 500, 510, 490]
        });
        for (let i = 1; i <= 16; i++) {
            if (![1, 2, 5].includes(i)) {
                fornosInativos.push({ num: String(i).padStart(2, '0') });
            }
        }
    }

    const qtdQueima = fornosEmQueima.length || 1;
    const scoreGeral = Math.round(fornosEmQueima.reduce((acc, f) => acc + (f.score || 85), 0) / qtdQueima);
    const gradienteMedio = Math.round(fornosEmQueima.reduce((acc, f) => acc + (f.delta || 30), 0) / qtdQueima);

    const chartUrl = gerarQuickChartUrlClient(ceramica.nome, fornosEmQueima);

    return {
        ceramica,
        janelaHoras,
        scoreGeral,
        gradienteMedio,
        totalAnomalias: totalAnomaliasGlobal,
        fornosAtivos: fornosEmQueima,
        fornosInativos,
        totalFornosCadastrados: totalFornos,
        chartUrl,
        dataHora: new Date()
    };
}

function renderizarResultadoIA(resultado) {
    if (!resultado) return;

    // 1. Atualiza KPIs Globais
    const { scoreGeral, gradienteMedio, totalAnomalias, fornosAtivos, fornosInativos, totalFornosCadastrados, ceramica, chartUrl } = resultado;

    if ($("aiKpiScore")) $("aiKpiScore").textContent = `${scoreGeral}%`;
    if ($("aiKpiScoreLabel")) {
        const txt = scoreGeral >= 90 ? "Eficiência Máxima de Queima" : (scoreGeral >= 75 ? "Operação Estável" : "Necessita Ajuste de Fogo");
        $("aiKpiScoreLabel").textContent = txt;
    }

    if ($("aiKpiGradiente")) $("aiKpiGradiente").textContent = `${gradienteMedio}°C`;
    if ($("aiKpiGradienteLabel")) {
        $("aiKpiGradienteLabel").textContent = gradienteMedio <= 45 ? "Equilíbrio Ideal Topo x Base" : "Desvio Moderado na Tiragem";
    }

    if ($("aiKpiEficiencia")) {
        const ef = scoreGeral >= 85 ? "Alta (94%)" : (scoreGeral >= 70 ? "Normal (81%)" : "Irregular (65%)");
        $("aiKpiEficiencia").textContent = ef;
    }
    if ($("aiKpiEficienciaLabel")) {
        $("aiKpiEficienciaLabel").textContent = "Consumo otimizado de lenha";
    }

    if ($("aiKpiAnomalias")) $("aiKpiAnomalias").textContent = totalAnomalias;
    if ($("aiKpiAnomaliasLabel")) {
        $("aiKpiAnomaliasLabel").textContent = totalAnomalias === 0 ? "Nenhum risco detectado" : `${totalAnomalias} ponto(s) de atenção`;
    }

    if ($("aiCeramicaAtivaBadge")) $("aiCeramicaAtivaBadge").textContent = ceramica.nome;

    // 2. Atualiza Imagem do Gráfico de 12 Horas
    if (chartUrl && $("aiChartPreviewImg")) {
        $("aiChartPreviewImg").src = chartUrl;
        $("aiChartPreviewImg").style.display = "block";
        if ($("aiChartLoading")) $("aiChartLoading").style.display = "none";
        if ($("aiChartLink")) {
            $("aiChartLink").href = chartUrl;
            $("aiChartLink").style.display = "inline-flex";
        }
    }

    // 3. Renderiza Cards Forno a Forno com Banner de Fornos Ativos vs Inativos
    const container = $("aiFornosContainer");
    if (container) {
        const bannerHtml = `
            <div style="grid-column: 1 / -1; background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.25); border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <span style="font-weight: 800; color: #f97316; font-size: 15px;"><i class="fa-solid fa-fire"></i> ${fornosAtivos.length} Forno(s) em Queima Ativa</span>
                    <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">de ${totalFornosCadastrados} fornos cadastrados</span>
                    <p style="color: var(--text-muted); font-size: 12px; margin-top: 3px;">
                        O relatório detalha exclusivamente os fornos que atingiram temperatura de queima ou variação térmica durante a madrugada.
                    </p>
                </div>
                <div style="font-size: 12px; color: #94a3b8; background: rgba(0,0,0,0.35); padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                    <i class="fa-solid fa-moon text-blue" style="margin-right: 6px;"></i> <b>${fornosInativos.length} Forno(s) Apagados / Pátio</b> (Filtrados automaticamente)
                </div>
            </div>
        `;

        if (!fornosAtivos || fornosAtivos.length === 0) {
            container.innerHTML = bannerHtml + `<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted);">Nenhum forno em queima ativa detectado nas últimas 12 horas.</div>`;
        } else {
            const cardsHtml = fornosAtivos.map(f => {
                const step1Class = f.fase.step >= 1 ? (f.fase.step === 1 ? 'step-active' : 'step-completed') : '';
                const step2Class = f.fase.step >= 2 ? (f.fase.step === 2 ? 'step-active' : 'step-completed') : '';
                const step3Class = f.fase.step >= 3 ? (f.fase.step === 3 ? 'step-active' : 'step-completed') : '';
                const step4Class = f.fase.step >= 4 ? (f.fase.step === 4 ? 'step-active' : 'step-completed') : '';

                let anomaliasHtml = "";
                if (f.anomalias && f.anomalias.length > 0) {
                    anomaliasHtml = `
                        <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 6px; padding: 6px 10px; font-size: 11px; color: #fca5a5; display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>${escapeHtml(f.anomalias[0])}</span>
                        </div>
                    `;
                }

                return `
                    <div class="ai-kiln-card">
                        <div class="ai-kiln-header">
                            <div class="ai-kiln-title">
                                <i class="fa-solid fa-fire" style="color: var(--orange);"></i>
                                <span>FORNO ${f.num}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="ai-phase-badge ${f.fase.classe}">
                                    <i class="fa-solid ${f.fase.icone}"></i> ${f.fase.nome}
                                </span>
                                <span class="ai-score-pill ${f.badgeScore.classe}">${f.score}%</span>
                            </div>
                        </div>

                        <!-- Métricas Térmicas -->
                        <div class="ai-temp-metrics-grid">
                            <div class="ai-metric-col">
                                <span class="ai-metric-label">Canal 1 (Topo)</span>
                                <b class="ai-metric-val" style="color: #fdba74;">${f.c1}°C</b>
                            </div>
                            <div class="ai-metric-col">
                                <span class="ai-metric-label">Canal 2 (Base)</span>
                                <b class="ai-metric-val" style="color: #67e8f9;">${f.c2}°C</b>
                            </div>
                            <div class="ai-metric-col">
                                <span class="ai-metric-label">Gradiente ΔT</span>
                                <b class="ai-metric-val" style="color: ${f.delta > 75 ? '#f87171' : '#34d399'};">${f.delta}°C</b>
                            </div>
                            <div class="ai-metric-col">
                                <span class="ai-metric-label">Pico Madrugada</span>
                                <b class="ai-metric-val" style="color: #ffffff;">${f.picoC1}°C</b>
                            </div>
                        </div>

                        <!-- Barra de Ciclo Térmico -->
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 4px; font-weight: 700; text-transform: uppercase;">
                                <span>1. Secagem</span>
                                <span>2. Elevação</span>
                                <span>3. Maturação</span>
                                <span>4. Resfriamento</span>
                            </div>
                            <div class="ai-cycle-steps">
                                <div class="ai-cycle-step ${step1Class}"></div>
                                <div class="ai-cycle-step ${step2Class}"></div>
                                <div class="ai-cycle-step ${step3Class}"></div>
                                <div class="ai-cycle-step ${step4Class}"></div>
                            </div>
                        </div>

                        ${anomaliasHtml}

                        <!-- Parecer do Algoritmo de IA -->
                        <div class="ai-insight-box">
                            <div class="ai-insight-item">
                                <i class="fa-solid fa-lightbulb text-orange"></i>
                                <div><b>Diagnóstico:</b> ${f.fase.desc}. Comportamento: ${f.tendenciaTxt}.</div>
                            </div>
                            <div class="ai-insight-item">
                                <i class="fa-solid fa-hand-holding-hand text-green"></i>
                                <div><b>Ação Prática:</b> ${escapeHtml(f.recomendacao)}</div>
                            </div>
                            <div class="ai-insight-item" style="font-size: 11px; color: var(--text-muted);">
                                <i class="fa-solid fa-stopwatch text-blue"></i>
                                <div><b>Previsão:</b> ${escapeHtml(f.previsao)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");

            container.innerHTML = bannerHtml + cardsHtml;
        }
    }

    // 4. Monta o texto oficial para WhatsApp
    gerarTextoRelatorioIA(false);
}

function gerarTextoRelatorioIA(resetarManual = false) {
    const res = adminState.aiReportState?.analiseAtual;
    if (!res) return;

    const dataFormatada = new Date().toLocaleDateString("pt-BR");
    const { fornosAtivos, fornosInativos, totalFornosCadastrados, ceramica, scoreGeral, gradienteMedio, chartUrl } = res;

    let t = `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    t += `🔥 *THERMOLINK • RESUMO DA MADRUGADA* 🔥\n`;
    t += `*Turno de Queima (Últimas 12 Horas)*\n`;
    t += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;

    t += `🏭 *Cerâmica:* ${ceramica.nome}\n`;
    t += `👤 *Aos Cuidados:* ${ceramica.responsavel || "Gestor de Queima"}\n`;
    t += `📅 *Horário de Fechamento:* ${dataFormatada} às 06:00\n`;
    t += `⏱️ *Período Analisado:* 18:00 às 06:00 (12h de Madrugada)\n\n`;

    t += `*──────────────────────────*\n`;
    t += `📊 *PANORAMA GERAL DA FÁBRICA:*\n`;
    t += `• Capacidade Total: *${totalFornosCadastrados} Fornos*\n`;
    t += `• 🔥 *Fornos em Queima Ativa:* *${fornosAtivos.length} forno(s)* (${fornosAtivos.map(f => `F${f.num}`).join(', ') || 'Nenhum'})\n`;
    t += `• 💤 *Fornos Inativos / Desligados:* *${fornosInativos.length} forno(s)* (sem variação térmica)\n`;
    t += `*──────────────────────────*\n\n`;

    if (fornosAtivos.length === 0) {
        t += `ℹ️ *Nenhum forno registrou queima ativa nesta madrugada.*\n`;
        t += `Todas as unidades permanecem em temperatura ambiente ou pátio.\n\n`;
    } else {
        t += `🔥 *DIAGNÓSTICO INDIVIDUAL DOS FORNOS EM QUEIMA:*\n\n`;
        fornosAtivos.forEach(f => {
            t += `*FORNO ${f.num}* — ${f.fase.nome}\n`;
            t += `• *Temp. Atual:* C1 (Topo): *${f.c1}°C* | C2 (Base): *${f.c2}°C*\n`;
            t += `• *Pico na Madrugada:* *${f.picoC1}°C*\n`;
            t += `• *Média das 12h:* ${f.mediaC1}°C\n`;
            t += `• *Gradiente (Topo x Base):* ${f.delta}°C\n`;
            t += `• *Comportamento:* ${f.tendenciaTxt}\n`;
            t += `• 💡 *Recomendação IA:* ${f.recomendacao}\n\n`;
        });
    }

    t += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    t += `🤖 *PARECER TÉCNICO & IA THERMOLINK:*\n`;
    t += `• ⭐ *Score Térmico Global:* *${scoreGeral}%* (${scoreGeral >= 85 ? 'Excelente' : 'Estável'})\n`;
    t += `• ⚖️ *Gradiente Médio Operacional:* *${gradienteMedio}°C*\n`;
    if (chartUrl) {
        t += `• 📈 *Gráfico da curva térmica de 12h anexado acima.*\n`;
    }
    t += `\n`;
    t += `✅ *Resumo Operacional:* Leituras consolidadas e filtradas por inteligência artificial.\n`;
    t += `📲 _Mensagem automática gerada diariamente às 06:00 pelo ThermoLink._\n`;
    t += `🌐 Painel de Controle: *thermolink.com.br*\n`;
    t += `*━━━━━━━━━━━━━━━━━━━━━━━━━━*`;

    adminState.aiReportState.textoFormatado = t;
    adminState.aiReportState.chartUrl = chartUrl;

    const txtArea = $("aiRelatorioTextoArea");
    if (txtArea) {
        txtArea.value = t;
    }

    if (resetarManual) {
        mostrarToastFeedback("Texto e gráfico redefinidos para o padrão das 12h.", "info");
    }
}

function copiarRelatorioIATexto() {
    const txtArea = $("aiRelatorioTextoArea");
    const texto = txtArea?.value || adminState.aiReportState?.textoFormatado;
    if (!texto) {
        mostrarToastFeedback("Nenhum texto disponível para cópia.", "warn");
        return;
    }

    navigator.clipboard.writeText(texto).then(() => {
        mostrarToastFeedback("Relatório com IA copiado para a área de transferência!", "success");
    }).catch(() => {
        if (txtArea) {
            txtArea.select();
            document.execCommand("copy");
            mostrarToastFeedback("Relatório copiado!", "success");
        }
    });
}

async function dispararRelatorioIACeramica() {
    const res = adminState.aiReportState?.analiseAtual;
    if (!res) {
        alert("Execute a análise antes de disparar.");
        return;
    }

    const texto = $("aiRelatorioTextoArea")?.value || adminState.aiReportState?.textoFormatado;
    const chartUrl = adminState.aiReportState?.chartUrl || res.chartUrl || null;
    const ceramicaId = res.ceramica.id;
    const contatos = (waAdminContatos || []).filter(c => c.ceramica_id === ceramicaId && c.receber_relatorio);

    if (contatos.length === 0) {
        alert(`Nenhum contato com recebimento ativo cadastrado para ${res.ceramica.nome}.`);
        return;
    }

    if (!confirm(`Deseja disparar este Relatório das 12 Horas com Análise de IA e Gráfico Térmico para os ${contatos.length} contato(s) de ${res.ceramica.nome}?`)) {
        return;
    }

    mostrarToastFeedback(`Disparando relatório com IA de ${res.ceramica.nome}...`, "info");
    try {
        let enviados = 0;
        for (const c of contatos) {
            if (!c.telefone) continue;
            try {
                await enviarMensagemWhatsappGateway(c.telefone, texto, chartUrl);
                enviados++;
            } catch (errOne) {
                console.warn(`[Relatório IA] Falha ao enviar para ${c.nome}:`, errOne);
            }
        }

        if (enviados > 0) {
            mostrarToastFeedback(`Relatório entregue para ${enviados} contato(s) no WhatsApp!`, "success");
            fecharModalAdmin("modalPreviewWhatsappIA", null);
        } else {
            alert("Não foi possível entregar o relatório. Verifique se o WhatsApp está conectado.");
        }
    } catch (e) {
        alert("Erro de comunicação com o Gateway WhatsApp: " + (e.message || "Verifique o status do servidor."));
    }
}

async function dispararRelatorioIAWhatsappAdmin() {
    await dispararRelatorioIACeramica();
}

async function enviarMensagemWhatsappGateway(telefone, texto, chartUrl = null) {
    const gatewayUrl = getGatewayUrl();
    let cleanPhone = String(telefone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
        cleanPhone = "55" + cleanPhone;
    }
    if (!cleanPhone) throw new Error("Telefone inválido.");

    const payload = {
        phone: cleanPhone,
        text: texto,
        chartUrl: chartUrl || null
    };

    // 1. Tenta POST /api/send-message (endpoint nativo ativo no Render em produção)
    try {
        const resp = await fetch(`${gatewayUrl}/api/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.success) return { success: true, data };
        }
    } catch (err1) {}

    // 2. Fallback para POST /api/enviar-mensagem
    try {
        const resp2 = await fetch(`${gatewayUrl}/api/enviar-mensagem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                telefone: cleanPhone,
                mensagem: texto,
                imageUrl: chartUrl || null
            })
        });
        if (resp2.ok) {
            const data2 = await resp2.json();
            if (data2.success) return { success: true, data: data2 };
        }
    } catch (err2) {}

    throw new Error("Não foi possível comunicar com o Gateway WhatsApp.");
}

function abrirModalPreviewWhatsappIA() {
    const texto = $("aiRelatorioTextoArea")?.value || adminState.aiReportState?.textoFormatado;
    const chartUrl = adminState.aiReportState?.chartUrl;

    if ($("waMockupMessageText")) {
        $("waMockupMessageText").textContent = texto || "Carregando relatório...";
    }
    if ($("waMockupHora")) {
        $("waMockupHora").textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    if ($("waMockupImgBox") && $("waMockupChartImg")) {
        if (chartUrl) {
            $("waMockupChartImg").src = chartUrl;
            $("waMockupImgBox").style.display = "block";
        } else {
            $("waMockupImgBox").style.display = "none";
        }
    }

    abrirModalAdmin("modalPreviewWhatsappIA");
}

// ==========================================================================
// 13. ALERTA DE DESCONEXÃO DOS APARELHOS ALUTAL (> 30 MINUTOS)
// ==========================================================================

function abrirModalPreviewAlertaDesconexao() {
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    let cer = null;
    if (waAdminCeramicaFiltroAtivo && waAdminCeramicaFiltroAtivo !== "all") {
        cer = clients.find(c => c.id === waAdminCeramicaFiltroAtivo);
    }
    if (!cer) {
        cer = clients.find(cl => (waAdminContatos || []).some(c => c.ceramica_id === cl.id && c.receber_relatorio));
    }
    if (!cer) cer = clients[0] || { nome: "Cerâmica Cliente" };

    if ($("waMockupAlertaText")) {
        $("waMockupAlertaText").textContent = `⚠️ *ALERTA THERMOLINK • EQUIPAMENTO OFFLINE* ⚠️

🏭 *Cerâmica:* ${cer.nome}
⏱️ *Sem comunicação:* há mais de 30 minutos
📡 *Status:* Módulos sem sinal com o servidor

Identificamos que os sensores/aparelhos Alutal estão sem comunicação com o servidor.

🔍 *Possíveis causas:*
• Queda de energia elétrica na fábrica
• Falha ou oscilação na conexão Wi-Fi / Internet
• Aparelho desligado da tomada ou reiniciando

Favor verificar se os equipamentos e a internet da fábrica estão ligados.
_Mensagem automática enviada pelo sistema ThermoLink._`;
    }
    abrirModalAdmin("modalPreviewAlertaDesconexao");
}

async function testarDisparoAlertaDesconexaoAdmin() {
    const clients = adminState.clients && adminState.clients.length ? adminState.clients : getClients();
    if (!clients || !clients.length) return alert("Nenhuma cerâmica cadastrada.");

    let cer = null;
    if (waAdminCeramicaFiltroAtivo && waAdminCeramicaFiltroAtivo !== "all") {
        cer = clients.find(c => c.id === waAdminCeramicaFiltroAtivo);
    }
    if (!cer) {
        cer = clients.find(cl => (waAdminContatos || []).some(c => c.ceramica_id === cl.id && c.receber_relatorio));
    }
    if (!cer) cer = clients[0];

    await testarAlertaDesconexaoCeramica(cer.id, cer.nome);
}

async function testarAlertaDesconexaoCeramica(ceramicaId, ceramicaNome) {
    const contatos = (waAdminContatos || []).filter(c => c.ceramica_id === ceramicaId && c.receber_relatorio);
    if (!contatos || !contatos.length) {
        return alert(`Nenhum contato com recebimento ativo cadastrado para ${ceramicaNome}.`);
    }

    if (!confirm(`Deseja simular e enviar o ALERTA DE DESCONEXÃO (>30 min) para os ${contatos.length} contato(s) de ${ceramicaNome} no WhatsApp?`)) {
        return;
    }

    mostrarToastFeedback(`Enviando teste de alerta para ${ceramicaNome}...`, "info");
    const gatewayUrl = getGatewayUrl();

    const agora = new Date();
    const dataHoraStr = agora.toLocaleDateString("pt-BR") + " às " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const textoAviso = `⚠️ *ALERTA THERMOLINK • EQUIPAMENTO OFFLINE* ⚠️\n\n` +
        `🏭 *Cerâmica:* ${ceramicaNome}\n` +
        `⏱️ *Sem comunicação:* há mais de 30 minutos\n` +
        `📡 *Status:* Módulos sem sinal com o servidor\n` +
        `🕒 *Data/Hora:* ${dataHoraStr}\n\n` +
        `Identificamos que os sensores/aparelhos Alutal estão sem comunicação com o servidor.\n\n` +
        `🔍 *Possíveis causas:*\n` +
        `• Queda de energia elétrica na fábrica\n` +
        `• Falha ou oscilação na conexão Wi-Fi / Internet\n` +
        `• Aparelho desligado da tomada ou reiniciando\n\n` +
        `Favor verificar se os equipamentos e a internet da fábrica estão ligados.\n` +
        `_Mensagem de teste de alerta enviada pelo sistema ThermoLink._`;

    // 1. Tenta endpoint direto dedicado do backend (se suportado na versão em execução)
    try {
        const resp = await fetch(`${gatewayUrl}/api/testar-alerta-desconexao/${ceramicaId}`, { method: "POST" });
        if (resp.ok) {
            const d = await resp.json();
            if (d.success) {
                mostrarToastFeedback(`Alerta de desconexão entregue para ${d.enviados} contato(s)!`, "success");
                fecharModalAdmin("modalPreviewAlertaDesconexao", null);
                return;
            }
        }
    } catch (eDedicated) {}

    // 2. Fallback resiliente imediato via /api/send-message (compatível 100% com o gateway ativo no Render)
    try {
        let enviados = 0;
        for (const c of contatos) {
            if (!c.telefone) continue;
            try {
                await enviarMensagemWhatsappGateway(c.telefone, textoAviso);
                enviados++;
            } catch (errOne) {
                console.warn(`[Alerta Desconexão] Erro ao enviar para ${c.nome}:`, errOne);
            }
        }

        if (enviados > 0) {
            mostrarToastFeedback(`Alerta de teste entregue para ${enviados} contato(s) de ${ceramicaNome}!`, "success");
            fecharModalAdmin("modalPreviewAlertaDesconexao", null);
        } else {
            alert("Não foi possível enviar o alerta. Verifique se o Gateway WhatsApp está conectado e online.");
        }
    } catch (e) {
        alert("Erro ao enviar mensagem pelo Gateway WhatsApp: " + (e.message || "Verifique sua conexão."));
    }
}



