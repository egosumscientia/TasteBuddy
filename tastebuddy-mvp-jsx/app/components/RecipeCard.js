import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Chip } from './Chip';
import { theme } from '../styles/styles';

const prettyLevel = (value, defaultLabel) => {
  const map = { low: 'Bajo', medium: 'Medio', high: 'Alto', ok: 'OK' };
  return map[value] || defaultLabel;
};

const textBase = { fontFamily: theme.fonts.family, fontWeight: '500', color: theme.colors.text };

const Star = ({ filled, onPress }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 2, paddingVertical: 4 }}>
    <Text style={[textBase, { fontSize: 18, color: filled ? theme.colors.primary : '#ccc', fontWeight: '700' }]}>{filled ? '★' : '☆'}</Text>
  </Pressable>
);

export const RecipeCard = ({ item, isRestaurantMode, currentRating, ratingSummary, onRate, onSelect }) => {
  const isBusinessLabel = item.recommendationLabel && item.recommendationLabel.toLowerCase().includes('restaurante');
  const badgeBg = isBusinessLabel ? '#fff4e0' : '#e3f4e8';
  const badgeBorder = isBusinessLabel ? '#f7b733' : theme.colors.primary;
  const [hovered, setHovered] = useState(false);

  const baseStyle = {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: hovered ? '#f8fbf9' : '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hovered ? 3 : 1 },
    shadowOpacity: hovered ? 0.15 : 0.08,
    shadowRadius: hovered ? 6 : 3,
    elevation: hovered ? 4 : 1,
    transform: hovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
    transitionProperty: 'shadow-offset, shadow-radius, shadow-opacity, transform, background-color',
    transitionDuration: '180ms',
    transitionTimingFunction: 'ease',
  };

  return (
    <Pressable
      onPress={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ pressed }) => {
        const active = hovered || pressed;
        return {
          ...baseStyle,
          backgroundColor: active ? '#f2f7f3' : baseStyle.backgroundColor,
          shadowOffset: { width: 0, height: active ? 4 : baseStyle.shadowOffset.height },
          shadowOpacity: active ? 0.18 : baseStyle.shadowOpacity,
          shadowRadius: active ? 7 : baseStyle.shadowRadius,
          elevation: active ? 5 : baseStyle.elevation,
          transform: active ? [{ translateY: -2 }] : baseStyle.transform,
        };
      }}
    >
      <Text style={[textBase, { fontSize: 16, fontWeight: '800', color: theme.colors.text }]}>{item.title}</Text>
      <Text style={[textBase, { color: theme.colors.textSecondary, marginVertical: 6, fontSize: 14, lineHeight: 18 }]}>
        Compatibilidad: {(item.score * 100).toFixed(0)}%
      </Text>

      {item.recommendationLabel && (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: badgeBg,
            borderColor: badgeBorder,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <Text style={[textBase, { color: theme.colors.text, fontWeight: '700' }]}>{item.recommendationLabel}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {item.tags.map((t) => (
          <Chip key={t} label={t} />
        ))}
      </View>
      <Text style={[textBase, { marginTop: 8 }]}>{`Ingredientes: ${item.ingredients.join(', ')}`}</Text>

      <View style={{ marginTop: 8 }}>
        <Text style={[textBase, { color: theme.colors.text, fontWeight: '700' }]}>
          Margen: {prettyLevel(item.margin, 'N/A')} · Inventario: {prettyLevel(item.inventory, 'N/A')}
        </Text>
        {item.reasonText && <Text style={[textBase, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item.reasonText}</Text>}
        {item.businessImpact && <Text style={[textBase, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item.businessImpact}</Text>}
        {!item.reasonText && isRestaurantMode && (
          <Text style={[textBase, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Recomendado porque equilibra gusto promedio, margen e inventario.
          </Text>
        )}
      </View>

      {isRestaurantMode && ratingSummary && (
        <View style={{ marginTop: 8 }}>
          <Text style={[textBase, { color: theme.colors.text, fontWeight: '700' }]}>
            Rating promedio: {ratingSummary.average.toFixed(1)} ({ratingSummary.count} voto{ratingSummary.count === 1 ? '' : 's'})
          </Text>
          <Text style={[textBase, { color: theme.colors.textSecondary, marginTop: 4 }]}>{ratingSummary.label}</Text>
        </View>
      )}

      {!isRestaurantMode && (
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[textBase, { color: theme.colors.text, fontWeight: '700', marginRight: 8 }]}>Valora:</Text>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} filled={currentRating ? currentRating >= n : false} onPress={() => onRate && onRate(n)} />
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
};
