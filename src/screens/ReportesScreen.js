import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ReportesScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.warn('Error cargando stats:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarStats();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    cargarStats();
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
    >
      {/* Perfil del usuario */}
      <View style={styles.perfilCard}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 28 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombreUsuario}>{user?.nombre || 'Administrador'}</Text>
          <Text style={styles.emailUsuario}>{user?.email || 'admin@alquila.com'}</Text>
          <View style={styles.badgeRol}>
            <Text style={styles.badgeRolTexto}>{user?.rol?.toUpperCase() || 'ADMIN'}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.tituloSeccion}>📊 Métricas Generales del Negocio</Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#4a6cf7" style={{ marginVertical: 30 }} />
      ) : (
        <View style={styles.gridStats}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statValor}>{stats?.total_reservas || 0}</Text>
            <Text style={styles.statLabel}>Total Reservas</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={[styles.statValor, { color: '#059669' }]}>
              ${parseFloat(stats?.ingresos_total || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Ingresos Totales</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={[styles.statValor, { color: '#d97706' }]}>
              {stats?.reservas_pendientes || 0}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🪑</Text>
            <Text style={styles.statValor}>{stats?.total_muebles || 0}</Text>
            <Text style={styles.statLabel}>Muebles en Catálogo</Text>
          </View>
        </View>
      )}

      {/* Botón de cerrar sesión */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
        <Text style={styles.btnLogoutTexto}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scroll: {
    padding: 14,
    paddingBottom: 40,
  },
  perfilCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nombreUsuario: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  emailUsuario: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgeRol: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeRolTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  tituloSeccion: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  gridStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  statValor: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  btnLogout: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  btnLogoutTexto: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
});
