import { MapPin, Star } from "lucide-react";
import { motion } from "motion/react";

const testimonials = [
  {
    quote:
      "Great service! Very punctual and professional. The driver was courteous and the car was spotless.",
    name: "Rahul M.",
    role: "Regular Customer",
    rating: 5,
  },
  {
    quote:
      "Comfortable ride and courteous driver. Highly recommend Pooja Taxi for airport transfers!",
    name: "Priya S.",
    role: "Business Traveler",
    rating: 5,
  },
  {
    quote:
      "Best taxi service in the area. Affordable rates and on-time every single time. Will use again!",
    name: "Amit K.",
    role: "Outstation Trip",
    rating: 5,
  },
];

const gridLines = [0, 1, 2, 3, 4, 5, 6, 7];

const avatarColors = [
  "from-primary/80 to-primary",
  "from-amber-500/80 to-amber-600",
  "from-orange-600/80 to-orange-700",
];

export default function TestimonialsAndMap() {
  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Testimonials */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <p className="text-primary font-bold text-xs tracking-[0.3em] uppercase mb-2">
                HAPPY RIDERS
              </p>
              <h2 className="font-display text-3xl font-bold text-foreground italic">
                Client Testimonials
              </h2>
            </motion.div>

            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  data-ocid={`testimonials.item.${i + 1}`}
                  className="relative rounded-xl p-5 border overflow-hidden bg-card border-border shadow-card"
                >
                  <span className="absolute top-2 right-4 font-display text-8xl font-bold leading-none select-none pointer-events-none text-primary/10">
                    &ldquo;
                  </span>

                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={`star-${t.name}-${j}`}
                        className="w-3.5 h-3.5 fill-primary text-primary"
                      />
                    ))}
                  </div>

                  <p className="text-sm leading-relaxed mb-4 italic relative z-10 text-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${avatarColors[i]}`}
                    >
                      {t.name[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-sm block text-foreground">
                        {t.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.role}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Find Us */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <p className="text-primary font-bold text-xs tracking-[0.3em] uppercase mb-2">
                LOCATION
              </p>
              <h2 className="font-display text-3xl font-bold text-foreground italic">
                Find Us
              </h2>
            </motion.div>

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
                <div className="relative z-10 text-center px-6">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <MapPin className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <p className="font-bold text-foreground text-base">
                    Chatrapati Shivaji Maharaj Chowk
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Shambhu Nagar Main Road, Nagpur, Maharashtra - 440014
                  </p>
                  <a
                    href="https://maps.app.goo.gl/YSnJSLun4peyYznv9"
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
                    +91 91-56-52-8800
                  </p>
                </div>
              </div>
              <div className="bg-card rounded-lg px-4 py-3 flex items-center gap-3 border border-border">
                <span className="text-primary text-xl">✉️</span>
                <div>
                  <p className="text-xs text-muted-foreground">Email Us</p>
                  <p className="font-semibold text-sm text-foreground">
                    contact@ptsnagpur.in
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
