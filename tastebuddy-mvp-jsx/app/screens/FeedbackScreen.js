import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Button } from '../components/Button';
import { RadarChart } from '../components/RadarChart';
import { styles, theme } from '../styles/styles';

export default function FeedbackScreen({ vUser, recipe, onRated, onCancel, isRestaurantMode = false }) {
  const [rating, setRating] = useState(4);

  return (
    <View style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <Text style={styles.title}>Valora la receta</Text>
      <Text style={styles.subtitle}>{recipe.title}</Text>

      <View style={{ flexDirection: 'row', marginVertical: 12, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setRating(n)}
            style={{
              backgroundColor: rating === n ? theme.colors.primary : '#f0f0f0',
              padding: 10,
              borderRadius: 10,
              marginHorizontal: 6,
            }}
          >
            <Text style={{ color: rating === n ? 'white' : '#333', fontWeight: '700' }}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.subtitle}>
        {isRestaurantMode
          ? 'Esto ajustará el panel del local sin enviar datos fuera de la app.'
          : 'Esto ajustará tu perfil para futuras recomendaciones.'}
      </Text>
      <Button title="Guardar valoración" onPress={() => onRated(rating)} />

      <Button
        title="Volver sin calificar"
        onPress={onCancel}
        style={{ backgroundColor: '#6b7280', marginTop: 12 }}
      />

      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <RadarChart values={vUser} size={220} />
      </View>
    </View>
  );
}
