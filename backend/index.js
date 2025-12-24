import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import pkg from 'pg'
import crypto from 'crypto'

const { Pool } = pkg

const app = express()
app.use(cors())
app.use(express.json())

const db = new Pool({
  connectionString: process.env.DATABASE_URL
})

const TASTE_DIMENSIONS = 7
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)
const clampUnit = (v) => {
  const num = Number(v)
  if (!Number.isFinite(num)) return 0
  if (num < 0) return 0
  if (num > 1) return 1
  return num
}
const normalizeTasteVector = (v) => {
  if (!Array.isArray(v) || v.length !== TASTE_DIMENSIONS) {
    return null
  }
  return v.map(clampUnit)
}
const isPositiveInt = (v) => Number.isInteger(v) && v > 0
const parsePositiveInt = (v) => {
  const num = Number(v)
  return isPositiveInt(num) ? num : null
}
const normalizeId = (v) => {
  const parsedInt = parsePositiveInt(v)
  if (parsedInt !== null) return parsedInt
  if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  return null
}
const validateEmail = (email) => typeof email === 'string' && email.includes('@') && email.length <= 255

async function ensureUserSchema() {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE users ADD COLUMN password_hash text;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'user';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
      END IF;
    END$$;
  `)
  await db.query(`update users set role = 'user' where role is null`)
}

async function ensureRecipeSchema() {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recipes' AND column_name = 'featured'
      ) THEN
        ALTER TABLE recipes ADD COLUMN featured boolean NOT NULL DEFAULT false;
      END IF;
    END$$;
  `)
}

app.get('/health', async (_, res) => {
  const r = await db.query('select 1')
  res.json({ ok: true })
})

app.post('/ratings', async (req, res) => {
  const userId = normalizeId(req.body?.userId)
  const recipeId = parsePositiveInt(req.body?.recipeId)
  const rating = parsePositiveInt(req.body?.rating)

  if (!userId || !recipeId || !rating) {
    return res.status(400).json({ error: 'missing_fields', message: 'userId (uuid), recipeId (entero) y rating son requeridos.' })
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'invalid_rating', message: 'rating debe estar entre 1 y 5.' })
  }

  // upsert rating
  await db.query(
    `
    insert into recipe_ratings (user_id, recipe_id, rating)
    values ($1, $2, $3)
    on conflict (user_id, recipe_id)
    do update set rating = excluded.rating, updated_at = now()
    `,
    [userId, recipeId, rating]
  )

  // get current profile
  const prof = await db.query(
    `select v from taste_profiles where user_id = $1`,
    [userId]
  )

  if (prof.rowCount === 0) {
    return res.status(404).json({ error: 'profile_not_found' })
  }

  // get recipe taste vector
  const rec = await db.query(
    `select taste_v from recipes where id = $1`,
    [recipeId]
  )

  if (rec.rowCount === 0) {
    return res.status(404).json({ error: 'recipe_not_found' })
  }

  const ALPHA = 0.35
  const gain = (rating - 3) / 2 // 1→-1, 5→+1

  const vOld = prof.rows[0].v
  const vRec = rec.rows[0].taste_v

  const vNew = vOld.map((x, i) => {
    let y = x + ALPHA * gain * vRec[i]
    if (y < 0) y = 0
    if (y > 1) y = 1
    return y
  })

  await db.query(
    `update taste_profiles set v = $2, updated_at = now() where user_id = $1`,
    [userId, vNew]
  )

  res.json({ ok: true, v: vNew })
})

app.get('/taste_profile', async (req, res) => {
  const userId = normalizeId(req.query?.userId)

  if (!userId) {
    return res.status(400).json({ error: 'userId_required', message: 'userId debe ser un uuid/string valido.' })
  }

  const prof = await db.query(`select v from taste_profiles where user_id = $1`, [userId])
  if (prof.rowCount === 0) {
    return res.status(404).json({ error: 'profile_not_found' })
  }

  res.json({ user_id: userId, v: prof.rows[0].v })
})

