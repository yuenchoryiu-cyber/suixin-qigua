import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapPickValue {
  lat: number
  lon: number
}

/** 雷达风格点选地图（OSM 免费图源，无需 API Key） */
export function MapPicker({
  value,
  onChange,
}: {
  value: MapPickValue | null
  onChange: (v: MapPickValue) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return

    const start: L.LatLngExpression = value
      ? [value.lat, value.lon]
      : [30.5, 104.0]

    const map = L.map(boxRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 18,
    }).setView(start, value ? 12 : 4)

    // OpenStreetMap 标准瓦片，无 Key；雷达绿调靠 CSS filter
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map)

    const place = (lat: number, lon: number) => {
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.circleMarker([lat, lon], {
        radius: 7,
        color: '#39ff14',
        weight: 2,
        fillColor: '#39ff14',
        fillOpacity: 0.55,
        className: 'radar-blip',
      }).addTo(map)
      onChange({ lat, lon })
    }

    if (value) place(value.lat, value.lon)

    map.on('click', (e: L.LeafletMouseEvent) => {
      place(e.latlng.lat, e.latlng.lng)
      const z = map.getZoom()
      if (z < 14) map.setView(e.latlng, Math.min(14, z + 2))
    })

    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 80)
    window.setTimeout(() => map.invalidateSize(), 320)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return
    if (!markerRef.current) {
      markerRef.current = L.circleMarker([value.lat, value.lon], {
        radius: 7,
        color: '#39ff14',
        weight: 2,
        fillColor: '#39ff14',
        fillOpacity: 0.55,
        className: 'radar-blip',
      }).addTo(map)
    } else {
      markerRef.current.setLatLng([value.lat, value.lon])
    }
  }, [value])

  function zoom(delta: number) {
    const map = mapRef.current
    if (!map) return
    if (delta > 0) map.zoomIn()
    else map.zoomOut()
  }

  return (
    <div className="map-picker">
      <div className="radar-frame">
        <div className="radar-scope">
          <div className="map-picker-canvas" ref={boxRef} />
          <div className="radar-rings" aria-hidden />
          <div className="radar-sweep" aria-hidden />
          <div className="radar-cross" aria-hidden />
        </div>
        <div className="radar-zoom">
          <button type="button" className="radar-zoom-btn" onClick={() => zoom(1)}>
            +
          </button>
          <button type="button" className="radar-zoom-btn" onClick={() => zoom(-1)}>
            −
          </button>
        </div>
      </div>
      <div className="map-picker-hint">
        点击雷达定点 · 滚轮或 +/- 缩放
        {value ? ` · ${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}` : ''}
      </div>
    </div>
  )
}
