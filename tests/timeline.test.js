import { describe, it, expect } from 'vitest';
import { SessionClock } from '../src/utils/timeline.js';

describe('SessionClock', () => {
  it('increments frames on tick', async () => {
    const clock = new SessionClock({ frameMs: 5 });
    let count = 0;
    await new Promise((resolve) => {
      clock.on('tick', () => {
        count++;
        if (count >= 5) { clock.stop(); resolve(); }
      });
      clock.start();
    });
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
