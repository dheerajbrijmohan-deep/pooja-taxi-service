import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubmitContact } from "../hooks/useQueries";

export default function Contact() {
  const { mutateAsync, isPending } = useSubmitContact();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await mutateAsync(form);
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
  };

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl p-8 shadow-card border border-border space-y-5"
          data-ocid="contact.modal"
        >
          <div>
            <Label
              htmlFor="contact-name"
              className="text-sm font-semibold text-foreground mb-1 block"
            >
              Your Name
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
              Message
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
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl tracking-wider"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> SENDING...
              </>
            ) : (
              "SEND MESSAGE"
            )}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
