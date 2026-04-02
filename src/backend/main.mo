import Text "mo:core/Text";
import Float "mo:core/Float";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

actor {
  module Preference {
    public func compare(p1 : Preference, p2 : Preference) : Order.Order {
      switch (Text.compare(p1.apiKey, p2.apiKey)) {
        case (#equal) {
          switch (Text.compare(p1.accentColor, p2.accentColor)) {
            case (#equal) { Float.compare(p1.playbackSpeed, p2.playbackSpeed) };
            case (order) { order };
          };
        };
        case (order) { order };
      };
    };
  };

  type Preference = {
    apiKey : Text;
    accentColor : Text;
    playbackSpeed : Float;
  };

  let preferences = Map.empty<Principal, Preference>();

  public shared ({ caller }) func createPreference(apiKey : Text, accentColor : Text, playbackSpeed : Float) : async () {
    if (preferences.containsKey(caller)) { Runtime.trap("Preference already exists") };
    let preference : Preference = {
      apiKey;
      accentColor;
      playbackSpeed;
    };
    preferences.add(caller, preference);
  };

  public shared ({ caller }) func updatePreference(apiKey : Text, accentColor : Text, playbackSpeed : Float) : async () {
    if (not preferences.containsKey(caller)) { Runtime.trap("Preference does not exist") };
    let preference : Preference = {
      apiKey;
      accentColor;
      playbackSpeed;
    };
    preferences.add(caller, preference);
  };

  public shared ({ caller }) func deletePreference() : async () {
    if (not preferences.containsKey(caller)) { Runtime.trap("Preference does not exist") };
    preferences.remove(caller);
  };

  public query ({ caller }) func getPreference() : async ?Preference {
    preferences.get(caller);
  };

  public query func getAllPreferences() : async [Preference] {
    preferences.values().toArray().sort();
  };
};
