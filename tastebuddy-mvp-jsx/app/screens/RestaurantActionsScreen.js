import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { styles, theme } from '../styles/styles';
import { cosine } from '../utils/math';
import { Chip } from '../components/Chip';

const API_RECIPES = 'http://localhost:3000/admin/recipes';
const DIM_LABELS = ['Dulce', 'Salado', 'Acido', 'Amargo', 'Umami', 'Picante', 'Crujiente'];

const topTagsFromVector = (vec = []) =>
  vec
    .map((v, idx) => ({ label: DIM_LABELS[idx], value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((t) => t.label);

const ActionButtons = ({ id, featured, saving, onToggleFeatured, onGoCrud }) => (
  <View style={{ flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' }}>
    <Pressable
      onPress={() => onToggleFeatured(!featured)}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: pressed ? '#e6e6e6' : featured ? '#e6f7eb' : '#f5f5f5',
        borderWidth: 1,
        borderColor: featured ? '#c8ead2' : '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: pressed ? 2 : 1 },
        shadowOpacity: pressed ? 0.16 : 0.1,
        shadowRadius: pressed ? 4 : 2,
        elevation: pressed ? 3 : 1,
        marginRight: 8,
        marginBottom: 8,
        opacity: saving ? 0.6 : 1,
      })}
      disabled={saving}
    >
      <Text style={{ color: theme.colors.primary, fontWeight: '800', fontFamily: theme.fonts.family }}>
        {featured ? 'Quitar destacado' : 'Destacar'}
      </Text>
    </Pressable>
    <Pressable
      onPress={onGoCrud}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: pressed ? '#eef2f7' : '#f5f7fa',
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: pressed ? 2 : 1 },
        shadowOpacity: pressed ? 0.16 : 0.08,
        shadowRadius: pressed ? 4 : 2,
        elevation: pressed ? 3 : 1,
        marginRight: 8,
        marginBottom: 8,
      })}
    >
      <Text style={{ color: theme.colors.text, fontWeight: '800', fontFamily: theme.fonts.family }}>Ir a CRUD</Text>
    </Pressable>
  </View>
);

const ActionCard = ({ item, onGoCrud, onToggleFeatured, saving }) => (
  <View
    style={{
      backgroundColor: '#fff',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
      ...theme.shadow.base,
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '900',
          color: theme.colors.text,
          fontFamily: theme.fonts.family,
        }}
      >
        {item.title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {item.featured && (
          <View
            style={{
              backgroundColor: '#e6f7eb',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#c8ead2',
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontFamily: theme.fonts.family }}>Destacada</Text>
          </View>
        )}
        <View
          style={{
            backgroundColor: '#e9f4ed',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#d2e7d8',
          }}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontFamily: theme.fonts.family }}>
            Match {(item.tasteScore * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {item.tags.map((tag) => (
        <Chip key={tag} label={tag} style={{ marginBottom: 6 }} />
      ))}
    </View>

    <Text
      style={{
        color: theme.colors.textSecondary,
        marginTop: 6,
        lineHeight: 20,
        fontFamily: theme.fonts.family,
      }}
    >
      {item.reasonText}
    </Text>

    <ActionButtons
      id={item.id}
      featured={item.featured}
      onToggleFeatured={(value) => onToggleFeatured(item.id, value)}
      onGoCrud={onGoCrud}
      saving={saving}
    />
  </View>
);

const Section = ({ title, items, onGoCrud, onToggleFeatured, savingId }) => (
  <View style={{ marginBottom: 18 }}>
    <Text
      style={{
        fontWeight: '900',
        fontSize: 18,
        marginBottom: 10,
        color: theme.colors.text,
        fontFamily: theme.fonts.family,
      }}
    >
      {title}
    </Text>
    {items.map((item) => (
      <ActionCard
        key={`${title}-${item.id}`}
        item={item}
        onGoCrud={onGoCrud}
        onToggleFeatured={onToggleFeatured}
        saving={savingId === item.id}
      />
    ))}
    {items.length === 0 && (
      <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.family }}>Sin datos para esta seccion.</Text>
    )}
  </View>
);

export default function RestaurantActionsScreen({ onBack, averageProfile = [], onGoCrud }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let active = true;
    const fetchRecipes = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(API_RECIPES);
        if (!res.ok) throw new Error('fetch_error');
        const data = await res.json();
        if (active) setRecipes(Array.isArray(data) ? data : []);
      } catch (e) {
        if (active) setError('No se pudieron cargar las recetas del servidor.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRecipes();
    return () => {
      active = false;
    };
  }, []);

  const scoredRecipes = useMemo(() => {
    const avg = averageProfile || [];
    return recipes.map((recipe) => {
      const vec = Array.isArray(recipe.taste_v) && recipe.taste_v.length ? recipe.taste_v : Array(avg.length || 7).fill(0);
      const tasteSimilarity = cosine(vec, avg);
      const tasteScore = (tasteSimilarity + 1) / 2;
      return {
        id: recipe.id,
        title: recipe.name || 'Receta',
        tags: topTagsFromVector(vec),
        tasteScore,
        featured: Boolean(recipe.featured),
        reasonText: `Coincidencia con el paladar promedio: ${(tasteScore * 100).toFixed(0)}%`,
      };
    });
  }, [averageProfile, recipes]);

  const sortedRecipes = useMemo(() => {
    return [...scoredRecipes].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.tasteScore - a.tasteScore;
    });
  }, [scoredRecipes]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedRecipes.filter((r) => {
      if (!term) return true;
      const name = (r.title || '').toLowerCase();
      const tags = (r.tags || []).join(' ').toLowerCase();
      const id = String(r.id || '').toLowerCase();
      return name.includes(term) || tags.includes(term) || id.includes(term);
    });
  }, [sortedRecipes, searchTerm]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, backgroundColor: 'white' }}>
      {onBack && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: pressed ? '#e6e6e6' : '#f5f5f5',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            marginBottom: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: pressed ? 2 : 1 },
            shadowOpacity: pressed ? 0.14 : 0.08,
            shadowRadius: pressed ? 4 : 2,
            elevation: pressed ? 3 : 1,
          })}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontFamily: theme.fonts.family }}>Volver</Text>
        </Pressable>
      )}
      <Text style={[styles.title, { marginBottom: 6 }]}>Acciones sugeridas</Text>
      <Text style={[styles.subtitle, { marginBottom: 16, fontSize: 15, lineHeight: 20 }]}>
        Resaltamos recetas del backend que mejor encajan con el paladar promedio del local.
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 14,
          backgroundColor: '#f9fafb',
        }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.family, marginBottom: 4, fontWeight: '700' }}>
          Filtrar por nombre, tag o ID
        </Text>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Ej: pizza, dulce, 123"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            fontFamily: theme.fonts.family,
            color: theme.colors.text,
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: 'white',
          }}
        />
      </View>

      {loading && (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}
      {!loading && (
        <Section
          title="Todas las recetas (ordenadas: destacadas primero)"
          items={filtered.length ? filtered : sortedRecipes}
          onGoCrud={onGoCrud}
          onToggleFeatured={async (id, value) => {
            setSavingId(id);
            try {
              const res = await fetch(`${API_RECIPES}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featured: value }),
              });
              if (!res.ok) throw new Error('update_error');
              const updated = await res.json();
              setRecipes((prev) => prev.map((r) => (r.id === updated.id ? { ...r, featured: updated.featured } : r)));
            } catch (e) {
              setError('No se pudo actualizar destacado.');
            } finally {
              setSavingId(null);
            }
          }}
          savingId={savingId}
        />
      )}
    </ScrollView>
  );
}
