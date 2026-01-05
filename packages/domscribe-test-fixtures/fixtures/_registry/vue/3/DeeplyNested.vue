<script setup lang="ts">
/**
 * DeeplyNested - Tests deeply nested component structures (10+ levels)
 */
import { ref } from 'vue';
import CaptureIcon from './CaptureIcon.vue';

const depth = ref(15);
</script>

<template>
  <div>
    <!-- Depth Control -->
    <section>
      <h4>Nesting Depth Control</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="form-row">
          <label>Depth:</label>
          <input v-model.number="depth" type="range" min="1" max="20" />
          <span>{{ depth }} levels</span>
        </div>
      </div>
    </section>

    <!-- Deeply Nested Structure -->
    <section>
      <h4>Deeply Nested Structure</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="level-1">
        <span>Level 1</span>
        <div v-if="depth >= 2" class="level-2">
          <span>Level 2</span>
          <div v-if="depth >= 3" class="level-3">
            <span>Level 3</span>
            <div v-if="depth >= 4" class="level-4">
              <span>Level 4</span>
              <div v-if="depth >= 5" class="level-5">
                <span>Level 5</span>
                <div v-if="depth >= 6" class="level-6">
                  <span>Level 6</span>
                  <div v-if="depth >= 7" class="level-7">
                    <span>Level 7</span>
                    <div v-if="depth >= 8" class="level-8">
                      <span>Level 8</span>
                      <div v-if="depth >= 9" class="level-9">
                        <span>Level 9</span>
                        <div v-if="depth >= 10" class="level-10">
                          <span>Level 10</span>
                          <div v-if="depth >= 11" class="level-11">
                            <span>Level 11</span>
                            <div v-if="depth >= 12" class="level-12">
                              <span>Level 12</span>
                              <div v-if="depth >= 13" class="level-13">
                                <span>Level 13</span>
                                <div v-if="depth >= 14" class="level-14">
                                  <span>Level 14</span>
                                  <div v-if="depth >= 15" class="level-15">
                                    <span>Level 15 - Maximum recommended nesting!</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>

    <!-- Alternative: Recursive Pattern Info -->
    <section>
      <h4>Nesting Pattern Notes</h4>
      <div class="demo-box demo-box-amber capture-widget">
        <CaptureIcon />
        <p><strong>Why test deep nesting?</strong></p>
        <ul>
          <li>Validates transform traversal handles deep structures</li>
          <li>Ensures stable ID generation at all depths</li>
          <li>Tests sourcemap accuracy for deeply nested elements</li>
          <li>Verifies no stack overflow in AST processing</li>
        </ul>
      </div>
    </section>

    <!-- Mixed Content Nesting -->
    <section>
      <h4>Mixed Content at Various Depths</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div>
          Parent with text
          <div>
            Child with <span>inline span</span>
            <div>
              Grandchild with
              <button>a button</button>
              and
              <input type="text" placeholder="an input" style="width: 100px;" />
              <div>
                Great-grandchild with
                <ul>
                  <li>list item 1</li>
                  <li>list item 2
                    <ul>
                      <li>nested list item</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Component Nesting Simulation -->
    <section>
      <h4>Simulated Component Nesting</h4>
      <div class="demo-box capture-widget">
        <CaptureIcon />
        <div class="demo-box-blue" style="padding: 0.5rem;">
          Layout Component
          <div class="demo-box-green" style="padding: 0.5rem; margin-top: 0.5rem;">
            Header Component
            <div style="padding: 0.25rem; margin-top: 0.25rem; border: 1px dashed var(--color-border-secondary);">
              Logo Component
            </div>
            <div style="padding: 0.25rem; margin-top: 0.25rem; border: 1px dashed var(--color-border-secondary);">
              Navigation Component
              <div style="padding: 0.25rem; margin-top: 0.25rem; border: 1px dotted var(--color-border-tertiary);">
                NavItem 1
              </div>
              <div style="padding: 0.25rem; margin-top: 0.25rem; border: 1px dotted var(--color-border-tertiary);">
                NavItem 2
              </div>
            </div>
          </div>
          <div class="demo-box-amber" style="padding: 0.5rem; margin-top: 0.5rem;">
            Main Component
            <div style="padding: 0.25rem; margin-top: 0.25rem; border: 1px dashed var(--color-border-secondary);">
              Content Component
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
