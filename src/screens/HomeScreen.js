import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Platform, Alert, Linking } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { init, Geolocation } from 'react-native-amap-geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonText,
  Text as GText,
  VStack,
  HStack,
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectItem,
} from '@gluestack-ui/themed';
import { ACTIVITY_TYPES } from '../config/activityTypes';
import { getAmapKey } from '../config/keys';

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

  useEffect(() => {
    (async () => {
      try {
        // 初始化高德地图
        await init({
          ios: getAmapKey(),
          android: getAmapKey(),
        });
        console.log('高德地图初始化成功');

        // 获取当前位置
        Geolocation.getCurrentPosition(
          position => {
            console.log('获取到位置:', position);
            const coords = position.coords || position;
            
            setLocation(coords);
            setCurrentLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              speed: coords.speed || 0,
            });
            
            setRegion({
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            });
          },
          error => {
            console.error('Error getting location:', error);
            setErrorMsg('Error getting location: ' + error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Error getting location: ' + error.message);
      }
    })();
  }, []);

  useEffect(() => {
    let watchId = null;
    
    const startLocationUpdates = async () => {
      try {
        console.log('开始位置更新，追踪状态:', isTracking);
        // 配置定位
        if (Geolocation.setLocationMode) {
          await Geolocation.setLocationMode('Device_Sensors');  // 仅使用GPS
          await Geolocation.setDistanceFilter(0);  // 不设置距离过滤，让所有位置更新都能收到
          await Geolocation.setGpsFirstTimeout(3000);
          await Geolocation.setInterval(1000);    // 每秒更新一次
          await Geolocation.setDesiredAccuracy('HightAccuracy');
        }

        // 开始监听位置更新
        watchId = Geolocation.watchPosition(
          location => {
            const coords = location.coords || location;
            
            // accuracy 表示定位精度，单位是米
            // 比如 accuracy = 10 表示实际位置在返回坐标的10米范围内
            // 这里我们设置50米作为阈值，如果精度比这个差（误差超过50米），就忽略这次更新
            if (!coords.accuracy || coords.accuracy > 50) {
              console.log('位置精度不足（误差超过50米），忽略此次更新:', coords.accuracy);
              return;
            }

            console.log('位置更新 (精度:', coords.accuracy, '米):', coords, '追踪状态:', isTracking, '允许地图更新:', allowMapUpdate);
            
            // 更新当前位置
            setCurrentLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              speed: coords.speed || 0,
            });

            // 只在追踪模式下处理速度和路径更新
            if (isTracking) {
              const newCoords = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: new Date().getTime(),
                accuracy: coords.accuracy,
                speed: coords.speed || 0,
              };
            
              // 检查与上一个点的距离和时间，计算速度
              setRouteCoordinates(prevCoords => {
                if (prevCoords.length === 0) {
                  setCurrentSpeed(0);
                  return [newCoords];
                }
                
                const lastCoord = prevCoords[prevCoords.length - 1];
                const distance = calculateDistance(
                  lastCoord.latitude,
                  lastCoord.longitude,
                  newCoords.latitude,
                  newCoords.longitude
                );

                // 计算时间差（秒）
                const timeDiff = (newCoords.timestamp - lastCoord.timestamp) / 1000;
                // 计算速度（米/秒）
                const calculatedSpeed = distance / timeDiff;
                
                // 更新速度显示
                console.log('计算速度:', {
                  distance,
                  timeDiff,
                  calculatedSpeed,
                  speedKmh: calculatedSpeed * 3.6
                });
                
                setCurrentSpeed(calculatedSpeed);

                // 降低距离阈值到0.1米，这样可以更精确地记录轨迹
                console.log('位置变化distance===', {distance});
                if (distance < 0.2) {
                  console.log('位置变化太小，忽略此次更新', {distance});
                  return prevCoords;
                }

                console.log('记录新的轨迹点:', {
                  distance,
                  newCoords,
                  totalPoints: prevCoords.length + 1
                });

                // 更新地图区域以跟随用户
                if (mapRef.current && allowMapUpdate) {
                  console.log('更新地图区域 (自动)');
                  mapRef.current.animateToRegion({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.001,  // 保持放大状态
                    longitudeDelta: 0.001
                  }, 1000);
                }

                return [...prevCoords, newCoords];
              });
            }
          },
          error => {
            console.error('位置更新错误:', error);
            setErrorMsg('位置更新错误：' + error.message);
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 0, // 不设置距离过滤，让所有位置更新都能收到
            interval: 1000,    // 每秒更新一次
            timeout: 15000,
          }
        );
      } catch (error) {
        console.error('位置服务错误:', error);
        setErrorMsg('获取位置信息时出错：' + error.message);
      }
    };

    if(isTracking) startLocationUpdates();

    return () => {
      console.log('清理位置更新');
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking]);

  useEffect(() => {
    // 当路径坐标更新时，计算当前里程
    if (isTracking && routeCoordinates.length > 0) {
      const distance = calculateTotalDistance(routeCoordinates);
      setCurrentDistance(distance);
    } else {
      setCurrentDistance(0);
    }
  }, [routeCoordinates, isTracking]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 格式化时间显示
  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours} hr ${minutes} min ${remainingSeconds} s`;
    } else if (minutes > 0) {
      return `${minutes} min ${remainingSeconds} s`;
    } else {
      return `${remainingSeconds} s`;
    }
  };

  // 格式化距离显示
  const formatDistance = (distanceInM) => {
    if (distanceInM < 1000) {
      return `${distanceInM.toFixed(0)}米`;
    } else {
      return `${(distanceInM / 1000).toFixed(2)}公里`;
    }
  };

  // 计算两点之间的距离（单位：米）
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // 地球半径，单位米
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 计算总距离
  const calculateTotalDistance = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return 0;
    
    let total = 0;
    // 使用滑动窗口方式计算距离，减少累积误差
    let window = [];
    const WINDOW_SIZE = 3; // 使用3个点作为平滑窗口
    
    for (let i = 0; i < coordinates.length; i++) {
      window.push(coordinates[i]);
      
      if (window.length === WINDOW_SIZE) {
        // 计算窗口中间点与起点的距离
        const distance = calculateDistance(
          window[0].latitude,
          window[0].longitude,
          window[1].latitude,
          window[1].longitude
        );
        
        // 只有当距离大于最小阈值时才计入总距离
        if (distance > 0.001) { // 1米 = 0.001公里
          total += distance;
          console.log('计算第', i, '段距离:', {
            distance: distance, // 转换为米显示
            start: {
              lat: window[0].latitude,
              lon: window[0].longitude
            },
            end: {
              lat: window[1].latitude,
              lon: window[1].longitude
            },
            totalSoFar: total // 转换为米显示
          });
        }
        
        // 移除窗口最早的点
        window.shift();
      }
    }
    
    console.log('总距离:', total, '米');
    return total; // 返回米数
  };

  // 计算平均速度（公里/小时）
  const calculateAverageSpeed = (coordinates, startTime) => {
    if (!coordinates || coordinates.length < 2 || !startTime) return 0;
    
    const distance = calculateTotalDistance(coordinates); // 单位：米
    const duration = (new Date() - startTime) / 1000 / 3600; // 小时
    
    if (duration === 0) return 0;
    return (distance / 1000) / duration; // 转换为公里/小时
  };

  const toRad = (x) => {
    return x * Math.PI / 180;
  };

  const handleStartTracking = async () => {
    try {
      if (!activityType) {
        Alert.alert('提示', '请选择运动类型');
        return;
      }

      setIsTracking(true);
      setStartTime(new Date());
      setElapsedTime(0); // 重置计时器
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      // 如果有当前位置，立即将地图移动到当前位置
      if (currentLocation && mapRef.current) {
        console.log('开始追踪，移动地图到当前位置:', currentLocation);
        mapRef.current.animateToRegion({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.001, // 显著减小这个值来放大地图
          longitudeDelta: 0.001
        }, 1000);
      }
      
    } catch (error) {
      console.error('开始追踪时出错:', error);
      Alert.alert('错误', '开始追踪时出错：' + error.message);
    }
  };

  const handleStopTracking = async () => {
    // 停止计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsTracking(false);
    
    // 过滤掉精度不足的点
    const filteredCoordinates = routeCoordinates.filter(coord => coord.accuracy <= 50);
    
    if (filteredCoordinates.length < 2) {
      Alert.alert('提示', '有效轨迹点太少，无法保存');
      return;
    }

    // 计算实际距离和速度
    const totalDistance = calculateTotalDistance(filteredCoordinates);
    if (totalDistance < 0.001) { // 小于1米
      Alert.alert('提示', '运动距离太短，无法保存');
      return;
    }

    const activity = {
      id: Date.now().toString(),
      type: activityType,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: elapsedTime,
      distance: totalDistance,
      averageSpeed: calculateAverageSpeed(filteredCoordinates, startTime),
      coordinates: filteredCoordinates,
      maxSpeed: Math.max(...filteredCoordinates.map(c => c.speed || 0)),
      minAccuracy: Math.min(...filteredCoordinates.map(c => c.accuracy)),
      maxAccuracy: Math.max(...filteredCoordinates.map(c => c.accuracy)),
    };

    try {
      // 获取现有活动
      const existingActivitiesJson = await AsyncStorage.getItem('activities');
      const existingActivities = existingActivitiesJson ? JSON.parse(existingActivitiesJson) : [];

      // 添加新活动
      const updatedActivities = [activity, ...existingActivities];

      // 保存更新后的活动列表
      await AsyncStorage.setItem('activities', JSON.stringify(updatedActivities));
      console.log('Activity saved successfully:', activity);

      // 重置状态
      setRouteCoordinates([]);
      setStartTime(null);
      setCurrentSpeed(0);
      setCurrentDistance(0);
      setElapsedTime(0);
      
      // 导航到活动详情页
      navigation.navigate('ActivityDetail', { activity });
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('错误', '保存活动失败：' + error.message);
    }
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
              </>
            )}
            {(
              <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                速度: {currentSpeed.toFixed(1)} {currentSpeed * 3.6 < 3.6 ? 'm/s' : 'km/h'}
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
                {currentSpeed < 1 ? (currentSpeed * 3.6).toFixed(2) : (currentSpeed * 3.6).toFixed(1)}
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
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
});
