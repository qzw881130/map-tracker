import { Platform, PermissionsAndroid } from 'react-native';
import { init, Geolocation } from 'react-native-amap-geolocation';
import { getAmapKey } from '../config/keys';

const logLocationEvent = (event, data = {}) => {
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`[${timestamp}] 位置事件: ${event}`, {
    ...data,
    platform: Platform.OS,
    version: Platform.Version,
  });
};

// 请求位置权限
export const requestLocationPermission = async () => {
  try {
    logLocationEvent('开始请求位置权限');
    
    if (Platform.OS === 'ios') {
      logLocationEvent('iOS: 使用高德地图 SDK 处理权限');
      return true;
    }

    // Android 需要同时请求前台和后台定位权限
    logLocationEvent('Android: 请求前台位置权限');
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
      logLocationEvent('Android: 前台位置权限已授予，请求后台权限');
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
      
      const result = backgroundGranted === PermissionsAndroid.RESULTS.GRANTED;
      logLocationEvent('Android: 后台位置权限请求结果', { granted: result });
      return result;
    }
    
    logLocationEvent('Android: 前台位置权限被拒绝');
    return false;
  } catch (err) {
    logLocationEvent('请求位置权限出错', { error: err.message });
    return false;
  }
};

// 初始化位置服务
export const initLocationService = async () => {
  try {
    logLocationEvent('开始初始化位置服务');
    
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

    logLocationEvent('初始化高德地图 SDK', { options });
    await init(options);

    // Android 特定配置
    if (Platform.OS === 'android' && Geolocation.setLocationMode) {
      logLocationEvent('Android: 设置位置模式为 GPS');
      await Geolocation.setLocationMode('Device_Sensors');
    }

    logLocationEvent('位置服务初始化成功');
    return true;
  } catch (error) {
    logLocationEvent('位置服务初始化失败', { error: error.message });
    return false;
  }
};

// 配置位置追踪参数
export const configureLocationTracking = async () => {
  try {
    logLocationEvent('开始配置位置追踪参数');
    
    const locationConfig = {
      distanceFilter: 5,        // 每5米更新一次
      interval: 500,            // 每500ms尝试获取一次位置
      accuracy: {
        ios: 'best',
        android: 'high',
      },
      activityType: 'fitness',  // 针对运动场景优化
    };

    if (Platform.OS === 'android') {
      logLocationEvent('Android: 配置位置追踪参数');
      await Geolocation.setLocationMode('Device_Sensors');
      await Geolocation.setDistanceFilter(locationConfig.distanceFilter);
      await Geolocation.setGpsFirstTimeout(3000);
      await Geolocation.setInterval(locationConfig.interval);
      await Geolocation.setDesiredAccuracy(locationConfig.accuracy.android);
      await Geolocation.setNeedAddress(false);
      await Geolocation.setOnceLocation(false);
      await Geolocation.setSensorEnable(true);
    } else {
      logLocationEvent('iOS: 配置位置追踪参数');
      if (Geolocation.setDesiredAccuracy) {
        await Geolocation.setDesiredAccuracy(locationConfig.accuracy.ios);
      }
      if (Geolocation.setDistanceFilter) {
        await Geolocation.setDistanceFilter(locationConfig.distanceFilter);
      }
      if (Geolocation.setAllowsBackgroundLocationUpdates) {
        await Geolocation.setAllowsBackgroundLocationUpdates(true);
      }
    }
    
    logLocationEvent('位置追踪参数配置成功');
    return true;
  } catch (error) {
    logLocationEvent('配置位置追踪参数失败', { error: error.message });
    return false;
  }
};

// 获取当前位置
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    logLocationEvent('开始获取当前位置');
    
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
        const result = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
          timestamp: coords.timestamp || new Date().getTime(),
        };
        logLocationEvent('获取当前位置成功', { coords: result });
        resolve(result);
      },
      error => {
        logLocationEvent('获取当前位置失败', { error: error.message });
        reject(error);
      },
      options
    );
  });
};

