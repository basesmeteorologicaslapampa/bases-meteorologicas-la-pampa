import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Bases Meteorologicas La Pampa
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Datos en tiempo real desde sensores ESP32
        </p>
      </header>
      <Dashboard />
    </main>
  );
}
