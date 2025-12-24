import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Pressable, Text, Switch } from 'react-native';
import OnboardingScreen from './screens/OnboardingScreen';
import RadarScreen from './screens/RadarScreen';
import InsightsScreen from './screens/InsightsScreen';
import RecipesScreen from './screens/RecipesScreen';
import RestaurantActionsScreen from './screens/RestaurantActionsScreen';
import RestaurantRecipesCrudScreen from './screens/RestaurantRecipesCrudScreen';
import RestaurantUsersCrudScreen from './screens/RestaurantUsersCrudScreen';
import AuthScreen from './screens/AuthScreen';
import { TasteProfileProvider, useTasteProfile } from './hooks/useTasteProfile';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { useRestaurantMode } from './hooks/useRestaurantMode';
import { styles, theme } from './styles/styles';
import { UserProvider } from './context/UserContext';
import { useUser } from './context/UserContext';

const baseTextStyle = { fontFamily: theme.fonts.family, fontWeight: '500', color: theme.colors.text };
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = Text.defaultProps.style ? [Text.defaultProps.style, baseTextStyle] : baseTextStyle;

export default function App() {
  return (
    <UserProvider>
      <TasteProfileProvider>
        <ToastProvider>
          <AppContent />
          <ToastContainer />
        </ToastProvider>
      </TasteProfileProvider>
    </UserProvider>
  );
}

