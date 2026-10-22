import {test,expect} from '@playwright/test';
test('Google 가져오기 UI와 API 제거',async({page,request})=>{
 await page.goto('/test');await page.getByRole('button',{name:'테스트 모드로 시작'}).click();await page.getByRole('button',{name:'계정',exact:true}).click();await expect(page.getByText('Google 캘린더',{exact:true})).toHaveCount(0);for(const path of ['connect','import','callback','disconnect','calendars'])expect((await request.get('/api/google/'+path)).status()).toBe(404);
});
test('빈 값·문자·음수 입력은 안내 후 수정 저장 가능, 날짜 비워도 정상',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/test');await page.getByRole('button',{name:'테스트 모드로 시작'}).click();await page.getByRole('button',{name:'일정 추가',exact:true}).click();await page.getByLabel('제목',{exact:true}).fill('입력 검증');
 await page.getByRole('tab',{name:'준비·이동',exact:true}).click();const input=page.getByLabel('준비 시간 (분)',{exact:true});
 for(const raw of ['','abc','-1','1.5','1441']){await input.fill(raw);await page.getByRole('button',{name:'저장',exact:true}).click();await expect(page.getByRole('dialog',{name:'일정과 연결 정보'}).getByRole('alert')).toContainText('준비 시간');await expect(input).toHaveValue(raw)}
 await input.fill('25');await page.getByRole('tab',{name:'기본 정보',exact:true}).click();await page.getByLabel('하루 종일',{exact:true}).check();await page.getByLabel('종료 (마지막 날 포함)',{exact:true}).fill('');await page.getByRole('button',{name:'저장',exact:true}).click();await expect(page.getByRole('dialog',{name:'일정과 연결 정보'}).getByRole('alert')).toContainText('종료');await page.getByLabel('종료 (마지막 날 포함)',{exact:true}).fill(new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}));await page.getByRole('button',{name:'저장',exact:true}).click();await expect(page.getByRole('button',{name:/입력 검증/})).toBeVisible();expect(errors).toEqual([]);
});
test('이메일 가입 입력 검증과 인증 메일·재발송 안내',async({page})=>{
 let signup=0,resend=0;
 await page.route('**/api/auth/email',async route=>{const body=route.request().postDataJSON();expect(body.email).toBe('member@example.com');if(body.action==='resend'){resend++;await route.fulfill({json:{ok:true}})}else{signup++;await route.fulfill({json:{ok:true,confirmationRequired:true}})}});
 await page.goto('/');await page.getByRole('button',{name:'계정',exact:true}).click();await page.getByRole('button',{name:'이메일 로그인 / 가입'}).click();
 const dialog=page.getByRole('dialog',{name:'회원 로그인'});await dialog.getByRole('button',{name:'이메일로 가입',exact:true}).click();const submit=dialog.getByRole('button',{name:'가입하고 인증 메일 받기'});
 await submit.click();await expect(dialog.getByRole('alert')).toContainText('이메일');await dialog.getByLabel('이메일',{exact:true}).fill('abc');await submit.click();await expect(dialog.getByRole('alert')).toContainText('형식');
 await dialog.getByLabel('이메일',{exact:true}).fill('member@example.com');await dialog.getByLabel('비밀번호',{exact:true}).fill('abcdefgh');await dialog.getByLabel('비밀번호 확인',{exact:true}).fill('different');await submit.click();await expect(dialog.getByRole('alert')).toContainText('일치');expect(signup).toBe(0);
 await dialog.getByLabel('비밀번호 확인',{exact:true}).fill('abcdefgh');await submit.click();await expect(dialog.getByRole('status')).toContainText('인증 메일');expect(signup).toBe(1);await dialog.getByRole('button',{name:'인증 메일 다시 받기'}).click();await expect(dialog.getByRole('status')).toContainText('재발송');expect(resend).toBe(1);
});
