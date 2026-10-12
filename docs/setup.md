# 실제 회원·Google 캘린더 설정

2026-10-12 기준 외부 프로젝트는 생성 완료, 서비스 환경 설정은 아직입니다. 아래 설정 전에는 테스트 모드로 달력과 계획을 검증하세요. 비밀 키는 채팅·Git에 올리지 않습니다.

## 1. Supabase 프로젝트

1. 본인 계정에서 새 Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/migrations/001_initial.sql` → `002_link_cleanup.sql` 순서로 **새 프로젝트에 각각 한 번** 실행합니다. 기존에 001을 적용했다면 002만 추가 적용하세요.
3. Authentication → URL Configuration에서 Site URL을 `http://localhost:3000`, Redirect URLs에 `http://localhost:3000/auth/callback`과 `http://localhost:3000/auth/callback?next=/reset-password`를 등록합니다.
4. `.env.local`이 없다면 `.env.example`을 복사합니다. 현재 프로젝트에는 입력용 `.env.local`과 토큰 암호화 키를 준비했습니다. 파일을 덮어쓰지 않고 비어 있는 서비스 값만 입력하세요. Project URL과 anon 공개 키, 서버용 service_role 키를 해당 변수에 입력합니다. service_role은 공개 환경 변수로 만들지 않습니다.
5. 이메일 가입은 이메일 확인을 활성화하여 인증 메일→로그인까지 확인합니다. 테스트 메일 발송 제한이 있다면 프로젝트의 SMTP 설정을 확인합니다.

```sh
# .env.local이 없을 때만 복사
cp -n .env.example .env.local
```

## 2. Google Cloud OAuth

1. 본인 계정의 Google Cloud 프로젝트에서 Google Calendar API를 활성화합니다.
2. OAuth 동의 화면의 앱 이름을 종일로 설정하고 테스트 사용자로 본인 Google 이메일을 등록합니다.
3. 웹 애플리케이션 OAuth Client를 생성합니다.
4. JavaScript origin에 `http://localhost:3000`을 추가합니다.
5. redirect URI를 두 개 등록합니다.
   - Supabase Google Provider 화면에 표시된 `https://<프로젝트>.supabase.co/auth/v1/callback` — 회원 로그인용
   - `http://localhost:3000/api/google/callback` — 캘린더 연결용
6. Supabase Authentication → Providers → Google에서 Google Client ID·Secret을 등록합니다.
7. 같은 Client ID·Secret을 `.env.local`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 입력합니다.
8. 동의 화면의 데이터 접근 권한에 다음을 구성합니다.
   - 로그인: `openid`, 이메일, 프로필
   - 캘린더: `calendar.events.readonly`, `calendar.calendarlist.readonly`
9. `GOOGLE_TOKEN_ENCRYPTION_KEY`에는 준비된 32바이트 키(64자리 16진수)를 유지합니다. 새 환경에서는 별도로 생성하세요. 이 키를 바꾸면 기존 연결 토큰을 복호화할 수 없으므로 기존 사용자는 재연결이 필요합니다.
10. `APP_URL=http://localhost:3000`을 설정하고 앱을 재시작합니다. **127.0.0.1과 localhost를 섞어 로그인하지 마세요.** OAuth·쿠키의 사이트 주소를 일치시켜야 합니다.

일반 로그인 시에는 캘린더 권한을 요청하지 않습니다. 로그인 후 계정 화면의 **Google 캘린더 연결**에서 추가 동의를 요청합니다. 토큰은 서버에서 AES-256-GCM으로 암호화해 저장하며 회원·브라우저는 토큰 테이블을 직접 읽을 수 없습니다.

## 3. 실제 검증 순서

1. 서로 다른 계정 A/B로 로그인해 같은 날짜에 다른 일정을 저장합니다.
2. A의 일정 ID를 알아도 B가 조회·수정·삭제하지 못하는지 검증합니다.
3. 같은 계정의 두 브라우저에서 같은 revision 일정을 수정하여 충돌 메시지·초안 유지·재조회가 동작하는지 봅니다.
4. Google 연결→캘린더 선택→가져오기→재가져오기에서 중복이 생기지 않는지 봅니다.
5. Google 원본의 시각을 바꾸고 재가져옵니다. 개인 준비·이동·메모·준비물이 유지되고 준비 시각이 갱신되는지 봅니다.
6. Google 원본 취소, 권한 거절·철회, 토큰 만료, 반복·하루 종일·해외 시간대 일정을 검증합니다.
7. 연결 해제 후 재가져오기가 연결을 요구하는지 봅니다. 연결 해제는 이미 가져온 일정을 삭제하지 않습니다.
8. 회원 탈퇴에서 Google 권한 철회와 계정·일정 삭제를 확인합니다.

캘린더 연동은 선택 기간의 수동 가져오기입니다. 기간 밖으로 이동한 원본이나 오래된 삭제 항목의 완전한 일관성은 증분 동기화·웹훅 단계에서 보강해야 합니다. 현재의 가져오기 화면을 상시 자동 동기화로 해석하지 않습니다.

## 4. 공개 배포 전

HTTPS 주소로 APP_URL·OAuth redirect·Supabase URL 목록을 바꾸고 Google 앱 검증과 데이터 처리 안내를 준비합니다. 실제 기기 Safari/Chrome, 접근성, 설치, 회원 탈퇴·백업 복원 검증을 완료합니다. 서버 키는 배포 서비스의 비밀 환경 변수로 설정합니다. 앱 종료 후 예약 알림은 별도 서버 작업 큐와 Web Push 범위를 구현해야 합니다.

