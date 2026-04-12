#!/usr/bin/env node

/**
 * AgentVibes Voice Browser
 * Browse and preview 914+ Piper TTS voices
 * Press 'I' to install/select a voice for AgentVibes
 */

import blessed from 'blessed';
import chalk from 'chalk';
import { exec, spawn, spawnSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  MODEL_PATH: path.join(os.homedir(), '.local/share/piper/en_US-libritts-high.onnx'),
  TOTAL_SPEAKERS: 904,
  TOTAL_CURATED: 10,
  TOTAL_ITEMS: 914,
  SAMPLE_TEXT: 'Hello! This is a sample of my voice. I can speak clearly and naturally with expression.',
  OUTPUT_DIR: path.join(os.homedir(), '.cache/agentvibes/voice-samples'),
  CURATED_DIR: path.join(os.homedir(), '.cache/agentvibes/curated-samples'),
  PROGRESS_FILE: path.join(os.homedir(), '.cache/agentvibes/browser-progress.json'),
  PIPER_PATH: path.join(os.homedir(), '.local/bin/piper'),
  PIPER_VOICES_DIR: path.join(os.homedir(), '.local/share/piper/voices'),
  AGENTVIBES_CONFIG: path.join(os.homedir(), '.agentvibes/config.json'),
  VOICE_METADATA: path.join(__dirname, '..', '.agentvibes', 'config', 'voice-metadata.json')
};

// Sample script templates showcasing AgentVibes features
const SAMPLE_TEMPLATES = [
  "Hi, I'm {NAME}. AgentVibes supports multiple TTS providers including Piper for local processing, Windows SAPI, macOS system voices, and Soprano. Choose the best fit for your platform.",
  "Hey there, I'm {NAME}! AgentVibes supports Soprano, a high-quality neural TTS engine that produces incredibly natural-sounding voices. The audio quality is seriously impressive.",
  "Good day, I'm {NAME}. AgentVibes integrates with PulseAudio to stream TTS from headless remote servers to your local machine. Essential when developing on voiceless cloud instances.",
  "Hi, I'm {NAME}. AgentVibes provides access to over thirty-seven Piper voices, plus system voices from Windows, macOS, and Linux. Maximum flexibility for your needs.",
  "Hey team, I'm {NAME}! AgentVibes lets you add custom background music to your TTS output. Jazz, lo-fi, classical—whatever helps you stay in the zone while coding!",
  "Oh wonderful, I'm {NAME}. AgentVibes has a sarcastic personality mode. Because clearly what your development workflow was missing was an AI with attitude. How delightful.",
  "Hi, I'm {NAME}. AgentVibes includes a receiver mode that lets you stream TTS from one machine to another. Perfect for using remote servers while hearing audio on your local device.",
  "Hi there, I'm {NAME}! AgentVibes includes audio effects like reverb, pitch adjustment, and EQ. Add some atmosphere and personality to your AI assistant's voice!",
  "Hello, I'm {NAME}. AgentVibes includes a bundled MCP server that makes configuration incredibly easy. Just use natural language to configure voices, personalities, and settings.",
  "Good afternoon, I'm {NAME}. If you're enjoying AgentVibes, we'd be tremendously grateful for a GitHub star. Your support helps the project grow and improve."
];

class AgentVibesVoiceBrowser {
  constructor() {
    this.tableData = [];
    this.filteredData = [];
    this.currentRow = 0;
    this.sortColumn = 'id';
    this.sortAsc = true;
    this.searchTerm = '';
    this.favorites = new Set();       // backward compat — migrated to thumbsUp on load
    this.thumbsUp = new Set();
    this.thumbsDown = new Set();
    this.favoritesOnly = false; // Filter to show only thumbs-up voices
    this.providerFilter = null; // Filter by provider (null = all)
    this.sampleText = CONFIG.SAMPLE_TEXT;
    this.playing = false;
    this.currentAudioProcess = null;
    this.voiceAssignments = null;
    this.voiceMetadata = null;
    this.currentTab = 'voices'; // 'voices' or 'music'
    this.musicTracks = [];
    this.currentMusicSelection = null;
    this.musicEnabled = false;
    this.currentlyPlayingTrack = null; // Track which music track is currently playing
    this.musicFavorites = new Set(); // Favorite music tracks
  }

