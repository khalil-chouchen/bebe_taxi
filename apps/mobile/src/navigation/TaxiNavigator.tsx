import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaxiStackParamList } from '../types';

import TaxiHomeMapScreen from '../screens/taxi/TaxiHomeMapScreen';
import ActivePickupScreen from '../screens/taxi/ActivePickupScreen';
import TaxiProfileScreen from '../screens/taxi/TaxiProfileScreen';

const Stack = createNativeStackNavigator<TaxiStackParamList>();

export default function TaxiNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TaxiHomeMap" component={TaxiHomeMapScreen} />
      <Stack.Screen name="ActivePickup" component={ActivePickupScreen} />
      <Stack.Screen name="TaxiProfile" component={TaxiProfileScreen} />
    </Stack.Navigator>
  );
}
