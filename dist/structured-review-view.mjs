import {structuredConditionKeys as keys, structuredConditionLabels as labels, structuredStatusLabels as statuses, structuredRiskLabels as risks, structuredSourceEligible, structuredOriginalConflict, createStructuredDraft, normalizeStructuredDraft, updateStructuredDraft, commitStructuredCondition, validateStructuredDraft, normalizeStructuredReview, isStructuredReviewCurrent, structuredDraftCurrent, recordStructuredReview, validateStructuredEvidence} from './structured-review.mjs?v=20261023-final-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const help={prize:'Какой именно приз разыгрывается? Обычная продажа товара или билет на концерт сами по себе не подтверждают розыгрыш.',payment:'Нужно ли обязательно платить, покупать товар, билет или номер именно для допуска к розыгрышу? Цена приза, добровольный донат и доставка после победы сами по себе не подтверждают оплату входа.',random:'Победителя выбирают случайно: генератором, колесом, жеребьёвкой? Жюри, мастерство и голосование сами по себе не подтверждают случайный выбор.'};
const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ru-RU',{timeZone:'Asia/Almaty'})+' (Алматы)':'время не указано';
const style=`<style>
.sr-panel{margin:24px 0;padding:24px;border:1px solid #dce5f1;border-radius:20px;background:#fff;color:#243348;overflow-wrap:anywhere}.sr-panel h2{font-size:23px;letter-spacing:-.4px;margin:0 0 10px}.sr-panel h3{font-size:19px;margin:0 0 12px}.sr-panel p{line-height:1.55;margin:10px 0}.sr-muted{font-size:13px;color:#64748b}.sr-notice{background:#f1f6fd;border:1px solid #dce8f8;border-radius:12px;padding:12px 14px;font-size:13px}.sr-notice.stale{background:#fff7e8;border-color:#f2d79e}.sr-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:20px 0}.sr-steps button{border:1px solid #d8e2ef;background:#f6f8fc;color:#42536a;border-radius:10px;padding:11px 8px;text-align:left;font:inherit;font-size:12px;cursor:pointer}.sr-steps button[aria-current=step]{background:#1769d1;border-color:#1769d1;color:#fff}.sr-steps button span{display:block;margin-bottom:5px;font-weight:700}.sr-panel label{display:block;font-size:13px;font-weight:600;margin:14px 0}.sr-panel label>span{display:block;margin-bottom:7px}.sr-panel select,.sr-panel textarea{display:block;width:100%;max-width:100%;border:1px solid #ccd8e8;border-radius:10px;padding:11px 12px;background:#fff;color:#243348;font:inherit;font-weight:400;font-size:14px;line-height:1.5}.sr-panel textarea{resize:vertical;min-height:84px}.sr-panel textarea[readonly]{background:#f6f8fb;font-size:13px;min-height:150px}.sr-panel .sr-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}.sr-panel button.sr-button{padding:11px 15px;border:1px solid #ccd9eb;border-radius:10px;background:#fff;color:#205593;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.sr-panel button.sr-button.primary{background:#1769d1;border-color:#1769d1;color:#fff}.sr-panel button.sr-button:focus-visible,.sr-panel select:focus-visible,.sr-panel textarea:focus-visible{outline:3px solid #8abbff;outline-offset:2px}.sr-panel blockquote{font-size:13px;line-height:1.6;background:#f4f7fb;border-left:3px solid #76a7e8;margin:10px 0;padding:10px 12px;white-space:pre-wrap}.sr-condition-list{display:grid;gap:10px;margin:18px 0}.sr-condition-list article{border:1px solid #dce5f0;border-radius:12px;padding:14px}.sr-condition-list h4{font-size:14px;margin:0 0 8px}.sr-suggestions{margin:15px 0}.sr-suggestions summary{font-size:13px;cursor:pointer;color:#2861a2}.sr-suggestions button{display:block;text-align:left;white-space:pre-wrap;width:100%;margin-top:8px;padding:10px;border:1px solid #d7e3f4;border-radius:9px;background:#f6f9ff;color:#354c6b;font:inherit;font-size:12px;cursor:pointer}.sr-validation{color:#a3530f;font-size:13px}.sr-saved{margin-top:16px}.sr-saved summary{font-size:14px;font-weight:600;cursor:pointer}.sr-saved .sr-condition-list{margin-bottom:0}.sr-panel .sr-divider{margin:20px 0;border:0;border-top:1px solid #e4eaf2}@media(max-width:600px){.sr-panel{padding:18px 14px;border-radius:15px}.sr-panel h2{font-size:21px}.sr-steps{gap:5px}.sr-steps button{font-size:11px;padding:9px 5px}.sr-panel .sr-actions .sr-button{flex:1;min-width:130px}}
</style>`;

