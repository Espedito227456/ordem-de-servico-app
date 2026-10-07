# ordem-de-servico-app
Sistema web de Ordem de Serviço para gestão de clientes, controle de serviços e financeiro. Permite criar, listar e atualizar OS com status (aberta, em andamento, concluída) e dashboard com resumo de faturamento. Usa Firebase para autenticação e armazenamento de dados.

## 💎 Sistema de monetização (Freemium / Premium / Anúncios)

O app tem um sistema de planos embutido: **Grátis** (com limites + anúncios) e
**Premium** (ilimitado, sem anúncios, com recursos extras). Esta seção explica
a arquitetura para manutenção futura — todo o código tem comentários
detalhados, mas aqui vai o resumo de "onde mexer para quê".

### Arquitetura (pasta `js/`)

| Arquivo | Responsabilidade |
|---|---|
| [js/firebase.js](js/firebase.js) | Inicialização única do Firebase (`app`, `auth`, `db`), importada por todas as páginas. Antes cada `.html` tinha sua própria cópia do `firebaseConfig` — agora é um só lugar. |
| [js/plano.js](js/plano.js) | **Coração do sistema de planos.** Define os limites do plano grátis, verifica se o usuário é Premium, conta uso (clientes/OS do mês) e cria o documento `usuarios/{uid}` no primeiro login. |
| [js/ads.js](js/ads.js) | Renderiza o banner de anúncio (só para quem não é Premium). Hoje mostra um "anúncio próprio" (house ad) promovendo o Premium; já vem preparado para ligar o Google AdSense quando houver conta aprovada. |
| [js/pdf.js](js/pdf.js) | Gera o recibo em PDF da OS (usado em `lista-os.html`). Marca d'água no plano grátis, limpo no Premium. |

### Como funciona o plano de cada usuário

Cada usuário autenticado tem um documento em `usuarios/{uid}` no Firestore:

```js
{
  nome, email,
  plano: "free" | "premium",
  premiumExpiraEm: Timestamp | null, // null = sem validade (ex: vitalício)
  criadoEm: Timestamp
}
```

Esse documento é criado automaticamente (`garantirUsuario()`) assim que o
usuário faz login ou se cadastra — inclusive contas antigas, criadas antes
deste sistema existir, ganham o documento (com plano "free") no próximo login.

### O que é limitado no plano Grátis hoje

Ajustável em **uma única constante** em [js/plano.js](js/plano.js) (`LIMITES_FREE`):

- Máximo de **15 clientes** cadastrados ([clientes.html](clientes.html)).
- Máximo de **10 novas Ordens de Serviço por mês** ([nova-os.html](nova-os.html) — o limite nunca bloqueia a *edição* de uma OS já existente, só a criação de novas).
- Recibo em PDF **com marca d'água** ([lista-os.html](lista-os.html)).
- **Sem** exportação de relatório CSV no [dashboard.html](dashboard.html).
- Exibe banner de anúncio em `index.html`, `clientes.html`, `lista-os.html` e `dashboard.html`.

Para mudar os preços exibidos em [premium.html](premium.html), edite a
constante `PRECOS_PREMIUM` em [js/plano.js](js/plano.js).

### Como liberar o Premium para um cliente HOJE (processo manual)

Ainda não há um gateway de pagamento automático plugado. O fluxo de venda
atual é manual (rápido de operar, zero custo de integração):

1. O usuário clica em "Assinar" em [premium.html](premium.html), o que abre uma conversa de WhatsApp/e-mail (configure o número/e-mail no topo do script de `premium.html`, na constante `CONTATO`).
2. Combine o pagamento (ex: Pix).
3. No **Firebase Console > Firestore Database > coleção `usuarios` > documento do UID do cliente**, altere `plano` para `"premium"` (e, se quiser controlar validade, preencha `premiumExpiraEm` com a data de término).

> ⚠️ As regras em [firestore.rules](firestore.rules) impedem que o próprio
> usuário altere seu campo `plano` pelo app — só é possível pelo Firebase
> Console ou por um backend com Admin SDK. Isso evita que alguém se
> "autopromova" a Premium pelo console do navegador.

### Como evoluir para pagamento automático (próximo passo)

Quando fizer sentido automatizar:

