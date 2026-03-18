import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Phone,
  User,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

export default function Hero() {
  const [form, setForm] = useState({
    pickupLocation: "",
    destination: "",
    date: "",
    time: "",
    passengers: "1",
    customerName: "",
    customerPhone: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.pickupLocation ||
      !form.destination ||
      !form.date ||
      !form.customerName ||
      !form.customerPhone
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    const text = encodeURIComponent(
      `Booking Request:\nName: ${form.customerName}\nPhone: ${form.customerPhone}\nFrom: ${form.pickupLocation}\nTo: ${form.destination}\nDate: ${form.date}${form.time ? ` at ${form.time}` : ""}\nPassengers: ${form.passengers}`,
    );
    window.open(`https://wa.me/919156528800?text=${text}`, "_blank");
    toast.success("Redirecting to WhatsApp to confirm your booking!");
    setForm({
      pickupLocation: "",
      destination: "",
      date: "",
      time: "",
      passengers: "1",
      customerName: "",
      customerPhone: "",
    });
  };

  return (
    <section
      id="home"
      className="relative min-h-[600px] md:min-h-[700px] flex items-center"
      style={{
        backgroundImage: `url('/assets/generated/hero-city-taxi.dim_1920x800.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/60 to-black/40" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headlines */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/50 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5">
              <span className="text-base">🚕</span>
              <span className="text-primary font-bold text-sm tracking-[0.2em] uppercase">
                POOJA TAXI SERVICES
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold italic text-white leading-tight mb-6">
              Travel with
              <br />
              <span className="text-primary">Ease</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-md">
              Comfortable, reliable, and affordable taxi services across the
              city and beyond. Your journey, our commitment.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {[
                "⭐ 4.9 Rated",
                "✅ 10,000+ Rides",
                "🛡️ Insured Rides",
                "🕐 24/7 Available",
              ].map((badge) => (
                <span
                  key={badge}
                  className="text-xs text-white/70 font-medium bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                data-ocid="hero.book_now.primary_button"
                onClick={() =>
                  window.open(
                    "https://wa.me/919156528800?text=Hi%2C%20I%20want%20to%20book%20a%20ride",
                    "_blank",
                  )
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 rounded-full text-base tracking-wider shadow-lg shadow-primary/30"
              >
                BOOK YOUR RIDE
              </Button>
              <Button
                data-ocid="hero.join_driver.secondary_button"
                variant="outline"
                onClick={() =>
                  document
                    .querySelector("#benefits")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="border-white text-white hover:bg-white hover:text-foreground font-bold px-8 py-6 rounded-full text-base tracking-wider bg-transparent"
              >
                JOIN AS DRIVER
              </Button>
            </div>
          </motion.div>

          {/* Right: Booking Form */}
          <motion.div
            id="booking"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-[oklch(0.18_0_0/0.92)] backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/10"
            data-ocid="booking.modal"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="text-white font-bold text-xl tracking-wide">
                Instant Booking via WhatsApp
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                  PICKUP LOCATION *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    data-ocid="booking.pickup.input"
                    name="pickupLocation"
                    value={form.pickupLocation}
                    onChange={handleChange}
                    placeholder="Enter pickup address"
                    className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                  DESTINATION *
                </Label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    data-ocid="booking.destination.input"
                    name="destination"
                    value={form.destination}
                    onChange={handleChange}
                    placeholder="Enter destination"
                    className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                    DATE *
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input
                      data-ocid="booking.date.input"
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={handleChange}
                      className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                    TIME
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-primary" />
                    <Input
                      data-ocid="booking.time.input"
                      name="time"
                      type="time"
                      value={form.time}
                      onChange={handleChange}
                      className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                  PASSENGERS
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <select
                    data-ocid="booking.passengers.select"
                    name="passengers"
                    value={form.passengers}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-md bg-white/8 border border-white/15 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 text-sm transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n} className="bg-zinc-800">
                        {n} Passenger{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                  YOUR NAME *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    data-ocid="booking.name.input"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs tracking-wider mb-1 block">
                  PHONE NUMBER *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    data-ocid="booking.phone.input"
                    name="customerPhone"
                    value={form.customerPhone}
                    onChange={handleChange}
                    placeholder="+91 XXXXX XXXXX"
                    className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
              <Button
                data-ocid="booking.submit.button"
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl tracking-wider mt-2 shadow-lg shadow-primary/25 transition-all"
              >
                BOOK YOUR RIDE VIA WHATSAPP →
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
