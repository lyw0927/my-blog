# My Blog

개인 블로그 프로젝트 (React + Vite / Node.js + Express + Firebase Firestore)

## 프로젝트 구조

```
my blog/
├── frontend/   React + Vite (포트 5173)
└── backend/    Node.js + Express + Firebase Admin SDK (포트 4000)
```

## 시작 전 준비: Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Firestore Database** 활성화 (테스트 모드로 시작)
3. 프로젝트 설정 → 서비스 계정 → **새 비공개 키 생성** → JSON 다운로드
4. 다운로드한 파일을 `backend/firebase-service-account.json`으로 저장

## 백엔드 실행

```bash
cd backend
cp .env.example .env   # 환경 변수 복사
npm run dev            # nodemon으로 개발 서버 실행
```

## 프론트엔드 실행

```bash
cd frontend
cp .env.example .env   # 환경 변수 복사
npm run dev            # Vite 개발 서버 실행
```

## API 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/posts | 글 목록 조회 |
| GET | /api/posts/:id | 글 단건 조회 |
| POST | /api/posts | 글 작성 |
| POST | /api/posts/:id/like | 좋아요 증가 |
| GET | /api/posts/:id/comments | 댓글 목록 |
| POST | /api/posts/:id/comments | 댓글 작성 |

## Firestore 데이터 구조

```
posts (컬렉션)
 └── {postId}
      ├── title: string
      ├── content: string
      ├── author: string
      ├── likes: number
      ├── createdAt: timestamp
      └── comments (서브컬렉션)
           └── {commentId}
                ├── author: string
                ├── content: string
                └── createdAt: timestamp
```
