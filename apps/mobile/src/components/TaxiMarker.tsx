import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { COLORS } from '../constants';

interface TaxiMarkerProps {
  latitude: number;
  longitude: number;
  taxiId: string;
  label?: string;
  onPress?: () => void;
}

export default function TaxiMarker({
  latitude,
  longitude,
  taxiId,
  label,
  onPress,
}: TaxiMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      identifier={`taxi-${taxiId}`}
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🚖</Text>
        </View>
        {label ? (
          <View style={styles.labelBox}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconBox: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  icon: {
    fontSize: 22,
  },
  labelBox: {
    backgroundColor: COLORS.dark,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  label: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 80,
  },
});
