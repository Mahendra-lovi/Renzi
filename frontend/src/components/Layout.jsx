import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Navbar onMenu={() => setOpen(true)} />
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <main style={styles.content}>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;

const styles = {
  content: {
    padding: 24,
    background: "#f4f6f8",
    minHeight: "calc(100vh - 60px)",
  },
};
