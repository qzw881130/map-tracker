// 格式化时间显示
export const formatElapsedTime = (seconds) => {
  if (seconds == null) return '0秒';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分${remainingSeconds}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    return `${remainingSeconds}秒`;
  }
};

// 格式化日期显示
export const formatDate = (dateString) => {
  if (!dateString) return '未知时间';
  try {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('[格式化] 日期格式化错误:', error);
    return '未知时间';
  }
};

// 格式化距离显示
export const formatDistance = (distanceInM) => {
  if (distanceInM == null || isNaN(distanceInM)) {
    return '0米';
  }
  
  if (distanceInM < 1000) {
    return `${Math.round(distanceInM)}米`;
  } else {
    return `${(distanceInM / 1000).toFixed(2)}公里`;
  }
};

// 格式化速度显示
export const formatSpeed = (speedInMS, useKMH = false) => {
  if (speedInMS == null || isNaN(speedInMS)) {
    return useKMH ? '0.0 km/h' : '0.0 m/s';
  }
  
  try {
    if (useKMH) {
      const speedInKMH = speedInMS * 3.6;
      return `${speedInKMH.toFixed(1)} km/h`;
    }
    return `${speedInMS.toFixed(1)} m/s`;
  } catch (error) {
    console.error('[格式化] 速度格式化错误:', error);
    return useKMH ? '0.0 km/h' : '0.0 m/s';
  }
};
