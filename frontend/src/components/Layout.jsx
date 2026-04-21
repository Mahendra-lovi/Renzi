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
    background: "linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)",
    minHeight: "calc(100vh - 60px)",
  },
};
