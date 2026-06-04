import { Suspense } from "react";
import type { Metadata } from "next";
import VoicesClient from "./VoicesClient";

export const metadata: Metadata = {
  title: "Descubre voces de IA | Elite Labs",
  description:
    "Explora más de 200 voces de IA realistas en español, inglés y más idiomas. Gratis para escuchar.",
};

export default function VoicesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
      <VoicesClient />
    </Suspense>
  );
}
