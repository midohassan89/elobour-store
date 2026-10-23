import PrivacyContent from "@/components/legal/PrivacyContent";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { legalMetadata } from "@/lib/legalMetadata";

export function generateMetadata() {
  return legalMetadata("privacyTitle");
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50 dark:bg-gray-950">
        <PrivacyContent />
      </main>
      <Footer />
    </>
  );
}
