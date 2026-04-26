import { createContext } from "react";

export const LiveLocationContext = createContext({
  myLocation: { lat: null, lng: null, city: "", accuracy: null, updatedAt: null },
  otherUsers: [],
  status: "idle",
  permissionRequired: false,
});
