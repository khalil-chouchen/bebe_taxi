import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClientStackParamList } from '../types';

import ClientHomeMapScreen from '../screens/client/ClientHomeMapScreen';
import TaxiOffersScreen from '../screens/client/TaxiOffersScreen';
import ActiveTripScreen from '../screens/client/ActiveTripScreen';
import ReviewScreen from '../screens/client/ReviewScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Stack = createNativeStackNavigator<ClientStackParamList>();

export default function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientHomeMap" component={ClientHomeMapScreen} />
      <Stack.Screen name="TaxiOffers" component={TaxiOffersScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="ClientProfile" component={ClientProfileScreen} />
    </Stack.Navigator>
  );
}
