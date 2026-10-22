# 종일

약속 전의 준비 시간·이동·준비물을 함께 관리하는 모바일·데스크톱 웹 캘린더입니다. 실제 회원 인증은 Supabase, 일정 저장은 PostgreSQL, 회원 가입은 이메일 인증을 사용합니다. Google 로그인도 기존 설정 시 사용할 수 있습니다.

## 실행

Node.js 22.x를 사용합니다.

```sh
npm ci
npm run dev
```

일반 서비스: `http://localhost:3000/`. 테스트 사용자 A/B: `http://localhost:3000/test`. 날짜 클릭은 새 일정 팝업, 일정 선택은 상세 팝업, 수정 버튼은 편집 화면을 엽니다. 화면 폭 900px부터 데스크톱 달력·날짜 hover +가 표시됩니다.

테스트 모드는 `/test`에서만 브라우저 저장을 사용합니다. 일반 홈은 실회원 데이터만 읽고 저장합니다.

## 메인 서비스 배포

GitHub 저장소 `oneju/Jonyl_DATE`를 Vercel에 Import합니다. Framework는 Next.js, Root Directory는 ./, Node.js는 22.x입니다. `vercel.json`의 `npm run build:service`가 환경 설정을 점검한 뒤 서버 기능을 포함해 빌드합니다. Output Directory는 Next.js 기본값을 유지합니다.

운영 환경 변수는 다음 4개를 Vercel Production에 등록합니다.

| 변수 | 유형·내용 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Config · Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Config · Supabase 공개 anon 키 |
| SUPABASE_SERVICE_ROLE_KEY | Secret · Supabase 서버용 키 |
| APP_URL | Config · 실제 서비스의 루트 HTTPS 주소 |

Google 캘린더 가져오기를 제거했으므로 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_ENCRYPTION_KEY는 앱 배포에 필요하지 않습니다. Google 로그인은 Supabase Provider에서 별도 관리합니다.

`.env.local`은 Git에 올리지 않습니다. 배포 변수 변경 후 재배포합니다. 공개 서비스 APP_URL에 localhost나 하위 경로를 사용하지 않습니다. 배포 점검은 로컬 환경 파일을 대신 읽지 않습니다.

Supabase Authentication에서 Email Provider와 신규 가입을 활성화하고 Confirm email을 켭니다. Site URL은 서비스 주소, Redirect URLs는 `https://서비스주소/auth/callback` 및 비밀번호 복구에 쓰는 `https://서비스주소/auth/callback?next=/reset-password`를 허용합니다. 자체 SMTP와 발신자 설정을 완료하고 인증 메일 수신을 검증합니다.

Google 캘린더 가져오기 화면과 서버 API는 제거했습니다. 기존 가져온 일정은 보존하며 종일에서 직접 편집할 수 있습니다. Google 로그인을 유지하려면 Supabase의 Google Provider 로그인 설정만 유지합니다.

main 업로드 후 Vercel에서 실제 서비스가 배포됩니다. `.github/workflows/ci.yml`은 코드 검사만 수행합니다. 로컬의 상세 절차는 `docs/github-upload.md`에 있습니다(현재 사용자 설정으로 문서는 Git 업로드에서 제외).

## 기능·검증

- 월/주/일/연 달력, 검색, 색상 필터, 일정 CRUD·반복·이번만 수정
- 준비/출발/도착 계산, 준비물 체크, 다음 일정 여유·부족 안내
- Supabase 이메일·Google 인증, 비밀번호 복구, 계정별 일정 저장
- 이메일 가입·비밀번호 확인·인증 메일 재발송·한국어 오류 안내, JSON 백업·복원

```sh
npm test
npm run build
npm run typecheck
npm run check:setup
# 실행 중인 앱에서 브라우저 검사
npm run test:e2e
```

DB 설정은 `supabase/migrations/`에 있습니다. 기존 서비스에는 SQL003(탈퇴 트리거 권한 수정)과 SQL004(캘린더 토큰·가져오기 함수 제거)를 차례로 적용합니다. SQL001/002는 기존 DB에 다시 실행하지 않습니다. 탈퇴는 Auth 사용자와 연관 데이터를 한 트랜잭션으로 삭제하며 실패 시 일정을 먼저 삭제하지 않습니다. 원격 DB 적용과 실제 인증 메일 수신은 별도 검증이 필요합니다.

지도 자동 이동 시간·오프라인 동기화·앱 종료 후 푸시는 현재 지원 범위에 포함되지 않습니다.
