/**
 * Navigation Component
 * Sidebar navigation for test fixture showcase
 */

export interface NavItem {
  id: string;
  label: string;
  section?: string;
}

export const navItems: NavItem[] = [
  {
    id: 'advanced-hooks',
    label: 'Advanced Hooks',
    section: 'Advanced Patterns',
  },
  { id: 'basic-elements', label: 'Basic Elements', section: 'Core Patterns' },
  {
    id: 'children-manipulation',
    label: 'Children Manipulation',
    section: 'Advanced Patterns',
  },
  {
    id: 'compound-components',
    label: 'Compound Components',
    section: 'Advanced Patterns',
  },
  {
    id: 'conditional-rendering',
    label: 'Conditional Rendering',
    section: 'Core Patterns',
  },
  { id: 'context', label: 'Context', section: 'Advanced Patterns' },
  { id: 'deeply-nested', label: 'Deeply Nested', section: 'Core Patterns' },
  { id: 'dynamic-content', label: 'Dynamic Content', section: 'Core Patterns' },
  { id: 'edge-cases', label: 'Edge Cases', section: 'Core Patterns' },
  {
    id: 'error-boundaries',
    label: 'Error Boundaries',
    section: 'Advanced Patterns',
  },
  { id: 'event-handlers', label: 'Event Handlers', section: 'Core Patterns' },
  { id: 'fragments', label: 'Fragments', section: 'Core Patterns' },
  { id: 'h-o-cs', label: 'H O Cs', section: 'Core Patterns' },
  { id: 'lazy-loading', label: 'Lazy Loading', section: 'Advanced Patterns' },
  { id: 'lists', label: 'Lists', section: 'Core Patterns' },
  {
    id: 'member-expressions',
    label: 'Member Expressions',
    section: 'Core Patterns',
  },
  { id: 'memo', label: 'Memo', section: 'Core Patterns' },
  { id: 'portals', label: 'Portals', section: 'Advanced Patterns' },
  {
    id: 'react18-features',
    label: 'React18 Features',
    section: 'Advanced Patterns',
  },
  { id: 'ref-patterns', label: 'Ref Patterns', section: 'Advanced Patterns' },
  { id: 'render-props', label: 'Render Props', section: 'Core Patterns' },
  {
    id: 's-s-r-hydration',
    label: 'S S R Hydration',
    section: 'Advanced Patterns',
  },
  {
    id: 's-v-g-elements',
    label: 'S V G Elements',
    section: 'Advanced Patterns',
  },
  { id: 'self-closing', label: 'Self Closing', section: 'Core Patterns' },
  { id: 'smoke-test', label: 'Smoke Test', section: 'Testing' },
  { id: 'styling', label: 'Styling', section: 'Advanced Patterns' },
  {
    id: 'type-script-features',
    label: 'Type Script Features',
    section: 'Core Patterns',
  },
];

interface NavigationProps {
  activeItem: string;
  onNavigate: (id: string) => void;
}

export function Navigation({ activeItem, onNavigate }: NavigationProps) {
  const sections = [...new Set(navItems.map((item) => item.section))];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">D</div>
          <span className="sidebar-logo-text">Domscribe Tests</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section} className="sidebar-section">
            <div className="sidebar-section-title">{section}</div>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => (
                <div
                  key={item.id}
                  data-page-id={item.id}
                  className={`sidebar-link ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.label}
                </div>
              ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
