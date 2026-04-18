// frontend/src/components/common/Notification.js
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// Color tokens
const COLORS = {
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  text: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.3)',
};

/**
 * Global notification component
 * Shows a toast notification at top-right of screen
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', or 'info'
 * @param {boolean} visible - Whether to show the notification
 * @param {number} duration - Duration in ms (default: 3000)
 * @param {function} onHide - Callback when notification hides
 */
export default function Notification({ message, type = 'info', visible, duration = 3000, onHide }) {
  const animY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible && message) {
      // Slide in
      Animated.timing(animY, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Auto-hide after duration
        setTimeout(() => {
          Animated.timing(animY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            if (onHide) onHide();
          });
        }, duration);
      });
    }
  }, [visible, message]);

  if (!visible || !message) return null;

  const bgColor = COLORS[type] || COLORS.info;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: animY }], backgroundColor: bgColor }
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    right: 16,
    maxWidth: width * 0.65,
    minWidth: 200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10000,
  },
  icon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 18,
  },
});