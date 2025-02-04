import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Alert } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import { getActivityLabel } from '../config/activityTypes';
import { formatElapsedTime, formatDistance, formatSpeed, formatDate } from '../utils/formatUtils';
import { getAllActivities, deleteAllActivities } from '../utils/storageUtils';

export default function HistoryScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadActivities();
    const unsubscribe = navigation.addListener('focus', loadActivities);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // 设置导航栏右侧按钮
    navigation.setOptions({
      headerRight: () => (
        <Button
          size="sm"
          variant="outline"
          borderColor="$red500"
          backgroundColor="transparent"
          mx="$2"
          py="$1.5"
          px="$3"
          borderRadius="$full"
          onPress={() => {
            Alert.alert(
              '删除所有记录',
              '确定要删除所有运动记录吗？此操作不可恢复。',
              [
                { text: '取消', style: 'cancel' },
                { 
                  text: '删除',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAllActivities();
                    if (success) {
                      loadActivities(); // 重新加载列表
                    } else {
                      Alert.alert('错误', '删除记录失败');
                    }
                  }
                }
              ]
            );
          }}
        >
          <ButtonText color="$red500" fontSize="$sm">清空记录</ButtonText>
        </Button>
      ),
    });
  }, [navigation]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedActivities = await getAllActivities();
      
      if (!Array.isArray(loadedActivities)) {
        console.error('[历史记录] 加载的活动数据无效:', loadedActivities);
        setError('加载活动数据失败');
        return;
      }

      // 数据验证和清理
      const validActivities = loadedActivities
        .filter(activity => {
          const isValid = activity && 
            typeof activity === 'object' &&
            activity.startTime && 
            !isNaN(new Date(activity.startTime).getTime());
          
          if (!isValid) {
            console.warn('[历史记录] 跳过无效活动:', activity);
          }
          return isValid;
        })
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      console.log('[历史记录] 加载活动:', {
        总数: loadedActivities.length,
        有效数: validActivities.length,
        时间范围: validActivities.length > 0 ? {
          最新: new Date(validActivities[0].startTime).toLocaleString(),
          最早: new Date(validActivities[validActivities.length - 1].startTime).toLocaleString()
        } : '无记录'
      });

      setActivities(validActivities);
    } catch (error) {
      console.error('[历史记录] 加载失败:', error);
      setError('加载活动列表失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    // 数据验证
    if (!item || typeof item !== 'object') {
      console.warn('[历史记录] 渲染跳过无效项:', item);
      return null;
    }

    return (
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
              <Text size="$sm" color="$gray500">
                {formatDate(item.startTime)}
              </Text>
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
  };

  return (
    <Box flex={1} bg="$gray50" px={4} py={2}>
      {isLoading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text size="$md">加载中...</Text>
        </Box>
      ) : error ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text size="$md" color="$red600">{error}</Text>
          <Pressable
            onPress={loadActivities}
            mt="$4"
            bg="$blue500"
            px="$4"
            py="$2"
            borderRadius="$lg"
          >
            <Text color="$white">重试</Text>
          </Pressable>
        </Box>
      ) : activities.length === 0 ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text size="$md" color="$gray600">暂无活动记录</Text>
        </Box>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderItem}
          keyExtractor={item => item?.id || Date.now().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    padding: 16,
  }
});
