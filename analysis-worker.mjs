import {analyzeCampaign, ENGINE_VERSION} from './engine.mjs?v=20261023-final-1';
self.onmessage=({data})=>{
  try{
    const analyses=data.campaigns.map((c,i)=>{
      const analysis=analyzeCampaign(c).analysis;
      self.postMessage({type:'progress',done:i+1});
      return analysis;
    });
    self.postMessage({type:'done',engineVersion:ENGINE_VERSION,analyses});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
