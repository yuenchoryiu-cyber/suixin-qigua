import { useMemo, useState } from 'react'
import { CONTINENTS, type CityEntry } from '../geo/cities'

export type CityPick = {
  continent: string
  country: string
  province?: string
  city: string
  lat: number
  lon: number
  label: string
}

export function CityCascade({
  value,
  onChange,
}: {
  value: CityPick | null
  onChange: (pick: CityPick) => void
}) {
  const [openContinent, setOpenContinent] = useState<string | null>(
    value?.continent ?? null,
  )
  const [openCountry, setOpenCountry] = useState<string | null>(
    value ? `${value.continent}::${value.country}` : null,
  )
  const [openProvince, setOpenProvince] = useState<string | null>(
    value?.province
      ? `${value.continent}::${value.country}::${value.province}`
      : null,
  )

  const selectedKey = useMemo(() => {
    if (!value) return null
    return value.province
      ? `${value.continent}::${value.country}::${value.province}::${value.city}`
      : `${value.continent}::${value.country}::${value.city}`
  }, [value])

  function pickCity(
    continentName: string,
    countryName: string,
    city: CityEntry,
    provinceName?: string,
  ) {
    onChange({
      continent: continentName,
      country: countryName,
      province: provinceName,
      city: city.name,
      lat: city.lat,
      lon: city.lon,
      label: provinceName
        ? `${continentName} · ${countryName} · ${provinceName} · ${city.name}`
        : `${continentName} · ${countryName} · ${city.name}`,
    })
  }

  return (
    <div className="city-cascade">
      <p className="sub" style={{ marginBottom: 8 }}>
        五大洲 → 国家 →（中国：省）→ 城市
      </p>
      {CONTINENTS.map((cont) => {
        const contOpen = openContinent === cont.name
        return (
          <div key={cont.id} className="city-cascade-layer">
            <button
              type="button"
              className={`city-cascade-head${contOpen ? ' open' : ''}${
                value?.continent === cont.name ? ' selected' : ''
              }`}
              onClick={() => {
                setOpenContinent(contOpen ? null : cont.name)
                if (!contOpen) {
                  setOpenCountry(null)
                  setOpenProvince(null)
                }
              }}
            >
              <span>{cont.name}</span>
              <span className="city-cascade-chevron">{contOpen ? '▾' : '▸'}</span>
            </button>
            {contOpen && (
              <div className="city-cascade-body">
                {cont.countries.map((co) => {
                  const key = `${cont.name}::${co.name}`
                  const coOpen = openCountry === key
                  const hasProvinces = !!co.provinces?.length
                  return (
                    <div key={key} className="city-cascade-layer nested">
                      <button
                        type="button"
                        className={`city-cascade-head nested${coOpen ? ' open' : ''}${
                          value?.continent === cont.name && value?.country === co.name
                            ? ' selected'
                            : ''
                        }`}
                        onClick={() => {
                          setOpenCountry(coOpen ? null : key)
                          if (!coOpen) setOpenProvince(null)
                        }}
                      >
                        <span>
                          {co.name}
                          {hasProvinces
                            ? `（${co.provinces!.length}省 · ${co.provinces!.reduce((n, p) => n + p.cities.length, 0)}城）`
                            : ''}
                        </span>
                        <span className="city-cascade-chevron">
                          {coOpen ? '▾' : '▸'}
                        </span>
                      </button>
                      {coOpen && hasProvinces && (
                        <div className="city-cascade-body">
                          {co.provinces!.map((prov) => {
                            const pk = `${key}::${prov.name}`
                            const pOpen = openProvince === pk
                            return (
                              <div key={pk} className="city-cascade-layer nested">
                                <button
                                  type="button"
                                  className={`city-cascade-head nested province${
                                    pOpen ? ' open' : ''
                                  }${
                                    value?.province === prov.name &&
                                    value?.country === co.name
                                      ? ' selected'
                                      : ''
                                  }`}
                                  onClick={() =>
                                    setOpenProvince(pOpen ? null : pk)
                                  }
                                >
                                  <span>
                                    {prov.name}
                                    <small className="city-count">
                                      {prov.cities.length}
                                    </small>
                                  </span>
                                  <span className="city-cascade-chevron">
                                    {pOpen ? '▾' : '▸'}
                                  </span>
                                </button>
                                {pOpen && (
                                  <div className="city-cascade-body nested">
                                    {prov.cities.map((city) => {
                                      const ck = `${pk}::${city.name}`
                                      const active = selectedKey === ck
                                      return (
                                        <button
                                          key={ck}
                                          type="button"
                                          className={`city-cascade-city${
                                            active ? ' active' : ''
                                          }`}
                                          onClick={() =>
                                            pickCity(
                                              cont.name,
                                              co.name,
                                              city,
                                              prov.name,
                                            )
                                          }
                                        >
                                          {city.name}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {coOpen && !hasProvinces && (
                        <div className="city-cascade-body nested">
                          {(co.cities || []).map((city) => {
                            const ck = `${key}::${city.name}`
                            const active = selectedKey === ck
                            return (
                              <button
                                key={ck}
                                type="button"
                                className={`city-cascade-city${
                                  active ? ' active' : ''
                                }`}
                                onClick={() =>
                                  pickCity(cont.name, co.name, city)
                                }
                              >
                                {city.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {value && (
        <p className="sub" style={{ marginTop: 8 }}>
          已选：{value.label}（{value.lat.toFixed(2)}, {value.lon.toFixed(2)}）
        </p>
      )}
    </div>
  )
}
