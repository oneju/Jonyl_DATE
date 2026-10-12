# GitHub에 올리기 — 종일 GitHub Pages 확인 가이드

이 가이드는 현재 `/Users/wonju/oneju/proj/jongil` 프로젝트를 GitHub에 올리고, 인터넷 주소로 테스트 화면을 확인하는 순서입니다. 아직 GitHub 업로드나 공개 배포는 실행하지 않았습니다.

## 1. 먼저 확인할 내용

**GitHub Pages에는 테스트용 미리보기를 배포합니다.** 실제 앱에는 회원 인증·일정 저장·Google OAuth를 처리하는 서버가 있습니다. Pages는 HTML/CSS/JavaScript 정적 파일을 제공하므로 현재 앱의 서버 기능을 그대로 실행할 수 없습니다. [Next.js 정적 배포 안내](https://nextjs.org/docs/app/guides/static-exports)

| 확인 항목 | GitHub Pages 미리보기 |
|---|---|
| 일반 홈의 현재 월 달력·오늘 강조 | 가능 |
| `/test/` 테스트 사용자 A/B | 가능 |
| 일정 추가·상세·수정·삭제·날짜 hover + | 가능 |
| 준비·이동·준비물·반복·검색·백업 | 가능 |
| Google 가져오기 **예시** | 가능 |
| 실제 회원 로그인·클라우드 일정 저장 | 서버 배포 후 가능 |
| 실제 Google 캘린더·메일 연동 | 서버 배포 후 가능 |

테스트 일정은 접속한 브라우저에 저장합니다. 다른 기기·다른 브라우저와 공유되지 않습니다. 로컬 개발 화면에서 저장했던 일정도 Pages에 자동으로 옮겨지지 않습니다. 테스트 모드는 `/test/`에서만 시작합니다.

준비한 파일:

- `.github/workflows/pages.yml`: `main`에 업로드하면 미리보기를 자동 빌드·배포
- `scripts/build-pages.mjs`: 실제 서버 파일·환경 설정 파일을 제외하고 정적 미리보기 생성
- `npm run build:pages`: 미리보기 빌드 명령

기존 `npm run dev`와 `npm run build`는 실제 앱용으로 유지합니다. GitHub Pages를 위해 원본 `next.config.ts`의 설정을 바꿀 필요는 없습니다.

## 2. GitHub 저장소 만들기

1. [GitHub](https://github.com)에 로그인합니다.
2. 오른쪽 위 **+ → New repository**를 누릅니다.
3. **Owner**에서 올바른 개인 계정을 선택합니다.
4. **Repository name**에 `jongil`을 입력합니다. 다른 이름도 가능하며 배포 경로는 자동으로 맞춰집니다.
5. 무료 공개 저장소로 진행하려면 **Public**을 선택합니다. 이 경우 업로드한 소스·문서와 테스트 화면이 공개됩니다. Private으로 유지하려면 본인 GitHub 요금제의 Pages 지원 여부를 먼저 확인하세요.
6. **Add a README**, **.gitignore**, **license**는 여기서 추가하지 않습니다. 로컬 프로젝트에 README와 .gitignore가 있습니다.
7. **Create repository**를 누릅니다.
8. 생성된 저장소의 HTTPS 주소를 복사합니다. 예: `https://github.com/GITHUB_ID/jongil.git`. `GITHUB_ID`는 본인의 실제 GitHub 아이디로 바꿉니다.

## 3. GitHub Pages 설정

**첫 업로드 전에** 방금 만든 저장소에서 다음을 설정합니다.

1. 저장소 상단 **Settings**를 누릅니다.
2. 왼쪽 **Pages**를 누릅니다.
3. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
4. 여기서 추가 템플릿을 선택할 필요는 없습니다. 프로젝트에 준비된 `pages.yml`을 업로드하면 사용됩니다.

이 메뉴는 GitHub 공식 설정 방식입니다. Pages 메뉴가 없거나 비활성화됐다면 저장소 관리 권한과 저장소 공개 여부/요금제를 확인하세요. [GitHub Pages 배포 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 4. 내 컴퓨터에서 코드 올리기

터미널을 열어 아래 명령을 순서대로 실행합니다.

### 4-1. 프로젝트 위치 확인

```sh
cd /Users/wonju/oneju/proj/jongil
git status
```

이미 Git 저장소로 만들어져 있으므로 `git init`은 필요하지 않습니다. 현재 기본 브랜치는 `main`입니다.

### 4-2. 비밀 설정 파일이 제외되는지 확인

```sh
git check-ignore .env.local
```

결과에 `.env.local`이 표시되어야 합니다. 실제 키가 들어 있는 이 파일은 GitHub에 올리지 않습니다. 이 미리보기에는 Supabase 키·Google Client Secret·암호화 키를 GitHub Secrets에 추가할 필요도 없습니다.

현재 기획 자료·화면 캡처·작업 기록은 제외됩니다. `docs/`에서는 실행에 필요한 `setup.md`와 이 업로드 가이드만 남깁니다. `.github-pages-build/`, `node_modules/`, `.next/`, 테스트 실행 결과도 제외됩니다. 테스트 소스와 설정은 검증 명령을 사용할 수 있도록 유지합니다.

### 4-3. 변경 저장

```sh
git add .
git diff --cached --name-only
```

목록에서 업로드될 파일을 확인합니다. `.env.local`이 보이면 진행을 멈추고 제외 설정을 확인하세요. 이 명령은 파일 이름만 보여줍니다.

```sh
git commit -m "Prepare Jongil calendar and GitHub Pages preview"
```

처음 사용하는 Git이라 이름·이메일 오류가 뜨면 저장소에 본인 정보만 설정하고 commit을 다시 실행합니다.

```sh
git config user.name "본인 이름"
git config user.email "GitHub에 사용하는 이메일"
```

### 4-4. GitHub 저장소 연결

아래 주소의 `GITHUB_ID`를 본인 아이디로 바꿉니다. 저장소 이름을 다르게 만들었다면 `jongil`도 바꿉니다.

```sh
git remote add origin https://github.com/GITHUB_ID/jongil.git
git push -u origin main
```

로그인 요청이 나오면 GitHub 인증을 진행합니다. GitHub 계정 비밀번호를 Git 인증 비밀번호로 입력하는 방식은 사용하지 않습니다. GitHub Desktop의 **Add local repository → Publish repository**로 업로드해도 됩니다.

`remote origin already exists`가 나오면 `git remote -v`로 기존 연결을 확인합니다. 본인의 새 저장소로 바꾸려는 경우에만 다음을 사용합니다.

```sh
git remote set-url origin https://github.com/GITHUB_ID/jongil.git
git push -u origin main
```

## 5. 배포 완료 확인

1. GitHub 저장소에서 **Actions** 탭을 누릅니다.
2. **Publish Jongil preview to GitHub Pages** 실행을 엽니다.
3. 빌드와 배포가 끝나 초록색 체크가 표시될 때까지 기다립니다.
4. **Settings → Pages → Visit site** 또는 실행 결과의 `github-pages` 주소를 엽니다.
5. 저장소 이름이 `jongil`이면 테스트 주소는 아래 형태입니다.

```text
https://GITHUB_ID.github.io/jongil/test/
```

일반 홈은 `https://GITHUB_ID.github.io/jongil/`입니다. 저장소를 `GITHUB_ID.github.io`라는 이름으로 만든 경우에는 `/jongil`이 빠져 `https://GITHUB_ID.github.io/test/`가 됩니다. 워크플로가 두 종류를 자동으로 처리합니다.

**/test/ → 테스트 모드로 시작 → 계정 → 예시 일정 추가** 순서로 화면을 확인하세요.

- [ ] 일반 홈에 현재 월·오늘 강조가 표시된다.
- [ ] `/test/`에서만 테스트 사용자로 진입한다.
- [ ] 날짜를 누르면 해당 날짜의 새 일정 팝업이 열린다.
- [ ] 데스크톱 날짜 hover에서 +가 보인다.
- [ ] 저장한 일정을 선택하면 상세 팝업과 수정 버튼이 보인다.
- [ ] 새로고침 후 테스트 일정이 유지된다.
- [ ] 모바일·데스크톱 화면이 바뀐다.

## 6. 이후 변경 올리기

개발을 마친 뒤 다음 명령을 실행하면 `main`에 올라가면서 Pages도 다시 배포됩니다.

```sh
cd /Users/wonju/oneju/proj/jongil
git add .
git diff --cached --name-only
git commit -m "Update Jongil calendar"
git push
```

## 7. 문제가 있을 때

| 증상 | 확인 방법 |
|---|---|
| Actions에서 Pages 설정 오류 | Settings → Pages → Source가 GitHub Actions인지 확인한 뒤 실패 실행의 Re-run all jobs |
| 사이트 404 | Actions 배포 성공 여부와 저장소 이름을 포함한 URL, 끝의 `/test/` 확인 |
| 화면이 흰색이거나 스타일이 없음 | 워크플로의 Build 단계 확인. 저장소 이름을 바꿨다면 새로 실행. 브라우저 새로고침 |
| 일정이 다른 기기에 없음 | Pages 테스트 모드는 브라우저 저장이며 클라우드 동기화를 하지 않음 |
| 로그인·Google 연결이 안 됨 | 이 미리보기에서는 실제 연동을 제공하지 않음. 아래 실제 서비스 배포 필요 |
| push rejected / fetch first | 기존 원격 파일이 있는 저장소일 수 있음. 강제 push하지 말고 기존 내용 확인 |
| 수정한 화면이 바로 안 보임 | 최신 Actions 실행 성공 확인 후 새로고침 |

## 8. 실제 회원·Google 연동까지 테스트하려면

코드를 같은 GitHub 저장소에 올린 뒤 Next.js 서버를 지원하는 배포 환경(예: Vercel)에 연결해야 합니다. Pages용 `build:pages` 대신 실제 앱의 `npm run build`를 사용합니다.

배포 환경에 `.env.local`의 필요한 환경 변수를 등록하고 `APP_URL`을 실제 배포 주소로 바꿉니다. 비밀 설정 파일 자체를 저장소에 올리지 않습니다. Supabase의 Site URL/Redirect URLs, Google OAuth의 JavaScript origin/redirect URI도 실제 주소에 맞춥니다. 자세한 키·주소 항목은 [설정 가이드](setup.md)를 참고하세요.

회원 탈퇴는 이전 테스트에서 DB 오류가 남아 있으므로 SQL003 원격 적용·재검증이 별도로 필요합니다. 배포됐다는 이유로 실제 인증·메일·Google 최종 연결이 검증된 것은 아닙니다.

## 로컬에서 Pages 미리보기 빌드 확인

GitHub에 올리기 전에 생성만 확인하고 싶을 때 사용합니다.

```sh
cd /Users/wonju/oneju/proj/jongil
PAGES_BASE_PATH=/jongil npm run build:pages
```

출력은 `.github-pages-build/out`에 생성됩니다. 이 디렉터리는 Git에 넣지 않고 Actions가 배포 파일만 업로드합니다. 실제 앱의 개발 서버와 `.env.local`은 이 빌드로 변경되지 않습니다.

검증 기록(2026-10-12): `/jongil` 경로로 정적 빌드 성공. 로컬 정적 서버에서 일반 홈/테스트 분리·hover +·일정 저장/수정/새로고침·모바일 화면·외부 API 요청 없음 확인. 타입 검사와 환경 파일 제외 확인 완료. **GitHub Actions의 실제 원격 배포는 업로드 후 확인해야 합니다.**