- **App publicado na Play Store:** use o [Google Play Billing](https://developer.android.com/google/play/billing) (requer empacotar o app com Capacitor/TWA — veja a seção de publicação abaixo).
- **Versão web:** use um link de pagamento (Stripe Payment Links ou Mercado Pago Checkout Pro) e valide a confirmação com uma **Cloud Function** que, ao receber o webhook do gateway, atualiza `usuarios/{uid}.plano` via Admin SDK (o Admin SDK ignora as regras do Firestore, então pode escrever mesmo com as regras bloqueando o client).
- Em qualquer caso, **nunca confie só no app/cliente** para liberar o Premium — a validação de pagamento precisa acontecer no backend.

### Como ativar anúncios de verdade (AdSense/AdMob)

Hoje `js/ads.js` mostra um anúncio próprio (sem custo, sem cadastro). Para
ligar uma rede de anúncios de verdade:

- **Versão web:** preencha `adsenseClientId`/`adsenseSlotId` em `AD_CONFIG` (topo de [js/ads.js](js/ads.js)) e troque `provider` para `"adsense"`.
- **App na Play Store (via Capacitor):** use o Google AdMob através de um plugin nativo (ex: `@capacitor-community/admob`) — isso é configurado no projeto Android/Capacitor, fora do HTML.

### Segurança: `firestore.rules`

O arquivo [firestore.rules](firestore.rules) protege os dados por usuário
(ninguém lê/edita dado de outro `uid`) e bloqueia a auto-promoção a Premium
pelo client. **Publique essas regras** (elas não têm efeito só por existirem
no repositório):

- **Painel:** Firebase Console > Firestore Database > Rules > cole o conteúdo do arquivo > Publish.
- **CLI:** com o [Firebase CLI](https://firebase.google.com/docs/cli) instalado e autenticado (`firebase login`), rode `firebase deploy --only firestore:rules` (os arquivos [firebase.json](firebase.json) e [.firebaserc](.firebaserc) já apontam para o projeto `ordem-servico-app-bb6a8`).

### Publicação na Play Store (lembrete)

Este projeto é um app web (HTML/CSS/JS + Firebase). Para publicar na Play
Store mantendo o Google Play Billing, push notifications, câmera, etc.,
empacote com [Capacitor](https://capacitorjs.com/): `npx cap init`, aponte o
`webDir` para a raiz deste projeto, `npx cap add android` e abra no Android
Studio. Lembre-se também de publicar uma Política de Privacidade (a loja
exige, e o app guarda dados pessoais de clientes de terceiros).

## 🔐 Login com Google

[login.html](login.html) e [cadastro.html](cadastro.html) têm um botão
"Continuar com o Google" (logo oficial do Google, seguindo o guia de marca
deles) que usa `GoogleAuthProvider` + `signInWithPopup` do Firebase Auth. Ao
entrar com Google, o usuário já fica autenticado na hora (não existe um
passo de "login" separado depois de um "cadastro"), por isso os dois botões
levam direto para `index.html`. O documento de plano `usuarios/{uid}` é
criado automaticamente, igual ao fluxo de e-mail/senha (ver `garantirUsuario`
em [js/plano.js](js/plano.js)).

> ⚠️ **Passo obrigatório antes de usar:** habilite o provedor **Google** em
> Firebase Console > Authentication > Sign-in method. Sem isso, o botão
> mostra o erro `auth/operation-not-allowed` ao clicar.

Detalhes importantes para manutenção futura:

- O botão (`#btnGoogleLogin` / `#btnGoogleCadastro`) fica desabilitado
  enquanto o popup está aberto, e reabilita se der erro ou o usuário fechar
  o popup sem concluir.
- `signInWithPopup` abre uma janela separada do Google. Isso funciona bem em
  navegador normal, mas **popups de OAuth não funcionam dentro de WebViews
  embutidas** (ex.: o app empacotado via Capacitor pode bloquear o fluxo com
  o erro `disallowed_useragent`). Quando for empacotar para a Play Store,
  troque para o plugin nativo `@capacitor-firebase/authentication` (usa o
  SDK nativo de login do Google) em vez de `signInWithPopup`.
- O ícone do Google é um SVG inline nos dois arquivos `.html` (não depende
  de nenhuma imagem externa) — para trocar o texto do botão, edite o
  `<span>` dentro do `<button class="btn-google">`.
