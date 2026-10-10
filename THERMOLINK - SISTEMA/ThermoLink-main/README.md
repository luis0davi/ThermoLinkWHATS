# ThermoLink

Monitor de fornos cerâmicos em tempo real (PWA + Supabase).

## Notificações Push — Guia de Implantação

O sistema de push está implementado e é composto por:

| Peça | Arquivo | Função |
|---|---|---|
| PWA | `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Instalável no celular (requisito para push) |
| Service Worker | `sw.js` | Recebe o push, exibe a notificação e trata o clique (abre direto no forno) |
| Cliente | `push-notifications.js` | Permissão, subscription, seção **Configurações → Notificações** |
| Backend | `supabase/functions/push-api/index.ts` | Armazena inscrições (service role), detecta eventos e envia pushes via VAPID |
| Banco | `supabase/migrations/push_notifications_setup.sql` | Tabelas com RLS travado + estado anti-duplicado |

### Passo 1 — Executar o SQL

No **SQL Editor** do Supabase, rode `supabase/migrations/push_notifications_setup.sql`.

Habilite as extensões **pg_cron** e **pg_net** (Database → Extensions).

### Passo 2 — Publicar a Edge Function

```bash
npm install -g supabase
supabase login
supabase link --project-ref zawnluboujbovpgrgdcx

# Secrets já gerados em .env.example
supabase secrets set --env-file .env.example

supabase functions deploy push-api --no-verify-jwt
```

> `--no-verify-jwt` é seguro aqui: as ações internas (`check`/`send`) exigem o
> header `x-push-secret`, e as públicas (`subscribe`/`unsubscribe`) são validadas.

### Passo 3 — Agendar a verificação (cron de 1 minuto)

Descomente o bloco final do SQL do Passo 1, preenchendo `<PUSH_SECRET>` (valor de `.env.example`) e `<SERVICE_ROLE_KEY>` (Dashboard → Settings → API). Alternativa: agendar pela Dashboard (Edge Functions → Schedules) chamando `push-api` com body `{"action":"check"}`.

### Eventos disparados

- 🔴 **Offline**: sem leitura há N minutos (padrão 5, configurável por forno em `push_alerta_config`) — enviado **1× por episódio**
- 🟢 **Voltou online**: quando sai da condição offline — enviado 1×
- 🔥 **Temperatura**: quando `canal_1 >= limite_temp_c` (defina por forno em `push_alerta_config`; nulo = desativado) — enviado 1× enquanto permanecer acima

Clique na notificação abre o ThermoLink diretamente no forno relacionado.

Cada alerta também é gravado na tabela `notificacoes` (outbox), que alimenta os **alertas dentro do app**.

### Alertas em tempo real no aparelho (Configuração de Alertas)

Na aba **Acesso**, abaixo do perfil do cliente, ficou o card **"Configuração de Alertas"**:

- **Interruptor geral** (toggle) para ativar/desativar todos os alertas;
- Com ele ativado, abre o painel com:
  - **Seletor de forno** (individual ou "Todos os fornos");
  - **Limite Máximo (°C)** — ex.: alerta se passar de 950;
  - **Limite Mínimo (°C)** — ex.: alerta se cair de 700;
  - **Estímulos**: visual (borda piscante vermelha + modal de emergência), sonoro (bip industrial repetitivo) e vibração.
- Tudo é salvo **automaticamente no localStorage** do aparelho ("Configuração salva automaticamente");
- A checagem roda dentro da sincronização de 8 segundos (`carregarFornosELeituras`), comparando **canal_1 e canal_2** de cada leitura com os limites salvos;
- Enquanto o problema persistir: borda pisca, bip toca em loop e o celular vibra; ao normalizar, tudo cessa sozinho. O modal oferece **"Silenciar som e vibração"** (mantém o aviso visual) e **"Fechar alerta e usar o aplicativo"** (fecha tudo na hora — se romper de novo, o alerta reaparece);
- O alarme sonoro usa três bips ascendentes, o mesmo som que antes podia ser testado pelo botão de teste (removido após ajuste).

> O som só toca após o primeiro toque na tela (política dos navegadores).

### Uso no APK (Kodular.io)

O WebView do Kodular **não suporta Web Push** (Service Worker push), mas o motor de alertas em tempo real funciona normalmente, pois é 100% HTML/JS rodando na página:

1. Carregue a URL do site num componente `WebViewer` do Kodular.
2. No painel de **Blocos** do Kodular:
   - Adicione o evento `When WebViewer.WebViewStringChange`;
   - Se o valor recebido for exatamente `vibrar`, chame o componente nativo **Vibration** (Device → Vibration) por **500 milissegundos**.

   O ThermoLink envia `"vibrar"` via `window.AppInventor.setWebViewString("vibrar")` (e também tenta `window.Kodular.setWebViewString`) sempre que um alarme estiver ativo — a API `navigator.vibrate()` continua sendo usada como reforço onde estiver disponível.
3. Ative a permissão **Vibrate** nas configurações do projeto Kodular.
4. **Barra de notificação do Android com o app fechado (opcional):** adicione a extensão **OneSignal** e cadastre os secrets:
   ```bash
   supabase secrets set ONESIGNAL_APP_ID=xxxxxxxx ONESIGNAL_REST_KEY=yyyyyy
   ```
   Todo alerta gerado pelo backend também será entregue pela OneSignal.

### Testes

1. Abrir o app logado → Configurações → **Ativar notificações** → aceitar permissão.
2. Enviar teste manual:
   ```bash
   curl -X POST https://zawnluboujbovpgrgdcx.supabase.co/functions/v1/push-api \
     -H "Content-Type: application/json" -H "x-push-secret: <PUSH_SECRET>" \
     -d '{"action":"send","title":"🔴 ThermoLink","body":"Forno 01 está sem comunicação há 5 minutos.","url":"index.html?forno=1&ntf=1","tag":"tlk-teste"}'
   ```
3. Validar: app aberto / em segundo plano / PWA fechada; clique navega ao forno; desativar; logout/login; isolamento entre empresas (RLS sem políticas públicas).
