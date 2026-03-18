import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Benefits from "./components/Benefits";
import Contact from "./components/Contact";
import Fleet from "./components/Fleet";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import Services from "./components/Services";
import TestimonialsAndMap from "./components/TestimonialsAndMap";
import WhyChooseUs from "./components/WhyChooseUs";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Hero />
          <Services />
          <Fleet />
          <WhyChooseUs />
          <Benefits />
          <TestimonialsAndMap />
          <Contact />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
