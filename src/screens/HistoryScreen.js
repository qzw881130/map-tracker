import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
} from '@gluestack-ui/themed';
import { getActivityLabel } from '../config/activityTypes';
import { formatElapsedTime, formatDistance, formatSpeed, formatDate } from '../utils/formatUtils';
import { getAllActivities } from '../utils/storageUtils';

export default function HistoryScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    const unsubscribe = navigation.addListener('focus', loadActivities);
    return unsubscribe;
  }, [navigation]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const loadedActivities = await getAllActivities();
      // 按时间倒序排序
      loadedActivities.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      setActivities(loadedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
      mb="$3"
    >
      <Box
        bg="$white"
        p="$4"
        borderRadius="$xl"
        shadowColor="$gray400"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.25}
        shadowRadius={3.84}
        elevation={5}
      >
        <VStack space="$2">
          <HStack justifyContent="space-between" alignItems="center">
            <Box
              bg="$blue100"
              px="$3"
              py="$1"
              borderRadius="$lg"
            >
              <Text size="$md" bold color="$blue600">
                {getActivityLabel(item.type)}
              </Text>
            </Box>
            <Text size="$sm" color="$gray500">{formatDate(item.startTime)}</Text>
          </HStack>

          <HStack justifyContent="space-between" mt="$2">
            <VStack alignItems="center" space="$1">
              <Text size="$lg" bold color="$gray800">
                {formatDistance(item.distance)}
              </Text>
              <Text size="$sm" color="$gray500">距离</Text>
            </VStack>
            <VStack alignItems="center" space="$1">
              <Text size="$lg" bold color="$gray800">
                {formatElapsedTime(item.duration)}
              </Text>
              <Text size="$sm" color="$gray500">时长</Text>
            </VStack>
            <VStack alignItems="center" space="$1">
              <Text size="$lg" bold color="$gray800">
                {formatSpeed(item.averageSpeed, true).split(' ')[0]}
              </Text>
              <Text size="$sm" color="$gray500">平均速度</Text>
            </VStack>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="$gray50" px={4} py={2}>
      {isLoading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text size="$md">加载中...</Text>
        </Box>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderItem}
          keyExtractor={(item) => item.startTime.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <Box flex={1} justifyContent="center" alignItems="center" py={10}>
              <Text size="$md" color="$gray500">暂无运动记录</Text>
            </Box>
          )}
        />
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
});
