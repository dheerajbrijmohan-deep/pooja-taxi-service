import { Award, Clock, IndianRupee, Shield } from "lucide-react";
import { motion } from "motion/react";

const reasons = [
  {
    icon: Clock,
    title: "24/7 Availability",
    desc: "Round-the-clock service, whenever you need a ride.",
  },
  {
    icon: Award,
    title: "Professional Drivers",
    desc: "Experienced, verified, and courteous drivers.",
  },
  {
    icon: Shield,
    title: "Safe & Comfortable",
    desc: "Well-maintained vehicles with safety as priority.",
  },
  {
    icon: IndianRupee,
    title: "Affordable Rates",
    desc: "Transparent pricing with no hidden charges.",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="about" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-4xl font-bold text-foreground mb-3">
            Why Choose Us
          </h2>
          <p className="text-muted-foreground">
            We go above and beyond to make your travel seamless
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {reasons.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              data-ocid={`why.item.${i + 1}`}
              className="text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-9 h-9 text-primary" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
