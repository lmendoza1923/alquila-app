import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import ReservasScreen from '../screens/ReservasScreen';
import CrearReservaScreen from '../screens/CrearReservaScreen';
import ClientesScreen from '../screens/ClientesScreen';
import MobiliarioScreen from '../screens/MobiliarioScreen';
import SucursalesScreen from '../screens/SucursalesScreen';
import ReportesScreen from '../screens/ReportesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#1e293b' },
        tabBarActiveTintColor: '#4a6cf7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Reservas"
        component={ReservasScreen}
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientesScreen}
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Mobiliario"
        component={MobiliarioScreen}
        options={{
          title: 'Inventario',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🪑</Text>,
        }}
      />
      <Tab.Screen
        name="Sucursales"
        component={SucursalesScreen}
        options={{
          title: 'Sucursales',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏢</Text>,
        }}
      />
      <Tab.Screen
        name="Reportes"
        component={ReportesScreen}
        options={{
          title: 'Negocio',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#4a6cf7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!token ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CrearReserva"
              component={CrearReservaScreen}
              options={{
                title: 'Crear Nueva Reserva',
                headerBackTitle: 'Atrás',
                headerStyle: { backgroundColor: '#fff' },
                headerTitleStyle: { fontWeight: '700', color: '#1e293b' },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
