import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, borderRadius } from '@/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'search' : 'search-outline'}
                size={21}
                color={focused ? colors.primary : String(color || colors.textTertiary)}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: 'Publish',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, styles.publishContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'add-circle' : 'add-circle-outline'}
                size={23}
                color={focused ? colors.primary : '#0284C7'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'Your Rides',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MaterialCommunityIcons
                name={focused ? 'ticket' : 'ticket-outline'}
                size={21}
                color={focused ? colors.primary : String(color || colors.textTertiary)}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={22}
                color={focused ? colors.primary : String(color || colors.textTertiary)}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    width: 36,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  iconContainerActive: {
    backgroundColor: colors.accent,
  },
  publishContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.lg,
  },
});
