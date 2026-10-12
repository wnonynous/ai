import type {IncomingMessage} from 'berryprotocol';
import type {Store} from '../db/database.js';
import type {WhatsApp} from '../whatsapp/client.js';
import {config} from '../config.js';
import {getChatId,getSelectedId,normalizeIncomingForAgent} from './normalize.js';
import {enqueueByChat} from './queue.js';
import {executePlan} from './executor.js';
import {summarizePlanForMemory} from './memory.js';
import {planAgentResponse} from '../ai/apinex.js';
export function receive(store:Store,wa:WhatsApp,message:IncomingMessage):Promise<void>{
 const jid=getChatId(message);if(!jid||jid==='status@broadcast'||!config.agent.allowGroups&&jid.endsWith('@g.us'))return Promise.resolve();
 const input=normalizeIncomingForAgent(message);if(message.type==='text'&&!('text' in message&&message.text?.trim())&&!getSelectedId(message))return Promise.resolve();
 return enqueueByChat(jid,async()=>{
 if(!store.add(jid,'user',input,message.type,getSelectedId(message),`${jid}:${message.id}`))return;
 const settings=store.settings();if(!settings.enabled)return;
 try{if(wa.status!=='connected')throw new Error('WhatsApp disconnected');await wa.client.sendPresence('composing',jid).catch(()=>{});
 const plan=await planAgentResponse(store.history(jid,settings.maxHistoryMessages),settings);
 // Persist each action only after its send succeeds, avoiding false memory on partial failure.
 for(const action of plan.actions){await executePlan(wa.client,jid,message.id,{actions:[action]});store.add(jid,'assistant',summarizePlanForMemory({actions:[action]}),action.type);}
 console.log('[Agent] response sent');
 }catch(error){const message=error instanceof Error?error.message:'';const status=message.match(/^(Groq|APInex) HTTP (\d{3})$/);console.warn(status?`[Agent] response failed: ${status[1]} HTTP ${status[2]}`:'[Agent] response failed');try{const text='Tive um problema para responder agora. Tente novamente em instantes.';await wa.client.sendText(jid,text);store.add(jid,'assistant',text,'text');}catch{console.warn('[WhatsApp] fallback send failed');}}
 finally{await wa.client.sendPresence('paused',jid).catch(()=>{});}
 });
}
