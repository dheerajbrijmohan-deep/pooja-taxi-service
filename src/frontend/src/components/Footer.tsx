import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { SiFacebook, SiInstagram, SiX, SiYoutube } from "react-icons/si";

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
  { label: "Pricing", href: "#fleet" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xl">🚕</span>
              </div>
              <div>
                <div className="text-lg font-bold text-primary tracking-widest">
                  POOJA
                </div>
                <div className="text-xs tracking-wider text-white/60">
                  TAXI SERVICE
                </div>
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
                +91 98765 43210
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">✉️</span>
                info@poojataxi.com
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">📍</span>
                123 Main Road, City Center
              </li>
              <li className="flex items-start gap-2 text-white/60 text-sm">
                <span className="text-primary mt-0.5">🕐</span>
                Available 24/7
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold text-white tracking-wider mb-4 uppercase text-sm">
              Newsletter
            </h4>
            <p className="text-white/60 text-sm mb-4">
              Subscribe for travel tips and exclusive offers.
            </p>
            <div className="flex flex-col gap-2">
              <Input
                data-ocid="footer.newsletter.input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
              />
              <Button
                data-ocid="footer.newsletter.button"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider"
                onClick={() => setEmail("")}
              >
                SUBSCRIBE
              </Button>
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
