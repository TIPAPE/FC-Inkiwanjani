import React from 'react';
import { Modal as RNModal, View, StyleSheet } from 'react-native';

const Modal = ({ visible, onRequestClose, children }) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>{children}</View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
});

export default Modal;