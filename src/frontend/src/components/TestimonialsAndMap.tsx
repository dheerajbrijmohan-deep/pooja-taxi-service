import { MapPin, Star } from "lucide-react";
import { motion } from "motion/react";

const testimonials = [
  {
    quote:
      "Great service! Very punctual and professional. The driver was courteous and the car was spotless.",
    name: "Rahul M.",
    rating: 5,
  },
  {
    quote:
      "Comfortable ride and courteous driver. Highly recommend Pooja Taxi for airport transfers!",
    name: "Priya S.",
    rating: 5,
  },
  {
    quote:
      "Best taxi service in the area. Affordable rates and on-time every single time. Will use again!",
    name: "Amit K.",
    rating: 5,
  },
];

const gridLines = [0, 1, 2, 3, 4, 5, 6, 7];

export default function TestimonialsAndMap() {
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Testimonials */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl font-bold text-foreground mb-8"
            >
              Client Testimonials
            </motion.h2>
            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  data-ocid={`testimonials.item.${i + 1}`}
                  className="bg-card rounded-xl p-5 shadow-card border border-border"
                >
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={`star-${t.name}-${j}`}
                        className="w-4 h-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-4 italic">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {t.name[0]}
                    </div>
                    <span className="font-semibold text-sm text-foreground">
                      {t.name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Find Us */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl font-bold text-foreground mb-8"
            >
              Find Us
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-card rounded-xl overflow-hidden shadow-card border border-border h-80"
              data-ocid="map.card"
            >
              <div className="h-full flex flex-col items-center justify-center bg-muted relative">
                <div className="absolute inset-0 opacity-5">
                  {gridLines.map((n) => (
                    <div
                      key={`h-${n}`}
                      className="absolute border-t border-foreground"
                      style={{ top: `${n * 14}%`, left: 0, right: 0 }}
                    />
                  ))}
                  {gridLines.map((n) => (
                    <div
                      key={`v-${n}`}
                      className="absolute border-l border-foreground"
                      style={{ left: `${n * 14}%`, top: 0, bottom: 0 }}
                    />
                  ))}
                </div>
                <div className="relative z-10 text-center">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <MapPin className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <p className="font-bold text-foreground text-base">
                    123 Main Road, City Center
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Near Central Bus Terminal
                  </p>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="map.directions.link"
                    className="inline-block mt-4 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
                  >
                    Get Directions →
                  </a>
                </div>
              </div>
            </motion.div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="bg-card rounded-lg px-4 py-3 flex items-center gap-3 border border-border">
                <span className="text-primary text-xl">📞</span>
                <div>
                  <p className="text-xs text-muted-foreground">Call Us</p>
                  <p className="font-semibold text-sm text-foreground">
                    +91 98765 43210
                  </p>
                </div>
              </div>
              <div className="bg-card rounded-lg px-4 py-3 flex items-center gap-3 border border-border">
                <span className="text-primary text-xl">✉️</span>
                <div>
                  <p className="text-xs text-muted-foreground">Email Us</p>
                  <p className="font-semibold text-sm text-foreground">
                    info@poojataxi.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
