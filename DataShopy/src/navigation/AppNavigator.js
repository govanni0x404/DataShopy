import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OwnerLoginScreen from '../screens/auth/OwnerLoginScreen';

// Cliente
import HomeScreen from '../screens/client/HomeScreen';
import StoreDetailScreen from '../screens/client/StoreDetailScreen';
import NotificationsScreen from '../screens/client/NotificationsScreen';
import ProfileScreen from '../screens/client/ProfileScreen';

// Dueño
import OwnerDashScreen from '../screens/owner/OwnerDashScreen';
import ManagePromosScreen from '../screens/owner/ManagePromosScreen';
import EditStoreScreen from '../screens/owner/EditStoreScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Pestañas del cliente ─────────────────────────────────────────────────────
function ClientTabs({ route }) {
  const user = route.params?.user;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} options={{ tabBarLabel: 'Inicio' }} initialParams={{ user }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: 'Alertas' }} />
      <Tab.Screen name="Profile" options={{ tabBarLabel: 'Perfil' }}>
        {(props) => <ProfileScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Stack dentro del tab Home (para navegar al detalle sin perder tabs)
const HomeStack = createStackNavigator();
function HomeStackScreen({ route }) {
  const user = route.params?.user;
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} initialParams={{ user }} />
      <HomeStack.Screen name="StoreDetail" component={StoreDetailScreen} />
    </HomeStack.Navigator>
  );
}

// ─── Stack del dueño ──────────────────────────────────────────────────────────
const OwnerStack = createStackNavigator();
function OwnerStackScreen({ route }) {
  const owner = route.params?.owner;
  return (
    <OwnerStack.Navigator screenOptions={{ headerShown: false }}>
      <OwnerStack.Screen name="OwnerDash" component={OwnerDashScreen} initialParams={{ owner }} />
      <OwnerStack.Screen name="ManagePromos" component={ManagePromosScreen} />
      <OwnerStack.Screen name="EditStore" component={EditStoreScreen} />
    </OwnerStack.Navigator>
  );
}

// ─── Navegador raíz ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OwnerLogin" component={OwnerLoginScreen} />
        {/* Cliente (con tabs) */}
        <Stack.Screen name="ClientApp" component={ClientTabs} />
        {/* Dueño */}
        <Stack.Screen name="OwnerApp" component={OwnerStackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}