// 开始位置监听
export const startLocationWatch = (onLocation, onError) => {
  logLocationEvent('开始位置监听');
  
  // 先停止之前的监听（如果有的话）
  try {
    Geolocation.stopUpdatingLocation();
  } catch (error) {
    logLocationEvent('停止之前的位置监听时出错', { error: error.message });
  }
  
  const options = {
    enableHighAccuracy: true,
    distanceFilter: 0,
    interval: 1000,
    timeout: 15000,
    reGeocode: false,
    allowBackgroundLocationUpdates: true,
    pausesLocationUpdatesAutomatically: false,
    locationMode: 1,
    androidAllowBackgroundUpdates: true,
    iosAllowBackgroundLocationUpdates: true,
    iosPausesLocationUpdatesAutomatically: false
  };

  logLocationEvent('位置监听配置', { options });
  
  let updateCount = 0;
  let lastLogTime = Date.now();
  
  return Geolocation.watchPosition(
    location => {
      const coords = location.coords || location;
      updateCount++;
      
      // 每30秒或每10次更新记录一次日志
      const now = Date.now();
      if (updateCount % 10 === 0 || now - lastLogTime > 30000) {
        logLocationEvent('位置更新统计', {
          updateCount,
          timeSinceStart: Math.floor((now - lastLogTime) / 1000) + '秒',
          accuracy: coords.accuracy,
          speed: coords.speed,
        });
        lastLogTime = now;
      }

      if (!coords.accuracy || coords.accuracy > 50) {
        logLocationEvent('位置精度不足', { accuracy: coords.accuracy });
        return;
      }

      onLocation({
        ...coords,
        speed: coords.speed >= 0 ? coords.speed : 0, // 修正负速度
        timestamp: coords.timestamp || new Date().getTime(),
      });
    },
    error => {
      logLocationEvent('位置监听错误', { error: error.message });
      onError(error);
    },
    options
  );
};

// 停止位置监听
export const stopLocationWatch = (watchId) => {
  try {
    logLocationEvent('停止位置监听', { watchId });
    
    // 先移除特定的 watch
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
    }
    
    // 停止所有位置更新
    Geolocation.stopUpdatingLocation();
    
    // 移除所有监听器
    if (Platform.OS === 'ios') {
      Geolocation.removeAllListeners();
    }
    
    logLocationEvent('位置监听已完全停止');
  } catch (error) {
    logLocationEvent('停止位置监听时出错', { error: error.message });
  }
};

// 使用加速度计和陀螺仪检测设备是否在移动
const checkDeviceMotion = () => {
  return new Promise((resolve) => {
    if (DeviceMotionEvent) {
      let isMoving = false;
      let motionCount = 0;
      const threshold = 0.1; // 加速度阈值（m/s²）
      const samples = 10;    // 采样次数
      
      const motionHandler = (event) => {
        const { x, y, z } = event.acceleration;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        if (magnitude > threshold) {
          motionCount++;
        }
        
        if (motionCount >= samples / 2) {
          isMoving = true;
        }
        
        if (--samples <= 0) {
          window.removeEventListener('devicemotion', motionHandler);
          resolve(isMoving);
        }
      };
      
      window.addEventListener('devicemotion', motionHandler);
    } else {
      // 如果设备不支持运动检测，默认返回true
      resolve(true);
    }
  });
};

// 检查两个位置之间的移动是否合理
const isValidMovement = (prevLocation, currentLocation, timeInterval) => {
  if (!prevLocation || !currentLocation) return true;
  
  // 计算速度（米/秒）
  const distance = getDistance(
    prevLocation.latitude,
    prevLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );
  const speed = distance / (timeInterval / 1000);
  
  // 检查速度是否合理（小于100米/秒，约360公里/小时）
  if (speed > 100) return false;
  
  // 如果精度变差了很多，可能是GPS信号不稳定
  if (currentLocation.accuracy > prevLocation.accuracy * 2) return false;
  
  return true;
};

