// frontend/src/components/common/NavBar.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { APP_NAME } from '../../constants/config';

// Color palette matching AdminScreen
const COLORS = {
  accent:      '#2E86C1',
  navy:        '#1B4F72',
  muted:       '#85929E',
  red:         '#E74C3C',
  white:       '#FFFFFF',
  card:        'rgba(255,255,255,0.9)',
  cardAlt:     '#F8F9FA',
  border:      '#E8ECEF',
};

const LINKS = ['Home', 'Fixtures', 'Tickets', 'Players', 'Gallery', 'News', 'FanZone', 'Help', 'About'];

export default function NavBar({ navigation, activeScreen, isAdmin = false, onLogout }) {
  const handleLogout = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    }
  };

  return (
    <View style={styles.nav}>
      <View style={styles.navContainer}>
        <Text style={styles.logo}>{APP_NAME}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.linksContainer}
        >
          {LINKS.map((screen) => (
            <TouchableOpacity key={screen} onPress={() => navigation.navigate(screen)}>
              <Text style={[styles.link, activeScreen === screen && styles.linkActive]}>
                {screen}
              </Text>
            </TouchableOpacity>
          ))}
          {isAdmin && (
            <TouchableOpacity onPress={() => navigation.navigate('Admin')}>
              <Text style={[styles.link, activeScreen === 'Admin' && styles.linkActive]}>
                Admin
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>LOG OUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 0.5,
    marginRight: 10,
  },
  linksContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  link: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    marginHorizontal: 7,
    paddingVertical: 4,
  },
  linkActive: {
    color: COLORS.accent,
    fontWeight: '800',
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.red + '60',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.red + '10',
    marginLeft: 8,
  },
  logoutBtnText: {
    color: COLORS.red,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});