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

  // 使用轨迹的第一个点作为地图中心
  const firstCoord = coordinates[0];
  return {
    latitude: firstCoord.latitude,
    longitude: firstCoord.longitude,
    latitudeDelta: 0.002,
    longitudeDelta: 0.002,
  };
};

// 格式化坐标显示
export const formatCoordinate = (latitude, longitude) => {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};
