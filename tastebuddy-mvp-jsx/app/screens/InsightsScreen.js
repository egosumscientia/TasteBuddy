import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles, theme } from '../styles/styles';

const DIM_LABELS = ['Dulce', 'Salado', 'Acido', 'Amargo', 'Umami', 'Picante', 'Crujiente'];

const getFlavorStats = (profile = []) =>
  profile.map((v, idx) => ({ label: DIM_LABELS[idx], value: v })).sort((a, b) => b.value - a.value);

const getRatingLabel = (avg) => {
  if (avg >= 4) return 'Alta aceptación';
  if (avg >= 2.5) return 'Aceptación media';
  return 'Baja aceptación';
};

export default function InsightsScreen({ averageProfile = [], recipeRatings = {}, ratingsAggregate = {} }) {
  const stats = useMemo(() => getFlavorStats(averageProfile), [averageProfile]);
  const topFlavors = stats.slice(0, 3);
  const lowFlavors = stats.slice(-3).reverse();

  const ratingValues = Object.values(recipeRatings || {});
  const localAvg = ratingValues.length ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : null;
  const aggregateAvg = ratingsAggregate?.averageRating ?? null;
  const aggregateCount = ratingsAggregate?.count ?? 0;
  const avgRating = aggregateAvg ?? localAvg;
  const hasRating = avgRating !== null && avgRating !== undefined;
  const ratingLabel = hasRating ? getRatingLabel(avgRating) : 'Sin datos de aceptación todavía.';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, backgroundColor: 'white', flexGrow: 1 }}>
      <Text style={[styles.title, { fontSize: theme.fonts.sizes.xxl, fontWeight: '700', fontFamily: theme.fonts.family }]}>Insights del local</Text>
      <Text style={[styles.subtitle, { marginBottom: 16, fontWeight: '500', color: theme.colors.textSecondary, fontFamily: theme.fonts.family }]}>
        Basado en perfil promedio y calificaciones existentes.
      </Text>

      <View
        style={{
          backgroundColor: '#eef7f0',
          borderRadius: 18,
          padding: 18,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 18,
        }}
      >
        <Text style={{ fontWeight: '900', fontSize: theme.fonts.sizes.xl, marginBottom: 6, color: theme.colors.primaryDark, fontFamily: theme.fonts.family }}>
          Aceptación estimada
        </Text>
        <Text style={{ fontWeight: '900', fontSize: 34, color: theme.colors.text, lineHeight: 42, fontFamily: theme.fonts.family }}>
          {hasRating ? `${avgRating.toFixed(2)} / 5` : 'Sin datos'}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, lineHeight: 18, fontFamily: theme.fonts.family }}>
          {hasRating
            ? aggregateCount
              ? `${ratingLabel} basada en ${aggregateCount} calificaciones.`
              : ratingLabel
            : 'Agrega calificaciones para ver la tendencia de aceptación.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 16 }}>
        {topFlavors.map((f) => (
          <View
            key={f.label}
            style={{
              width: '50%',
              paddingHorizontal: 6,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                backgroundColor: '#f9faf9',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>{f.label}</Text>
              <Text style={{ fontWeight: '900', fontSize: 24, color: theme.colors.primary, lineHeight: 30 }}>
                {(f.value * 100).toFixed(0)}%
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>Sabor dominante</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 16 }}>
        {lowFlavors.map((f) => (
          <View
            key={f.label}
            style={{
              width: '50%',
              paddingHorizontal: 6,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                backgroundColor: '#fff7f0',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>{f.label}</Text>
              <Text style={{ fontWeight: '900', fontSize: 24, color: theme.colors.text, lineHeight: 30 }}>
                {(f.value * 100).toFixed(0)}%
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>Baja aceptación</Text>
            </View>
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Text style={{ fontWeight: '900', fontSize: theme.fonts.sizes.lg, marginBottom: 6 }}>Interpretación</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.md, lineHeight: 22 }}>
          Prioriza platos alineados a los sabores dominantes y mantén inventario para ellos. Refuerza marketing sobre{' '}
          {topFlavors[0]?.label || 'los sabores clave'} y revisa ofertas para subir la aceptación de los sabores débiles. Ajusta
          compras si las calificaciones bajan.
        </Text>
      </View>
    </ScrollView>
  );
}
