const fs = require('fs').promises;  // 使用 promises API

// 生成带时间戳的文件名
function generateTimestampedFilename(mode) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:-]/g, '')
    .replace('T', '_')
    .split('.')[0];
  return `${mode}_tests_${timestamp}.gpx`;  // 保存到 tests 目录
}

// 坐标转换工具函数
function calculateNewPosition(startLat, startLon, distanceMeters, bearing) {
  // 地球半径（米）
  const R = 6371000;
  
  // 将距离转换为弧度
  const d = distanceMeters / R;
  
  // 将度数转换为弧度
  const lat1 = startLat * Math.PI / 180;
  const lon1 = startLon * Math.PI / 180;
  const brng = bearing * Math.PI / 180;

  // 计算新的纬度
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );

  // 计算新的经度
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  // 将弧度转换回度数
  return {
    latitude: lat2 * 180 / Math.PI,
    longitude: lon2 * 180 / Math.PI
  };
}

// 计算两点之间的距离
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// 计算两点之间的速度（米/秒）
function calculateSpeed(loc1, loc2) {
  if (!loc1 || !loc2) return 0;
  
  const distance = calculateDistance(
    loc1.latitude,
    loc1.longitude,
    loc2.latitude,
    loc2.longitude
  );
  
  const timeDiff = (loc2.timestamp - loc1.timestamp) / 1000; // 转换为秒
  if (timeDiff <= 0) return 0;
  
  return distance / timeDiff;
}

// 生成测试轨迹
function generateTestTrack(config = {}) {
  const {
    startLat = 40.4191015625,         // 起始纬度
    startLon = 115.50537489149306,    // 起始经度
    duration = 120,                    // 轨迹持续时间（秒）
    interval = 1,                      // 采样间隔（秒）
    baseSpeed = 100,                   // 基础速度（米/秒）
    bearing = 45,                      // 主方向（度）
    bearingVariation = 3,             // 方向变化范围（度）
    speedVariation = 0.1              // 速度变化范围（占基础速度的比例）
  } = config;

  const points = [];
  let currentLat = startLat;
  let currentLon = startLon;
  let currentTime = new Date().getTime();

  for (let i = 0; i < duration; i += interval) {
    // 在主方向上添加随机偏差
    const bearingDiff = (Math.random() - 0.5) * 2 * bearingVariation;
    const currentBearing = bearing + bearingDiff;

    // 计算当前速度（米/秒）
    const variation = Math.random() * 2 - 1; // -1 到 1 之间的随机值
    const currentSpeed = baseSpeed * (1 + variation * speedVariation);

    // 根据速度和方向计算新位置
    const distance = currentSpeed * interval;
    const { latitude, longitude } = calculateNewPosition(currentLat, currentLon, distance, currentBearing);

    points.push({
      latitude,
      longitude,
      accuracy: 5 + Math.random() * 5, // 5-10米的精度
      speed: currentSpeed,
      timestamp: currentTime
    });

    currentLat = latitude;
    currentLon = longitude;
    currentTime += interval * 1000;
  }

  return points;
}

// 生成圆形轨迹
function generateCircleTrack(config = {}) {
  const {
    startLat = 40.42250217013889,     // 使用最新观察到的位置
    startLon = 115.51807183159723,
    duration = 10,                     // 减少到10秒
    interval = 1,
    radius = 5                        // 减小到5米
  } = config;

  const points = [];
  const totalPoints = duration / interval;
  const angleStep = (2 * Math.PI) / totalPoints;
  const now = new Date().getTime();

  for (let i = 0; i < totalPoints; i++) {
    const angle = i * angleStep;
    const distance = radius;
    const bearing = (angle * 180 / Math.PI) % 360;

    const { latitude, longitude } = calculateNewPosition(startLat, startLon, distance, bearing);

    points.push({
      latitude,
      longitude,
      timestamp: now + (i * interval * 1000)
    });
  }

  return points;
}

// 生成来回轨迹
function generateBackAndForthTrack(config = {}) {
  const {
    startLat = 40.4191015625,
    startLon = 115.50537489149306,
    duration = 120,
    interval = 1,
    distance = 200,         // 来回距离（米）
    bearing = 45           // 来回方向
  } = config;

  const points = [];
  const totalPoints = duration / interval;
  const cyclePoints = totalPoints / 2; // 一次来回的点数
  let currentTime = new Date().getTime();
  const speed = distance / (duration / 4); // 保证一次来回用一半时间

  for (let i = 0; i < totalPoints; i++) {
    const cycle = Math.floor(i / cyclePoints); // 第几个周期
    const phase = (i % cyclePoints) / cyclePoints; // 周期内的阶段
    const currentDistance = cycle % 2 === 0 ? 
      distance * phase : // 去程
      distance * (1 - phase); // 返程
    
    const currentBearing = cycle % 2 === 0 ? bearing : (bearing + 180) % 360;
    const { latitude, longitude } = calculateNewPosition(startLat, startLon, currentDistance, currentBearing);

    points.push({
      latitude,
      longitude,
      accuracy: 5 + Math.random() * 5,
      speed,
      timestamp: currentTime
    });

    currentTime += interval * 1000;
  }

  return points;
}

