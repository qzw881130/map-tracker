const fs = require('fs').promises;  // 使用 promises API

// 生成带时间戳的文件名
function generateTimestampedFilename() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:-]/g, '')
    .replace('T', '_')
    .split('.')[0];
  return `tests/beijing_track_${timestamp}.gpx`;  // 保存到 tests 目录
}

// 计算给定距离和方向的新坐标
function calculateNewPoint(lat, lon, distanceInMeters, bearing) {
  const R = 6371000; // 地球半径（米）
  const d = distanceInMeters;
  const brng = bearing * Math.PI / 180; // 转换为弧度
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d/R) +
    Math.cos(lat1) * Math.sin(d/R) * Math.cos(brng)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d/R) * Math.cos(lat1),
    Math.cos(d/R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    latitude: lat2 * 180 / Math.PI,
    longitude: lon2 * 180 / Math.PI
  };
}

// 计算给定距离和方向的新坐标
function calculateDestination(lat, lon, distanceInMeters, bearing) {
  return calculateNewPoint(lat, lon, distanceInMeters, bearing);
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
    const { latitude, longitude } = calculateDestination(currentLat, currentLon, distance, currentBearing);

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

    const { latitude, longitude } = calculateDestination(startLat, startLon, distance, bearing);

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
    const { latitude, longitude } = calculateDestination(startLat, startLon, currentDistance, currentBearing);

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

// 主函数
async function main() {
  const mode = process.argv[2] || 'straight'; // 默认直线模式
  let points;

  // 使用实际观察到的位置作为起点
  const config = {
    startLat: 40.421260579427084,
    startLon: 115.5117361111111,
    duration: 120,
    interval: 1,
    baseSpeed: 5,          // 降低速度到5米/秒
    bearing: 45,
    accuracy: 5           // 使用实际的精度值
  };

  switch (mode) {
    case 'circle':
      points = generateCircleTrack({
        ...config,
        duration: 10,    // 确保使用10秒
        radius: 5
      });
      break;
    case 'backforth':
      points = generateBackAndForthTrack({
        ...config,
        duration: 10,    // 确保使用10秒
        distance: 50
      });
      break;
    default: // 'straight'
      points = generateTestTrack({
        ...config,
        duration: 10     // 确保使用10秒
      });
  }

  // 生成GPX内容
  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Map-tracker"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
${points.map(point => `  <wpt lat="${point.latitude}" lon="${point.longitude}">
    <time>${new Date(point.timestamp).toISOString()}</time>
  </wpt>`).join('\n')}
</gpx>`;

  const filename = generateTimestampedFilename();
  
  try {
    await fs.writeFile(filename, gpxContent);
    console.log(`GPX file generated successfully: ${filename}`);
    
    // 输出一些统计信息
    const totalDistance = points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return 0;
      const prev = arr[idx - 1];
      const distance = calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      return acc + distance;
    }, 0);

    console.log('Track Statistics:');
    console.log(`Total points: ${points.length}`);
    console.log(`Total distance: ${totalDistance.toFixed(2)} meters`);
    console.log(`Average speed: ${(totalDistance / config.duration).toFixed(2)} m/s`);
    console.log(`Duration: ${config.duration} seconds`);

    // 输出第一个和最后一个点的信息用于验证
    console.log('\nTrack details:');
    console.log('Start time:', new Date(points[0].timestamp).toISOString());
    console.log('End time:', new Date(points[points.length - 1].timestamp).toISOString());
    console.log('Time difference:', (points[points.length - 1].timestamp - points[0].timestamp) / 1000, 'seconds');
  } catch (error) {
    console.error('Error writing GPX file:', error);
  }
}

main().catch(console.error);
