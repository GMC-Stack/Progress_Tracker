/**
 * Motore di verifica indennizzo per ritardo.
 *
 * Le soglie di default sono modellate sugli impegni della Carta della Mobilità
 * ATM (indennizzo in caso di disservizio prolungato). Le regole sono
 * configurabili per operatore: aggiungere altre città/aziende significa
 * aggiungere un nuovo oggetto CompensationRules.
 *
 * Nota: senza dati real-time (GTFS-RT) il ritardo è dichiarato dall'utente;
 * l'app prepara la richiesta ma l'invio va completato sui canali ufficiali
 * dell'operatore.
 */

export interface CompensationTier {
  /** Ritardo minimo all'arrivo, in minuti, per rientrare in questa fascia. */
  minDelayMinutes: number;
  description: string;
  amountEur: number;
}

export interface CompensationRules {
  operator: string;
  policyName: string;
  policyUrl?: string;
  /** Fasce ordinate per minDelayMinutes crescente; vince la più alta raggiunta. */
  tiers: CompensationTier[];
}

export const ATM_MILANO_RULES: CompensationRules = {
  operator: "ATM Milano",
  policyName: "Carta della Mobilità ATM — indennizzo per disservizio",
  policyUrl: "https://www.atm.it/it/AtmNews/CartaMobilita",
  tiers: [
    {
      minDelayMinutes: 15,
      description: "Biglietto ordinario omaggio",
      amountEur: 2.2,
    },
    {
      minDelayMinutes: 30,
      description: "Biglietto giornaliero omaggio",
      amountEur: 7.6,
    },
  ],
};

export interface CompensationResult {
  eligible: boolean;
  delayMinutes: number;
  tier: CompensationTier | null;
  operator: string;
  policyName: string;
  policyUrl?: string;
}

/**
 * Confronta arrivo pianificato e arrivo effettivo (secondi da mezzanotte)
 * e restituisce l'eventuale fascia di indennizzo raggiunta.
 * Se l'arrivo effettivo cade dopo mezzanotte rispetto al pianificato
 * (es. pianificato 23:50, effettivo 00:20), il confronto viene normalizzato.
 */
export function evaluateCompensation(
  plannedArrivalSeconds: number,
  actualArrivalSeconds: number,
  rules: CompensationRules = ATM_MILANO_RULES
): CompensationResult {
  let actual = actualArrivalSeconds;
  while (actual < plannedArrivalSeconds - 12 * 3600) {
    actual += 24 * 3600;
  }

  const delayMinutes = Math.max(0, Math.floor((actual - plannedArrivalSeconds) / 60));

  let matched: CompensationTier | null = null;
  for (const tier of rules.tiers) {
    if (delayMinutes >= tier.minDelayMinutes) matched = tier;
  }

  return {
    eligible: matched !== null,
    delayMinutes,
    tier: matched,
    operator: rules.operator,
    policyName: rules.policyName,
    policyUrl: rules.policyUrl,
  };
}