function AppContent() {
  const [screen, setScreen] = useState('auth');
  const [adminInitialized, setAdminInitialized] = useState(false);
  const { vUser, recipeRatings, ratingsAggregate, rateRecipe } = useTasteProfile();
  const { isRestaurantMode, toggleRestaurantMode, setRestaurantMode } = useRestaurantMode();
  const { userId, userEmail, userRole, setUserId, setUserEmail, setUserRole } = useUser();
  const [averageRestaurantProfileWeek, setAverageRestaurantProfileWeek] = useState(Array(7).fill(0));
  const [averageRestaurantProfileDay, setAverageRestaurantProfileDay] = useState(Array(7).fill(0));
  const [restaurantProfilesCount, setRestaurantProfilesCount] = useState(0);

  useEffect(() => {
    if (!isRestaurantMode && (screen === 'restaurantActions' || screen === 'restaurantCrud' || screen === 'usersCrud')) {
      setScreen('radar');
    }
  }, [isRestaurantMode, screen]);

  useEffect(() => {
    if (userRole === 'admin') {
      if (!adminInitialized) {
        setRestaurantMode(true);
        setAdminInitialized(true);
      }
    } else {
      setAdminInitialized(false);
      if (isRestaurantMode) {
        setRestaurantMode(false);
      }
      if (screen === 'restaurantActions' || screen === 'restaurantCrud') {
        setScreen('radar');
      }
      if (screen === 'usersCrud') {
        setScreen('radar');
      }
    }
  }, [userRole, isRestaurantMode, screen, setRestaurantMode, adminInitialized]);

  const safeVUser = useMemo(() => (Array.isArray(vUser) && vUser.length === 7 ? vUser : Array(7).fill(0.5)), [vUser]);

  const handleLogout = () => {
    setUserId(null);
    setUserEmail('');
    setUserRole('user');
    setScreen('auth');
  };

  useEffect(() => {
    if (!isRestaurantMode) return;
    let active = true;
    const clamp = (v) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return 0;
      if (num < 0) return 0;
      if (num > 1) return 1;
      return num;
    };
    const fetchAverage = async () => {
      try {
        const [weekRes, dayRes] = await Promise.all([
          fetch('http://localhost:3000/taste_profiles/aggregate'),
          fetch('http://localhost:3000/taste_profiles/aggregate?windowDays=1'),
        ]);
        if (!weekRes.ok) throw new Error('aggregate_fetch_error_week');
        if (!dayRes.ok) throw new Error('aggregate_fetch_error_day');
        const weekData = await weekRes.json();
        const dayData = await dayRes.json();
        if (!active) return;
        const avgWeek = Array.isArray(weekData.average) ? weekData.average.map(clamp) : Array(7).fill(0);
        const avgDay = Array.isArray(dayData.average) ? dayData.average.map(clamp) : Array(7).fill(0);
        setAverageRestaurantProfileWeek(avgWeek);
        setAverageRestaurantProfileDay(avgDay);
        setRestaurantProfilesCount(Number(weekData.count || 0));
      } catch (e) {
        if (active) {
          setAverageRestaurantProfileWeek(Array(7).fill(0));
          setAverageRestaurantProfileDay(Array(7).fill(0));
          setRestaurantProfilesCount(0);
        }
      }
    };
    fetchAverage();
    return () => {
      active = false;
    };
  }, [isRestaurantMode]);

  const userInitials = useMemo(() => {
    if (!userEmail) return 'U';
    const [namePart] = userEmail.split('@');
    if (!namePart) return 'U';
    return namePart.slice(0, 2).toUpperCase();
  }, [userEmail]);

  return (
    <SafeAreaView style={styles.screen}>
      {screen !== 'auth' && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: 12,
            backgroundColor: '#f5f5f5',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {userId && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#e9f5ed',
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>{userInitials}</Text>
                </View>
                <View>
                  <Text style={{ fontWeight: '800', color: theme.colors.text }}>{userEmail || 'Usuario'}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{userRole || 'user'}</Text>
                </View>
              </View>
            )}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: pressed ? '#ececec' : '#f8f9fb',
              })}
            >
              <Text style={{ color: '#c53030', fontWeight: '800' }}>Logout</Text>
            </Pressable>
            {userRole === 'admin' && (
              <Switch
                value={isRestaurantMode}
                onValueChange={toggleRestaurantMode}
                thumbColor={isRestaurantMode ? theme.colors.primary : '#f4f3f4'}
                trackColor={{ false: '#d9d9d9', true: '#b9e5c7' }}
              />
            )}
          </View>
        </View>
      )}

      {screen === 'auth' && <AuthScreen onAuthenticated={(next) => setScreen(next || 'radar')} />}
      {screen === 'onboarding' &&
        (isRestaurantMode ? (
        <InsightsScreen
          averageProfile={averageRestaurantProfileWeek}
          recipeRatings={recipeRatings}
          ratingsAggregate={ratingsAggregate}
        />
      ) : (
        <OnboardingScreen onComplete={() => setScreen('radar')} />
      ))}
      {screen === 'radar' && (
        <RadarScreen
          vUser={safeVUser}
          isRestaurantMode={isRestaurantMode}
          averageProfile={averageRestaurantProfileWeek}
          averageProfileDay={averageRestaurantProfileDay}
          profilesCount={restaurantProfilesCount}
          onGoRecipes={() => setScreen('recipes')}
          onGoRestaurantActions={() => setScreen('restaurantActions')}
        />
      )}
      {screen === 'recipes' && (
        <RecipesScreen
          vUser={safeVUser}
          isRestaurantMode={isRestaurantMode}
          restaurantProfile={averageRestaurantProfileWeek}
          recipeRatings={recipeRatings}
          onRateRecipe={rateRecipe}
        />
      )}
      {screen === 'restaurantActions' && isRestaurantMode && (
        <RestaurantActionsScreen
          onBack={() => setScreen('radar')}
          averageProfile={averageRestaurantProfileWeek}
          onGoCrud={() => setScreen('restaurantCrud')}
        />
      )}
      {screen === 'restaurantCrud' && isRestaurantMode && <RestaurantRecipesCrudScreen />}
      {screen === 'usersCrud' && isRestaurantMode && <RestaurantUsersCrudScreen />}

      {screen !== 'auth' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 10, borderTopWidth: 1, borderColor: theme.colors.border }}>
          {(isRestaurantMode ? ['onboarding', 'radar', 'restaurantActions', 'restaurantCrud', 'usersCrud'] : ['onboarding', 'radar', 'recipes']).map((key) => (
            <Pressable key={key} onPress={() => setScreen(key)}>
              <Text style={{ fontWeight: screen === key ? '800' : '600', color: theme.colors.primary }}>
                {key === 'onboarding'
                  ? isRestaurantMode
                    ? 'Insights'
                    : 'Tu perfil'
                  : key === 'radar'
                    ? isRestaurantMode
                      ? 'Radar'
                      : 'Mis gustos'
                  : key === 'restaurantActions'
                    ? 'Acciones'
                    : key === 'restaurantCrud'
                      ? 'Recetas'
                      : key === 'usersCrud'
                        ? 'Usuarios'
                        : key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