// 生成直角8字型轨迹
function generateFigureEightTrack(config = {}) {
  const {
    startLat = 40.42250217013889,
    startLon = 115.51807183159723,
    duration = 30,                    // 30秒完成一个8字
    interval = 1,
    sideLength = 20                   // 每条边20米
  } = config;

  const points = [];
  const totalPoints = duration / interval;
  const pointsPerCircle = totalPoints / 2;  // 每个圆使用一半的点
  const now = new Date().getTime();

  // 定义8字形的路径点（相对于起点的方位角和距离）
  const path = [
    { bearing: 0, distance: sideLength },     // 向北
    { bearing: 90, distance: sideLength },    // 向东
    { bearing: 180, distance: sideLength },   // 向南
    { bearing: 270, distance: sideLength },   // 向西
    { bearing: 180, distance: sideLength },   // 向南
    { bearing: 270, distance: sideLength },   // 向西
    { bearing: 0, distance: sideLength },     // 向北
    { bearing: 90, distance: sideLength }     // 向东
  ];

  let currentLat = startLat;
  let currentLon = startLon;
  const pointsPerSegment = Math.floor(totalPoints / path.length);

  // 生成每个段的点
  path.forEach((segment, segmentIndex) => {
    for (let i = 0; i < pointsPerSegment; i++) {
      const progress = i / pointsPerSegment;
      const segmentDistance = segment.distance * progress;
      
      const newPos = calculateNewPosition(
        currentLat,
        currentLon,
        segmentDistance,
        segment.bearing
      );

      points.push({
        latitude: newPos.latitude,
        longitude: newPos.longitude,
        timestamp: now + (segmentIndex * pointsPerSegment + i) * interval * 1000
      });
    }

    // 更新当前位置到段的终点
    const endPos = calculateNewPosition(
      currentLat,
      currentLon,
      segment.distance,
      segment.bearing
    );
    currentLat = endPos.latitude;
    currentLon = endPos.longitude;
  });

  return points;
}

// 生成模拟骑行轨迹
function generateBikeTrack(config = {}) {
  const {
    startLat = 40.42250217013889,
    startLon = 115.51807183159723,
    duration = 900,                    // 15分钟 = 900秒
    interval = 1,                      // 每秒一个点
    baseSpeed = 5,                     // 基础速度 5m/s (18km/h)
    routeVariation = true             // 是否添加速度和方向变化
  } = config;

  const points = [];
  const totalPoints = duration / interval;
  const now = new Date().getTime();

  let currentLat = startLat;
  let currentLon = startLon;
  let currentBearing = 45;  // 初始方向
  let currentSpeed = baseSpeed;

  // 每300秒（5分钟）改变一次路线特征
  const segmentDuration = 300;
  const segments = Math.ceil(duration / segmentDuration);

  for (let segment = 0; segment < segments; segment++) {
    const segmentPoints = Math.min(
      segmentDuration / interval,
      totalPoints - segment * (segmentDuration / interval)
    );

    // 每段设置不同的特征
    const segmentCharacteristics = {
      // 基础速度的变化范围（0.8-1.2倍）
      speedMultiplier: 0.8 + Math.random() * 0.4,
      // 方向变化的频率（每N个点改变一次）
      directionChangeInterval: Math.floor(20 + Math.random() * 30),
      // 方向变化的最大角度
      maxDirectionChange: 30
    };

    for (let i = 0; i < segmentPoints; i++) {
      const globalIndex = segment * (segmentDuration / interval) + i;
      
      if (routeVariation) {
        // 速度变化：模拟地形和路况的影响
        if (i % 10 === 0) {  // 每10秒可能变化一次速度
          const speedVariation = 0.9 + Math.random() * 0.2;  // 0.9-1.1倍变化
          currentSpeed = baseSpeed * segmentCharacteristics.speedMultiplier * speedVariation;
        }

        // 方向变化：模拟转弯
        if (i % segmentCharacteristics.directionChangeInterval === 0) {
          const directionChange = (Math.random() - 0.5) * 2 * segmentCharacteristics.maxDirectionChange;
          currentBearing = (currentBearing + directionChange + 360) % 360;
        }
      }

      // 计算新位置
      const distance = currentSpeed * interval;
      const newPos = calculateNewPosition(
        currentLat,
        currentLon,
        distance,
        currentBearing
      );

      points.push({
        latitude: newPos.latitude,
        longitude: newPos.longitude,
        timestamp: now + globalIndex * interval * 1000
      });

      currentLat = newPos.latitude;
      currentLon = newPos.longitude;
    }
  }

  return points;
}

