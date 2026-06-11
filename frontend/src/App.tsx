import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SourcesSection from './components/SourcesSection';
import LitReviewSection from './components/LitReviewSection';
import ChatAssistant from './components/ChatAssistant';
import PaperComparison from './components/PaperComparison';
import GapDiscovery from './components/GapDiscovery';
import ConceptGraphSection from './components/ConceptGraphSection';
import StudioHub from './components/StudioHub';
import StudyAids from './components/StudyAids';
import EvaluationDashboard from './components/EvaluationDashboard';
import InfographicsSection from './components/InfographicsSection';

interface Document {
  source: string;
  title: string;
  author: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<string>('sources');
  const [documents, setDocuments] = useState<Document[]>([]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        // Backend returns List[Dict[str, Any]] where keys are typically source, title, author
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to retrieve documents:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'sources':
        return <SourcesSection documents={documents} onRefreshDocs={fetchDocuments} />;
      case 'lit-review':
        return <LitReviewSection documents={documents} />;
      case 'chat':
        return <ChatAssistant documents={documents} />;
      case 'compare':
        return <PaperComparison documents={documents} />;
      case 'gaps':
        return <GapDiscovery documents={documents} />;
      case 'graph':
        return <ConceptGraphSection documents={documents} />;
      case 'studio':
        return <StudioHub documents={documents} />;
      case 'study':
        return <StudyAids documents={documents} />;
      case 'evaluation':
        return <EvaluationDashboard />;
      case 'infographics':
        return <InfographicsSection documents={documents} />;
      default:
        return <SourcesSection documents={documents} onRefreshDocs={fetchDocuments} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
