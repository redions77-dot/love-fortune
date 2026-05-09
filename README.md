# ✨ 나의 연애·결혼 운세 앱

사주·MBTI·혈액형으로 이상형, 연애운, 결혼운을 분석하는 웹 앱입니다.

---

## 🚀 시작하기

### 1. API 키 설정

```bash
cd backend
cp .env.example .env
```

`.env` 파일을 열고 Anthropic API 키를 입력하세요:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

> API 키 발급: https://console.anthropic.com

---

### 2. 백엔드 실행

```bash
cd backend
npm install
npm run dev
```

✅ `http://localhost:4000` 에서 실행

---

### 3. 프론트엔드 실행

새 터미널을 열고:

```bash
cd frontend
npm install
npm run dev
```

✅ `http://localhost:5173` 에서 실행

---

## 📁 폴더 구조

```
love-fortune/
├── backend/
│   ├── server.js       ← Express 서버 + Claude API 연동
│   ├── package.json
│   └── .env.example    ← API 키 설정 파일
└── frontend/
    ├── src/
    │   ├── App.jsx     ← 메인 화면
    │   ├── index.css   ← 전역 스타일
    │   └── main.jsx    ← 진입점
    ├── index.html
    └── vite.config.js
```

---

## 💰 수익화 구조

| 기능 | 가격 |
|------|------|
| 이상형 분석 | 무료 |
| 연애운 분석 | 1,900원 |
| 결혼운 분석 | 1,900원 |
| 궁합 분석 | 1,900원 |

---

## 🌐 배포하기 (Vercel + Railway)

### 프론트엔드 (Vercel - 무료)
1. GitHub에 올리기
2. vercel.com 접속 → Import Project
3. `frontend` 폴더 선택
4. 배포 완료!

### 백엔드 (Railway - 무료 티어)
1. railway.app 접속
2. New Project → GitHub repo 연결
3. `backend` 폴더 선택
4. 환경변수에 `ANTHROPIC_API_KEY` 추가
5. 배포 완료!

---

## 💳 토스페이먼츠 연동 (다음 단계)

`backend/server.js`에 결제 검증 엔드포인트 추가 예정:
- `POST /api/payment/confirm` - 결제 확인
- `POST /api/analyze` - isPaid 토큰 검증 후 프리미엄 콘텐츠 제공

---

## 📞 문의

그래언니 (@grae_sis) 인스타그램
