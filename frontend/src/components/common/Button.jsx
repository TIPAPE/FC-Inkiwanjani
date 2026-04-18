import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../../constants/theme';

const Button = ({ title, onPress, variant = 'solid' }) => {
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        isGhost ? styles.ghostButton : styles.solidButton
      ]}
    >
      <Text style={[styles.text, isGhost && styles.ghostText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  solidButton: {
    backgroundColor: theme.colors.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  ghostText: {
    color: theme.colors.primary,
  },
});

export default Button;