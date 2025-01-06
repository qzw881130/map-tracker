import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Platform, Alert, Linking } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
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

  useEffect(() => {
    let locationSubscription = null;
    
    const startLocationUpdates = async () => {
      try {
        // 请求前台位置权限
        const foregroundStatus = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus.status !== 'granted') {
          setErrorMsg('需要位置权限来记录运动轨迹');
          return;
        }

        // 获取当前位置
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 1000, // 最多使用1秒前的缓存
        });

        // 检查位置精度
        if (currentLocation.coords.accuracy > 10) {
          console.log('等待更高精度的位置信息...');
          // 尝试再次获取更精确的位置
          const preciseLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
            maximumAge: 0, // 不使用缓存
          });
          
          if (preciseLocation.coords.accuracy <= 10) {
            currentLocation = preciseLocation;
          }
        }

        // 立即更新当前位置
        setCurrentLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          timestamp: new Date().getTime()
        });

        setLocation(currentLocation);
        setRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.002, // 缩小显示范围，提供更详细的视图
          longitudeDelta: 0.002,
        });

        // 请求后台位置权限
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status !== 'granted') {
          console.log('后台位置权限未授予，应用在后台时可能无法正常工作');
          // 显示提示给用户
          Alert.alert(
            '提示',
            '未获得后台位置权限，这将导致应用在后台时无法记录运动轨迹。建议在系统设置中开启后台定位权限。',
            [
              { text: '稍后再说', style: 'cancel' },
              { 
                text: '去设置', 
                onPress: () => {
                  Linking.openSettings();
                }
              }
            ]
          );
        }

        // 配置位置追踪选项
        const locationOptions = {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5, // 每5米更新一次
          timeInterval: 1000, // 每秒更新一次
          mayShowUserSettingsDialog: true, // 允许显示系统设置对话框
          activityType: Location.ActivityType.Fitness,
          foregroundService: {
            notificationTitle: "运动轨迹记录中",
            notificationBody: "正在记录您的运动轨迹",
          },
        };

        // 开启位置监听
        locationSubscription = await Location.watchPositionAsync(
          locationOptions,
          (newLocation) => {
            // 检查位置精度
            const accuracy = newLocation.coords.accuracy;
            if (accuracy > 10) { // 降低精度阈值到10米
              console.log('位置精度过低:', accuracy);
              return;
            }

            const { latitude, longitude, speed } = newLocation.coords;
            
            // 如果正在追踪，添加新的坐标点
            if (isTracking) {
              const newCoordinate = {
                latitude,
                longitude,
                timestamp: new Date().getTime(),
                accuracy,
                speed: speed || 0,
              };

              setRouteCoordinates(prev => {
                // 检查与上一个点的距离和时间
                if (prev.length > 0) {
                  const lastPoint = prev[prev.length - 1];
                  const distance = calculateDistance(
                    lastPoint.latitude,
                    lastPoint.longitude,
                    latitude,
                    longitude
                  );
                  const timeDiff = (newCoordinate.timestamp - lastPoint.timestamp) / 1000;
                  
                  // 使用更严格的过滤条件
                  if (distance < 2 || // 小于2米不记录
                      distance > 50 || // 如果突然移动超过50米，可能是漂移
                      (timeDiff < 1 && distance < 5)) { // 1秒内移动小于5米
                    console.log('过滤掉可能的漂移点:', {distance, timeDiff});
                    return prev;
                  }
                }
                return [...prev, newCoordinate];
              });

              // 更新当前速度
              if (speed !== null && speed !== undefined) {
                // 使用设备提供的速度（转换为km/h）并应用平滑
                setCurrentSpeed(prev => {
                  const newSpeed = speed * 3.6;
                  // 如果速度变化太大，可能是异常值
                  if (Math.abs(newSpeed - prev) > 10) {
                    return prev;
                  }
                  // 使用加权移动平均来平滑速度
                  return prev * 0.7 + newSpeed * 0.3;
                });
              }
            }

            // 更新地图视图以跟随用户
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
              }, 1000);
            }
          }
        );
      } catch (error) {
        console.error('位置更新错误:', error);
        setErrorMsg('无法获取位置信息: ' + error.message);
      }
    };

    startLocationUpdates();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    // 当地图引用可用时，移动到指定位置
    // if (mapRef.current) {
    //   mapRef.current.animateToRegion(INITIAL_REGION, 1000);
    // }
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      console.log(`location.coords===`, location.coords);
      setLocation(location);
      
      // 设置初始地图区域为当前位置
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    })();
  }, []);

  const handleStartTracking = () => {
    if (!activityType) {
      alert('请选择运动类型');
      return;
    }
    setIsTracking(true);
    setStartTime(new Date());
    setRouteCoordinates([]);
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
    const totalDistance = calculateTotalDistance(coordinates);
    const duration = (new Date() - startTime) / 3600000;
    return totalDistance / duration;
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
    try {
      let location = await Location.getCurrentPositionAsync({});
      if (location && mapRef.current) {
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        };
        mapRef.current.animateToRegion(newRegion, 300);
        setRegion(newRegion);
      }
    } catch (error) {
      console.log('Error getting current location:', error);
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
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false}
        followsUserLocation={false}
        onUserLocationChange={handleLocationChange}
        mapType="standard"
      >
        {/* 显示运动轨迹 */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        )}

        {/* 显示当前位置 */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerOuter}>
                <View style={styles.markerInner} />
              </View>
              <View style={styles.markerPulse} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* 坐标显示浮层 */}
      {currentLocation && (
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
              纬度: {currentLocation.latitude.toFixed(6)}
            </GText>
            <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
              经度: {currentLocation.longitude.toFixed(6)}
            </GText>
            {currentSpeed > 0 && (
              <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                速度: {currentSpeed.toFixed(1)} km/h
              </GText>
            )}
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
