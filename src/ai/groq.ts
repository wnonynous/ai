import {zodToJsonSchema} from 'zod-to-json-schema';
import {agentPlanSchema} from '../agent/schema.js';
import {config} from '../config.js';
import type {HistoryMessage} from '../agent/memory.js';
import type {Settings} from '../db/database.js';
// Strict mode requires every property to be required; optional fields become nullable.
function strictSchema(value:any):any {
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(strictSchema);
 const out:any={};for(const [k,v] of Object.entries(value)){if(k!=='$schema')out[k]=strictSchema(v);}
 if(out.type==='object'&&out.properties){const required=new Set(out.required??[]);for(const key of Object.keys(out.properties)){if(!required.has(key))out.properties[key]={anyOf:[out.properties[key],{type:'null'}]};}out.required=Object.keys(out.properties);out.additionalProperties=false;}
 return out;
}
export const groqPlanSchema=strictSchema(zodToJsonSchema(agentPlanSchema,{$refStrategy:'none'}));
export function stripNulls(value:any):any {if(Array.isArray(value))return value.map(stripNulls);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==null).map(([k,v])=>[k,stripNulls(v)]));return value;}
export async function requestGroq(system:string,messages:HistoryMessage[],settings:Pick<Settings,'model'|'maxTokens'|'temperature'>,fetcher:typeof fetch=fetch):Promise<string>{
 if(!config.groq.apiKey)throw new Error('Groq não configurada.');
 const model=settings.model.startsWith('free/')?config.groq.model:settings.model;
 let strict=['openai/gpt-oss-20b','openai/gpt-oss-120b','qwen/qwen3.8-27b'].includes(model);
 for(let attempt=0;attempt<3;attempt++){
 try{
 const response=await fetcher(`${config.groq.baseUrl}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${config.groq.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:system+'\nResponda com JSON no formato actions. Campos opcionais podem ser null.'},...messages],max_completion_tokens:settings.maxTokens,...(settings.temperature===null?{}:{temperature:settings.temperature}),response_format:strict?{type:'json_schema',json_schema:{name:'whatsapp_actions',strict:true,schema:groqPlanSchema}}:{type:'json_object'}}),signal:AbortSignal.timeout(30000)});
 if(!response.ok){if(response.status===400&&strict&&attempt<2){strict=false;console.warn('[Groq] strict request rejected; retrying JSON object mode');continue;}if((response.status===429||response.status>=500)&&attempt<2){await new Promise(r=>setTimeout(r,500*(attempt+1)));continue;}throw new Error(`Groq HTTP ${response.status}`);}
 const data=await response.json() as {choices?:Array<{finish_reason?:string;message?:{content?:string;refusal?:string}}>};const choice=data.choices?.[0];
 if(choice?.finish_reason==='length')throw new Error('Groq: resposta truncada; aumente max tokens.');
 if(choice?.message?.refusal)throw new Error('Groq: resposta recusada.');
 const text=choice?.message?.content;if(!text)throw new Error('Groq sem conteúdo textual.');return text;
 }catch(error){if(attempt<2&&error instanceof Error&&['TimeoutError','TypeError'].includes(error.name)){await new Promise(r=>setTimeout(r,500));continue;}throw error;}
 }throw new Error('Groq indisponível.');
}
