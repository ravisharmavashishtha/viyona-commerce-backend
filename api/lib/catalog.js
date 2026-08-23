/**
 * Viyona Designs — Master Direct Commerce Product Catalog
 */

export const PRODUCTS = {
  ganesha: {
    id: 'ganesha',
    sku: 'VD-GANESHA-WHT-01',
    name: 'Matte White Lord Ganesha Idol',
    subtitle: 'Contemporary Minimalist Sacred Sculpture',
    price: 599,
    mrp: 1199,
    dimensions: '7 × 4 × 3.5 inches',
    weight_kg: 0.4,
    length_cm: 17.8,
    breadth_cm: 10.2,
    height_cm: 8.9,
    material: '100% Plant-Based Bio-PLA (0.08mm Layer Precision)',
    image_url: 'https://viyonadesigns.com/images/ganesha_lifestyle_2k.png',
    description: 'Thoughtfully sculpted in India with zero-compromise precision. Ideal for Car Dashboards, Pooja Mandir, and Modern Desks.'
  },
  puppy: {
    id: 'puppy',
    sku: 'GEN-PUPPY-TRAY-WHT',
    name: 'Cute Sleeping Puppy Desk Tray',
    subtitle: 'Artisan Key & Accessory Catchall',
    price: 499,
    mrp: 899,
    dimensions: '6 × 4 × 3 inches',
    weight_kg: 0.25,
    length_cm: 15.2,
    breadth_cm: 10.2,
    height_cm: 7.6,
    material: 'Eco Bio-PLA Silk Finish',
    image_url: 'https://viyonadesigns.com/images/puppy_tray_lifestyle.png',
    description: 'Adorably detailed sleeping puppy desk organizer for keys, coins, and everyday rings.'
  },
  phonestand: {
    id: 'phonestand',
    sku: 'VD-STAND-SLATE-01',
    name: 'Multi-Angle Desk Phone Stand',
    subtitle: 'Ergonomic Minimalist Device Cradle',
    price: 299,
    mrp: 599,
    dimensions: '4 × 3 × 3 inches',
    weight_kg: 0.15,
    length_cm: 10.0,
    breadth_cm: 7.6,
    height_cm: 7.6,
    material: 'High-Density Reinforced PLA',
    image_url: 'https://viyonadesigns.com/images/phone_stand_lifestyle.png',
    description: 'Sturdy, clean cable-pass phone and tablet stand for clutter-free workspaces.'
  }
};

export function getProductById(id) {
  return PRODUCTS[id.toLowerCase()] || null;
}
