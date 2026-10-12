import BerryProtocol from 'berryprotocol';
import pino from 'pino';
import QRCode from 'qrcode';
import {mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {readFile,rm} from 'node:fs/promises';
import {config} from '../config.js';
export class WhatsApp {
 client:BerryProtocol; status='disconnected'; qr?:string;pairingCode?:string;phone?:string;error?:string;
 private operation?:Promise<void>;
 constructor(){if(!/^[a-zA-Z0-9_-]{1,64}$/.test(config.berry.sessionId))throw new Error("BERRY_SESSION_ID inválido");mkdirSync(dirname(config.berry.databasePath),{recursive:true,mode:0o700});mkdirSync(config.berry.authFolder,{recursive:true,mode:0o700});
 this.client=new BerryProtocol({...config.berry,logger:pino({level:'silent'}),printQrInTerminal:false,reconnectDelayMs:2000,reconnectMaxAttempts:5});
 this.client.on('auth.qr',({value})=>{this.qr=value;this.status='waiting_qr';});
 this.client.on('auth.pairing_code',({code,phoneNumber})=>{this.pairingCode=code;this.phone=phoneNumber;this.status='waiting_pairing';});
 this.client.on('connection.open',()=>{this.status='connected';this.qr=undefined;this.pairingCode=undefined;this.error=undefined;void readFile(join(config.berry.authFolder,config.berry.sessionId,'creds.json'),'utf8').then(raw=>{const id=JSON.parse(raw)?.me?.id;if(typeof id==='string')this.phone=id.split(':')[0].split('@')[0];}).catch(()=>{});console.log('[WhatsApp] connected');});
 this.client.on('connection.close',()=>{this.status='disconnected';this.qr=undefined;this.pairingCode=undefined;});
 this.client.on('connection.reconnecting',()=>{this.status='reconnecting';});
 this.client.on('auth.error',()=>{this.error='Falha na conexão/autenticação WhatsApp.';this.status='error';});
 }
 async snapshot(){return {status:this.status,phone:this.phone??null,qr:this.qr?await QRCode.toDataURL(this.qr):null,pairingCode:this.pairingCode??null,error:this.error??null};}
 run(action:'connect'|'pairing'|'disconnect'|'reconnect'|'logout',phone?:string){
 if(this.operation)throw new Error('Uma operação WhatsApp já está em andamento.');
 this.error=undefined;this.qr=undefined;this.pairingCode=undefined;
 this.status=['disconnect','logout'].includes(action)?'disconnecting':'connecting';
 this.operation=(async()=>{
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([(async()=>{switch(action){case 'connect':await this.client.connectWithQr();break;case 'pairing':await this.client.disconnect();await this.client.connectWithPairingCode(phone!);break;case 'disconnect':await this.client.disconnect();this.status='disconnected';break;case 'reconnect':await this.client.reconnect();break;case 'logout':await this.client.logout();await rm(join(config.berry.authFolder,config.berry.sessionId),{recursive:true,force:true});this.status='disconnected';this.phone=undefined;break;}})(),new Promise<void>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Connection timeout')),45000);})]);}
 catch{this.status='error';this.error='Não foi possível concluir a conexão. Verifique internet e tente novamente.';console.warn('[WhatsApp] connection failed');await this.client.disconnect().catch(()=>{});}
 finally{if(timeout)clearTimeout(timeout);this.operation=undefined;}})();
 }
}
