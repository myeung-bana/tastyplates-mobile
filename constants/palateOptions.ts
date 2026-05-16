/**
 * Palate taxonomy for “Discover by palate” (aligned with web `palateOptions`).
 * Child `key` values are URL / filter slugs.
 */
export interface PalateCuisine {
  key: string
  label: string
  flag: string
}

export interface PalateRegion {
  key: string
  label: string
  children: PalateCuisine[]
}

export const palateOptions: PalateRegion[] = [
  {
    key: 'East Asian',
    label: 'East Asian',
    children: [
      { key: 'japanese', label: 'Japanese', flag: 'https://flagcdn.com/jp.svg' },
      { key: 'korean', label: 'Korean', flag: 'https://flagcdn.com/kr.svg' },
      { key: 'chinese', label: 'Chinese', flag: 'https://flagcdn.com/cn.svg' },
      { key: 'taiwanese', label: 'Taiwanese', flag: 'https://flagcdn.com/tw.svg' },
    ],
  },
  {
    key: 'South Asian',
    label: 'South Asian',
    children: [
      { key: 'nepalese', label: 'Nepalese', flag: 'https://flagcdn.com/np.svg' },
      { key: 'bangladesh', label: 'Bangladesh', flag: 'https://flagcdn.com/bd.svg' },
      { key: 'sri-lankan', label: 'Sri Lankan', flag: 'https://flagcdn.com/lk.svg' },
      { key: 'maldivian', label: 'Maldivian', flag: 'https://flagcdn.com/mv.svg' },
      { key: 'indian', label: 'Indian', flag: 'https://flagcdn.com/in.svg' },
      { key: 'pakistani', label: 'Pakistani', flag: 'https://flagcdn.com/pk.svg' },
    ],
  },
  {
    key: 'South East Asian',
    label: 'South East Asian',
    children: [
      { key: 'malaysian', label: 'Malaysian', flag: 'https://flagcdn.com/my.svg' },
      { key: 'filipino', label: 'Filipino', flag: 'https://flagcdn.com/ph.svg' },
      { key: 'singaporean', label: 'Singaporean', flag: 'https://flagcdn.com/sg.svg' },
      { key: 'indonesian', label: 'Indonesian', flag: 'https://flagcdn.com/id.svg' },
    ],
  },
  {
    key: 'Middle Eastern',
    label: 'Middle Eastern',
    children: [
      { key: 'armenian', label: 'Armenian', flag: 'https://flagcdn.com/am.svg' },
      { key: 'east-arabian', label: 'East Arabian', flag: 'https://flagcdn.com/sa.svg' },
      { key: 'lebanese', label: 'Lebanese', flag: 'https://flagcdn.com/lb.svg' },
      { key: 'caucasian', label: 'Caucasian', flag: 'https://flagcdn.com/ge.svg' },
      { key: 'iranian', label: 'Iranian', flag: 'https://flagcdn.com/ir.svg' },
      { key: 'turkish', label: 'Turkish', flag: 'https://flagcdn.com/tr.svg' },
    ],
  },
  {
    key: 'African',
    label: 'African',
    children: [
      { key: 'angolan', label: 'Angolan', flag: 'https://flagcdn.com/ao.svg' },
      { key: 'congolese', label: 'Congolese', flag: 'https://flagcdn.com/cd.svg' },
      { key: 'ethiopian', label: 'Ethiopian', flag: 'https://flagcdn.com/et.svg' },
      { key: 'kenyan', label: 'Kenyan', flag: 'https://flagcdn.com/ke.svg' },
      { key: 'zimbabwean', label: 'Zimbabwean', flag: 'https://flagcdn.com/zw.svg' },
      { key: 'egyptian', label: 'Egyptian', flag: 'https://flagcdn.com/eg.svg' },
      { key: 'algerian', label: 'Algerian', flag: 'https://flagcdn.com/dz.svg' },
      { key: 'ghanaian', label: 'Ghanaian', flag: 'https://flagcdn.com/gh.svg' },
      { key: 'nigerian', label: 'Nigerian', flag: 'https://flagcdn.com/ng.svg' },
    ],
  },
  {
    key: 'North American',
    label: 'North American',
    children: [
      { key: 'canadian', label: 'Canadian', flag: 'https://flagcdn.com/ca.svg' },
      { key: 'mexican', label: 'Mexican', flag: 'https://flagcdn.com/mx.svg' },
      { key: 'american', label: 'American', flag: 'https://flagcdn.com/us.svg' },
    ],
  },
  {
    key: 'European',
    label: 'European',
    children: [
      { key: 'british', label: 'British', flag: 'https://flagcdn.com/gb.svg' },
      { key: 'spanish', label: 'Spanish', flag: 'https://flagcdn.com/es.svg' },
      { key: 'italian', label: 'Italian', flag: 'https://flagcdn.com/it.svg' },
      { key: 'french', label: 'French', flag: 'https://flagcdn.com/fr.svg' },
      { key: 'german', label: 'German', flag: 'https://flagcdn.com/de.svg' },
      { key: 'russian', label: 'Russian', flag: 'https://flagcdn.com/ru.svg' },
      { key: 'danish', label: 'Danish', flag: 'https://flagcdn.com/dk.svg' },
      { key: 'finnish', label: 'Finnish', flag: 'https://flagcdn.com/fi.svg' },
      { key: 'swedish', label: 'Swedish', flag: 'https://flagcdn.com/se.svg' },
      { key: 'romanian', label: 'Romanian', flag: 'https://flagcdn.com/ro.svg' },
      { key: 'greek', label: 'Greek', flag: 'https://flagcdn.com/gr.svg' },
      { key: 'portuguese', label: 'Portuguese', flag: 'https://flagcdn.com/pt.svg' },
    ],
  },
  {
    key: 'Oceanic',
    label: 'Oceanic',
    children: [
      { key: 'australian', label: 'Australian', flag: 'https://flagcdn.com/au.svg' },
      { key: 'polynesian', label: 'Polynesian', flag: 'https://flagcdn.com/ck.svg' },
    ],
  },
]
