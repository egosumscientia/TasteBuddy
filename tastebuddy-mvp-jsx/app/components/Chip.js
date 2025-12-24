import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/styles';

export const Chip = ({ label, style }) => (
  <View style={[styles.chip, style]}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);
