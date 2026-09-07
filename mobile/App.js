import 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';
import SetNewPasswordScreen from './screens/SetNewPasswordScreen';
import RefereeChatScreen from './screens/RefereeChatScreen';
import AdminHomeScreen from './screens/admin/AdminHomeScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bgBottom,
    card: colors.cardSolid,
    border: colors.borderSoft,
    primary: colors.green,
    text: colors.text,
  },
};

// Bottom-tab shell shown once the user is authenticated. "AI Referee" is
// always available; "Admin" only mounts for admins — this is the one place
// the two capabilities the app was scoped to (AI Referee + Admin) come
// together, gated by AuthContext.isAdmin exactly like src/App.jsx's
// activePage === "admin" gate on the web.
function AppTabs({ isAdmin }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.cardSolid, borderTopColor: colors.borderSoft },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tab.Screen
        name="Referee"
        component={RefereeChatScreen}
        options={{ title: 'AI Referee', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚽</Text> }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminHomeScreen}
          options={{ title: 'Admin', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🛡️</Text> }}
        />
      )}
    </Tab.Navigator>
  );
}

function Root() {
  const { session, isAdmin, loading, pendingRecovery } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (pendingRecovery) return <SetNewPasswordScreen />;
  if (!session) return <AuthScreen />;
  return <AppTabs isAdmin={isAdmin} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgBottom },
});