function savedSummary(campaign,review) {
  if(!review)return '';
  const current=isStructuredReviewCurrent(campaign,review);
  return `<details class="sr-saved" open><summary>${current?'Сохранён ручной разбор':'Сохранённый разбор устарел'} · ${esc(risks[review.humanRisk])} приоритет</summary><p class="sr-muted">${esc(date(review.at))} · ${esc(review.engineVersion)} · автоматический приоритет при сохранении: ${esc(risks[review.automaticRisk]||'не зафиксирован')}</p><p>${esc(review.note)}</p><div class="sr-condition-list">${keys.map(key=>{
    const condition=review.conditions[key],e=condition.evidence,valid=e?validateStructuredEvidence(campaign,e).valid:false;
    return `<article><h4>${esc(labels[key])} · ${esc(statuses[condition.status])}</h4>${e?`<blockquote>${esc(e.quote)}</blockquote><p class="sr-muted">Источник ${e.sourceIndex===null?'не указан':e.sourceIndex+1} · позиции ${esc(e.start)}–${esc(e.end)} · ${e.provenance.synthetic?'синтетический':'предоставлен пользователем'}${valid?'':' · нужна повторная сверка'}${e.provenance.author?' · '+esc(e.provenance.author):''}</p>`:'<p class="sr-muted">Цитата не приложена. Отсутствие подтверждения не доказывает отсутствие признака.</p>'}</article>`;
  }).join('')}</div>${review.history.length?`<p class="sr-muted">Предыдущих ручных оценок: ${review.history.length}. Полная история входит в JSON и HTML-отчёт.</p>`:''}</details>`;
}

function finalStep(campaign,draft) {
  const checked=validateStructuredDraft(campaign,draft);
  return `<h3>4. Вывод аналитика</h3><p class="sr-muted">Выберите собственный приоритет после просмотра условий. Он хранится отдельно от автоматического и не изменяет статистику качества детектора.</p><div class="sr-condition-list">${keys.map((key,index)=>{
    const condition=draft.conditions[key],e=condition.evidence;
    return `<article><h4>${esc(labels[key])} · ${condition.reviewed?esc(statuses[condition.status]):'ещё не сохранено'}</h4>${e?`<blockquote>${esc(e.quote)}</blockquote><p class="sr-muted">Источник ${e.sourceIndex===null?'не указан':e.sourceIndex+1} · позиции ${esc(e.start)}–${esc(e.end)}</p>`:''}<button class="sr-button" type="button" data-sr-action="step" data-sr-step="${index}">Вернуться к признаку</button></article>`;
  }).join('')}</div><label><span>Ручной приоритет проверки</span><select data-sr-field="humanRisk"><option value="" ${!draft.humanRisk?'selected':''}>Выберите приоритет…</option>${Object.entries(risks).map(([key,label])=>`<option value="${key}" ${draft.humanRisk===key?'selected':''} ${key==='high'&&structuredOriginalConflict(campaign)?'disabled':''}>${label}</option>`).join('')}</select></label><p class="sr-muted">Высокий ручной приоритет требует трёх подтверждённых признаков с точными цитатами. Средний и низкий приоритеты требуют объяснения. Правовую квалификацию даёт специалист.</p><label><span>Основание вывода и что осталось проверить</span><textarea data-sr-field="note" rows="4" maxlength="2000" placeholder="Обязательна ли оплата? Есть ли бесплатная альтернатива? Что противоречит другим источникам?">${esc(draft.note)}</textarea></label><div class="sr-validation" aria-live="polite">${checked.errors.filter(error=>!error.startsWith('Выберите ручной')&&!error.startsWith('Добавьте комментарий')).map(error=>`<p>${esc(error)}</p>`).join('')}</div><div class="sr-actions"><button class="sr-button primary" type="button" data-sr-action="save">Сохранить ручной вывод</button><button class="sr-button" type="button" data-sr-action="save-next">Сохранить и к следующему</button></div><p class="sr-muted">Источник «предоставлен пользователем» означает происхождение загруженного материала, а не подтверждение подлинности. Ручная запись локальна, редактируема и не подписана.</p>`;
}

