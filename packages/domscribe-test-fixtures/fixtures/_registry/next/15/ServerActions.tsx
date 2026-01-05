'use client';

/**
 * Server Actions
 *
 * Demonstrates Next.js Server Actions pattern.
 * In a real app, the action function would have 'use server' directive.
 * Here we simulate the pattern for fixture testing.
 */

import { useState } from 'react';
import { CaptureIcon } from './CaptureIcon';

interface FormState {
  message: string;
  status: 'idle' | 'pending' | 'success' | 'error';
}

export function ServerActions() {
  const [state, setState] = useState<FormState>({
    message: '',
    status: 'idle',
  });

  // Simulated server action
  async function handleSubmit(formData: FormData) {
    setState({ message: '', status: 'pending' });

    // Simulate server delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const name = formData.get('name') as string;
    if (name) {
      setState({ message: `Hello, ${name}!`, status: 'success' });
    } else {
      setState({ message: 'Name is required', status: 'error' });
    }
  }

  return (
    <div className="component-demo" data-testid="server-actions">
      <h2>Server Actions</h2>
      <p>Form submission via Server Actions pattern.</p>

      <div className="demo-box capture-widget">
        <CaptureIcon />
      </div>

      <form
        data-testid="action-form"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}
      >
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            name="name"
            type="text"
            data-testid="name-input"
            className="form-input"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          data-testid="submit-btn"
          disabled={state.status === 'pending'}
        >
          {state.status === 'pending' ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {state.message && (
        <div
          className={`info-box ${state.status === 'error' ? 'error' : ''}`}
          data-testid="action-result"
        >
          <p>{state.message}</p>
        </div>
      )}
    </div>
  );
}
