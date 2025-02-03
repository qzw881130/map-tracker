// 将角度转换为弧度
const toRad = (x) => {
  return x * Math.PI / 180;
};

// 计算两点之间的距离（单位：米）
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // 地球半径，单位米
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 计算总距离（使用滑动窗口减少累积误差）
export const calculateTotalDistance = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let total = 0;
  // 使用滑动窗口方式计算距离，减少累积误差
  let window = [];
  const WINDOW_SIZE = 3; // 使用3个点作为平滑窗口
  
  for (let i = 0; i < coordinates.length; i++) {
    window.push(coordinates[i]);
    
    if (window.length === WINDOW_SIZE) {
      // 计算窗口中间点与起点的距离
      const distance = calculateDistance(
        window[0].latitude,
        window[0].longitude,
        window[1].latitude,
        window[1].longitude
      );
      
      // 只有当距离大于最小阈值时才计入总距离
      if (distance > 0.001) { // 1米 = 0.001公里
        total += distance;
        console.log('计算第', i, '段距离:', {
          distance: distance,
          start: {
            lat: window[0].latitude,
            lon: window[0].longitude
          },
          end: {
            lat: window[1].latitude,
            lon: window[1].longitude
          },
          totalSoFar: total
        });
      }
      
      // 移除窗口最早的点
      window.shift();
    }
  }
  
  console.log('总距离:', total, '米');
  return total;
};

// 计算平均速度（公里/小时）
export const calculateAverageSpeed = (coordinates, startTime) => {
  if (!coordinates || coordinates.length < 2 || !startTime) return 0;
  
  const distance = calculateTotalDistance(coordinates); // 单位：米
  const duration = (new Date() - startTime) / 1000 / 3600; // 小时
  
  if (duration === 0) return 0;
  return (distance / 1000) / duration; // 转换为公里/小时
};
