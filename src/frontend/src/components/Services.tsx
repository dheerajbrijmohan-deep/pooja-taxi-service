import { Building2, Clock, MapPin, Plane } from "lucide-react";
import { motion } from "motion/react";

const services = [
  {
    icon: Building2,
    title: "City Transfer",
    description:
      "Comfortable and reliable rides within the city. Beat traffic with our expert local drivers.",
  },
  {
    icon: Plane,
    title: "Airport Transfer",
    description:
      "On-time airport pickups and drops. We track your flight so you never miss a connection.",
  },
  {
    icon: MapPin,
    title: "Outstation",
    description:
      "Long-distance trips to any destination across the state. Comfortable for extended journeys.",
  },
  {
    icon: Clock,
    title: "Hourly Rental",
    description:
      "Book by the hour and travel at your own pace. Perfect for meetings and errands.",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <p className="text-primary font-bold text-xs tracking-[0.3em] uppercase mb-2">
            WHAT WE OFFER
          </p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-bold text-foreground italic">
              Our Services
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tailored transportation solutions for every journey — from daily
              commutes to interstate travel.
            </p>
          </div>
          <div className="w-16 h-1 bg-primary rounded-full mt-4" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              data-ocid={`services.item.${i + 1}`}
              className="relative rounded-2xl p-6 shadow-card overflow-hidden border bg-card border-border transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-primary/10">
                <service.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-foreground">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
