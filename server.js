
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');



const app = express();
const rebalancingRoute = require('./routes/reBalancingRoute');
const rebalancingPlanRoute = require('./routes/reBalancePlanRoute');

dotenv.config();


app.use(cors());
app.use(express.json());
//단일 정류소 수요 예측
app.use('/predict', rebalancingRoute); 

//반경 내 정류소 수요 예측 
app.use('/range-predict', rebalancingPlanRoute);

//재배치 계획 생성
app.listen(4000, () => {
  console.log('🚀 Express server running on http://43.201.61.111:4000');
})
