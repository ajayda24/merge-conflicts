export interface Product {
  id: string;
  name: string;
  description: string;
  originalPriceInPaise: number;
  launchPriceInPaise: number;
  currency: string;
  features: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: "matriai-premium",
    name: "MatriLine Premium",
    description:
      "Unlimited video consultations with verified doctors and counsellors",
    originalPriceInPaise: 20000, // ₹200
    launchPriceInPaise: 0, // ₹0 launch price — FREE
    currency: "inr",
    features: [
      "Unlimited 1-to-1 video consultations",
      "Access to all verified doctors & counsellors",
      "Priority booking",
      "AI chat — unlimited messages",
      "Advanced mood analytics",
      "Community badges",
    ],
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
