# 🚀 Guia de Integração: WhatsApp Gateway & GitHub Pages (ThermoLink)

Este módulo conecta o **ThermoLink** ao WhatsApp de forma 100% gratuita (sem mensalidade Meta/Cloud API) via WebSocket Gateway com biblioteca Baileys (`@whiskeysockets/baileys`).

---

## 📌 1. Como Funciona a Gestão por Cerâmica no Painel Master (`admin.html`)

O módulo foi estruturado no modelo **Cerâmica-First**:
- **Cada Cerâmica possui seu próprio card dedicado**: Ex: *Irmãos Rolim*, *Nossa Senhora Aparecida*, *Cerâmica LIMA*, *Cerâmica Telha Forte*, *Luis*.
- **Múltiplos Contatos por Cerâmica**: Você pode cadastrar quantos contatos quiser para a mesma cerâmica (ex: Proprietário, Encarregado, Diretor, Forneiro).
- **Botão "+ Adicionar Contato para esta Cerâmica"**: Abre o formulário com a cerâmica já selecionada automaticamente.
- **Botão "Disparar para esta Cerâmica"**: Envia o relatório de queima dos fornos daquela fábrica para todos os contatos ativos dela de uma só vez.
- **Botão "Enviar Agora" (na linha do contato)**: Dispara o teste individual para validar a entrega instantaneamente.
- **Interruptor (Switch Ativo/Pausado)**: Permite ligar ou desligar o recebimento diário de qualquer pessoa com 1 clique.

---

## 📲 2. Leitura do QR Code e Reconexão Automática

- Ao acessar a aba **"WhatsApp & Relatórios"** no Admin, o sistema verifica a conexão a cada **2,5 segundos em tempo real**.
- Se desconectado ou aguardando leitura, o **QR Code em alta definição** é exibido diretamente na tela do computador.
- Basta abrir o WhatsApp no celular ➡️ **Aparelhos Conectados** ➡️ **Conectar um Aparelho** e escanear.
- Assim que lido, a tela atualiza na hora para **"Conectado (+55...)"** com o selo verde de operação ativa.
- Se o QR Code expirar, o botão **"Gerar Novo QR Code"** reinicia o pareamento imediatamente.

---

## 🌐 3. Como Rodar no GitHub (GitHub Pages)

O GitHub Pages é uma hospedagem estática (serve arquivos HTML/CSS/JS com HTTPS seguro).
O motor do WhatsApp (Baileys Node.js) roda como serviço em segundo plano.

### Opção A: Executar o Gateway no Computador da Empresa (Mais Simples)
1. Dê dois cliques em `iniciar_testes_whatsapp.bat`.
2. No Painel Admin do GitHub Pages (`https://seu-usuario.github.io/ThermoLink/admin.html`), o campo **Servidor Gateway** vem configurado por padrão como `http://localhost:3333`.
3. Para acessar do celular ou fora do escritório, você pode usar um túnel HTTPS gratuito (ex: Localtunnel ou Ngrok):
   ```bash
   npx localtunnel --port 3333
   ```
   Copie a URL gerada (ex: `https://meu-thermolink.loca.lt`), cole no campo **Servidor** no topo do Admin e clique em salvar.

### Opção B: Hospedar o Gateway 24/7 na Nuvem Gratuita (Render.com ou Railway)
1. Suba a pasta `whatsapp-tester` para um repositório no seu GitHub.
2. Crie um Web Service gratuito no [Render.com](https://render.com) apontando para o repositório.
3. Comando de inicialização: `npm start`
4. Cole a URL pública do Render no campo de Servidor do Admin.

---

## 🛡️ 4. Proteção Anti-Ban Integrada
O gateway possui fila com intervalo inteligente de **6 segundos** entre cada mensagem durante disparos em lote, simulando digitação humana para garantir a segurança do chip da empresa.
