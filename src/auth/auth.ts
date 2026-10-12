import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import type {Request,Response,NextFunction} from 'express';
import type {Store} from '../db/database.js';
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password:string,hash:string){try{const [salt,value]=hash.split(':');const expected=Buffer.from(value,'hex');const actual=scryptSync(password,salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export class Auth {
 constructor(public store:Store){
 const email=process.env.ADMIN_EMAIL;const password=process.env.ADMIN_PASSWORD;
 if(!email||!password)throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env.');
 if(password.length<12)throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
 const old=store.db.prepare('SELECT password_hash FROM admins WHERE email=?').get(email) as {password_hash:string}|undefined;
 if(!old||!verifyPassword(password,old.password_hash)){store.db.transaction(()=>{store.db.prepare('INSERT INTO admins VALUES(?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash').run(email,hashPassword(password));store.db.prepare('DELETE FROM sessions WHERE email=?').run(email);})();}
 }
 session(req:Request){const token=req.cookies?.berry_session;if(typeof token!=='string')return;this.store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());return this.store.db.prepare('SELECT email,csrf,expires FROM sessions WHERE token_hash=? AND expires>?').get(digest(token),Date.now()) as {email:string;csrf:string;expires:number}|undefined;}
 protect=(req:Request,res:Response,next:NextFunction)=>{const session=this.session(req);if(!session){if(req.originalUrl.startsWith('/api/'))res.status(401).json({error:'Sessão expirada. Faça login.'});else res.redirect('/login');return;}res.locals.session=session;next();};
 csrf=(req:Request,res:Response,next:NextFunction)=>{if(['GET','HEAD','OPTIONS'].includes(req.method)){next();return;}const session=this.session(req);if(!session||req.get('x-csrf-token')!==session.csrf){res.status(403).json({error:'Token CSRF inválido.'});return;}next();};
 login(email:string,password:string,res:Response){const row=this.store.db.prepare('SELECT password_hash FROM admins WHERE email=?').get(email) as {password_hash:string}|undefined;const valid=verifyPassword(password,row?.password_hash??hashPassword('dummy-password'));if(!row||!valid)return false;const token=randomBytes(32).toString('hex');const csrf=randomBytes(24).toString('hex');const expires=Date.now()+8*3600_000;this.store.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),email,expires,csrf);res.cookie('berry_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:8*3600_000,path:'/'});return true;}
 logout(req:Request,res:Response){const token=req.cookies?.berry_session;if(typeof token==='string')this.store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));res.clearCookie('berry_session',{path:'/',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict'});}
}
