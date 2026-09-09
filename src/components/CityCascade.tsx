import { useMemo, useState } from 'react'
import { CONTINENTS, type CityEntry } from '../geo/cities'

export type CityPick = {
  continent: string
  country: string
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

  const selectedKey = useMemo(
    () =>
      value
        ? `${value.continent}::${value.country}::${value.city}`
        : null,
    [value],
  )

  function pickCity(
    continentName: string,
    countryName: string,
    city: CityEntry,
  ) {
    onChange({
      continent: continentName,
      country: countryName,
      city: city.name,
      lat: city.lat,
      lon: city.lon,
      label: `${continentName} · ${countryName} · ${city.name}`,
    })
  }

  return (
    <div className="city-cascade">
      <p className="sub" style={{ marginBottom: 8 }}>
        五大洲 → 国家 → 城市（点层展开）
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
                if (!contOpen) setOpenCountry(null)
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
                  return (
                    <div key={key} className="city-cascade-layer nested">
                      <button
                        type="button"
                        className={`city-cascade-head nested${coOpen ? ' open' : ''}${
                          value?.continent === cont.name && value?.country === co.name
                            ? ' selected'
                            : ''
                        }`}
                        onClick={() => setOpenCountry(coOpen ? null : key)}
                      >
                        <span>{co.name}</span>
                        <span className="city-cascade-chevron">
                          {coOpen ? '▾' : '▸'}
                        </span>
                      </button>
                      {coOpen && (
                        <div className="city-cascade-body nested">
                          {co.cities.map((city) => {
                            const ck = `${key}::${city.name}`
                            const active = selectedKey === ck
                            return (
                              <button
                                key={ck}
                                type="button"
                                className={`city-cascade-city${active ? ' active' : ''}`}
                                onClick={() => pickCity(cont.name, co.name, city)}
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
