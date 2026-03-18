import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error("Please fill your name and message");
      return;
    }
    const text = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nMessage: ${form.message}`,
    );
    window.open(`https://wa.me/919156528800?text=${text}`, "_blank");
    toast.success("Opening WhatsApp to send your message!");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-4xl font-bold text-foreground mb-3">
            Get in Touch
          </h2>
          <p className="text-muted-foreground">
            Have questions? We'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 space-y-5"
          >
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-bold text-foreground mb-5 tracking-wider text-sm uppercase">
                Contact Details
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">
                      Call Us
                    </div>
                    <a
                      href="tel:+919156528800"
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      +91 91-56-52-8800
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">
                      Email Us
                    </div>
                    <a
                      href="mailto:contact@ptsnagpur.in"
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      contact@ptsnagpur.in
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">
                      Address
                    </div>
                    <span className="font-semibold text-foreground text-sm leading-snug">
                      Chatrapati Shivaji Maharaj Chowk,
                      <br />
                      Shambhu Nagar Main Road,
                      <br />
                      Nagpur, Maharashtra - 440014
                    </span>
                  </div>
                </li>
              </ul>
              <a
                href="https://maps.app.goo.gl/YSnJSLun4peyYznv9"
                target="_blank"
                rel="noopener noreferrer"
                data-ocid="contact.directions.link"
                className="mt-5 flex items-center gap-2 text-sm font-bold text-primary hover:underline"
              >
                <Navigation className="w-4 h-4" />
                Get Directions →
              </a>
            </div>

            <Button
              data-ocid="contact.whatsapp.button"
              onClick={() =>
                window.open("https://wa.me/919156528800", "_blank")
              }
              className="w-full bg-[oklch(0.52_0.17_145)] hover:bg-[oklch(0.45_0.17_145)] text-white font-bold py-5 rounded-xl tracking-wider flex items-center gap-2"
            >
              <SiWhatsapp className="w-5 h-5" />
              CHAT ON WHATSAPP
            </Button>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-card rounded-2xl p-8 shadow-card border border-border space-y-5"
            data-ocid="contact.modal"
          >
            <div>
              <Label
                htmlFor="contact-name"
                className="text-sm font-semibold text-foreground mb-1 block"
              >
                Your Name *
              </Label>
              <Input
                id="contact-name"
                data-ocid="contact.name.input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label
                htmlFor="contact-email"
                className="text-sm font-semibold text-foreground mb-1 block"
              >
                Email Address
              </Label>
              <Input
                id="contact-email"
                data-ocid="contact.email.input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label
                htmlFor="contact-message"
                className="text-sm font-semibold text-foreground mb-1 block"
              >
                Message *
              </Label>
              <Textarea
                id="contact-message"
                data-ocid="contact.message.textarea"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                rows={4}
              />
            </div>
            <Button
              data-ocid="contact.submit.button"
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl tracking-wider flex items-center gap-2"
            >
              <SiWhatsapp className="w-5 h-5" />
              SEND VIA WHATSAPP
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
