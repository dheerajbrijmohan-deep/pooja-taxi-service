import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const navLinks = [
  { label: "HOME", href: "#home" },
  { label: "ABOUT US", href: "#about" },
  { label: "SERVICES", href: "#services" },
  { label: "FLEET", href: "#fleet" },
  { label: "PRICING", href: "#fleet" },
  { label: "CONTACT", href: "#contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 bg-brand-cream border-b border-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xl">🚕</span>
            </div>
            <div className="leading-tight">
              <div className="text-xl font-bold text-primary tracking-widest font-sans">
                POOJA
              </div>
              <div className="text-xs font-semibold text-foreground tracking-wider">
                TAXI SERVICE
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                type="button"
                key={link.label}
                data-ocid={`nav.${link.label.toLowerCase().replace(/\s+/g, "_")}.link`}
                onClick={() => scrollTo(link.href)}
                className="text-xs font-semibold tracking-widest text-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              data-ocid="nav.book_now.button"
              className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 text-sm font-bold tracking-wider"
              onClick={() => scrollTo("#booking")}
            >
              BOOK NOW
            </Button>
            <button
              type="button"
              className="md:hidden text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-cream border-t border-border overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  type="button"
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="text-sm font-semibold tracking-widest text-left text-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <Button
                data-ocid="nav.mobile_book_now.button"
                className="bg-primary text-primary-foreground rounded-full font-bold tracking-wider"
                onClick={() => scrollTo("#booking")}
              >
                BOOK NOW
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
