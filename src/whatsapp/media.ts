import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import https from 'node:https';
export function allowedUrl(raw:string,hosts:string[]):boolean {try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&hosts.includes(u.hostname.toLowerCase());}catch{return false;}}
function publicIp(ip:string){if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19));}return !ip.startsWith('::')&&!/^f[cd]/i.test(ip)&&!/^fe[89ab]/i.test(ip);}
export async function loadMedia(raw:string):Promise<{buffer:Buffer;mimetype:string}>{
 const hosts=(process.env.ALLOWED_MEDIA_HOSTS??process.env.ALLOWED_CTA_HOSTS??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowedUrl(raw,hosts))throw new Error('Media host not allowed');const u=new URL(raw);if(u.protocol!=='https:'||u.port&&u.port!=='443')throw new Error('Media requires HTTPS:443');
 const addresses=await lookup(u.hostname,{all:true});if(!addresses.length||addresses.some(a=>!publicIp(a.address)))throw new Error('Private media destination');
 return new Promise((resolve,reject)=>{const req=https.get(u,{lookup:(_hostname,_options,callback)=>callback(null,addresses[0].address,addresses[0].family)},res=>{if(res.statusCode!==200){res.resume();reject(new Error('Media HTTP failure'));return;}const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>25*1024*1024){req.destroy(new Error('Media too large'));return;}chunks.push(chunk);});res.on('error',reject);res.on('end',()=>resolve({buffer:Buffer.concat(chunks),mimetype:res.headers['content-type']?.split(';')[0]??'application/octet-stream'}));});req.setTimeout(15000,()=>req.destroy(new Error('Media timeout')));req.on('error',reject);});
}
