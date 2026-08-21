import { suggestSession } from '../sessionSuggestion';

describe('suggestSession', () => {
  it('recommends 4-7-8 at night regardless of mood', () => {
    const late = suggestSession(5, 22);
    expect(late).toEqual({ patternId: '478', minutes: 10, reasonKey: 'suggestion.night' });
    const early = suggestSession(null, 3);
    expect(early?.patternId).toBe('478');
  });

  it('recommends Deep Calm for a low recent mood during the day', () => {
    const s = suggestSession(2, 14);
    expect(s).toEqual({ patternId: 'deepCalm', minutes: 10, reasonKey: 'suggestion.lowMood' });
    expect(suggestSession(1, 10)?.patternId).toBe('deepCalm');
  });

  it('recommends a short Box session for a high recent mood during the day', () => {
    const s = suggestSession(5, 11);
    expect(s).toEqual({ patternId: 'box', minutes: 5, reasonKey: 'suggestion.highMood' });
  });

  it('returns null for a neutral mood during the day', () => {
    expect(suggestSession(3, 13)).toBeNull();
  });

  it('returns null when there is no mood signal during the day', () => {
    expect(suggestSession(null, 13)).toBeNull();
  });

  it('prioritizes night over mood', () => {
    // low mood but also night -> night wins
    expect(suggestSession(1, 23)?.reasonKey).toBe('suggestion.night');
  });
});
