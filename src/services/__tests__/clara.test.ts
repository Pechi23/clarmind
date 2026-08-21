import { buildClaraContents, claraOpeners, CLARA_CONTEXT_TURNS } from '../clara';
import { ChatMessage } from '../../types';

const msg = (role: 'user' | 'assistant', text: string): ChatMessage => ({
  role, text, at: '2026-06-27T10:00:00Z',
});

describe('buildClaraContents', () => {
  it('appends the new user message last', () => {
    const contents = buildClaraContents([], 'hello');
    expect(contents).toHaveLength(1);
    expect(contents[0]).toEqual({ role: 'user', parts: [{ text: 'hello' }] });
  });

  it('maps assistant -> model and user -> user', () => {
    const contents = buildClaraContents(
      [msg('user', 'hi'), msg('assistant', 'hello there')],
      'how are you'
    );
    expect(contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(contents[2].parts[0].text).toBe('how are you');
  });

  it('keeps only the last CLARA_CONTEXT_TURNS turns of history', () => {
    const history = Array.from({ length: 40 }, (_, i) => msg('user', `m${i}`));
    const contents = buildClaraContents(history, 'now');
    // trimmed history + the new message
    expect(contents).toHaveLength(CLARA_CONTEXT_TURNS + 1);
    expect(contents[contents.length - 1].parts[0].text).toBe('now');
    // oldest kept should be m24 (40 - 16)
    expect(contents[0].parts[0].text).toBe('m24');
  });
});

describe('claraOpeners', () => {
  it('greets the user by name', () => {
    expect(claraOpeners('Ana')).toContain('Ana');
  });
});
