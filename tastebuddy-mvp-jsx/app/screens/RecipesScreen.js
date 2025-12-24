import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { styles, theme } from '../styles/styles';
import { useUser } from '../context/UserContext';

const fontFamily = theme.fonts.family;

export default function RecipesScreen({
  vUser,
  isRestaurantMode,
  restaurantProfile,
  recipeRatings = {},
  onRateRecipe,
}) {
  const { userId } = useUser();
  const [recipes, setRecipes] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratingError, setRatingError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const titleText = isRestaurantMode ? 'Panel del local' : 'Recomendaciones';
  const subtitleText = isRestaurantMode
    ? 'Optimiza platos según el perfil promedio y disponibilidad.'
    : 'Descubre las recetas mejor puntuadas para tu perfil.';

  const getUserRating = (recipe) => {
    if (!recipe) return 0;
    const mapRating = recipeRatings[recipe.id];
    if (mapRating) return mapRating;
    return recipe.user_rating || 0;
  };

  useEffect(() => {
    let active = true;
    const fetchRecipes = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ userId });
        if (query.trim()) {
          params.append('q', query);
        }
        const res = await fetch(`http://localhost:3000/recipes?${params.toString()}`);
        if (!res.ok) {
          throw new Error('fetch_error');
        }
        const data = await res.json();
        if (active) {
          setRecipes(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (active) {
          setError('No se pudieron cargar las recetas.');
          setRecipes([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchRecipes();
    return () => {
      active = false;
    };
  }, [query, userId]);

  const handleRate = async (recipe, value) => {
    setRatingError(null);
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, user_rating: value } : r))
    );
    try {
      const res = await fetch(`http://localhost:3000/recipes/${recipe.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating: value }),
      });
      if (!res.ok) {
        throw new Error('rate_error');
      }
      const data = await res.json();
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipe.id
            ? {
              ...r,
              user_rating: data.user_rating ?? value,
              avg_rating: data.avg_rating ?? r.avg_rating,
              acceptance_score: data.acceptance_score ?? r.acceptance_score,
            }
            : r
        )
      );
      if (onRateRecipe) {
        onRateRecipe({ ...recipe, v: recipe.taste_v }, value);
      }
    } catch (e) {
      setRatingError('No se pudo guardar la calificacion.');
    }
  };

  const renderStars = (recipe) => {
    const current = getUserRating(recipe);
    return (
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => handleRate(recipe, n)} style={{ paddingHorizontal: 4 }}>
            <Text
              style={{
                fontSize: 18,
                color: current >= n ? theme.colors.primary : '#ccc',
                fontWeight: '800',
                fontFamily,
              }}
            >
              *
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const formatAcceptance = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${Math.round(value * 100)}%`;
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        fontFamily,
      }}
    >
      <Text style={[styles.title, { marginBottom: 4, fontFamily }]}>
        {titleText}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          marginBottom: 12,
          fontSize: 14,
          fontFamily,
        }}
      >
        {subtitleText}
      </Text>
      <TextInput
        placeholder="Ingredientes que tienes (coma separada)"
        value={query}
        onChangeText={setQuery}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
          backgroundColor: '#f9fafb',
          fontSize: 15,
          color: theme.colors.text,
          fontFamily,
          outlineWidth: 0,
          outlineColor: 'transparent',
          boxShadow: 'none',
        }}
        placeholderTextColor={theme.colors.textSecondary}
      />

      {loading && (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontFamily }}>Cargando recetas...</Text>
        </View>
      )}

      {error && (
        <View style={{ paddingVertical: 12 }}>
          <Text style={{ color: 'red', fontFamily }}>{error}</Text>
        </View>
      )}
      {ratingError && (
        <View style={{ paddingVertical: 8 }}>
          <Text style={{ color: 'red', fontFamily }}>{ratingError}</Text>
        </View>
      )}

      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={({ pressed }) => {
              const active = pressed || hoveredId === item.id;
              return {
                borderWidth: 1,
                borderColor: active ? theme.colors.primary : '#e6e6e6',
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                backgroundColor: active ? '#f7fbf8' : '#fff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: active ? 6 : 2 },
                shadowOpacity: active ? 0.18 : 0.1,
                shadowRadius: active ? 8 : 4,
                elevation: active ? 4 : 2,
                transform: [{ translateY: active ? -2 : 0 }],
                transitionProperty: 'transform, box-shadow, border-color, background-color',
                transitionDuration: '180ms',
                transitionTimingFunction: 'ease',
              };
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '900',
                    color: theme.colors.text,
                    fontFamily,
                  }}
                >
                  {item.name}
                </Text>
                {item.featured && (
                  <View
                    style={{
                      backgroundColor: '#e6f7eb',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#c8ead2',
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12, fontFamily }}>Destacada</Text>
                  </View>
                )}
              </View>
              <View
                style={{
                  backgroundColor: '#e8f3ed',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#cde3d6',
                }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '800',
                    fontSize: 13,
                    fontFamily,
                  }}
                >
                  Score {Number(item.score).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <View
                style={{
                  backgroundColor: '#f4f6fb',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: '#e0e6f1',
                }}
              >
                <Text
                  style={{
                    color: '#556275',
                    fontWeight: '700',
                    fontSize: 12,
                    fontFamily,
                  }}
                >
                  Match {item.match_percentage ?? Math.round(item.score * 100)}%
                </Text>
              </View>
              {isRestaurantMode ? (
                <View
                  style={{
                    backgroundColor: '#fff4e6',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#f0d3ab',
                  }}
                >
                  <Text
                    style={{
                      color: '#c26d1c',
                      fontWeight: '700',
                      fontSize: 12,
                      fontFamily,
                    }}
                  >
                    Aceptacion {formatAcceptance(item.restaurant_metrics?.acceptance_score ?? item.acceptance_score)}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: '#eef7f0',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#d7e9dc',
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontWeight: '700',
                      fontSize: 12,
                      fontFamily,
                    }}
                  >
                    Tu rating: {getUserRating(item) ? `${getUserRating(item)}/5` : 'Sin calificar'}
                  </Text>
                </View>
              )}
            </View>

            {item.reason ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 20,
                  fontFamily,
                  fontWeight: item.featured ? '800' : '400',
                }}
              >
                {item.reason}
              </Text>
            ) : null}
            {Array.isArray(item.ingredients) && item.ingredients.length > 0 ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  marginTop: 6,
                  fontSize: 13,
                  fontFamily,
                }}
              >
                Ingredientes: {item.ingredients.join(', ')}
              </Text>
            ) : null}

            {!isRestaurantMode ? (
              <View style={{ marginTop: 8 }}>
                {renderStars(item)}
                {item.avg_rating ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      marginTop: 8,
                      fontSize: 13,
                      fontFamily,
                    }}
                  >
                    Rating promedio: {item.avg_rating} ({formatAcceptance(item.acceptance_score)} aceptacion)
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 4,
                    fontFamily,
                  }}
                >
                  Relevancia: {item.restaurant_metrics?.relevance ?? item.score}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 4,
                    fontFamily,
                  }}
                >
                  Match clientes: {item.restaurant_metrics?.match_percentage ?? item.match_percentage ?? Math.round(item.score * 100)}%
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 13,
                    marginBottom: 4,
                    fontFamily,
                  }}
                >
                  Aceptacion estimada: {item.restaurant_metrics?.acceptance_score ? formatAcceptance(item.restaurant_metrics.acceptance_score) : formatAcceptance(item.acceptance_score)}
                </Text>
                {item.avg_rating ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 13,
                      marginTop: 4,
                      fontFamily,
                    }}
                  >
                    Rating promedio: {item.avg_rating}
                  </Text>
                ) : null}
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && (
            <Text style={{ marginTop: 12, color: styles.subtitle.color, fontFamily }}>
              No hay recetas que coincidan con los ingredientes
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
