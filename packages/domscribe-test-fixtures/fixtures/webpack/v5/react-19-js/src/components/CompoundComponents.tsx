/**
 * CompoundComponents - Tests compound component patterns
 *
 * Validates that Domscribe handles:
 * - Compound components (Tab.List, Tab.Panel pattern)
 * - Slot patterns
 * - Polymorphic components (as prop)
 * - Component composition with shared state
 */

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  ElementType,
  ComponentPropsWithoutRef,
} from 'react';
import { CaptureIcon } from './CaptureIcon';

// Tabs compound component
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function Tabs({
  children,
  defaultTab,
}: {
  children: ReactNode;
  defaultTab: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: ReactNode }) {
  return <div className="tab-list">{children}</div>;
}

function TabButton({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabButton must be used within Tabs');

  const isActive = context.activeTab === value;

  return (
    <button
      className={`tab-button ${isActive ? 'active' : ''}`}
      onClick={() => context.setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  if (context.activeTab !== value) return null;

  return <div className="tab-panel">{children}</div>;
}

// Attach subcomponents
Tabs.List = TabList;
Tabs.Button = TabButton;
Tabs.Panel = TabPanel;

// Card compound component with slots
const Card = ({ children }: { children: ReactNode }) => {
  return <div className="card">{children}</div>;
};

Card.Header = ({ children }: { children: ReactNode }) => {
  return <div className="card-header">{children}</div>;
};

Card.Body = ({ children }: { children: ReactNode }) => {
  return <div className="card-body">{children}</div>;
};

Card.Footer = ({ children }: { children: ReactNode }) => {
  return <div className="card-footer">{children}</div>;
};

// Polymorphic component (as prop)
type PolymorphicProps<E extends ElementType> = {
  as?: E;
  children: ReactNode;
} & ComponentPropsWithoutRef<E>;

function Box<E extends ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'div';

  return (
    <Component className="box" {...props}>
      {children}
    </Component>
  );
}

// Accordion compound component
interface AccordionContextType {
  openItems: string[];
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(
  undefined,
);

function Accordion({ children }: { children: ReactNode }) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within Accordion');

  const isOpen = context.openItems.includes(id);

  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={() => context.toggle(id)}>
        {title} {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
}

Accordion.Item = AccordionItem;

export function CompoundComponents() {
  return (
    <div className="compound-components">
      <section>
        <h4>Tabs (Compound Component)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Tabs defaultTab="tab1">
            <Tabs.List>
              <Tabs.Button value="tab1">Tab 1</Tabs.Button>
              <Tabs.Button value="tab2">Tab 2</Tabs.Button>
              <Tabs.Button value="tab3">Tab 3</Tabs.Button>
            </Tabs.List>
            <Tabs.Panel value="tab1">
              <p>Content for Tab 1</p>
            </Tabs.Panel>
            <Tabs.Panel value="tab2">
              <p>Content for Tab 2</p>
            </Tabs.Panel>
            <Tabs.Panel value="tab3">
              <p>Content for Tab 3</p>
            </Tabs.Panel>
          </Tabs>
        </div>
      </section>

      <section>
        <h4>Card (Slot Pattern)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Card>
            <Card.Header>
              <h3>Card Title</h3>
            </Card.Header>
            <Card.Body>
              <p>This is the card body content.</p>
            </Card.Body>
            <Card.Footer>
              <button>Action</button>
            </Card.Footer>
          </Card>
        </div>
      </section>

      <section>
        <h4>Polymorphic Component (as prop)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div>
            <Box>Default div Box</Box>
            <Box as="article">Article Box</Box>
            <Box as="button" onClick={() => console.log('clicked')}>
              Button Box
            </Box>
          </div>
        </div>
      </section>

      <section>
        <h4>Accordion</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <Accordion>
            <Accordion.Item id="item1" title="Section 1">
              <p>Content for section 1</p>
            </Accordion.Item>
            <Accordion.Item id="item2" title="Section 2">
              <p>Content for section 2</p>
            </Accordion.Item>
            <Accordion.Item id="item3" title="Section 3">
              <p>Content for section 3</p>
            </Accordion.Item>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
