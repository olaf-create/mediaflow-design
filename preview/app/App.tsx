import Showcase from "./Showcase";

export default function App() {
  return (
    <main className="app-content p-8">
      <Showcase tokens={[{ name: "--accent", value: "#0e73dc" }]} />
    </main>
  );
}
