const axios = require('axios');
const qs = require('querystring');

// 위경도 → 격자 좌표 변환 함수
function convertToGrid(lat, lon) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) /
             Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
                      Math.tan(Math.PI * 0.25 + slat1 * 0.5));
  const sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) *
             Math.cos(slat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);

  const ra = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

async function getForecastWeather(lat, lon) {
  const { nx, ny } = convertToGrid(lat, lon);
  const now = new Date();

  const forecastDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  let baseTime = '0200';
  const hour = now.getHours();

  if (hour >= 23) baseTime = '2300';
  else if (hour >= 20) baseTime = '2000';
  else if (hour >= 17) baseTime = '1700';
  else if (hour >= 14) baseTime = '1400';
  else if (hour >= 11) baseTime = '1100';
  else if (hour >= 8)  baseTime = '0800';
  else if (hour >= 5)  baseTime = '0500';

  const targetHour = String(hour + 1).padStart(2, '0') + '00';

  const params = {
    serviceKey: process.env.WEATHER_API_KEY,
    dataType: 'JSON',
    numOfRows: 1000,
    pageNo: 1,
    base_date: forecastDate,
    base_time: baseTime,
    nx,
    ny
  };

  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${qs.stringify(params)}`;
  const res = await axios.get(url);
  const items = res.data.response.body.items.item;

  const targetItems = items.filter(item => item.fcstTime === targetHour);

  const getValue = (category) => {
    const found = targetItems.find(i => i.category === category);
    return found ? found.fcstValue : null;
  };

  return {
    temp: parseFloat(getValue('TMP')),
    humidity: parseInt(getValue('REH')),
    rainfall: getValue('PCP') === '강수없음' ? 0 : parseFloat(getValue('PCP')),
    wind_speed: parseFloat(getValue('WSD'))
  };
}

module.exports = { getForecastWeather };
