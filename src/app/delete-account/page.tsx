import DeleteAccountContent from "@/components/legal/DeleteAccountContent";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { legalMetadata } from "@/lib/legalMetadata";

export function generateMetadata() {
  return legalMetadata("deleteAccountTitle");
}

export default function DeleteAccountPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50 dark:bg-gray-950">
        <DeleteAccountContent />
      </main>
      <Footer />
    </>
  );
}
