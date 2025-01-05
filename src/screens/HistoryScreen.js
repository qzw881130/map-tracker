import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
} from '@gluestack-ui/themed';

const ACTIVITY_TYPES = [
  { value: 'walking_dog', label: '遛狗' },
  { value: 'cycling', label: '骑车' },
  { value: 'running', label: '跑步' },
  { value: 'hiking', label: '爬山' },
  { value: 'skating', label: '滑冰' },
  { value: 'others', label: '其他' },
];

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
      const storedActivities = await AsyncStorage.getItem('activities');
      if (storedActivities) {
        setActivities(JSON.parse(storedActivities));
      }
    } catch (error) {
      console.error('Error loading activities:', error);
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
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('ActivityDetail', { activity: item })}
      mb={3}
    >
      <Box
        bg="$white"
        borderRadius="$xl"
        p={4}
        shadow={3}
        style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }}
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
                {ACTIVITY_TYPES.find(t => t.value === item.type)?.label || '?'}
              </Text>
            </Box>
            <Text size="$sm" color="$gray500">{formatDate(item.startTime)}</Text>
          </HStack>
          
          <HStack space={6} px={1}>
            <VStack space={1} flex={1}>
              <Text size="$sm" color="$gray500">距离</Text>
              <HStack space={1} alignItems="baseline">
                <Text size="$xl" bold color="$gray800">{item.distance.toFixed(1)}</Text>
                <Text size="$sm" color="$gray600">km</Text>
              </HStack>
            </VStack>
            
            <VStack space={1} flex={1}>
              <Text size="$sm" color="$gray500">时长</Text>
              <Text size="$lg" bold color="$gray800">{formatDuration(item.duration)}</Text>
            </VStack>
            
            <VStack space={1} flex={1}>
              <Text size="$sm" color="$gray500">配速</Text>
              <HStack space={1} alignItems="baseline">
                <Text size="$xl" bold color="$gray800">{item.averageSpeed.toFixed(1)}</Text>
                <Text size="$sm" color="$gray600">km/h</Text>
              </HStack>
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
          keyExtractor={item => item.id}
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
  },
});
