import {authenticated} from './server';import {accountList} from './account-session';
export async function requestAccount(r:Request){
 const selected=r.headers.get('x-jongil-account');if(selected)return authenticated(selected);
 const list=await accountList();return authenticated(list.activeId??undefined);
}
