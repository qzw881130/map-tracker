// 将角度转换为弧度
const toRad = (x) => {
  return x * Math.PI / 180;
};

// 计算两点之间的距离（单位：米）
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // 输入验证
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
      typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    console.error('[距离计算] 无效的输入坐标:', { lat1, lon1, lat2, lon2 });
    return 0;
  }

  // 如果坐标完全相同，直接返回0
  if (lat1 === lat2 && lon1 === lon2) {
    console.log('[距离计算] 坐标完全相同，距离为0');
    return 0;
  }

  const R = 6371000; // 地球半径，单位米
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  // 计算中间值，便于调试
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const cosLat1 = Math.cos(lat1Rad);
  const cosLat2 = Math.cos(lat2Rad);
  
  const a = sinDLat * sinDLat + 
           cosLat1 * cosLat2 * sinDLon * sinDLon;
  
  // 确保a的值在有效范围内
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  const distance = R * c;

  // 记录详细计算过程
  console.log('[距离计算] 详细过程:', {
    输入: {
      起点: { 纬度: lat1, 经度: lon1 },
      终点: { 纬度: lat2, 经度: lon2 }
    },
    弧度值: {
      dLat: dLat.toFixed(8),
      dLon: dLon.toFixed(8),
      lat1Rad: lat1Rad.toFixed(8),
      lat2Rad: lat2Rad.toFixed(8)
    },
    中间计算值: {
      sinDLat: sinDLat.toFixed(8),
      sinDLon: sinDLon.toFixed(8),
      cosLat1: cosLat1.toFixed(8),
      cosLat2: cosLat2.toFixed(8),
      a: a.toFixed(8),
      c: c.toFixed(8)
    },
    结果_米: distance.toFixed(8)
  });

  return distance;
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
  if (!coordinates || coordinates.length < 2 || !startTime) {
    console.log('[平均速度] 无效输入:', { 
      coordinatesLength: coordinates?.length || 0,
      hasStartTime: !!startTime 
    });
    return 0;
  }
  
  const distance = calculateTotalDistance(coordinates); // 单位：米
  const endTime = coordinates[coordinates.length - 1].timestamp;
  const duration = (endTime - startTime) / 1000 / 3600; // 小时
  
  console.log('[平均速度计算] 详情:', {
    距离_米: distance.toFixed(2),
    开始时间: new Date(startTime).toLocaleString(),
    结束时间: new Date(endTime).toLocaleString(),
    持续时间_小时: duration.toFixed(2),
    平均速度_公里每小时: duration > 0 ? ((distance / 1000) / duration).toFixed(2) : 0
  });

  if (duration <= 0) return 0;
  return (distance / 1000) / duration; // 转换为公里/小时
};
