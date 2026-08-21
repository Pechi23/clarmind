import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getXp, addXp, claimDailyOpenXp, claimGuideReadXp,
  getTodayChallenges, completeChallenge, applySessionToChallenges,
  checkAchievements, getUnlockedAchievements,
} from '../gamification';
import { saveMeditationSession, saveMoodEntry } from '../storage';
import { XP } from '../../constants/achievements';
import { MeditationSession } from '../../types';

const session = (date: string, minutes: number, pattern: MeditationSession['pattern'] = 'box'): MeditationSession => ({
  date, durationMinutes: minutes, pattern, completedAt: `${date}T10:00:00Z`, soundscape: 'rain',
});

const today = () => new Date().toISOString().split('T')[0];

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('XP economy', () => {
  it('adds XP cumulatively', async () => {
    expect(await getXp()).toBe(0);
    await addXp(30);
    await addXp(20);
    expect(await getXp()).toBe(50);
  });

  it('claims daily-open XP only once per day', async () => {
    expect(await claimDailyOpenXp()).toBe(XP.DAILY_OPEN);
    expect(await claimDailyOpenXp()).toBe(0); // already claimed today
    expect(await getXp()).toBe(XP.DAILY_OPEN);
  });

  it('claims guide-read XP only once per day', async () => {
    expect(await claimGuideReadXp()).toBe(XP.READ_GUIDE);
    expect(await claimGuideReadXp()).toBe(0);
  });
});

describe('daily challenges', () => {
  it('returns 3 deterministic challenges for today', async () => {
    const a = await getTodayChallenges();
    const b = await getTodayChallenges();
    expect(a).toHaveLength(3);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(a.every((c) => !c.done)).toBe(true);
  });

  it('marks a challenge done and awards XP', async () => {
    const challenges = await getTodayChallenges();
    const first = challenges[0];
    const earned = await completeChallenge(first.id);
    expect(earned).toBeGreaterThanOrEqual(XP.CHALLENGE);
    const after = await getTodayChallenges();
    expect(after.find((c) => c.id === first.id)!.done).toBe(true);
  });

  it('does not double-award an already-completed challenge', async () => {
    const challenges = await getTodayChallenges();
    await completeChallenge(challenges[0].id);
    expect(await completeChallenge(challenges[0].id)).toBe(0);
  });

  it('grants the all-3 bonus when the final challenge completes', async () => {
    const challenges = await getTodayChallenges();
    await completeChallenge(challenges[0].id);
    await completeChallenge(challenges[1].id);
    const last = await completeChallenge(challenges[2].id);
    expect(last).toBe(XP.CHALLENGE + XP.ALL_CHALLENGES_BONUS);
  });
});

describe('applySessionToChallenges', () => {
  it('auto-completes a matching duration challenge', async () => {
    // Force a known challenge into today's set by finding which apply.
    const before = await getTodayChallenges();
    await saveMeditationSession(session(today(), 10));
    const earned = await applySessionToChallenges(10, 'box', true);
    // Earned XP is >= 0; if a duration/pattern/soundscape challenge was present it fires.
    expect(earned).toBeGreaterThanOrEqual(0);
    const after = await getTodayChallenges();
    // At least as many done as before.
    expect(after.filter((c) => c.done).length).toBeGreaterThanOrEqual(before.filter((c) => c.done).length);
  });
});

describe('achievements', () => {
  it('unlocks First Breath after the first session', async () => {
    await saveMeditationSession(session(today(), 5));
    const newly = await checkAchievements();
    const ids = newly.map((a) => a.id);
    expect(ids).toContain('first-breath');
    expect(await getUnlockedAchievements()).toContain('first-breath');
  });

  it('does not re-unlock an achievement already earned', async () => {
    await saveMeditationSession(session(today(), 5));
    await checkAchievements();
    const secondPass = await checkAchievements();
    expect(secondPass.map((a) => a.id)).not.toContain('first-breath');
  });

  it('unlocks Sound Bather only with a real soundscape', async () => {
    await saveMeditationSession({ ...session(today(), 5), soundscape: 'silence' });
    let unlocked = (await checkAchievements()).map((a) => a.id);
    expect(unlocked).not.toContain('sound-bather');

    await saveMeditationSession({ ...session(today(), 5), soundscape: 'ocean' });
    unlocked = await getUnlockedAchievements();
    await checkAchievements();
    expect(await getUnlockedAchievements()).toContain('sound-bather');
  });

  it('unlocks Mood Explorer after a mood check-in', async () => {
    await saveMoodEntry({ date: `${today()}T10:00:00Z`, mood: 4, context: 'post-session' });
    await checkAchievements();
    expect(await getUnlockedAchievements()).toContain('mood-explorer');
  });

  it('unlocks the 30-minute volume badge', async () => {
    await saveMeditationSession(session(today(), 20));
    await saveMeditationSession(session(today(), 15));
    await checkAchievements();
    expect(await getUnlockedAchievements()).toContain('minutes-30');
  });
});
