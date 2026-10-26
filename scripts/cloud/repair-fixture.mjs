import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const CART_SOURCE = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
if (import.meta.env.DEV && import.meta.env.VITE_DOMSCRIBE === '1') import('@domscribe/runtime').then(({ RuntimeManager }) => window.__runtime = RuntimeManager.getInstance());
const initial = [
  { id: 'line-a', sku: 'MUG-18', label: 'Midnight travel mug', variant: 'Midnight', quantity: 1, price: 18 },
  { id: 'line-b', sku: 'MUG-18', label: 'Ocean travel mug', variant: 'Ocean', quantity: 2, price: 18 },
  { id: 'line-c', sku: 'NOTE-12', label: 'Graphite notebook', variant: 'Graphite', quantity: 1, price: 12 },
];
function readCart() { try { return JSON.parse(localStorage.getItem('cart-lines')) || initial; } catch { return initial; } }
function CartLine({ line, onEdit }) {
  return <article aria-label={line.label} data-line-id={line.id}>
    <div><span className="category">{line.sku}</span><h2>{line.label}</h2><p>Variant: {line.variant}</p></div>
    <div><span>Quantity: <output aria-label="Quantity">{line.quantity}</output></span><p>$ {line.price * line.quantity}</p><button onClick={() => onEdit(line)}>Edit quantity</button></div>
  </article>;
}
function QuantityEditor({ line, onSave, onCancel }) {
  const [quantity, setQuantity] = useState(line.quantity);
  return <section role="dialog" aria-label={'Edit ' + line.label}>
    <h2>{line.label}</h2><label>Quantity<input type="number" min="1" max="20" value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label>
    <div className="actions"><button onClick={onCancel}>Cancel</button><button disabled={!Number.isInteger(quantity) || quantity < 1 || quantity > 20} onClick={() => onSave(line, quantity)}>Save quantity</button></div>
  </section>;
}
function App() {
  const [lines, setLines] = useState(readCart), [editing, setEditing] = useState(null);
  const [reverse, setReverse] = useState(false), [filter, setFilter] = useState('');
  function save(selected, quantity) {
    const next = lines.map(line => line.sku === selected.sku ? { ...line, quantity } : line);
    localStorage.setItem('cart-lines', JSON.stringify(next)); setLines(next); setEditing(null);
  }
  const visible = [...lines].filter(line => line.label.toLowerCase().includes(filter.toLowerCase())).sort((a, b) => reverse ? b.label.localeCompare(a.label) : a.label.localeCompare(b.label));
  return <main><header><p className="category">FIELD SUPPLY / CHECKOUT</p><h1>Your cart</h1><p>Review quantities before placing your order.</p></header>
    <nav aria-label="Cart controls"><label>Filter items<input value={filter} onChange={event => setFilter(event.target.value)} /></label><button onClick={() => setReverse(value => !value)}>Reverse order</button></nav>
    {visible.map(line => <CartLine key={line.id} line={line} onEdit={setEditing} />)}
    {editing && <QuantityEditor key={editing.id} line={editing} onSave={save} onCancel={() => setEditing(null)} />}
    <footer><strong>Subtotal: $ {lines.reduce((sum, line) => sum + line.price * line.quantity, 0)}</strong><p>Quantities are saved in this browser.</p></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
`;
export const SOURCE_HASH = createHash('sha256')
  .update(CART_SOURCE)
  .digest('hex');
export const ISSUE = `Editing one cart line changes another line with the same SKU.

Reproduce in the browser: open Midnight travel mug, change Quantity to 3 and save. Ocean travel mug also becomes 3 although it was 2. Reload preserves the wrong result.

Expected: save changes only the selected line. Other quantities stay unchanged. This must still work after reversing or filtering the list, across reload, and when two variants share an SKU. Cancel must leave the cart unchanged.

Reproduce using the provided full browser tools before editing. Inspect source and implement the smallest justified fix; verify it in the browser afterward. Only src/App.jsx may change. Do not alter configuration, dependencies, storage keys, test/grader files, or remove functionality. Do not read or modify files outside this isolated app worktree. Do not commit, push, publish, or deploy. Return a brief root-cause/fix/test summary with any limitations. This is a seeded development task, not an actual customer report.`;

export function writeCartFixture(dir, manifest) {
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        ...manifest,
        name: 'cart-repair-pilot',
        private: true,
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(dir, '.gitignore'),
    'node_modules\ndist\n.domscribe\n',
  );
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Field Supply cart</title></head><body><div id="root"></div><script type="module" src="/src/App.jsx"></script></body></html>',
  );
  fs.writeFileSync(path.join(dir, 'src/App.jsx'), CART_SOURCE);
  fs.writeFileSync(
    path.join(dir, 'src/style.css'),
    '*{box-sizing:border-box}body{margin:0;background:#f4f2eb;color:#162c28;font:16px system-ui}main{max-width:880px;margin:44px auto;padding:0 24px}h1{font-size:44px;margin:8px 0}h2{font-size:21px;margin:8px 0}p{color:#536760}.category{font-size:12px;letter-spacing:.12em}nav,article,.actions{display:flex;justify-content:space-between;gap:24px}nav{align-items:end;margin:32px 0}article,section{background:white;border:1px solid #d1d8d0;padding:24px;margin:12px 0}article>div:last-child{text-align:right}label{display:grid;gap:8px}input,button{font:inherit;padding:9px 12px;border:1px solid #81978e}button{background:#164d40;color:white;cursor:pointer}button:disabled{opacity:.5}footer{padding:24px 0}.actions{margin-top:20px;justify-content:end}',
  );
  fs.writeFileSync(
    path.join(dir, 'vite.config.mjs'),
    `import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import {domscribe} from '@domscribe/react/vite';export default defineConfig({plugins:[react(),...(process.env.VITE_DOMSCRIBE==='1'?[domscribe({overlay:true,relay:{port:0}})]:[])],server:{host:'127.0.0.1',strictPort:true}});`,
  );
  fs.writeFileSync(path.join(dir, 'ISSUE.md'), ISSUE);
}
