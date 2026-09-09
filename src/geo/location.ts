export interface GeoPoint {
  lat: number
  lon: number
  label: string
  source: 'gps' | 'city' | 'ip' | 'manual'
  accuracyM?: number
}

export interface WeatherSample {
  tempC: number
  humidity: number
  pressure: number
  lat: number
  lon: number
  placeLabel: string
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
      `&format=json&accept-language=zh-CN&zoom=14`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      display_name?: string
      address?: {
        city?: string
        town?: string
        village?: string
        suburb?: string
        district?: string
        state?: string
        country?: string
      }
    }
    const a = data.address
    if (a) {
      const parts = [
        a.country,
        a.state,
        a.city || a.town || a.village,
        a.district || a.suburb,
      ].filter(Boolean)
      if (parts.length) return parts.join(' · ')
    }
    return data.display_name?.split(',').slice(0, 3).join(' · ') ?? null
  } catch {
    return null
  }
}

/** 高精度 GPS；失败时降精度再试一次；拿到后反查地名 */
export function getGpsPosition(timeoutMs = 20000): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          '本机不支持定位。请改用「选择城市 / 地图 / 手输经纬」。',
        ),
      )
      return
    }

    const failMsg = (code: number, raw?: string) => {
      const map: Record<number, string> = {
        1: '定位权限被拒绝。请在 Windows「设置 → 隐私和安全性 → 位置」打开定位，并允许桌面应用访问；或改用城市 / 地图。',
        2: '暂时拿不到位置信号（室内、无 GPS、系统定位关闭，或应用未获位置权限时常见）。请改用「选择城市 / 地图 / 手输经纬」。',
        3: '定位超时。可靠近窗口、打开系统定位后重试，或改用城市 / 地图。',
      }
      return map[code] || raw || '定位失败，请改用城市 / 地图。'
    }

    const tryOnce = (highAccuracy: boolean, ms: number) =>
      new Promise<GeolocationPosition>((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: highAccuracy,
          timeout: ms,
          maximumAge: highAccuracy ? 0 : 60_000,
        })
      })

    void (async () => {
      try {
        let pos: GeolocationPosition
        try {
          pos = await tryOnce(true, timeoutMs)
        } catch (first) {
          const err = first as GeolocationPositionError
          // 权限拒绝不必再试；信号/超时则降精度重试
          if (err?.code === 1) throw first
          pos = await tryOnce(false, Math.max(timeoutMs, 25000))
        }
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const accuracyM = pos.coords.accuracy
        const place = await reverseGeocode(lat, lon)
        const acc = Number.isFinite(accuracyM) ? `±${Math.round(accuracyM)}m` : ''
        resolve({
          lat,
          lon,
          label: place
            ? `${place}${acc ? ` · ${acc}` : ''}`
            : `当前位置 ${lat.toFixed(5)}, ${lon.toFixed(5)}${acc ? ` · ${acc}` : ''}`,
          source: 'gps',
          accuracyM,
        })
      } catch (e) {
        const err = e as GeolocationPositionError
        reject(new Error(failMsg(err?.code ?? 0, err?.message)))
      }
    })()
  })
}

/** 城市检索：多结果里优先国名/省名匹配更完整的一条 */
export async function geocodeCity(city: string): Promise<GeoPoint> {
  const q = city.trim()
  if (!q) throw new Error('请输入城市名。')
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=8&language=zh&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('城市检索失败，请检查网络。')
  const data = (await res.json()) as {
    results?: {
      name: string
      latitude: number
      longitude: number
      country?: string
      admin1?: string
      country_code?: string
    }[]
  }
  const list = data.results ?? []
  if (!list.length) throw new Error(`未找到城市「${q}」，可试「城市+国家」如「Almaty Kazakhstan」。`)

  const lower = q.toLowerCase()
  const hit =
    list.find((r) => r.name.toLowerCase() === lower) ||
    list.find((r) => r.name.toLowerCase().includes(lower)) ||
    list[0]

  const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(' · ')
  return { lat: hit.latitude, lon: hit.longitude, label, source: 'city' }
}