app.get('/taste_profiles/aggregate', async (req, res) => {
  try {
    const windowDaysRaw = Number(req.query.windowDays || 0)
    const windowDays = Number.isFinite(windowDaysRaw) && windowDaysRaw > 0 ? Math.floor(windowDaysRaw) : null
    const hasWindow = windowDays !== null
    // Use calendar days anchored at the start of today to avoid "last 24h" overlapping windows.
    const windowClause = hasWindow
      ? 'where updated_at >= date_trunc(\'day\', now()) - make_interval(days => $1::int - 1)'
      : ''
    const params = hasWindow ? [windowDays] : []

    const counts = await db.query(
      `select count(*)::int as count, coalesce(max(array_length(v, 1)), 0) as dims from taste_profiles ${windowClause}`,
      params
    )
    const count = Number(counts.rows[0]?.count || 0)
    const dims = Number(counts.rows[0]?.dims || 0)

    const agg = await db.query(`
      with expanded as (
        select generate_subscripts(v, 1) as idx, unnest(v)::float as val
        from taste_profiles
        ${windowClause}
      )
      select coalesce(array_agg(avg_val order by idx), '{}') as avg_v
      from (
        select idx, avg(val)::float as avg_val
        from expanded
        group by idx
        order by idx
      ) s
    `, params)

    const avgRaw = agg.rows[0]?.avg_v || []
    const size = dims || TASTE_DIMENSIONS
    const average = (avgRaw.length ? avgRaw : Array.from({ length: size }, () => 0)).map((n) => {
      const num = Number(n)
      if (!Number.isFinite(num)) return 0
      if (num < 0) return 0
      if (num > 1) return 1
      return num
    })

    res.json({ average, count, windowDays: hasWindow ? windowDays : null })
  } catch (e) {
    console.error('Failed to aggregate taste profiles', e)
    res.status(500).json({ error: 'aggregate_failed' })
  }
})

app.get('/ratings/aggregate', async (_, res) => {
  try {
    const agg = await db.query(
      `select avg(rating)::float as avg_rating, count(*)::int as rating_count from recipe_ratings`
    )
    const row = agg.rows[0] || {}
    const avgRaw = row.avg_rating
    const avgRating = avgRaw === null || avgRaw === undefined ? null : Number(avgRaw.toFixed(2))
    const ratingCount = Number(row.rating_count || 0)
    res.json({ average_rating: avgRating, rating_count: ratingCount })
  } catch (e) {
    console.error('Failed to aggregate ratings', e)
    res.status(500).json({ error: 'aggregate_ratings_failed' })
  }
})

app.put('/taste_profile', async (req, res) => {
  const userId = normalizeId(req.body?.userId)
  const normalized = normalizeTasteVector(req.body?.v)

  if (!userId || !normalized) {
    return res.status(400).json({ error: 'missing_fields', message: 'userId debe ser string/uuid y v debe ser un arreglo de longitud 7 con numeros.' })
  }
  const vector = normalized

  const result = await db.query(
    `
    insert into taste_profiles (user_id, v)
    values ($1, $2)
    on conflict (user_id) do update set v = excluded.v, updated_at = now()
    returning v
    `,
    [userId, vector]
  )

  res.json({ ok: true, v: result.rows[0].v })
})

