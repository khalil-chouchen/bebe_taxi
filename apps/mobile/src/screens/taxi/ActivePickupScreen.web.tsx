import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaxiStackParamList } from '../../types';
import WebMapNotice from '../../components/WebMapNotice';

type Props = NativeStackScreenProps<TaxiStackParamList, 'ActivePickup'>;

export default function ActivePickupScreen({ navigation }: Props) {
  return <WebMapNotice onBack={navigation.canGoBack() ? navigation.goBack : undefined} />;
}
