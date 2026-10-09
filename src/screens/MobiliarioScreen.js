import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../api';

export default function MobiliarioScreen() {
  const [muebles, setMuebles] = useState([]);
  const [combos, setCombos] = useState([]);
  const [vista, setVista] = useState('muebles'); // 'muebles' | 'combos'
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarInventario = async () => {
    try {
      const [resMuebles, resCombos] = await Promise.all([
        api.get('/muebles?todos=true'),
        api.get('/combos'),
      ]);
      setMuebles(resMuebles.data);
      setCombos(resCombos.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo cargar el inventario');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    cargarInventario();
  };

  const listaActual = vista === 'muebles' ? muebles : combos;
  const listaFiltrada = listaActual.filter((item) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return (
      item.nombre?.toLowerCase().includes(q) ||
      item.categoria?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Switch Muebles vs Combos */}
      <View style={styles.pestanasRow}>
        <TouchableOpacity
          style={[styles.pestana, vista === 'muebles' && styles.pestanaActiva]}
          onPress={() => setVista('muebles')}
        >
          <Text style={[styles.textoPestana, vista === 'muebles' && styles.textoPestanaActiva]}>
            🪑 Muebles ({muebles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pestana, vista === 'combos' && styles.pestanaActiva]}
          onPress={() => setVista('combos')}
        >
          <Text style={[styles.textoPestana, vista === 'combos' && styles.textoPestanaActiva]}>
            🎁 Combos ({combos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          placeholder={`🔍 Buscar en ${vista}...`}
          placeholderTextColor="#94a3b8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4a6cf7" />
          <Text style={styles.textoCargando}>Cargando inventario...</Text>
        </View>
      ) : (
        <FlatList
          data={listaFiltrada}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🪑</Text>
              <Text style={styles.tituloVacio}>No hay artículos registrados</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <View style={styles.tarjetaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombreItem}>{item.nombre}</Text>
                  {item.categoria ? (
                    <Text style={styles.categoriaItem}>📂 {item.categoria}</Text>
                  ) : null}
                </View>
                <Text style={styles.precioItem}>${parseFloat(item.precio_dia || 0).toFixed(2)}/día</Text>
              </View>

              {vista === 'muebles' ? (
                <View style={styles.stockRow}>
                  <Text style={styles.stockTexto}>
                    Inventario Total: <Text style={{ fontWeight: '700' }}>{item.stock_total || 0}</Text> unidades
                  </Text>
                </View>
              ) : (
                <View style={styles.componentesCombo}>
                  <Text style={styles.labelCombo}>Artículos incluidos:</Text>
                  {(item.items || []).map((ci, idx) => (
                    <Text key={idx} style={styles.comboItemRow}>
                      • {ci.nombre} <Text style={{ color: '#4a6cf7', fontWeight: '700' }}>×{ci.cantidad}</Text>
                    </Text>
                  ))}
                </View>
              )}
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
  pestanasRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pestana: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pestanaActiva: {
    borderBottomColor: '#4a6cf7',
  },
  textoPestana: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  textoPestanaActiva: {
    color: '#4a6cf7',
    fontWeight: '800',
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
  nombreItem: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  categoriaItem: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  precioItem: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4a6cf7',
  },
  stockRow: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  stockTexto: {
    fontSize: 12,
    color: '#334155',
  },
  componentesCombo: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  labelCombo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  comboItemRow: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 2,
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
