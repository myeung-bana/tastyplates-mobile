/** Parent establishment categories (`restaurant_categories` where `parent_id` is null). */
export type RestaurantParentCategory = {
  slug: string
  label: string
}

export const RESTAURANT_PARENT_CATEGORIES: readonly RestaurantParentCategory[] = [
  { slug: 'fine-dining', label: 'Fine Dining' },
  { slug: 'casual-dining', label: 'Casual Dining' },
  { slug: 'fast-casual', label: 'Fast Casual' },
  { slug: 'fast-food', label: 'Fast Food' },
  { slug: 'cafe', label: 'Cafe' },
  { slug: 'bar', label: 'Bar' },
  { slug: 'bistro', label: 'Bistro' },
  { slug: 'food-hall-stall', label: 'Food Hall Stall' },
  { slug: 'food-truck', label: 'Food Truck' },
  { slug: 'family-style', label: 'Family Style' },
  { slug: 'buffet', label: 'Buffet' },
  { slug: 'diner', label: 'Diner' },
  { slug: 'brunch-spot', label: 'Brunch Spot' },
  { slug: 'barbecue-joint', label: 'Barbecue Joint' },
  { slug: 'steakhouse', label: 'Steakhouse' },
  { slug: 'seafood-restaurant', label: 'Seafood Restaurant' },
  { slug: 'vegetarian-vegan', label: 'Vegetarian/Vegan' },
  { slug: 'bakery', label: 'Bakery' },
  { slug: 'pub', label: 'Pub' },
  { slug: 'dessert-shop', label: 'Dessert Shop' },
  { slug: 'pop-up-restaurant', label: 'Pop-Up Restaurant' },
  { slug: 'food-court', label: 'Food Court' },
] as const
