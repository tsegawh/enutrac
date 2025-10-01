import React, { useState } from "react";

const devices = [
  { name: "TK103", protocol: "gps103", port: "5001", help: "Set server IP and port: SERVER_IP 5001" },
  { name: "Teltonika FMB965", protocol: "teltonika", port: "5027", help: "Set APN, then server IP and port: SERVER_IP 5027" },
  { name: "GL200", protocol: "gl200", port: "5004", help: "Send SMS command to set IP and port: SERVER_IP 5004" },
  { name: "Freematics ONE+", protocol: "freematics", port: "5170", help: "Plug in OBD-II, configure via app with IP and port: SERVER_IP 5170" },
  // ➕ Add more devices here
];

export default function SupportedDevices() {
  const [query, setQuery] = useState("");

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.protocol.toLowerCase().includes(query.toLowerCase()) ||
      d.port.includes(query)
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Supported Devices</h1>
      <input
        type="text"
        placeholder="Search by name, protocol, or port..."
        className="border p-2 w-full rounded-md"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <table className="w-full border-collapse mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Device</th>
            <th className="border p-2 text-left">Protocol</th>
            <th className="border p-2 text-left">Port</th>
            <th className="border p-2 text-left">Configuration Help</th>
          </tr>
        </thead>
        <tbody>
          {filteredDevices.length > 0 ? (
            filteredDevices.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="border p-2">{d.name}</td>
                <td className="border p-2">{d.protocol}</td>
                <td className="border p-2">{d.port}</td>
                <td className="border p-2">{d.help}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="border p-4 text-center text-gray-500">
                No devices found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
