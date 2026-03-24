import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { SetupList } from './pages/SetupList.js';
import { SetupEditor } from './pages/SetupEditor.js';
import { ScenarioList } from './pages/ScenarioList.js';
import { ScenarioEditor } from './pages/ScenarioEditor.js';
import { RunPage } from './pages/RunPage.js';
import { RunHistory } from './pages/RunHistory.js';
import { RunDetail } from './pages/RunDetail.js';
import { EvalConfig } from './pages/EvalConfig.js';
import { ReportView } from './pages/ReportView.js';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setups" element={<SetupList />} />
          <Route path="/setups/new" element={<SetupEditor />} />
          <Route path="/setups/:id/edit" element={<SetupEditor />} />
          <Route path="/scenarios" element={<ScenarioList />} />
          <Route path="/scenarios/new" element={<ScenarioEditor />} />
          <Route path="/scenarios/:id" element={<ScenarioEditor />} />
          <Route path="/run" element={<RunPage />} />
          <Route path="/history" element={<RunHistory />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/runs/:id/evaluate" element={<EvalConfig />} />
          <Route path="/evaluations/:id" element={<ReportView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
