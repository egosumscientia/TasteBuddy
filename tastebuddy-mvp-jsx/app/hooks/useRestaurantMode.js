import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'isRestaurantMode';

export function useRestaurantMode() {
  const [isRestaurantMode, setIsRestaurantMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) {
        setIsRestaurantMode(stored === 'true' || stored === true);
      }
    });
  }, []);

  const toggleRestaurantMode = useCallback(async () => {
    const next = !isRestaurantMode;
    setIsRestaurantMode(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [isRestaurantMode]);

  const setRestaurantMode = useCallback(async (value) => {
    const next = !!value;
    setIsRestaurantMode(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { isRestaurantMode, toggleRestaurantMode, setRestaurantMode };
}
