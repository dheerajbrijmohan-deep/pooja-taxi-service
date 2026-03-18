import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { motion } from "motion/react";

const fleet = [
  {
    name: "Sedan",
    waName: "Sedan",
    passengers: 4,
    pricePerKm: 12,
    image: "/assets/generated/swift-dzire-pearl-white-side.dim_800x500.jpg",
    features: ["AC", "Music System", "GPS Navigation"],
  },
  {
    name: "SUV - Innova Crysta",
    waName: "SUV+Innova+Crysta",
    passengers: 6,
    pricePerKm: 18,
    image: "/assets/generated/suv-innova-crysta.dim_800x500.jpg",
    features: ["AC", "Spacious Luggage", "GPS Navigation", "Charging Points"],
  },
  {
    name: "Luxury - VW Virtus",
    waName: "Luxury+VW+Virtus",
    passengers: 4,
    pricePerKm: 25,
    image: "/assets/generated/luxury-vw-virtus-black.dim_800x500.jpg",
    features: ["Premium AC", "Leather Seats", "WiFi", "Refreshments"],
  },
];

export default function Fleet() {
  return (
    <section id="fleet" className="py-20 bg-brand-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-4xl font-bold text-white mb-3">
            Choose Your Ride
          </h2>
          <p className="text-white/60 text-base">
            Select the perfect vehicle for your journey
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {fleet.map((vehicle, i) => (
            <motion.div
              key={vehicle.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              data-ocid={`fleet.item.${i + 1}`}
              className="bg-card rounded-2xl overflow-hidden shadow-card group hover:-translate-y-1 transition-transform"
            >
              <div className="bg-muted h-48 flex items-center justify-center p-4">
                <img
                  src={vehicle.image}
                  alt={vehicle.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-xl text-foreground mb-1">
                  {vehicle.name}
                </h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                  <Users className="w-4 h-4" />
                  <span>Up to {vehicle.passengers} passengers</span>
                </div>
                <ul className="space-y-1 mb-4">
                  {vehicle.features.map((f) => (
                    <li
                      key={f}
                      className="text-xs text-muted-foreground flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  data-ocid={`fleet.price.button.${i + 1}`}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full"
                  onClick={() =>
                    window.open(
                      `https://wa.me/919156528800?text=Hi%2C%20I%20want%20to%20book%20a%20${vehicle.waName}`,
                      "_blank",
                    )
                  }
                >
                  ₹{vehicle.pricePerKm}/km — Book Now
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
