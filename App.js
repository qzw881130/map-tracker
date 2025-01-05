import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './src/config/gluestack-ui.config';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <AppNavigator />
    </GluestackUIProvider>
  );
}
