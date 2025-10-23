import { useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Droplets, Flame, X } from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | undefined;
  selectedSlots: number[];
  clientName: string;
  clientEmail: string;
  onClientNameChange: (value: string) => void;
  onClientEmailChange: (value: string) => void;
  onConfirm: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  selectedDate,
  selectedSlots,
  clientName,
  clientEmail,
  onClientNameChange,
  onClientEmailChange,
  onConfirm,
}: BookingModalProps) {
  // Bloquer le scroll quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !selectedDate || selectedSlots.length === 0) {
    return null;
  }

  const sortedSlots = [...selectedSlots].sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#374151] border-2 border-[#4b5563] rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-[#4b5563]">
          <h2 className="text-[#c9a66b] flex items-center gap-2 text-xl">
            <Droplets className="w-5 h-5" />
            <Flame className="w-5 h-5" />
            Confirmer votre réservation
          </h2>
          <div className="mt-4 text-gray-400">
            <p className="mb-2">
              Bain Nordique & Sauna - {selectedDate.toLocaleDateString("fr-FR")}
            </p>
            <div className="space-y-1">
              {sortedSlots.map((hour, index) => (
                <div key={`modal-slot-${hour}`} className="text-[#c9a66b] text-sm">
                  Créneau {index + 1}: {hour}h00 - {hour === 23 ? "0h" : hour === 1 ? "2h" : `${hour + 1}h`}00
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-name" className="text-gray-300">
              Nom complet
            </Label>
            <Input
              id="modal-name"
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              placeholder="Jean Dupont"
              className="bg-[#2d3748] border-[#4b5563] text-gray-200 placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-email" className="text-gray-300">
              Email
            </Label>
            <Input
              id="modal-email"
              type="email"
              value={clientEmail}
              onChange={(e) => onClientEmailChange(e.target.value)}
              placeholder="jean@example.com"
              className="bg-[#2d3748] border-[#4b5563] text-gray-200 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#4b5563] flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#4b5563] text-gray-300 hover:bg-[#4b5563]"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!clientName || !clientEmail}
            className="bg-[#c9a66b] text-[#1f2937] hover:bg-[#b8944d] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmer la réservation
          </Button>
        </div>
      </div>
    </div>
  );
}
