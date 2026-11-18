import CategorySection from "@/components/CategorySection";
import ConvertLocationTrigger from "@/components/convert/ConvertLocationTrigger";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";

// Convert location for homepage experiments, set to the "Manually" trigger.
const CONVERT_HOMEPAGE_LOCATION_ID = "100118995";

export default function Home() {
  return (
    <>
      <ConvertLocationTrigger locationId={CONVERT_HOMEPAGE_LOCATION_ID} />
      <Header currentPath="/" />
      <main id="main" className="flex-1">
        <Hero />
        <CategorySection />
      </main>
      <Footer />
    </>
  );
}
