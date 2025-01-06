export const ACTIVITY_TYPES = [
  { label: '遛狗', value: 'walking_dog' },
  { label: '骑车', value: 'cycling' },
  { label: '跑步', value: 'running' },
  { label: '爬山', value: 'hiking' },
  { label: '滑冰', value: 'skating' },
  { label: '自驾', value: 'driving' },
  { label: '其他', value: 'others' },
];

export const getActivityLabel = (value) => {
  const activity = ACTIVITY_TYPES.find(type => type.value === value);
  return activity ? activity.label : '未知';
};
