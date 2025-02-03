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
import { formatElapsedTime, formatDistance, formatSpeed, formatDate } from '../utils/formatUtils';
import { DEFAULT_REGION, getInitialRegion, formatCoordinate } from '../utils/mapUtils';

export default function ActivityDetailScreen({ route }) {
  const { activity } = route.params;
  const [initialRegion] = useState(() => getInitialRegion(activity.coordinates));
  const hasTrackData = activity.coordinates && activity.coordinates.length > 0;

  const renderMapOverlay = () => {
    if (!hasTrackData) {
      return (
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
      );
    }

    return (
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
            起点: {formatCoordinate(activity.coordinates[0].latitude, activity.coordinates[0].longitude)}
          </Text>
          <Text color="$textLight50" fontWeight="$medium" size="$xs">
            终点: {formatCoordinate(
              activity.coordinates[activity.coordinates.length - 1].latitude,
              activity.coordinates[activity.coordinates.length - 1].longitude
            )}
          </Text>
        </VStack>
      </Box>
    );
  };

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
            <>
              <Polyline
                coordinates={activity.coordinates}
                strokeColor="#007AFF"
                strokeWidth={4}
              />
              <Marker
                coordinate={activity.coordinates[0]}
                title="起点"
                description={formatCoordinate(
                  activity.coordinates[0].latitude,
                  activity.coordinates[0].longitude
                )}
                pinColor="green"
              />
              <Marker
                coordinate={activity.coordinates[activity.coordinates.length - 1]}
                title="终点"
                description={formatCoordinate(
                  activity.coordinates[activity.coordinates.length - 1].latitude,
                  activity.coordinates[activity.coordinates.length - 1].longitude
                )}
                pinColor="red"
              />
            </>
          )}
        </MapView>
        {renderMapOverlay()}
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
                <Text size="$sm" color="$gray500">
                  {formatDate(activity.startTime)}
                </Text>
              </HStack>

              <HStack space={6}>
                <VStack space={1} flex={1}>
                  <Text size="$sm" color="$gray500">总距离</Text>
                  <HStack space={1} alignItems="baseline">
                    <Text size="$2xl" bold color="$gray800">
                      {formatDistance(activity.distance)}
                    </Text>
                  </HStack>
                </VStack>

                <VStack space={1} flex={1}>
                  <Text size="$sm" color="$gray500">运动时长</Text>
                  <Text size="$lg" bold color="$gray800">
                    {formatElapsedTime(activity.duration)}
                  </Text>
                </VStack>

                <VStack space={1} flex={1}>
                  <Text size="$sm" color="$gray500">平均配速</Text>
                  <HStack space={1} alignItems="baseline">
                    <Text size="$2xl" bold color="$gray800">
                      {formatSpeed(activity.averageSpeed, true).split(' ')[0]}
                    </Text>
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
              <Text size="$md" bold color="$gray800">详细数据</Text>
              <VStack space={2}>
                <HStack justifyContent="space-between">
                  <Text size="$sm" color="$gray500">最大速度</Text>
                  <Text size="$sm" color="$gray800">
                    {formatSpeed(activity.maxSpeed, true)}
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text size="$sm" color="$gray500">GPS精度范围</Text>
                  <Text size="$sm" color="$gray800">
                    {activity.minAccuracy.toFixed(1)}米 - {activity.maxAccuracy.toFixed(1)}米
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text size="$sm" color="$gray500">轨迹点数</Text>
                  <Text size="$sm" color="$gray800">
                    {activity.coordinates ? activity.coordinates.length : 0}
                  </Text>
                </HStack>
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
