export type Product = {
  id: number;
  name: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  price: string;
  stock: number;
};

export const defaultProducts: Product[] = [
  {
    id: 1,
    name: "iPhone X Display",
    category: "Displays / LCD",
    brand: "iPhone",
    model: "iPhone X",
    description: "Premium Quality",
    price: "8500",
    stock: 1,
  },
  {
    id: 2,
    name: "Samsung A12 Battery",
    category: "Batteries",
    brand: "Samsung",
    model: "A12",
    description: "Original",
    price: "2500",
    stock: 4,
  },
  {
    id: 3,
    name: "C61 ORG PANEL",
    category: "Displays / LCD",
    brand: "Realme",
    model: "C61",
    description: "100% ORIGINAL",
    price: "6500",
    stock: 5,
  },
  {
    id: 4,
    name: "Y19S ORIGINAL PANEL",
    category: "Displays / LCD",
    brand: "Vivo",
    model: "Y19S",
    description: "100% ORIGINAL",
    price: "6500",
    stock: 5,
  },
  {
    id: 5,
    name: "F21 PRO 4G ORGINAL SHAD",
    category: "Displays / LCD",
    brand: "Oppo",
    model: "F21 Pro 4G",
    description: "100% ORIGNAL",
    price: "12000",
    stock: 10,
  },
];

export const PRODUCT_STORAGE_KEY = "new-arif-mobile-center-products";
export const PRODUCT_UPDATED_EVENT = "new-arif-mobile-center-products-updated";

export function loadProducts(): Product[] {
  if (typeof window === "undefined") return defaultProducts;

  try {
    const raw = window.localStorage.getItem(PRODUCT_STORAGE_KEY);

    if (!raw) {
      window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(defaultProducts));
      return defaultProducts;
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Product[];
    }
  } catch (error) {
    console.error("Failed to load products from localStorage:", error);
  }

  return defaultProducts;
}

export function saveProducts(products: Product[]) {
  if (typeof window === "undefined") return;

  const nextProducts = products.length > 0 ? products : defaultProducts;
  window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(nextProducts));
  window.dispatchEvent(new Event(PRODUCT_UPDATED_EVENT));
}
