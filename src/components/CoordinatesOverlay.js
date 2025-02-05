import React from 'react';
import {
  Box,
  Text as GText,
  VStack,
} from '@gluestack-ui/themed';
import { StyleSheet, Platform } from 'react-native';
import { formatSpeed, formatDistance, formatElapsedTime } from '../utils/formatUtils';

const CoordinatesOverlay = ({
  region,
  currentLocation,
  gpsSpeed,
  currentSpeed,
  currentDistance,
  elapsedTime,
  isTracking,
  routeCoordinates,
  realTimeCoords,
}) => {
  if (!region) return null;

  return (
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
        {/* <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
          中心点纬度: {region.latitude.toFixed(15)}
        </GText>
        <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
          中心点经度: {region.longitude.toFixed(15)}
        </GText> */}
        {currentLocation && (
          <>
            {isTracking && (
              <>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  当前纬度: {(realTimeCoords ? realTimeCoords.latitude : currentLocation.latitude).toFixed(15)}
                </GText>
                <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
                  当前经度: {(realTimeCoords ? realTimeCoords.longitude : currentLocation.longitude).toFixed(15)}
                </GText>
              </>
            )}
            <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
              GPS速度: {formatSpeed(gpsSpeed, true)}
            </GText>
            <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
              计算速度: {formatSpeed(currentSpeed, true)}
            </GText>
          </>
        )}
        <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
          里程: {formatDistance(currentDistance)}
        </GText>
        <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
          时间: {formatElapsedTime(elapsedTime)}
        </GText>
        <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
          是否追踪: {isTracking ? '是' : '否'}
        </GText>
        {isTracking && (
          <GText color="$textLight50" fontWeight="$medium" style={styles.coordText}>
            线段数: {routeCoordinates.length > 0 ? routeCoordinates.length - 1 : 0}
          </GText>
        )}
      </VStack>
    </Box>
  );
};

const styles = StyleSheet.create({
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
});

export default CoordinatesOverlay;
