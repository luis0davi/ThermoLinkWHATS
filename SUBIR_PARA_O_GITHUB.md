# 🚀 Guia: Como Subir para o GitHub e Colocar para Rodar 24/7 na Nuvem

Este repositório já foi **inicializado e commitado localmente com sucesso**!

---

## 📌 PASSO 1: Criar o Repositório no GitHub (Leva 1 minuto)

1. Acesse o seu GitHub: **[https://github.com/new](https://github.com/new)**
2. No campo **Repository name**, coloque um nome (exemplo: `ThermoLink` ou `thermolink-oficial`).
3. Deixe marcado como **Public** ou **Private** (à sua escolha).
4. ⚠️ **IMPORTANTE**: Deixe as opções *"Add a README"*, *"Add .gitignore"* e *"Choose a license"* **DESMARCADAS** (pois já criamos tudo isso no seu computador).
5. Clique no botão verde **Create repository**.

---

## 📌 PASSO 2: Enviar o Código do Computador para o GitHub

Após criar o repositório, copie o link HTTPS dele (exemplo: `https://github.com/luis0davi/ThermoLink.git`) e execute no terminal do seu projeto:

```powershell
# 1. Vincular o seu repositório do GitHub
git remote add origin https://github.com/luis0davi/NOME-DO-SEU-REPOSITORIO.git

# 2. Enviar todo o código
git push -u origin main
```

---

## 📌 PASSO 3: Como Fazer Rodar 24 Horas por Dia na Nuvem (100% Grátis)

O sistema é dividido em duas partes que rodam juntas:

### 🌐 A. O Painel Web do ThermoLink (Frontend no GitHub Pages)
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações) no topo.
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Branch**, selecione `main` e a pasta `/root` (ou a pasta do sistema).
4. O GitHub vai gerar o link do seu sistema: `https://luis0davi.github.io/ThermoLink/`.

---

### 📲 B. O Gateway do WhatsApp (Node.js 24/7 no Render.com)
Como o WhatsApp precisa de um servidor Node.js com conexão contínua ativa, usamos o **[Render.com](https://render.com)** (serviço gratuito de nuvem que se conecta diretamente ao seu Git):

1. Acesse **[https://render.com](https://render.com)** e faça login clicando em **"Sign in with GitHub"**.
2. Clique no botão azul **New +** no canto superior direito e escolha **Web Service**.
3. Selecione o repositório que você acabou de criar (`ThermoLink`).
4. Preencha apenas os seguintes campos:
   - **Name**: `thermolink-whatsapp`
   - **Root Directory**: `THERMOLINK WHATSSAP/whatsapp-tester`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan Type**: `Free`
5. Clique em **Create Web Service**.

🎉 **Pronto!**
O Render vai ligar o seu servidor e gerar uma URL segura HTTPS, por exemplo:
`https://thermolink-whatsapp.onrender.com`

---

## 🔗 PASSO 4: Conectar o Painel ao Gateway

1. Abra o seu painel Admin no navegador (seja local ou no GitHub Pages).
2. Na aba **WhatsApp & Relatórios**, no campo **Servidor Gateway**, cole a URL do Render:
   `https://thermolink-whatsapp.onrender.com`
3. O painel exibirá o QR Code direto do Render.
4. Escaneie uma única vez com o seu WhatsApp.
5. A partir desse momento, **o ThermoLink envia relatórios e telemetria 24h por dia mesmo com o seu computador desligado**!
