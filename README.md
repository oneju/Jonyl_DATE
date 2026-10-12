# 종일

약속 전의 준비 시간·이동·준비물을 함께 관리하는 모바일·데스크톱 웹 캘린더입니다. 실제 회원 인증은 Supabase, 일정 저장은 PostgreSQL, Google 캘린더 연결은 서버의 OAuth API를 사용합니다.

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

운영 환경 변수 7개를 Vercel의 Production에 등록합니다.

| 변수 | 내용 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 공개/anon 키 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 서버용 키 |
| GOOGLE_CLIENT_ID | Google 웹 OAuth Client ID |
| GOOGLE_CLIENT_SECRET | 같은 Client Secret |
| GOOGLE_TOKEN_ENCRYPTION_KEY | 기존 64자리 토큰 암호화 키 |
| APP_URL | 실제 서비스의 루트 HTTPS 주소 |

`.env.local`은 Git에 올리지 않습니다. 배포 변수 변경 후 재배포합니다. 공개 서비스 APP_URL에 localhost나 하위 경로를 사용하지 않습니다. 배포 점검은 로컬 환경 파일을 대신 읽지 않습니다.

Supabase Authentication의 Site URL을 서비스 주소로, Redirect URLs에는 `https://서비스주소/auth/callback`을 등록합니다. 신규 가입 허용과 Google Provider 활성화도 확인합니다. Google 웹 OAuth Client에는 서비스 원본 주소와 `https://서비스주소/api/google/callback`을 추가하고 Supabase Provider의 로그인 콜백을 유지합니다.

일반 사용자의 캘린더 연결은 Google Audience의 External/게시 설정과 민감한 권한 검증 요건을 충족해야 합니다. GitHub Pages용 미리보기 배포는 제거했습니다. 기존 Pages 사이트가 켜져 있다면 Settings → Pages에서 공개를 해제하고 Vercel 주소를 사용합니다.

main 업로드 후 Vercel에서 실제 서비스가 배포됩니다. `.github/workflows/ci.yml`은 코드 검사만 수행합니다. 로컬의 상세 절차는 `docs/github-upload.md`에 있습니다(현재 사용자 설정으로 문서는 Git 업로드에서 제외).

## 기능·검증

- 월/주/일/연 달력, 검색, 색상 필터, 일정 CRUD·반복·이번만 수정
- 준비/출발/도착 계산, 준비물 체크, 다음 일정 여유·부족 안내
- Supabase 이메일·Google 인증, 비밀번호 복구, 계정별 일정 저장
- Google 일정 읽기 가져오기·재가져오기, 개인 준비 계획 유지, JSON 백업·복원

```sh
npm test
npm run build
npm run typecheck
npm run check:setup
# 실행 중인 앱에서 브라우저 검사
npm run test:e2e
```

DB 설정은 `supabase/migrations/`에 있습니다. SQL001/002는 기존 설정을 확인하고 적용합니다. 일정이 있는 회원의 탈퇴에서 확인된 DB 오류는 SQL003 수정안을 원격 적용한 뒤 재검증해야 합니다. 실제 공개 서비스의 최종 Google 동의·이메일 수신·회원 탈퇴 검증은 아직 완료되지 않았습니다.

Google은 최근30일~앞으로90일의 등록된 캘린더 일정을 수동으로 가져옵니다. Gmail 본문은 읽지 않습니다. 지도 자동 이동 시간·오프라인 동기화·앱 종료 후 푸시는 현재 지원 범위에 포함되지 않습니다.
