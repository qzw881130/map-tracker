import { Platform, PermissionsAndroid } from 'react-native';
import { init, Geolocation } from 'react-native-amap-geolocation';
import { getAmapKey } from '../config/keys';

// 请求位置权限
export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      // iOS 权限由高德地图 SDK 处理
      return true;
    }

    // Android 需要同时请求前台和后台定位权限
    const foregroundGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "需要位置权限",
        message: "此应用需要访问您的位置信息来记录运动轨迹",
        buttonNeutral: "稍后询问",
        buttonNegative: "取消",
        buttonPositive: "确定"
      }
    );

    if (foregroundGranted === PermissionsAndroid.RESULTS.GRANTED) {
      const backgroundGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: "需要后台位置权限",
          message: "为了在应用处于后台时继续记录运动轨迹，需要允许后台访问位置信息",
          buttonNeutral: "稍后询问",
          buttonNegative: "取消",
          buttonPositive: "确定"
        }
      );
      return backgroundGranted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false;
  } catch (err) {
    console.warn("请求位置权限时出错:", err);
    return false;
  }
};

// 初始化位置服务
export const initLocationService = async () => {
  try {
    // 配置高德地图 SDK
    const options = {
      ios: getAmapKey(),
      android: getAmapKey(),
      locationMode: 1,  // 设备定位模式：1 为 GPS
      reGeocode: false, // 不需要逆地理编码
      interval: 1000,   // 定位间隔，单位毫秒
      needAddress: false, // 不需要详细地址信息
      distanceFilter: 0,  // 不设置距离过滤
      background: true,   // 允许后台定位
      killProcess: false  // 进程被杀死时不退出定位
    };

    await init(options);

    // Android 特定配置
    if (Platform.OS === 'android' && Geolocation.setLocationMode) {
      await Geolocation.setLocationMode('Device_Sensors');
    }

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
    if (Platform.OS === 'android') {
      // Android 特定配置
      await Geolocation.setLocationMode('Device_Sensors');  // 仅使用GPS
      await Geolocation.setDistanceFilter(0);  // 不设置距离过滤
      await Geolocation.setGpsFirstTimeout(3000);
      await Geolocation.setInterval(1000);    // 每秒更新一次
      await Geolocation.setDesiredAccuracy('HightAccuracy');
      await Geolocation.setNeedAddress(false);  // 不需要逆地理编码
      await Geolocation.setOnceLocation(false); // 持续定位
      await Geolocation.setSensorEnable(true);  // 使用传感器
    } else {
      // iOS 特定配置
      if (Geolocation.setDesiredAccuracy) {
        await Geolocation.setDesiredAccuracy('HightAccuracy');
      }
      if (Geolocation.setDistanceFilter) {
        await Geolocation.setDistanceFilter(0);
      }
      if (Geolocation.setAllowsBackgroundLocationUpdates) {
        await Geolocation.setAllowsBackgroundLocationUpdates(true);
      }
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
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      distanceFilter: 0,
      interval: 1000,
      reGeocode: false
    };

    Geolocation.getCurrentPosition(
      position => {
        const coords = position.coords || position;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
          timestamp: coords.timestamp || new Date().getTime(),
        });
      },
      error => {
        console.error('获取当前位置失败:', error);
        reject(error);
      },
      options
    );
  });
};

// 开始位置监听
export const startLocationWatch = (onLocation, onError) => {
  const options = {
    enableHighAccuracy: true,
    distanceFilter: 0,
    interval: 1000,
    timeout: 15000,
    reGeocode: false,
    // 启用后台定位
    allowBackgroundLocationUpdates: true,
    pausesLocationUpdatesAutomatically: false,
    locationMode: 1, // GPS_DEVICE_SENSORS
    androidAllowBackgroundUpdates: true, // Android 特定
    iosAllowBackgroundLocationUpdates: true, // iOS 特定
    iosPausesLocationUpdatesAutomatically: false // iOS 特定
  };

  return Geolocation.watchPosition(
    location => {
      const coords = location.coords || location;
      if (!coords.accuracy || coords.accuracy > 50) {
        console.log('位置精度不足（误差超过50米），忽略此次更新:', coords.accuracy);
        return;
      }
      onLocation({
        ...coords,
        timestamp: coords.timestamp || new Date().getTime(),
      });
    },
    error => {
      console.error('位置更新错误:', error);
      onError(error);
    },
    options
  );
};

// 停止位置监听
export const stopLocationWatch = (watchId) => {
  if (watchId !== null) {
    try {
      Geolocation.clearWatch(watchId);
    } catch (error) {
      console.error('停止位置监听时出错:', error);
    }
  }
};
