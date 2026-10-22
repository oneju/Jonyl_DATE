type Environment={APP_URL?:string;VERCEL?:string;VERCEL_ENV?:string;VERCEL_URL?:string};
export function authOrigin(requestUrl:string,env:Environment={APP_URL:process.env.APP_URL,VERCEL:process.env.VERCEL,VERCEL_ENV:process.env.VERCEL_ENV,VERCEL_URL:process.env.VERCEL_URL}){
 const request=new URL(requestUrl);
 if(!env.VERCEL&&['localhost','127.0.0.1','[::1]'].includes(request.hostname))return request.origin;
 const configured=env.VERCEL_ENV==='preview'&&env.VERCEL_URL?'https://'+env.VERCEL_URL:env.APP_URL;
 if(!configured)throw Error('SETUP_REQUIRED');
 const url=new URL(configured);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('SETUP_REQUIRED');
 return url.origin;
}
