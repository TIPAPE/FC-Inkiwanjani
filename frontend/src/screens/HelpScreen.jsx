// frontend/src/screens/HelpScreen.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../components/common/NavBar';
import { APP_NAME, CLUB_NICKNAME } from '../constants/config';

const C = {
  card: 'rgba(255,255,255,0.92)',
  accent: '#2E86C1',
  navy: '#1B4F72',
  muted: '#85929E',
  secText: '#5D6D7E',
  green: '#27AE60',
  red: '#E74C3C',
  gold: '#F39C12',
};
const BG = ['#D6EAF8', '#AED6F1', '#85C1E9'];

const FAQ_DATA = [
  {
    category: 'Tickets & Matches',
    icon: '🎫',
    items: [
      { q: 'How do I purchase tickets?', a: 'Navigate to the Tickets screen, select your desired match, choose your seat category, and complete the payment process. You\'ll receive a digital ticket via email and in the app.' },
      { q: 'Can I get a refund for my ticket?', a: 'Refunds are available up to 48 hours before match day. Contact support or visit the ticket office with your order confirmation.' },
      { q: 'What happens if a match is postponed?', a: 'If a match is postponed, your ticket remains valid for the rescheduled date. If you cannot attend the new date, a full refund will be processed automatically.' },
    ],
  },
  {
    category: 'Account & Profile',
    icon: '👤',
    items: [
      { q: 'How do I create an account?', a: 'On the login screen, tap "Sign Up" and follow the registration process. You can sign up as a regular fan or apply for an admin account if you\'re club staff.' },
      { q: 'I forgot my password. How do I reset it?', a: 'On the login screen, tap "Forgot Password?" and enter your registered email. You\'ll receive a password reset link within minutes.' },
      { q: 'How do I update my profile information?', a: 'Go to your profile settings from the navigation menu. You can update your name, email, phone number, and notification preferences.' },
    ],
  },
  {
    category: 'Fan Zone & Community',
    icon: '💬',
    items: [
      { q: 'What is the Fan Zone?', a: `The Fan Zone is ${CLUB_NICKNAME}'s online community where fans can discuss matches, share opinions, and connect with fellow supporters.` },
      { q: 'Are there community guidelines?', a: 'Yes. All fans must respect each other. No offensive language, personal attacks, or spam. Violations may result in temporary or permanent bans.' },
      { q: 'Can I report inappropriate comments?', a: 'Yes. Long-press on any comment to report it. Our moderation team will review and take appropriate action.' },
    ],
  },
  {
    category: 'App & Technical',
    icon: '📱',
    items: [
      { q: 'The app is running slow. What should I do?', a: 'Try clearing the app cache, updating to the latest version, or restarting your device. If issues persist, contact support.' },
      { q: 'How do I enable push notifications?', a: 'Go to your device settings > Notifications > find our app > enable notifications. You can customize which alerts you receive in Profile > Settings.' },
    ],
  },
];

const CONTACT_INFO = [
  { label: 'Email', value: 'support@fcinkiwanjani.com', icon: '📧', action: 'mailto:support@fcinkiwanjani.com' },
  { label: 'Phone', value: '+255 123 456 789', icon: '📞', action: 'tel:+255123456789' },
  { label: 'WhatsApp', value: '+255 123 456 789', icon: '💬', action: 'https://wa.me/255123456789' },
  { label: 'Stadium Office', value: 'Mon-Fri, 9AM-5PM', icon: '🏟️' },
];

