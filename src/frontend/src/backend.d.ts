import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BookingInquiry {
    id: bigint;
    customerName: string;
    destination: string;
    date: Time;
    time: string;
    passengers: bigint;
    timestamp: Time;
    phoneNumber: string;
    pickupLocation: string;
}
export interface ContactMessage {
    id: bigint;
    name: string;
    email: string;
    message: string;
    timestamp: Time;
}
export type Time = bigint;
export interface backendInterface {
    addAdmin(newAdmin: Principal): Promise<void>;
    getAllBookingInquiries(): Promise<Array<BookingInquiry>>;
    getAllContactMessages(): Promise<Array<ContactMessage>>;
    initializeFirstAdmin(): Promise<void>;
    submitBookingInquiry(pickupLocation: string, destination: string, date: Time, time: string, passengers: bigint, customerName: string, phoneNumber: string): Promise<bigint>;
    submitContactMessage(name: string, email: string, message: string): Promise<bigint>;
}