// 生成正方形GPS轨迹
function generateSquareTrack(config = {}) {
  const {
    startLat = 39.9054,
    startLon = 116.3976,
    sideLength = 3000,
    targetSpeed = 5 // 目标速度，米/秒（18km/h，适合自行车）
  } = config;

  const points = [];
  const earthRadius = 6371000; // 地球半径（米）
  
  // 计算纬度1度对应的距离（米）
  const metersPerLat = (Math.PI * earthRadius) / 180;
  
  // 计算经度1度对应的距离（米）
  const metersPerLon = metersPerLat * Math.cos(startLat * Math.PI / 180);
  
  // 计算需要增加的经纬度值
  const latDiff = sideLength / metersPerLat;
  const lonDiff = sideLength / metersPerLon;
  
  // 生成四个顶点
  const vertices = [
    { lat: startLat, lon: startLon },                    // 起始点
    { lat: startLat, lon: startLon + lonDiff },         // 向东
    { lat: startLat + latDiff, lon: startLon + lonDiff },// 向北
    { lat: startLat + latDiff, lon: startLon },         // 向西
    { lat: startLat, lon: startLon }                    // 回到起点
  ];
  
  // 在每条边上生成插值点
  const pointInterval = 50; // 每50米一个点
  const timeInterval = pointInterval / targetSpeed; // 根据目标速度计算时间间隔
  
  const startTime = Date.now();
  let pointIndex = 0;
  
  for (let i = 0; i < vertices.length - 1; i++) {
    const start = vertices[i];
    const end = vertices[i + 1];
    const segmentDistance = calculateDistance(start.lat, start.lon, end.lat, end.lon);
    const pointsCount = Math.floor(segmentDistance / pointInterval);
    
    for (let j = 0; j <= pointsCount; j++) {
      const ratio = j / pointsCount;
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lon = start.lon + (end.lon - start.lon) * ratio;
      
      points.push({
        latitude: lat,
        longitude: lon,
        elevation: 0,
        timestamp: startTime + (pointIndex * timeInterval * 1000) // 转换为毫秒
      });
      
      pointIndex++;
    }
  }
  
  return points;
}

// 生成GPX内容
function generateGpx(points, mode = 'track') {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Map-tracker"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`;

  // 添加速度信息
  points.forEach((point, index) => {
    const timestamp = new Date(point.timestamp);
    // 计算当前点的速度（使用与前一个点的距离和时间差）
    const speed = index > 0 ? calculateSpeed(points[index - 1], point) : 0;
    
    gpx += `
  <wpt lat="${point.latitude.toFixed(6)}" lon="${point.longitude.toFixed(6)}">
    <time>${timestamp.toISOString()}</time>
    <speed>${speed.toFixed(2)}</speed>
  </wpt>`;
  });

  gpx += '\n</gpx>';
  return gpx;
}

// 主函数
async function main() {
  const mode = process.argv[2] || 'straight';
  const config = {
    startLat: 39.9054,    // 天安门广场
    startLon: 116.3976,
    distance: 3000,       // 3公里
    sideLength: 3000,     // 正方形边长3公里
    speed: 3,            // 3米/秒
    bearing: 45,         // 45度角
    pointInterval: 10,   // 每10米一个点
    routeVariation: false // 是否添加随机变化
  };

  console.log('生成轨迹模式:', mode);
  console.log('配置:', config);

  let points;
  switch (mode) {
    case 'square':
      points = generateSquareTrack(config);
      break;
    // ... 其他 case 保持不变
  }

  if (!points || points.length === 0) {
    console.error('未生成任何轨迹点');
    return;
  }

  // 生成GPX内容
  const gpxContent = generateGpx(points, mode);
  
  // 将内容写入文件
  const fs = require('fs');
  const path = require('path');
  
  // 确保 tests 目录存在
  const testsDir = path.join(__dirname, '..', 'tests');
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir);
  }
  
  // 生成文件名，包含时间戳
  const timestamp = new Date().toISOString()
    .replace(/[:-]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  
  const outputPath = path.join(testsDir, `${mode}_track_${timestamp}.gpx`);
  
  fs.writeFileSync(outputPath, gpxContent);
  console.log(`GPX文件已生成：${outputPath}`);
  
  // 打印统计信息
  console.log(`总点数：${points.length}`);
  console.log(`第一个点：`, {
    latitude: points[0].latitude,
    longitude: points[0].longitude,
    time: new Date(points[0].timestamp).toISOString()
  });
  console.log(`最后一个点：`, {
    latitude: points[points.length - 1].latitude,
    longitude: points[points.length - 1].longitude,
    time: new Date(points[points.length - 1].timestamp).toISOString()
  });
}

main().catch(console.error);
