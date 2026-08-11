# Reading Book

독서 중 인물 관계와 역사적 배경을 함께 정리하기 위한 Next.js 웹앱입니다.

## 기술 스택

- Next.js App Router
- Tailwind CSS
- Font Awesome
- JSON 시드 데이터
- GitHub 저장소 연동
- Vercel 배포

## 주요 기능

### 1. 인물 관계도

- 중심 인물을 기준으로 연결 인물을 추가
- 관계 유형 선택: 친구, 부부, 자식, 사업, 기타 직접 입력
- 인물별 배경 메모와 주요 행동 메모 기록
- 인물 카드 드래그 이동, 곡선 연결선, 버튼 및 마우스 휠 확대/축소, 미니맵 지원
- 브라우저 로컬 저장으로 작업 상태 유지

### 2. 지역별 역사 연표

- 지역 구분: 서유럽, 동유럽, 아시아, 미국, 남미, 기타
- BC 3000부터 시작하는 시드 역사 카드 제공
- 카드 드래그 앤 드롭으로 지역 이동 및 순서 저장
- 연도, 설명, 태그 편집 및 카드 추가
- 연도 x 지역 요약 표, 검색, 시대 필터 제공

## 시작 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다.

## 데이터 위치

- 인물 관계 시드: src/data/character-map.json
- 역사 연표 시드: src/data/timeline.json

## GitHub 사용 흐름

```bash
git init
git add .
git commit -m "Create reading workspace app"
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 커밋 전 정리

- Next.js 실행 중 생성된 AGENTS.md, CLAUDE.md는 그대로 함께 커밋하면 작업 트리가 깔끔하게 유지됩니다.
- 검증 명령: npm run lint
- 빌드 검증: npx next build --webpack

## Vercel 배포

1. GitHub에 저장소를 푸시합니다.
2. Vercel에서 New Project를 선택합니다.
3. GitHub 저장소를 Import 합니다.
4. Framework Preset은 Next.js를 그대로 사용합니다.
5. Deploy를 누르면 main 브랜치 기준으로 자동 배포됩니다.

이 프로젝트는 서버 파일 시스템에 쓰지 않고 JSON 시드 데이터와 브라우저 저장소를 사용하므로, Vercel 환경에서도 별도 데이터베이스 없이 바로 동작합니다.
