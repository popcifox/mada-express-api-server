require('dotenv').config(); // .env 파일에서 환경변수 불러오기
const axios = require('axios');

const API_KEY = process.env.DAREUNGI_API_KEY;

async function fetchBikeStations() {
  const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/bikeList/1/1000`;

  try {
    const res = await axios.get(url);
    const rows = res.data?.rentBikeStatus?.row || [];

    // 각 정류소 정보 추출 및 정리
    const stations = rows.map(st => ({
      station_id: st.stationId,
      station_name: st.stationName,
      lat: parseFloat(st.stationLatitude),
      lon: parseFloat(st.stationLongitude),
      bike_count: parseInt(st.parkingBikeTotCnt),
      rack_count: parseInt(st.rackTotCnt),
    }));

    return stations;
  } catch (err) {
    console.error('❌ 따릉이 API 호출 실패:', err.message);
    return [];
  }
}

module.exports = fetchBikeStations;
