import Array "mo:core/Array";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Iter "mo:core/Iter";

actor {
  // Types
  type BookingInquiry = {
    id : Nat;
    pickupLocation : Text;
    destination : Text;
    date : Time.Time;
    time : Text;
    passengers : Nat;
    customerName : Text;
    phoneNumber : Text;
    timestamp : Time.Time;
  };

  type ContactMessage = {
    id : Nat;
    name : Text;
    email : Text;
    message : Text;
    timestamp : Time.Time;
  };

  module BookingInquiry {
    public func compare(b1 : BookingInquiry, b2 : BookingInquiry) : Order.Order {
      Nat.compare(b1.id, b2.id);
    };
  };

  module ContactMessage {
    public func compare(c1 : ContactMessage, c2 : ContactMessage) : Order.Order {
      Nat.compare(c1.id, c2.id);
    };
  };

  // Storage
  let bookingInquiriesMap = Map.empty<Nat, BookingInquiry>();
  let contactMessagesMap = Map.empty<Nat, ContactMessage>();

  var nextBookingInquiryId = 0;
  var nextContactMessageId = 0;

  let admins = Map.empty<Principal, ()>();

  public shared ({ caller }) func initializeFirstAdmin() : async () {
    if (admins.size() == 0) {
      admins.add(caller, ());
    } else {
      Runtime.trap("Admins already initialized. ");
    };
  };

  func isAdmin(caller : Principal) : Bool {
    admins.containsKey(caller);
  };

  public shared ({ caller }) func addAdmin(newAdmin : Principal) : async () {
    if (isAdmin(caller)) {
      admins.add(newAdmin, ());
    } else {
      Runtime.trap("Only admins can add new admins");
    };
  };

  // Submit a booking inquiry
  public shared ({ caller }) func submitBookingInquiry(
    pickupLocation : Text,
    destination : Text,
    date : Time.Time,
    time : Text,
    passengers : Nat,
    customerName : Text,
    phoneNumber : Text,
  ) : async Nat {
    let id = nextBookingInquiryId;
    nextBookingInquiryId += 1;

    let inquiry : BookingInquiry = {
      id;
      pickupLocation;
      destination;
      date;
      time;
      passengers;
      customerName;
      phoneNumber;
      timestamp = Time.now();
    };

    bookingInquiriesMap.add(id, inquiry);
    id;
  };

  // Get all booking inquiries (admin only)
  public query ({ caller }) func getAllBookingInquiries() : async [BookingInquiry] {
    if (isAdmin(caller)) {
      bookingInquiriesMap.values().toArray().sort();
    } else {
      Runtime.trap("Access denied: Not admin");
    };
  };

  // Submit a contact message
  public shared ({ caller }) func submitContactMessage(
    name : Text,
    email : Text,
    message : Text,
  ) : async Nat {
    let id = nextContactMessageId;
    nextContactMessageId += 1;

    let contact : ContactMessage = {
      id;
      name;
      email;
      message;
      timestamp = Time.now();
    };

    contactMessagesMap.add(id, contact);
    id;
  };

  // Get all contact messages (admin only)
  public query ({ caller }) func getAllContactMessages() : async [ContactMessage] {
    if (isAdmin(caller)) {
      contactMessagesMap.values().toArray().sort();
    } else {
      Runtime.trap("Access denied: Not admin");
    };
  };
};
