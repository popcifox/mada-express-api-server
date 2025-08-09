const axios = require('axios');

const FLASK_URL = process.env.FLASK_URL || 'http://43.201.61.111:5050/predict';

async function predictDemand(features) {
  try {
    const response = await axios.post(FLASK_URL, features);
    return response.data.predicted_demand; // Flask에서 이 key로 반환한다고 가정
  } catch (error) {
    console.error('🚨 Flask 예측 요청 실패:', error.message);
    return -1; // 실패 시 기본값
  }
}

module.exports = predictDemand;