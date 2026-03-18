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
    <section id="services" className="py-20">
      {/* Orange band header */}
      <div className="bg-primary py-6 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-primary-foreground tracking-wider font-display">
            Our Services
          </h2>
          <p className="text-primary-foreground/80 text-sm hidden md:block">
            Tailored transportation for every need
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              data-ocid={`services.item.${i + 1}`}
              className="bg-card rounded-2xl p-6 shadow-card text-center hover:shadow-lg transition-shadow border border-border"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <service.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
