import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Landing } from "@/pages/Landing";
import { Executive } from "@/pages/Executive";
import { StrategyGraph } from "@/pages/StrategyGraph";
import { AreaDashboard } from "@/pages/AreaDashboard";
import { IndicatorDetail } from "@/pages/IndicatorDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/select" element={<Navigate to="/" replace />} />
        <Route element={<AppShell />}>
          <Route path="/executive" element={<Executive />} />
          <Route path="/graph" element={<StrategyGraph />} />
          <Route path="/area" element={<AreaDashboard />} />
          <Route path="/indicator" element={<IndicatorDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
