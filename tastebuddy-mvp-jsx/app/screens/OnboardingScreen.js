import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '../components/Button';
import { RadarChart } from '../components/RadarChart';
import { styles } from '../styles/styles';
import { useTasteProfile } from '../hooks/useTasteProfile';

const DIMENSIONS = [
  { key: 'dulce', label: 'Dulce' },
  { key: 'salado', label: 'Salado' },
  { key: 'acido', label: 'Ácido' },
  { key: 'amargo', label: 'Amargo' },
  { key: 'umami', label: 'Umami' },
  { key: 'picante', label: 'Picante' },
  { key: 'crujiente', label: 'Crujiente' },
];

export default function OnboardingScreen({ onComplete }) {
  const { vUser, updateDimension, persistProfile } = useTasteProfile();
  const vals = useMemo(() => (Array.isArray(vUser) && vUser.length ? vUser : DIMENSIONS.map(() => 0)), [vUser]);

  const setVal = (i, v) => {
    updateDimension(i, Math.max(0, Math.min(1, v)));
  };
  const onTrackPress = (i, evt) => {
    const rect = evt?.currentTarget?.getBoundingClientRect?.();
    const clientX =
      evt?.nativeEvent?.clientX ??
      evt?.clientX ??
      evt?.nativeEvent?.touches?.[0]?.clientX ??
      evt?.touches?.[0]?.clientX ??
      evt?.nativeEvent?.changedTouches?.[0]?.clientX ??
      evt?.changedTouches?.[0]?.clientX;
    if (!rect || typeof clientX !== 'number' || !Number.isFinite(clientX)) return;
    const ratioRaw = (clientX - rect.left) / rect.width;
    const ratio = Math.max(0, Math.min(1, ratioRaw));
    const newValuePct = Math.round(ratio * 100);
    if (!Number.isFinite(newValuePct)) return;
    setVal(i, newValuePct / 100);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: 'white' }}>
      <Text style={styles.title}>Tu perfil de sabor</Text>
      <Text style={styles.subtitle}>Ajusta cuánto te gusta cada dimensión.</Text>

      {DIMENSIONS.map((d, i) => (
        <View key={d.key} style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700' }}>{d.label}</Text>
            <Text>{(vals[i] * 100).toFixed(0)}%</Text>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
            <Button title="-" onPress={() => setVal(i, vals[i] - 0.1)} style={{ width: 48 }} />
            <Pressable
              onPress={(evt) => onTrackPress(i, evt)}
              onPointerDown={(evt) => onTrackPress(i, evt)}
              style={{ flex: 1, marginHorizontal: 8 }}
            >
              <View style={{ height: 10, backgroundColor: '#f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.max(0, Math.min(1, Number.isFinite(vals[i]) ? vals[i] : 0)) * 100}%`,
                    height: '100%',
                    backgroundColor: '#28a745',
                    borderRadius: 12,
                  }}
                />
              </View>
            </Pressable>
            <Button title="+" onPress={() => setVal(i, vals[i] + 0.1)} style={{ width: 48 }} />
          </View>
        </View>
      ))}

      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <RadarChart values={vals} />
      </View>

      <Button
        title="Continuar"
        onPress={async () => {
          try {
            await persistProfile();
            if (onComplete) onComplete();
          } catch (e) {}
        }}
      />
    </ScrollView>
  );
}
