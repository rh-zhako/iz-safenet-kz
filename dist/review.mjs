import { ENGINE_VERSION } from './engine.mjs?v=20261023-final-1';
import { normalizeAccount } from './relations.mjs?v=20261023-final-1';
const accountStamp=(source,campaign)=>{const a=normalizeAccount(source.account,source.url,campaign.synthetic===true);return a?[a.platform,a.handle]:null;};

export const decisionLabels = {
  confirmed: 'Найденные признаки подтверждены',
  falsePositive: 'Отмечено как ложное срабатывание',
  later: 'Отложено для уточнения',
};

// Content stamp for stale review detection. This is not a security signature.
// IDs are omitted because the importer generates local IDs on every import.
export function materialStamp(campaign) {
  const content = JSON.stringify({
    title: campaign.title || '', organizer: campaign.organizer || '',
    manualGrouping: campaign.manualGrouping !== false,
    synthetic: campaign.synthetic === true, containsSyntheticSources: campaign.containsSyntheticSources === true,
    groupingNotes: campaign.groupingNotes || [],groupingConflicts:campaign.groupingConflicts||[],
    sources: (campaign.sources || []).map(s => [s.text || '', s.author || '', s.url || '', s.timestamp || '', s.image || '', s.originalText || '', accountStamp(s,campaign), s.kind || 'post', s.synthetic === true, s.originalCampaignRef||'',s.originalReplyTo||'', !s.campaignRef || String(s.campaignRef) === String(campaign.campaignRef || campaign.id || '')]),
  });
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619);
  return `content-v3-${(hash >>> 0).toString(16)}-${content.length}`;
}

export function isReviewCurrent(campaign, review) {
  return !!review && review.materialStamp === materialStamp(campaign) && review.engineVersion === ENGINE_VERSION;
}

function cleanEntry(value) {
  if (!value || !Object.hasOwn(decisionLabels, value.decision)) return null;
  return {
    decision: value.decision,
    at: Number.isFinite(Date.parse(value.at)) ? value.at : '',
    note: String(value.note || '').slice(0, 2000),
    materialStamp: typeof value.materialStamp === 'string' ? value.materialStamp.slice(0, 120) : '',
    engineVersion: String(value.engineVersion || '').slice(0, 80),
    risk: ['low', 'medium', 'high'].includes(value.risk) ? value.risk : '',
    sourceCount: Number.isInteger(value.sourceCount) && value.sourceCount >= 0 ? value.sourceCount : null,
    activeReviewMs: Number.isFinite(value.activeReviewMs) && value.activeReviewMs >= 0 && value.activeReviewMs <= 86400000 ? Math.round(value.activeReviewMs) : null,
  };
}

export function normalizeReview(value) {
  const entry = cleanEntry(value);
  if (!entry) return null;
  return { ...entry, history: Array.isArray(value.history) ? value.history.map(cleanEntry).filter(Boolean).slice(-100) : [] };
}

export function recordReview(campaign, previous, decision, note = '', options = {}) {
  if (!Object.hasOwn(decisionLabels, decision)) throw new Error('Неизвестное решение.');
  const old = normalizeReview(previous);
  return {
    decision, at: new Date().toISOString(), note: String(note).trim().slice(0, 2000),
    materialStamp: materialStamp(campaign), engineVersion: ENGINE_VERSION,
    risk: campaign.analysis.risk, sourceCount: campaign.sources.length,
    activeReviewMs: Number.isFinite(options.activeReviewMs) ? Math.max(0, Math.min(86400000, Math.round(options.activeReviewMs))) : null,
    history: old ? [...old.history, cleanEntry(old)].slice(-100) : [],
  };
}
