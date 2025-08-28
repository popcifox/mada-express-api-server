# 🚴‍♂️ Express API Server - 따릉이 재배치 예측 시스템

따릉이 정류소의 수요를 예측하고 재배치 계획을 생성하는 Express.js 기반 API 서버입니다.

## 📋 프로젝트 개요

이 프로젝트는 서울시 공공자전거(따릉이) 시스템의 효율적인 운영을 위해 정류소별 수요를 예측하고, 최적의 재배치 계획을 제시하는 AI 기반 시스템입니다.

## ✨ 주요 기능

### 🔮 수요 예측
- **단일 정류소 수요 예측**: 특정 정류소의 향후 수요량을 예측
- **반경 내 정류소 예측**: 기준 정류소 반경 1km 내 모든 정류소의 수요 예측

### 📊 재배치 계획 생성
- **과잉/부족 정류소 식별**: 자전거가 너무 많거나 적은 정류소 자동 감지
- **최적 재배치 경로**: 효율적인 자전거 재배치 경로 제시
- **실시간 데이터 기반**: 현재 자전거 현황과 예측 수요를 고려한 계획 수립

### 🌦️ 환경 데이터 통합
- **실시간 날씨 정보**: 기상청 API를 통한 정확한 날씨 데이터
- **불쾌지수 계산**: 온도와 습도를 고려한 이용자 편의성 지표
- **공휴일 및 시간대**: 주말, 공휴일, 출퇴근 시간대 등 시간적 요인 반영

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │  Express API    │    │  Flask ML      │
│                 │◄──►│  Server         │◄──►│  Server        │
│                 │    │  (Port 4000)    │    │  (Port 5050)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  External APIs  │
                       │                 │
                       │ • 기상청 API     │
                       │ • 따릉이 API     │
                       │ • 공휴일 API     │
                       └─────────────────┘
```

## 🚀 시작하기

### 필수 요구사항
- Node.js 16.0.0 이상
- npm 또는 yarn

### 설치 및 실행

1. **의존성 설치**
```bash
npm install
```

2. **환경 변수 설정**
`.env` 파일을 생성하고 다음 변수들을 설정하세요:
```env
WEATHER_API_KEY=your_weather_api_key
DAREUNGI_API_KEY=your_dareungi_api_key
```

3. **서버 실행**
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

서버는 `http://localhost:4000`에서 실행됩니다.

## 📡 API 엔드포인트

### 1. 단일 정류소 수요 예측
```
POST /predict
```

**요청 본문:**
```json
{
  "station_id": "ST-001",
  "supply": 15
}
```

**응답:**
```json
{
  "station_id": "ST-001",
  "supply": 15,
  "predicted_demand": 12,
  "net_stock": 3,
  "action": "remove"
}
```

### 2. 반경 내 정류소 재배치 계획
```
POST /range-predict
```

**요청 본문:**
```json
{
  "station_id": "ST-001"
}
```

**응답:**
```json
{
  "base_station": "ST-001",
  "overflow_stations": [...],
  "underflow_stations": [...],
  "rebalance_plan": [...]
}
```

## 🔧 기술 스택

### Backend
- **Node.js**: 서버 런타임 환경
- **Express.js**: 웹 프레임워크
- **Axios**: HTTP 클라이언트
- **CORS**: Cross-Origin Resource Sharing 지원

### 외부 서비스
- **기상청 API**: 실시간 날씨 정보
- **따릉이 API**: 자전거 현황 데이터
- **공휴일 API**: 한국 공휴일 정보
- **Flask ML 서버**: 머신러닝 예측 모델

### 데이터 처리
- **자동 피처 생성**: 시간, 날씨, 위치 등 자동 계산
- **거리 계산**: 하버사인 공식을 이용한 정확한 거리 측정
- **실시간 데이터**: 최신 정보를 반영한 예측

## 📁 프로젝트 구조

```
express-api-server/
├── 📁 data/                    # 정류소 인코딩 맵 데이터
│   ├── stationEncodeMap.js
│   └── stationEncodeMap.zip
├── 📁 routes/                  # API 라우트 정의
│   ├── reBalancingRoute.js     # 단일 정류소 예측
│   └── reBalancePlanRoute.js   # 반경 내 재배치 계획
├── 📁 services/                # 비즈니스 로직 서비스
│   ├── fetchBikeStatus.js      # 따릉이 현황 조회
│   ├── FlaskClient.js          # Flask 서버 통신
│   └── weatherService.js       # 날씨 정보 조회
├── 📄 server.js                # 메인 서버 파일
├── 📄 package.json             # 프로젝트 설정
└── 📄 README.md                # 프로젝트 문서
```

## 🔍 주요 알고리즘

### 불쾌지수 계산
```
불쾌지수 = 0.81 × 온도 + 0.01 × 습도 × (0.99 × 온도 - 14.3) + 46.3
```

### 하버사인 거리 계산
```
d = R × arccos(sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2))
```

### 수요 예측 피처
- 시간대 (0-23시)
- 요일 (0-6, 0=일요일)
- 주말 여부
- 공휴일 여부
- 온도, 습도, 강수량, 풍속
- 불쾌지수
- 출퇴근 시간대 여부
- 시간대 카테고리 (아침/오후/저녁)
- 강수 여부
- 정류소 위치 (위도/경도)
- 정류소 인코딩 ID

## 🚨 주의사항

1. **API 키 설정**: 기상청과 따릉이 API 키가 필요합니다.
2. **Flask 서버**: 머신러닝 예측을 위한 별도 Flask 서버가 실행되어야 합니다.
3. **네트워크**: 외부 API 호출을 위한 인터넷 연결이 필요합니다.

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 ISC 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

**🚀 서울시 따릉이 시스템의 스마트한 운영을 위한 AI 기반 재배치 예측 시스템**
