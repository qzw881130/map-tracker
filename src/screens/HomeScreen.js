import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text as GText,
  Button,
  ButtonText,
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectItem,
  VStack,
  HStack,
} from '@gluestack-ui/themed';
import { ACTIVITY_TYPES } from '../config/activityTypes';

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

export default function HomeScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [region, setRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [allowMapUpdate, setAllowMapUpdate] = useState(true);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [watchId, setWatchId] = useState(null);

  // 停止追踪函数
  const stopTracking = async () => {
    try {
      console.log('[运动追踪] 停止运动追踪');
      
      if (watchId) {
        stopLocationWatch(watchId);
        setWatchId(null);
      }

      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);
      const distance = calculateTotalDistance(routeCoordinates);
      
      console.log('[运动追踪] 轨迹记录完成', {
        startTime: new Date(startTime).toLocaleString('zh-CN'),
        endTime: new Date(endTime).toLocaleString('zh-CN'),
        duration: `${Math.floor(duration / 60)}分${duration % 60}秒`,
        totalDistance: distance.toFixed(2) + '米',
        pointsCount: routeCoordinates.length
      });

      setIsTracking(false);
      setStartTime(null);
      
      // 保存轨迹数据
      if (routeCoordinates.length > 0) {
        const filteredCoordinates = routeCoordinates.filter(coord => coord.accuracy <= 50);
        
        if (filteredCoordinates.length < 2) {
          Alert.alert('提示', '有效轨迹点太少，无法保存');
          return;
        }

        const activity = {
          id: Date.now().toString(),
          type: activityType,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration,
          distance,
          averageSpeed: calculateAverageSpeed(filteredCoordinates, startTime),
          coordinates: filteredCoordinates,
          maxSpeed: Math.max(...filteredCoordinates.map(c => c.speed || 0)),
          minAccuracy: Math.min(...filteredCoordinates.map(c => c.accuracy)),
          maxAccuracy: Math.max(...filteredCoordinates.map(c => c.accuracy)),
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
    } catch (error) {
      console.error('[运动追踪] 停止追踪失败:', error);
      setErrorMsg('停止追踪失败: ' + error.message);
    }
  };

  // 初始化位置服务
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

  // 处理位置更新
  useEffect(() => {
    let watchId = null;

    const handleLocationUpdate = (coords) => {
      if (!isTracking) return;

      const newCoords = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: coords.timestamp || new Date().getTime(),
        accuracy: coords.accuracy,
        speed: coords.speed || 0,
      };

      // 更新当前位置
      setCurrentLocation(newCoords);

      setRouteCoordinates(prevCoords => {
        if (prevCoords.length === 0) {
          console.log('[位置追踪] 记录起点:', newCoords);
          return [newCoords];
        }
        
        const lastCoord = prevCoords[prevCoords.length - 1];
        const distance = calculateDistance(
          lastCoord.latitude,
          lastCoord.longitude,
          newCoords.latitude,
          newCoords.longitude
        );

        const timeDiff = (newCoords.timestamp - lastCoord.timestamp) / 1000;
        const calculatedSpeed = distance / timeDiff;
        
        setCurrentSpeed(calculatedSpeed);

        // 每次位置更新时记录应用状态
        console.log(`[${new Date().toLocaleString('zh-CN')}] 应用状态:`, {
          isTracking,
          routeCoordinatesCount: prevCoords.length,
          elapsedTime: Math.floor((Date.now() - startTime) / 1000),
          currentSpeed: calculatedSpeed,
          totalDistance: calculateTotalDistance([...prevCoords, newCoords]),
          accuracy: newCoords.accuracy,
        });

        if (distance < 0.2) {
          console.log('[位置追踪] 位置变化太小，忽略此次更新:', {
            distance,
            timeDiff,
            lastCoord,
            newCoords
          });
          return prevCoords;
        }

        // 更新地图区域以跟随用户
        if (mapRef.current && allowMapUpdate) {
          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001
          }, 1000);
        }

        console.log('[位置追踪] 新增轨迹点:', {
          distance,
          timeDiff,
          speed: calculatedSpeed,
          totalPoints: prevCoords.length + 1,
          totalDistance: calculateTotalDistance([...prevCoords, newCoords])
        });

        return [...prevCoords, newCoords];
      });
    };

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

        await configureLocationTracking();
        
        setStartTime(Date.now());
        setIsTracking(true);
        setRouteCoordinates([]);
        setCurrentSpeed(0);
        setElapsedTime(0);
        
        console.log('[运动追踪] 开始记录新轨迹', {
          startTime: new Date().toLocaleString('zh-CN'),
          isTracking: true
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
    console.log('地图区域变化完成 (手动)', newRegion);
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

  console.log('currentLocation===', currentLocation)

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
          followsUserLocation={false}
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
      {region && (
        <Box
          position="absolute"
          left="$3"
          top="$3"
          bg="$backgroundLight800"
          borderRadius="$md"
          p="$3"
          style={styles.coordOverlay}
        >
          <VStack space="$2">
            <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
              中心点纬度: {region.latitude.toFixed(6)}
            </GText>
            <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
              中心点经度: {region.longitude.toFixed(6)}
            </GText>
            {currentLocation && (
              <>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  当前纬度: {currentLocation.latitude.toFixed(6)}
                </GText>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  当前经度: {currentLocation.longitude.toFixed(6)}
                </GText>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  GPS速度: {formatSpeed(currentLocation.speed || 0, true)}
                </GText>
              </>
            )}
            {(
              <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                计算速度: {formatSpeed(currentSpeed, true)}
              </GText>
            )}
            {isTracking && (
              <>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  里程: {formatDistance(currentDistance)}
                </GText>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  时间: {formatElapsedTime(elapsedTime)}
                </GText>
              </>
            )}
            <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                是否追踪: {isTracking ? '是' : '否'}
              </GText>
          </VStack>
        </Box>
      )}

      {/* 缩放控制按钮 */}
      <Box
        position="absolute"
        right={4}
        top="50%"
        style={{ transform: [{ translateY: -50 }] }}
      >
        <VStack space={2}>
          <Button
            size="sm"
            variant="solid"
            bg="$white"
            onPress={handleZoomIn}
            style={styles.zoomButton}
          >
            <ButtonText fontSize={16} color="$black" style={styles.buttonText}>+</ButtonText>
          </Button>
          <Button
            size="sm"
            variant="solid"
            bg="$white"
            onPress={handleZoomOut}
            style={styles.zoomButton}
          >
            <ButtonText fontSize={16} color="$black" style={styles.buttonText}>−</ButtonText>
          </Button>
          <Button
            size="sm"
            variant="solid"
            bg="$white"
            onPress={handleLocateCurrentPosition}
            style={styles.zoomButton}
          >
            <ButtonText fontSize={14} color="$black" style={styles.buttonText}>⌖</ButtonText>
          </Button>
        </VStack>
      </Box>

      {isTracking && (
        <View
          style={{
            position: 'absolute',
            bottom: 180,
            left: 15,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 16,
            padding: 12,
          }}
        >
          <View style={{ gap: 4 }}>
            <GText style={{ fontSize: 12, color: '#A0A0A0' }}>当前速度</GText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <GText style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                {formatSpeed(currentSpeed, true).split(' ')[0]}
              </GText>
              <GText style={{ fontSize: 12, color: '#A0A0A0' }}>km/h</GText>
            </View>
          </View>
        </View>
      )}

      {/* 底部控制面板 */}
      <Box
        position="absolute"
        bottom={20}
        left={5}
        right={5}
        bg="$white"
        borderTopRadius="$2xl"
        shadow="2"
        p={5}
      >
        <HStack space={8} alignItems="center" justifyContent="space-between">
          <Box flex={1}>
            <Select
              selectedValue={activityType}
              onValueChange={setActivityType}
              flex={1}
            >
              <SelectTrigger variant="outline" size="md">
                <SelectInput placeholder="选择运动类型" />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicator />
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      label={type.label}
                      value={type.value}
                    />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </Box>

          <Button
            size="md"
            variant="solid"
            bgColor={isTracking ? "$red500" : "$green500"}
            onPress={isTracking ? handleStopTracking : handleStartTracking}
            style={{
              minWidth: 90,
              height: 36,
              marginLeft: 16,
            }}
          >
            <GText color="$white" bold>{isTracking ? '结束' : '开始'}</GText>
          </Button>
        </HStack>
      </Box>
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
  coordText: {
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace'
    }),
    textAlign: 'left',
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingLeft: 0,
    paddingRight: 0,
  },
  buttonText: {
    lineHeight: 16,
    textAlign: 'center',
    width: '100%',
    paddingLeft: 0,
    paddingRight: 0,
  },
});
