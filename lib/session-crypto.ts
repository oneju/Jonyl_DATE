import {createCipheriv,createDecipheriv,createHash,hkdfSync,randomBytes} from 'node:crypto';
export const browserHash=(value:string)=>createHash('sha256').update(value).digest('hex');
function key(secret:string){if(!secret)throw Error('SETUP_REQUIRED');return Buffer.from(hkdfSync('sha256',secret,'jongil-auth-v1','account-session',32))}
export function sealSession(value:unknown,binding:string,secret:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(secret),iv);cipher.setAAD(Buffer.from(binding));const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function openSession<T>(value:string,binding:string,secret:string):T{
 const bytes=Buffer.from(value,'base64url');if(bytes.length<29)throw Error('ACCOUNT_EXPIRED');const cipher=createDecipheriv('aes-256-gcm',key(secret),bytes.subarray(0,12));cipher.setAAD(Buffer.from(binding));cipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
}
