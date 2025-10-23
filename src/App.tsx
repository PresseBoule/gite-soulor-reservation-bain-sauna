import { BookingCalendar } from "./components/BookingCalendar";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <div className="dark">
      <BookingCalendar />
      <Toaster />
    </div>
  );
}
