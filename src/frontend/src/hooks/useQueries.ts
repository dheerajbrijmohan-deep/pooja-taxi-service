import { useMutation } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useSubmitBooking() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: {
      pickupLocation: string;
      destination: string;
      date: string;
      time: string;
      passengers: number;
      customerName: string;
      customerPhone: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const dateMs = BigInt(new Date(data.date).getTime() * 1_000_000);
      return actor.submitBookingInquiry(
        data.pickupLocation,
        data.destination,
        dateMs,
        data.time,
        BigInt(data.passengers),
        data.customerName,
        data.customerPhone,
      );
    },
  });
}

export function useSubmitContact() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      message: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitContactMessage(data.name, data.email, data.message);
    },
  });
}