  async init() {
    await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
    await fs.mkdir(CONFIG.CURATED_DIR, { recursive: true });
    await fs.mkdir(path.dirname(CONFIG.PROGRESS_FILE), { recursive: true });

    // Clean up old cached samples (without text hash in filename)
    try {
      const files = await fs.readdir(CONFIG.OUTPUT_DIR);
      for (const file of files) {
        if (file.match(/^speaker_\d+\.wav$/)) {
          await fs.unlink(path.join(CONFIG.OUTPUT_DIR, file));
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    await this.loadProgress();
    await this.loadVoiceData();
    await this.loadMusicData();
    this.prepareTable();
    this.setupUI();
  }

  async loadProgress() {
    try {
      const data = JSON.parse(await fs.readFile(CONFIG.PROGRESS_FILE, 'utf8'));
      this.thumbsUp = new Set(data.thumbsUp || []);
      this.thumbsDown = new Set(data.thumbsDown || []);
      // Migrate legacy favorites → thumbsUp
      if (data.favorites && data.favorites.length && !data.thumbsUp) {
        for (const f of data.favorites) this.thumbsUp.add(f);
      }
      this.favorites = this.thumbsUp; // backward compat alias
      this.musicFavorites = new Set(data.musicFavorites || []);
      this.sampleText = data.sampleText || CONFIG.SAMPLE_TEXT;
      this.sortColumn = data.sortColumn || 'id';
      this.sortAsc = data.sortAsc !== undefined ? data.sortAsc : true;
    } catch (error) {
      // No previous progress
    }
  }

  async saveProgress() {
    await fs.writeFile(CONFIG.PROGRESS_FILE, JSON.stringify({
      thumbsUp: Array.from(this.thumbsUp),
      thumbsDown: Array.from(this.thumbsDown),
      favorites: Array.from(this.thumbsUp), // backward compat
      musicFavorites: Array.from(this.musicFavorites),
      sampleText: this.sampleText,
      sortColumn: this.sortColumn,
      sortAsc: this.sortAsc
    }, null, 2));
  }

  async detectProviders() {
    const providers = [];

    // Check for macOS Say
    if (process.platform === 'darwin') {
      try {
        const result = spawnSync('which', ['say'], { encoding: 'utf8', timeout: 1000 });
        if (result.status === 0) {
          providers.push('macos');
        }
      } catch {
        // Silently skip if check fails
      }
    }

    // Check for Windows SAPI (not available in WSL)
    if (process.platform === 'win32') {
      providers.push('windows-sapi');
    }

    // Check for Soprano TTS
    try {
      // Try to start Soprano if available
      const ensureScript = path.join(__dirname, 'ensure-soprano-running.sh');
      if (fsSync.existsSync(ensureScript)) {
        try {
          spawnSync('bash', [ensureScript], { encoding: 'utf8', timeout: 5000 });
        } catch {
          // Failed to start, skip silently
        }
      }

      // Check if Soprano server is responding
      const curlResult = spawnSync('curl', ['-s', '-m', '1', 'http://127.0.0.1:7860/openapi.json'], { encoding: 'utf8', timeout: 2000 });
      if (curlResult.status === 0 && curlResult.stdout && curlResult.stdout.includes('Soprano')) {
        providers.push('soprano');
      }
    } catch {
      // Silently skip if detection fails
    }

    return providers;
  }

  async loadMusicData() {
    // Load background music tracks
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    let tracksDir = path.join(homeDir, '.claude', 'audio', 'tracks');

    // If running from project directory, also check project's .claude/audio/tracks
    if (!fsSync.existsSync(tracksDir)) {
      const projectTracksDir = path.join(__dirname, '..', '.claude', 'audio', 'tracks');
      if (fsSync.existsSync(projectTracksDir)) {
        tracksDir = projectTracksDir;
      }
    }

    try {
      const files = await fs.readdir(tracksDir);
      this.musicTracks = files
        .filter(f => f.endsWith('.mp3') && !f.startsWith('.'))
        .map(file => ({
          file,
          name: file.replace(/^agent_vibes_|^agentvibes_|_v\d+|_loop\.mp3$/g, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          path: path.join(tracksDir, file)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Load current music selection
      const musicConfigFile = path.join(homeDir, '.claude', 'config', 'background-music.txt');
      try {
        this.currentMusicSelection = (await fs.readFile(musicConfigFile, 'utf8')).trim();
      } catch {
        this.currentMusicSelection = null;
      }

      // Load music enabled status
      const musicEnabledFile = path.join(homeDir, '.claude', 'config', 'background-music-enabled.txt');
      try {
        const enabled = (await fs.readFile(musicEnabledFile, 'utf8')).trim();
        this.musicEnabled = enabled === 'true';
      } catch {
        this.musicEnabled = false;
      }
    } catch (error) {
      this.musicTracks = [];
    }
  }

  async loadMacOSVoices() {
    try {
      const { stdout } = await execAsync('say -v ? 2>/dev/null');
      const voices = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const match = line.match(/^(\S+)\s+(\S+)\s+#\s*(.+)/);
        if (match) {
          const [, name, lang, description] = match;
          voices.push({
            name,
            language: lang,
            description: description || '',
            provider: 'macos'
          });
        }
      }
      return voices;
    } catch {
      return [];
    }
  }

  async loadWindowsSAPIVoices() {
    try {
      const psScript = 'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo | Select-Object Name, Gender, Culture | ConvertTo-Json -Compress }';
      const { stdout } = await execAsync(`powershell -Command "${psScript}"`, { timeout: 5000 });
      const voices = [];
      const lines = stdout.trim().split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const voice = JSON.parse(line);
          // SECURITY: Validate expected schema from PowerShell output (#133)
          if (voice && typeof voice.Name === 'string' && voice.Name.length > 0) {
            voices.push({
              name: voice.Name,
              gender: typeof voice.Gender === 'string' ? voice.Gender.toLowerCase() : 'unknown',
              language: typeof voice.Culture === 'string' ? voice.Culture : 'en-US',
              provider: 'windows-sapi'
            });
          }
        } catch {}
      }
      return voices;
    } catch {
      return [];
    }
  }

  async loadSopranoVoices() {
    // Soprano TTS currently has only one voice
    // It uses OpenAI API format but ignores the voice parameter
    return [
      {
        name: 'Soprano',
        language: 'en-US',
        provider: 'soprano',
        description: 'Neural TTS voice'
      }
    ];
  }

  async loadVoiceData() {
    // Detect available providers
    this.availableProviders = await this.detectProviders();

    // Load voice assignments (for LibriTTS speakers)
    const assignmentsPath = path.join(__dirname, '..', 'voice-assignments.json');
    if (fsSync.existsSync(assignmentsPath)) {
      this.voiceAssignments = JSON.parse(await fs.readFile(assignmentsPath, 'utf8'));
    } else {
      // Generate basic assignments if file doesn't exist
      console.log(chalk.yellow('⚠ voice-assignments.json not found, generating basic data...'));
      this.voiceAssignments = {
        libritts_speakers: {},
        curated_voices: {}
      };

      // Generate basic speaker assignments
      for (let id = 0; id < CONFIG.TOTAL_SPEAKERS; id++) {
        this.voiceAssignments.libritts_speakers[id] = {
          gender: id % 2 === 0 ? 'male' : 'female',
          voice_name: `Speaker ${id}`
        };
      }
    }

    // Load voice metadata (for curated voices)
    if (fsSync.existsSync(CONFIG.VOICE_METADATA)) {
      this.voiceMetadata = JSON.parse(await fs.readFile(CONFIG.VOICE_METADATA, 'utf8'));

      // Merge curated voices into assignments
      if (this.voiceMetadata && this.voiceMetadata.voices) {
        let curatedId = 1000; // Start curated voices at ID 1000
        for (const [friendlyName, voice] of Object.entries(this.voiceMetadata.voices)) {
          this.voiceAssignments.curated_voices[curatedId] = {
            gender: voice.gender,
            voice_name: voice.displayName,
            model_file: voice.id,
            friendly_name: friendlyName
          };
          curatedId++;
        }
      }
    }

    // Load voices from other providers
    this.otherProviderVoices = {
      macos: [],
      'windows-sapi': [],
      soprano: []
    };

    if (this.availableProviders.includes('macos')) {
      this.otherProviderVoices.macos = await this.loadMacOSVoices();
    }

    if (this.availableProviders.includes('windows-sapi')) {
      this.otherProviderVoices['windows-sapi'] = await this.loadWindowsSAPIVoices();
    }

    if (this.availableProviders.includes('soprano')) {
      this.otherProviderVoices.soprano = await this.loadSopranoVoices();
    }
  }

  prepareTable() {
    this.tableData = [];
    let nextId = 0;

    // Add LibriTTS speakers
    for (let id = 0; id < CONFIG.TOTAL_SPEAKERS; id++) {
      const assignment = this.voiceAssignments.libritts_speakers[id];
      if (assignment) {
        // Assign random sample template with voice name
        const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
        const sampleText = template.replace('{NAME}', assignment.voice_name);

        this.tableData.push({
          id: nextId++,
          originalId: id,
          gender: assignment.gender,
          name: assignment.voice_name,
          model: 'LibriTTS',
          type: 'libritts',
          provider: 'Piper',
          piperVoiceId: `speaker-${id}`,
          sampleText: sampleText,
          language: 'en_US'
        });
      }
    }

    // Add curated voices
    for (const [id, curated] of Object.entries(this.voiceAssignments.curated_voices)) {
      // Assign random sample template with voice name
      const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
      const sampleText = template.replace('{NAME}', curated.voice_name);

      // Extract language from model file (e.g., en_US-amy-medium -> en_US)
      const langMatch = curated.model_file.match(/^([a-z]{2}_[A-Z]{2})/);
      const language = langMatch ? langMatch[1] : 'en_US';

      this.tableData.push({
        id: nextId++,
        originalId: parseInt(id),
        gender: curated.gender,
        name: curated.voice_name,
        model: curated.model_file,
        type: 'curated',
        provider: 'Piper',
        piperVoiceId: curated.model_file,
        friendlyName: curated.friendly_name,
        sampleText: sampleText,
        language: language
      });
    }

    // Add macOS voices
    for (const voice of this.otherProviderVoices.macos || []) {
      const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
      const sampleText = template.replace('{NAME}', voice.name);

      this.tableData.push({
        id: nextId++,
        gender: 'unknown',
        name: voice.name,
        model: 'macOS Say',
        type: 'macos',
        provider: 'macOS',
        sampleText: sampleText,
        language: voice.language || 'en_US'
      });
    }

    // Add Windows SAPI voices
    for (const voice of this.otherProviderVoices['windows-sapi'] || []) {
      const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
      const sampleText = template.replace('{NAME}', voice.name);

      this.tableData.push({
        id: nextId++,
        gender: voice.gender || 'unknown',
        name: voice.name,
        model: 'Windows SAPI',
        type: 'windows-sapi',
        provider: 'Windows',
        sampleText: sampleText,
        language: voice.language || 'en-US'
      });
    }

    // Add Soprano voices
    for (const voice of this.otherProviderVoices.soprano || []) {
      const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
      const sampleText = template.replace('{NAME}', voice.name);

      this.tableData.push({
        id: nextId++,
        gender: 'unknown',
        name: voice.name,
        model: 'Soprano',
        type: 'soprano',
        provider: 'Soprano',
        sampleText: sampleText,
        language: voice.language || 'en-US'
      });
    }

    this.applyFilter();
  }

  applyFilter() {
    // Start with all voices or thumbs-up only
    let data = this.favoritesOnly
      ? this.tableData.filter(row => this.thumbsUp.has(row.id))
      : [...this.tableData];

    // Apply provider filter
    if (this.providerFilter) {
      data = data.filter(row => row.provider === this.providerFilter);
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(row =>
        row.id.toString().includes(term) ||
        row.gender.includes(term) ||
        row.name.toLowerCase().includes(term) ||
        row.model.toLowerCase().includes(term) ||
        row.language.toLowerCase().includes(term) ||
        row.provider.toLowerCase().includes(term)
      );
    }

    this.filteredData = data;

    // Sort
    this.filteredData.sort((a, b) => {
      let aVal = a[this.sortColumn];
      let bVal = b[this.sortColumn];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return this.sortAsc ? -1 : 1;
      if (aVal > bVal) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  formatRow(row) {
    const fav = this.thumbsUp.has(row.id) ? '{green-fg}+{/green-fg}' : (this.thumbsDown.has(row.id) ? '{red-fg}-{/red-fg}' : ' ');
    const genderIcon = row.gender === 'male' ? '♂' : (row.gender === 'female' ? '♀' : '-');
    const genderColor = row.gender === 'male' ? 'blue-fg' : (row.gender === 'female' ? 'magenta-fg' : 'gray-fg');
    const gender = `{${genderColor}}${genderIcon}{/${genderColor}}`;
    const id = String(row.id).padStart(4);
    const name = row.name.substring(0, 13).padEnd(13);
    const provider = row.provider.substring(0, 8).padEnd(8);
    const lang = row.language.substring(0, 6).padEnd(6);
    const model = row.model.substring(0, 15).padEnd(15);
    return `${fav} ${id} ${gender} ${name} ${provider} ${lang} ${model}`;
  }

  setupUI() {
    this.screen = blessed.screen({ smartCSR: true, title: 'AgentVibes Voice Browser' });

    // Calculate unique models and store as instance variable
    this.uniqueModels = new Set(this.tableData.map(row => row.model)).size;

    const title = blessed.box({
      top: 0,
      height: 1,
      width: '100%',
      content: `{center}{bold}{cyan-fg}Agent{/cyan-fg} {magenta-fg}Vibes{/magenta-fg} {gray-fg}v1.0{/gray-fg} {yellow-fg}Voice Browser{/yellow-fg}{/bold}{/center}`,
      tags: true,
      style: { fg: 'white' }
    });

    const headerBar = blessed.box({
      top: 1,
      height: 4,
      width: '100%',
      content: `{center}{gray-fg}github.com/paulpreibisch/agentvibes{/gray-fg} {white-fg}www.agentvibes.org{/white-fg}{/center}\n{center}{red-fg}[T]{/red-fg}Tabs {cyan-fg}[1-6]{/cyan-fg}Sort {cyan-fg}[/]{/cyan-fg}Search {cyan-fg}[P]{/cyan-fg}Prompt {cyan-fg}[L]{/cyan-fg}Filter {cyan-fg}[F/X]{/cyan-fg}Fav {cyan-fg}[Space]{/cyan-fg}Play {green-fg}[+/*]{/green-fg}Up {red-fg}[-]{/red-fg}Down {cyan-fg}[I]{/cyan-fg}Install{/center}`,
      tags: true,
      padding: 0,
      border: { type: 'line', fg: 'gray' },
      style: {
        bg: 'black',
        fg: 'white',
        border: { bg: 'black' }
      }
    });

    // Tab bar
    this.tabBar = blessed.box({
      top: 5,
      height: 1,
      width: '100%',
      tags: true,
      mouse: true,
      clickable: true,
      style: { fg: 'white', bg: 'black' }
    });

    // Voices Tab Content
    this.voicesContainer = blessed.box({
      top: 6,
      left: 0,
      width: '100%',
      height: '100%-11',
      hidden: false
    });

    this.tableHeader = blessed.box({
      top: 0,
      left: 0,
      height: 1,
      width: '70%',
      content: `   ID   G  Name          Provider Lang   Model          `,
      style: { fg: 'cyan', bold: true },
      mouse: true,
      clickable: true
    });

    this.list = blessed.list({
      top: 1,
      left: 0,
      width: '70%',
      height: '100%-1',
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      style: {
        selected: { bg: 'blue', fg: 'white', bold: true },
        item: { fg: 'white' },
        border: { fg: 'cyan' },
        label: { fg: 'gray' }
      },
      border: { type: 'line', fg: 'cyan' },
      label: ` Voices (${this.filteredData.length}) - Model (${this.uniqueModels}) - Sort: ${this.sortColumn} ${this.sortAsc ? '↑' : '↓'} `
    });

    this.infoPanel = blessed.box({
      top: 0,
      left: '70%',
      width: '30%',
      height: '100%',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      label: ' Voice Info ',
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'gray' }
      }
    });

    this.voicesContainer.append(this.tableHeader);
    this.voicesContainer.append(this.list);
    this.voicesContainer.append(this.infoPanel);

    // Music Tab Content
    this.musicContainer = blessed.box({
      top: 6,
      left: 0,
      width: '100%',
      height: '100%-11',
      hidden: true
    });

    this.musicList = blessed.list({
      top: 0,
      left: 0,
      width: '70%',
      height: '100%',
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      style: {
        selected: { bg: 'blue', fg: 'white', bold: true },
        item: { fg: 'white' },
        border: { fg: 'cyan' },
        label: { fg: 'gray' }
      },
      border: { type: 'line', fg: 'cyan' },
      label: ` Background Music (${this.musicTracks.length} tracks) `
    });

    this.musicInfo = blessed.box({
      top: 0,
      left: '70%',
      width: '30%',
      height: '100%',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      label: ' Track Info ',
      content: '',
      padding: 1,
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'gray' }
      }
    });

    this.musicContainer.append(this.musicList);
    this.musicContainer.append(this.musicInfo);

    this.statusBar = blessed.box({
      bottom: 4,
      height: 1,
      width: '100%',
      content: 'Ready',
      tags: true,
      style: { fg: 'green' }
    });

    this.helpBar = blessed.box({
      bottom: 1,
      height: 3,
      width: '100%',
      content: '{cyan-fg}[1-6]{/cyan-fg}Sort {cyan-fg}[/]{/cyan-fg}Search {cyan-fg}[P]{/cyan-fg}Prompt {cyan-fg}[L]{/cyan-fg}Filter {cyan-fg}[F/X]{/cyan-fg}Fav {cyan-fg}[Space]{/cyan-fg}Play {cyan-fg}[R]{/cyan-fg}Reverb {green-fg}[+/*]{/green-fg}Up {red-fg}[-]{/red-fg}Down {cyan-fg}[I]{/cyan-fg}Install',
      tags: true,
      padding: 0,
      border: { type: 'line', fg: 'gray' },
      style: {
        bg: 'black',
        fg: 'white',
        border: { bg: 'black' }
      }
    });

    this.githubMessage = blessed.box({
      bottom: 0,
      height: 1,
      width: '100%',
      content: '{center}{gray-fg}Please consider giving us a GitHub star *{/gray-fg} {yellow-fg}github.com/paulpreibisch/agentvibes{/yellow-fg}{/center}',
      tags: true,
      style: { fg: 'white' }
    });

    this.screen.append(title);
    this.screen.append(headerBar);
    this.screen.append(this.tabBar);
    this.screen.append(this.voicesContainer);
    this.screen.append(this.musicContainer);
    this.screen.append(this.statusBar);
    this.screen.append(this.helpBar);
    this.screen.append(this.githubMessage);

    this.updateTabBar();
    this.updateMusicList();

    this.updateList();
    this.list.focus();
    this.setupKeys();
    this.screen.render();
  }

  updateList() {
    const items = this.filteredData.map(row => this.formatRow(row));
    this.list.setItems(items);
    this.list.select(Math.min(this.currentRow, items.length - 1));

    const modeLabel = this.favoritesOnly ? ' + Thumbs Up ' : ' Voices ';
    this.list.setLabel(`${modeLabel}(${this.filteredData.length}) - Model (${this.uniqueModels}) - Sort: ${this.sortColumn} ${this.sortAsc ? '↑' : '↓'} `);
    this.updateInfo();
  }

  updateInfo() {
    const idx = this.list.selected;
    if (idx < 0 || idx >= this.filteredData.length) return;

    const row = this.filteredData[idx];
    let info = `{bold}${row.type === 'curated' ? row.name : 'Speaker ' + row.id}{/bold}\n`;
    info += `{gray-fg}${'─'.repeat(20)}{/gray-fg}\n\n`;
    if (this.thumbsUp.has(row.id)) info += '{green-fg}+ Thumbs Up{/green-fg}\n\n';
    else if (this.thumbsDown.has(row.id)) info += '{red-fg}- Thumbs Down{/red-fg}\n\n';
    info += `{cyan-fg}ID:{/cyan-fg} ${row.id}\n`;

    // Color gender value: blue for male, pink for female
    const genderColor = row.gender === 'male' ? 'blue-fg' : 'magenta-fg';
    info += `{cyan-fg}Gender:{/cyan-fg} {${genderColor}}${row.gender}{/${genderColor}}\n`;

    info += `{cyan-fg}Voice:{/cyan-fg} ${row.name}\n`;
    info += `{cyan-fg}Provider:{/cyan-fg} {green-fg}${row.provider}{/green-fg}\n`;
    info += `{cyan-fg}Language:{/cyan-fg} ${row.language}\n`;

    // Color model in yellow
    info += `{cyan-fg}Model:{/cyan-fg} {yellow-fg}${row.model}{/yellow-fg}\n`;

    if (row.type === 'curated' && row.friendlyName) {
      info += `{cyan-fg}Friendly:{/cyan-fg} ${row.friendlyName}\n`;
    }

    // Color sample text in green - use voice-specific sample
    const voiceSample = row.sampleText || this.sampleText;
    info += `\n{gray-fg}Sample:{/gray-fg}\n{green-fg}"${voiceSample}"{/green-fg}\n`;

    info += `\n{cyan-fg}Position:{/cyan-fg} ${idx + 1}/${this.filteredData.length}\n`;
    info += `{green-fg}Thumbs Up:{/green-fg} ${this.thumbsUp.size}  {red-fg}Thumbs Down:{/red-fg} ${this.thumbsDown.size}\n\n`;
    info += `{green-fg}[I]{/green-fg} Install voice  {cyan-fg}[P]{/cyan-fg} Copy prompt`;

    this.infoPanel.setContent(info);
    this.screen.render();
  }

  updateTabBar() {
    const voicesTab = this.currentTab === 'voices'
      ? '{black-bg}{magenta-fg}[V]{/magenta-fg} {cyan-fg}Voices{/cyan-fg}{/black-bg}'
      : '{gray-fg}[V] Voices{/gray-fg}';
    const musicTab = this.currentTab === 'music'
      ? '{black-bg}{red-fg}[B]{/red-fg} {cyan-fg}🎶 Background Music{/cyan-fg}{/black-bg}'
      : '{gray-fg}[B] 🎶 Background Music{/gray-fg}';

    this.tabBar.setContent(`  ${voicesTab}  │  ${musicTab}`);
    this.screen.render();
  }

  switchTab(tab) {
    this.currentTab = tab;

    if (tab === 'voices') {
      this.voicesContainer.show();
      this.musicContainer.hide();
      this.list.focus();
    } else {
      this.voicesContainer.hide();
      this.musicContainer.show();
      this.musicList.focus();
    }

    this.updateTabBar();
    this.screen.render();
  }

  updateMusicList() {
    const items = this.musicTracks.map(track => {
      const isCurrent = track.file === this.currentMusicSelection;
      const isFavorite = this.musicFavorites.has(track.file);
      const isEnabled = this.musicEnabled ? '🔊' : '🔇';
      const marker = isCurrent ? `{cyan-fg}▶{/cyan-fg}` : ' ';
      const favMarker = isFavorite ? '+' : ' ';
      return `${marker}${favMarker} ${track.name}  ${isCurrent ? isEnabled : ''}`;
    });

    this.musicList.setItems(items);

    // Update music info
    this.updateMusicInfo();
  }

  updateMusicInfo() {
    const enabledText = this.musicEnabled ? '{green-fg}Enabled{/green-fg}' : '{red-fg}Disabled{/red-fg}';
    const currentTrack = this.currentMusicSelection
      ? this.musicTracks.find(t => t.file === this.currentMusicSelection)?.name || 'None'
      : 'None';

    let content = '{cyan-fg}{bold}Background Music{/bold}{/cyan-fg}\n\n';
    content += `Status: ${enabledText}\n\n`;
    content += `Current Track:\n{yellow-fg}${currentTrack}{/yellow-fg}\n\n`;
    content += '{gray-fg}Controls:{/gray-fg}\n';
    content += '{cyan-fg}Space{/cyan-fg} - Preview track\n';
    content += '{cyan-fg}Enter{/cyan-fg} - Select track\n';
    content += '{cyan-fg}F/*{/cyan-fg} - Favorite\n';
    content += '{cyan-fg}M{/cyan-fg} - Toggle on/off\n';
    content += '{cyan-fg}R{/cyan-fg} - Toggle reverb\n';
    content += '{cyan-fg}T{/cyan-fg} - Switch tabs\n\n';
    content += `{gray-fg}Total Tracks: {/gray-fg}{white-fg}${this.musicTracks.length}{/white-fg}`;

    this.musicInfo.setContent(content);
  }

  setupKeys() {
    this.screen.key(['q', 'Q', 'C-c'], () => this.exit());

    // Tab switching
    this.screen.key(['t', 'T'], () => {
      const newTab = this.currentTab === 'voices' ? 'music' : 'voices';
      this.switchTab(newTab);
    });

    // Tab bar click handling
    this.tabBar.on('click', (data) => {
      const x = data.x;
      // "[V] Voices" is at position 2-12 (approx)
      // "[B] 🎶 Background Music" starts around position 15+
      if (x < 15) {
        // Clicked on Voices tab
        if (this.currentTab !== 'voices') {
          this.switchTab('voices');
        }
      } else {
        // Clicked on Background Music tab
        if (this.currentTab !== 'music') {
          this.switchTab('music');
        }
      }
    });

    // Listen to selection changes (blessed handles arrow keys automatically)
    this.list.on('select', () => {
      this.updateInfo();
    });

    // Double-click to play voice
    let lastClickTime = 0;
    this.list.on('click', async () => {
      const now = Date.now();
      if (now - lastClickTime < 400) {
        // Double-click detected
        const row = this.filteredData[this.list.selected];
        if (row) await this.playSample(row);
        lastClickTime = 0; // Reset to prevent triple-click
      } else {
        lastClickTime = now;
      }
    });

    // Double-click column header to sort
    let lastHeaderClickTime = 0;
    let lastHeaderClickX = 0;
    this.tableHeader.on('click', (data) => {
      const now = Date.now();
      const x = data.x;

      if (now - lastHeaderClickTime < 400 && Math.abs(x - lastHeaderClickX) < 3) {
        // Double-click detected on same column
        let newSortColumn = this.sortColumn;

        // Map x position to column (accounting for border offset)
        // "   ID   G  Name          Provider Lang   Model          "
        if (x < 8) {
          newSortColumn = 'id';
        } else if (x < 11) {
          newSortColumn = 'gender';
        } else if (x < 25) {
          newSortColumn = 'name';
        } else if (x < 34) {
          newSortColumn = 'provider';
        } else if (x < 41) {
          newSortColumn = 'language';
        } else {
          newSortColumn = 'model';
        }

        // Toggle sort direction if same column, otherwise ascending
        if (newSortColumn === this.sortColumn) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortColumn = newSortColumn;
          this.sortAsc = true;
        }

        this.applyFilter();
        this.updateList();

        lastHeaderClickTime = 0; // Reset to prevent triple-click
      } else {
        lastHeaderClickTime = now;
        lastHeaderClickX = x;
      }
    });

    // Sorting
    this.screen.key(['1'], () => { this.sortColumn = 'id'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['2'], () => { this.sortColumn = 'gender'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['3'], () => { this.sortColumn = 'name'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['4'], () => { this.sortColumn = 'provider'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['5'], () => { this.sortColumn = 'language'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['6'], () => { this.sortColumn = 'model'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });

    // Search
    this.screen.key(['/'], () => this.showSearch());

    // Play
    this.list.key(['space'], async () => {
      const row = this.filteredData[this.list.selected];
      if (row) await this.playSample(row);
    });

    // Reverb toggle (on voices tab)
    this.list.key(['r', 'R'], async () => {
      if (this.currentTab === 'voices') {
        await this.toggleReverb();
      }
    });

    // Thumbs up (* or +) — toggle, clears thumbs down
    this.list.key(['*', '+'], async () => {
      const row = this.filteredData[this.list.selected];
      if (row) {
        if (this.thumbsUp.has(row.id)) {
          this.thumbsUp.delete(row.id);
          this.statusBar.setContent('{yellow-fg}Removed thumbs up{/yellow-fg}');
        } else {
          this.thumbsUp.add(row.id);
          this.thumbsDown.delete(row.id);
          this.statusBar.setContent('{green-fg}Thumbs up +{/green-fg}');
        }
        await this.saveProgress();
        this.updateList();
      }
    });

    // Thumbs down (-) — toggle, clears thumbs up
    this.list.key(['-'], async () => {
      const row = this.filteredData[this.list.selected];
      if (row) {
        if (this.thumbsDown.has(row.id)) {
          this.thumbsDown.delete(row.id);
          this.statusBar.setContent('{yellow-fg}Removed thumbs down{/yellow-fg}');
        } else {
          this.thumbsDown.add(row.id);
          this.thumbsUp.delete(row.id);
          this.statusBar.setContent('{red-fg}Thumbs down -{/red-fg}');
        }
        await this.saveProgress();
        this.updateList();
      }
    });

    // Install/Select voice for AgentVibes
    this.screen.key(['i', 'I'], () => this.installVoice());

    // Toggle favorites filter
    this.screen.key(['f', 'F'], () => {
      this.favoritesOnly = !this.favoritesOnly;
      this.applyFilter();
      this.updateList();

      if (this.favoritesOnly) {
        this.statusBar.setContent(`{green-fg}+ Showing ${this.filteredData.length} thumbs-up voices - Press [F] or [X] to show all{/green-fg}`);
      } else {
        this.statusBar.setContent(`{cyan-fg}Showing all voices - Press [F] to filter thumbs-up{/cyan-fg}`);
      }
      this.screen.render();
    });

    // Exit favorites filter with X
    this.screen.key(['x', 'X'], () => {
      if (this.favoritesOnly) {
        this.favoritesOnly = false;
        this.applyFilter();
        this.updateList();
        this.statusBar.setContent(`{cyan-fg}Showing all voices - Press [F] to filter thumbs-up{/cyan-fg}`);
        this.screen.render();
      }
    });

    // Export
    this.screen.key(['e', 'E'], () => this.exportFavorites());

    // Navigation: Page Down
    this.list.key(['pagedown'], () => {
      const pageSize = Math.floor(this.list.height / 2);
      const newIndex = Math.min(this.list.selected + pageSize, this.filteredData.length - 1);
      this.list.select(newIndex);
      this.screen.render();
    });

    // Navigation: Page Up
    this.list.key(['pageup'], () => {
      const pageSize = Math.floor(this.list.height / 2);
      const newIndex = Math.max(this.list.selected - pageSize, 0);
      this.list.select(newIndex);
      this.screen.render();
    });

    // Navigation: Home (go to top)
    this.list.key(['home'], () => {
      this.list.select(0);
      this.screen.render();
    });

    // Navigation: End (go to bottom)
    this.list.key(['end'], () => {
      if (this.filteredData.length > 0) {
        this.list.select(this.filteredData.length - 1);
        this.screen.render();
      }
    });

    // Provider filter toggle
    this.screen.key(['l', 'L'], () => this.showProviderFilter());

    // Voice prompt — copy-pasteable AgentVibes instructions
    this.list.key(['p', 'P'], () => this.showVoicePrompt());

    // Music tab controls
    this.musicList.key(['space'], async () => {
      if (this.currentTab !== 'music') return;
      const selected = this.musicList.selected;
      if (selected >= 0 && selected < this.musicTracks.length) {
        const selectedTrack = this.musicTracks[selected];

        // If this track is already playing, stop it
        if (this.currentlyPlayingTrack && this.currentlyPlayingTrack.file === selectedTrack.file) {
          this.stopMusic();
        } else {
          // Otherwise, play the new track
          await this.previewMusic(selectedTrack);
        }
      }
    });

    this.musicList.key(['enter'], async () => {
      if (this.currentTab !== 'music') return;
      const selected = this.musicList.selected;
      if (selected >= 0 && selected < this.musicTracks.length) {
        await this.selectMusic(this.musicTracks[selected]);
      }
    });

    this.musicList.key(['m', 'M'], async () => {
      if (this.currentTab !== 'music') return;
      await this.toggleMusic();
    });

    this.musicList.key(['r', 'R'], async () => {
      if (this.currentTab !== 'music') return;
      await this.toggleReverb();
    });

    // Favorite music track (thumbs up)
    this.musicList.key(['f', 'F', '*', '+'], async () => {
      if (this.currentTab !== 'music') return;
      const selected = this.musicList.selected;
      if (selected >= 0 && selected < this.musicTracks.length) {
        const track = this.musicTracks[selected];
        if (this.musicFavorites.has(track.file)) {
          this.musicFavorites.delete(track.file);
          this.statusBar.setContent('{yellow-fg}Removed from favorites{/yellow-fg}');
        } else {
          this.musicFavorites.add(track.file);
          this.statusBar.setContent('{green-fg}Thumbs up +{/green-fg}');
        }
        await this.saveProgress();
        this.updateMusicList();
        this.screen.render();
      }
    });
  }

  showVoicePrompt() {
    const row = this.filteredData[this.list.selected];
    if (!row) return;

    // Build copy-pasteable AgentVibes instructions per voice type
    let lines = [];
    let subtitle = '';

    switch (row.type) {
      case 'curated': {
        const switchName = row.friendlyName || row.piperVoiceId || row.model;
        subtitle = `Piper curated voice`;
        lines = [
          `# Switch to: ${row.name}`,
          ``,
          `# If piper is already your active provider:`,
          `/agent-vibes:switch ${switchName}`,
          ``,
          `# If switching from another provider first:`,
          `/agent-vibes:provider switch piper`,
          `/agent-vibes:switch ${switchName}`,
        ];
        break;
      }
      case 'libritts': {
        const speakerId = row.originalId;
        const safeName = row.name.replace(/\s+/g, '_');
        const modelFile = path.basename(CONFIG.MODEL_PATH, '.onnx');
        subtitle = `LibriTTS multi-speaker — speaker ID ${speakerId}`;
        lines = [
          `# Use LibriTTS Speaker ${speakerId}: ${row.name}`,
          ``,
          `# Step 1 — Download the model (skip if already downloaded):`,
          `bash .claude/hooks/piper-voice-manager.sh download ${modelFile}`,
          ``,
          `# Step 2 — Register speaker in piper-multispeaker-registry.sh:`,
          `# Add this line to the MULTISPEAKER_VOICES array:`,
          `  "${safeName}:${modelFile}:${speakerId}:LibriTTS Speaker"`,
          ``,
          `# Step 3 — Switch AgentVibes to this voice:`,
          `/agent-vibes:switch ${safeName}`,
        ];
        break;
      }
      case 'macos': {
        subtitle = `macOS built-in voice`;
        lines = [
          `# Switch to macOS voice: ${row.name}`,
          ``,
          `# Step 1 — Switch provider to macOS:`,
          `/agent-vibes:provider switch macos`,
          ``,
          `# Step 2 — Switch to this voice:`,
          `/agent-vibes:switch ${row.name}`,
        ];
        break;
      }
      case 'windows-sapi': {
        subtitle = `Windows SAPI built-in voice`;
        lines = [
          `# Switch to Windows SAPI voice: ${row.name}`,
          ``,
          `# Step 1 — Switch provider to Windows SAPI:`,
          `/agent-vibes:provider switch windows-sapi`,
          ``,
          `# Step 2 — Switch to this voice:`,
          `/agent-vibes:switch ${row.name}`,
        ];
        break;
      }
      case 'soprano': {
        subtitle = `Soprano neural TTS — single voice`;
        lines = [
          `# Switch to Soprano TTS`,
          ``,
          `/agent-vibes:provider switch soprano`,
          ``,
          `# Soprano has one built-in voice — no voice selection needed.`,
        ];
        break;
      }
      default: {
        subtitle = row.provider;
        lines = [
          `# Switch to: ${row.name}`,
          `/agent-vibes:switch ${row.name}`,
        ];
      }
    }

    const promptText = lines.join('\n');
    const contentHeight = lines.length + 8;
    const boxHeight = Math.min(contentHeight, Math.floor(this.screen.height * 0.8));

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: boxHeight,
      border: { type: 'line', fg: 'green' },
      label: ` [P] Prompt — ${row.name} `,
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      padding: 1,
      style: {
        border: { fg: 'green' },
        bg: 'black',
        fg: 'white'
      }
    });

    let content = `{yellow-fg}{bold}${row.name}{/bold}{/yellow-fg}  {gray-fg}${subtitle}{/gray-fg}\n\n`;
    content += `{gray-fg}Copy and paste these commands into your terminal or Claude session:{/gray-fg}\n\n`;
    content += `{green-fg}${lines.join('\n')}{/green-fg}\n\n`;
    content += `{gray-fg}─────────────────────────────────────────────────────────────{/gray-fg}\n`;
    content += `{gray-fg}[Esc/Q] Close  [↑↓] Scroll{/gray-fg}`;

    modal.setContent(content);

    // Try to copy to clipboard (best-effort, silent on failure)
    const clipboardCmds = [
      ['xclip', ['-selection', 'clipboard']],
      ['xsel', ['--clipboard', '--input']],
      ['pbcopy', []]
    ];
    for (const [cmd, args] of clipboardCmds) {
      try {
        const proc = spawnSync('which', [cmd], { encoding: 'utf8', timeout: 500 });
        if (proc.status === 0) {
          const cp = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
          cp.stdin.write(promptText);
          cp.stdin.end();
          // Update status bar to let user know
          this.statusBar.setContent(`{green-fg}✓ Prompt copied to clipboard via ${cmd}{/green-fg}`);
          break;
        }
      } catch {
        // Silently skip
      }
    }

    modal.key(['escape', 'q', 'Q'], () => {
      this.screen.remove(modal);
      this.list.focus();
      this.screen.render();
    });

    modal.focus();
    this.screen.render();
  }

  showProviderFilter() {
    // Get unique providers from tableData
    const providers = [...new Set(this.tableData.map(row => row.provider))].sort();

    const menu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: Math.min(providers.length + 4, 15),
      border: { type: 'line', fg: 'cyan' },
      label: ' Filter by Provider ',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: { bg: 'cyan', fg: 'black' },
        border: { fg: 'cyan' }
      }
    });

    const items = ['All Providers', ...providers];
    menu.setItems(items);

    // Select current filter
    if (this.providerFilter) {
      const index = items.indexOf(this.providerFilter);
      if (index >= 0) menu.select(index);
    }

    menu.on('select', (item, index) => {
      if (index === 0) {
        // All Providers
        this.providerFilter = null;
        this.statusBar.setContent(`{cyan-fg}Showing all providers - Press [P] to filter{/cyan-fg}`);
      } else {
        // Specific provider
        this.providerFilter = item.getText();
        this.statusBar.setContent(`{cyan-fg}Showing ${this.providerFilter} only - Press [P] to change{/cyan-fg}`);
      }

      this.applyFilter();
      this.updateList();
      this.screen.remove(menu);
      this.list.focus();
      this.screen.render();
    });

    menu.key(['escape'], () => {
      this.screen.remove(menu);
      this.list.focus();
      this.screen.render();
    });

    menu.focus();
    this.screen.render();
  }

  stopMusic() {
    // Kill existing audio process if any
    if (this.currentAudioProcess) {
      try {
        this.currentAudioProcess.kill('SIGKILL');
        this.currentAudioProcess = null;
        this.currentlyPlayingTrack = null;
      } catch (error) {}
    }

    this.statusBar.setContent(`{yellow-fg}⏹ Stopped playback{/yellow-fg}`);
    this.screen.render();
  }

  async previewMusic(track) {
    // Kill existing audio process if any
    if (this.currentAudioProcess) {
      try {
        this.currentAudioProcess.kill('SIGKILL');
        this.currentAudioProcess = null;
      } catch (error) {}
    }

    const trackPath = track.path;
    this.currentlyPlayingTrack = track;

    this.statusBar.setContent(`{cyan-fg}▶ Playing: ${track.name}...{/cyan-fg}`);
    this.screen.render();

    // Try different audio players
    const players = [
      { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-t', '15', trackPath] },
      { cmd: 'mpg123', args: ['-q', '--loop', '1', trackPath] },
      { cmd: 'afplay', args: [trackPath] }
    ];

    for (const player of players) {
      try {
        // SECURITY: Use spawnSync instead of shell string (#126)
          if (spawnSync('which', [player.cmd], { stdio: 'ignore' }).status !== 0) throw new Error('not found');

        const audioProcess = spawn(player.cmd, player.args, { stdio: 'ignore' });
        this.currentAudioProcess = audioProcess;

        audioProcess.on('close', () => {
          if (this.currentAudioProcess === audioProcess) {
            this.currentAudioProcess = null;
            this.currentlyPlayingTrack = null;
          }
          this.statusBar.setContent(`{green-fg}✓ Playback complete{/green-fg}`);
          this.screen.render();
        });

        audioProcess.on('error', (err) => {
          if (this.currentAudioProcess === audioProcess) {
            this.currentAudioProcess = null;
            this.currentlyPlayingTrack = null;
          }
          this.statusBar.setContent(`{red-fg}✗ Error playing track{/red-fg}`);
          this.screen.render();
        });

        break;
      } catch (error) {
        continue;
      }
    }
  }

  async selectMusic(track) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.claude', 'config');
    const musicConfigFile = path.join(configDir, 'background-music.txt');

    try {
      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true, mode: 0o700 });

      await fs.writeFile(musicConfigFile, track.file, { mode: 0o600 });
      this.currentMusicSelection = track.file;
      this.updateMusicList();
      this.statusBar.setContent(`{green-fg}✓ Selected: ${track.name}{/green-fg}`);
      this.screen.render();
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error selecting track: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async toggleMusic() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.claude', 'config');
    const musicEnabledFile = path.join(configDir, 'background-music-enabled.txt');

    try {
      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true, mode: 0o700 });

      this.musicEnabled = !this.musicEnabled;
      await fs.writeFile(musicEnabledFile, this.musicEnabled ? 'true' : 'false', { mode: 0o600 });
      this.updateMusicList();
      this.updateMusicInfo();

      const status = this.musicEnabled ? 'Enabled' : 'Disabled';
      this.statusBar.setContent(`{green-fg}✓ Background Music ${status}{/green-fg}`);
      this.screen.render();
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error toggling music: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async toggleReverb() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.claude', 'config');
    const audioEffectsPath = path.join(configDir, 'audio-effects.cfg');

    try {
      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true, mode: 0o700 });

      // Read current reverb setting
      let content = '';
      try {
        content = await fs.readFile(audioEffectsPath, 'utf8');
      } catch {
        content = 'REVERB_ENABLED=false\nREVERB_LEVEL=medium\n';
      }

      // Toggle reverb
      const currentEnabled = content.includes('REVERB_ENABLED=true');
      const newEnabled = !currentEnabled;

      content = content.replace(
        /REVERB_ENABLED=(true|false)/,
        `REVERB_ENABLED=${newEnabled}`
      );

      await fs.writeFile(audioEffectsPath, content, { mode: 0o600 });

      const status = newEnabled ? 'Enabled' : 'Disabled';
      this.statusBar.setContent(`{green-fg}✓ Reverb ${status}{/green-fg}`);
      this.screen.render();
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error toggling reverb: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  showSearch() {
    const searchBox = blessed.textbox({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 3,
      border: { type: 'line', fg: 'cyan' },
      label: ' Search ',
      inputOnFocus: true
    });

    searchBox.on('submit', (value) => {
      this.searchTerm = value.trim();
      this.applyFilter();
      this.updateList();
      this.screen.remove(searchBox);
      this.list.focus();
      this.statusBar.setContent(`{cyan-fg}Search: "${this.searchTerm}" - ${this.filteredData.length} results{/cyan-fg}`);
      this.screen.render();
    });

    searchBox.key(['escape'], () => {
      this.screen.remove(searchBox);
      this.list.focus();
      this.screen.render();
    });

    searchBox.focus();
    this.screen.render();
  }

  _getActiveProvider() {
    const remoteProviders = ['ssh-remote', 'agentvibes-receiver'];
    try {
      const providerPaths = [
        path.join(process.cwd(), '.claude', 'tts-provider.txt'),
        path.join(os.homedir(), '.claude', 'tts-provider.txt'),
      ];
      for (const p of providerPaths) {
        if (fsSync.existsSync(p)) {
          const provider = fsSync.readFileSync(p, 'utf8').trim();
          if (provider) return { provider, isRemote: remoteProviders.includes(provider) };
        }
      }
    } catch {}
    return { provider: 'piper', isRemote: false };
  }

  async playSample(row) {
    if (this.currentAudioProcess) {
      try {
        this.currentAudioProcess.kill('SIGKILL');
        this.currentAudioProcess = null;
      } catch (error) {
        // Process might have already finished
      }
    }

    this.statusBar.setContent(`{cyan-fg}Playing ${row.name}...{/cyan-fg}`);
    this.screen.render();

    // Use voice-specific sample text
    const sampleText = row.sampleText || this.sampleText;

    // Route through remote provider if active
    const { isRemote } = this._getActiveProvider();
    if (isRemote) {
      return await this._playRemote(row, sampleText);
    }

    // Handle different providers
    switch (row.type) {
      case 'macos':
        return await this.playMacOSVoice(row, sampleText);
      case 'windows-sapi':
        return await this.playWindowsSAPIVoice(row, sampleText);
      case 'soprano':
        return await this.playSopranoVoice(row, sampleText);
      default:
        return await this.playPiperVoice(row, sampleText);
    }
  }

  async _playRemote(row, sampleText) {
    // Build voice ID for play-tts.sh
    let voiceId;
    if (row.type === 'curated') {
      voiceId = row.piperVoiceId || row.model;
    } else {
      // LibriTTS multi-speaker: pass as model::SpeakerName-ID
      voiceId = `en_US-libritts-high::${row.name}-${row.id}`;
    }

    const isWindows = process.platform === 'win32' && !process.env.WSL_DISTRO_NAME;
    try {
      let proc;
      if (isWindows) {
        const playTts = path.join(__dirname, '..', '.claude', 'hooks-windows', 'play-tts.ps1');
        proc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', playTts, sampleText, voiceId], {
          stdio: 'ignore', detached: false, windowsHide: true,
        });
      } else {
        const playTts = path.join(__dirname, '..', '.claude', 'hooks', 'play-tts.sh');
        proc = spawn('bash', [playTts, sampleText, voiceId], {
          stdio: 'ignore', detached: true,
        });
      }
      this.currentAudioProcess = proc;

      this.statusBar.setContent(`{cyan-fg}Playing ${row.name} (remote)...{/cyan-fg}`);
      this.screen.render();

      proc.on('close', () => {
        if (this.currentAudioProcess === proc) this.currentAudioProcess = null;
        this.statusBar.setContent(`{green-fg}✓ Played ${row.name}{/green-fg}`);
        this.screen.render();
      });

      proc.on('error', () => {
        if (this.currentAudioProcess === proc) this.currentAudioProcess = null;
        this.statusBar.setContent(`{red-fg}✗ Remote preview failed{/red-fg}`);
        this.screen.render();
      });
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async playMacOSVoice(row, sampleText) {
    try {
      const process = spawn('say', ['-v', row.name, sampleText], { stdio: 'ignore' });
      this.currentAudioProcess = process;

      process.on('close', () => {
        if (this.currentAudioProcess === process) {
          this.currentAudioProcess = null;
        }
        this.statusBar.setContent(`{green-fg}✓ Played ${row.name}{/green-fg}`);
        this.screen.render();
      });

      process.on('error', (err) => {
        if (this.currentAudioProcess === process) {
          this.currentAudioProcess = null;
        }
        this.statusBar.setContent(`{red-fg}✗ Error playing voice{/red-fg}`);
        this.screen.render();
      });
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async playWindowsSAPIVoice(row, sampleText) {
    try {
      // SECURITY: Escape row.name and sampleText for PowerShell single-quote context (#124)
      const safeName = row.name.replace(/'/g, "''");
      const safeText = sampleText.replace(/'/g, "''");
      const psScript = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SelectVoice('${safeName}'); $synth.Speak('${safeText}')`;
      const process = spawn('powershell', ['-Command', psScript], { stdio: 'ignore' });
      this.currentAudioProcess = process;

      process.on('close', () => {
        if (this.currentAudioProcess === process) {
          this.currentAudioProcess = null;
        }
        this.statusBar.setContent(`{green-fg}✓ Played ${row.name}{/green-fg}`);
        this.screen.render();
      });

      process.on('error', (err) => {
        if (this.currentAudioProcess === process) {
          this.currentAudioProcess = null;
        }
        this.statusBar.setContent(`{red-fg}✗ Error playing voice{/red-fg}`);
        this.screen.render();
      });
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async playSopranoVoice(row, sampleText) {
    try {
      // Soprano uses OpenAI API format
      const outputFile = path.join(CONFIG.OUTPUT_DIR, `soprano_${row.name.toLowerCase()}_${Date.now()}.wav`);

      // Create JSON payload file to avoid shell escaping issues
      const payloadFile = path.join(CONFIG.OUTPUT_DIR, `soprano_payload_${Date.now()}.json`);
      const payload = {
        input: sampleText,
        model: 'tts-1',
        voice: row.name.toLowerCase() // API expects lowercase voice names
      };
      await fs.writeFile(payloadFile, JSON.stringify(payload));

      // SECURITY: Use spawn with argument array instead of shell string (#125)
      await new Promise((resolve, reject) => {
        const curlProc = spawn('curl', [
          '-s', '-m', '10', '-X', 'POST',
          'http://127.0.0.1:7860/v1/audio/speech',
          '-H', 'Content-Type: application/json',
          '-d', `@${payloadFile}`,
          '-o', outputFile
        ], { stdio: 'ignore' });
        curlProc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`curl exited ${code}`)));
        curlProc.on('error', reject);
      });

      // Clean up payload file
      try {
        await fs.unlink(payloadFile);
      } catch {}

      // Play the generated audio
      const players = [
        { cmd: 'aplay', args: [outputFile] },
        { cmd: 'paplay', args: [outputFile] },
        { cmd: 'ffplay', args: ['-nodisp', '-autoexit', outputFile] }
      ];

      for (const player of players) {
        try {
          // SECURITY: Use spawnSync instead of shell string (#126)
          if (spawnSync('which', [player.cmd], { stdio: 'ignore' }).status !== 0) throw new Error('not found');

          const audioProcess = spawn(player.cmd, player.args, { stdio: 'ignore' });
          this.currentAudioProcess = audioProcess;

          audioProcess.on('close', async () => {
            if (this.currentAudioProcess === audioProcess) {
              this.currentAudioProcess = null;
            }
            // Clean up temp file
            try {
              await fs.unlink(outputFile);
            } catch {}
            this.statusBar.setContent(`{green-fg}✓ Played ${row.name}{/green-fg}`);
            this.screen.render();
          });

          audioProcess.on('error', (err) => {
            if (this.currentAudioProcess === audioProcess) {
              this.currentAudioProcess = null;
            }
            this.statusBar.setContent(`{red-fg}✗ Error playing voice{/red-fg}`);
            this.screen.render();
          });

          break;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error with Soprano: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async playPiperVoice(row, sampleText) {
    // Sanitize sampleText to prevent command injection
    const safeSampleText = sampleText.replace(/[`$\\!"]/g, '\\$&');

    // Generate unique filename based on sample text hash to support different samples
    const textHash = sampleText.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');

    let outputFile;
    if (row.type === 'curated') {
      // Validate model name to prevent path traversal
      const safeModel = path.basename(row.model);
      if (safeModel !== row.model || /[^a-zA-Z0-9_-]/.test(safeModel)) {
        this.statusBar.setContent(`{red-fg}✗ Invalid model name{/red-fg}`);
        this.screen.render();
        return;
      }

      outputFile = path.join(CONFIG.CURATED_DIR, `${safeModel}_${textHash}.wav`);

      // Verify output path stays within intended directory
      const resolvedOutput = path.resolve(outputFile);
      const resolvedDir = path.resolve(CONFIG.CURATED_DIR);
      if (!resolvedOutput.startsWith(resolvedDir + path.sep)) {
        this.statusBar.setContent(`{red-fg}✗ Invalid output path{/red-fg}`);
        this.screen.render();
        return;
      }

      const modelPath = path.join(CONFIG.PIPER_VOICES_DIR, `${safeModel}.onnx`);
      // SECURITY: Always regenerate instead of TOCTOU check (#132)
      {
        const piperProcess = spawn(CONFIG.PIPER_PATH, [
          '--model', modelPath,
          '--output_file', outputFile
        ], { stdio: ['pipe', 'ignore', 'ignore'] });

        piperProcess.stdin.write(safeSampleText);
        piperProcess.stdin.end();

        await new Promise((resolve, reject) => {
          piperProcess.on('close', code => code === 0 ? resolve() : reject(new Error(`Piper exit ${code}`)));
          piperProcess.on('error', reject);
        });
      }
    } else {
      // Validate speaker ID is numeric
      if (!Number.isInteger(row.id) || row.id < 0) {
        this.statusBar.setContent(`{red-fg}✗ Invalid speaker ID{/red-fg}`);
        this.screen.render();
        return;
      }

      outputFile = path.join(CONFIG.OUTPUT_DIR, `speaker_${row.id}_${textHash}.wav`);

      // Verify output path stays within intended directory
      const resolvedOutput = path.resolve(outputFile);
      const resolvedDir = path.resolve(CONFIG.OUTPUT_DIR);
      if (!resolvedOutput.startsWith(resolvedDir + path.sep)) {
        this.statusBar.setContent(`{red-fg}✗ Invalid output path{/red-fg}`);
        this.screen.render();
        return;
      }

      // SECURITY: Always regenerate instead of TOCTOU check (#132)
      {
        const piperProcess = spawn(CONFIG.PIPER_PATH, [
          '--model', CONFIG.MODEL_PATH,
          '--speaker', row.id.toString(),
          '--output_file', outputFile
        ], { stdio: ['pipe', 'ignore', 'ignore'] });

        piperProcess.stdin.write(safeSampleText);
        piperProcess.stdin.end();

        await new Promise((resolve, reject) => {
          piperProcess.on('close', code => code === 0 ? resolve() : reject(new Error(`Piper exit ${code}`)));
          piperProcess.on('error', reject);
        });
      }
    }

    const players = [
      { cmd: 'aplay', args: [outputFile] },
      { cmd: 'paplay', args: [outputFile] },
      { cmd: 'ffplay', args: ['-nodisp', '-autoexit', outputFile] }
    ];

    for (const player of players) {
      try {
        // SECURITY: Use spawnSync instead of shell string (#126)
          if (spawnSync('which', [player.cmd], { stdio: 'ignore' }).status !== 0) throw new Error('not found');

        // SECURITY: Store process immediately to prevent leak
        const audioProcess = spawn(player.cmd, player.args, { stdio: 'ignore' });
        this.currentAudioProcess = audioProcess;

        audioProcess.on('close', () => {
          if (this.currentAudioProcess === audioProcess) {
            this.currentAudioProcess = null;
          }
          this.statusBar.setContent(`{green-fg}✓ Played ${row.name}{/green-fg}`);
          this.screen.render();
        });

        audioProcess.on('error', (err) => {
          if (this.currentAudioProcess === audioProcess) {
            this.currentAudioProcess = null;
          }
        });

        break;
      } catch (error) {
        continue;
      }
    }
  }

  async installVoice() {
    const row = this.filteredData[this.list.selected];
    if (!row) return;

    try {
      // Read current config
      let config = {};
      try {
        const configData = await fs.readFile(CONFIG.AGENTVIBES_CONFIG, 'utf8');
        config = JSON.parse(configData);
      } catch (e) {
        // Config doesn't exist yet, will create it
      }

      // Determine the voice ID to save
      let voiceId;
      if (row.type === 'curated' && row.friendlyName) {
        // For curated voices with friendly names, save the friendly name
        // This allows users to reference them easily (e.g., "switch to Ryan")
        voiceId = row.friendlyName;
      } else if (row.type === 'curated') {
        // Fallback to Piper ID if no friendly name
        voiceId = row.piperVoiceId;
      } else {
        // For LibriTTS speakers, save as speaker ID
        voiceId = `libritts-speaker-${row.id}`;
      }

      // SECURITY: Validate voiceId to prevent JSON injection
      if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) {
        this.statusBar.setContent(`{red-fg}✗ Invalid voice ID format{/red-fg}`);
        this.screen.render();
        return;
      }

      // Update config
      config.defaultVoice = voiceId;
      config.ttsProvider = 'piper';

      // Ensure config directory exists with secure permissions
      const configDir = path.dirname(CONFIG.AGENTVIBES_CONFIG);
      await fs.mkdir(configDir, { recursive: true, mode: 0o700 });

      // SECURITY: Atomic write to prevent race condition
      const tempFile = CONFIG.AGENTVIBES_CONFIG + '.tmp.' + Date.now();
      await fs.writeFile(tempFile, JSON.stringify(config, null, 2), { mode: 0o600 });
      await fs.rename(tempFile, CONFIG.AGENTVIBES_CONFIG);

      this.statusBar.setContent(`{green-fg}✓ Installed: ${row.name} → AgentVibes default voice{/green-fg}`);
      this.screen.render();

      // Show confirmation dialog
      setTimeout(() => {
        const confirmBox = blessed.box({
          parent: this.screen,
          top: 'center',
          left: 'center',
          width: 60,
          height: 7,
          border: { type: 'line', fg: 'green' },
          label: ' ✓ Voice Installed ',
          content: `\n{center}${row.name} is now your AgentVibes default voice!{/center}\n\n{center}{gray-fg}Press any key to continue...{/gray-fg}{/center}`,
          tags: true
        });

        this.screen.append(confirmBox);
        this.screen.render();

        const closeDialog = () => {
          this.screen.remove(confirmBox);
          this.list.focus();
          this.screen.render();
          this.screen.unkey(['space'], closeDialog);
          this.screen.unkey(['enter'], closeDialog);
          this.screen.unkey(['escape'], closeDialog);
        };

        this.screen.key(['space', 'enter', 'escape'], closeDialog);
        this.screen.onceKey(['space', 'enter', 'escape'], closeDialog);
      }, 500);

    } catch (error) {
      this.statusBar.setContent(`{red-fg}✗ Error: ${error.message}{/red-fg}`);
      this.screen.render();
    }
  }

  async exportFavorites() {
    const upData = this.tableData.filter(row => this.thumbsUp.has(row.id));
    const downData = this.tableData.filter(row => this.thumbsDown.has(row.id));
    const exportFile = path.join(os.homedir(), 'agentvibes-favorites.json');
    await fs.writeFile(exportFile, JSON.stringify({ thumbsUp: upData, thumbsDown: downData }, null, 2));
    this.statusBar.setContent(`{green-fg}✓ Exported ${upData.length} thumbs-up, ${downData.length} thumbs-down to ${exportFile}{/green-fg}`);
    this.screen.render();
  }

  async exit() {
    await this.saveProgress();
    this.screen.destroy();
    console.log('\n✓ Progress saved. Goodbye!\n');
    process.exit(0);
  }
}

new AgentVibesVoiceBrowser().init().catch(console.error);
