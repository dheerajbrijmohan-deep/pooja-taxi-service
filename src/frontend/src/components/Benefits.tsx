import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Car,
  Gift,
  Heart,
  HeartPulse,
  Shield,
  ShieldCheck,
  Star,
  Umbrella,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

const customerBenefits = [
  {
    icon: ShieldCheck,
    title: "Insured Rides",
    desc: "Every ride is backed by comprehensive insurance coverage for your peace of mind.",
    highlight: true,
  },
  {
    icon: HeartPulse,
    title: "Injury Coverage",
    desc: "Full coverage for any medical expenses in case of an injury during your ride.",
    highlight: true,
  },
  {
    icon: Umbrella,
    title: "Life Insurance",
    desc: "In case of a fatal accident, your family is fully compensated. We take responsibility seriously.",
    highlight: true,
  },
  {
    icon: Users,
    title: "24/7 Support",
    desc: "Round-the-clock customer support for bookings, complaints, or emergencies.",
    highlight: false,
  },
  {
    icon: BadgeCheck,
    title: "Professional Drivers",
    desc: "All our drivers are verified, trained, and background-checked for your safety.",
    highlight: false,
  },
  {
    icon: Car,
    title: "Clean Vehicles",
    desc: "Our fleet is regularly sanitised and maintained to the highest standards.",
    highlight: false,
  },
];

const driverBenefits = [
  {
    icon: Briefcase,
    title: "Full-Time Permanent Employment",
    desc: "No gig work uncertainty. You are a full-time employee with job security and a fixed salary.",
    highlight: true,
  },
  {
    icon: Heart,
    title: "Health Insurance",
    desc: "Comprehensive medical coverage for you and your family. Your health is our priority.",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Accidental Insurance",
    desc: "Full protection on the job. If you're injured at work, we've got you fully covered.",
    highlight: true,
  },
  {
    icon: Star,
    title: "Paid Leaves",
    desc: "Enjoy annual paid leave entitlement — rest and recharge without losing income.",
    highlight: false,
  },
  {
    icon: Gift,
    title: "Loyalty Bonus",
    desc: "Long-term commitment is rewarded with generous loyalty bonuses and recognition.",
    highlight: false,
  },
  {
    icon: Award,
    title: "Growth Opportunities",
    desc: "Performance-based advancement opportunities within the POOJA TAXI SERVICES family.",
    highlight: false,
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm tracking-wider">
              WHY CHOOSE US
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Benefits for <span className="text-primary italic">Everyone</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're a customer seeking safe rides or a driver looking for
            stable employment — POOJA TAXI SERVICES delivers.
          </p>
        </motion.div>

        <Tabs defaultValue="customers" className="w-full">
          <TabsList
            className="mx-auto mb-10 flex w-fit rounded-full p-1 bg-muted gap-1"
            data-ocid="benefits.tab"
          >
            <TabsTrigger
              value="customers"
              className="rounded-full px-8 py-2.5 text-sm font-bold tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              FOR CUSTOMERS
            </TabsTrigger>
            <TabsTrigger
              value="drivers"
              className="rounded-full px-8 py-2.5 text-sm font-bold tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              FOR DRIVERS
            </TabsTrigger>
          </TabsList>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Insurance hero banner */}
              <div className="mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-orange-600 p-8 text-white flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0 w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">
                    🛡️ Every Ride is Insured
                  </h3>
                  <p className="text-white/90 text-lg">
                    Industry-first ride insurance — injury coverage, life
                    insurance, and family compensation included with every
                    booking.
                  </p>
                </div>
                <Button
                  data-ocid="benefits.customer.primary_button"
                  onClick={() =>
                    window.open(
                      "https://wa.me/919156528800?text=Hi%2C%20I%20want%20to%20book%20a%20safe%20insured%20ride",
                      "_blank",
                    )
                  }
                  className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 rounded-full tracking-wider shadow-lg"
                >
                  Book a Safe Ride
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {customerBenefits.map((b, i) => (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    data-ocid={`benefits.customer.item.${i + 1}`}
                    className={`rounded-2xl p-6 border transition-shadow hover:shadow-md ${
                      b.highlight
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        b.highlight ? "bg-primary/15" : "bg-muted"
                      }`}
                    >
                      <b.icon
                        className={`w-6 h-6 ${
                          b.highlight ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <h4 className="font-bold text-foreground mb-2">
                      {b.title}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {b.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* DRIVERS TAB */}
          <TabsContent value="drivers">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Employment hero banner */}
              <div className="mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-zinc-800 to-zinc-700 p-8 text-white flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0 w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                  <Briefcase className="w-10 h-10 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">
                    💼 Real Employment, Not Gig Work
                  </h3>
                  <p className="text-white/90 text-lg">
                    Join as a full-time permanent employee. Get salary, health
                    insurance, accidental coverage, paid leaves & loyalty
                    bonuses.
                  </p>
                </div>
                <Button
                  data-ocid="benefits.driver.primary_button"
                  onClick={() =>
                    window.open(
                      "https://wa.me/919156528800?text=Hi%2C%20I%20want%20to%20apply%20as%20a%20driver%20at%20POOJA%20TAXI%20SERVICES",
                      "_blank",
                    )
                  }
                  className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 rounded-full tracking-wider shadow-lg"
                >
                  Apply to Drive
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {driverBenefits.map((b, i) => (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    data-ocid={`benefits.driver.item.${i + 1}`}
                    className={`rounded-2xl p-6 border transition-shadow hover:shadow-md ${
                      b.highlight
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        b.highlight ? "bg-primary/15" : "bg-muted"
                      }`}
                    >
                      <b.icon
                        className={`w-6 h-6 ${
                          b.highlight ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <h4 className="font-bold text-foreground mb-2">
                      {b.title}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {b.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
