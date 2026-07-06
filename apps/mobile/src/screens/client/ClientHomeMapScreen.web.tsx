import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClientStackParamList } from '../../types';
import WebMapNotice from '../../components/WebMapNotice';

type Props = NativeStackScreenProps<ClientStackParamList, 'ClientHomeMap'>;

export default function ClientHomeMapScreen({ navigation }: Props) {
  return <WebMapNotice onBack={navigation.canGoBack() ? navigation.goBack : undefined} />;
}
