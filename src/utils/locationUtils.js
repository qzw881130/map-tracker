import { Platform, PermissionsAndroid } from 'react-native';
import { init, Geolocation } from 'react-native-amap-geolocation';
import { getAmapKey } from '../config/keys';

// 请求位置权限
export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      // iOS 通过高德地图 SDK 自动处理权限
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "需要位置权限",
        message: "此应用需要访问您的位置信息来记录运动轨迹",
        buttonNeutral: "稍后询问",
        buttonNegative: "取消",
        buttonPositive: "确定"
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn("请求位置权限时出错:", err);
    return false;
  }
};

// 初始化位置服务
export const initLocationService = async () => {
  try {
    await init({
      ios: getAmapKey(),
      android: getAmapKey()
    });
    console.log('高德地图初始化成功');
    return true;
  } catch (error) {
    console.error('高德地图初始化失败:', error);
    return false;
  }
};

// 配置位置追踪参数
export const configureLocationTracking = async () => {
  try {
    if (Geolocation.setLocationMode) {
      await Geolocation.setLocationMode('Device_Sensors');  // 仅使用GPS
      await Geolocation.setDistanceFilter(0);  // 不设置距离过滤
      await Geolocation.setGpsFirstTimeout(3000);
      await Geolocation.setInterval(1000);    // 每秒更新一次
      await Geolocation.setDesiredAccuracy('HightAccuracy');
    }
    return true;
  } catch (error) {
    console.error('配置位置追踪参数失败:', error);
    return false;
  }
};

// 获取当前位置
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        const coords = position.coords || position;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
        });
      },
      error => {
        console.error('获取当前位置失败:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};

// 开始位置监听
export const startLocationWatch = (onLocation, onError) => {
  return Geolocation.watchPosition(
    location => {
      const coords = location.coords || location;
      if (!coords.accuracy || coords.accuracy > 50) {
        console.log('位置精度不足（误差超过50米），忽略此次更新:', coords.accuracy);
        return;
      }
      onLocation(coords);
    },
    error => {
      console.error('位置更新错误:', error);
      onError(error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 0,
      interval: 1000,
      timeout: 15000,
    }
  );
};

// 停止位置监听
export const stopLocationWatch = (watchId) => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
  }
};
