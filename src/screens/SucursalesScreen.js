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
  Alert,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import api from '../api';

export default function SucursalesScreen({ navigation }) {
  const [sucursales, setSucursales] = useState([]);
  const [mueblesPlanilla, setMueblesPlanilla] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Sub-vista: 'sedes' | 'planilla'
  const [vista, setVista] = useState('sedes');
  const [busqueda, setBusqueda] = useState('');

  // ── Modal Mobiliario de una Sede ──
  const [modalInventarioVisible, setModalInventarioVisible] = useState(false);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);
  const [mobiliarioSede, setMobiliarioSede] = useState([]);
  const [busquedaModal, setBusquedaModal] = useState('');
  const [cargandoModal, setCargandoModal] = useState(false);
  const [guardandoInventario, setGuardandoInventario] = useState(false);

  // ── Modal Crear / Editar Sucursal ──
  const [modalSucursalVisible, setModalSucursalVisible] = useState(false);
  const [sucursalEditando, setSucursalEditando] = useState(null);
  const [formSucursal, setFormSucursal] = useState({
    nombre: '',
    codigo: '',
    direccion: '',
    telefono: '',
    encargado: '',
    es_principal: false,
  });
  const [guardandoSucursal, setGuardandoSucursal] = useState(false);

  // ── Estado de Planilla General ──
  const [planillaValores, setPlanillaValores] = useState({});
  const [planillaOriginal, setPlanillaOriginal] = useState({});
  const [guardandoPlanilla, setGuardandoPlanilla] = useState(false);

  // ── Cargar Datos ────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    try {
      const [resSuc, resGeneral] = await Promise.all([
        api.get('/sucursales'),
        api.get('/sucursales/distribucion/general'),
      ]);

      const listaSuc = resSuc.data || [];
      const dataMuebles = resGeneral.data.muebles || [];

      setSucursales(listaSuc);
      setMueblesPlanilla(dataMuebles);

      // Mapear matriz para edición en planilla
      const valores = {};
      dataMuebles.forEach((m) => {
        listaSuc.forEach((s) => {
          valores[`${m.id}_${s.id}`] = m.distribucion ? m.distribucion[s.id] || 0 : 0;
        });
      });
      setPlanillaValores(valores);
      setPlanillaOriginal(valores);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
      Alert.alert('Error', 'No se pudo cargar la información de sucursales');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      cargarDatos();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  // ── Sucursales filtradas ────────────────────────────────────────────────
  const sucursalesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return sucursales;
    const q = busqueda.toLowerCase().trim();
    return sucursales.filter(
      (s) =>
        s.nombre?.toLowerCase().includes(q) ||
        s.codigo?.toLowerCase().includes(q) ||
        s.direccion?.toLowerCase().includes(q) ||
        s.encargado?.toLowerCase().includes(q)
    );
  }, [sucursales, busqueda]);

  // ── Muebles de planilla filtrados ───────────────────────────────────────
  const mueblesPlanillaFiltrados = useMemo(() => {
    if (!busqueda.trim()) return mueblesPlanilla;
    const q = busqueda.toLowerCase().trim();
    return mueblesPlanilla.filter(
      (m) =>
        m.nombre?.toLowerCase().includes(q) ||
        m.categoria_nombre?.toLowerCase().includes(q)
    );
  }, [mueblesPlanilla, busqueda]);

  // Total de unidades registradas
  const totalPiezasRegistradas = useMemo(() => {
    return sucursales.reduce((acc, s) => acc + (parseInt(s.total_unidades) || 0), 0);
  }, [sucursales]);

  // ── Acciones de Comunicación ────────────────────────────────────────────
  const escribirWhatsApp = (telefono) => {
    if (!telefono) return;
    const clean = telefono.replace(/\D/g, '');
    const num = clean.length === 8 ? `507${clean}` : clean;
    Linking.openURL(`https://api.whatsapp.com/send?phone=${num}`);
  };

  const llamarTelefono = (telefono) => {
    if (!telefono) return;
    Linking.openURL(`tel:${telefono}`);
  };

  // ── Abrir Modal Mobiliario de una Sede ───────────────────────────────────
  const abrirInventarioSede = async (sucursal) => {
    setSucursalSeleccionada(sucursal);
    setBusquedaModal('');
    setModalInventarioVisible(true);
    setCargandoModal(true);

    try {
      const res = await api.get(`/sucursales/${sucursal.id}`);
      setMobiliarioSede(res.data.mobiliario || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo cargar el mobiliario de esta sucursal');
    } finally {
      setCargandoModal(false);
    }
  };

  const modificarCantidadSede = (muebleId, delta) => {
    setMobiliarioSede((prev) =>
      prev.map((item) => {
        if (item.mueble_id === muebleId) {
          const actual = parseInt(item.cantidad) || 0;
          const nuevo = Math.max(0, actual + delta);
          return { ...item, cantidad: nuevo };
        }
        return item;
      })
    );
  };

  const setCantidadSedeDirecta = (muebleId, texto) => {
    const val = texto === '' ? 0 : Math.max(0, parseInt(texto) || 0);
    setMobiliarioSede((prev) =>
      prev.map((item) => {
        if (item.mueble_id === muebleId) {
          return { ...item, cantidad: val };
        }
        return item;
      })
    );
  };

  const guardarInventarioSede = async () => {
    if (!sucursalSeleccionada) return;
    setGuardandoInventario(true);
    try {
      const sucursalActualId = sucursalSeleccionada.id;
      const otraSucursal = sucursales.find((s) => s.id !== sucursalActualId);

      const cambios = [];
      mobiliarioSede.forEach((m) => {
        const cant = Math.max(0, parseInt(m.cantidad) || 0);
        cambios.push({
          sucursal_id: sucursalActualId,
          mueble_id: m.mueble_id,
          cantidad: cant,
        });
        if (otraSucursal && sucursales.length === 2) {
          const stockTot = parseInt(m.stock_total) || 0;
          const restante = Math.max(0, stockTot - cant);
          cambios.push({
            sucursal_id: otraSucursal.id,
            mueble_id: m.mueble_id,
            cantidad: restante,
          });
        }
      });

      await api.post('/sucursales/distribucion/guardar', { cambios });
      Alert.alert('Éxito', `Cantidades sincronizadas y guardadas con éxito`);
      setModalInventarioVisible(false);
      cargarDatos();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron guardar las cantidades');
    } finally {
      setGuardandoInventario(false);
    }
  };

  const mobiliarioModalFiltrado = useMemo(() => {
    if (!busquedaModal.trim()) return mobiliarioSede;
    const q = busquedaModal.toLowerCase().trim();
    return mobiliarioSede.filter(
      (m) =>
        m.nombre?.toLowerCase().includes(q) ||
        m.categoria_nombre?.toLowerCase().includes(q)
    );
  }, [mobiliarioSede, busquedaModal]);

  // ── Crear / Editar Sucursal ─────────────────────────────────────────────
  const abrirCrearSucursal = () => {
    setSucursalEditando(null);
    setFormSucursal({
      nombre: '',
      codigo: `SUC-${String(sucursales.length + 1).padStart(2, '0')}`,
      direccion: '',
      telefono: '',
      encargado: '',
      es_principal: sucursales.length === 0,
    });
    setModalSucursalVisible(true);
  };

  const abrirEditarSucursal = (s) => {
    setSucursalEditando(s);
    setFormSucursal({
      nombre: s.nombre || '',
      codigo: s.codigo || '',
      direccion: s.direccion || '',
      telefono: s.telefono || '',
      encargado: s.encargado || '',
      es_principal: Boolean(s.es_principal),
    });
    setModalSucursalVisible(true);
  };

  const guardarSucursal = async () => {
    if (!formSucursal.nombre.trim()) {
      Alert.alert('Atención', 'El nombre de la sucursal es obligatorio');
      return;
    }

    setGuardandoSucursal(true);
    try {
      if (sucursalEditando) {
        await api.put(`/sucursales/${sucursalEditando.id}`, formSucursal);
        Alert.alert('Éxito', 'Sucursal actualizada');
      } else {
        await api.post('/sucursales', formSucursal);
        Alert.alert('Éxito', 'Sucursal registrada');
      }
      setModalSucursalVisible(false);
      cargarDatos();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.error || 'Error al guardar sucursal');
    } finally {
      setGuardandoSucursal(false);
    }
  };

  const eliminarSucursal = (s) => {
    Alert.alert(
      'Eliminar Sucursal',
      `¿Deseas eliminar la sucursal "${s.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/sucursales/${s.id}`);
              Alert.alert('Eliminada', 'La sucursal fue eliminada');
              cargarDatos();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la sucursal');
            }
          },
        },
      ]
    );
  };

  // ── Planilla General: Manejo de cambios (con auto-balance a la otra sucursal) ──
  const handleCambioPlanilla = (muebleId, sucursalId, delta) => {
    const mueble = mueblesPlanilla.find((m) => m.id === muebleId);
    const stockTotal = mueble ? (parseInt(mueble.stock_total) || 0) : 0;
    const otraSucursal = sucursales.find((s) => s.id !== sucursalId);

    const key = `${muebleId}_${sucursalId}`;
    const actual = planillaValores[key] !== undefined ? planillaValores[key] : 0;
    const nuevo = Math.max(0, actual + delta);

    setPlanillaValores((prev) => {
      const updated = {
        ...prev,
        [key]: nuevo,
      };
      if (otraSucursal && sucursales.length === 2) {
        const restante = Math.max(0, stockTotal - nuevo);
        updated[`${muebleId}_${otraSucursal.id}`] = restante;
      }
      return updated;
    });
  };

  const hayCambiosPlanilla = useMemo(() => {
    return Object.keys(planillaValores).some(
      (key) => planillaValores[key] !== planillaOriginal[key]
    );
  }, [planillaValores, planillaOriginal]);

  const guardarPlanillaGeneral = async () => {
    const cambios = [];
    Object.keys(planillaValores).forEach((key) => {
      if (planillaValores[key] !== planillaOriginal[key]) {
        const [mueble_id, sucursal_id] = key.split('_');
        cambios.push({
          mueble_id,
          sucursal_id,
          cantidad: planillaValores[key],
        });
      }
    });

    if (cambios.length === 0) return;

    setGuardandoPlanilla(true);
    try {
      await api.post('/sucursales/distribucion/guardar', { cambios });
      Alert.alert('Éxito', `Cantidades actualizadas para ${cambios.length} registros`);
      cargarDatos();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron guardar los cambios de la planilla');
    } finally {
      setGuardandoPlanilla(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Barra Superior de Métricas y Botón Nueva Sede ── */}
      <View style={styles.headerBar}>
        <View style={styles.metricasRow}>
          <View style={styles.metrica}>
            <Text style={styles.metricaValor}>{sucursales.length}</Text>
            <Text style={styles.metricaLabel}>Sedes</Text>
          </View>
          <View style={styles.metrica}>
            <Text style={[styles.metricaValor, { color: '#059669' }]}>
              {totalPiezasRegistradas}
            </Text>
            <Text style={styles.metricaLabel}>Piezas Distribuidas</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnNuevaSede} onPress={abrirCrearSucursal}>
          <Text style={styles.btnNuevaSedeTexto}>➕ Nueva Sucursal</Text>
        </TouchableOpacity>
      </View>

      {/* ── Pestañas de Vista (Sedes vs Planilla) ── */}
      <View style={styles.pestanasRow}>
        <TouchableOpacity
          style={[styles.pestana, vista === 'sedes' && styles.pestanaActiva]}
          onPress={() => setVista('sedes')}
        >
          <Text style={[styles.textoPestana, vista === 'sedes' && styles.textoPestanaActiva]}>
            🏢 Sedes ({sucursales.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pestana, vista === 'planilla' && styles.pestanaActiva]}
          onPress={() => setVista('planilla')}
        >
          <Text style={[styles.textoPestana, vista === 'planilla' && styles.textoPestanaActiva]}>
            📋 Planilla Mobiliarios
          </Text>
          {hayCambiosPlanilla && (
            <View style={styles.puntoCambios} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Buscador ── */}
      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          placeholder={vista === 'sedes' ? '🔍 Buscar sucursal o encargado...' : '🔍 Buscar mobiliario...'}
          placeholderTextColor="#94a3b8"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4a6cf7" />
          <Text style={styles.textoCargando}>Cargando información de sucursales...</Text>
        </View>
      ) : vista === 'sedes' ? (
        /* ── LISTADO DE SUCURSALES ── */
        <FlatList
          data={sucursalesFiltradas}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🏢</Text>
              <Text style={styles.tituloVacio}>No hay sucursales registradas</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.tarjeta, item.es_principal && styles.tarjetaPrincipal]}>
              <View style={styles.tarjetaHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.nombreSede}>{item.nombre}</Text>
                  </View>
                  {item.codigo ? (
                    <Text style={styles.codigoSede}>Código: {item.codigo}</Text>
                  ) : null}
                </View>

                {item.es_principal ? (
                  <View style={styles.badgePrincipal}>
                    <Text style={styles.badgePrincipalTexto}>⭐ Principal</Text>
                  </View>
                ) : null}
              </View>

              {/* Datos de contacto y ubicación */}
              <View style={styles.datosSede}>
                {item.direccion ? (
                  <Text style={styles.datoFila}>📍 {item.direccion}</Text>
                ) : null}
                {item.encargado ? (
                  <Text style={styles.datoFila}>👤 Responsable: {item.encargado}</Text>
                ) : null}
                {item.telefono ? (
                  <Text style={styles.datoFila}>📞 {item.telefono}</Text>
                ) : null}
              </View>

              {/* Conteo total de piezas registradas en esta sede */}
              <View style={styles.contadorSedeRow}>
                <Text style={styles.contadorLabel}>Mobiliarios en esta sede:</Text>
                <Text style={styles.contadorValor}>
                  {item.total_unidades || 0} <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>piezas</Text>
                </Text>
              </View>

              {/* Botón principal: Ver / Modificar Mobiliario */}
              <TouchableOpacity
                style={styles.btnVerMobiliario}
                onPress={() => abrirInventarioSede(item)}
              >
                <Text style={styles.btnVerMobiliarioTexto}>📋 Ver y Modificar Mobiliario</Text>
              </TouchableOpacity>

              {/* Acciones de WhatsApp, Llamada, Edición y Borrado */}
              <View style={styles.accionesRow}>
                {item.telefono ? (
                  <TouchableOpacity
                    style={[styles.btnAccionPequeno, { backgroundColor: '#25D366' }]}
                    onPress={() => escribirWhatsApp(item.telefono)}
                  >
                    <Text style={styles.btnAccionPequenoTexto}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                ) : null}

                {item.telefono ? (
                  <TouchableOpacity
                    style={[styles.btnAccionPequeno, { backgroundColor: '#e2e8f0' }]}
                    onPress={() => llamarTelefono(item.telefono)}
                  >
                    <Text style={[styles.btnAccionPequenoTexto, { color: '#1e293b' }]}>📞 Llamar</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.btnAccionPequeno, { backgroundColor: '#f1f5f9' }]}
                  onPress={() => abrirEditarSucursal(item)}
                >
                  <Text style={[styles.btnAccionPequenoTexto, { color: '#475569' }]}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAccionPequeno, { backgroundColor: '#fee2e2' }]}
                  onPress={() => eliminarSucursal(item)}
                >
                  <Text style={[styles.btnAccionPequenoTexto, { color: '#dc2626' }]}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        /* ── PLANILLA GENERAL DE MOBILIARIOS ── */
        <View style={{ flex: 1 }}>
          <View style={styles.bannerInformativo}>
            <Text style={styles.bannerInformativoTexto}>
              ⚖️ Balanceo visual: Al ajustar una sucursal, la diferencia del Stock Total se asigna a la otra.
            </Text>
          </View>
          <FlatList
            data={mueblesPlanillaFiltrados}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
            contentContainerStyle={[styles.lista, { paddingBottom: 80 }]}
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🪑</Text>
                <Text style={styles.tituloVacio}>No se encontraron mobiliarios</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.tarjetaPlanilla}>
                <View style={styles.cabeceraMueblePlanilla}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.nombreMueblePlanilla}>{item.nombre}</Text>
                    <View style={styles.badgeStockRef}>
                      <Text style={styles.badgeStockRefTexto}>Stock: {item.stock_total || 0}</Text>
                    </View>
                  </View>
                  {item.categoria_nombre ? (
                    <Text style={styles.categoriaMueblePlanilla}>{item.categoria_nombre}</Text>
                  ) : null}
                </View>

                {/* Filas de cantidades por cada sucursal */}
                <View style={styles.distribucionMueble}>
                  {sucursales.map((s) => {
                    const key = `${item.id}_${s.id}`;
                    const cant = planillaValores[key] !== undefined ? planillaValores[key] : 0;
                    const modificado = cant !== (planillaOriginal[key] || 0);

                    return (
                      <View key={s.id} style={[styles.filaPlanillaSucursal, modificado && styles.filaPlanillaModificada]}>
                        <Text style={styles.nombreSucursalPlanilla} numberOfLines={1}>
                          {s.nombre}
                        </Text>

                        <View style={styles.controlesContador}>
                          <TouchableOpacity
                            style={styles.btnContadorMenos}
                            onPress={() => handleCambioPlanilla(item.id, s.id, -1)}
                          >
                            <Text style={styles.btnContadorTexto}>-</Text>
                          </TouchableOpacity>

                          <Text style={[styles.numeroContador, modificado && { color: '#2563eb' }]}>
                            {cant}
                          </Text>

                          <TouchableOpacity
                            style={styles.btnContadorMas}
                            onPress={() => handleCambioPlanilla(item.id, s.id, 1)}
                          >
                            <Text style={styles.btnContadorTexto}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* Botón flotante para guardar planilla general */}
          {hayCambiosPlanilla && (
            <View style={styles.barraFlotanteGuardar}>
              <TouchableOpacity
                style={styles.btnGuardarFlotante}
                onPress={guardarPlanillaGeneral}
                disabled={guardandoPlanilla}
              >
                {guardandoPlanilla ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnGuardarFlotanteTexto}>💾 Guardar Cambios en Sedes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── MODAL: VER / MODIFICAR MOBILIARIO DE UNA SEDE ── */}
      <Modal
        visible={modalInventarioVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalInventarioVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitulo}>
                📋 {sucursalSeleccionada?.nombre}
              </Text>
              <Text style={styles.modalSubtitulo}>
                Cantidades de mobiliarios en esta sede (control visual)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalBtnCerrar}
              onPress={() => setModalInventarioVisible(false)}
            >
              <Text style={styles.modalBtnCerrarTexto}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador dentro del modal */}
          <View style={styles.buscadorContainer}>
            <TextInput
              style={styles.buscadorInput}
              placeholder="🔍 Filtrar mobiliario por nombre..."
              placeholderTextColor="#94a3b8"
              value={busquedaModal}
              onChangeText={setBusquedaModal}
            />
          </View>

          {cargandoModal ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4a6cf7" />
              <Text style={styles.textoCargando}>Cargando catálogo...</Text>
            </View>
          ) : (
            <FlatList
              data={mobiliarioModalFiltrado}
              keyExtractor={(item) => String(item.mueble_id)}
              contentContainerStyle={[styles.lista, { paddingBottom: 20 }]}
              ListEmptyComponent={
                <View style={styles.vacio}>
                  <Text style={styles.tituloVacio}>No se encontraron mobiliarios</Text>
                </View>
              }
              renderItem={({ item }) => {
                const cant = parseInt(item.cantidad) || 0;
                const stockTot = parseInt(item.stock_total) || 0;
                const restante = Math.max(0, stockTot - cant);
                const otraSuc = sucursales.find((s) => s.id !== sucursalSeleccionada?.id);

                return (
                  <View style={[styles.filaItemModal, cant > 0 && styles.filaItemModalActivo]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.nombreItemModal}>{item.nombre}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {item.categoria_nombre ? (
                          <Text style={styles.categoriaItemModal}>{item.categoria_nombre} •</Text>
                        ) : null}
                        <View style={styles.badgeStockRef}>
                          <Text style={styles.badgeStockRefTexto}>Stock Ref: {stockTot}</Text>
                        </View>
                      </View>
                      {otraSuc && sucursales.length === 2 ? (
                        <Text style={styles.textoRestanteOtra}>
                          ➡️ Quedará en {otraSuc.nombre}: {restante} piezas
                        </Text>
                      ) : null}
                    </View>

                    {/* Controles de cantidad: - [input] + */}
                    <View style={styles.controlesContador}>
                      <TouchableOpacity
                        style={styles.btnContadorMenos}
                        onPress={() => modificarCantidadSede(item.mueble_id, -1)}
                      >
                        <Text style={styles.btnContadorTexto}>-</Text>
                      </TouchableOpacity>

                      <TextInput
                        style={styles.inputContadorDirecto}
                        keyboardType="numeric"
                        value={String(cant)}
                        onChangeText={(txt) => setCantidadSedeDirecta(item.mueble_id, txt)}
                      />

                      <TouchableOpacity
                        style={styles.btnContadorMas}
                        onPress={() => modificarCantidadSede(item.mueble_id, 1)}
                      >
                        <Text style={styles.btnContadorTexto}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Botones inferiores del Modal */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnFooterCancelar}
              onPress={() => setModalInventarioVisible(false)}
            >
              <Text style={styles.btnFooterCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnFooterGuardar}
              onPress={guardarInventarioSede}
              disabled={guardandoInventario}
            >
              {guardandoInventario ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnFooterGuardarTexto}>💾 Guardar Cantidades</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL: CREAR / EDITAR SUCURSAL ── */}
      <Modal
        visible={modalSucursalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalSucursalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {sucursalEditando ? `✏️ Editar Sede` : '🏢 Nueva Sucursal'}
              </Text>
              <TouchableOpacity
                style={styles.modalBtnCerrar}
                onPress={() => setModalSucursalVisible(false)}
              >
                <Text style={styles.modalBtnCerrarTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.formGrupo}>
                <Text style={styles.labelForm}>Nombre de la Sucursal / Sede *</Text>
                <TextInput
                  style={styles.inputForm}
                  placeholder="Ej: Sucursal Central / Bodega Este"
                  placeholderTextColor="#94a3b8"
                  value={formSucursal.nombre}
                  onChangeText={(txt) => setFormSucursal({ ...formSucursal, nombre: txt })}
                />
              </View>

              <View style={styles.formGrupo}>
                <Text style={styles.labelForm}>Código Interno</Text>
                <TextInput
                  style={styles.inputForm}
                  placeholder="SUC-01"
                  placeholderTextColor="#94a3b8"
                  value={formSucursal.codigo}
                  onChangeText={(txt) => setFormSucursal({ ...formSucursal, codigo: txt })}
                />
              </View>

              <View style={styles.formGrupo}>
                <Text style={styles.labelForm}>Dirección Física</Text>
                <TextInput
                  style={styles.inputForm}
                  placeholder="Calle, edificio o punto de referencia"
                  placeholderTextColor="#94a3b8"
                  value={formSucursal.direccion}
                  onChangeText={(txt) => setFormSucursal({ ...formSucursal, direccion: txt })}
                />
              </View>

              <View style={styles.formGrupo}>
                <Text style={styles.labelForm}>Teléfono / WhatsApp</Text>
                <TextInput
                  style={styles.inputForm}
                  placeholder="Ej: 6000-0000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={formSucursal.telefono}
                  onChangeText={(txt) => setFormSucursal({ ...formSucursal, telefono: txt })}
                />
              </View>

              <View style={styles.formGrupo}>
                <Text style={styles.labelForm}>Encargado / Responsable</Text>
                <TextInput
                  style={styles.inputForm}
                  placeholder="Nombre de la persona a cargo"
                  placeholderTextColor="#94a3b8"
                  value={formSucursal.encargado}
                  onChangeText={(txt) => setFormSucursal({ ...formSucursal, encargado: txt })}
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormSucursal({ ...formSucursal, es_principal: !formSucursal.es_principal })}
              >
                <View style={[styles.checkboxBox, formSucursal.es_principal && styles.checkboxBoxActivo]}>
                  {formSucursal.es_principal && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={styles.checkboxTexto}>Marcar como Sede Principal / Bodega Central</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnFooterCancelar}
                onPress={() => setModalSucursalVisible(false)}
              >
                <Text style={styles.btnFooterCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnFooterGuardar}
                onPress={guardarSucursal}
                disabled={guardandoSucursal}
              >
                {guardandoSucursal ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnFooterGuardarTexto}>
                    {sucursalEditando ? 'Actualizar' : 'Registrar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  btnNuevaSede: {
    backgroundColor: '#4a6cf7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnNuevaSedeTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pestanasRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pestana: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
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
  puntoCambios: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
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
  tarjetaPrincipal: {
    borderColor: '#4a6cf7',
    borderWidth: 1.5,
  },
  tarjetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nombreSede: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  codigoSede: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  badgePrincipal: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePrincipalTexto: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  datosSede: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 3,
  },
  datoFila: {
    fontSize: 12,
    color: '#334155',
  },
  contadorSedeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  contadorLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  contadorValor: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  btnVerMobiliario: {
    backgroundColor: '#4a6cf7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnVerMobiliarioTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  btnAccionPequeno: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccionPequenoTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Planilla Styles ──
  tarjetaPlanilla: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cabeceraMueblePlanilla: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
    marginBottom: 8,
  },
  nombreMueblePlanilla: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  categoriaMueblePlanilla: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  distribucionMueble: {
    gap: 6,
  },
  filaPlanillaSucursal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  filaPlanillaModificada: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
  },
  nombreSucursalPlanilla: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  controlesContador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnContadorMenos: {
    backgroundColor: '#e2e8f0',
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContadorMas: {
    backgroundColor: '#4a6cf7',
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContadorTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  numeroContador: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputContadorDirecto: {
    width: 48,
    height: 34,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  barraFlotanteGuardar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  btnGuardarFlotante: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  btnGuardarFlotanteTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── Modal Styles ──
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitulo: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalBtnCerrar: {
    padding: 6,
  },
  modalBtnCerrarTexto: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '700',
  },
  filaItemModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 6,
  },
  filaItemModalActivo: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  nombreItemModal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoriaItemModal: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  btnFooterCancelar: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnFooterCancelarTexto: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  btnFooterGuardar: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnFooterGuardarTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Form Styles ──
  formGrupo: {
    marginBottom: 12,
  },
  labelForm: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputForm: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActivo: {
    backgroundColor: '#4a6cf7',
    borderColor: '#4a6cf7',
  },
  checkboxTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  badgeStockRef: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeStockRefTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  textoRestanteOtra: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 3,
  },
  bannerInformativo: {
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerInformativoTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
});
