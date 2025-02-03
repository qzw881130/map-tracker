// 默认地图区域（深圳）
export const DEFAULT_REGION = {
  latitude: 22.5431,
  longitude: 114.0579,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// 根据轨迹获取初始地图区域
export const getInitialRegion = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return DEFAULT_REGION;
  }

  // 计算所有点的边界
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  // 添加边距确保轨迹完全可见
  const padding = 0.005; // 约500米的边距
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // 计算适当的缩放级别
  const latDelta = Math.max((maxLat - minLat) * 1.5 + padding * 2, 0.01);
  const lngDelta = Math.max((maxLng - minLng) * 1.5 + padding * 2, 0.01);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
};

// 格式化坐标显示
export const formatCoordinate = (latitude, longitude) => {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};
