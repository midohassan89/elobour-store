import OrderHistory from "@/components/account/OrderHistory";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function OrdersPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50">
        <OrderHistory />
      </main>
      <Footer />
    </>
  );
}
