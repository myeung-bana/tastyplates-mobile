import type { LocationCountryNode } from '@/services/onboardingService'

/** Filter CMS countries/cities by search keyword (city or country name). */
export function filterCountriesByKeyword(
  countries: LocationCountryNode[],
  keyword: string,
): LocationCountryNode[] {
  const q = keyword.trim().toLowerCase()
  if (!q) return countries

  return countries
    .map((country) => {
      const countryMatch = country.label.toLowerCase().includes(q)
      const cities = countryMatch
        ? country.cities
        : country.cities.filter((city) => city.label.toLowerCase().includes(q))
      return { ...country, cities }
    })
    .filter((country) => country.cities.length > 0)
}
