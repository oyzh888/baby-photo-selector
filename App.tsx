import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
// @ts-ignore
global.Buffer = Buffer;

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScanProvider } from './src/context/ScanContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ScanProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ScanProvider>
    </SafeAreaProvider>
  );
}