export function parseManualCoords(text: string): GeoPoint {
  const raw = text.trim().replace(/，/g, ',')
  const m = raw.match(/(-?\d+\.?\d*)\s*[,:\s]\s*(-?\d+\.?\d*)/)
  if (!m) throw new Error('请按「纬度,经度」填写，例如 43.2389, 76.8897')
  const lat = Number(m[1])
  const lon = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('经纬无效。')
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('经纬超出范围。')
  return {
    lat,
    lon,
    label: `手输坐标 ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    source: 'manual',
  }
}

/** 仅作明示回退，不再默认偷偷用 IP（误差大） */
export async function getIpLocation(): Promise<GeoPoint> {
  const res = await fetch('https://get.geojs.io/v1/ip/geo.json')
  if (!res.ok) throw new Error('IP 定位失败。')
  const data = (await res.json()) as {
    latitude?: string
    longitude?: string
    city?: string
    region?: string
    country?: string
  }
  const lat = Number(data.latitude)
  const lon = Number(data.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('IP 定位无有效坐标。')
  }
  const label = [data.city, data.region, data.country].filter(Boolean).join(' · ') || '大致地区'
  return { lat, lon, label: `${label}（仅供参考·IP 粗略）`, source: 'ip' }
}

/** 起卦前探测「当前位置」是否可用（短超时，不阻塞太久） */
export async function probeGpsAvailable(timeoutMs = 5000): Promise<{
  ok: boolean
  message?: string
}> {
  if (!navigator.geolocation) {
    return {
      ok: false,
      message: '本机不支持定位，请改用「选择城市」或「地图点选」。',
    }
  }
  try {
    const perms = navigator.permissions
    if (perms?.query) {
      const status = await perms.query({ name: 'geolocation' as PermissionName })
      if (status.state === 'denied') {
        return {
          ok: false,
          message:
            '定位权限未开启。请在系统设置中允许本应用使用位置，或改用「选择城市」。',
        }
      }
    }
  } catch {
    /* Permissions API 不可用时继续试定位 */
  }

  try {
    await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 120_000,
      })
    })
    return { ok: true }
  } catch (e) {
    const err = e as GeolocationPositionError
    const map: Record<number, string> = {
      1: '定位权限未开启。请在系统设置中允许，或改用「选择城市」。',
      2: '暂时拿不到位置。请改用「选择城市」或「地图点选」。',
      3: '定位超时。请改用「选择城市」或「地图点选」。',
    }
    return {
      ok: false,
      message: map[err?.code ?? 0] || '当前位置不可用，请改用「选择城市」或「地图点选」。',
    }
  }
}

export async function resolveGeo(opts: {
  mode: 'gps' | 'city' | 'manual'
  city?: string
  manual?: string
}): Promise<GeoPoint> {
  if (opts.mode === 'city') return geocodeCity(opts.city || '')
  if (opts.mode === 'manual') {
    const point = parseManualCoords(opts.manual || '')
    const place = await reverseGeocode(point.lat, point.lon)
    if (place) return { ...point, label: `${place} · 手输坐标` }
    return point
  }
  return getGpsPosition()
}

export async function fetchWeather(point: GeoPoint): Promise<WeatherSample> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
    `&current=temperature_2m,relative_humidity_2m,surface_pressure&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('气象接口失败，请检查网络。')
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number
      relative_humidity_2m?: number
      surface_pressure?: number
    }
  }
  const c = data.current
  if (c?.temperature_2m === undefined || c.relative_humidity_2m === undefined) {
    throw new Error('气象数据不完整。')
  }
  return {
    tempC: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    pressure: c.surface_pressure ?? 1013,
    lat: point.lat,
    lon: point.lon,
    placeLabel: point.label,
  }
}
