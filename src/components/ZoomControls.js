import React from 'react';
import {
  Box,
  Button,
  ButtonText,
  VStack,
} from '@gluestack-ui/themed';
import { StyleSheet } from 'react-native';

const ZoomControls = ({
  onZoomIn,
  onZoomOut,
  onLocateCurrentPosition,
}) => {
  return (
    <Box
      position="absolute"
      right={4}
      top="50%"
      style={{ transform: [{ translateY: -50 }] }}
    >
      <VStack space={2}>
        <Button
          size="sm"
          variant="solid"
          bg="$white"
          onPress={onZoomIn}
          style={styles.zoomButton}
        >
          <ButtonText fontSize={16} color="$black" style={styles.buttonText}>+</ButtonText>
        </Button>
        <Button
          size="sm"
          variant="solid"
          bg="$white"
          onPress={onZoomOut}
          style={styles.zoomButton}
        >
          <ButtonText fontSize={16} color="$black" style={styles.buttonText}>−</ButtonText>
        </Button>
        <Button
          size="sm"
          variant="solid"
          bg="$white"
          onPress={onLocateCurrentPosition}
          style={styles.zoomButton}
        >
          <ButtonText fontSize={14} color="$black" style={styles.buttonText}>⌖</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
};

const styles = StyleSheet.create({
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontWeight: 'bold',
  },
});

export default ZoomControls;