// 使用卡尔曼滤波平滑位置数据
class KalmanFilter {
  constructor() {
    this.Q = 0.005;  // 过程噪声
    this.R = 0.5;    // 测量噪声
    this.P = 1.0;    // 估计误差协方差
    this.X = null;   // 状态估计
  }
  
  filter(measurement) {
    if (this.X === null) {
      this.X = measurement;
      return measurement;
    }
    
    // 预测
    const pTemp = this.P + this.Q;
    
    // 更新
    const K = pTemp / (pTemp + this.R);
    this.X = this.X + K * (measurement - this.X);
    this.P = (1 - K) * pTemp;
    
    return this.X;
  }
}

// 位置过滤器
class LocationFilter {
  constructor() {
    this.latFilter = new KalmanFilter();
    this.lonFilter = new KalmanFilter();
    this.lastLocation = null;
    this.lastTimestamp = null;
  }

  async filterLocation(location) {
    // 验证输入数据
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      console.warn('Invalid location data:', location);
      return this.lastLocation || location;
    }

    try {
      // 检查设备是否在移动
      const isMoving = await checkDeviceMotion().catch(() => true);
      
      // 如果设备静止且GPS精度较差，返回上一个有效位置
      if (!isMoving && location.accuracy > 20 && this.lastLocation) {
        return this.lastLocation;
      }
      
      // 检查时间间隔和移动是否合理
      if (this.lastLocation && this.lastTimestamp) {
        const timeInterval = location.timestamp - this.lastTimestamp;
        if (!isValidMovement(this.lastLocation, location, timeInterval)) {
          return this.lastLocation;
        }
      }
      
      // 应用卡尔曼滤波
      const filteredLat = this.latFilter.filter(location.latitude);
      const filteredLon = this.lonFilter.filter(location.longitude);
      
      const filteredLocation = {
        ...location,
        latitude: filteredLat,
        longitude: filteredLon
      };
      
      this.lastLocation = filteredLocation;
      this.lastTimestamp = location.timestamp;
      
      return filteredLocation;
    } catch (error) {
      console.error('Error in filterLocation:', error);
      // 发生错误时返回原始位置
      return location;
    }
  }
}

// 导出位置过滤器实例
export const locationFilter = new LocationFilter();

// 计算两点之间的距离（米）
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // 米
  
  return distance;
}

// 位置数据过滤器
class LocationFilterNew {
  constructor() {
    this.lastValidLocation = null;
    this.lastUpdateTime = 0;
    this.MAX_TIME_GAP = 10000;  // 最大允许10秒没有新点
  }

  isValidLocation(location) {
    const now = Date.now();
    
    // 基础检查
    if (!location || !location.latitude || !location.longitude) {
      return false;
    }

    // 第一个点总是接受
    if (!this.lastValidLocation) {
      this.lastValidLocation = location;
      this.lastUpdateTime = now;
      return true;
    }

    // 时间窗口检查：如果距离上一个点太久，即使accuracy不够好也接受
    const timeGap = now - this.lastUpdateTime;
    if (timeGap >= this.MAX_TIME_GAP) {
      console.log('[位置过滤器] 距离上次更新超过10秒，接受新位置');
      this.lastValidLocation = location;
      this.lastUpdateTime = now;
      return true;
    }

    // accuracy检查（放宽到10米）
    if (location.accuracy > 10) {
      return false;
    }

    // 速度检查（取消负速度检查，因为可能是设备问题）
    if (location.speed < -1) {
      return false;
    }

    // 通过所有检查
    this.lastValidLocation = location;
    this.lastUpdateTime = now;
    return true;
  }
}

// 导出位置过滤器实例
export const locationFilterNew = new LocationFilterNew();
