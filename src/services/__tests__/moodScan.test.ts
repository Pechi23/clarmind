import { parseMoodResponse } from '../moodScan';

describe('parseMoodResponse', () => {
  it('parses a well-formed response', () => {
    const r = parseMoodResponse('{"mood":2,"reply":"That sounds heavy.","pattern":"478"}');
    expect(r).toEqual({ mood: 2, reply: 'That sounds heavy.', pattern: '478' });
  });

  it('strips code fences', () => {
    const r = parseMoodResponse('```json\n{"mood":5,"reply":"Lovely.","pattern":"deepCalm"}\n```');
    expect(r.mood).toBe(5);
    expect(r.pattern).toBe('deepCalm');
  });

  it('clamps mood to 1..5 and rounds', () => {
    expect(parseMoodResponse('{"mood":9,"reply":"x"}').mood).toBe(5);
    expect(parseMoodResponse('{"mood":0,"reply":"x"}').mood).toBe(1);
    expect(parseMoodResponse('{"mood":3.6,"reply":"x"}').mood).toBe(4);
  });

  it('rejects an unknown pattern', () => {
    expect(parseMoodResponse('{"mood":3,"reply":"x","pattern":"nope"}').pattern).toBe('');
  });

  it('defaults gracefully on invalid JSON', () => {
    const r = parseMoodResponse('not json');
    expect(r).toEqual({ mood: 3, reply: '', pattern: '' });
  });
});
