import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
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

const ACTIVITY_TYPES = [
  { label: '遛狗', value: 'walking_dog' },
  { label: '骑车', value: 'cycling' },
  { label: '跑步', value: 'running' },
  { label: '爬山', value: 'hiking' },
  { label: '滑冰', value: 'skating' },
  { label: '其他', value: 'others' },
];

const INITIAL_REGION = {
  latitude: 40.451916,  // 怀来县龙道萄泊园小区的大致坐标
  longitude: 115.517180,
  latitudeDelta: 0.01,  // 缩放级别，数值越小越详细
  longitudeDelta: 0.01,
};

// 模拟运动的路径点（更密集的点以形成平滑的轨迹）
const SIMULATION_POINTS = [
  { latitude: 40.451916, longitude: 115.517180 }, // 起点
  { latitude: 40.452100, longitude: 115.517300 },
  { latitude: 40.452300, longitude: 115.517500 },
  { latitude: 40.452500, longitude: 115.517800 },
  { latitude: 40.452700, longitude: 115.518000 },
  { latitude: 40.452900, longitude: 115.518200 },
  { latitude: 40.453000, longitude: 115.518500 },
  { latitude: 40.453200, longitude: 115.518700 },
  { latitude: 40.453300, longitude: 115.518900 },
  { latitude: 40.453500, longitude: 115.519200 },
  { latitude: 40.453700, longitude: 115.519400 },
  { latitude: 40.453800, longitude: 115.519600 },
  { latitude: 40.454000, longitude: 115.520000 }, // 终点
];

const MOCK_HISTORY_DATA = [
  {
    id: '1',
    type: 'hiking',
    startTime: '2025-01-05T07:30:00Z',
    endTime: '2025-01-05T08:45:00Z',
    distance: 5.2,
    duration: 4500,
    averageSpeed: 4.16,
    coordinates: [
      { latitude: 40.417832, longitude: 115.498945 },
      { latitude: 40.451916, longitude: 115.517180 },
      { latitude: 40.452300, longitude: 115.517500 },
    ]
  },
  {
    id: '2',
    type: 'running',
    startTime: '2025-01-04T14:20:00Z',
    endTime: '2025-01-04T15:10:00Z',
    distance: 8.4,
    duration: 3000,
    averageSpeed: 10.08,
    coordinates: [
      { latitude: 40.417832, longitude: 115.498945 },
      { latitude: 40.451916, longitude: 115.517180 },
      { latitude: 40.452300, longitude: 115.517500 },
    ]
  },
  {
    id: '3',
    type: 'cycling',
    startTime: '2025-01-03T09:00:00Z',
    endTime: '2025-01-03T10:30:00Z',
    distance: 25.6,
    duration: 5400,
    averageSpeed: 17.07,
    coordinates: [
      { latitude: 40.417832, longitude: 115.498945 },
      { latitude: 40.451916, longitude: 115.517180 },
      { latitude: 40.452300, longitude: 115.517500 },
    ]
  }
];

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
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [region, setRegion] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);

  useEffect(() => {
    let locationSubscription = null;
    
    const startLocationUpdates = async () => {
      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 1, // 每移动1米更新一次
            timeInterval: 1000, // 每秒更新一次
          },
          (newLocation) => {
            const { latitude, longitude } = newLocation.coords;
            setRouteCoordinates(prev => [...prev, { latitude, longitude }]);
            
            // 计算实时速度（使用最后两个点）
            if (routeCoordinates.length > 0) {
              const lastPoint = routeCoordinates[routeCoordinates.length - 1];
              const speed = calculateDistance(
                lastPoint.latitude,
                lastPoint.longitude,
                latitude,
                longitude
              ) * 3600; // 转换为 km/h
              setCurrentSpeed(speed);
            }
          }
        );
      } catch (error) {
        console.error('Error starting location updates:', error);
      }
    };

    if (isTracking && !isSimulating) {
      startLocationUpdates();
    }

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
    let simulationInterval;
    if (isTracking && isSimulating) {
      simulationInterval = setInterval(() => {
        if (simulationIndex < SIMULATION_POINTS.length - 1) {
          const currentPoint = SIMULATION_POINTS[simulationIndex];
          const nextPoint = SIMULATION_POINTS[simulationIndex + 1];
          
          // 计算模拟速度（km/h）
          const distance = calculateDistance(
            currentPoint.latitude,
            currentPoint.longitude,
            nextPoint.latitude,
            nextPoint.longitude
          );
          const speed = distance * 3.6; // 转换为 km/h
          
          setCurrentSpeed(speed);
          setRouteCoordinates(prev => [...prev, currentPoint]);
          setSimulationIndex(prev => prev + 1);
          
          // 计算总距离
          const totalDistance = calculateTotalDistance([...routeCoordinates, currentPoint]);
          
          // 输出日志信息
          console.log(`
====== 运动状态更新 ======
时间: ${new Date().toLocaleTimeString()}
当前位置: 
  - 纬度: ${currentPoint.latitude.toFixed(6)}
  - 经度: ${currentPoint.longitude.toFixed(6)}
距离起点: ${totalDistance.toFixed(2)} 公里
当前速度: ${speed.toFixed(1)} km/h
======================
          `);
          
          // 更新地图视角
          // mapRef.current?.animateToRegion({
          //   latitude: currentPoint.latitude,
          //   longitude: currentPoint.longitude,
          //   latitudeDelta: 0.005,
          //   longitudeDelta: 0.005,
          // }, 1000);
        } else {
          // 模拟结束，输出总结信息
          const finalDistance = calculateTotalDistance(routeCoordinates);
          console.log(`
====== 运动结束 ======
总距离: ${finalDistance.toFixed(2)} 公里
平均速度: ${(finalDistance / (routeCoordinates.length * 2 / 3600)).toFixed(1)} km/h
====================
          `);
          clearInterval(simulationInterval);
          handleStopTracking();
        }
      }, 2000); // 每2秒更新一次
    }
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, [isTracking, isSimulating, simulationIndex, routeCoordinates]);

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
    setSimulationIndex(0);
    setIsSimulating(true); // 开启模拟模式
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
      return;
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
    if (isTracking && event.nativeEvent.coordinate) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      const newCoordinate = {
        latitude,
        longitude,
        timestamp: new Date().getTime()
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
        const timeDiff = (newCoordinate.timestamp - lastCoord.timestamp) / 1000; // 转换为秒
        if (timeDiff > 0) {
          const speed = (distance / timeDiff) * 3.6; // 转换为 km/h
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

  return (
    <Box flex={1}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        userLocationAnnotationTitle=""
        followsUserLocation={false}
        onUserLocationChange={handleLocationChange}
        mapType="standard"
      >
        {/* 显示起点和终点标记 */}
        <Marker
          coordinate={SIMULATION_POINTS[0]}
          title="起点"
          pinColor="green"
        />
        <Marker
          coordinate={SIMULATION_POINTS[SIMULATION_POINTS.length - 1]}
          title="终点"
          pinColor="red"
        />
        
        {/* 显示运动轨迹 */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        )}
      </MapView>

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
