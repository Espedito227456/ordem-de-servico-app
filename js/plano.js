// ============================================================================
// js/plano.js
// ----------------------------------------------------------------------------
// MÓDULO CENTRAL DO SISTEMA DE MONETIZAÇÃO (Freemium / Premium).
//
// Qualquer página que precise saber se o usuário é Premium, aplicar os
// limites do plano Grátis, ou verificar quanto do limite já foi usado, deve
// importar funções deste arquivo. A ideia é manter toda a regra de negócio
// de "planos" em UM lugar só — assim, no futuro, dá pra mudar preço, limite
// ou regra de expiração sem precisar mexer em cada página individualmente.
//
// --------------------------- COMO O PLANO FUNCIONA --------------------------
// Cada usuário autenticado tem um documento em `usuarios/{uid}` no Firestore
// com (pelo menos) os campos:
//   {
//     nome, email,
//     plano: "free" | "premium",
//     premiumExpiraEm: Timestamp | null,   // null = sem validade (ex: vitalício)
//     criadoEm: Timestamp
//   }
//
// Esse documento é criado automaticamente por `garantirUsuario()` (chamada
// logo após login/cadastro em todas as páginas autenticadas).
//
// -------------------- COMO LIBERAR O PREMIUM HOJE (MANUAL) ------------------
// Ainda não há um gateway de pagamento automático plugado (ver premium.html
// e o README para o passo a passo de integração futura com Google Play
// Billing / Stripe / Mercado Pago). Enquanto isso, o fluxo de venda é manual:
//   1) Combine o pagamento com o cliente (ex: Pix).
//   2) No Firebase Console > Firestore > coleção "usuarios" > documento do
//      UID do cliente, altere o campo "plano" para "premium" e, se quiser
//      controlar validade, defina "premiumExpiraEm" para a data de término.
// Importante: as regras em `firestore.rules` IMPEDEM que o próprio usuário
// altere seu campo "plano" pelo app (isso só pode ser feito pelo Firebase
// Console ou por um backend com Admin SDK) — isso evita que alguém se
// "autopromova" a Premium abrindo o console do navegador.
// ============================================================================

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase.js";

// ----------------------------------------------------------------------------
// 🔧 CONFIGURAÇÃO DO PLANO GRÁTIS — altere aqui para ajustar os limites.
// Nenhuma outra tela precisa ser modificada ao mudar esses números.
// ----------------------------------------------------------------------------
export const LIMITES_FREE = {
  maxClientes: 15,  // nº máximo de clientes cadastrados no plano grátis
  maxOsPorMes: 10   // nº máximo de novas Ordens de Serviço por mês no plano grátis
};

// ----------------------------------------------------------------------------
// 🔧 Preços exibidos em premium.html (apenas texto/exibição — ajuste livre).
// ----------------------------------------------------------------------------
export const PRECOS_PREMIUM = {
  mensal: "R$ 19,90/mês",
  anual: "R$ 199,90/ano (equivale a ~R$ 16,65/mês)"
};

// ----------------------------------------------------------------------------
// Garante que todo usuário autenticado tenha um documento em
// "usuarios/{uid}". Deve ser chamada logo após o login ou cadastro (e,
// defensivamente, em todas as páginas autenticadas — é barata e idempotente).
//
// IMPORTANTE: se o documento já existir, esta função NÃO mexe no plano
// atual do usuário (evita derrubar um Premium pago de volta para Grátis).
// ----------------------------------------------------------------------------
export async function garantirUsuario(user) {
  if (!user) return;

  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      nome: user.displayName || "",
      email: user.email || "",
      plano: "free",          // todo novo usuário começa no plano grátis
      premiumExpiraEm: null,   // preenchido manualmente (ou por integração futura) ao virar Premium
      criadoEm: new Date()
    });
  }
}

// ----------------------------------------------------------------------------
// Busca os dados de plano do usuário no Firestore. Retorna `null` se por
// algum motivo o documento ainda não existir (ex: regra de segurança
// bloqueando, erro de rede) — nesse caso, trate como "sem plano" (free).
// ----------------------------------------------------------------------------
export async function obterDadosUsuario(uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ----------------------------------------------------------------------------
// Retorna true se o usuário está no plano Premium ATIVO (considera a data
// de expiração, para assinaturas mensais/anuais que não foram renovadas).
// ----------------------------------------------------------------------------
export function isPremium(dadosUsuario) {
  if (!dadosUsuario) return false;
  if (dadosUsuario.plano !== "premium") return false;

  const bruto = dadosUsuario.premiumExpiraEm;
  const expira = bruto?.toDate ? bruto.toDate() : bruto;

  if (!expira) return true; // sem data de expiração = premium vitalício/sem controle de validade
  return new Date(expira) > new Date();
}

// ----------------------------------------------------------------------------
// Conta quantos clientes o usuário já cadastrou (usado para aplicar o
// limite do plano grátis).
// ----------------------------------------------------------------------------
export async function contarClientes(uid) {
  const q = query(collection(db, "clientes"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.size;
}

// ----------------------------------------------------------------------------
// Conta quantas OS o usuário criou no mês atual (com base em `createdAt`).
// A contagem é feita no cliente (sem índice composto no Firestore) porque o
// volume de dados do plano grátis é baixo — mesmo padrão já usado em
// dashboard.html para os gráficos.
// ----------------------------------------------------------------------------
export async function contarOsNoMes(uid) {
  const q = query(collection(db, "ordens"), where("uid", "==", uid));
  const snap = await getDocs(q);

  const hoje = new Date();
  let total = 0;

  snap.forEach((docItem) => {
    const data = docItem.data();
    const criadoEm = data.createdAt?.toDate ? data.createdAt.toDate() : null;

    if (
      criadoEm &&
      criadoEm.getMonth() === hoje.getMonth() &&
      criadoEm.getFullYear() === hoje.getFullYear()
    ) {
      total++;
    }
  });

  return total;
}

// ----------------------------------------------------------------------------
// Verifica se o usuário pode cadastrar mais um cliente.
// Retorna { permitido, usado, limite }.
// Premium sempre retorna permitido = true (sem limite).
// ----------------------------------------------------------------------------
export async function verificarLimiteClientes(uid, dadosUsuario) {
  if (isPremium(dadosUsuario)) {
    return { permitido: true, usado: 0, limite: Infinity };
  }

  const usado = await contarClientes(uid);
  return {
    permitido: usado < LIMITES_FREE.maxClientes,
    usado,
    limite: LIMITES_FREE.maxClientes
  };
}

// ----------------------------------------------------------------------------
// Verifica se o usuário pode criar mais uma OS neste mês.
// Retorna { permitido, usado, limite }.
// Premium sempre retorna permitido = true (sem limite).
// ----------------------------------------------------------------------------
export async function verificarLimiteOs(uid, dadosUsuario) {
  if (isPremium(dadosUsuario)) {
    return { permitido: true, usado: 0, limite: Infinity };
  }

  const usado = await contarOsNoMes(uid);
  return {
    permitido: usado < LIMITES_FREE.maxOsPorMes,
    usado,
    limite: LIMITES_FREE.maxOsPorMes
  };
}

// ----------------------------------------------------------------------------
// Alerta padrão de "limite do plano grátis atingido", com opção de ir para
// a página de upgrade. Reaproveitado em clientes.html e nova-os.html.
// ----------------------------------------------------------------------------
export function alertarLimiteAtingido(mensagem) {
  const irParaPremium = confirm(
    `${mensagem}\n\nDeseja conhecer o plano Premium (ilimitado)?`
  );

  if (irParaPremium) window.location.href = "premium.html";
}
