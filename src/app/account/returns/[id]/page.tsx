import ReturnDetails from "@/components/account/ReturnDetails";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function ReturnDetailsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50">
        <ReturnDetails />
      </main>
      <Footer />
    </>
  );
}
