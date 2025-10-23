import { useState, useEffect } from "react";
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Droplets, Flame } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { BookingModal } from "./BookingModal";

interface Booking {
  id: string;
  date: string;
  hour: number;
  clientName: string;
  clientEmail: string;
}

// Créneaux de 10h à 2h du matin (16 créneaux d'1h)
const TIME_SLOTS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les réservations au démarrage
  useEffect(() => {
    fetchBookings();
  }, []);

  // Nettoyer le formulaire quand le Dialog se ferme
  useEffect(() => {
    if (!dialogOpen) {
      setClientName("");
      setClientEmail("");
    }
  }, [dialogOpen]);

  const fetchBookings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2b20b999/bookings`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error("Failed to fetch bookings");
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSlotBooked = (hour: number) => {
    if (!selectedDate) return false;
    const dateStr = selectedDate.toISOString().split("T")[0];
    return bookings.some(
      (booking) =>
        booking.date === dateStr &&
        booking.hour === hour
    );
  };

  const isSlotSelected = (hour: number) => {
    return selectedSlots.includes(hour);
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    // Réinitialiser les créneaux sélectionnés quand on change de date
    setSelectedSlots([]);
  };

  const handleSlotClick = (hour: number) => {
    if (isSlotBooked(hour)) return;
    
    // Toggle slot selection
    setSelectedSlots(prevSlots => {
      if (prevSlots.includes(hour)) {
        return prevSlots.filter(slot => slot !== hour);
      } else {
        return [...prevSlots, hour];
      }
    });
  };

  const handleOpenDialog = () => {
    if (selectedSlots.length > 0) {
      setDialogOpen(true);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || selectedSlots.length === 0 || !clientName || !clientEmail) {
      console.error("Booking validation failed", { selectedDate, selectedSlots, clientName, clientEmail });
      return;
    }

    const dateStr = selectedDate.toISOString().split("T")[0];
    const newBookings: Booking[] = selectedSlots.map(hour => ({
      id: `${Date.now()}-${hour}`,
      date: dateStr,
      hour,
      clientName,
      clientEmail,
    }));

    try {
      // Sauvegarder chaque réservation dans la base de données
      for (const booking of newBookings) {
        const saveResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2b20b999/bookings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify(booking),
          }
        );

        if (!saveResponse.ok) {
          console.error("Failed to save booking:", await saveResponse.json());
          toast.error("Erreur lors de la sauvegarde de la réservation");
          return;
        }
      }

      // Envoyer l'email de notification
      const emailResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2b20b999/send-booking-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            clientName,
            clientEmail,
            date: selectedDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            slots: selectedSlots,
          }),
        }
      );

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("Failed to send email:", errorData);
        toast.error("Réservation enregistrée mais email non envoyé");
      } else {
        toast.success("Réservation confirmée ! Un email a été envoyé.");
      }

      // Recharger les réservations depuis la base
      await fetchBookings();
      
      // Fermer le Dialog et réinitialiser les créneaux
      setDialogOpen(false);
      setSelectedSlots([]);
    } catch (error) {
      console.error("Error during booking:", error);
      toast.error("Erreur lors de la réservation");
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#2d3748] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl text-[#c9a66b] mb-4" style={{ fontFamily: 'serif' }}>
            Réservation
          </h1>
          
          {/* Bain Nordique & Sauna Display */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="flex items-center gap-2 px-6 py-3 bg-[#374151] rounded-lg border-2 border-[#c9a66b]">
              <Droplets className="w-6 h-6 text-[#c9a66b]" />
              <span className="text-[#c9a66b]">Bain Nordique</span>
            </div>
            <span className="text-[#c9a66b] text-2xl">&</span>
            <div className="flex items-center gap-2 px-6 py-3 bg-[#374151] rounded-lg border-2 border-[#c9a66b]">
              <Flame className="w-6 h-6 text-[#c9a66b]" />
              <span className="text-[#c9a66b]">Sauna</span>
            </div>
          </div>
          
          <p className="text-gray-300 mb-1">
            Réservez votre créneau par tranche d'une heure
          </p>
          <p className="text-[#c9a66b] text-sm">
            Gratuit - Compris dans le prix de votre séjour
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <Card className="lg:col-span-1 bg-[#374151] border-[#4b5563]">
            <CardHeader>
              <CardTitle className="text-[#c9a66b]">Sélectionnez une date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border-[#4b5563]"
              />
            </CardContent>
          </Card>

          {/* Time Slots Section */}
          <Card className="lg:col-span-2 bg-[#374151] border-[#4b5563]">
            <CardHeader>
              <CardTitle className="text-[#c9a66b] flex items-center gap-3">
                <Droplets className="w-6 h-6" />
                <Flame className="w-6 h-6" />
                {selectedDate
                  ? `Créneaux disponibles - ${selectedDate.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`
                  : "Sélectionnez une date"}
              </CardTitle>
              <CardDescription className="text-gray-400">
                Réservations disponibles de 10h à 2h du matin. À partir de 2h, le système de traitement et filtration se met en route pour le nettoyage de l'eau.
                <br />
                <span className="text-[#c9a66b]">Cliquez sur plusieurs créneaux pour une réservation multiple.</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-[#c9a66b] py-8">Chargement des réservations...</div>
              ) : (
                <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {TIME_SLOTS.map((hour) => {
                  const isBooked = isSlotBooked(hour);
                  const isSelected = isSlotSelected(hour);
                  return (
                    <button
                      key={`slot-${hour}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSlotClick(hour);
                      }}
                      disabled={isBooked}
                      type="button"
                      className={`
                        p-4 rounded-lg border-2 transition-colors duration-200
                        ${
                          isBooked
                            ? "bg-[#4b5563] border-[#6b7280] text-gray-500 cursor-not-allowed opacity-50"
                            : isSelected
                            ? "bg-[#c9a66b] border-[#c9a66b] text-[#1f2937] cursor-pointer shadow-lg"
                            : "bg-[#2d3748] border-[#c9a66b] text-[#c9a66b] hover:bg-[#c9a66b] hover:text-[#1f2937] cursor-pointer"
                        }
                      `}
                    >
                      <div className="text-center">
                        <div>
                          {hour}h00 - {hour === 23 ? "0h" : hour === 1 ? "2h" : `${hour + 1}h`}00
                        </div>
                        <div className="text-sm opacity-80">
                          {isBooked ? "Réservé" : isSelected ? "Sélectionné" : "Disponible"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Bouton de validation */}
              {selectedSlots.length > 0 && (
                <div className="mt-6 flex items-center justify-between bg-[#2d3748] p-4 rounded-lg border-2 border-[#c9a66b]">
                  <div className="text-[#c9a66b]">
                    <span className="font-semibold">{selectedSlots.length}</span> créneau{selectedSlots.length > 1 ? 'x' : ''} sélectionné{selectedSlots.length > 1 ? 's' : ''}
                  </div>
                  <Button 
                    onClick={handleOpenDialog}
                    className="bg-[#c9a66b] text-[#1f2937] hover:bg-[#b8944d]"
                  >
                    Valider la sélection
                  </Button>
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Modal */}
        <BookingModal
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          selectedDate={selectedDate}
          selectedSlots={selectedSlots}
          clientName={clientName}
          clientEmail={clientEmail}
          onClientNameChange={setClientName}
          onClientEmailChange={setClientEmail}
          onConfirm={handleBooking}
        />
      </div>
    </div>
  );
}
