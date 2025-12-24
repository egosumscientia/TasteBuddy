import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { styles, theme } from '../styles/styles';
import { useToast } from '../hooks/useToast';

const API_BASE = 'http://localhost:3000/admin/users';

export default function RestaurantUsersCrudScreen() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formId, setFormId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('fetch_error');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('No se pudieron cargar los usuarios.');
      addToast('No se pudieron cargar los usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormId(null);
    setEmail('');
    setPassword('');
    setShowModal(false);
  };

  const handleSave = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordTrim = password.trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Email requerido y debe ser válido.');
      addToast('Email requerido y debe ser válido.', 'error');
      return;
    }

    if (!formId) {
      if (!passwordTrim) {
        setError('Email y contraseña requeridos para crear.');
        addToast('Email y contraseña requeridos para crear.', 'error');
        return;
      }
      if (passwordTrim.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        addToast('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }
    } else if (passwordTrim && passwordTrim.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      addToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    const payload = { email: normalizedEmail };
    if (passwordTrim) payload.password = passwordTrim;

    setSaving(true);
    setError('');
    try {
      const res = await fetch(formId ? `${API_BASE}/${formId}` : API_BASE, {
        method: formId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data.error === 'email_exists'
            ? 'Email ya registrado.'
            : data.error === 'invalid_password'
              ? 'La contraseña debe tener al menos 6 caracteres.'
              : data.error === 'email_password_required'
                ? 'Email válido y contraseña mínima 6 caracteres son requeridos.'
                : data.error === 'invalid_email'
                  ? 'Email no válido.'
                  : 'No se pudo guardar el usuario.';
        throw new Error(msg);
      }
      await fetchUsers();
      resetForm();
      addToast(formId ? 'Usuario actualizado' : 'Usuario creado', 'success');
    } catch (e) {
      setError(e.message || 'Error inesperado.');
      addToast(e.message || 'Error inesperado.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setFormId(user.id);
    setEmail(user.email || '');
    setPassword('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data.error === 'forbidden_admin_user'
            ? 'No puedes borrar otros admins.'
            : data.error === 'user_not_found'
              ? 'Usuario no encontrado.'
              : 'No se pudo eliminar el usuario.';
        throw new Error(msg);
      }
      await fetchUsers();
      if (formId === id) resetForm();
      addToast('Usuario eliminado', 'success');
    } catch (e) {
      setError(e.message || 'No se pudo eliminar el usuario.');
      addToast(e.message || 'No se pudo eliminar el usuario.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderUser = ({ item }) => (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fff',
        ...theme.shadow.base,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '800', color: theme.colors.text, fontFamily: theme.fonts.family }}>{item.email}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.family }}>ID {item.id}</Text>
      </View>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.fonts.family }}>
        Rol: {item.role || 'user'}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.fonts.family }}>
        Alta: {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
        <Button title="Editar" onPress={() => handleEdit(item)} style={{ flex: 1 }} />
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: pressed ? '#fbeaea' : '#fff5f5',
            borderWidth: 1,
            borderColor: '#f1c6c6',
            ...theme.shadow.base,
          })}
        >
          <Text style={{ color: '#c53030', fontWeight: '800', fontFamily: theme.fonts.family }}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, backgroundColor: 'white', flexGrow: 1 }}>
      <Text style={[styles.title, { marginBottom: 8 }]}>Gestión de clientes</Text>
      <Text style={[styles.subtitle, { marginBottom: 16 }]}>
        Administra altas, ediciones y bajas de cuentas con rol usuario.
      </Text>

      <Button title="Nuevo usuario" onPress={() => { resetForm(); setShowModal(true); }} style={{ marginBottom: 14 }} />

      {loading ? (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          ListEmptyComponent={<Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.family }}>Sin usuarios registrados.</Text>}
          scrollEnabled={false}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, maxHeight: '90%' }}>
            <ScrollView>
              <Text style={{ fontWeight: '800', marginBottom: 10, fontFamily: theme.fonts.family }}>
                {formId ? `Editar usuario #${formId}` : 'Nuevo usuario'}
              </Text>
              <TextInput
                placeholder="Email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 12,
                  fontFamily: theme.fonts.family,
                }}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TextInput
                placeholder={formId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 12,
                  fontFamily: theme.fonts.family,
                }}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Button title={formId ? 'Actualizar' : 'Crear'} onPress={handleSave} style={{ flex: 1, opacity: saving ? 0.7 : 1 }} />
                <Pressable
                  onPress={resetForm}
                  disabled={saving}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderRadius: 12,
                    backgroundColor: pressed ? '#eef2f7' : '#f5f7fa',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    ...theme.shadow.base,
                    opacity: saving ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontFamily: theme.fonts.family }}>Cancelar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
