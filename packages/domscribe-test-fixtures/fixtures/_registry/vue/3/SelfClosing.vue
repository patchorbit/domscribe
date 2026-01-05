<script setup lang="ts">
/**
 * SelfClosing - Tests self-closing elements in Vue templates
 */
import CaptureIcon from './CaptureIcon.vue';
</script>

<template>
  <div>
    <!-- Input Elements -->
    <section>
      <h4>Self-Closing Input Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-group">
        <label>Text input</label>
        <input type="text" placeholder="Self-closing input" />
      </div>
      <div class="form-group">
        <label>Email input</label>
        <input type="email" placeholder="email@example.com" />
      </div>
      <div class="form-group">
        <label>Number input</label>
        <input type="number" min="0" max="100" />
      </div>
      <div class="form-group">
        <label>Date input</label>
        <input type="date" />
      </div>
      <div class="form-group">
        <label>Color input</label>
        <input type="color" value="#06b6d4" />
      </div>
        <div class="form-group">
          <label>Range input</label>
          <input type="range" min="0" max="100" />
        </div>
      </div>
    </section>

    <!-- Line Break Elements -->
    <section>
      <h4>Line Breaks</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>
        First line<br />
          Second line<br />
          Third line
        </p>
      </div>
    </section>

    <!-- Horizontal Rule -->
    <section>
      <h4>Horizontal Rules</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>Content above the rule</p>
        <hr />
        <p>Content below the rule</p>
      </div>
    </section>

    <!-- Image Elements -->
    <section>
      <h4>Image Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%234b5563'/%3E%3Ctext x='75' y='80' text-anchor='middle' fill='%239ca3af' font-size='14'%3E150x150%3C/text%3E%3C/svg%3E"
            alt="Placeholder image"
            width="150"
            height="150"
          />
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%2306b6d4'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='14'%3ESVG%3C/text%3E%3C/svg%3E"
            alt="SVG data URI"
            width="100"
            height="100"
          />
        </div>
      </div>
    </section>

    <!-- Meta-like Elements -->
    <section>
      <h4>Meta-like Self-Closing</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>These elements are typically in &lt;head&gt; but shown here for testing:</p>
        <code>&lt;meta charset="UTF-8" /&gt;</code>
        <br />
        <code>&lt;link rel="stylesheet" href="..." /&gt;</code>
        <br />
        <code>&lt;base href="/" /&gt;</code>
      </div>
    </section>

    <!-- Area Element (within map) -->
    <section>
      <h4>Area Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect width='100' height='100' fill='%2322c55e'/%3E%3Crect x='100' width='100' height='100' fill='%233b82f6'/%3E%3C/svg%3E"
        alt="Image map demo"
        usemap="#demo-map"
        width="200"
        height="100"
      />
      <map name="demo-map">
        <area shape="rect" coords="0,0,100,100" alt="Green area" title="Green area" />
          <area shape="rect" coords="100,0,200,100" alt="Blue area" title="Blue area" />
        </map>
      </div>
    </section>

    <!-- Embed and Source -->
    <section>
      <h4>Media Self-Closing Elements</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <p>Self-closing media elements (not rendered but valid):</p>
        <code>&lt;source src="video.mp4" type="video/mp4" /&gt;</code>
        <br />
        <code>&lt;track kind="subtitles" src="subs.vtt" /&gt;</code>
        <br />
        <code>&lt;embed src="plugin.swf" /&gt;</code>
      </div>
    </section>
  </div>
</template>
