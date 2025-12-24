import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../styles/theme';
import { useToast } from '../hooks/useToast';

const toneMap = {
  success: { bg: '#e6f7eb', border: '#c8ead2', text: theme.colors.primary },
  error: { bg: '#fff0f0', border: '#f5c2c2', text: '#c53030' },
  info: { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
};

export function ToastContainer() {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <View style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, width: '320px', gap: 10 }}>
      {toasts.map((t) => {
        const tone = toneMap[t.type] || toneMap.info;
        return (
          <View
            key={t.id}
            style={{
              backgroundColor: tone.bg,
              borderColor: tone.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text style={{ color: tone.text, fontWeight: '800', fontFamily: theme.fonts.family, marginBottom: 4 }}>
              {t.type === 'success' ? 'Éxito' : t.type === 'error' ? 'Error' : 'Aviso'}
            </Text>
            <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.family }}>{t.message}</Text>
          </View>
        );
      })}
    </View>
  );
}
