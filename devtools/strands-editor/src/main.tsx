import { createRoot } from 'react-dom/client';
import './styles/index.css';
import StrandsEditorPage from './pages/StrandsEditorPage';

createRoot(document.getElementById('root')!).render(
  <StrandsEditorPage />,
);