공식 문서: [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Calendar 권한](https://developers.google.com/workspace/calendar/api/auth).

## 5. 설정 점검·비밀번호 복구

환경 변수 입력 후 `npm run check:setup`을 실행합니다. 변수명과 설정 여부·형식만 표시하며 값은 출력하지 않습니다. 이 점검은 원격 프로젝트 연결 성공을 보장하지 않습니다. 앱을 재시작한 뒤 실제 가입·로그인·캘린더 연결을 테스트하세요.

로그인 화면의 **비밀번호를 잊으셨나요?** → 이메일 입력 → 안내 메일 링크 → 새 비밀번호 두 번 입력 → 다시 로그인 순서입니다. 메일 요청과 링크 열기는 같은 브라우저에서 진행하세요(PKCE). Supabase의 recovery 메일 템플릿이 RedirectTo를 사용하는 기본 링크를 유지하는지 확인하세요. 만료 링크·잘못된 링크·메일 전송 제한도 테스트합니다.

## 6. 프로젝트 생성 완료 후 입력할 값

프로젝트의 `.env.local`에서 비어 있는 다섯 항목을 채우세요.

| 변수 | 가져올 위치 | 사용 |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase Project Settings → API의 Project URL | 회원·DB 연결 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 같은 화면의 legacy anon 키(공개 키) | 브라우저 회원 인증 |
| SUPABASE_SERVICE_ROLE_KEY | 같은 화면의 legacy service_role 키(비밀 키) | 서버 계정 삭제·암호화 토큰 저장 |
| GOOGLE_CLIENT_ID | Google Cloud → APIs & Services → Credentials → 웹 OAuth Client | 로그인·캘린더 연결 |
| GOOGLE_CLIENT_SECRET | 같은 OAuth Client의 secret | 서버 토큰 교환 |

암호화 키와 APP_URL은 이미 로컬 값으로 준비했습니다. 키가 들어간 파일은 Git 제외입니다. `.env.local` 입력 → SQL 001/002 적용 → Supabase URL/Google Provider 설정 → Google 동의 화면·redirect 설정 → 앱 재시작 → 설정 점검 → 실제 테스트 순서로 진행하세요. 아직 실제 키·프로젝트 연결 성공은 확인하지 않았습니다.

## 7. 설정 후 발견된 탈퇴 오류 수정안

설정 후 실제 테스트에서 일정이 있는 계정 삭제가 DB 오류로 실패했습니다. `supabase/migrations/003_account_delete_trigger.sql`을 Supabase SQL Editor에서 실행한 뒤 재검증합니다. 앱 API 키는 SQL 구조 변경용 접속 권한을 제공하지 않아 이 파일은 아직 원격 적용 전입니다.

## 일반 사용자에게 Google 로그인·캘린더 연결 공개

종일 회원 가입과 Google OAuth의 테스트 사용자 목록은 서로 다른 설정입니다. 현재 로그인 코드는 Supabase의 Google OAuth를 사용하며 신규 가입을 허용한 프로젝트에서는 첫 Google 로그인으로 회원이 생성됩니다. 캘린더 연결은 로그인 이후 별도의 권한 동의를 받습니다.

Google 앱이 Testing 상태에서 캘린더 읽기 권한을 요청하면 테스트 사용자로 등록한 계정만 연결할 수 있습니다. 종일에 가입했다고 Google 테스트 사용자 목록에 자동 등록되는 것은 아닙니다. 이름·이메일·프로필만 요청하는 기본 Google 로그인에는 이 테스트 사용자 제한의 예외가 있습니다. [Google 대상·게시 상태 안내](https://support.google.com/cloud/answer/15549945?hl=en)

일반 사용자 공개 절차:

1. 실제 서버 배포 주소를 준비하고 Supabase 신규 사용자 가입이 허용됐는지 확인합니다. GitHub Pages 미리보기에는 실제 인증 서버가 없습니다.
2. Google 인증 플랫폼 → 대상(Audience)의 사용자 유형을 External로 구성합니다.
3. 실제 앱 홈페이지·개인정보처리방침·도메인 소유권·OAuth 콜백 주소를 준비합니다.
4. 데이터 액세스에 실제 사용 중인 최소 권한을 등록합니다. 종일은 Calendar events/calendar list 읽기 권한을 사용합니다.
5. 준비가 완료되면 앱 게시(Publish app)로 In production 상태로 전환합니다. 게시 전환과 Google 검증 완료는 별도입니다.
6. 캘린더 읽기는 민감한 권한이므로 검증 대상 여부를 확인하고 필요한 Google 검증을 진행합니다. 검증 전에는 미확인 앱 경고와 사용자 수 제한이 남을 수 있습니다. [민감한 권한 검증 안내](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
7. 테스트 목록에 없는 계정으로 첫 로그인 → 회원 생성 → 캘린더 권한 동의 → 가져오기를 실제로 검증합니다.

현재 일반 사용자가 동의하면 사용할 수 있는 코드 흐름은 준비되어 있습니다. Google 콘솔의 공개/검증 상태는 아직 변경하거나 확인하지 않았습니다.
