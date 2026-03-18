import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { motion } from "motion/react";

const fleet = [
  {
    name: "Sedan",
    passengers: 4,
    pricePerKm: 12,
    image: "/assets/generated/vehicle-sedan-transparent.dim_400x250.png",
    features: ["AC", "Music System", "GPS Navigation"],
  },
  {
    name: "SUV",
    passengers: 6,
    pricePerKm: 18,
    image: "/assets/generated/vehicle-suv.dim_400x250.png",
    features: ["AC", "Spacious Luggage", "GPS Navigation", "Charging Points"],
  },
  {
    name: "Luxury",
    passengers: 4,
    pricePerKm: 25,
    image: "/assets/generated/vehicle-luxury.dim_400x250.png",
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
                  className="h-full w-full object-contain"
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
                    document
                      .querySelector("#booking")
                      ?.scrollIntoView({ behavior: "smooth" })
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
