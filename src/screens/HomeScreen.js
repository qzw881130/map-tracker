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
        console.log('正在请求位置权限...');
        // 请求前台位置权限
        const foregroundStatus = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus.status !== 'granted') {
          setErrorMsg('需要位置权限来记录运动轨迹');
          return;
        }

        console.log('位置权限已获取，正在获取当前位置...');
        // 获取当前位置
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        console.log('当前位置:', currentLocation);
        
        // 设置初始地图区域
        const initialRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        console.log('设置初始地图区域:', initialRegion);
        setRegion(initialRegion);
        setCurrentLocation(currentLocation.coords);
        
        // 开始监听位置更新
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            console.log('位置更新:', location);
            if (isTracking) {
              const newCoords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setRouteCoordinates(prevCoords => [...prevCoords, newCoords]);
              setCurrentLocation(location.coords);
              setCurrentSpeed(location.coords.speed || 0);
            }
          }
        );
      } catch (error) {
        console.error('位置服务错误:', error);
        setErrorMsg('获取位置信息时出错：' + error.message);
      }
    };

    startLocationUpdates();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isTracking]);

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
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={true}
          showsCompass={true}
          showsScale={true}
          onRegionChangeComplete={(newRegion) => {
            console.log('地图区域更新:', newRegion);
            setRegion(newRegion);
          }}
          onError={(error) => {
            console.error('地图错误:', error);
            setErrorMsg('地图加载失败：' + error.nativeEvent.error);
          }}
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
              <Marker
                coordinate={routeCoordinates[routeCoordinates.length - 1]}
                title="当前位置"
                pinColor="red"
              />
            </>
          )}
        </MapView>
      )}

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
