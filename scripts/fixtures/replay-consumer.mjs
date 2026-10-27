import fs from 'node:fs';
import path from 'node:path';

export function writeReplayConsumer(consumer, appFramework, scope = 'article') {
  const framework =
    appFramework === 'next'
      ? 'react'
      : appFramework === 'nuxt'
        ? 'vue'
        : appFramework;
  const source = path.join(consumer, 'src');
  fs.mkdirSync(source);
  const entry = framework === 'vue' ? 'main.js' : 'main.jsx';
  fs.writeFileSync(
    path.join(consumer, 'index.html'),
    `<!doctype html><html><head><title>Instance replay regression</title></head><body><div id="root"></div><script type="module" src="/src/${entry}"></script></body></html>`,
  );
  fs.writeFileSync(
    path.join(consumer, 'vite.config.mjs'),
    `
import { defineConfig } from 'vite';
import framework from '@vitejs/plugin-${framework}';
import { domscribe } from '@domscribe/${framework}/vite';
export default defineConfig({plugins:[framework(),domscribe({overlay:true,relay:{port:0}})],server:{host:'127.0.0.1',strictPort:true}});
`,
  );
  if (framework === 'vue') {
    fs.writeFileSync(
      path.join(source, 'main.js'),
      `
import { createApp } from 'vue';
import App from './App.vue';
if(import.meta.env.DEV)import('@domscribe/runtime').then(({RuntimeManager})=>window.__runtime=RuntimeManager.getInstance());
createApp(App).mount('#root');
`,
    );
    fs.writeFileSync(
      path.join(source, 'Card.vue'),
      `
<script setup>
defineProps({ customer: Object });
const emit = defineEmits(['edit']);
</script>
<template>
  <article :aria-label="customer.name">
    <h2>{{ customer.name }}</h2><strong>{{ customer.city }}</strong>
    <button @click="emit('edit', customer)">Edit</button>
  </article>
</template>
`,
    );
    fs.writeFileSync(
      path.join(source, 'Editor.vue'),
      `
<script setup>
import { ref } from 'vue';
const props = defineProps({ customer: Object });
const emit = defineEmits(['save']);
const city = ref(props.customer.city);
const confirmed = ref(false);
</script>
<template>
  <section role="dialog" :data-ds-context="'customer:' + customer.id" :aria-label="'Edit ' + customer.name">
    <label>Shipping city<input name="city" v-model="city" /></label>
    <label><input type="checkbox" v-model="confirmed" />Confirm shipping change</label>
    <button :disabled="!confirmed" @click="emit('save', customer.id, city)">Save</button>
  </section>
</template>
`,
    );
    fs.writeFileSync(
      path.join(source, 'App.vue'),
      `
<script setup>
import { ref, computed } from 'vue';
import Card from './Card.vue';
import Editor from './Editor.vue';
const customers = ref([{id:'c1',name:'Orion',city:'Seattle'},{id:'c2',name:'Lyra',city:'Portland'},{id:'c3',name:'Vega',city:'Denver'}]);
const editing = ref(null);
const reverse = ref(false);
const sorted = computed(() => [...customers.value].sort((a,b)=>reverse.value?b.name.localeCompare(a.name):a.name.localeCompare(b.name)));
function save(id, city) { customers.value = customers.value.map(customer => customer.id === id ? {...customer,city} : customer); editing.value = null; }
</script>
<template>
  <main><h1>Customer operations</h1><button @click="reverse = !reverse">Sort</button>
    <Card v-for="customer in sorted" :key="customer.id" :customer="customer" @edit="editing = $event" />
    <Editor v-if="editing" :key="editing.id" :customer="editing" @save="save" />
  </main>
</template>
`,
    );
  } else {
    fs.writeFileSync(
      path.join(source, 'main.jsx'),
      `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
if(import.meta.env.DEV)import('@domscribe/runtime').then(({RuntimeManager})=>window.__runtime=RuntimeManager.getInstance());
function Card({customer,onEdit}){return <article aria-label={customer.name}><h2>{customer.name}</h2><strong>{customer.city}</strong><button onClick={()=>onEdit(customer)}>Edit</button></article>}
function Editor({customer,onSave}){const[city,setCity]=useState(customer.city);const[confirmed,setConfirmed]=useState(false);return <section role="dialog" data-ds-context={'customer:'+customer.id} aria-label={'Edit '+customer.name}><label>Shipping city<input name="city" value={city} onChange={e=>setCity(e.target.value)}/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirm shipping change</label><button disabled={!confirmed} onClick={()=>onSave(customer.id,city)}>Save</button></section>}
function App(){const[customers,setCustomers]=useState([{id:'c1',name:'Orion',city:'Seattle'},{id:'c2',name:'Lyra',city:'Portland'},{id:'c3',name:'Vega',city:'Denver'}]);const[editing,setEditing]=useState(null);const[reverse,setReverse]=useState(false);const sorted=[...customers].sort((a,b)=>reverse?b.name.localeCompare(a.name):a.name.localeCompare(b.name));return <main><h1>Customer operations</h1><button onClick={()=>setReverse(x=>!x)}>Sort</button>{sorted.map(customer=><Card key={customer.id} customer={customer} onEdit={setEditing}/>)}{editing&&<Editor customer={editing} onSave={(id,city)=>{setCustomers(all=>all.map(c=>c.id===id?{...c,city}:c));setEditing(null)}}/>}</main>}
createRoot(document.getElementById('root')).render(<App/>);
`,
    );
  }
  if (scope !== 'article') {
    const table = scope === 'table';
    if (framework === 'vue') {
      const cardPath = path.join(source, 'Card.vue');
      const card = fs.readFileSync(cardPath, 'utf8');
      fs.writeFileSync(
        cardPath,
        card.replace(
          /<article :aria-label="customer.name">[\s\S]*?<\/article>/,
          table
            ? '<tr><td>{{ customer.name }}</td><td><strong>{{ customer.city }}</strong></td><td><button @click="emit(\'edit\', customer)">Edit</button></td></tr>'
            : '<li><span>{{ customer.name }}</span><strong>{{ customer.city }}</strong><button @click="emit(\'edit\', customer)">Edit</button></li>',
        ),
      );
      const appPath = path.join(source, 'App.vue');
      let app = fs.readFileSync(appPath, 'utf8');
      app = app.replace(
        '<Card v-for="customer in sorted" :key="customer.id" :customer="customer" @edit="editing = $event" />',
        (table ? '<table><tbody>' : '<ul>') +
          '<Card v-for="(customer, index) in sorted" :key="index" :customer="customer" @edit="editing = $event" />' +
          (table ? '</tbody></table>' : '</ul>'),
      );
      app = app.replace(
        '<button @click="reverse = !reverse">Sort</button>',
        "<button @click=\"reverse = !reverse\">Sort</button><button @click=\"customers = customers.map(c => c.id === 'c2' ? {id: 'c4',name: 'Aster',city: 'Boston'} : c)\">Recycle Lyra</button>",
      );
      fs.writeFileSync(appPath, app);
    } else {
      const appPath = path.join(source, 'main.jsx');
      let app = fs.readFileSync(appPath, 'utf8');
      app = app.replace(
        '<article aria-label={customer.name}><h2>{customer.name}</h2><strong>{customer.city}</strong><button onClick={()=>onEdit(customer)}>Edit</button></article>',
        table
          ? '<tr><td>{customer.name}</td><td><strong>{customer.city}</strong></td><td><button onClick={()=>onEdit(customer)}>Edit</button></td></tr>'
          : '<li><span>{customer.name}</span><strong>{customer.city}</strong><button onClick={()=>onEdit(customer)}>Edit</button></li>',
      );
      app = app.replace(
        '{sorted.map(customer=><Card key={customer.id} customer={customer} onEdit={setEditing}/>)}',
        (table ? '<table><tbody>' : '<ul>') +
          '{sorted.map((customer,index)=><Card key={index} customer={customer} onEdit={setEditing}/>)}' +
          (table ? '</tbody></table>' : '</ul>'),
      );
      app = app.replace(
        '<button onClick={()=>setReverse(x=>!x)}>Sort</button>',
        "<button onClick={()=>setReverse(x=>!x)}>Sort</button><button onClick={()=>setCustomers(all=>all.map(c=>c.id==='c2'?{id:'c4',name:'Aster',city:'Boston'}:c))}>Recycle Lyra</button>",
      );
      fs.writeFileSync(appPath, app);
    }
  }
  if (appFramework === 'next') {
    fs.rmSync(path.join(consumer, 'index.html'));
    fs.rmSync(path.join(consumer, 'vite.config.mjs'));
    const entry = path.join(source, 'main.jsx');
    fs.writeFileSync(
      entry,
      "'use client';\n" +
        fs
          .readFileSync(entry, 'utf8')
          .replace("import{createRoot}from'react-dom/client';", '')
          .replace(
            'if(import.meta.env.DEV)',
            "if(typeof window!=='undefined' && process.env.NODE_ENV==='development')",
          )
          .replace('function App()', 'export default function App()')
          .replace(
            "createRoot(document.getElementById('root')).render(<App/>);",
            '',
          ),
    );
    fs.mkdirSync(path.join(source, 'app'));
    fs.writeFileSync(
      path.join(source, 'app/page.jsx'),
      "import App from '../main.jsx';export default function Page(){return <App/>}\n",
    );
    fs.writeFileSync(
      path.join(source, 'app/layout.jsx'),
      'export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}\n',
    );
    fs.writeFileSync(
      path.join(consumer, 'next.config.mjs'),
      "import {withDomscribe} from '@domscribe/next';export default withDomscribe({overlay:true,relay:{port:0}})({reactStrictMode:true,experimental:{cpus:2}});\n",
    );
  } else if (appFramework === 'nuxt') {
    fs.rmSync(path.join(consumer, 'index.html'));
    fs.rmSync(path.join(consumer, 'vite.config.mjs'));
    fs.rmSync(path.join(source, 'main.js'));
    fs.renameSync(path.join(source, 'App.vue'), path.join(source, 'app.vue'));
    fs.mkdirSync(path.join(source, 'plugins'));
    fs.writeFileSync(
      path.join(source, 'plugins/evidence.client.js'),
      "export default defineNuxtPlugin(async()=>{if(import.meta.dev){const {RuntimeManager}=await import('@domscribe/runtime');window.__runtime=RuntimeManager.getInstance();}});\n",
    );
    fs.writeFileSync(
      path.join(consumer, 'nuxt.config.mjs'),
      "export default defineNuxtConfig({srcDir:'src/',compatibilityDate:'2026-10-25',devtools:{enabled:false},modules:['@domscribe/nuxt'],domscribe:{overlay:true,relay:{port:0}},app:{head:{title:'Instance replay regression'}}});\n",
    );
  }
}
