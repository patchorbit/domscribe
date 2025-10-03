import React from 'react';
/**
 * TypeScriptFeatures - Tests TypeScript-specific patterns
 *
 * Validates that Domscribe handles:
 * - Generic components
 * - Type assertions
 * - Interfaces and type aliases
 * - Optional chaining and nullish coalescing
 */

interface User {
  id: number;
  name: string;
  email?: string;
}

interface GenericListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function GenericList<T extends { id: number }>({
  items,
  renderItem,
}: GenericListProps<T>) {
  return (
    <ul className="generic-list">
      {items.map((item) => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

type Theme = 'light' | 'dark' | 'auto';

interface ThemedComponentProps {
  theme: Theme;
  children: React.ReactNode;
}

function ThemedComponent({ theme, children }: ThemedComponentProps) {
  return <div className={`themed-component theme-${theme}`}>{children}</div>;
}

export function TypeScriptFeatures() {
  const users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob' }, // No email (optional)
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ];

  const nullableValue: string | null = null;
  const undefinedValue: string | undefined = undefined;

  return (
    <div className="typescript-features">
      {/* Generic component */}
      <GenericList
        items={users}
        renderItem={(user) => (
          <div>
            {user.name} - {user.email ?? 'No email'}
          </div>
        )}
      />

      {/* Type assertions */}
      <div>
        {/* Optional chaining */}
        <p>First user email: {users[0]?.email ?? 'N/A'}</p>

        {/* Nullish coalescing */}
        <p>Nullable value: {nullableValue ?? 'Default'}</p>
        <p>Undefined value: {undefinedValue ?? 'Default'}</p>
      </div>

      {/* Union types */}
      <ThemedComponent theme="light">Light theme content</ThemedComponent>
      <ThemedComponent theme="dark">Dark theme content</ThemedComponent>
      <ThemedComponent theme="auto">Auto theme content</ThemedComponent>

      {/* Type narrowing */}
      {users.map((user) => (
        <div key={user.id}>
          {user.email ? (
            <a href={`mailto:${user.email}`}>{user.name}</a>
          ) : (
            <span>{user.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}
