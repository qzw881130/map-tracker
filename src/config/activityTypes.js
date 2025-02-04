export const ACTIVITY_TYPES = [
  { 
    label: '遛狗', 
    value: 'walking_dog',
    distanceFilter: 5  // 较小的距离过滤，因为遛狗速度较慢
  },
  { 
    label: '骑车', 
    value: 'cycling',
    distanceFilter: 20  // 骑车速度较快，可以用更大的距离过滤
  },
  { 
    label: '跑步', 
    value: 'running',
    distanceFilter: 10  // 跑步需要相对精确的轨迹
  },
  { 
    label: '爬山', 
    value: 'hiking',
    distanceFilter: 15  // 爬山速度适中
  },
  { 
    label: '滑冰', 
    value: 'skating',
    distanceFilter: 15  // 滑冰速度适中
  },
  { 
    label: '自驾', 
    value: 'driving',
    distanceFilter: 50  // 开车速度快，可以用较大的距离过滤
  },
  { 
    label: '其他', 
    value: 'others',
    distanceFilter: 20  // 默认中等距离过滤
  },
  { 
    label: '调试', 
    value: 'debug',
    distanceFilter: 1  // 调试模式使用最小的距离过滤，获取最详细的轨迹
  },
];

export const getActivityLabel = (value) => {
  const activity = ACTIVITY_TYPES.find(type => type.value === value);
  return activity ? activity.label : '未知';
};

// 获取活动类型的距离过滤器值
export const getActivityDistanceFilter = (value) => {
  const activity = ACTIVITY_TYPES.find(type => type.value === value);
  return activity ? activity.distanceFilter : 20; // 默认使用 20 米
};
