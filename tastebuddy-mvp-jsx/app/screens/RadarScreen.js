import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '../components/Button';
import { RadarChart } from '../components/RadarChart';
import { styles, theme } from '../styles/styles';

const DIM_LABELS = ['Dulce', 'Salado', 'Acido', 'Amargo', 'Umami', 'Picante', 'Crujiente'];

const getTopFlavors = (values, n = 3) =>
  values
    .map((v, idx) => ({ label: DIM_LABELS[idx], value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);

const textBase = { fontFamily: theme.fonts.family, fontWeight: '500', color: theme.colors.text };

const InteractiveCard = ({ title, items, tone }) => {
  const [hovered, setHovered] = useState(false);
  const main = items[0];
  const rest = items.slice(1);

  const active = hovered;

  return (
    <Pressable
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPressIn={() => setHovered(true)}
      onPressOut={() => setHovered(false)}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        backgroundColor: active ? '#ffffff' : tone,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: active ? 4 : 2 },
        shadowOpacity: active ? 0.15 : 0.1,
        shadowRadius: active ? 6 : 4,
        elevation: active ? 4 : 2,
        transform: active ? [{ translateY: -2 }] : [{ translateY: 0 }],
        cursor: 'pointer',
      }}
    >
      <Text style={[textBase, { fontWeight: '900', color: theme.colors.text, marginBottom: 10, fontSize: 16 }]}>
        {title}
      </Text>
      {main && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[textBase, { fontWeight: '900', fontSize: 30, color: theme.colors.primary, lineHeight: 34 }]}>
            {(main.value * 100).toFixed(0)}%
          </Text>
          <Text style={[textBase, { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 2 }]}>
            {main.label}
          </Text>
        </View>
      )}
      {rest.map((t) => {
        const pct = (t.value * 100).toFixed(0);
        return (
          <View key={t.label} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[textBase, { color: '#4b5563', fontSize: 15, fontWeight: '600' }]}>{t.label}</Text>
              <Text style={[textBase, { color: '#4b5563', fontSize: 15, fontWeight: '600' }]}>{pct}%</Text>
            </View>
            <View style={{ height: 7, borderRadius: 6, backgroundColor: '#e5e7eb', marginTop: 4 }}>
              <View
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 6,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </View>
          </View>
        );
      })}
    </Pressable>
  );
};

const InfoCard = ({ title, description, topFlavors }) => {
  const [hovered, setHovered] = useState(false);
  const active = hovered;
  return (
    <Pressable
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPressIn={() => setHovered(true)}
      onPressOut={() => setHovered(false)}
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: active ? '#eef7f0' : '#f6f8f7',
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: active ? 4 : 2 },
        shadowOpacity: active ? 0.14 : 0.08,
        shadowRadius: active ? 6 : 4,
        elevation: active ? 4 : 2,
        transform: active ? [{ translateY: -2 }] : [{ translateY: 0 }],
        cursor: 'pointer',
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ width: 6, height: 28, backgroundColor: theme.colors.primary, borderRadius: 4, marginRight: 10 }} />
        <Text style={[textBase, { fontWeight: '900', fontSize: 18, color: theme.colors.text }]}>{title}</Text>
      </View>
      <Text style={[textBase, { color: theme.colors.textSecondary, marginBottom: 8, lineHeight: 20 }]}>{description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {topFlavors.map((f) => (
          <Text
            key={f.label}
            style={[textBase, { color: theme.colors.text, marginRight: 12, fontWeight: '800', fontSize: 16 }]}
          >
            {f.label}: {(f.value * 100).toFixed(0)}%
          </Text>
        ))}
      </View>
    </Pressable>
  );
};

export default function RadarScreen({
  vUser,
  isRestaurantMode,
  averageProfile,
  averageProfileDay,
  profilesCount = 0,
  onGoRecipes,
  onGoRestaurantActions,
}) {
  const weeklyProfile = averageProfile || [];
  const dailyProfile = averageProfileDay && averageProfileDay.length ? averageProfileDay : weeklyProfile;
  const topWeekly = useMemo(() => getTopFlavors(weeklyProfile || []), [weeklyProfile]);
  const topDaily = useMemo(() => getTopFlavors(dailyProfile || []), [dailyProfile]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }}>
        <Text
          style={[
            styles.title,
            {
              fontSize: 30,
              fontWeight: '800',
              color: theme.colors.text,
              letterSpacing: -0.2,
            },
          ]}
        >
          Mapa de sabor
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              marginBottom: 18,
              fontSize: 17,
              color: theme.colors.textSecondary,
              fontWeight: '500',
            },
          ]}
        >
          {isRestaurantMode ? 'Vista del local y cliente promedio' : 'Tus gustos actuales y recomendaciones.'}
        </Text>

        {!isRestaurantMode && (
          <View>
            <InfoCard
              title="Recomendaciones basadas en tus gustos"
              description="Priorizamos los sabores que más te gustan. Ajusta tu perfil en “Tu perfil” para cambiar estas sugerencias."
              topFlavors={getTopFlavors(vUser, 3)}
            />
            <InfoCard
              title="Cómo elegimos"
              description="Ordenamos por similitud con tu perfil y los ingredientes que declaraste. Coincidencia alta en tus sabores dominantes recibe prioridad."
              topFlavors={getTopFlavors(vUser, 3)}
            />
          </View>
        )}

        {isRestaurantMode && (
          <View
            style={{
              alignItems: 'center',
              marginBottom: 24,
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#f2f7f3',
            }}
          >
            <Text
              style={{
                fontWeight: '800',
                marginBottom: 6,
                fontSize: 20,
                color: theme.colors.text,
                letterSpacing: -0.2,
              }}
            >
              Cliente promedio
            </Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 14, fontSize: 15, fontWeight: '500' }}>
              Perfil agregado del local
            </Text>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
              <RadarChart values={averageProfile} size={360} />
            </View>
          </View>
        )}

        {isRestaurantMode && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: '900', marginBottom: 12, fontSize: 18, color: theme.colors.text }}>
              Dashboard del local
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <InteractiveCard title="Top sabores estimados del dia" items={topDaily} tone="#e9f4ed" />
              <InteractiveCard title="Top sabores estimados de la semana" items={topWeekly} tone="#f5f0e6" />
            </View>
          </View>
        )}

        {isRestaurantMode ? (
          <Button
            title="Acciones sugeridas para hoy"
            onPress={onGoRestaurantActions}
            style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.primary }}
          />
        ) : (
          <Button
            title="Ver recomendaciones"
            onPress={onGoRecipes}
            style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.primary }}
          />
        )}
      </ScrollView>
    </View>
  );
}

