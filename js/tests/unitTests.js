import assert from 'assert';
import { ScoreManager } from '../core/ScoreManager.js';
import { CampaignManager } from '../core/CampaignManager.js';
import { LeaderboardManager } from '../core/LeaderboardManager.js';
import { NoteFactory } from '../core/NoteFactory.js';
import { Conductor } from '../core/Conductor.js';
import { ProceduralGenerator } from '../core/ProceduralGenerator.js';
import { ReplayManager } from '../core/ReplayManager.js';
import { GameManager } from '../core/GameManager.js';

// Minimal browser stubs
if (typeof global.document === 'undefined') {
    const uiLayer = { appendChild: () => {}, remove: () => {} };
    global.document = {
        getElementById: (id) => id === 'ui-layer' ? uiLayer : null,
        querySelector: (sel) => ({ style: {}, getContext: () => ({}), addEventListener: () => {}, removeEventListener: () => {} }),
        createElement: () => ({ style: {}, appendChild: () => {}, remove: () => {}, querySelector: () => null, getContext: () => ({}) })
    };
}
if (typeof global.localStorage === 'undefined') {
    const storage = {};
    global.localStorage = {
        getItem(key) { return storage[key] || null; },
        setItem(key, value) { storage[key] = value.toString(); },
        removeItem(key) { delete storage[key]; },
        clear() { Object.keys(storage).forEach(k => delete storage[k]); }
    };
}
if (typeof global.window === 'undefined') {
    global.window = { BEATLINE_SETTINGS: {} };
}

async function testScoreManager() {
    const gameMock = { settings: { dynamicDifficulty: false }, modifiers: { noFail: true }, triggerShake: () => {}, triggerGlitch: () => {}, setFever: () => {}, achievementManager: { checkCombo: () => {}, checkScore: () => {}, checkJudgment: () => {} }, isDailyChallenge: false };
    const sm = new ScoreManager(gameMock, 10, false); // not ghost to test gameOver behavior

    assert.strictEqual(sm.score, 0);
    assert.strictEqual(sm.combo, 0);
    assert.strictEqual(sm.multiplier, 1);

    sm.addHit(100);
    assert.strictEqual(sm.combo, 1);
    assert.strictEqual(sm.score > 0, true);
    assert.strictEqual(sm.multiplier, 1);

    sm.combo = 20;
    assert.strictEqual(sm.multiplier, 3); // 1 + floor(20/10) * 1
    sm.feverActive = true;
    assert.strictEqual(sm.multiplier, 6);

    // noFail should empêcher gameOver direct, mais il doit émettre un event healthDepleted
    let gameOverCalled = false;
    let healthDepletedFired = false;
    gameMock.gameOver = () => { gameOverCalled = true; };
    sm.game.eventBus = { emit: (event, payload) => {
        if (event === 'healthDepleted') healthDepletedFired = true;
    }};

    sm.health = 0;
    sm.game.modifiers.noFail = true;
    sm.registerMiss();
    assert.strictEqual(gameOverCalled, false);
    assert.strictEqual(healthDepletedFired, false);
    assert.strictEqual(sm.health, 0);

    sm.game.modifiers.noFail = false;
    sm.registerMiss();
    assert.strictEqual(gameOverCalled, false);
    assert.strictEqual(healthDepletedFired, true);
    assert.strictEqual(sm.health, 0);
}

async function testCampaignManager() {
    const profile = { data: { campaignProgress: 0 }, save() { this.saved = true; } };
    const cm = new CampaignManager(profile);
    cm.setProfileManager(profile);

    assert.strictEqual(cm.progress, 0);

    const done0 = cm.checkCompletion(0, { score: 5000 });
    assert.strictEqual(done0, true);
    assert.strictEqual(cm.progress, 1);
    assert.strictEqual(profile.data.campaignProgress, 1);

    const done1fail = cm.checkCompletion(1, { score: 1000 });
    assert.strictEqual(done1fail, false);

    const done1 = cm.checkCompletion(1, { score: 15000 });
    assert.strictEqual(done1, true);
    assert.strictEqual(cm.progress, 2);
    assert.strictEqual(profile.data.campaignProgress, 2);
}

async function testLeaderboardManager() {
    const lb = new LeaderboardManager();
    localStorage.clear();

    const scores1 = await lb.getScores('track1');
    assert.ok(Array.isArray(scores1));

    await lb.submitScore('track1', 999999, 'Tester');
    const scoresAfter = await lb.getScores('track1');
    assert.ok(scoresAfter.some(entry => entry.name === 'Tester' && entry.score === 999999));

    const raw = JSON.parse(localStorage.getItem('beatline_leaderboard'));
    assert.ok(raw.track1 && raw.track1.some(e => e.name === 'Tester'));
}

