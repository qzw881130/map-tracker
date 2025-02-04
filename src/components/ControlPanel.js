import React from 'react';
import {
  Box,
  Text as GText,
  Button,
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectItem,
  HStack,
} from '@gluestack-ui/themed';

const ControlPanel = ({
  activityType,
  setActivityType,
  isTracking,
  onStartTracking,
  onStopTracking,
  activityTypes
}) => {
  return (
    <Box
      position="absolute"
      bottom={20}
      left={5}
      right={5}
      bg="$white"
      borderTopRadius="$2xl"
      shadow="2"
      p={5}
    >
      <HStack space={8} alignItems="center" justifyContent="space-between">
        <Box flex={1}>
          <Select
            selectedValue={activityType}
            onValueChange={setActivityType}
            flex={1}
            isDisabled={isTracking}
          >
            <SelectTrigger variant="outline" size="md">
              <SelectInput placeholder="选择运动类型" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicator />
                {activityTypes.map((type) => (
                  <SelectItem
                    key={type.value}
                    label={type.label}
                    value={type.value}
                  />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>
        </Box>

        <Button
          size="md"
          variant="solid"
          bgColor={isTracking ? "$red500" : "$green500"}
          onPress={isTracking ? onStopTracking : onStartTracking}
          style={{
            minWidth: 90,
            height: 36,
            marginLeft: 16,
          }}
        >
          <GText color="$white" bold>{isTracking ? '结束' : '开始'}</GText>
        </Button>
      </HStack>
    </Box>
  );
};

export default ControlPanel;
