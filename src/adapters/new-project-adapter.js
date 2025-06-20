/**
 * AgentVibes - New Project Adapter
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import path from 'path'
import fs from 'fs-extra'
import { BaseAdapter } from './base-adapter.js'
import { generateTeams } from '../generators/team-generator.js'
import { logger } from '../utils/logger.js'

export class NewProjectAdapter extends BaseAdapter {
  constructor(config) {
    super('new-project', config)
    this.projectPath = config.projectPath || process.cwd()
    this.isEmpty = config.isEmpty || false
  }

  /**
   * Get available actions for new project
   */
  getAvailableActions() {
    return [
      {
        id: 'create-teams-project',
        name: 'Create Teams Project',
        description: 'Set up a new teams/ structure with themed agents',
        category: 'creation',
        primary: true
      },
      {
        id: 'quick-setup',
        name: 'Quick Setup',
        description: 'Create project with default Matrix theme',
        category: 'creation'
      },
      {
        id: 'custom-setup',
        name: 'Custom Setup',
        description: 'Interactive setup with theme selection',
        category: 'creation'
      },
      {
        id: 'import-config',
        name: 'Import Configuration',
        description: 'Create project from existing configuration file',
        category: 'creation'
      },
      {
        id: 'analyze-directory',
        name: 'Analyze Directory',
        description: 'Detailed analysis of current directory contents',
        category: 'analysis'
      }
    ]
  }

  /**
   * Execute an action
   */
  async executeAction(action, options = {}) {
    logger.info(`Executing new project action: ${action}`)

    switch (action) {
      case 'create-teams-project':
        return await this.createTeamsProject(options)
      
      case 'quick-setup':
        return await this.quickSetup(options)
      
      case 'custom-setup':
        return await this.customSetup(options)
      
      case 'import-config':
        return await this.importConfiguration(options)
      
      case 'analyze-directory':
        return await this.analyzeDirectory(options)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Create a new teams project
   */
  async createTeamsProject(options) {
    const {
      themes = ['matrix'],
      teamCount = 1,
      repoUrl,
      authMethod = 'public',
      projectBoard = false,
      dryRun = false
    } = options

    logger.info(`Creating teams project with themes: ${themes.join(', ')}`)

    // Prepare directory if not empty
    if (!this.isEmpty) {
      await this.prepareDirectory()
    }

    // Build teams configuration
    const teams = await this.buildTeamsConfiguration(themes, teamCount)
    
    const config = {
      teams,
      outputDir: this.projectPath,
      repoUrl,
      authMethod,
      projectBoard,
      dryRun,
      verbose: true
    }

    try {
      // Use existing team generation logic
      await generateTeams(config, (progress) => {
        logger.info(`Progress: ${progress.type} - ${progress.message}`)
      })

      // Create project metadata
      await this.createProjectMetadata({
        themes,
        teamCount,
        createdAt: new Date().toISOString(),
        agentVibesVersion: '2.0.0'
      })

      return {
        success: true,
        message: `Teams project created successfully with ${teams.length} agents`,
        projectPath: this.projectPath,
        teams: teams.map(t => ({ name: t.name, theme: t.theme, role: t.role })),
        nextSteps: [
          'Navigate to team directories to start development',
          'Use ./scripts/launch-all-teams.sh to start all services',
          'Check ./scripts/status-check.sh for team status'
        ]
      }
    } catch (error) {
      logger.error('Failed to create teams project:', error.message)
      throw new Error(`Project creation failed: ${error.message}`)
    }
  }

  /**
   * Quick setup with default configuration
   */
  async quickSetup(options) {
    return await this.createTeamsProject({
      themes: ['matrix'],
      teamCount: 2,
      repoUrl: options.repoUrl,
      ...options
    })
  }

  /**
   * Custom interactive setup
   */
  async customSetup(options) {
    return {
      success: true,
      message: 'Custom setup initiated',
      action: 'redirect-to-interactive-mode',
      projectPath: this.projectPath
    }
  }

  /**
   * Import configuration from file
   */
  async importConfiguration(options) {
    const { configPath } = options
    
    if (!configPath || !await fs.exists(configPath)) {
      throw new Error('Valid configuration file path is required')
    }

    logger.info(`Importing configuration from: ${configPath}`)

    const config = await fs.readJson(configPath)
    
    // Validate configuration structure
    if (!config.teams || !Array.isArray(config.teams)) {
      throw new Error('Invalid configuration: teams array is required')
    }

    return await this.createTeamsProject({
      ...config,
      ...options
    })
  }

  /**
   * Analyze directory contents
   */
  async analyzeDirectory(options) {
    const analysis = {
      path: this.projectPath,
      isEmpty: this.isEmpty,
      contents: {},
      recommendations: [],
      suitability: {}
    }

    if (this.isEmpty) {
      analysis.suitability = {
        score: 1.0,
        level: 'perfect',
        message: 'Empty directory - ideal for new teams project'
      }
      analysis.recommendations.push('Create teams project with your preferred themes')
    } else {
      // Detailed directory analysis
      analysis.contents = await this.scanDirectoryContents()
      analysis.suitability = this.analyzeSuitability(analysis.contents)
      analysis.recommendations = this.generateRecommendations(analysis.contents, analysis.suitability)
    }

    return {
      success: true,
      data: analysis,
      message: `Directory analysis complete - ${analysis.suitability.level} suitability`
    }
  }

  /**
   * Prepare directory for project creation
   */
  async prepareDirectory() {
    logger.info('Preparing directory for teams project...')
    
    // Create .agentvibes-original backup if directory has content
    const items = await fs.readdir(this.projectPath)
    if (items.length > 0) {
      const backupDir = path.join(this.projectPath, '.agentvibes-original')
      await fs.ensureDir(backupDir)
      
      // Move existing files to backup (but skip common project files)
      const skipFiles = ['.git', 'node_modules', '.agentvibes-original']
      
      for (const item of items) {
        if (!skipFiles.includes(item)) {
          const srcPath = path.join(this.projectPath, item)
          const destPath = path.join(backupDir, item)
          await fs.move(srcPath, destPath)
        }
      }
      
      logger.info(`Existing files backed up to: ${backupDir}`)
    }
  }

  /**
   * Build teams configuration from themes
   */
  async buildTeamsConfiguration(themes, teamCount) {
    const { loadThemeByName } = await import('../themes/theme-loader.js')
    
    const teams = []
    let teamNumber = 1
    
    for (const themeName of themes) {
      const theme = await loadThemeByName(themeName)
      
      // Create specified number of teams for this theme
      for (let i = 0; i < teamCount; i++) {
        // Each team gets a dev agent and testing agent
        const devAgent = theme.agents[0] || theme.agents[Math.floor(Math.random() * theme.agents.length)]
        const testingAgent = theme.agents[1] || theme.agents[Math.floor(Math.random() * theme.agents.length)]
        
        // Dev role
        teams.push({
          ...devAgent,
          teamNumber,
          role: 'dev',
          theme: theme.name,
          themeEmoji: theme.emoji,
          dockerNetwork: `${theme.name.toLowerCase().replace(/\s+/g, '-')}-network`,
          ports: {
            backend: 5100 + teamNumber - 1, // Start at 5100
            frontend: 3100 + teamNumber - 1,
            nginx: 8100 + teamNumber - 1
          }
        })
        
        // Testing role  
        teams.push({
          ...testingAgent,
          teamNumber,
          role: 'testing',
          theme: theme.name,
          themeEmoji: theme.emoji,
          dockerNetwork: `${theme.name.toLowerCase().replace(/\s+/g, '-')}-network`,
          ports: {
            backend: 6100 + teamNumber - 1, // Start at 6100
            frontend: 4100 + teamNumber - 1,
            nginx: 9100 + teamNumber - 1
          }
        })
        
        teamNumber++
      }
    }
    
    return teams
  }

  /**
   * Create project metadata file
   */
  async createProjectMetadata(metadata) {
    const projectFile = path.join(this.projectPath, '.agentvibes-project.json')
    
    const projectData = {
      name: path.basename(this.projectPath),
      type: 'teams-project',
      structure: 'teams/team-N',
      ...metadata
    }
    
    await fs.writeJson(projectFile, projectData, { spaces: 2 })
    logger.info('Project metadata created')
  }

  /**
   * Scan directory contents for analysis
   */
  async scanDirectoryContents() {
    const items = await fs.readdir(this.projectPath)
    const contents = {
      files: [],
      directories: [],
      totalSize: 0,
      fileTypes: {},
      hasProject: false,
      projectType: null
    }
    
    for (const item of items) {
      const itemPath = path.join(this.projectPath, item)
      const stats = await fs.stat(itemPath)
      
      if (stats.isDirectory()) {
        contents.directories.push(item)
      } else {
        contents.files.push(item)
        const ext = path.extname(item).toLowerCase()
        contents.fileTypes[ext] = (contents.fileTypes[ext] || 0) + 1
        
        // Detect project type
        if (item === 'package.json') {
          contents.hasProject = true
          contents.projectType = 'node'
        } else if (item === 'Cargo.toml') {
          contents.hasProject = true
          contents.projectType = 'rust'
        } else if (item === 'requirements.txt' || item === 'pyproject.toml') {
          contents.hasProject = true
          contents.projectType = 'python'
        }
      }
      
      contents.totalSize += stats.size
    }
    
    return contents
  }

  /**
   * Analyze directory suitability
   */
  analyzeSuitability(contents) {
    let score = 0.8 // Base score for new project
    let level = 'good'
    let message = 'Directory suitable for teams project'
    
    // Penalties
    if (contents.files.length > 20) score -= 0.2
    if (contents.directories.length > 10) score -= 0.2
    if (contents.totalSize > 100 * 1024 * 1024) score -= 0.3 // > 100MB
    
    // Bonuses
    if (contents.hasProject) score += 0.1
    if (contents.directories.includes('.git')) score += 0.1
    
    // Determine level
    if (score >= 0.9) {
      level = 'excellent'
      message = 'Perfect for teams project creation'
    } else if (score >= 0.7) {
      level = 'good'
      message = 'Good candidate for teams project'
    } else if (score >= 0.5) {
      level = 'fair'
      message = 'May work but consider cleanup first'
    } else {
      level = 'poor'
      message = 'Not recommended for teams project'
    }
    
    return { score: Math.max(0, score), level, message }
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(contents, suitability) {
    const recommendations = []
    
    if (suitability.score >= 0.8) {
      recommendations.push('Directory is ready for teams project creation')
    }
    
    if (contents.files.length > 20) {
      recommendations.push('Consider organizing files into subdirectories before creating teams')
    }
    
    if (contents.hasProject) {
      recommendations.push(`Existing ${contents.projectType} project detected - teams will work alongside it`)
    }
    
    if (!contents.directories.includes('.git')) {
      recommendations.push('Initialize git repository for better version control')
    }
    
    if (suitability.score < 0.5) {
      recommendations.push('Clean up directory or choose a different location')
    }
    
    return recommendations
  }

  /**
   * Get project status (not applicable for new projects)
   */
  async getProjectStatus() {
    return {
      type: 'new-project',
      path: this.projectPath,
      isEmpty: this.isEmpty,
      ready: true,
      message: 'Ready for teams project creation'
    }
  }

  /**
   * Validate configuration (check if directory is suitable)
   */
  async validateConfiguration() {
    const analysis = await this.analyzeDirectory()
    
    return {
      valid: analysis.data.suitability.score >= 0.5,
      score: analysis.data.suitability.score,
      level: analysis.data.suitability.level,
      message: analysis.data.suitability.message,
      recommendations: analysis.data.recommendations
    }
  }
}