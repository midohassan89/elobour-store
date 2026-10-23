import SupportContent from "@/components/legal/SupportContent";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { legalMetadata } from "@/lib/legalMetadata";

export function generateMetadata() {
  return legalMetadata("supportTitle");
}

export default function SupportPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50 dark:bg-gray-950">
        <SupportContent />
      </main>
      <Footer />
    </>
  );
}
