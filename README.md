# TasteBuddy

Asistente de sabor con dos modos: cliente final y restaurante. El frontend es React Native (Expo, web) y consume una API Express con PostgreSQL.

## Estructura del repo
- `backend/`: API REST (Express + pg). Expone auth, perfiles de sabor, recetas y ratings.
- `tastebuddy-mvp-jsx/`: app Expo (web) que usa la API en `http://localhost:3000`.
- `App.js` en `tastebuddy-mvp-jsx` reexporta `app/App.js` para Expo.

## Requisitos
- Node 18+
- PostgreSQL accesible desde `DATABASE_URL` (ej: `postgresql://user:pass@localhost:5432/tastebuddy`)
- npm

## Puesta en marcha rapida
1) API  
   ```bash
   cd backend
   cp .env.example .env   # si no existe, crea .env con DATABASE_URL
   npm install
   npm run dev            # corre en :3000
   ```
2) App (web)  
   ```bash
   cd tastebuddy-mvp-jsx
   npm install
   npm run web            # abre Expo web, usa la API local
   ```
3) Si pruebas en otro dispositivo/red, ajusta las URLs `http://localhost:3000` en la app o usa un tunel.

## Esquema de datos esperado (PostgreSQL)
No hay migraciones en el repo. Crea tablas minimas:
```sql
create table users (
  id serial primary key,
  email text unique not null,
  password_hash text,
  role text not null default 'user',
  created_at timestamp default now()
);

create table taste_profiles (
  user_id int primary key references users(id) on delete cascade,
  v double precision[] not null,
  updated_at timestamp default now()
);

create table recipes (
  id serial primary key,
  name text not null,
  ingredients text[] not null,
  taste_v double precision[] not null
);

create table recipe_ratings (
  user_id int references users(id) on delete cascade,
  recipe_id int references recipes(id) on delete cascade,
  rating int not null,
  updated_at timestamp default now(),
  primary key (user_id, recipe_id)
);
```
El backend agrega columnas faltantes `password_hash` y `role` en `users` si no existen.

## API principal (backend)
- `GET /health`: ping.
- Auth: `POST /auth/signup` (email, password, role opcional `admin`|`user`), `POST /auth/login`.
- Perfiles:  
  - `GET /taste_profile?userId=...`  
  - `PUT /taste_profile` body `{ userId, v: [7 numeros 0..1] }` (upsert).  
  - `GET /taste_profiles/aggregate` -> `{ average: [7], count }` (usa todos los perfiles).  
  - `GET /taste_profiles/aggregate?windowDays=1` -> agregado filtrado por los ultimos N dias (se usa para “hoy” en dashboard).
- Ratings:  
  - `POST /ratings` body `{ userId, recipeId, rating }` (upsert + ajusta perfil).  
  - `GET /ratings/aggregate` -> `{ average_rating, rating_count }` (base para "Aceptacion estimada").  
  - `POST /recipes/:id/rate` body `{ userId, rating }` (upsert y devuelve promedio del plato).
- Recetas: `GET /recipes?userId=...&q=term1,term2` (ordena por similitud de sabor + match de ingredientes).  
- Admin recetas: `GET|POST /admin/recipes`, `PUT /admin/recipes/:id`, `DELETE /admin/recipes/:id`.  
- Admin usuarios (solo role user): `GET|POST /admin/users`, `PUT /admin/users/:id`, `DELETE /admin/users/:id`.

## Flujo de la app (Expo web)
- **AuthScreen**: login/signup. Si creas role `admin`, al entrar se activa modo restaurante.
- **Modo usuario**  
  - Onboarding: ajusta vector de gusto inicial.  
  - Radar: radar de gustos y tips.  
  - Recipes: buscador por ingredientes, lista ordenada por score; puedes calificar con estrellas in-line.  
  - Feedback: calificacion 1-5 actualiza el perfil de gusto.
- **Modo restaurante (admin)**  
  - Insights: muestra perfil promedio y "Aceptacion estimada" con el promedio global de `recipe_ratings`.  
  - Radar: radar de cliente promedio + dashboard mock diario/semanal.  
  - Acciones sugeridas: cards de acciones (destacar, combos, ajustar precio).  
  - Recetas (CRUD) y Usuarios (CRUD) basados en endpoints admin.

## Logica de puntuacion (resumen)
- Espacio de gusto: 7 dims `[Dulce, Salado, Acido, Amargo, Umami, Picante, Crujiente]` en [0,1].
- Recomendador recetas (usuario): `score = 0.75 * cosine(vUser, taste_v) + 0.25 * ingredientMatch`.
- Recomendador restaurante: usa perfil promedio y pondera gusto/margen/inventario, incluye `acceptance_score` cuando hay ratings.
- Aceptacion estimada en Insights: `avg_rating` global de `recipe_ratings` (0-5) mostrado con 2 decimales.

## Scripts utiles
- API: `npm run dev` (backend/index.js con nodemon).
- App: `npm start` (Expo), `npm run web`, `npm run android`, `npm run ios`, `npm run lint`.

## Notas
- CORS ya habilitado en la API.
- Si cambias el host de la API, actualiza las constantes `API_BASE` en la app (`app/hooks/useTasteProfile.js`, `app/screens/AuthScreen.js`, `app/screens/RecipesScreen.js`, `app/App.js`).
- El repo no incluye seeds; carga recetas y usuarios via endpoints admin o inserts manuales.
