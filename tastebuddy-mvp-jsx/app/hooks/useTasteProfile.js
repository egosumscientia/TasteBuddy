import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';

const TasteProfileContext = createContext(null);
const API_BASE = 'http://localhost:3000';

const clamp = (v) => Math.max(0, Math.min(1, v));

export function TasteProfileProvider({ children }) {
  const { userId } = useUser();
  const [vUser, setVUser] = useState(null);
  const [recipeRatings, setRecipeRatings] = useState({});
  const [ratingsAggregate, setRatingsAggregate] = useState({ averageRating: null, count: 0 });
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setVUser(null);
    setRecipeRatings({});
    setRatingsAggregate({ averageRating: null, count: 0 });
    setSelectedRecipe(null);
    setProfileError(null);
    setDirty(false);
  }, [userId]);

  const upsertProfile = useCallback(
    async (vector) => {
      if (!userId || !Array.isArray(vector)) return null;
      const res = await fetch(`${API_BASE}/taste_profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, v: vector.map((n) => clamp(Number(n) || 0)) }),
      });
      if (!res.ok) throw new Error('profile_save_error');
      const data = await res.json();
      return Array.isArray(data.v) ? data.v.map((n) => clamp(Number(n) || 0)) : null;
    },
    [userId],
  );

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch(`${API_BASE}/taste_profile?userId=${userId}`);
      if (res.status === 404) {
        const fallback = Array(7).fill(0.5);
        const created = await upsertProfile(fallback);
        setVUser(created || fallback);
        return;
      }
      if (!res.ok) throw new Error('profile_fetch_error');
      const data = await res.json();
      const vector = Array.isArray(data.v) ? data.v.map((n) => clamp(Number(n) || 0)) : Array(7).fill(0);
      setVUser(vector);
    } catch (e) {
      setProfileError('profile_fetch_error');
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchRatingsAggregate = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ratings/aggregate`);
      if (!res.ok) throw new Error('aggregate_ratings_error');
      const data = await res.json();
      setRatingsAggregate({
        averageRating: data.average_rating ?? null,
        count: Number(data.rating_count || 0),
      });
    } catch (e) {
      setRatingsAggregate({ averageRating: null, count: 0 });
    }
  }, []);

  useEffect(() => {
    fetchRatingsAggregate();
  }, [fetchRatingsAggregate]);

  useEffect(() => {
    // cuando cambia el usuario, vuelve a cargar el agregado global
    if (userId) {
      fetchRatingsAggregate();
    }
  }, [userId, fetchRatingsAggregate]);

  const updateDimension = useCallback((index, value) => {
    setVUser((prev) => {
      const base = Array.isArray(prev) && prev.length ? [...prev] : Array(7).fill(0);
      const next = [...base];
      next[index] = clamp(value);
      return next;
    });
    setDirty(true);
  }, []);

  const persistProfile = useCallback(
    async (vectorOverride) => {
      if (!userId) return;
      const vector = vectorOverride || vUser;
      if (!Array.isArray(vector)) return;
      const saved = await upsertProfile(vector);
      if (Array.isArray(saved)) {
        setVUser(saved);
        setDirty(false);
      }
    },
    [userId, vUser, upsertProfile],
  );

  // Auto-guardado cuando el usuario ajusta el perfil
  useEffect(() => {
    if (!userId || !dirty) return;
    const handle = setTimeout(() => {
      persistProfile(vUser);
    }, 400);
    return () => clearTimeout(handle);
  }, [dirty, persistProfile, userId, vUser]);

  const rateRecipe = useCallback(
    async (recipe, rating) => {
      if (!recipe?.id || !userId) return;
      setRecipeRatings((prev) => ({ ...prev, [recipe.id]: rating }));
      const res = await fetch(`${API_BASE}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recipeId: recipe.id, rating }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.v)) {
          setVUser(data.v.map((n) => clamp(Number(n) || 0)));
        }
        fetchRatingsAggregate();
      }
    },
    [userId, fetchRatingsAggregate],
  );

  const value = useMemo(
    () => ({
      vUser,
      loadingProfile,
      profileError,
      recipeRatings,
      ratingsAggregate,
      selectedRecipe,
      selectRecipe: setSelectedRecipe,
      updateDimension,
      persistProfile,
      rateRecipe,
      fetchProfile,
      refreshRatingsAggregate: fetchRatingsAggregate,
    }),
    [
      vUser,
      loadingProfile,
      profileError,
      recipeRatings,
      ratingsAggregate,
      selectedRecipe,
      updateDimension,
      persistProfile,
      rateRecipe,
      fetchProfile,
      fetchRatingsAggregate,
    ],
  );

  return <TasteProfileContext.Provider value={value}>{children}</TasteProfileContext.Provider>;
}

export function useTasteProfile() {
  const ctx = useContext(TasteProfileContext);
  if (!ctx) {
    throw new Error('useTasteProfile must be used inside TasteProfileProvider');
  }
  return ctx;
}