app.get('/recipes', async (req, res) => {
  const { q } = req.query
  const userId = normalizeId(req.query?.userId)

  if (!userId) {
    return res.status(400).json({ error: 'userId_required', message: 'userId debe ser string/uuid valido.' })
  }

  const prof = await db.query(
    `select v from taste_profiles where user_id = $1`,
    [userId]
  )
  if (prof.rowCount === 0) {
    return res.status(404).json({ error: 'profile_not_found' })
  }

  const vUser = prof.rows[0].v

  const recs = await db.query(`select * from recipes`)
  const terms = q ? q.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []

  const ratingAgg = await db.query(`
    select recipe_id, avg(rating)::float as avg_rating, count(*) as rating_count
    from recipe_ratings
    group by recipe_id
  `)
  const userRatings = await db.query(
    `select recipe_id, rating from recipe_ratings where user_id = $1`,
    [userId]
  )
  const avgMap = Object.fromEntries(ratingAgg.rows.map(r => [r.recipe_id, r]))
  const userMap = Object.fromEntries(userRatings.rows.map(r => [r.recipe_id, r.rating]))

  const scored = recs.rows
    .map(r => {
      const ingredientsLower = r.ingredients.map(i => i.toLowerCase())
      const matchedCount = terms.length
        ? terms.filter(t => ingredientsLower.some(ing => ing.includes(t))).length
        : 0
      if (terms.length && matchedCount === 0) {
        return null
      }

      const featured = !!r.featured

      // cosine similarity
      const dot = r.taste_v.reduce((s, x, i) => s + x * vUser[i], 0)
      const magA = Math.sqrt(r.taste_v.reduce((s, x) => s + x * x, 0))
      const magB = Math.sqrt(vUser.reduce((s, x) => s + x * x, 0))
      const tasteScore = magA && magB ? dot / (magA * magB) : 0

      // ingredient match ratio
      const match = terms.length ? matchedCount / terms.length : 0

      const scoreBase = 0.75 * tasteScore + 0.25 * match
      const featuredBoost = featured ? 0.05 : 0
      const score = scoreBase + featuredBoost
      const matchPct = Math.round(scoreBase * 100)
      const avgRow = avgMap[r.id]
      const avgRating = avgRow ? Number(avgRow.avg_rating?.toFixed(2)) : null
      const acceptanceScore = avgRating !== null ? Number((avgRating / 5).toFixed(3)) : null
      const userRating = userMap[r.id] ?? null

      return {
        id: r.id,
        name: r.name,
        score: Number(score.toFixed(3)),
        reason: featured ? 'Destacada por el local' : 'Recomendado por sabor',
        featured,
        ingredients: r.ingredients,
        taste_v: r.taste_v,
        match_percentage: matchPct,
        avg_rating: avgRating,
        user_rating: userRating,
        acceptance_score: acceptanceScore,
        restaurant_metrics: {
          relevance: Number(score.toFixed(3)),
          match_percentage: matchPct,
          acceptance_score: acceptanceScore
        }
      }
    })
    .filter(Boolean)

  scored.sort((a, b) => b.score - a.score)
  res.json(scored)
})

app.post('/recipes/:id/rate', async (req, res) => {
  const { id } = req.params
  const userId = normalizeId(req.body?.userId)
  const ratingInt = parsePositiveInt(req.body?.rating)

  if (!userId || !ratingInt) {
    return res.status(400).json({ error: 'missing_fields', message: 'userId (string/uuid) y rating (entero) son requeridos.' })
  }

  if (Number.isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ error: 'invalid_rating', message: 'rating debe estar entre 1 y 5.' })
  }

  const recipe = await db.query(`select id, taste_v from recipes where id = $1`, [id])
  if (recipe.rowCount === 0) {
    return res.status(404).json({ error: 'recipe_not_found' })
  }

  await db.query(
    `
    insert into recipe_ratings (user_id, recipe_id, rating)
    values ($1, $2, $3)
    on conflict (user_id, recipe_id)
    do update set rating = excluded.rating, updated_at = now()
    `,
    [userId, id, ratingInt]
  )

  const avg = await db.query(
    `select avg(rating)::float as avg_rating, count(*) as rating_count from recipe_ratings where recipe_id = $1`,
    [id]
  )

  const acceptanceScore = avg.rows[0].avg_rating !== null ? Number((avg.rows[0].avg_rating / 5).toFixed(3)) : null

  res.json({
    ok: true,
    recipe_id: id,
    user_rating: ratingInt,
    avg_rating: avg.rows[0].avg_rating !== null ? Number(avg.rows[0].avg_rating.toFixed(2)) : null,
    rating_count: Number(avg.rows[0].rating_count || 0),
    acceptance_score: acceptanceScore
  })
})

app.get('/admin/recipes', async (_, res) => {
  const rows = await db.query(`select id, name, ingredients, taste_v, featured from recipes order by id asc`)
  res.json(rows.rows)
})

