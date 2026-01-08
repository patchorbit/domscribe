/**
 * DeeplyNested - Tests deeply nested component structures
 *
 * Validates that Domscribe handles 10+ levels of nesting.
 * This stress-tests the transform layer's ability to handle deep ASTs.
 */

import { CaptureIcon } from './CaptureIcon';

export function DeeplyNested() {
  return (
    <div className="deeply-nested">
      <section>
        <h4>Deep Nesting (15 Levels)</h4>
        <div className="demo-box capture-widget">
          <CaptureIcon />
          <div className="level-1">
            <div className="level-2">
              <div className="level-3">
                <div className="level-4">
                  <div className="level-5">
                    <div className="level-6">
                      <div className="level-7">
                        <div className="level-8">
                          <div className="level-9">
                            <div className="level-10">
                              <div className="level-11">
                                <div className="level-12">
                                  <div className="level-13">
                                    <div className="level-14">
                                      <div className="level-15">
                                        <span>Deep content at level 15</span>
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
    </div>
  );
}
