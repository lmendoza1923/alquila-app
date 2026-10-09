import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import api from '../api';

export default function ClientesScreen({ navigation }) {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarClientes = async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    const unsubscribe = navigation.addListener('focus', () => {
      cargarClientes();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefrescando(true);
    cargarClientes();
  };

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes;
    const q = busqueda.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        (c.nombre && c.nombre.toLowerCase().includes(q)) ||
        (c.alias && c.alias.toLowerCase().includes(q)) ||
        (c.cedula && c.cedula.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.toLowerCase().includes(q)) ||
        (c.direccion && c.direccion.toLowerCase().includes(q))
    );
  }, [clientes, busqueda]);

  const totalFacturado = useMemo(() => {
    return clientes.reduce((acc, c) => acc + parseFloat(c.total_facturado || 0), 0);
  }, [clientes]);

  const compartirFormularioWhatsApp = () => {
    const urlWeb = 'https://alquilatuparty.com/formulario-cliente';
    const texto = `Hola, por favor completa tus datos en este enlace para preparar tu reserva y evento: ${urlWeb}`;
    Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
  };

  const escribirWhatsAppCliente = (telefono) => {
    if (!telefono) {
      Alert.alert('Sin teléfono', 'El cliente no tiene teléfono registrado');
      return;
    }
    const clean = telefono.replace(/\D/g, '');
    Linking.openURL(`https://api.whatsapp.com/send?phone=${clean}`);
  };

  const llamarCliente = (telefono) => {
    if (!telefono) {
      Alert.alert('Sin teléfono', 'El cliente no tiene teléfono registrado');
      return;
    }
    Linking.openURL(`tel:${telefono}`);
  };

  return (
    <View style={styles.container}>
      {/* Barra superior de métricas y compartir link */}
      <View style={styles.headerBar}>
        <View style={styles.metricasRow}>
          <View style={styles.metrica}>
            <Text style={styles.metricaValor}>{clientes.length}</Text>
            <Text style={styles.metricaLabel}>Clientes</Text>
          </View>
          <View style={styles.metrica}>
            <Text style={[styles.metricaValor, { color: '#059669' }]}>
              ${totalFacturado.toFixed(2)}
            </Text>
            <Text style={styles.metricaLabel}>Facturación</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnCompartir} onPress={compartirFormularioWhatsApp}>
          <Text style={styles.btnCompartirTexto}>🔗 Enviar Link de Formulario por WhatsApp</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          placeholder="🔍 Buscar cliente, teléfono o cédula..."
          placeholderTextColor="#94a3b8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4a6cf7" />
          <Text style={styles.textoCargando}>Cargando lista de clientes...</Text>
        </View>
      ) : (
        <FlatList
          data={clientesFiltrados}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>👥</Text>
              <Text style={styles.tituloVacio}>No se encontraron clientes</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <View style={styles.tarjetaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombreCliente}>{item.nombre}</Text>
                  {item.alias ? (
                    <Text style={styles.aliasCliente}>🏷️ {item.alias}</Text>
                  ) : null}
                </View>

                {parseInt(item.total_reservas || 0) > 0 ? (
                  <View style={styles.badgeReservas}>
                    <Text style={styles.badgeTexto}>
                      {item.total_reservas} {item.total_reservas === 1 ? 'reserva' : 'reservas'}
                    </Text>
                    <Text style={styles.facturadoCliente}>
                      ${parseFloat(item.total_facturado || 0).toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>Sin reservas</Text>
                )}
              </View>

              <View style={styles.datosCliente}>
                {item.telefono ? (
                  <Text style={styles.datoFila}>📞 {item.telefono}</Text>
                ) : null}
                {item.cedula ? (
                  <Text style={styles.datoFila}>🪪 Cédula: {item.cedula}</Text>
                ) : null}
                {item.direccion ? (
                  <Text style={styles.datoFila} numberOfLines={1}>
                    📍 {item.direccion}
                  </Text>
                ) : null}
                {item.notas ? (
                  <Text style={styles.notasCliente} numberOfLines={2}>
                    📝 {item.notas}
                  </Text>
                ) : null}
              </View>

              {/* Botones de acción directa */}
              <View style={styles.accionesRow}>
                <TouchableOpacity
                  style={[styles.btnAccion, { backgroundColor: '#10b981' }]}
                  onPress={() =>
                    navigation.navigate('CrearReserva', { clientePreseleccionado: item })
                  }
                >
                  <Text style={styles.btnAccionTexto}>📅 Crear Reserva</Text>
                </TouchableOpacity>

                {item.telefono ? (
                  <TouchableOpacity
                    style={[styles.btnAccion, { backgroundColor: '#25D366' }]}
                    onPress={() => escribirWhatsAppCliente(item.telefono)}
                  >
                    <Text style={styles.btnAccionTexto}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                ) : null}

                {item.telefono ? (
                  <TouchableOpacity
                    style={[styles.btnAccion, { backgroundColor: '#e2e8f0' }]}
                    onPress={() => llamarCliente(item.telefono)}
                  >
                    <Text style={[styles.btnAccionTexto, { color: '#1e293b' }]}>📞 Llamar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerBar: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  metricasRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  metrica: {
    alignItems: 'center',
  },
  metricaValor: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  metricaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  btnCompartir: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnCompartirTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  buscadorContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  buscadorInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  lista: {
    padding: 12,
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
  },
  nombreCliente: {
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
  badgeReservas: {
    alignItems: 'flex-end',
  },
  badgeTexto: {
    fontSize: 11,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  facturadoCliente: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  datosCliente: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
  },
  datoFila: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 3,
  },
  notasCliente: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-start',
  },
  btnAccion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
});
