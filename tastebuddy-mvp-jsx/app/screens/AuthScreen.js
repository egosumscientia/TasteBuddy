import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Image } from 'react-native';
import { Button } from '../components/Button';
import { styles, theme } from '../styles/styles';
import { useUser } from '../context/UserContext';
import { useToast } from '../hooks/useToast';

const API_BASE = 'http://localhost:3000/auth';

export default function AuthScreen({ onAuthenticated }) {
  const { setUserId, setUserEmail, setUserRole } = useUser();
  const { addToast } = useToast();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'), [mode]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const emailValid = trimmedEmail.includes('@') && trimmedEmail.length <= 255;
    const minPassword = mode === 'signup' ? 6 : 1;
    if (!emailValid || trimmedPassword.length < minPassword) {
      const msg = mode === 'signup' ? 'Email válido y contraseña mínima de 6 caracteres.' : 'Ingresa email y contraseña.';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword, role: mode === 'signup' ? role : undefined }),
      });
      if (!res.ok) {
        const msg = mode === 'signup' && res.status === 409 ? 'El email ya existe.' : 'No se pudo autenticar.';
        throw new Error(msg);
      }
      const data = await res.json();
      if (data?.user?.id) {
        setUserId(data.user.id);
        setUserEmail(data.user.email || email.trim());
        setUserRole(data.user.role || 'user');
        addToast(mode === 'login' ? 'Sesión iniciada correctamente' : 'Cuenta creada con éxito', 'success');
        if (onAuthenticated) onAuthenticated(mode === 'signup' ? 'onboarding' : 'radar');
      } else {
        throw new Error('Respuesta inválida');
      }
    } catch (e) {
      const msg = e.message || 'Error de autenticación.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white', padding: 20, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image source={require('../../assets/logo_header.png')} style={{ width: 340, height: 220, resizeMode: 'contain' }} />
      </View>
      <Text style={[styles.title, { marginBottom: 6, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.subtitle, { marginBottom: 18, textAlign: 'center' }]}>
        Accede con tu email para cargar o crear tu perfil.
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {['login', 'signup'].map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: mode === m ? theme.colors.primary : theme.colors.border,
              backgroundColor: mode === m ? '#e9f5ed' : '#f8f9fb',
              borderRadius: 10,
              marginRight: m === 'login' ? 8 : 0,
              marginLeft: m === 'signup' ? 8 : 0,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
              {m === 'login' ? 'Login' : 'Signup'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          fontFamily: theme.fonts.family,
        }}
        placeholderTextColor={theme.colors.textSecondary}
      />

      <TextInput
        placeholder="Contraseña"
        autoCapitalize="none"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          fontFamily: theme.fonts.family,
        }}
        placeholderTextColor={theme.colors.textSecondary}
      />

      {mode === 'signup' && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {['user', 'admin'].map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: role === r ? theme.colors.primary : theme.colors.border,
                backgroundColor: role === r ? '#e9f5ed' : '#f8f9fb',
                borderRadius: 10,
                marginRight: r === 'user' ? 8 : 0,
                marginLeft: r === 'admin' ? 8 : 0,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{r === 'user' ? 'Usuario' : 'Admin'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Button title={loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'} onPress={handleSubmit} style={{ opacity: loading ? 0.7 : 1 }} />

      {loading && (
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}
