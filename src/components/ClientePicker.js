import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import api from '../api';

export default function ClientePicker({ clienteSeleccionado, onSeleccionar, onLimpiar }) {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [desplegado, setDesplegado] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setCargando(true);
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (e) {
      console.warn('Error cargando clientes:', e);
    } finally {
      setCargando(false);
    }
  };

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes.slice(0, 8);
    const q = busqueda.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        (c.nombre && c.nombre.toLowerCase().includes(q)) ||
        (c.alias && c.alias.toLowerCase().includes(q)) ||
        (c.cedula && c.cedula.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [clientes, busqueda]);

  const handleSeleccionar = (c) => {
    onSeleccionar(c);
    setBusqueda(`${c.nombre}${c.alias ? ` (${c.alias})` : ''}`);
    setDesplegado(false);
  };

  const handleLimpiar = () => {
    setBusqueda('');
    setDesplegado(false);
    onLimpiar();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>👥 Jalar Cliente Existente / Formulario</Text>
        {clienteSeleccionado && (
          <TouchableOpacity onPress={handleLimpiar}>
            <Text style={styles.btnLimpiar}>✕ Desvincular</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.input}
        placeholder="🔍 Buscar por nombre, cédula o teléfono..."
        placeholderTextColor="#94a3b8"
        value={busqueda}
        onChangeText={(text) => {
          setBusqueda(text);
          setDesplegado(true);
        }}
        onFocus={() => setDesplegado(true)}
      />

      {cargando && <ActivityIndicator size="small" color="#4a6cf7" style={{ marginTop: 6 }} />}

      {desplegado && clientesFiltrados.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  clienteSeleccionado?.id === item.id && styles.itemSeleccionado,
                ]}
                onPress={() => handleSeleccionar(item)}
              >
                <Text style={styles.nombreItem}>
                  {item.nombre}{' '}
                  {item.alias ? <Text style={styles.aliasItem}>({item.alias})</Text> : null}
                </Text>
                <View style={styles.detallesRow}>
                  {item.telefono ? <Text style={styles.detalle}>📞 {item.telefono}</Text> : null}
                  {item.cedula ? <Text style={styles.detalle}>🪪 {item.cedula}</Text> : null}
                </View>
                {item.notas ? (
                  <Text style={styles.notasItem} numberOfLines={1}>
                    📝 {item.notas}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {clienteSeleccionado && (
        <View style={styles.bannerExito}>
          <Text style={styles.textoExito}>
            ✓ Cliente jalado: <Text style={{ fontWeight: '700' }}>{clienteSeleccionado.nombre}</Text>
          </Text>
          <Text style={styles.subtextoExito}>(Datos precargados sin duplicados)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  btnLimpiar: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1e293b',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemSeleccionado: {
    backgroundColor: '#eff6ff',
  },
  nombreItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  aliasItem: {
    color: '#4a6cf7',
    fontWeight: '500',
  },
  detallesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
  },
  detalle: {
    fontSize: 11,
    color: '#64748b',
  },
  notasItem: {
    fontSize: 11,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 2,
  },
  bannerExito: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  textoExito: {
    fontSize: 12,
    color: '#065f46',
  },
  subtextoExito: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
});
