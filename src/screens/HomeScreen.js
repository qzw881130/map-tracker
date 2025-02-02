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

  useEffect(() => {
    (async () => {
      try {
        // 初始化高德地图
        await init({
          ios: "921d5466c750d870d6bd6bfa9c38b968",
          android: "4ce30c5ae67e32aae75ab759e4d6c419"
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
          await Geolocation.setDistanceFilter(10);  // 增加到10米
          await Geolocation.setGpsFirstTimeout(3000);
          await Geolocation.setInterval(2000);
          await Geolocation.setDesiredAccuracy('HightAccuracy');
        }

        // 开始监听位置更新
        watchId = Geolocation.watchPosition(
          location => {
            const coords = location.coords || location;
            // 提高精度要求到20米
            if (!coords.accuracy || coords.accuracy > 20) {
              console.log('位置精度不足，忽略此次更新:', coords.accuracy);
              return;
            }

            console.log('位置更新:', coords, '追踪状态:', isTracking, '允许地图更新:', allowMapUpdate);
            
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
              };
            
              // 只在速度大于0.5米/秒时更新速度显示
              const currentSpeed = coords.speed || 0;
              if (currentSpeed > 0.5) {
                setCurrentSpeed(currentSpeed * 3.6);
              } else {
                setCurrentSpeed(0);
              }

              // 检查与上一个点的距离
              setRouteCoordinates(prevCoords => {
                if (prevCoords.length === 0) return [newCoords];
                
                const lastCoord = prevCoords[prevCoords.length - 1];
                const distance = calculateDistance(
                  lastCoord.latitude,
                  lastCoord.longitude,
                  newCoords.latitude,
                  newCoords.longitude
                );

                // 增加距离和时间阈值
                const timeDiff = (newCoords.timestamp - lastCoord.timestamp) / 1000; // 转换为秒
                const speed = distance / timeDiff * 3.6; // 转换为km/h

                // 如果距离小于10米或速度小于1km/h，不记录新点
                if (distance < 0.01 || speed < 1) {
                  console.log('位置变化太小或速度太慢，忽略此次更新', {distance, speed});
                  return prevCoords;
                }

                // 更新地图区域以跟随用户
                if (mapRef.current && allowMapUpdate) {
                  console.log('更新地图区域 (自动)');
                  mapRef.current.animateToRegion({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: region.latitudeDelta,
                    longitudeDelta: region.longitudeDelta,
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
            distanceFilter: 10,
            interval: 2000,
            timeout: 15000,
          }
        );
      } catch (error) {
        console.error('位置服务错误:', error);
        setErrorMsg('获取位置信息时出错：' + error.message);
      }
    };

    startLocationUpdates();

    return () => {
      console.log('清理位置更新');
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking]);

  const handleStartTracking = async () => {
    try {
      if (!activityType) {
        alert('请选择运动类型');
        return;
      }

      // 重置路径坐标
      setRouteCoordinates([]);
      // 重置开始时间
      setStartTime(new Date());
      // 开启追踪模式
      setIsTracking(true);
      // 允许地图自动更新
      setAllowMapUpdate(true);
      
      // 如果有当前位置，立即将地图移动到当前位置
      if (currentLocation && mapRef.current) {
        console.log('开始追踪，移动地图到当前位置:', currentLocation);
        mapRef.current.animateToRegion({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        }, 1000);
      }
      
    } catch (error) {
      console.error('开始追踪时出错:', error);
      setErrorMsg('开始追踪时出错：' + error.message);
    }
  };

  const handleStopTracking = async () => {
    setIsTracking(false);
    const activity = await handleSaveActivity();
    if (activity) {
      navigation.navigate('ActivityDetail', { activity });
    }
  };

  const handleSaveActivity = async () => {
    if (routeCoordinates.length < 2) {
      console.log('No valid activity to save');
      // return;
    }

    const activity = {
      id: Date.now().toString(),
      type: activityType,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.round((new Date() - startTime) / 1000),
      distance: calculateTotalDistance(routeCoordinates),
      averageSpeed: calculateAverageSpeed(routeCoordinates, startTime),
      coordinates: routeCoordinates,
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
      
      return activity; // 返回保存的活动数据
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const calculateTotalDistance = (coordinates) => {
    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
      total += calculateDistance(
        coordinates[i-1].latitude,
        coordinates[i-1].longitude,
        coordinates[i].latitude,
        coordinates[i].longitude
      );
    }
    return total; // 返回公里数
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // 地球半径（公里）
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const calculateAverageSpeed = (coordinates, startTime) => {
    if (coordinates.length < 2) return 0;
    
    const distance = calculateTotalDistance(coordinates); // 公里
    const duration = (new Date() - startTime) / 1000 / 3600; // 小时
    
    // 如果距离太小或时间太短，返回0
    if (distance < 0.01 || duration < 0.001) return 0;
    
    return distance / duration; // km/h
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

  const handleLocationChange = (event) => {
    console.log('handleLocationChange event:', event.nativeEvent);
    
    if (event.nativeEvent.coordinate) {
      const { latitude, longitude, heading } = event.nativeEvent.coordinate;
      console.log('New coordinates:', { latitude, longitude, heading });
      
      // 更新当前位置
      setCurrentLocation({
        latitude,
        longitude,
        heading: heading || 0,
        timestamp: new Date().getTime()
      });
      
      // 如果正在追踪，添加到路径中
      if (isTracking) {
        const newCoordinate = {
          latitude,
          longitude,
          timestamp: new Date().getTime(),
          heading: heading || 0
        };
        setRouteCoordinates(prev => [...prev, newCoordinate]);

        // 更新当前速度
        if (routeCoordinates.length > 0) {
          const lastCoord = routeCoordinates[routeCoordinates.length - 1];
          const distance = calculateDistance(
            lastCoord.latitude,
            lastCoord.longitude,
            latitude,
            longitude
          );
          const timeDiff = (newCoordinate.timestamp - lastCoord.timestamp) / 1000;
          if (timeDiff > 0) {
            const speed = (distance / timeDiff) * 3.6;
            setCurrentSpeed(speed);
          }
        }

        // 更新地图区域以跟随用户
        if (mapRef.current) {
          setRegion({
            latitude,
            longitude,
            latitudeDelta: region.latitudeDelta,
            longitudeDelta: region.longitudeDelta,
          });
        }
      }
    } else {
      console.log('No coordinate in event:', event.nativeEvent);
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
            {currentSpeed > 0 && (
              <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                速度: {currentSpeed.toFixed(1)} km/h
              </GText>
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
              <GText style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{currentSpeed.toFixed(1)}</GText>
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
