import React from 'react';
import { 
  FolderOpen, 
  BookOpen, 
  MessageSquare, 
  Columns, 
  Search, 
  Share2, 
  Mic, 
  HelpCircle, 
  TrendingUp, 
  Palette 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'sources', label: 'Sources & Ingestion', icon: FolderOpen },
    { id: 'lit-review', label: 'Literature Review', icon: BookOpen },
    { id: 'chat', label: 'RAG Assistant', icon: MessageSquare },
    { id: 'compare', label: 'Compare Papers', icon: Columns },
    { id: 'gaps', label: 'Research Gaps', icon: Search },
    { id: 'graph', label: 'Concept Graph', icon: Share2 },
    { id: 'studio', label: 'The Studio', icon: Mic },
    { id: 'study', label: 'Study Aids', icon: HelpCircle },
    { id: 'evaluation', label: 'Evaluation Dashboard', icon: TrendingUp },
    { id: 'infographics', label: 'Infographics', icon: Palette }
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <span className="logo-icon">🔬</span>
        <span className="logo-text">ResearchGPT</span>
      </div>
      <div className="nav-menu">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <IconComponent className="nav-icon" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Sidebar;
