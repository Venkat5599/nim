import { hostLanguage } from './nimiq'

type Dict = Record<string, string>

// Nimiq's user base skews heavily towards Latin America, so Spanish and
// Portuguese are shipped from day one rather than treated as a stretch goal.
const en = {
  chipIn: 'Chip in',
  startYourOwn: 'Start your own pot',
  ofGoal: 'of {goal} {currency} goal',
  peopleChippedIn: '{count} people chipped in',
  onePersonChippedIn: '1 person chipped in',
  beFirst: 'Be the first to chip in',
  recentContributions: 'Recent contributions',
  amount: 'Amount',
  send: 'Send {amount} {currency}',
  directNote: 'Goes directly to the pot address. Chip In never holds your money.',
  confirmInPay: 'Confirm in Nimiq Pay',
  approveToContinue: 'Approve the payment to continue',
  confirming: 'Confirming',
  waitingNetwork: 'Waiting for the network',
  sent: 'Sent',
  contributionIn: 'Your contribution is in',
  cancelled: 'Cancelled',
  noMoneyLeft: 'No money left your wallet',
  didntGoThrough: "Didn't go through",
  reasonInvalid: 'Something was wrong with the transaction',
  reasonNetwork: "Couldn't reach the network",
  reasonUnknown: 'Please try again',
  tryAgain: 'Try again',
  backToPot: 'Back to pot',
  sharePot: 'Share this pot',
  newPot: 'New pot',
  yourPots: 'Your pots',
  noPots: 'No pots yet',
  startFirst: 'Start your first pot',
  whatFor: "What's it for",
  goalAmount: 'Goal amount',
  whoGetsPaid: 'Who gets paid',
  lockedNote: 'Locked once the pot is created. Everyone can see it.',
  repeats: 'Repeats',
  once: 'Once',
  weekly: 'Weekly',
  monthly: 'Monthly',
  repeatNote: 'Recurring means we remind you. Every payment still needs your approval.',
  createPot: 'Create pot',
  openInNimiqPay: 'Open this in Nimiq Pay to chip in',
  pending: 'Pending',
  verifiedOnChain: 'Verified on chain',
  paste: 'Paste',
  copied: 'Link copied',
}

type Key = keyof typeof en

const es: Partial<Record<Key, string>> = {
  chipIn: 'Aportar',
  startYourOwn: 'Crea tu propio bote',
  ofGoal: 'de {goal} {currency} objetivo',
  peopleChippedIn: '{count} personas aportaron',
  onePersonChippedIn: '1 persona aportó',
  beFirst: 'Sé el primero en aportar',
  recentContributions: 'Aportes recientes',
  amount: 'Cantidad',
  send: 'Enviar {amount} {currency}',
  directNote: 'Va directo a la dirección del bote. Chip In nunca guarda tu dinero.',
  confirmInPay: 'Confirma en Nimiq Pay',
  approveToContinue: 'Aprueba el pago para continuar',
  confirming: 'Confirmando',
  waitingNetwork: 'Esperando a la red',
  sent: 'Enviado',
  contributionIn: 'Tu aporte ya está dentro',
  cancelled: 'Cancelado',
  noMoneyLeft: 'No salió dinero de tu cartera',
  didntGoThrough: 'No se completó',
  reasonInvalid: 'Hubo un problema con la transacción',
  reasonNetwork: 'No se pudo conectar con la red',
  reasonUnknown: 'Inténtalo de nuevo',
  tryAgain: 'Reintentar',
  backToPot: 'Volver al bote',
  sharePot: 'Compartir este bote',
  newPot: 'Nuevo bote',
  yourPots: 'Tus botes',
  noPots: 'Aún no tienes botes',
  startFirst: 'Crea tu primer bote',
  whatFor: 'Para qué es',
  goalAmount: 'Objetivo',
  whoGetsPaid: 'Quién recibe el pago',
  lockedNote: 'Se bloquea al crear el bote. Todos pueden verla.',
  repeats: 'Se repite',
  once: 'Una vez',
  weekly: 'Semanal',
  monthly: 'Mensual',
  repeatNote:
    'Recurrente significa que te recordamos. Cada pago sigue necesitando tu aprobación.',
  createPot: 'Crear bote',
  openInNimiqPay: 'Abre esto en Nimiq Pay para aportar',
  pending: 'Pendiente',
  verifiedOnChain: 'Verificado en la cadena',
  paste: 'Pegar',
  copied: 'Enlace copiado',
}

const pt: Partial<Record<Key, string>> = {
  chipIn: 'Contribuir',
  startYourOwn: 'Crie o seu pote',
  ofGoal: 'de {goal} {currency} meta',
  peopleChippedIn: '{count} pessoas contribuíram',
  onePersonChippedIn: '1 pessoa contribuiu',
  beFirst: 'Seja o primeiro a contribuir',
  recentContributions: 'Contribuições recentes',
  amount: 'Valor',
  send: 'Enviar {amount} {currency}',
  directNote:
    'Vai direto para o endereço do pote. O Chip In nunca guarda o seu dinheiro.',
  confirmInPay: 'Confirme no Nimiq Pay',
  approveToContinue: 'Aprove o pagamento para continuar',
  confirming: 'Confirmando',
  waitingNetwork: 'Aguardando a rede',
  sent: 'Enviado',
  contributionIn: 'A sua contribuição entrou',
  cancelled: 'Cancelado',
  noMoneyLeft: 'Nenhum dinheiro saiu da sua carteira',
  didntGoThrough: 'Não foi concluído',
  reasonInvalid: 'Houve um problema com a transação',
  reasonNetwork: 'Não foi possível alcançar a rede',
  reasonUnknown: 'Tente novamente',
  tryAgain: 'Tentar de novo',
  backToPot: 'Voltar ao pote',
  sharePot: 'Compartilhar este pote',
  newPot: 'Novo pote',
  yourPots: 'Os seus potes',
  noPots: 'Nenhum pote ainda',
  startFirst: 'Crie o seu primeiro pote',
  whatFor: 'Para que é',
  goalAmount: 'Meta',
  whoGetsPaid: 'Quem recebe',
  lockedNote: 'Bloqueado assim que o pote é criado. Todos podem ver.',
  repeats: 'Repete',
  once: 'Uma vez',
  weekly: 'Semanal',
  monthly: 'Mensal',
  repeatNote:
    'Recorrente significa que lembramos você. Cada pagamento ainda precisa da sua aprovação.',
  createPot: 'Criar pote',
  openInNimiqPay: 'Abra no Nimiq Pay para contribuir',
  pending: 'Pendente',
  verifiedOnChain: 'Verificado na rede',
  paste: 'Colar',
  copied: 'Link copiado',
}

const dicts: Record<string, Partial<Record<Key, string>>> = { en, es, pt }

export const locale = (hostLanguage() ?? 'en').slice(0, 2).toLowerCase()
const dict = dicts[locale] ?? en

/** Translate with {placeholder} interpolation. Falls back to English. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let out = dict[key] ?? en[key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v))
    }
  }
  return out
}
