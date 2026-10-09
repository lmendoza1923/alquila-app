import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../api';

const ESTADOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'activa', label: 'Activas' },
  { id: 'completada', label: 'Completadas' },
];

export default function ReservasScreen({ navigation }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todas');

  const cargarReservas = async () => {
    try {
      const res = await api.get('/reservas');
      setReservas(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron cargar las reservas');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarReservas();
    const unsubscribe = navigation.addListener('focus', () => {
      cargarReservas();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefrescando(true);
    cargarReservas();
  };

  const reservasFiltradas = reservas.filter((r) => {
    if (filtroEstado === 'todas') return true;
    return r.estado === filtroEstado;
  });

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/reservas/${id}/estado`, { estado: nuevoEstado });
      cargarReservas();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const formatearFecha = (f) => {
    if (!f) return '-';
    return String(f).substring(0, 10);
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'activa': return { bg: '#ecfdf5', text: '#059669' };
      case 'confirmada': return { bg: '#eff6ff', text: '#2563eb' };
      case 'pendiente': return { bg: '#fffbeb', text: '#d97706' };
      case 'completada': return { bg: '#f1f5f9', text: '#475569' };
      case 'cancelada': return { bg: '#fef2f2', text: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Selector de filtros */}
      <View style={styles.filtrosContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ESTADOS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const activo = filtroEstado === item.id;
            return (
              <TouchableOpacity
                style={[styles.chipFiltro, activo && styles.chipFiltroActivo]}
                onPress={() => setFiltroEstado(item.id)}
              >
                <Text style={[styles.textoChip, activo && styles.textoChipActivo]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4a6cf7" />
          <Text style={styles.textoCargando}>Cargando reservas...</Text>
        </View>
      ) : (
        <FlatList
          data={reservasFiltradas}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📋</Text>
              <Text style={styles.tituloVacio}>No hay reservas en esta categoría</Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getBadgeColor(item.estado);
            return (
              <View style={styles.tarjeta}>
                <View style={styles.tarjetaHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.clienteNombre}>
                      {item.nombre_cliente || 'Cliente sin nombre'}
                    </Text>
                    {item.alias_cliente ? (
                      <Text style={styles.aliasCliente}>🏷️ {item.alias_cliente}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeTexto, { color: badge.text }]}>
                      {item.estado?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.fechasRow}>
                  <Text style={styles.fechaTexto}>
                    📅 {formatearFecha(item.fecha_inicio)} ➔ {formatearFecha(item.fecha_fin)}
                  </Text>
                </View>

                {item.direccion_entrega ? (
                  <Text style={styles.direccionTexto} numberOfLines={1}>
                    📍 {item.direccion_entrega}
                  </Text>
                ) : null}

                <View style={styles.totalesRow}>
                  <View>
                    <Text style={styles.labelTotal}>Total Reserva</Text>
                    <Text style={styles.valorTotal}>${parseFloat(item.total || 0).toFixed(2)}</Text>
                  </View>
                  {item.telefono_cliente ? (
                    <Text style={styles.telefonoTexto}>📞 {item.telefono_cliente}</Text>
                  ) : null}
                </View>

                {/* Acciones de estado */}
                <View style={styles.accionesRow}>
                  {item.estado === 'pendiente' && (
                    <TouchableOpacity
                      style={[styles.btnAccion, { backgroundColor: '#2563eb' }]}
                      onPress={() => cambiarEstado(item.id, 'confirmada')}
                    >
                      <Text style={styles.btnAccionTexto}>Confirmar</Text>
                    </TouchableOpacity>
                  )}
                  {item.estado === 'confirmada' && (
                    <TouchableOpacity
                      style={[styles.btnAccion, { backgroundColor: '#059669' }]}
                      onPress={() => cambiarEstado(item.id, 'activa')}
                    >
                      <Text style={styles.btnAccionTexto}>Entregar (Activar)</Text>
                    </TouchableOpacity>
                  )}
                  {item.estado === 'activa' && (
                    <TouchableOpacity
                      style={[styles.btnAccion, { backgroundColor: '#475569' }]}
                      onPress={() => cambiarEstado(item.id, 'completada')}
                    >
                      <Text style={styles.btnAccionTexto}>Completar y Saldar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Botón flotante para nueva reserva */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CrearReserva')}
      >
        <Text style={styles.fabTexto}>➕ Nueva Reserva</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chipFiltro: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  chipFiltroActivo: {
    backgroundColor: '#4a6cf7',
  },
  textoChip: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  textoChipActivo: {
    color: '#fff',
  },
  lista: {
    padding: 12,
    paddingBottom: 85,
  },
  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tarjetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  clienteNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  aliasCliente: {
    fontSize: 12,
    color: '#4a6cf7',
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  fechasRow: {
    marginBottom: 4,
  },
  fechaTexto: {
    fontSize: 12,
    color: '#475569',
  },
  direccionTexto: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  totalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
  },
  labelTotal: {
    fontSize: 11,
    color: '#64748b',
  },
  valorTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  telefonoTexto: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  btnAccion: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnAccionTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13,
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  tituloVacio: {
    fontSize: 14,
    color: '#64748b',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4a6cf7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  fabTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