app.post('/admin/recipes', async (req, res) => {
  const { name, ingredients, taste_v, featured } = req.body
  const normalizedTaste = normalizeTasteVector(taste_v)
  const validIngredients = Array.isArray(ingredients) && ingredients.every((i) => typeof i === 'string' && i.trim().length > 0)
  const featuredValue = typeof featured === 'boolean' ? featured : false
  if (!name || !validIngredients || !normalizedTaste) {
    return res.status(400).json({ error: 'missing_fields', message: 'name requerido, ingredients debe ser array de strings y taste_v vector de longitud 7.' })
  }
  const ins = await db.query(
    `insert into recipes (name, ingredients, taste_v, featured) values ($1, $2, $3, $4) returning id, name, ingredients, taste_v, featured`,
    [name, ingredients, normalizedTaste, featuredValue]
  )
  res.json(ins.rows[0])
})

app.put('/admin/recipes/:id', async (req, res) => {
  const { id } = req.params
  const { name, ingredients, taste_v, featured } = req.body

  const updates = []
  const params = []
  let idx = 1

  if (typeof name !== 'undefined') {
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'invalid_name', message: 'name requerido como string no vacio.' })
    }
    updates.push(`name = $${idx++}`)
    params.push(name)
  }

  if (typeof ingredients !== 'undefined') {
    const validIngredients = Array.isArray(ingredients) && ingredients.every((i) => typeof i === 'string' && i.trim().length > 0)
    if (!validIngredients) {
      return res.status(400).json({ error: 'invalid_ingredients', message: 'ingredients debe ser array de strings.' })
    }
    updates.push(`ingredients = $${idx++}`)
    params.push(ingredients)
  }

  if (typeof taste_v !== 'undefined') {
    const normalizedTaste = normalizeTasteVector(taste_v)
    if (!normalizedTaste) {
      return res.status(400).json({ error: 'invalid_taste_v', message: 'taste_v debe ser vector de longitud 7.' })
    }
    updates.push(`taste_v = $${idx++}`)
    params.push(normalizeTasteVector(taste_v))
  }

  if (typeof featured !== 'undefined') {
    if (typeof featured !== 'boolean') {
      return res.status(400).json({ error: 'invalid_featured', message: 'featured debe ser booleano.' })
    }
    updates.push(`featured = $${idx++}`)
    params.push(featured)
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'nothing_to_update', message: 'Nada para actualizar.' })
  }

  params.push(id)

  const sql = `update recipes set ${updates.join(', ')} where id = $${idx} returning id, name, ingredients, taste_v, featured`
  const upd = await db.query(sql, params)
  if (upd.rowCount === 0) return res.status(404).json({ error: 'recipe_not_found' })
  res.json(upd.rows[0])
})

app.delete('/admin/recipes/:id', async (req, res) => {
  const { id } = req.params
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query(`delete from recipe_ratings where recipe_id = $1`, [id])
    const del = await client.query(`delete from recipes where id = $1`, [id])
    if (del.rowCount === 0) {
      await client.query('rollback')
      return res.status(404).json({ error: 'recipe_not_found' })
    }
    await client.query('commit')
    res.json({ ok: true })
  } catch (e) {
    await client.query('rollback')
    console.error('Failed to delete recipe', e)
    res.status(500).json({ error: 'delete_failed' })
  } finally {
    client.release()
  }
})

