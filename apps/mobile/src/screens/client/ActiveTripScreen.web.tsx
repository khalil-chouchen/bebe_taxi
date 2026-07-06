import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClientStackParamList } from '../../types';
import WebMapNotice from '../../components/WebMapNotice';

type Props = NativeStackScreenProps<ClientStackParamList, 'ActiveTrip'>;

export default function ActiveTripScreen({ navigation }: Props) {
  return <WebMapNotice onBack={navigation.canGoBack() ? navigation.goBack : undefined} />;
}
