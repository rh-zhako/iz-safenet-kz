import { analyzeCampaign, ENGINE_VERSION } from './engine.mjs?v=20261023-final-1';
import { evaluationCampaigns } from './demo-data.mjs?v=20261023-final-1';

export function evaluate(campaigns = evaluationCampaigns, analyze = analyzeCampaign, engineVersion = ENGINE_VERSION) {
  const classes = ['high', 'medium', 'low'];
  const matrix = Object.fromEntries(classes.map(c => [c, Object.fromEntries(classes.map(p => [p, 0]))]));
  let tp=0, fp=0, tn=0, fn=0, baselineTP=0, baselineFP=0, quoteErrors=0;
  const cases = campaigns.map(campaign => {
    const result = analyze(campaign);
    const actual = result.analysis.risk;
    const positive = campaign.expectedRisk === 'high';
    const predicted = actual === 'high';
    const baseline = campaign.sources.some(source => analyze({...campaign, sources:[source]}).analysis.risk === 'high');
    matrix[campaign.expectedRisk][actual]++;
    if(positive && predicted) tp++; else if(!positive && predicted) fp++; else if(positive) fn++; else tn++;
    if(positive && baseline) baselineTP++;
    if(!positive && baseline) baselineFP++;
    for(const signal of Object.values(result.analysis.signals)) for(const evidence of signal.evidence || []) {
      const source = campaign.sources.find(s=>s.id===evidence.sourceId);
      if(!source || source.text.slice(evidence.start, evidence.end) !== evidence.quote) quoteErrors++;
    }
    return {id:campaign.id,title:campaign.title,expected:campaign.expectedRisk,predicted:actual,baseline:baseline?'high':'not-high',match:actual===campaign.expectedRisk,score:result.analysis.score};
  });
  const div=(a,b)=>b?a/b:0;
  return {
    engineVersion, dataset:'28 synthetic scenario regression set; not a real-world benchmark',
    synthetic:true, total:campaigns.length,positiveDefinition:'high: observed prize + mandatory entry payment + random selection, without unresolved contradiction',
    precision:div(tp,tp+fp),recall:div(tp,tp+fn),falsePositiveRate:div(fp,fp+tn),
    accuracy:div(cases.filter(c=>c.match).length,cases.length),decisionCoverage:div(cases.filter(c=>c.predicted!=='medium').length,cases.length),
    tp,fp,tn,fn,matrix,quoteErrors,cases,
    baseline:{name:'Any single source classified high',precision:div(baselineTP,baselineTP+baselineFP),recall:div(baselineTP,tp+fn),falsePositiveRate:div(baselineFP,fp+tn)},
    limitations:['Synthetic authored scenarios with limited wording variation.','Used for implementation checks; not an independently blinded evaluation.','Medium cases remain in the denominator for binary metrics.','OCR quality is not evaluated by this text scenario benchmark.']
  };
}
