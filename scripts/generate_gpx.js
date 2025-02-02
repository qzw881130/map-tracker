const fs = require('fs');

// 生成指定范围内的随机数
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// 根据起点、距离和方向计算终点坐标
function calculateDestination(lat, lon, distanceInMeters, bearing) {
  const R = 6371000; // 地球半径（米）
  const d = distanceInMeters / R; // 角距离
  const bearingRad = (bearing * Math.PI) / 180; // 转换为弧度

  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lon: (lon2 * 180) / Math.PI
  };
}

// 生成轨迹点
function generateTrackPoints() {
  const points = [];
  const startLat = 31.2304; // 起始纬度
  const startLon = 121.4737; // 起始经度
  const bearing = 90; // 向东移动
  const speedMps = 1.4; // 5公里/小时，约1.4米/秒
  const intervalMs = 100; // 每100毫秒一个点
  const durationMinutes = 2; // 总时长2分钟
  const totalPoints = (durationMinutes * 60 * 1000) / intervalMs; // 计算总点数

  let currentLat = startLat;
  let currentLon = startLon;
  const startTime = new Date('2025-02-02T11:15:45+08:00'); // 使用当前时间作为起点

  for (let i = 0; i < totalPoints; i++) {
    const timeOffset = i * intervalMs;
    const currentTime = new Date(startTime.getTime() + timeOffset);
    
    // 计算这100ms内移动的距离（米）
    const distanceInMeters = speedMps * (intervalMs / 1000);
    
    // 添加一些随机偏移，模拟GPS漂移
    const jitterMeters = randomInRange(-0.5, 0.5);
    const actualDistance = distanceInMeters + jitterMeters;
    
    // 计算新位置
    const newPosition = calculateDestination(currentLat, currentLon, actualDistance, bearing);
    currentLat = newPosition.lat;
    currentLon = newPosition.lon;

    points.push({
      lat: currentLat,
      lon: currentLon,
      time: currentTime.toISOString()
    });
  }

  return points;
}

// 生成GPX内容
function generateGpx(points) {
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
  gpx += '<gpx version="1.1" creator="Map Tracker">\n';
  gpx += '  <trk>\n';
  gpx += '    <name>100ms间隔2分钟轨迹</name>\n';
  gpx += '    <trkseg>\n';

  points.forEach(point => {
    gpx += `      <trkpt lat="${point.lat}" lon="${point.lon}">\n`;
    gpx += `        <time>${point.time}</time>\n`;
    gpx += '      </trkpt>\n';
  });

  gpx += '    </trkseg>\n';
  gpx += '  </trk>\n';
  gpx += '</gpx>';

  return gpx;
}

// 生成并保存GPX文件
const points = generateTrackPoints();
const gpxContent = generateGpx(points);
const filename = '100ms_2min_track.gpx';

fs.writeFileSync(filename, gpxContent);
console.log(`GPX文件已生成：${filename}`);
console.log(`总计生成 ${points.length} 个轨迹点`);
