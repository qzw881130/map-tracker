# 运动追踪app 👋

记录运动（遛狗，骑车，跑步，爬山，滑冰，自驾，其他）的起止时间，路程，轨迹和速度

## Get started

1. Install dependencies

   ```bash
   npm install
   npx expo prebuild -p ios
   ```

2. Open ./ios by xcode && iphone connect mac && build 

3. Start serve

   ```bash
    npm start --device
   ```
## Technologies
* react-native-maps 实现地图展现
* react-native-amap-geolocation 使用高德地图SDK实现定位

## Troubleshooting
* expo-location 不适用于中国，定位偏差过大

## Debug
```
#clear ios cache
/Users/qianzhiwei/Library/Developer/Xcode/DerivedData
# fake track gps
node scripts/generate_gpx.js
```

## Links
- [高德地图开发者平台](https://console.amap.com/dev/key/app)
- [react-native-amap-geolocation](https://github.com/qiuxiang/react-native-amap-geolocation)
- [测试gpx](https://www.gpsvisualizer.com/map?output_home)