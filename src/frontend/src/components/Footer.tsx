import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Phone } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";

const socialLinks = [
  { icon: SiFacebook, href: "#", label: "Facebook" },
  { icon: SiInstagram, href: "#", label: "Instagram" },
  { icon: SiX, href: "#", label: "X" },
  { icon: SiYoutube, href: "#", label: "YouTube" },
];

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Fleet", href: "#fleet" },
  { label: "Benefits", href: "#benefits" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-brand-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <div className="text-lg font-bold text-primary tracking-widest">
                POOJA
              </div>
              <div className="text-xs tracking-wider text-white/60">
                TAXI SERVICES
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Your trusted travel companion for comfortable, safe, and
              affordable rides across the city and beyond.
            </p>
            <div className="flex gap-3 mt-5">
              {socialLinks.map(({ icon: Icon, href, label }, i) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  data-ocid={`footer.social.link.${i + 1}`}
                  className="w-9 h-9 bg-white/10 hover:bg-primary rounded-full flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white tracking-wider mb-4 uppercase text-sm">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map(({ label, href }) => (
                <li key={label}>
                  <button
                    type="button"
                    data-ocid={`footer.${label.toLowerCase().replace(/\s+/g, "_")}.link`}
                    onClick={() => scrollTo(href)}
                    className="text-white/60 hover:text-primary text-sm transition-colors text-left"
                  >
                    → {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white tracking-wider mb-4 uppercase text-sm">
              Contact Details
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">📞</span>
                <a
                  href="tel:+919156528800"
                  className="hover:text-primary transition-colors"
                >
                  +91 91-56-52-8800
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">✉️</span>
                <a
                  href="mailto:contact@ptsnagpur.in"
                  className="hover:text-primary transition-colors"
                >
                  contact@ptsnagpur.in
                </a>
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">📍</span>
                Nagpur, Maharashtra - 440001
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">🕐</span>
                Available 24/7
              </li>
            </ul>
          </div>

          {/* Quick Contact */}
          <div>
            <h4 className="font-bold text-white tracking-wider mb-4 uppercase text-sm">
              Quick Contact
            </h4>
            <p className="text-white/60 text-sm mb-4">
              Reach us instantly via WhatsApp, call, or directions.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                data-ocid="footer.whatsapp.button"
                onClick={() =>
                  window.open("https://wa.me/919156528800", "_blank")
                }
                className="bg-[oklch(0.52_0.17_145)] hover:bg-[oklch(0.45_0.17_145)] text-white font-bold tracking-wider flex items-center gap-2 rounded-full"
              >
                <SiWhatsapp className="w-4 h-4" />
                CHAT ON WHATSAPP
              </Button>
              <Button
                data-ocid="footer.call.button"
                variant="outline"
                onClick={() => window.open("tel:+919156528800")}
                className="border-white/20 text-white hover:bg-white/10 font-bold tracking-wider flex items-center gap-2 rounded-full"
              >
                <Phone className="w-4 h-4" />
                CALL US NOW
              </Button>
              <a
                href="https://maps.app.goo.gl/nagpur"
                target="_blank"
                rel="noopener noreferrer"
                data-ocid="footer.directions.link"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-primary transition-colors mt-1"
              >
                <Navigation className="w-4 h-4" />
                <MapPin className="w-3 h-3" />
                Get Directions
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 text-center">
          <p className="text-white/40 text-sm">
            © {year}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
