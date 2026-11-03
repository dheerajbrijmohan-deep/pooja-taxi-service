import { useAuth } from "../auth.jsx";
import DayBanner from "../components/DayBanner.jsx";
import BusinessTiles from "../components/BusinessTiles.jsx";

export default function Dashboard({ area }) {
  const { user } = useAuth();
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-bold italic mb-2">The Pooja Group Management</h1>
      <p className="text-muted-foreground mb-8">Welcome, {user.name}.</p>
      <DayBanner />
      <BusinessTiles />
    </div>
  );
}
