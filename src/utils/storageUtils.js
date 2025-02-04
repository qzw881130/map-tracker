import AsyncStorage from '@react-native-async-storage/async-storage';

// 保存活动数据
export const saveActivity = async (activity) => {
  try {
    // 获取现有活动
    const existingActivitiesJson = await AsyncStorage.getItem('activities');
    const existingActivities = existingActivitiesJson ? JSON.parse(existingActivitiesJson) : [];

    // 添加新活动
    const updatedActivities = [activity, ...existingActivities];

    // 保存更新后的活动列表
    await AsyncStorage.setItem('activities', JSON.stringify(updatedActivities, null, 2));
    console.log('Activity saved successfully:\n', JSON.stringify(activity, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving activity:', error);
    return false;
  }
};

// 获取所有活动数据
export const getAllActivities = async () => {
  try {
    const activitiesJson = await AsyncStorage.getItem('activities');
    return activitiesJson ? JSON.parse(activitiesJson) : [];
  } catch (error) {
    console.error('Error getting activities:', error);
    return [];
  }
};


// 删除活动数据
export const deleteActivity = async (activityId) => {
  try {
    const activities = await getAllActivities();
    const updatedActivities = activities.filter(activity => activity.id !== activityId);
    await AsyncStorage.setItem('activities', JSON.stringify(updatedActivities, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
};

// 删除所有活动数据
export const deleteAllActivities = async () => {
  try {
    await AsyncStorage.setItem('activities', JSON.stringify([], null, 2));
    console.log('[存储] 所有活动记录已删除');
    return true;
  } catch (error) {
    console.error('[存储] 删除所有活动记录失败:', error);
    return false;
  }
};
