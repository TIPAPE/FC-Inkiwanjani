// frontend/src/components/common/Footer.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const COLORS = {
  black: '#000000',
  gold: '#FFD700',
  border: '#222222',
  textMuted: '#888888',
  textDim: '#4A4A4A',
};

export default function Footer({ navigation }) {
  return (
    <View style={styles.footer}>
      <View style={styles.footerContent}>
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>FC Inkiwanjani</Text>
          <Text style={styles.footerText}>The Pride of Mile 46</Text>
          <Text style={styles.footerText}>The Wolves</Text>
        </View>
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>Quick Links</Text>
          <TouchableOpacity onPress={() => navigation?.navigate?.('Fixtures')}>
            <Text style={styles.footerLink}>Fixtures</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate?.('Tickets')}>
            <Text style={styles.footerLink}>Buy Tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate?.('Players')}>
            <Text style={styles.footerLink}>Squad</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate?.('About')}>
            <Text style={styles.footerLink}>About Us</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>Contact</Text>
          <Text style={styles.footerText}>Mile 46, Kajiado County</Text>
          <Text style={styles.footerText}>info@fcinkiwanjani.com</Text>
          <Text style={styles.footerText}>+254 748 234 887</Text>
        </View>
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>Follow Us</Text>
          <Text style={styles.footerText}>Facebook</Text>
          <Text style={styles.footerText}>Instagram</Text>
          <Text style={styles.footerText}>Twitter / X</Text>
          <Text style={styles.footerText}>YouTube</Text>
        </View>
      </View>
      <View style={styles.footerBottom}>
        <Text style={styles.footerBottomText}>2026 FC Inkiwanjani. All rights reserved.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: COLORS.black,
    padding: 28,
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.gold,
  },
  footerContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  footerSection: { minWidth: 160, marginBottom: 20 },
  footerHeading: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  footerText: { color: COLORS.textMuted, marginBottom: 5, fontSize: 12 },
  footerLink: { color: COLORS.textMuted, marginBottom: 5, fontSize: 12 },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 18,
    marginTop: 18,
    alignItems: 'center',
  },
  footerBottomText: { color: COLORS.textDim, fontSize: 11 },
});