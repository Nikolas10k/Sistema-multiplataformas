"use client";

import { useEffect } from "react";

export default function PrintClient() {
  useEffect(() => {
    // Pequeno delay para garantir que o layout renderizou
    const timer = setTimeout(() => {
      window.print();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}
