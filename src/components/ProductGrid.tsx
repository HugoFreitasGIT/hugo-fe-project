import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
