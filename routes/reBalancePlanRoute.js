// 📦 필요한 모듈 불러오기
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { isHoliday } = require('holiday-kr');
const { getForecastWeather } = require('../services/weatherService');
const fetchBikeStations = require('../services/fetchBikeStatus');

// 🌡️ 불쾌지수 계산 함수
const calculateDiscomfort = (temp, humidity) => {
  return 0.81 * temp + 0.01 * humidity * (0.99 * temp - 14.3) + 46.3;
};

// 📍 하버사인 거리 계산 함수 (미터 단위)
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 📌 POST /predict-rebalance
router.post('/', async (req, res) => {
  console.log('🔹 재배치 계획 요청 수신');

  try {
    const { station_id } = req.body;
    if (!station_id) return res.status(400).json({ error: 'station_id가 필요합니다.' });

    // 🔄 실시간 따릉이 데이터 전체 가져오기
    const allStations = await fetchBikeStations();

    // 📌 기준 정류소 설정 (base station)
    const baseStation = allStations.find(st => st.station_id === station_id);
    if (!baseStation) return res.status(404).json({ error: '정류소 정보 없음' });

    const { lat: baseLat, lon: baseLon } = baseStation;

    // 📆 현재 시간 기반 피처 생성
    const now = new Date();
    const hour = now.getHours();
    const day_of_week = now.getDay();
    const is_weekend = (day_of_week === 0 || day_of_week === 6) ? 1 : 0;
    const holiday_kr = isHoliday(now) ? 1 : 0;
    const is_peak_hour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0;
    const time_category = hour < 12 ? 0 : hour < 18 ? 1 : 2;

    // 🌦️ 날씨 정보 호출
    const weather = await getForecastWeather(baseLat, baseLon);
    console.log('📦 날씨 데이터:', weather);

    // 불쾌지수 및 강수 여부 피처 생성
    const comfort_score = calculateDiscomfort(weather.temp, weather.humidity);
    const is_rain = weather.rainfall > 0 ? 1 : 0;

    // 🔍 예측 결과 및 재배치 대상 초기화
    const result = [];
    const overflow = [];
    const underflow = [];

    // 📡 기준 반경 1km 내 정류소 예측 반복
    for (const info of allStations) {
      const distance = haversine(baseLat, baseLon, info.lat, info.lon);
      if (distance > 1000) continue;

      // 🔧 예측에 사용할 피처 구성
      const features = {
        hour,
        day_of_week,
        is_weekend,
        holiday_kr,
        temperature: weather.temp,
        rainfall: weather.rainfall,
        wind_speed: weather.wind_speed,
        humidity: weather.humidity,
        comfort_score,
        is_peak_hour,
        is_rain,
        start_lat: info.lat,
        start_lon: info.lon,
        time_of_day_category_encoded: time_category,
        station_id_encoded: parseInt(info.station_id.replace('ST-', '')) // 단순 인코딩
      };

      // 🔮 Flask 서버에 예측 요청
      const flaskRes = await axios.post('http://43.201.61.111:5050/predict', features);
      const predicted = Math.round(flaskRes.data.predicted_demand);

      // 📊 현재 공급량 및 수요 차이 계산
      const supply = info.bike_count ?? 0;
      const net_stock = supply - predicted;

      // 📌 재배치 대상 분류
      if (net_stock < -2) underflow.push({ id: info.station_id, net_stock, lat: info.lat, lon: info.lon });
      else if (net_stock > 2) overflow.push({ id: info.station_id, net_stock, lat: info.lat, lon: info.lon });

      // 결과 저장
      result.push({ id: info.station_id, predicted_demand: predicted, supply, net_stock });
    }

    // 🔄 재배치 매칭 로직 (가장 가까운 언더플로우에 매칭)
    const rebalancing_plan = [];
    const usedOverflow = new Set();
    const usedUnderflow = new Set();

    for (const over of overflow) {
      let bestMatch = null;
      let minDistance = Infinity;

      for (const under of underflow) {
        if (usedUnderflow.has(under.id)) continue;
        const dist = haversine(over.lat, over.lon, under.lat, under.lon);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = under;
        }
      }

      if (bestMatch) {
        const move_count = Math.min(over.net_stock - 2, Math.abs(bestMatch.net_stock + 2));
        if (move_count > 0) {
          rebalancing_plan.push({
            from: over.id,
            to: bestMatch.id,
            move_count,
            distance: Math.round(minDistance)
          });
          usedOverflow.add(over.id);
          usedUnderflow.add(bestMatch.id);
        }
      }
    }

    // 📤 응답 전송
    res.status(200).json({ result, overflow, underflow, rebalancing_plan });

  } catch (error) {
    console.error('🔴 재배치 계획 오류:', error.message);
    res.status(500).json({ error: '재배치 계획 오류 발생', detail: error.message });
  }
});

module.exports = router;
 