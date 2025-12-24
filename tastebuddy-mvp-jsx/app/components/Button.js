import React from 'react';
import { Pressable, Text } from 'react-native';
import { styles, theme } from '../styles/styles';

export const Button = ({ title, onPress, style }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      { backgroundColor: pressed ? theme.colors.primaryDark : theme.colors.primary },
      style,
    ]}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </Pressable>
);
