// ============================================================================
// js/ads.js
// ----------------------------------------------------------------------------
// Banner de anúncios exibido apenas para usuários do plano GRÁTIS (o plano
// Premium nunca vê anúncios — essa é inclusive uma das vantagens vendidas em
// premium.html: "remova os anúncios").
//
// Hoje, por padrão, é exibido um "house ad" (anúncio próprio, promovendo o
// Premium) — funciona imediatamente, sem precisar de cadastro em nenhuma
// rede de anúncios.
//
// Quando o app tiver conta aprovada em uma rede de anúncios:
//   - Versão web (navegador): Google AdSense.
//   - App empacotado para a Play Store (ex: via Capacitor): Google AdMob
//     (requer plugin nativo, ex: @capacitor-community/admob — este arquivo
//     cobre apenas a versão web/AdSense; o AdMob nativo é configurado no
//     projeto Android/Capacitor, fora do HTML).
//
// Para ativar o AdSense: preencha `adsenseClientId` e `adsenseSlotId` em
// AD_CONFIG abaixo e troque `provider` para "adsense". Nenhuma outra página
// precisa ser alterada — todas chamam apenas `renderAdBanner(...)`.
// ============================================================================

import { isPremium } from "./plano.js";

const AD_CONFIG = {
  // "house"   -> anúncio próprio (padrão — funciona sem cadastro em rede nenhuma)
  // "adsense" -> Google AdSense (requer conta aprovada)
  provider: "house",

  adsenseClientId: "", // ex: "ca-pub-XXXXXXXXXXXXXXXX"
  adsenseSlotId: ""    // ex: "1234567890"
};

// ----------------------------------------------------------------------------
// Renderiza (ou esconde) o banner de anúncio dentro do elemento com o id
// informado. Chamar sempre depois de carregar `dadosUsuario` (via
// obterDadosUsuario em plano.js).
//
//   <div id="ad-container" class="hidden mt-4"></div>
//   ...
//   renderAdBanner("ad-container", dadosUsuario);
// ----------------------------------------------------------------------------
export function renderAdBanner(containerId, dadosUsuario) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Usuário Premium: nunca mostra anúncio.
  if (isPremium(dadosUsuario)) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  if (AD_CONFIG.provider === "adsense" && AD_CONFIG.adsenseClientId) {
    renderAdSense(container);
    return;
  }

  renderHouseAd(container);
}

// ----------------------------------------------------------------------------
// Anúncio próprio (fallback padrão): usa as mesmas classes Tailwind já
// usadas no resto do app, para não destoar do visual existente.
// ----------------------------------------------------------------------------
function renderHouseAd(container) {
  container.innerHTML = `
    <a href="premium.html"
       class="block bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl p-3 text-center shadow active:scale-95 transition">
      <i class="fa-solid fa-star mr-1"></i>
      Remova anúncios e desbloqueie recursos ilimitados — conheça o <strong>Premium</strong>
    </a>
  `;
}

// ----------------------------------------------------------------------------
// Google AdSense (versão web). Só é usado quando AD_CONFIG.provider ===
// "adsense" e o clientId estiver preenchido.
// ----------------------------------------------------------------------------
function renderAdSense(container) {
  container.innerHTML = `
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="${AD_CONFIG.adsenseClientId}"
         data-ad-slot="${AD_CONFIG.adsenseSlotId}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  `;

  // Carrega o script do AdSense uma única vez por página.
  if (!document.getElementById("adsense-script")) {
    const script = document.createElement("script");
    script.id = "adsense-script";
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.adsenseClientId}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  (window.adsbygoogle = window.adsbygoogle || []).push({});
}
