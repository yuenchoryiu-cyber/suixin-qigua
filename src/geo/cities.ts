/** 五大洲 → 国家 →（中国：省）→ 城市（含经纬，供级联点选） */

import { CHINA_PROVINCES } from './chinaCities'

export type CityEntry = {
  name: string
  lat: number
  lon: number
}

export type ProvinceEntry = {
  name: string
  cities: CityEntry[]
}

export type CountryEntry = {
  name: string
  /** 无省级时直接列城市 */
  cities?: CityEntry[]
  /** 中国等：省 / 直辖市 / 自治区 → 城市 */
  provinces?: ProvinceEntry[]
}

export type ContinentEntry = {
  id: string
  name: string
  countries: CountryEntry[]
}

export const CONTINENTS: ContinentEntry[] = [
  {
    id: 'asia',
    name: '亚洲',
    countries: [
      {
        name: '中国',
        provinces: CHINA_PROVINCES,
      },
      {
        name: '日本',
        cities: [
          { name: '东京', lat: 35.6762, lon: 139.6503 },
          { name: '大阪', lat: 34.6937, lon: 135.5023 },
          { name: '京都', lat: 35.0116, lon: 135.7681 },
        ],
      },
      {
        name: '韩国',
        cities: [
          { name: '首尔', lat: 37.5665, lon: 126.978 },
          { name: '釜山', lat: 35.1796, lon: 129.0756 },
        ],
      },
      {
        name: '新加坡',
        cities: [{ name: '新加坡', lat: 1.3521, lon: 103.8198 }],
      },
      {
        name: '泰国',
        cities: [
          { name: '曼谷', lat: 13.7563, lon: 100.5018 },
          { name: '清迈', lat: 18.7883, lon: 98.9853 },
        ],
      },
      {
        name: '哈萨克斯坦',
        cities: [
          { name: '阿拉木图', lat: 43.2389, lon: 76.8897 },
          { name: '阿斯塔纳', lat: 51.1694, lon: 71.4491 },
        ],
      },
      {
        name: '印度',
        cities: [
          { name: '新德里', lat: 28.6139, lon: 77.209 },
          { name: '孟买', lat: 19.076, lon: 72.8777 },
        ],
      },
      {
        name: '阿联酋',
        cities: [
          { name: '迪拜', lat: 25.2048, lon: 55.2708 },
          { name: '阿布扎比', lat: 24.4539, lon: 54.3773 },
        ],
      },
    ],
  },
  {
    id: 'europe',
    name: '欧洲',
    countries: [
      {
        name: '英国',
        cities: [
          { name: '伦敦', lat: 51.5074, lon: -0.1278 },
          { name: '曼彻斯特', lat: 53.4808, lon: -2.2426 },
        ],
      },
      {
        name: '法国',
        cities: [
          { name: '巴黎', lat: 48.8566, lon: 2.3522 },
          { name: '里昂', lat: 45.764, lon: 4.8357 },
        ],
      },
      {
        name: '德国',
        cities: [
          { name: '柏林', lat: 52.52, lon: 13.405 },
          { name: '慕尼黑', lat: 48.1351, lon: 11.582 },
        ],
      },
      {
        name: '意大利',
        cities: [
          { name: '罗马', lat: 41.9028, lon: 12.4964 },
          { name: '米兰', lat: 45.4642, lon: 9.19 },
        ],
      },
      {
        name: '西班牙',
        cities: [
          { name: '马德里', lat: 40.4168, lon: -3.7038 },
          { name: '巴塞罗那', lat: 41.3874, lon: 2.1686 },
        ],
      },
      {
        name: '俄罗斯',
        cities: [
          { name: '莫斯科', lat: 55.7558, lon: 37.6173 },
          { name: '圣彼得堡', lat: 59.9311, lon: 30.3609 },
        ],
      },
      {
        name: '荷兰',
        cities: [{ name: '阿姆斯特丹', lat: 52.3676, lon: 4.9041 }],
      },
    ],
  },
  {
    id: 'africa',
    name: '非洲',
    countries: [
      {
        name: '埃及',
        cities: [
          { name: '开罗', lat: 30.0444, lon: 31.2357 },
          { name: '亚历山大', lat: 31.2001, lon: 29.9187 },
        ],
      },
      {
        name: '南非',
        cities: [
          { name: '开普敦', lat: -33.9249, lon: 18.4241 },
          { name: '约翰内斯堡', lat: -26.2041, lon: 28.0473 },
        ],
      },
      {
        name: '摩洛哥',
        cities: [
          { name: '卡萨布兰卡', lat: 33.5731, lon: -7.5898 },
          { name: '马拉喀什', lat: 31.6295, lon: -7.9811 },
        ],
      },
      {
        name: '肯尼亚',
        cities: [{ name: '内罗毕', lat: -1.2921, lon: 36.8219 }],
      },
      {
        name: '尼日利亚',
        cities: [{ name: '拉各斯', lat: 6.5244, lon: 3.3792 }],
      },
    ],
  },
  {
    id: 'americas',
    name: '美洲',
    countries: [
      {
        name: '美国',
        cities: [
          { name: '纽约', lat: 40.7128, lon: -74.006 },
          { name: '洛杉矶', lat: 34.0522, lon: -118.2437 },
          { name: '旧金山', lat: 37.7749, lon: -122.4194 },
          { name: '芝加哥', lat: 41.8781, lon: -87.6298 },
          { name: '西雅图', lat: 47.6062, lon: -122.3321 },
        ],
      },
      {
        name: '加拿大',
        cities: [
          { name: '多伦多', lat: 43.6532, lon: -79.3832 },
          { name: '温哥华', lat: 49.2827, lon: -123.1207 },
        ],
      },
      {
        name: '墨西哥',
        cities: [{ name: '墨西哥城', lat: 19.4326, lon: -99.1332 }],
      },
      {
        name: '巴西',
        cities: [
          { name: '圣保罗', lat: -23.5505, lon: -46.6333 },
          { name: '里约热内卢', lat: -22.9068, lon: -43.1729 },
        ],
      },
      {
        name: '阿根廷',
        cities: [{ name: '布宜诺斯艾利斯', lat: -34.6037, lon: -58.3816 }],
      },
      {
        name: '智利',
        cities: [{ name: '圣地亚哥', lat: -33.4489, lon: -70.6693 }],
      },
    ],
  },
  {
    id: 'oceania',
    name: '大洋洲',
    countries: [
      {
        name: '澳大利亚',
        cities: [
          { name: '悉尼', lat: -33.8688, lon: 151.2093 },
          { name: '墨尔本', lat: -37.8136, lon: 144.9631 },
          { name: '布里斯班', lat: -27.4698, lon: 153.0251 },
        ],
      },
      {
        name: '新西兰',
        cities: [
          { name: '奥克兰', lat: -36.8509, lon: 174.7645 },
          { name: '惠灵顿', lat: -41.2865, lon: 174.7762 },
        ],
      },
      {
        name: '斐济',
        cities: [{ name: '苏瓦', lat: -18.1416, lon: 178.4419 }],
      },
    ],
  },
]
