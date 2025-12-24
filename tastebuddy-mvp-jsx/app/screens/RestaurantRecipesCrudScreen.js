import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { styles, theme } from '../styles/styles';
import { useToast } from '../hooks/useToast';

const API_BASE = 'http://localhost:3000/admin/recipes';
const emptyVector = Array(7).fill('0.5');

export default function RestaurantRecipesCrudScreen() {
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formId, setFormId] = useState(null);
  const [name, setName] = useState('');
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [tasteInputs, setTasteInputs] = useState(emptyVector);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const parsedVector = useMemo(
    () =>
      tasteInputs.map((v) => {
        const num = parseFloat(v);
        if (!Number.isFinite(num)) return 0;
        if (num < 0) return 0;
        if (num > 1) return 1;
        return num;
      }),
    [tasteInputs],
  );

  const fetchRecipes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('fetch_error');
      const data = await res.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('No se pudieron cargar las recetas.');
      addToast('No se pudieron cargar las recetas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const resetForm = () => {
    setFormId(null);
    setName('');
    setIngredientsInput('');
    setTasteInputs(emptyVector);
    setFeatured(false);
    setShowModal(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nombre requerido.');
      addToast('Nombre requerido.', 'error');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        ingredients: ingredientsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        taste_v: parsedVector,
        featured,
      };
      const res = await fetch(formId ? `${API_BASE}/${formId}` : API_BASE, {
        method: formId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save_error');
      await fetchRecipes();
      resetForm();
      addToast(formId ? 'Receta actualizada' : 'Receta creada', 'success');
    } catch (e) {
      setError('No se pudo guardar la receta.');
      addToast('No se pudo guardar la receta.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (recipe) => {
    setFormId(recipe.id);
    setName(recipe.name || '');
    setIngredientsInput(Array.isArray(recipe.ingredients) ? recipe.ingredients.join(', ') : '');
    setTasteInputs(
      Array.isArray(recipe.taste_v) && recipe.taste_v.length
        ? recipe.taste_v.map((n) => String(Number(n).toFixed(2)))
        : emptyVector,
    );
    setFeatured(Boolean(recipe.featured));
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete_error');
      await fetchRecipes();
      if (formId === id) resetForm();
      addToast('Receta eliminada', 'success');
    } catch (e) {
      setError('No se pudo eliminar la receta.');
      addToast('No se pudo eliminar la receta.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return recipes;
    return recipes.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const id = String(r.id || '').toLowerCase();
      const ingredients = Array.isArray(r.ingredients) ? r.ingredients.join(', ').toLowerCase() : '';
      return name.includes(term) || ingredients.includes(term) || id.includes(term);
    });
  }, [recipes, searchTerm]);

  const renderRecipe = ({ item }) => (
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
        <Text style={{ fontWeight: '800', color: theme.colors.text, fontFamily: theme.fonts.family }}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {item.featured && (
            <View style={{ backgroundColor: '#e6f7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#c8ead2' }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '800', fontFamily: theme.fonts.family }}>Destacada</Text>
            </View>
          )}
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.family }}>ID {item.id}</Text>
        </View>
      </View>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 6, fontFamily: theme.fonts.family }}>
        Ingredientes: {Array.isArray(item.ingredients) ? item.ingredients.join(', ') : 'N/A'}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.fonts.family }}>
        Vector: {Array.isArray(item.taste_v) ? item.taste_v.map((n) => Number(n).toFixed(2)).join(', ') : 'N/A'}
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
      <Text style={[styles.title, { marginBottom: 8 }]}>Recetas (CRUD)</Text>
      <Text style={[styles.subtitle, { marginBottom: 16 }]}>
        Gestiona recetas del modo restaurante.
      </Text>

      <Button title="Nueva receta" onPress={() => { resetForm(); setShowModal(true); }} style={{ marginBottom: 14 }} />

      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Filtrar por nombre, ingrediente o ID"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 10,
          marginBottom: 14,
          fontFamily: theme.fonts.family,
        }}
        placeholderTextColor={theme.colors.textSecondary}
      />

      {loading ? (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRecipe}
          ListEmptyComponent={<Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.family }}>Sin recetas registradas.</Text>}
          scrollEnabled={false}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, maxHeight: '90%' }}>
            <ScrollView>
              <Text style={{ fontWeight: '800', marginBottom: 10, fontFamily: theme.fonts.family }}>
                {formId ? `Editar receta #${formId}` : 'Nueva receta'}
              </Text>
              <TextInput
                placeholder="Nombre"
                value={name}
                onChangeText={setName}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  fontFamily: theme.fonts.family,
                }}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.text, fontFamily: theme.fonts.family }}>Destacada</Text>
                <Switch
                  value={featured}
                  onValueChange={setFeatured}
                  thumbColor={featured ? theme.colors.primary : '#f4f3f4'}
                  trackColor={{ false: '#d9d9d9', true: '#b9e5c7' }}
                />
              </View>
              <TextInput
                placeholder="Ingredientes separados por coma"
                value={ingredientsInput}
                onChangeText={setIngredientsInput}
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
              <Text style={{ fontWeight: '700', marginBottom: 6, fontFamily: theme.fonts.family }}>Vector de sabor (0-1)</Text>
              {tasteInputs.map((val, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ width: 28, fontWeight: '700', color: theme.colors.text, fontFamily: theme.fonts.family }}>{idx + 1}</Text>
                  <TextInput
                    value={val}
                    onChangeText={(t) => {
                      const next = [...tasteInputs];
                      next[idx] = t;
                      setTasteInputs(next);
                    }}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 10,
                      padding: 8,
                      fontFamily: theme.fonts.family,
                    }}
                    placeholder="0.0"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              ))}
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
