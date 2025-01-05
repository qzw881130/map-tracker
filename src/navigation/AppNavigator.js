import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, Text } from '@gluestack-ui/themed';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={({ navigation }) => ({
            title: '运动追踪',
            headerRight: () => (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('History')}
                style={{
                  minHeight: 32,
                  paddingHorizontal: 8,
                }}
              >
                <Text size="$sm" color="$white">历史</Text>
              </Button>
            ),
          })}
        />
        <Stack.Screen 
          name="History" 
          component={HistoryScreen}
          options={{ title: '运动历史' }}
        />
        <Stack.Screen 
          name="ActivityDetail" 
          component={ActivityDetailScreen}
          options={{ title: '活动详情' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