async function testReplayManager() {
    const rm = new ReplayManager();
    rm.startRecording();
    rm.recordEvent(0.1, 'KeyD', true);
    rm.recordEvent(0.2, 'KeyD', false);
    assert.strictEqual(rm.isRecording, true);
    assert.strictEqual(rm.recording.length, 2);

    rm.startPlayback(rm.recording);
    assert.strictEqual(rm.isPlaying, true);
    assert.strictEqual(rm.isRecording, false);

    // simulate playback with direct handleInput path
    const fakeInput = { handleInput: () => {}, onKeyDown: () => {}, onKeyUp: () => {} };
    rm.update(0.15, fakeInput);
    assert.strictEqual(rm.playbackIndex, 1);
    rm.update(0.25, fakeInput);
    assert.strictEqual(rm.playbackIndex, 2);
}

async function testNoteFactory() {
    const gameMock = { settings: { noteSpeed: 30 }, modifiers: {}, triggerShake: () => {}, triggerGlitch: () => {}, setFever: () => {}, achievementManager: { checkCombo: () => {}, checkScore: () => {}, checkJudgment: () => {} }, isDailyChallenge: false };
    const scoreManager = new ScoreManager(gameMock, 10, false);
    const fakeScene = { add: () => {}, remove: () => {} };
    const pf = new NoteFactory(fakeScene, scoreManager, null, 30, false);

    pf.setChart({ notes: [{ lane: 0, time: 1.0, duration: 0 }] });
    pf.update(0.0, 0.016);
    assert.strictEqual(pf.activeNotes.length, 1);
    assert.ok(Math.abs(pf.activeNotes[0].position.z + 30) < 0.1); // note starts at -30

    pf.update(1.0, 0.016);
    assert.ok(Math.abs(pf.activeNotes[0].position.z - 0) < 0.1);
}

async function testConductor() {
    const fakeCtx = { currentTime: 0, suspend: () => Promise.resolve(), resume: () => Promise.resolve() };
    const fakeAudioManager = { ctx: fakeCtx, playSong: () => {}, stopSong: () => {}, setPlaybackRate: () => {} };

    const c = new Conductor(fakeAudioManager);
    c.start(120, 0);
    assert.strictEqual(c.isPlaying, true);
    assert.strictEqual(c.bpm, 120);

    fakeCtx.currentTime = 0.5;
    c.update();
    assert.ok(c.songPosition >= 0);

    c.setPlaybackRate(2);
    assert.strictEqual(c.playbackRate, 2);

    c.pause();
    assert.strictEqual(c.isPlaying, false);
    c.resume();
    assert.strictEqual(c.isPlaying, true);
}

async function testProceduralGenerator() {
    const pg = new ProceduralGenerator();
    const fakeData = new Float32Array(1000).map((v,i) => ((i % 10) < 3 ? 0.5 : 0));
    const audioBuffer = {
        duration: 10,
        sampleRate: 100,
        getChannelData: () => fakeData
    };

    const chart = await pg.generate(audioBuffer, 120, 'Normal');
    assert.ok(Array.isArray(chart.notes));
    assert.ok(chart.notes.length > 0);

    const times = chart.notes.map(n => n.time);
    const uniqueTime = new Set(times);
    assert.strictEqual(uniqueTime.size, times.length);
}

async function testVRSupport() {
    assert.ok(typeof GameManager.prototype.enterVR === 'function');
    assert.ok(typeof GameManager.prototype.startLoop === 'function');
    // in headless tests we avoid full instantiation (WebGLRenderer not available)
    await Promise.resolve();
}

async function runAllTests() {
    console.log('🧪 Running unit tests...');
    await testScoreManager();
    console.log(' - ScoreManager OK');
    await testCampaignManager();
    console.log(' - CampaignManager OK');
    await testLeaderboardManager();
    console.log(' - LeaderboardManager OK');
    await testReplayManager();
    console.log(' - ReplayManager OK');
    await testNoteFactory();
    console.log(' - NoteFactory OK');
    await testConductor();
    console.log(' - Conductor OK');
    await testProceduralGenerator();
    console.log(' - ProceduralGenerator OK');
    await testVRSupport();
    console.log(' - VRSupport OK');
    console.log('🎉 All tests passed.');
}

runAllTests().catch(err => { console.error('Test failure', err); process.exit(1); });