app.post('/auth/signup', async (req, res) => {
  const { role = 'user' } = req.body
  const email = req.body?.email
  const password = req.body?.password
  if (!validateEmail(email) || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'email_password_required', message: 'Email valido y password minimo 6 caracteres son requeridos.' })
  }
  const normalizedRole = role === 'admin' ? 'admin' : 'user'
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  try {
    const inserted = await db.query(
      `insert into users (email, password_hash, role) values ($1, $2, $3) returning id, email, role, created_at`,
      [email.toLowerCase(), hash, normalizedRole],
    )
    res.json({ ok: true, user: inserted.rows[0] })
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'email_exists' })
    }
    res.status(500).json({ error: 'signup_failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  const email = req.body?.email
  const password = req.body?.password
  if (!validateEmail(email) || typeof password !== 'string' || password.length < 1) {
    return res.status(400).json({ error: 'email_password_required', message: 'Email valido y password son requeridos.' })
  }
  const found = await db.query(`select id, email, password_hash, role, created_at from users where email = $1`, [email.toLowerCase()])
  if (found.rowCount === 0) return res.status(404).json({ error: 'user_not_found' })
  const row = found.rows[0]
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  if (row.password_hash !== hash) return res.status(401).json({ error: 'invalid_credentials' })
  res.json({ ok: true, user: { id: row.id, email: row.email, role: row.role, created_at: row.created_at } })
})

app.get('/admin/users', async (_, res) => {
  const rows = await db.query(
    `select id, email, role, created_at from users where role = 'user' order by created_at desc`
  )
  res.json(rows.rows)
})

app.post('/admin/users', async (req, res) => {
  const { email, password } = req.body
  if (!validateEmail(email) || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'email_password_required', message: 'Email valido y password minimo 6 caracteres son requeridos.' })
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  try {
    const inserted = await db.query(
      `insert into users (email, password_hash, role) values ($1, $2, 'user') returning id, email, role, created_at`,
      [email.toLowerCase(), hash]
    )
    res.json({ ok: true, user: inserted.rows[0] })
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'email_exists' })
    }
    res.status(500).json({ error: 'create_failed' })
  }
})

app.put('/admin/users/:id', async (req, res) => {
  const { id } = req.params
  const { email, password } = req.body
  if (email && !validateEmail(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Email no valido.' })
  }
  if (password && (typeof password !== 'string' || password.length < 6)) {
    return res.status(400).json({ error: 'invalid_password', message: 'Password minimo 6 caracteres.' })
  }
  const current = await db.query(`select id, role from users where id = $1`, [id])
  if (current.rowCount === 0) return res.status(404).json({ error: 'user_not_found' })
  if (current.rows[0].role !== 'user') return res.status(403).json({ error: 'forbidden_admin_user' })
  if (!email && !password) return res.status(400).json({ error: 'nothing_to_update' })

  const updates = []
  const params = []
  let idx = 1

  if (email) {
    updates.push(`email = $${idx++}`)
    params.push(email.toLowerCase())
  }
  if (password) {
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    updates.push(`password_hash = $${idx++}`)
    params.push(hash)
  }
  params.push(id)

  const sql = `update users set ${updates.join(', ')} where id = $${idx} and role = 'user' returning id, email, role, created_at`
  try {
    const updated = await db.query(sql, params)
    if (updated.rowCount === 0) return res.status(404).json({ error: 'user_not_found' })
    res.json({ ok: true, user: updated.rows[0] })
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'email_exists' })
    }
    res.status(500).json({ error: 'update_failed' })
  }
})

app.delete('/admin/users/:id', async (req, res) => {
  const { id } = req.params
  const client = await db.connect()
  try {
    const existing = await client.query(`select id, role from users where id = $1`, [id])
    if (existing.rowCount === 0) return res.status(404).json({ error: 'user_not_found' })
    if (existing.rows[0].role !== 'user') return res.status(403).json({ error: 'forbidden_admin_user' })

    await client.query('begin')
    await client.query(`delete from recipe_ratings where user_id = $1`, [id])
    await client.query(`delete from taste_profiles where user_id = $1`, [id])
    await client.query(`delete from users where id = $1 and role = 'user'`, [id])
    await client.query('commit')
    res.json({ ok: true })
  } catch (e) {
    await client.query('rollback')
    console.error('Failed to delete user', e)
    res.status(500).json({ error: 'delete_failed' })
  } finally {
    client.release()
  }
})

Promise.all([ensureUserSchema(), ensureRecipeSchema()])
  .then(() => app.listen(3000, () => console.log('API on :3000')))
  .catch((err) => {
    console.error('Failed to ensure schema', err)
    process.exit(1)
  })
