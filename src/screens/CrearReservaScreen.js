import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../api';
import ClientePicker from '../components/ClientePicker';

export default function CrearReservaScreen({ route, navigation }) {
  const clienteInicial = route.params?.clientePreseleccionado || null;

  const [clienteSeleccionado, setClienteSeleccionado] = useState(clienteInicial);
  const [form, setForm] = useState({
    alias: clienteInicial?.alias || '',
    nombre: clienteInicial?.nombre || '',
    cedula: clienteInicial?.cedula || '',
    telefono: clienteInicial?.telefono || '',
    direccion: clienteInicial?.direccion || '',
    notas: clienteInicial?.notas || '',
  });

  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().substring(0, 10));
  const [fechaFin, setFechaFin] = useState(
    new Date(Date.now() + 86400000).toISOString().substring(0, 10)
  );

  const [muebles, setMuebles] = useState([]);
  const [combos, setCombos] = useState([]);
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    try {
      const [resMuebles, resCombos] = await Promise.all([
        api.get('/muebles'),
        api.get('/combos'),
      ]);
      setMuebles(resMuebles.data);
      setCombos(resCombos.data);
    } catch (err) {
      console.warn('Error cargando catálogo:', err);
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const handleSeleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setForm({
      alias: c.alias || '',
      nombre: c.nombre || '',
      cedula: c.cedula || '',
      telefono: c.telefono || '',
      direccion: c.direccion || '',
      notas: c.notas || '',
    });
  };

  const handleLimpiarCliente = () => {
    setClienteSeleccionado(null);
    setForm({
      alias: '',
      nombre: '',
      cedula: '',
      telefono: '',
      direccion: '',
      notas: '',
    });
  };

  const agregarItem = (item, esCombo = false) => {
    setItemsSeleccionados((prev) => {
      const existe = prev.find((i) =>
        esCombo ? i.combo_id === item.id : i.mueble_id === item.id
      );
      if (existe) {
        return prev.map((i) => {
          if (esCombo ? i.combo_id === item.id : i.mueble_id === item.id) {
            return { ...i, cantidad: i.cantidad + 1 };
          }
          return i;
        });
      }
      return [
        ...prev,
        {
          mueble_id: esCombo ? null : item.id,
          combo_id: esCombo ? item.id : null,
          nombre: item.nombre,
          precio_dia: parseFloat(item.precio_dia || 0),
          cantidad: 1,
          esCombo,
        },
      ];
    });
  };

  const modificarCantidad = (index, delta) => {
    setItemsSeleccionados((prev) => {
      const copia = [...prev];
      const nueva = copia[index].cantidad + delta;
      if (nueva <= 0) {
        return copia.filter((_, i) => i !== index);
      }
      copia[index].cantidad = nueva;
      return copia;
    });
  };

  // Calcular días y total
  const dInicio = new Date(fechaInicio);
  const dFin = new Date(fechaFin);
  const dias = Math.max(1, Math.ceil((dFin - dInicio) / 86400000) + 1);

  const totalCalculado = itemsSeleccionados.reduce(
    (acc, it) => acc + it.precio_dia * it.cantidad * dias,
    0
  );

  const guardarReserva = async () => {
    if (!form.nombre.trim() && !form.alias.trim()) {
      Alert.alert('Faltan datos', 'Ingresa al menos el nombre o alias del cliente');
      return;
    }
    if (itemsSeleccionados.length === 0) {
      Alert.alert('Artículos requeridos', 'Debes agregar al menos un mueble o combo a la reserva');
      return;
    }

    try {
      setGuardando(true);
      const payload = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        alias_cliente: form.alias || null,
        nombre_cliente: form.nombre || null,
        cedula_cliente: form.cedula ? form.cedula.trim() : null,
        email_cliente: clienteSeleccionado?.email || null,
        telefono_cliente: form.telefono || null,
        direccion_entrega: form.direccion || null,
        notas: form.notas || null,
        cliente_id: clienteSeleccionado?.id || null, // VINCULA AL CLIENTE EXISTENTE
        items: itemsSeleccionados.map((it) => ({
          mueble_id: it.mueble_id,
          combo_id: it.combo_id,
          cantidad: it.cantidad,
        })),
      };

      const res = await api.post('/reservas', payload);
      Alert.alert('¡Éxito!', 'La reserva ha sido creada y sincronizada con la base de datos.', [
        {
          text: 'Aceptar',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.error || 'No se pudo crear la reserva');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.tituloSeccion}>1. Cliente de la Reserva</Text>

      {/* Selector para jalar clientes sin duplicados */}
      <ClientePicker
        clienteSeleccionado={clienteSeleccionado}
        onSeleccionar={handleSeleccionarCliente}
        onLimpiar={handleLimpiarCliente}
      />

      <View style={styles.cardForm}>
        <View style={styles.campo}>
          <Text style={styles.label}>Motivo del Evento</Text>
          <TextInput
            style={styles.input}
            value={form.alias}
            onChangeText={(t) => setForm((f) => ({ ...f, alias: t }))}
            placeholder="Ej: Boda, 15 años, Baby Shower, Cumpleaños, Revelación"
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput
            style={styles.input}
            value={form.nombre}
            onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
            placeholder="Ej: María Gómez"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.campo, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Cédula *</Text>
            <TextInput
              style={styles.input}
              value={form.cedula}
              onChangeText={(t) => setForm((f) => ({ ...f, cedula: t }))}
              placeholder="Ej: 8-888-8888"
            />
          </View>
          <View style={[styles.campo, { flex: 1 }]}>
            <Text style={styles.label}>Teléfono / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={form.telefono}
              onChangeText={(t) => setForm((f) => ({ ...f, telefono: t }))}
              placeholder="Ej: 6000-0000"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Dirección del Evento</Text>
          <TextInput
            style={styles.input}
            value={form.direccion}
            onChangeText={(t) => setForm((f) => ({ ...f, direccion: t }))}
            placeholder="Calle, salón, edificio..."
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Notas / Requerimientos</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={form.notas}
            onChangeText={(t) => setForm((f) => ({ ...f, notas: t }))}
            placeholder="Detalles especiales, horario de entrega..."
            multiline
          />
        </View>
      </View>

      <Text style={[styles.tituloSeccion, { marginTop: 18 }]}>2. Fechas del Evento</Text>
      <View style={styles.cardForm}>
        <View style={styles.row}>
          <View style={[styles.campo, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Fecha Inicio (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={fechaInicio}
              onChangeText={setFechaInicio}
              placeholder="2026-10-09"
            />
          </View>
          <View style={[styles.campo, { flex: 1 }]}>
            <Text style={styles.label}>Fecha Fin (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={fechaFin}
              onChangeText={setFechaFin}
              placeholder="2026-10-10"
            />
          </View>
        </View>
        <Text style={styles.diasTexto}>⏳ Duración: {dias} {dias === 1 ? 'día' : 'días'}</Text>
      </View>

      <Text style={[styles.tituloSeccion, { marginTop: 18 }]}>3. Artículos Seleccionados</Text>
      {itemsSeleccionados.length === 0 ? (
        <View style={styles.sinItems}>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>No has agregado artículos aún</Text>
        </View>
      ) : (
        <View style={styles.cardForm}>
          {itemsSeleccionados.map((it, idx) => (
            <View key={idx} style={styles.itemFila}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNombre}>
                  {it.esCombo ? `🎁 ${it.nombre}` : it.nombre}
                </Text>
                <Text style={styles.itemPrecio}>
                  ${it.precio_dia.toFixed(2)}/día × {it.cantidad}
                </Text>
              </View>
              <View style={styles.itemControles}>
                <TouchableOpacity
                  style={styles.btnCant}
                  onPress={() => modificarCantidad(idx, -1)}
                >
                  <Text style={styles.btnCantTexto}>-</Text>
                </TouchableOpacity>
                <Text style={styles.cantTexto}>{it.cantidad}</Text>
                <TouchableOpacity
                  style={styles.btnCant}
                  onPress={() => modificarCantidad(idx, 1)}
                >
                  <Text style={styles.btnCantTexto}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Catálogo rápido de muebles y combos para agregar */}
      <Text style={[styles.subtituloSeccion, { marginTop: 14 }]}>
        📦 Agregar del Inventario:
      </Text>
      {cargandoCatalogos ? (
        <ActivityIndicator color="#4a6cf7" style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {combos.map((cb) => (
            <TouchableOpacity
              key={`c-${cb.id}`}
              style={[styles.chipItem, { borderColor: '#818cf8', backgroundColor: '#eef2ff' }]}
              onPress={() => agregarItem(cb, true)}
            >
              <Text style={{ fontWeight: '700', fontSize: 12, color: '#3730a3' }}>
                🎁 {cb.nombre}
              </Text>
              <Text style={{ fontSize: 11, color: '#4338ca' }}>${cb.precio_dia}/día</Text>
            </TouchableOpacity>
          ))}
          {muebles.map((m) => (
            <TouchableOpacity
              key={`m-${m.id}`}
              style={styles.chipItem}
              onPress={() => agregarItem(m, false)}
            >
              <Text style={{ fontWeight: '600', fontSize: 12, color: '#1e293b' }}>
                {m.nombre}
              </Text>
              <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                ${m.precio_dia}/día
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Resumen Total y Botón de Creación */}
      <View style={styles.resumenCard}>
        <View style={styles.rowTotal}>
          <Text style={styles.labelTotal}>Total Estimado:</Text>
          <Text style={styles.valorTotal}>${totalCalculado.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.btnGuardar, guardando && { opacity: 0.7 }]}
          onPress={guardarReserva}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnGuardarTexto}>✅ Confirmar y Crear Reserva</Text>
          )}
        </TouchableOpacity>
      </View>
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
  tituloSeccion: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtituloSeccion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  cardForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  campo: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
  },
  diasTexto: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 4,
  },
  sinItems: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemNombre: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemPrecio: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemControles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnCant: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCantTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  cantTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    minWidth: 20,
    textAlign: 'center',
  },
  chipItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  resumenCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  labelTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  valorTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4a6cf7',
  },
  btnGuardar: {
    backgroundColor: '#4a6cf7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGuardarTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
