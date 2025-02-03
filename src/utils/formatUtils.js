// 格式化时间显示
export const formatElapsedTime = (seconds) => {
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
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 格式化距离显示
export const formatDistance = (distanceInM) => {
  if (distanceInM < 1000) {
    return `${distanceInM.toFixed(0)}米`;
  } else {
    return `${(distanceInM / 1000).toFixed(2)}公里`;
  }
};

// 格式化速度显示
export const formatSpeed = (speedInMS, useKMH = false) => {
  if (useKMH) {
    const speedInKMH = speedInMS * 3.6;
    return `${speedInKMH.toFixed(1)} km/h`;
  }
  return `${speedInMS.toFixed(1)} m/s`;
};
