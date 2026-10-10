// ==========================================================================
// THERMOLINK - SERVICE WORKER DE NOTIFICAÇÕES PUSH
// Responsabilidades:
//   1. Receber eventos Push e exibir notificações do sistema operacional
//   2. Funcionar com o app em segundo plano / PWA fechada (Android/Chrome)
//   3. Tratar o clique na notificação → abrir o ThermoLink no forno correto
// OBS: Sem estratégias de cache para não interferir no funcionamento atual.
// ==========================================================================

const APP_BASE = new URL("./", self.location.href);

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

// ------------------------------------------------------------------
// 1. RECEBIMENTO DO PUSH
// Payload esperado (JSON):
//   { title, body, url, tag, icon, badge }
// ------------------------------------------------------------------
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (_e) {
        data = { title: "ThermoLink", body: (event.data && event.data.text()) || "" };
    }

    const options = {
        body: data.body || "",
        icon: data.icon || new URL("icon-192.png", APP_BASE).href,
        badge: data.badge || new URL("icon-192.png", APP_BASE).href,
        tag: data.tag || undefined,          // agrupa/substitui notificações iguais
        renotify: Boolean(data.tag),         // vibra novamente quando reutiliza a tag
        vibrate: [100, 50, 100],
        requireInteraction: false,
        data: { url: data.url || "./index.html" }
    };

    event.waitUntil(self.registration.showNotification(data.title || "ThermoLink", options));
});

// ------------------------------------------------------------------
// 2. CLIQUE NA NOTIFICAÇÃO → abre/foca o ThermoLink e navega ao forno
// ------------------------------------------------------------------
async function tratarCliqueNotificacao(notification) {
    notification.close();

    const destino = new URL(
        (notification.data && notification.data.url) || "./index.html",
        APP_BASE
    ).href;

    // Janela do ThermoLink já aberta? Foca e avisa para navegar internamente.
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const janela of janelas) {
        if (janela.url.startsWith(APP_BASE.origin)) {
            await janela.focus();
            janela.postMessage({ type: "thermolink-navegar", url: destino });
            return;
        }
    }

    // Nenhuma janela aberta (PWA fechada) → abre direto no forno relacionado.
    await self.clients.openWindow(destino);
}

self.addEventListener("notificationclick", (event) => {
    event.waitUntil(tratarCliqueNotificacao(event.notification));
});