export function structuredReviewPanel(campaign,value,reviewValue,options={}) {
  const draft=normalizeStructuredDraft(campaign,value)||createStructuredDraft(campaign,reviewValue),review=normalizeStructuredReview(campaign,reviewValue),current=structuredDraftCurrent(campaign,draft);
  const step=draft.step,key=keys[step],condition=key?draft.conditions[key]:null,editor=condition?.editor;
  const sources=(campaign.sources||[]).map((source,index)=>({source,index})).filter(({source})=>structuredSourceEligible(campaign,source));
  const selected=sources.find(({source})=>source.id===editor?.sourceId);
  const suggestions=key?(campaign.analysis?.signals?.[key]?.evidence||[]).filter(e=>sources.some(({source})=>source.id===e.sourceId&&source.text.slice(e.start,e.end)===e.quote)).slice(0,5):[];
  const excluded=(campaign.sources||[]).length-sources.length;
  const notice=current?'<p class="sr-muted">Доказательство → подтверждение → следующий признак. Черновик сохраняется локально при вводе.</p>':'<div class="sr-notice stale"><strong>Материалы или правила изменились.</strong><p>Черновик сохранён, но его нельзя выдать за актуальную проверку. Обновите его и повторно просмотрите три признака.</p><button class="sr-button" type="button" data-sr-action="rebase">Обновить черновик</button></div>';
  let body;
  if(step===3)body=finalStep(campaign,draft);
  else body=`<h3>${step+1}. ${esc(labels[key])}</h3><p class="sr-muted">${esc(help[key])}</p><label><span>Ваш вывод по этому признаку</span><select data-sr-field="status">${Object.entries(statuses).map(([value,label])=>`<option value="${value}" ${editor.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label><span>Источник для доказательства</span><select data-sr-field="sourceId">${!selected?'<option value="">Выберите текущий источник…</option>':''}${sources.map(({source,index})=>`<option value="${esc(source.id)}" ${source.id===editor.sourceId?'selected':''}>Источник ${index+1} · ${esc(source.author||'автор не указан')}${source.synthetic===true||campaign.synthetic===true?' · синтетический':''}</option>`).join('')}</select></label>${excluded?`<p class="sr-muted">Не включено материалов: ${excluded}. У них указан другой ID кампании, поэтому их нельзя подтвердить как источник этого дела.</p>`:''}<label><span>Текст источника · выделите нужные слова</span><textarea data-sr-source-text readonly rows="6" aria-label="Текст выбранного источника">${esc(selected?.source.text||'Сначала выберите источник.')}</textarea></label><div class="sr-actions"><button class="sr-button" type="button" data-sr-action="selection">Использовать выделенный фрагмент</button>${selected?`<button class="sr-button" type="button" data-sr-action="open-source" data-sr-source="${esc(selected.source.id)}">Открыть карточку источника</button>`:''}</div><label><span>Точная цитата${editor.status==='confirmed'?' · обязательна':' · необязательно'}</span><textarea data-sr-field="quote" rows="3" maxlength="5000" placeholder="Вставьте точный фрагмент выбранного текста или используйте выделение выше.">${esc(editor.quote)}</textarea></label><p class="sr-muted">Сохраняются источник и позиции фрагмента в текущем тексте. Для повторяющейся цитаты используйте выделение. Пересказ не считается точной цитатой.</p>${suggestions.length?`<details class="sr-suggestions"><summary>Предложения детектора · ${suggestions.length}</summary><p class="sr-muted">Выбор цитаты не подтверждает признак автоматически. Сверьте контекст и выберите свой статус.</p>${suggestions.map((e,index)=>`<button type="button" data-sr-action="suggestion" data-sr-index="${index}" data-sr-key="${key}">${esc(e.quote)}</button>`).join('')}</details>`:''}<div class="sr-actions"><button class="sr-button primary" type="button" data-sr-action="commit">Сохранить признак и дальше</button></div>${condition.reviewed?'<p class="sr-muted">Этот признак просмотрен. Изменение полей потребует повторного сохранения.</p>':''}`;
  return `${style}<section class="sr-panel" data-structured-review data-sr-campaign="${esc(campaign.id)}" aria-label="Структурированная ручная проверка"><h2>Проверка аналитика</h2><p class="sr-notice">Автоматический приоритет: <strong>${esc(risks[campaign.analysis?.risk]||'не рассчитан')}</strong>. Здесь вы проверяете три признака вручную. Эта оценка не является выводом о мошенничестве.</p>${structuredOriginalConflict(campaign)?'<p class="sr-notice stale">В материалах разные исходные ID розыгрышей. Высокий ручной приоритет недоступен: создайте раздельные копии по ID и проверьте каждую.</p>':''}${notice}${savedSummary(campaign,review)}<nav class="sr-steps" aria-label="Шаги ручной проверки">${[...keys,'summary'].map((item,index)=>`<button type="button" data-sr-action="step" data-sr-step="${index}" ${step===index?'aria-current="step"':''}><span>${index+1}${index<3&&draft.conditions[item].reviewed?' ✓':''}</span>${index===0?'Приз':index===1?'Оплата входа':index===2?'Случайность':'Вывод'}</button>`).join('')}</nav>${body}${options.footer?`<p class="sr-muted">${esc(options.footer)}</p>`:''}</section>`;
}

// Attach once to document (or another stable root). No browser storage, network,
// navigation or automatic verdict changes happen inside this module.
export function installStructuredReviewEvents(options={}) {
  const root=options.root||globalThis.document;
  if(!root?.addEventListener)throw new Error('Нужен стабильный DOM-контейнер для событий ручной проверки.');
  if(typeof options.getCampaign!=='function'||typeof options.onDraft!=='function'||typeof options.onSave!=='function')throw new Error('Нужны getCampaign, onDraft и onSave.');
  const context=element=>{
    const panel=element.closest?.('[data-structured-review]');
    if(!panel)return null;
    const campaign=options.getCampaign();
    if(!campaign||panel.dataset.srCampaign!==String(campaign.id))return null;
    const draft=normalizeStructuredDraft(campaign,options.getDraft?.(campaign))||createStructuredDraft(campaign,options.getReview?.(campaign));
    return {panel,campaign,draft};
  };
  const persist=(campaign,draft,render=false)=>{options.onDraft(campaign,draft);if(render)options.onRender?.();};
  const feedback=(error)=>options.onFeedback?.(typeof error==='string'?error:error?.message||'Не удалось сохранить ручную проверку.');
  const handleInput=event=>{
    const field=event.target?.closest?.('[data-sr-field]');if(!field)return;
    const ctx=context(field);if(!ctx)return;
    const {campaign,draft}=ctx,kind=field.dataset.srField,key=keys[draft.step];
    let updated;
    if(kind==='humanRisk'||kind==='note')updated=updateStructuredDraft(campaign,draft,{[kind]:field.value});
    else if(key&&['status','sourceId','quote'].includes(kind))updated=updateStructuredDraft(campaign,draft,{key,editor:{[kind]:field.value}});
    else return;
    persist(campaign,updated,kind==='sourceId'&&event.type==='change');
  };
  const handleClick=event=>{
    const button=event.target?.closest?.('[data-sr-action]');if(!button)return;
    const ctx=context(button);if(!ctx)return;
    event.preventDefault();
    const {campaign,draft,panel}=ctx,action=button.dataset.srAction,key=keys[draft.step];
    try {
      if(action==='step')persist(campaign,updateStructuredDraft(campaign,draft,{step:Number(button.dataset.srStep)}),true);
      else if(action==='rebase')persist(campaign,createStructuredDraft(campaign,draft),true);
      else if(action==='open-source')options.onSource?.(button.dataset.srSource);
      else if(action==='selection') {
        const input=panel.querySelector('[data-sr-source-text]');
        if(!input||input.selectionEnd<=input.selectionStart)throw new Error('Выделите фрагмент в тексте источника выше.');
        persist(campaign,updateStructuredDraft(campaign,draft,{key,editor:{quote:input.value.slice(input.selectionStart,input.selectionEnd),start:input.selectionStart}}),true);
      } else if(action==='suggestion') {
        const suggestions=(campaign.analysis?.signals?.[key]?.evidence||[]).filter(e=>(campaign.sources||[]).some(source=>structuredSourceEligible(campaign,source)&&source.id===e.sourceId&&source.text.slice(e.start,e.end)===e.quote)).slice(0,5),e=suggestions[Number(button.dataset.srIndex)];
        if(!e)throw new Error('Предложенная цитата больше не относится к текущим материалам.');
        persist(campaign,updateStructuredDraft(campaign,draft,{key,editor:{sourceId:e.sourceId,quote:e.quote,start:e.start}}),true);
      } else if(action==='commit')persist(campaign,commitStructuredCondition(campaign,draft,key),true);
      else if(action==='save'||action==='save-next') {
        const review=recordStructuredReview(campaign,options.getReview?.(campaign),draft,{activeReviewMs:options.getActiveReviewMs?.(campaign)});
        const stored=options.onSave(campaign,review);
        if(stored===false)throw new Error('Хранилище заполнено. Экспортируйте дело, прежде чем закрыть страницу.');
        persist(campaign,createStructuredDraft(campaign,review));
        feedback('Ручной вывод, цитаты и происхождение материалов сохранены.');
        if(action==='save-next')options.onNext?.();else options.onRender?.();
      }
    }catch(error){feedback(error);}
  };
  root.addEventListener('input',handleInput);root.addEventListener('change',handleInput);root.addEventListener('click',handleClick);
  return ()=>{root.removeEventListener('input',handleInput);root.removeEventListener('change',handleInput);root.removeEventListener('click',handleClick);};
}
