import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text as GText
} from '@gluestack-ui/themed';
import { ACTIVITY_TYPES } from '../config/activityTypes';
import ControlPanel from '../components/ControlPanel';
import ZoomControls from '../components/ZoomControls';
import CoordinatesOverlay from '../components/CoordinatesOverlay';

// 导入工具函数
import { 
  requestLocationPermission, 
  initLocationService, 
  configureLocationTracking,
  getCurrentPosition,
  startLocationWatch,
  stopLocationWatch
} from '../utils/locationUtils';
import { 
  calculateDistance, 
  calculateTotalDistance, 
  calculateAverageSpeed 
} from '../utils/distanceUtils';
import { 
  formatElapsedTime, 
  formatDistance, 
  formatSpeed 
} from '../utils/formatUtils';
import { saveActivity } from '../utils/storageUtils';
import { locationFilter } from '../utils/locationUtils';
import { AppState } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsSpeed, setGpsSpeed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [region, setRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [allowMapUpdate, setAllowMapUpdate] = useState(true);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [watchId, setWatchId] = useState(null);
  const lastLocationRef = useRef(null);  // 用于存储最后一次有效的位置更新
  const [isAppActive, setIsAppActive] = useState(true);  // 添加应用状态跟踪
  const [appState, setAppState] = useState(AppState.currentState);  // 添加 appState 状态
  const startTimeRef = useRef(null);  // 添加 ref 存储开始时间

  useEffect(() => {
    (async () => {
      try {
        await initLocationService();
        const position = await getCurrentPosition();
        
        setLocation(position);
        setCurrentLocation(position);
        setRegion({
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Error getting location: ' + error.message);
      }
    })();
  }, []);

  // 停止追踪函数
  const stopTracking = async () => {
    try {
      console.log('[运动追踪] 停止运动追踪');
      
      if (watchId) {
        stopLocationWatch(watchId);
        setWatchId(null);
      }

      if (!startTimeRef.current || routeCoordinates.length < 2) {
        console.log('[运动追踪] 无效的追踪数据:', {
          hasStartTime: !!startTimeRef.current,
          pointsCount: routeCoordinates.length
        });
        setIsTracking(false);
        setStartTime(null);
        startTimeRef.current = null;
        setElapsedTime(0);
        Alert.alert('提示', '轨迹点数据不足，无法保存活动. routeCoordinates.length: ' + routeCoordinates.length);
        return;
      }

      const endTime = Date.now();
      const duration = Math.floor((endTime - startTimeRef.current) / 1000);
      
      // 保存轨迹数据
      if (routeCoordinates.length > 0) {
        const filteredCoordinates = routeCoordinates.filter(coord => 
          coord && coord.accuracy != null && coord.accuracy <= 50
        );
        
        if (filteredCoordinates.length < 2) {
          Alert.alert('提示', '有效轨迹点太少，无法保存');
          return;
        }

        const totalDistance = calculateTotalDistance(filteredCoordinates);
        const avgSpeed = calculateAverageSpeed(filteredCoordinates, startTimeRef.current);
        
        console.log('[运动追踪] 轨迹统计:', {
          起点时间: new Date(startTimeRef.current).toLocaleString(),
          终点时间: new Date(endTime).toLocaleString(),
          持续时间: formatElapsedTime(duration),
          总距离: totalDistance.toFixed(2) + '米',
          平均速度: avgSpeed.toFixed(2) + ' km/h',
          轨迹点数: filteredCoordinates.length,
          原始点数: routeCoordinates.length,
          appState:appState
        });

        const activity = {
          id: Date.now().toString(),
          type: activityType,
          startTime: new Date(startTimeRef.current).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: Math.max(0, duration),
          distance: Math.max(0, totalDistance),
          averageSpeed: avgSpeed >= 0 ? avgSpeed : 0,
          coordinates: filteredCoordinates,
          maxSpeed: Math.max(0, ...filteredCoordinates.map(c => c.speed || 0)),
          minAccuracy: Math.min(...filteredCoordinates.map(c => c.accuracy || 999)),
          maxAccuracy: Math.max(...filteredCoordinates.map(c => c.accuracy || 0)),
        };

        try {
          const success = await saveActivity(activity);
          if (success) {
            setRouteCoordinates([]);
            setCurrentSpeed(0);
            setCurrentDistance(0);
            setElapsedTime(0);
            navigation.navigate('ActivityDetail', { activity });
          } else {
            Alert.alert('错误', '保存活动失败');
          }
        } catch (error) {
          console.error('Error saving activity:', error);
          Alert.alert('错误', '保存活动失败：' + error.message);
        }
      }

      setIsTracking(false);
      setStartTime(null);
      startTimeRef.current = null;
      setElapsedTime(0);
    } catch (error) {
      console.error('[运动追踪] 停止追踪失败:', error);
      setErrorMsg('停止追踪失败: ' + error.message);
    }
  };

  // 处理位置更新
  const handleLocationUpdate = useCallback((location) => {
    if (!isTracking || !startTimeRef.current) return;

    console.log('[位置更新] 状态:', {
      appState: appState,
      是否前台: isAppActive,
      位置时间戳: new Date(location.timestamp).toLocaleString(),
      当前时间戳: new Date().toLocaleString(),
    });

    try {
      const newCoords = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        appState: appState,
        isActive: isAppActive,
        systemTime: Date.now()
      };

      // 检查位置是否有效
      if (!location.latitude || !location.longitude) {
        console.log('[位置更新] 无效的位置数据:', location);
        return;
      }

      console.log('[位置更新] 新位置:(', newCoords.latitude.toFixed(15), ',', newCoords.longitude.toFixed(15), ')', {
        appState,
        时间差: ((Date.now() - location.timestamp) / 1000).toFixed(1) + '秒',
        精度: location.accuracy ? location.accuracy.toFixed(2) + '米' : '未知'
      });

      // 更新 GPS 速度显示
      const gpsSpeedValue = location.speed >= 0 ? location.speed : 0;
      setGpsSpeed(gpsSpeedValue);
      console.log('[速度追踪] GPS速度:', {
        原始值: location.speed,
        处理后: gpsSpeedValue,
        单位: '米/秒'
      });

      // 检查位置是否发生实质性变化
      if (lastLocationRef.current) {
        const distance = calculateDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          newCoords.latitude,
          newCoords.longitude
        );
        
        const timeDiff = Math.max((newCoords.timestamp - lastLocationRef.current.timestamp) / 1000, 0.1);
        
        // if (distance < location.accuracy || timeDiff < 0.1) {
        //   console.log('[位置追踪] 位置变化不显著，忽略此次更新:', {
        //     distance,
        //     accuracy: location.accuracy,
        //     timeDiff,
        //     isAppActive
        //   });
        //   return;
        // }

        const calculatedSpeed = distance / timeDiff;
        const currentSpeed = isNaN(calculatedSpeed) ? 0 : calculatedSpeed;
        
        console.log('[速度计算] 详情:', {
          距离: distance.toFixed(2) + '米',
          时间差: timeDiff.toFixed(2) + '秒',
          计算速度: currentSpeed.toFixed(2) + '米/秒',
          GPS速度: gpsSpeedValue.toFixed(2) + '米/秒',
          appState
        });

        const elapsed = Math.max(0, Math.floor((location.timestamp - startTimeRef.current) / 1000));
        
        console.log('[时间计算] 详情:', {
          当前时间戳: location.timestamp,
          开始时间戳: startTimeRef.current,
          计算结果: elapsed,
          格式化时间: formatElapsedTime(elapsed),
          appState
        });

        // 无论是否在前台，都更新所有状态
        setCurrentSpeed(currentSpeed);
        setCurrentDistance(prev => prev + distance);
        setElapsedTime(elapsed);
        setRouteCoordinates(prev => [...prev, newCoords]);
      }

      lastLocationRef.current = newCoords;
    } catch (error) {
      console.error('[位置更新] 处理位置更新时出错:', error);
    }
  }, [isTracking, appState, isAppActive]);

  useEffect(() => {
    let watchId = null;

    const startTracking = async () => {
      try {
        console.log('[运动追踪] 开始运动追踪');
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          setErrorMsg('需要位置权限才能使用此功能');
          return;
        }

        const success = await initLocationService();
        if (!success) {
          setErrorMsg('初始化位置服务失败');
          return;
        }

        await configureLocationTracking(activityType);
        
        // 获取初始位置以设置正确的开始时间
        const initialPosition = await getCurrentPosition();
        const initialTime = initialPosition.timestamp;
        
        startTimeRef.current = initialTime;
        setStartTime(initialTime);
        setIsTracking(true);
        setRouteCoordinates([]);
        setCurrentSpeed(0);
        setElapsedTime(0);
        
        console.log('[运动追踪] 开始记录新轨迹', {
          startTime: new Date(initialTime).toLocaleString('zh-CN'),
          isTracking: true,
          initialTimestamp: initialTime
        });

        watchId = startLocationWatch(
          handleLocationUpdate,
          error => {
            console.error('[运动追踪] 位置监听错误:', error);
            setErrorMsg('位置监听出错: ' + error.message);
          }
        );
        setWatchId(watchId);
      } catch (error) {
        console.error('[运动追踪] 启动追踪失败:', error);
        setErrorMsg('启动追踪失败: ' + error.message);
      }
    };

    if (isTracking) {
      startTracking();
    }

    return () => {
      if (watchId) {
        stopLocationWatch(watchId);
        setWatchId(null);
      }
    };
  }, [isTracking, allowMapUpdate]);

  // 添加应用状态监听
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasBackground = !isAppActive && nextAppState === 'active';
      setIsAppActive(nextAppState === 'active');
      setAppState(nextAppState);
      console.log('[应用状态] 切换到:', nextAppState);

      // 如果从后台恢复，且正在追踪，重置地图视图
      if (wasBackground && isTracking && mapRef.current && routeCoordinates.length > 0) {
        console.log('[应用状态] 从后台恢复，重置地图视图');
        
        // 计算当前轨迹的边界
        const latitudes = routeCoordinates.map(coord => coord.latitude);
        const longitudes = routeCoordinates.map(coord => coord.longitude);
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        // 计算中心点和适当的缩放级别
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        
        // 添加一些边距确保轨迹完全可见
        const padding = 0.0005; // 大约50米的边距
        const latDelta = Math.max((maxLat - minLat) + padding * 2, 0.002);
        const lngDelta = Math.max((maxLng - minLng) + padding * 2, 0.002);

        // 使用动画平滑过渡到新的视图
        mapRef.current.animateToRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta
        }, 1000);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAppActive, isTracking, routeCoordinates]);

  // 更新距离
  useEffect(() => {
    if (isTracking && routeCoordinates.length > 0) {
      const distance = calculateTotalDistance(routeCoordinates);
      setCurrentDistance(distance);
    } else {
      setCurrentDistance(0);
    }
  }, [routeCoordinates, isTracking]);

  // 清理计时器
  useEffect(() => {
    if (isTracking && startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTracking, startTime]);

  const handleStartTracking = async () => {
    try {
      if (!activityType) {
        Alert.alert('提示', '请选择运动类型');
        return;
      }

      setIsTracking(true);
    } catch (error) {
      console.error('开始追踪时出错:', error);
      Alert.alert('错误', '开始追踪时出错：' + error.message);
    }
  };

  const handleStopTracking = async () => {
    stopTracking();
  };

  // 添加缩放控制函数
  const handleZoomIn = () => {
    if (mapRef.current) {
      const newRegion = {
        ...region,
        latitudeDelta: region.latitudeDelta / 2,
        longitudeDelta: region.longitudeDelta / 2,
      };
      mapRef.current.animateToRegion(newRegion, 300);
      setRegion(newRegion);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const newRegion = {
        ...region,
        latitudeDelta: region.latitudeDelta * 2,
        longitudeDelta: region.longitudeDelta * 2,
      };
      mapRef.current.animateToRegion(newRegion, 300);
      setRegion(newRegion);
    }
  };

  // 添加定位到当前位置的函数
  const handleLocateCurrentPosition = async () => {
    if (!currentLocation) {
      console.warn('无法获取位置或地图未准备好');
      return;
    }

    try {
      if (mapRef.current) {
        console.log('currentLocation===', {
          ...currentLocation,
          appState,
          isActive: isAppActive,
          时间: new Date(currentLocation.timestamp).toLocaleString()
        });
        const newRegion = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        };
        
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('定位到当前位置时出错:', error);
    }
  };

  // 处理地图区域变化
  const handleRegionChange = (newRegion) => {
    // console.log('地图区域变化 (手动)', newRegion);
    // 当用户手动移动地图时，禁止自动更新
    if (!isTracking) {
      setAllowMapUpdate(false);
    }
  };

  // 处理地图区域变化结束
  const handleRegionChangeComplete = (newRegion) => {
    if (!isTracking) {
      setRegion(newRegion);
    }
  };

  // 如果位置和区域都没有准备好，显示加载状态
  if (!location || !region) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <GText>获取位置信息中...</GText>
      </Box>
    );
  }

  console.log('currentLocation===', currentLocation, 'appState====',appState)

  return (
    <Box flex={1}>
      {errorMsg ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <GText>{errorMsg}</GText>
        </Box>
      ) : !region ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <GText>正在加载地图...</GText>
        </Box>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={true}
          followsUserLocation={isTracking}
          showsCompass={true}
          showsScale={true}
        >
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#FF0000"
              strokeWidth={3}
            />
          )}
          {routeCoordinates.length > 0 && (
            <>
              <Marker
                coordinate={routeCoordinates[0]}
                title="起点"
                pinColor="green"
              />
            </>
          )}
        </MapView>
      )}

      {/* 坐标显示浮层 */}
      <CoordinatesOverlay
        region={region}
        currentLocation={currentLocation}
        gpsSpeed={gpsSpeed}
        currentSpeed={currentSpeed}
        currentDistance={currentDistance}
        elapsedTime={elapsedTime}
        isTracking={isTracking}
        routeCoordinates={routeCoordinates}
      />

      {/* 缩放控制按钮 */}
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onLocateCurrentPosition={handleLocateCurrentPosition}
      />

      {/* 底部控制面板 */}
      <ControlPanel
        activityType={activityType}
        setActivityType={setActivityType}
        isTracking={isTracking}
        onStartTracking={handleStartTracking}
        onStopTracking={handleStopTracking}
        activityTypes={ACTIVITY_TYPES}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  coordOverlay: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
});