export default function HelpScreen({ navigation, onLogout }) {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('faq');

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleContactAction = async (action) => {
    if (!action) return;
    const supported = await Linking.canOpenURL(action);
    if (supported) {
      await Linking.openURL(action);
    }
  };

  const TABS = [
    { key: 'faq', label: 'FAQs', icon: '❓' },
    { key: 'contact', label: 'Contact', icon: '📞' },
    { key: 'hours', label: 'Hours', icon: '🕒' },
  ];

  const renderTabContent = () => {
    if (activeTab === 'faq') {
      return (
        <View style={ST.faqCategory}>
          {FAQ_DATA.map((category, catIdx) => (
            <View key={catIdx} style={ST.faqSection}>
              <View style={ST.faqCategoryHeader}>
                <Text style={ST.faqCategoryIcon}>{category.icon}</Text>
                <Text style={ST.faqCategoryTitle}>{category.category}</Text>
              </View>
              {category.items.map((item, itemIdx) => {
                const globalIdx = `${catIdx}-${itemIdx}`;
                const isExpanded = expandedFaq === globalIdx;
                return (
                  <TouchableOpacity
                    key={itemIdx}
                    style={[ST.faqItem, isExpanded && ST.faqItemExpanded]}
                    onPress={() => toggleFaq(globalIdx)}
                    activeOpacity={0.7}
                  >
                    <View style={ST.faqQuestion}>
                      <Text style={ST.faqQuestionText}>{item.q}</Text>
                      <Text style={[ST.faqArrow, isExpanded && ST.faqArrowExpanded]}>▼</Text>
                    </View>
                    {isExpanded && (
                      <View style={ST.faqAnswer}>
                        <Text style={ST.faqAnswerText}>{item.a}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === 'contact') {
      return (
        <View style={ST.contactCard}>
          <Text style={ST.contactIntro}>Still need help? Reach out to our support team:</Text>
          {CONTACT_INFO.map((contact, idx) => (
            <TouchableOpacity
              key={idx}
              style={ST.contactItem}
              onPress={() => contact.action && handleContactAction(contact.action)}
              activeOpacity={contact.action ? 0.7 : 1}
            >
              <Text style={ST.contactIcon}>{contact.icon}</Text>
              <View style={ST.contactInfo}>
                <Text style={ST.contactLabel}>{contact.label}</Text>
                <Text style={ST.contactValue}>{contact.value}</Text>
              </View>
              {contact.action && <Text style={ST.contactArrow}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeTab === 'hours') {
      return (
        <View style={ST.hoursCard}>
          <View style={ST.hoursRow}>
            <Text style={ST.hoursDay}>Monday - Friday</Text>
            <Text style={ST.hoursTime}>9:00 AM - 6:00 PM</Text>
          </View>
          <View style={ST.hoursRow}>
            <Text style={ST.hoursDay}>Saturday</Text>
            <Text style={ST.hoursTime}>10:00 AM - 4:00 PM</Text>
          </View>
          <View style={ST.hoursRow}>
            <Text style={ST.hoursDay}>Sunday & Match Days</Text>
            <Text style={ST.hoursTime}>Limited Support</Text>
          </View>
          <View style={ST.hoursNote}>
            <Text style={ST.hoursNoteText}>📌 For urgent match-day issues, visit the ticket office or call our hotline.</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <LinearGradient colors={BG} style={ST.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavBar navigation={navigation} activeScreen="Help" onLogout={onLogout} />

      <ScrollView style={ST.scroll} contentContainerStyle={ST.scrollContent}>
        <View style={ST.header}>
          <Text style={ST.headerIcon}>🛟</Text>
          <Text style={ST.headerTitle}>Help Center</Text>
          <Text style={ST.headerSubtitle}>Find answers to common questions or contact our support team</Text>
        </View>

        <View style={ST.tabContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[ST.tab, activeTab === tab.key && ST.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={ST.tabIcon}>{tab.icon}</Text>
              <Text style={[ST.tabText, activeTab === tab.key && ST.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={ST.tabContent}>
          {renderTabContent()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const ST = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8 },

  header: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  headerIcon: { fontSize: 40, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: C.navy, marginBottom: 4 },
  headerSubtitle: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18 },

  tabContainer: { flexDirection: 'row', gap: 6, marginBottom: 16, backgroundColor: C.card, borderRadius: 10, padding: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'transparent' },
  tabActive: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabIcon: { fontSize: 13 },
  tabText: { fontSize: 12, fontWeight: '700', color: C.navy },
  tabTextActive: { color: C.white },

  tabContent: { minHeight: 300 },

  faqCategory: { gap: 16 },
  faqSection: { marginBottom: 8 },
  faqCategoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  faqCategoryIcon: { fontSize: 18, marginRight: 8 },
  faqCategoryTitle: { fontSize: 13, fontWeight: '700', color: C.accent },
  faqItem: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  faqItemExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  faqQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestionText: { fontSize: 13, fontWeight: '600', color: C.navy, flex: 1, paddingRight: 12 },
  faqArrow: { fontSize: 10, color: C.muted },
  faqArrowExpanded: { transform: [{ rotate: '180deg' }] },
  faqAnswer: { paddingTop: 12, borderTopWidth: 1, borderTopColor: C.navy + '10', marginTop: 12 },
  faqAnswerText: { fontSize: 13, color: C.secText, lineHeight: 20 },

  contactCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  contactIntro: { fontSize: 13, color: C.secText, marginBottom: 14, lineHeight: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.navy + '08' },
  contactIcon: { fontSize: 20, marginRight: 12 },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: C.muted, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '600', color: C.navy },
  contactArrow: { fontSize: 20, color: C.muted },

  hoursCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.navy + '08' },
  hoursDay: { fontSize: 13, color: C.secText },
  hoursTime: { fontSize: 13, fontWeight: '600', color: C.navy },
  hoursNote: { marginTop: 12, backgroundColor: C.accent + '10', padding: 10, borderRadius: 8 },
  hoursNoteText: { fontSize: 12, color: C.accent, fontWeight: '500', lineHeight: 18 },
});