import { Award, Clock, IndianRupee, Shield } from "lucide-react";
import { motion } from "motion/react";

const reasons = [
  {
    icon: Clock,
    title: "24/7 Availability",
    desc: "Round-the-clock service, whenever you need a ride.",
    stat: "24/7",
  },
  {
    icon: Award,
    title: "Professional Drivers",
    desc: "Experienced, verified, and courteous drivers.",
    stat: "100%",
  },
  {
    icon: Shield,
    title: "Safe & Comfortable",
    desc: "Well-maintained vehicles with safety as priority.",
    stat: "5★",
  },
  {
    icon: IndianRupee,
    title: "Affordable Rates",
    desc: "Transparent pricing with no hidden charges.",
    stat: "Best",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="about" className="py-20 bg-brand-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-primary font-bold text-xs tracking-[0.3em] uppercase mb-2">
            OUR PROMISE
          </p>
          <h2 className="font-display text-4xl font-bold text-white italic mb-3">
            Why Choose Us
          </h2>
          <p className="text-white/50 max-w-md mx-auto">
            We go above and beyond to make your travel seamless
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              data-ocid={`why.item.${i + 1}`}
              className="group relative bg-white/5 hover:bg-white/10 border-l-4 border-l-primary border border-white/10 rounded-r-2xl p-6 transition-all hover:-translate-y-1"
            >
              {/* Stat accent */}
              <div className="font-display text-3xl font-bold text-primary/40 mb-3 leading-none">
                {item.stat}
              </div>
              <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-base text-white mb-1.5">
                {item.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
