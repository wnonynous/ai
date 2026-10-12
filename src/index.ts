import 'dotenv/config';
import {Store} from './db/database.js';
import {WhatsApp} from './whatsapp/client.js';
import {createApp} from './server/app.js';
import {receive} from './agent/service.js';
const store=new Store();const wa=new WhatsApp();
wa.client.on('message.received',message=>{console.log('[WhatsApp] message received');void receive(store,wa,message).catch(()=>console.warn('[Agent] processing failed'));});
const port=Number(process.env.PORT??3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT inválida');
const server=createApp(store,wa).listen(port,()=>console.log(`[Server] Painel: http://localhost:${port}`));
if(process.env.WHATSAPP_AUTO_CONNECT==='true')wa.run('connect');
let shuttingDown=false;
async function shutdown(){if(shuttingDown)return;shuttingDown=true;server.close();await wa.client.disconnect().catch(()=>{});store.close();process.exit(0);}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
