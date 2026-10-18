import ProfileAccount from "@/components/account/ProfileAccount";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function AccountPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-stone-50 dark:bg-gray-900">
        <ProfileAccount />
      </main>
      <Footer />
    </>
  );
}
