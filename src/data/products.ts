import type { Product, ProductCategory } from "@/types/product";

const home: ProductCategory = { slug: "home", name: "Home" };
const kitchen: ProductCategory = { slug: "kitchen", name: "Kitchen" };
const workspace: ProductCategory = { slug: "workspace", name: "Workspace" };

export const products: Product[] = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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
    id: "5",
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
    id: "6",
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
    id: "7",
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
    id: "8",
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
    id: "9",
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
  {
    id: "10",
    slug: "wool-cushion-cover",
    name: "Wool Cushion Cover",
    description:
      "A soft lambswool cover with a hidden zip and a single centre button, made to soften any sofa or chair.",
    price: { amount: 4900, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/wool-cushion-cover.svg",
      alt: "Square stone-coloured cushion with a stitched border and centre button",
    },
  },
  {
    id: "11",
    slug: "oak-wall-shelf",
    name: "Oak Wall Shelf",
    description:
      "A solid oak shelf with concealed fixings, sized for a few books and a small plant.",
    price: { amount: 7900, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/oak-wall-shelf.svg",
      alt: "Floating oak shelf holding a small potted plant and books",
    },
  },
  {
    id: "12",
    slug: "round-wall-mirror",
    name: "Round Wall Mirror",
    description:
      "A round mirror in a turned oak frame, hung from a simple leather strap.",
    price: { amount: 13900, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/round-wall-mirror.svg",
      alt: "Round mirror with a wooden frame hanging from a leather strap",
    },
  },
  {
    id: "13",
    slug: "soy-wax-candle",
    name: "Soy Wax Candle",
    description:
      "A hand-poured soy wax candle in a matte ceramic vessel, scented with cedar and fig.",
    price: { amount: 2800, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/soy-wax-candle.svg",
      alt: "Lit candle in a dark ceramic vessel with a small label",
    },
  },
  {
    id: "14",
    slug: "woven-storage-basket",
    name: "Woven Storage Basket",
    description:
      "A sturdy basket woven from natural seagrass, with cut-out handles for throws and everyday clutter.",
    price: { amount: 5600, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/woven-storage-basket.svg",
      alt: "Woven basket with handles holding a folded sage throw",
    },
  },
  {
    id: "15",
    slug: "bud-vase-trio",
    name: "Bud Vase Trio",
    description:
      "Three small stoneware vases in complementary shapes and glazes, made for single stems.",
    price: { amount: 4800, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/bud-vase-trio.svg",
      alt: "Three small vases in clay, stone and sage, each holding a single stem",
    },
  },
  {
    id: "16",
    slug: "ceramic-incense-holder",
    name: "Ceramic Incense Holder",
    description:
      "A low stoneware dish that holds a single incense stick and catches the ash.",
    price: { amount: 2400, currency: "EUR" },
    category: home,
    image: {
      src: "/images/products/ceramic-incense-holder.svg",
      alt: "Shallow ceramic dish holding a lit incense stick",
    },
  },
  {
    id: "17",
    slug: "stoneware-dinner-plates",
    name: "Stoneware Dinner Plates",
    description:
      "A set of four stoneware dinner plates with a satin glaze and a gently raised rim.",
    price: { amount: 6800, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/stoneware-dinner-plates.svg",
      alt: "Stack of stone-coloured dinner plates with one plate standing behind",
    },
  },
  {
    id: "18",
    slug: "linen-tea-towels",
    name: "Linen Tea Towels",
    description:
      "Two absorbent linen tea towels with a fine stripe and a hanging loop.",
    price: { amount: 2400, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/linen-tea-towels.svg",
      alt: "Two folded striped tea towels in sage and clay",
    },
  },
  {
    id: "19",
    slug: "cast-iron-skillet",
    name: "Cast Iron Skillet",
    description:
      "A pre-seasoned cast iron skillet that holds heat evenly, from stovetop to oven.",
    price: { amount: 8500, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/cast-iron-skillet.svg",
      alt: "Black cast iron skillet with a long handle",
    },
  },
  {
    id: "20",
    slug: "glass-storage-jars",
    name: "Glass Storage Jars",
    description:
      "Three airtight glass jars with oak lids, sized for grains, pulses and loose tea.",
    price: { amount: 3600, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/glass-storage-jars.svg",
      alt: "Three glass jars of different heights with wooden lids",
    },
  },
  {
    id: "21",
    slug: "marble-mortar-and-pestle",
    name: "Marble Mortar and Pestle",
    description:
      "A heavy white marble mortar and pestle for grinding spices, herbs and pastes.",
    price: { amount: 5400, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/marble-mortar-and-pestle.svg",
      alt: "White marble mortar with a pestle resting inside",
    },
  },
  {
    id: "22",
    slug: "enamel-tea-kettle",
    name: "Enamel Tea Kettle",
    description:
      "A sage enamel kettle with a black handle that suits every hob, including induction.",
    price: { amount: 7400, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/enamel-tea-kettle.svg",
      alt: "Sage green enamel kettle with a black handle",
    },
  },
  {
    id: "23",
    slug: "beech-utensil-set",
    name: "Beech Utensil Set",
    description:
      "A spoon, spatula and slotted spoon in oiled beech, kept together in a stoneware crock.",
    price: { amount: 3200, currency: "EUR" },
    category: kitchen,
    image: {
      src: "/images/products/beech-utensil-set.svg",
      alt: "Three wooden cooking utensils standing in a stone-coloured crock",
    },
  },
  {
    id: "24",
    slug: "oak-monitor-stand",
    name: "Oak Monitor Stand",
    description:
      "A solid oak stand that lifts your screen to eye level and frees space beneath for a keyboard.",
    price: { amount: 11900, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/oak-monitor-stand.svg",
      alt: "Monitor on an oak stand with a keyboard stored underneath",
    },
  },
  {
    id: "25",
    slug: "linen-notebook",
    name: "Linen Notebook",
    description:
      "A lay-flat A5 notebook bound in linen, with dotted pages and an elastic closure.",
    price: { amount: 1800, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/linen-notebook.svg",
      alt: "Sage linen notebook standing upright next to a smaller notebook",
    },
  },
  {
    id: "26",
    slug: "leather-cable-organiser",
    name: "Leather Cable Organiser",
    description:
      "Vegetable-tanned leather straps with a press stud that keep chargers and cables neatly coiled.",
    price: { amount: 2200, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/leather-cable-organiser.svg",
      alt: "Coiled black cable held by a brown leather strap",
    },
  },
  {
    id: "27",
    slug: "brass-ballpoint-pen",
    name: "Brass Ballpoint Pen",
    description:
      "A weighted solid brass pen that develops a warm patina with daily use.",
    price: { amount: 3900, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/brass-ballpoint-pen.svg",
      alt: "Brass pen resting on a small wooden stand",
    },
  },
  {
    id: "28",
    slug: "felt-laptop-sleeve",
    name: "Felt Laptop Sleeve",
    description:
      "A padded wool felt sleeve with a leather tab, cut to fit most 13 to 14 inch laptops.",
    price: { amount: 5900, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/felt-laptop-sleeve.svg",
      alt: "Charcoal felt laptop sleeve with a tan leather tab",
    },
  },
  {
    id: "29",
    slug: "stoneware-pencil-cup",
    name: "Stoneware Pencil Cup",
    description:
      "A glazed stoneware cup with an unglazed foot that keeps pens and pencils within reach.",
    price: { amount: 2400, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/stoneware-pencil-cup.svg",
      alt: "Stone-coloured cup holding three pencils",
    },
  },
  {
    id: "30",
    slug: "oak-bookends",
    name: "Oak Bookends",
    description:
      "A pair of solid oak bookends with a weighted base that holds a full row of books upright.",
    price: { amount: 4500, currency: "EUR" },
    category: workspace,
    image: {
      src: "/images/products/oak-bookends.svg",
      alt: "Row of books held between two oak bookends",
    },
  },
];
