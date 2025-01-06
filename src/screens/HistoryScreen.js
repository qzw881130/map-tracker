import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
} from '@gluestack-ui/themed';
import { ACTIVITY_TYPES, getActivityLabel } from '../config/activityTypes';

export default function HistoryScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // 添加焦点监听器，每次进入页面时重新加载数据
    const unsubscribe = navigation.addListener('focus', () => {
      loadActivities();
    });

    return unsubscribe;
  }, [navigation]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem('activities');
      if (jsonValue != null) {
        const loadedActivities = JSON.parse(jsonValue);
        // 按时间倒序排序
        loadedActivities.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        setActivities(loadedActivities);
      }
    } catch (e) {
      console.error('Error loading activities:', e);
    } finally {
      setIsLoading(false);
    }
  };

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
      return `${hours}小时${minutes}分`;
    }
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
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
                {(item.distance / 1000).toFixed(2)}
              </Text>
              <Text size="$sm" color="$gray500">公里</Text>
            </VStack>
            <VStack alignItems="center" space="$1">
              <Text size="$lg" bold color="$gray800">
                {formatDuration(item.duration)}
              </Text>
              <Text size="$sm" color="$gray500">时长</Text>
            </VStack>
            <VStack alignItems="center" space="$1">
              <Text size="$lg" bold color="$gray800">
                {item.averageSpeed.toFixed(1)}
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
