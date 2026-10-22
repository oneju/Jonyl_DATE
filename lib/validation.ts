import {z} from 'zod';
export function integerInput(raw:string,label:string,min:number,max:number,optional=false):{value?:number|null;error?:string}{
 const text=raw.trim();
 if(!text)return optional?{value:null}:{error:`${label}을 입력해 주세요 (${min}~${max})`};
 if(!/^\d+$/.test(text))return {error:`${label}은 ${min}~${max} 사이의 정수로 입력해 주세요`};
 const value=Number(text);
 return Number.isSafeInteger(value)&&value>=min&&value<=max?{value}:{error:`${label}은 ${min}~${max} 사이로 입력해 주세요`};
}
export function eventError(error:z.ZodError){
 const issue=error.issues[0];
 if(!issue)return '입력 내용을 확인해 주세요';
 const labels:Record<string,string>={title:'제목',start:'시작 날짜와 시간',end:'종료 날짜와 시간',prep:'준비 시간',travel:'이동 시간',buffer:'도착 여유',repeatInterval:'반복 간격',repeatCount:'종료 횟수',location:'장소',memo:'메모',items:'준비물'};
 const label=labels[String(issue.path[0])]??'입력값';
 if(issue.code==='invalid_type')return `${label}의 값을 올바르게 입력해 주세요`;
 if(issue.code==='too_big')return `${label}의 허용 범위를 초과했어요. 입력을 줄여 주세요`;
 if(issue.code==='too_small'&&issue.path[0]!=='title')return `${label}의 값을 확인해 주세요`;
 if(issue.message.startsWith('Invalid'))return `${label}의 형식을 확인해 주세요`;
 return issue.message;
}
export function credentials(email:string,password:string,signup=false,confirmation=''){
 if(!email.trim())return '이메일을 입력해 주세요';
 if(!z.email().safeParse(email.trim()).success)return '이메일 주소 형식을 확인해 주세요 (예: name@example.com)';
 if(!password)return '비밀번호를 입력해 주세요';
 if(signup&&password.length<8)return '비밀번호는 8자 이상 입력해 주세요';
 if(signup&&password!==confirmation)return '비밀번호 확인이 일치하지 않아요';
 return '';
}
export function authError(error:{code?:string;status?:number}){
 const messages:Record<string,string>={invalid_credentials:'이메일 또는 비밀번호가 맞지 않아요',email_not_confirmed:'이메일 인증을 완료한 뒤 로그인해 주세요',user_already_exists:'이미 가입된 이메일이에요. 로그인 또는 비밀번호 재설정을 이용해 주세요',email_address_invalid:'이메일 주소를 확인해 주세요',weak_password:'더 안전한 비밀번호를 사용해 주세요',signup_disabled:'현재 신규 가입이 중지되어 있어요. 관리자에게 문의해 주세요',over_email_send_rate_limit:'인증 메일 요청이 많아요. 잠시 후 다시 시도해 주세요',over_request_rate_limit:'요청이 많아요. 잠시 후 다시 시도해 주세요'};
 return messages[error.code??'']??(error.status===429?'요청이 많아요. 잠시 후 다시 시도해 주세요':'요청을 완료하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요');
}
