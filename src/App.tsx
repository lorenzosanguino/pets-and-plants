import { PetPlantDashboard } from './pages/PetPlantDashboard';
import { I18nProvider } from './utils/i18n';

function App() {
  return (
    <I18nProvider>
      <PetPlantDashboard />
    </I18nProvider>
  );
}

export default App;
