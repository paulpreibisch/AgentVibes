#!/usr/bin/env node

/**
 * AgentVibes Voice Browser
 * Browse and preview 914+ Piper TTS voices
 * Press 'I' to install/select a voice for AgentVibes
 */

import blessed from 'blessed';
import chalk from 'chalk';
import { exec, spawn } from 'child_process';
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
    this.favorites = new Set();
    this.favoritesOnly = false; // Filter to show only favorites
    this.sampleText = CONFIG.SAMPLE_TEXT;
    this.playing = false;
    this.currentAudioProcess = null;
    this.voiceAssignments = null;
    this.voiceMetadata = null;
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
    this.prepareTable();
    this.setupUI();
  }

  async loadProgress() {
    try {
      const data = JSON.parse(await fs.readFile(CONFIG.PROGRESS_FILE, 'utf8'));
      this.favorites = new Set(data.favorites || []);
      this.sampleText = data.sampleText || CONFIG.SAMPLE_TEXT;
      this.sortColumn = data.sortColumn || 'id';
      this.sortAsc = data.sortAsc !== undefined ? data.sortAsc : true;
    } catch (error) {
      // No previous progress
    }
  }

  async saveProgress() {
    await fs.writeFile(CONFIG.PROGRESS_FILE, JSON.stringify({
      favorites: Array.from(this.favorites),
      sampleText: this.sampleText,
      sortColumn: this.sortColumn,
      sortAsc: this.sortAsc
    }, null, 2));
  }

  async loadVoiceData() {
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
  }

  prepareTable() {
    this.tableData = [];

    // Add LibriTTS speakers
    for (let id = 0; id < CONFIG.TOTAL_SPEAKERS; id++) {
      const assignment = this.voiceAssignments.libritts_speakers[id];
      if (assignment) {
        // Assign random sample template with voice name
        const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
        const sampleText = template.replace('{NAME}', assignment.voice_name);

        this.tableData.push({
          id,
          gender: assignment.gender,
          name: assignment.voice_name,
          model: 'LibriTTS',
          type: 'libritts',
          piperVoiceId: `speaker-${id}`,
          sampleText: sampleText
        });
      }
    }

    // Add curated voices
    for (const [id, curated] of Object.entries(this.voiceAssignments.curated_voices)) {
      // Assign random sample template with voice name
      const template = SAMPLE_TEMPLATES[Math.floor(Math.random() * SAMPLE_TEMPLATES.length)];
      const sampleText = template.replace('{NAME}', curated.voice_name);

      this.tableData.push({
        id: parseInt(id),
        gender: curated.gender,
        name: curated.voice_name,
        model: curated.model_file,
        type: 'curated',
        piperVoiceId: curated.model_file,
        friendlyName: curated.friendly_name,
        sampleText: sampleText
      });
    }

    this.applyFilter();
  }

  applyFilter() {
    // Start with all voices or favorites only
    let data = this.favoritesOnly
      ? this.tableData.filter(row => this.favorites.has(row.id))
      : [...this.tableData];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(row =>
        row.id.toString().includes(term) ||
        row.gender.includes(term) ||
        row.name.toLowerCase().includes(term) ||
        row.model.toLowerCase().includes(term)
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
    const fav = this.favorites.has(row.id) ? '⭐' : '  ';
    const genderIcon = row.gender === 'male' ? '♂' : '♀';
    const genderColor = row.gender === 'male' ? 'blue-fg' : 'magenta-fg';
    const gender = `{${genderColor}}${genderIcon}{/${genderColor}}`;
    const id = String(row.id).padStart(4);
    const name = row.name.padEnd(15);
    const model = row.model.substring(0, 25).padEnd(25);
    return `${fav} ${id} ${gender} ${name} ${model}`;
  }

  setupUI() {
    this.screen = blessed.screen({ smartCSR: true, title: 'AgentVibes Voice Browser' });

    // Calculate unique models
    const uniqueModels = new Set(this.tableData.map(row => row.model)).size;
    const totalVoices = this.tableData.length;

    const title = blessed.box({
      top: 0,
      height: 3,
      width: '100%',
      content: `{center}{bold}{cyan-fg}Agent{/cyan-fg} {magenta-fg}Vibes{/magenta-fg} {gray-fg}v1.0{/gray-fg} {yellow-fg}Voice Browser{/yellow-fg} - ${totalVoices} Voices, ${uniqueModels} Models{/bold}{/center}\n{center}{cyan-fg}[1-4]{/cyan-fg}Sort {cyan-fg}[/]{/cyan-fg}Search {cyan-fg}[F/X]{/cyan-fg}Favorites {cyan-fg}[Space]{/cyan-fg}Play {cyan-fg}[*]{/cyan-fg}Fav {cyan-fg}[I]{/cyan-fg}Install {cyan-fg}[Q]{/cyan-fg}Quit{/center}`,
      tags: true,
      style: { fg: 'white' }
    });

    const tableHeader = blessed.box({
      top: 3,
      left: 0,
      height: 1,
      width: '70%',
      content: `   ID   G  Name            Model                    `,
      style: { fg: 'cyan', bold: true }
    });

    this.list = blessed.list({
      top: 4,
      left: 0,
      width: '70%',
      height: '100%-7',
      keys: true,
      vi: true,
      mouse: false,
      tags: true,
      style: {
        selected: { bg: 'blue', fg: 'white', bold: true },
        item: { fg: 'white' }
      },
      border: { type: 'line', fg: 'cyan' },
      label: ` Voices (${this.filteredData.length}) - Sort: ${this.sortColumn} ${this.sortAsc ? '↑' : '↓'} `
    });

    this.infoPanel = blessed.box({
      top: 3,
      left: '70%',
      width: '30%',
      height: '100%-6',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      label: ' Voice Info ',
      scrollable: true
    });

    this.statusBar = blessed.box({
      bottom: 2,
      height: 1,
      width: '100%',
      content: 'Ready',
      tags: true,
      style: { fg: 'green' }
    });

    this.helpBar = blessed.box({
      bottom: 0,
      height: 2,
      width: '100%',
      content: '{cyan-fg}[1-4]{/cyan-fg}Sort {cyan-fg}[/]{/cyan-fg}Search {cyan-fg}[F/X]{/cyan-fg}Favorites {cyan-fg}[Space]{/cyan-fg}Play {cyan-fg}[*]{/cyan-fg}Toggle★ {cyan-fg}[I]{/cyan-fg}Install {cyan-fg}[E]{/cyan-fg}Export',
      tags: true,
      style: { bg: 'black' }
    });

    this.screen.append(title);
    this.screen.append(tableHeader);
    this.screen.append(this.list);
    this.screen.append(this.infoPanel);
    this.screen.append(this.statusBar);
    this.screen.append(this.helpBar);

    this.updateList();
    this.list.focus();
    this.setupKeys();
    this.screen.render();
  }

  updateList() {
    const items = this.filteredData.map(row => this.formatRow(row));
    this.list.setItems(items);
    this.list.select(Math.min(this.currentRow, items.length - 1));

    const modeLabel = this.favoritesOnly ? ' ⭐ Favorites ' : ' Voices ';
    this.list.setLabel(`${modeLabel}(${this.filteredData.length}) - Sort: ${this.sortColumn} ${this.sortAsc ? '↑' : '↓'} `);
    this.updateInfo();
  }

  updateInfo() {
    const idx = this.list.selected;
    if (idx < 0 || idx >= this.filteredData.length) return;

    const row = this.filteredData[idx];
    let info = `{bold}${row.type === 'curated' ? row.name : 'Speaker ' + row.id}{/bold}\n`;
    info += `{gray-fg}${'─'.repeat(20)}{/gray-fg}\n\n`;
    if (this.favorites.has(row.id)) info += '{yellow-fg}⭐ Favorite{/yellow-fg}\n\n';
    info += `{cyan-fg}ID:{/cyan-fg} ${row.id}\n`;

    // Color gender value: blue for male, pink for female
    const genderColor = row.gender === 'male' ? 'blue-fg' : 'magenta-fg';
    info += `{cyan-fg}Gender:{/cyan-fg} {${genderColor}}${row.gender}{/${genderColor}}\n`;

    info += `{cyan-fg}Voice:{/cyan-fg} ${row.name}\n`;

    // Color model in yellow
    info += `{cyan-fg}Model:{/cyan-fg} {yellow-fg}${row.model}{/yellow-fg}\n`;

    if (row.type === 'curated' && row.friendlyName) {
      info += `{cyan-fg}Friendly:{/cyan-fg} ${row.friendlyName}\n`;
    }

    // Color sample text in green - use voice-specific sample
    const voiceSample = row.sampleText || this.sampleText;
    info += `\n{gray-fg}Sample:{/gray-fg}\n{green-fg}"${voiceSample}"{/green-fg}\n`;

    info += `\n{cyan-fg}Position:{/cyan-fg} ${idx + 1}/${this.filteredData.length}\n`;
    info += `{cyan-fg}Favorites:{/cyan-fg} ${this.favorites.size}\n\n`;
    info += `{green-fg}Press [I] to install this voice{/green-fg}`;

    this.infoPanel.setContent(info);
    this.screen.render();
  }

  setupKeys() {
    this.screen.key(['q', 'Q', 'C-c'], () => this.exit());

    // Listen to selection changes (blessed handles arrow keys automatically)
    this.list.on('select', () => {
      this.updateInfo();
    });

    // Sorting
    this.screen.key(['1'], () => { this.sortColumn = 'id'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['2'], () => { this.sortColumn = 'gender'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['3'], () => { this.sortColumn = 'name'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });
    this.screen.key(['4'], () => { this.sortColumn = 'model'; this.sortAsc = !this.sortAsc; this.applyFilter(); this.updateList(); });

    // Search
    this.screen.key(['/'], () => this.showSearch());

    // Play
    this.list.key(['space'], async () => {
      const row = this.filteredData[this.list.selected];
      if (row) await this.playSample(row);
    });

    // Favorite
    this.list.key(['*', '8'], async () => {
      const row = this.filteredData[this.list.selected];
      if (row) {
        if (this.favorites.has(row.id)) {
          this.favorites.delete(row.id);
          this.statusBar.setContent('{yellow-fg}Removed from favorites{/yellow-fg}');
        } else {
          this.favorites.add(row.id);
          this.statusBar.setContent('{yellow-fg}Added to favorites ⭐{/yellow-fg}');
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
        this.statusBar.setContent(`{yellow-fg}⭐ Showing ${this.filteredData.length} favorites - Press [F] or [X] to show all{/yellow-fg}`);
      } else {
        this.statusBar.setContent(`{cyan-fg}Showing all voices - Press [F] to filter favorites{/cyan-fg}`);
      }
      this.screen.render();
    });

    // Exit favorites filter with X
    this.screen.key(['x', 'X'], () => {
      if (this.favoritesOnly) {
        this.favoritesOnly = false;
        this.applyFilter();
        this.updateList();
        this.statusBar.setContent(`{cyan-fg}Showing all voices - Press [F] to filter favorites{/cyan-fg}`);
        this.screen.render();
      }
    });

    // Export
    this.screen.key(['e', 'E'], () => this.exportFavorites());
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

    // Generate unique filename based on sample text hash to support different samples
    const textHash = sampleText.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');

    let outputFile;
    if (row.type === 'curated') {
      outputFile = path.join(CONFIG.CURATED_DIR, `${row.model}_${textHash}.wav`);
      const modelPath = path.join(CONFIG.PIPER_VOICES_DIR, `${row.model}.onnx`);
      try {
        await fs.access(outputFile);
      } catch {
        await execAsync(`echo "${sampleText}" | ${CONFIG.PIPER_PATH} --model "${modelPath}" --output_file "${outputFile}" 2>/dev/null`);
      }
    } else {
      outputFile = path.join(CONFIG.OUTPUT_DIR, `speaker_${row.id}_${textHash}.wav`);
      try {
        await fs.access(outputFile);
      } catch {
        await execAsync(`echo "${sampleText}" | ${CONFIG.PIPER_PATH} --model "${CONFIG.MODEL_PATH}" --speaker ${row.id} --output_file "${outputFile}" 2>/dev/null`);
      }
    }

    const players = [
      { cmd: 'aplay', args: [outputFile] },
      { cmd: 'paplay', args: [outputFile] },
      { cmd: 'ffplay', args: ['-nodisp', '-autoexit', outputFile] }
    ];

    for (const player of players) {
      try {
        await execAsync(`which ${player.cmd} 2>/dev/null`);
        this.currentAudioProcess = spawn(player.cmd, player.args, { stdio: 'ignore' });
        this.currentAudioProcess.on('close', () => {
          this.statusBar.setContent(`{green-fg}✓ Played ${row.name}{/green-fg}`);
          this.screen.render();
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

      // Update config
      config.defaultVoice = voiceId;
      config.ttsProvider = 'piper';

      // Ensure config directory exists
      await fs.mkdir(path.dirname(CONFIG.AGENTVIBES_CONFIG), { recursive: true });

      // Write config
      await fs.writeFile(CONFIG.AGENTVIBES_CONFIG, JSON.stringify(config, null, 2));

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
    const favData = this.tableData.filter(row => this.favorites.has(row.id));
    const exportFile = path.join(os.homedir(), 'agentvibes-favorites.json');
    await fs.writeFile(exportFile, JSON.stringify(favData, null, 2));
    this.statusBar.setContent(`{green-fg}✓ Exported ${favData.length} favorites to ${exportFile}{/green-fg}`);
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
