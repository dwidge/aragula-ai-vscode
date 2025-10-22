import React from "react";
import "./Overlay.css";

interface OverlayProps {
  close: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ close }) => (
  <div className="overlay" onClick={close} />
);

export default Overlay;
