import OrderDetails from "@/components/account/OrderDetails";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function OrderDetailsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50">
        <OrderDetails />
      </main>
      <Footer />
    </>
  );
}
