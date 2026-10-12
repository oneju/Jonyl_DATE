import {mkdir,rm,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),target=join(root,'.github-pages-build');
const base=(process.env.PAGES_BASE_PATH??'').replace(/\/$/,'');
if(base&&!/^\/[A-Za-z0-9._-]+$/.test(base))throw Error('PAGES_BASE_PATH must be empty or /repository-name');
await rm(target,{recursive:true,force:true});
for(const dir of ['app/test','app/reset-password','components','lib'])await mkdir(join(target,dir),{recursive:true});
const routes={'app/page.tsx':"import Jongil from '@/components/Jongil';export default function Page(){return <Jongil/>}", 'app/test/page.tsx':"import Jongil from '@/components/Jongil';export default function Page(){return <Jongil allowTest/>}", 'app/reset-password/page.tsx':"export default function Page(){return <main className='welcome'><h1>GitHub Pages 미리보기</h1><p>실제 회원 로그인·메일·Google 연동은 서버가 있는 배포 환경에서 사용할 수 있습니다.</p><a href="+JSON.stringify(base+'/test/')+">테스트 화면으로 돌아가기</a></main>}"};
for(const [name,source] of Object.entries(routes))await writeFile(join(target,name),source);
await copyFile(join(root,'app/globals.css'),join(target,'app/globals.css'));
await writeFile(join(target,'app/layout.tsx'),"import './globals.css';export const metadata={title:'종일 — GitHub Pages 미리보기'};export default function Layout({children}:{children:React.ReactNode}){return <html lang='ko'><body>{children}</body></html>}");
for(const file of ['Jongil.tsx','MonthCalendar.tsx','EventDetail.tsx','TimeGrid.tsx']){
 let source=await readFile(join(root,'components',file),'utf8');
 if(file==='Jongil.tsx')source=source.replaceAll('href="/"',`href=${JSON.stringify(base+'/')}`).replaceAll('href="/reset-password"',`href=${JSON.stringify(base+'/reset-password/')}`).replaceAll('jongil.demo.','jongil.pages.'+encodeURIComponent(base)+'.demo.').replaceAll('Google 로그인은 Supabase 설정 후 사용할 수 있어요. 설정 가이드를 확인해 주세요.','GitHub Pages 미리보기에서는 실제 로그인을 사용할 수 없어요. /test에서 테스트 모드로 시작해 주세요.').replaceAll('Supabase 설정 후 이용할 수 있어요','GitHub Pages 미리보기에서는 실제 로그인을 사용할 수 없어요').replace('로그인하면 일정을 저장할 수 있어요','GitHub Pages 미리보기 · /test에서 테스트하세요');
 await writeFile(join(target,'components',file),source);
}
await copyFile(join(root,'lib/domain.ts'),join(target,'lib/domain.ts'));
// Preview never loads credentials or creates a real Supabase session.
await writeFile(join(target,'lib/supabase-client.ts'),"import type {SupabaseClient} from '@supabase/supabase-js';export const configured=()=>false;export function browser():SupabaseClient|null{return null}");
await copyFile(join(root,'tsconfig.json'),join(target,'tsconfig.json'));
await writeFile(join(target,'package.json'),JSON.stringify({name:'jongil-pages-preview',private:true}));
await writeFile(join(target,'next.config.mjs'),`export default {output:'export',trailingSlash:true,basePath:${JSON.stringify(base)},poweredByHeader:false};`);
const build=spawnSync(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:target,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:''}});
if(build.status!==0)process.exit(build.status??1);
await writeFile(join(target,'out/.nojekyll'),'');
console.log('GitHub Pages preview ready: .github-pages-build/out (test route: '+base+'/test/)');
