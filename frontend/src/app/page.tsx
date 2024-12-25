import ClientLayout from "./ClientLayout";

// src/app/page.tsx
export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OpenFOAM Visualization Live</h1>
      <ClientLayout />
    </main>
  );
}
