import type { Product, ProductCategory } from "@/types/product";

const home: ProductCategory = { slug: "home", name: "Home" };
const kitchen: ProductCategory = { slug: "kitchen", name: "Kitchen" };
const workspace: ProductCategory = { slug: "workspace", name: "Workspace" };

export const products: Product[] = [
  {
    id: 1,
    slug: "arc-ceramic-vase",
    name: "Arc Ceramic Vase",
    description:
      "A hand-thrown stoneware vase with an arched silhouette and a soft matte glaze.",
    price: { amount: 6400, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/arc-ceramic-vase.svg",
      alt: "Tall clay-coloured ceramic vase with an arched top",
    },
  },
  {
    id: 2,
    slug: "linen-throw",
    name: "Linen Throw",
    description:
      "A stonewashed linen throw, woven in a quiet stripe and softened for everyday use.",
    price: { amount: 8900, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/linen-throw.svg",
      alt: "Folded linen throw in sage and stone tones",
    },
  },
  {
    id: 3,
    slug: "orb-table-lamp",
    name: "Orb Table Lamp",
    description:
      "A compact lamp with an opal glass globe that casts a warm, even light.",
    price: { amount: 12900, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/orb-table-lamp.svg",
      alt: "Table lamp with a round glass shade on a dark base",
    },
  },
  {
    id: 4,
    slug: "stoneware-mug-set",
    name: "Stoneware Mug Set",
    description:
      "Two generous stoneware mugs with an unglazed foot, made for slow mornings.",
    price: { amount: 3800, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/stoneware-mug-set.svg",
      alt: "Two stoneware mugs side by side in stone and clay glazes",
    },
  },
  {
    id: 5,
    slug: "oak-serving-board",
    name: "Oak Serving Board",
    description:
      "A solid oak board with a rounded handle, finished with food-safe oil.",
    price: { amount: 4600, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/oak-serving-board.svg",
      alt: "Wooden serving board with a rounded handle",
    },
  },
  {
    id: 6,
    slug: "pour-over-set",
    name: "Pour-Over Set",
    description:
      "A ceramic dripper and glass carafe for brewing a clean, balanced cup.",
    price: { amount: 5200, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/pour-over-set.svg",
      alt: "Ceramic coffee dripper resting on a glass carafe",
    },
  },
  {
    id: 7,
    slug: "felt-desk-mat",
    name: "Felt Desk Mat",
    description:
      "A dense wool felt mat that protects your desk and softens the sound of work.",
    price: { amount: 4200, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/felt-desk-mat.svg",
      alt: "Rectangular felt desk mat in a muted sage colour",
    },
  },
  {
    id: 8,
    slug: "walnut-pen-tray",
    name: "Walnut Pen Tray",
    description:
      "A carved walnut tray that keeps pens, clips and small tools in one place.",
    price: { amount: 2900, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/walnut-pen-tray.svg",
      alt: "Shallow wooden tray holding two pens",
    },
  },
  {
    id: 9,
    slug: "aluminium-task-light",
    name: "Aluminium Task Light",
    description:
      "An adjustable task light in anodised aluminium with a focused, glare-free beam.",
    price: { amount: 14900, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/aluminium-task-light.svg",
      alt: "Angled desk lamp with a slim arm and conical shade",
    },
  },
];
