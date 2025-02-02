import { Platform } from 'react-native';
import { AMAP_IOS_KEY, AMAP_ANDROID_KEY } from '@env';

export const getAmapKey = () => {
  return Platform.select({
    ios: AMAP_IOS_KEY,
    android: AMAP_ANDROID_KEY,
  });
};
