import React, { useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import {
  Box,
  Text,
  VStack,
  HStack,
  ScrollView,
} from '@gluestack-ui/themed';
import { getActivityLabel } from '../config/activityTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分${remainingSeconds}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${remainingSeconds}秒`;
};

// 格式化距离显示
const formatDistance = (distanceInKm) => {
  const distanceInM = distanceInKm * 1000;
  if (distanceInM < 1000) {
    return `${distanceInM.toFixed(0)}米`;
  } else {
    return `${distanceInKm.toFixed(2)}公里`;
  }
};

// 默认地图区域（深圳）
const DEFAULT_REGION = {
  latitude: 22.5431,
  longitude: 114.0579,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function ActivityDetailScreen({ route }) {
  const { activity } = route.params;

  const getInitialRegion = () => {
    if (!activity.coordinates || activity.coordinates.length === 0) {
      return DEFAULT_REGION;
    }

    // 使用轨迹的第一个点作为地图中心
    const firstCoord = activity.coordinates[0];
    return {
      latitude: firstCoord.latitude,
      longitude: firstCoord.longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
  };

  const [initialRegion] = useState(getInitialRegion());

  const hasTrackData = activity.coordinates && activity.coordinates.length > 0;

  return (
    <ScrollView flex={1} bg="$gray50">
      <Box height={300} mb="$4">
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {hasTrackData && (
            <Polyline
              coordinates={activity.coordinates}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
          {hasTrackData && (
            <Marker
              coordinate={activity.coordinates[0]}
              title="起点"
              description={`${activity.coordinates[0].latitude.toFixed(6)}, ${activity.coordinates[0].longitude.toFixed(6)}`}
              pinColor="green"
            />
          )}
          {hasTrackData && (
            <Marker
              coordinate={activity.coordinates[activity.coordinates.length - 1]}
              title="终点"
              description={`${activity.coordinates[activity.coordinates.length - 1].latitude.toFixed(6)}, ${activity.coordinates[activity.coordinates.length - 1].longitude.toFixed(6)}`}
              pinColor="red"
            />
          )}
        </MapView>
        {!hasTrackData && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            justifyContent="center"
            alignItems="center"
            bg="rgba(255, 255, 255, 0.8)"
          >
            <Text size="$md" color="$gray600">未记录轨迹数据</Text>
          </Box>
        )}
        
        {/* 坐标信息浮层 */}
        {hasTrackData && (
          <Box
            position="absolute"
            left="$3"
            top="$3"
            bg="$backgroundLight800"
            borderRadius="$md"
            p="$3"
            opacity={0.9}
          >
            <VStack space="$2">
              <Text color="$textLight50" fontWeight="$medium" size="$xs">
                起点: {activity.coordinates[0].latitude.toFixed(6)}, {activity.coordinates[0].longitude.toFixed(6)}
              </Text>
              <Text color="$textLight50" fontWeight="$medium" size="$xs">
                终点: {activity.coordinates[activity.coordinates.length - 1].latitude.toFixed(6)}, {activity.coordinates[activity.coordinates.length - 1].longitude.toFixed(6)}
              </Text>
            </VStack>
          </Box>
        )}
      </Box>
      <Box p={4}>
        <VStack space={4}>
          <Box
            bg="$white"
            borderRadius="$xl"
            p={4}
            shadow={2}
          >
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Box
                  bg="$blue100"
                  px={3}
                  py={1}
                  borderRadius="$lg"
                >
                  <Text size="$md" bold color="$blue600">
                    {getActivityLabel(activity.type)}
                  </Text>
                </Box>
                <Text size="$sm" color="$gray500">{formatDate(activity.startTime)}</Text>
              </HStack>

              <HStack space={6}>
                <VStack space={1} flex={1}>
                  <Text size="$sm" color="$gray500">总距离</Text>
                  <HStack space={1} alignItems="baseline">
                    <Text size="$2xl" bold color="$gray800">{formatDistance(activity.distance)}</Text>
                  </HStack>
                </VStack>

                <VStack space={1} flex={1}>
                  <Text size="$sm" color="$gray500">运动时长</Text>
                  <Text size="$lg" bold color="$gray800">{formatDuration(activity.duration)}</Text>
                </VStack>

                <VStack space={1} flex={1}>
                  <Text size="$sm" color="$gray500">平均配速</Text>
                  <HStack space={1} alignItems="baseline">
                    <Text size="$2xl" bold color="$gray800">{activity.averageSpeed.toFixed(1)}</Text>
                    <Text size="$sm" color="$gray600">km/h</Text>
                  </HStack>
                </VStack>
              </HStack>
            </VStack>
          </Box>

          <Box
            bg="$white"
            borderRadius="$xl"
            p={4}
            shadow={2}
          >
            <VStack space={3}>
              <Text size="$md" bold color="$gray800">运动详情</Text>
              
              <VStack space={2}>
                <HStack justifyContent="space-between">
                  <Text size="$sm" color="$gray500">开始时间</Text>
                  <Text size="$sm" color="$gray800">{formatDate(activity.startTime)}</Text>
                </HStack>
                
                <HStack justifyContent="space-between">
                  <Text size="$sm" color="$gray500">结束时间</Text>
                  <Text size="$sm" color="$gray800">{formatDate(activity.endTime)}</Text>
                </HStack>
                
                <HStack justifyContent="space-between">
                  <Text size="$sm" color="$gray500">运动类型</Text>
                  <Text size="$sm" color="$gray800">
                    {getActivityLabel(activity.type)}
                  </Text>
                </HStack>
                {!hasTrackData && (
                  <HStack justifyContent="space-between">
                    <Text size="$sm" color="$gray500">备注</Text>
                    <Text size="$sm" color="$gray800">此活动未记录轨迹数据</Text>
                  </HStack>
                )}
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
});
