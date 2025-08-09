const express = require('express');
const axios = require('axios');
const router = express.Router();
const stationEncodeMap = require('../data/stationEncodeMap.js');
const { isHoliday } = require('holiday-kr');
const { getForecastWeather } = require('../services/weatherService');


// 불편도 계산
const calculateDiscomfort = (temp, humidity) => {
  return 0.81 * temp + 0.01 * humidity * (0.99 * temp - 14.3) + 46.3;
};

// 재배치 예측
router.post('/', async (req, res) => {
  try {
    const { station_id, supply } = req.body;
    if (!station_id || supply == null) {
      return res.status(400).json({ error: 'station_id와 supply는 필수입니다.' });
    }

    // 🔹 자동 피처 생성
    const now = new Date();
    const hour = now.getHours();
    
    const day_of_week = now.getDay();
    const is_weekend = (day_of_week === 0 || day_of_week === 6) ? 1 : 0;
    const isHolidayKR= isHoliday(now);
    const holiday_kr = isHolidayKR ? 1 : 0;

    const weather = await getForecastWeather(37.5665, 126.9780);
    const comfort_score = calculateDiscomfort(weather.temp, weather.humidity);
    const is_peak_hour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0;
    const time_category = hour < 12 ? 0 : hour < 18 ? 1 : 2;
    const station_id_encoded = stationEncodeMap[station_id].encoded_id;
    const is_rain = weather.rainfall > 0 ? 1 : 0;
    const start_lat = stationEncodeMap[station_id].lat;
    const start_lon = stationEncodeMap[station_id].lon;
    
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
        start_lat,
        start_lon,
        time_of_day_category_encoded: time_category,
        station_id_encoded
      };

    // 🔹 Flask 예측 요청
    const flaskRes = await axios.post('http://43.201.61.111:5050/predict', features);
    const predicted = Math.round(flaskRes.data.predicted_demand);
    const net_stock = supply - predicted;

    let action = 'pass';
    if (net_stock < -2) action = 'add';
    else if (net_stock > 2) action = 'remove';

    res.json({
      station_id,
      supply,
      predicted_demand: predicted,
      net_stock,
      action
    });

  } catch (error) {
    console.error('재배치 예측 오류:', error.message);
    res.status(500).json({ error: '재배치 예측 오류가 발생했습니다.' });
  }
});

module.exports = router;

