/**
 * AgentVibes - Interactive CLI with Keyboard Navigation
 * Enhanced user interface with arrow keys and search
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { select, checkbox, confirm, input, expand, Separator } from '@inquirer/prompts'
import search from '@inquirer/search'
import chalk from 'chalk'
import figlet from 'figlet'
import boxen from 'boxen'
import { logger } from '../utils/logger.js'

export class InteractiveCLI {
  constructor() {
    this.theme = {
      prefix: chalk.cyan('🚀'),
      style: {
        answer: chalk.green,
        message: chalk.bold,
        error: chalk.red,
        help: chalk.gray,
        highlight: chalk.cyan.bold,
        description: chalk.gray,
        disabled: chalk.dim
      },
      icon: {
        cursor: '❯',
        checked: '✓',
        unchecked: '○'
      }
    }
  }

  /**
   * Show welcome screen
   */
  async showWelcome() {
    console.clear()
    
    const title = figlet.textSync('AgentVibes', {
      font: 'Standard',
      horizontalLayout: 'fitted'
    })

    const welcomeBox = boxen(
      chalk.cyan(title) + '\n' +
      chalk.yellow('Create themed AI coding teams') + '\n' +
      chalk.green.bold('v1.2') + chalk.gray(' (enhanced by default)') + '\n\n' +
      chalk.gray('Use ↑↓ arrows to navigate • Enter to select • Type to search') + '\n' +
      chalk.blue('github.com/paulpreibisch/AgentVibes'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center'
      }
    )

    console.log(welcomeBox)
    console.log()
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  /**
   * Select number of teams with visual feedback
   */
  async selectTeamCount(options = {}) {
    const { min = 1, max = 10, default: defaultValue = 2 } = options
    
    const choices = []
    for (let i = min; i <= max; i++) {
      const teamWord = i === 1 ? 'team' : 'teams'
      const membersPerTeam = 2 // default roles
      const totalMembers = i * membersPerTeam
      
      choices.push({
        name: `${i} ${teamWord} (${totalMembers} total agents)`,
        value: i,
        description: i === defaultValue ? 'Recommended for most projects' : undefined
      })
    }
    
    return await select({
      message: 'How many teams would you like to create?',
      choices,
      default: defaultValue - 1,
      theme: this.theme
    })
  }

  /**
   * Select role configuration
   */
  async selectRoleConfiguration(options = {}) {
    const { defaultRoles = ['dev', 'testing'], allowCustom = true } = options
    
    const choices = [
      {
        name: '👥 Default roles (Developer + Tester)',
        value: 'default',
        description: 'Best for most projects'
      },
      {
        name: '🎭 Extended roles (Choose from predefined)',
        value: 'extended',
        description: 'DevOps, Designer, Security, etc.'
      }
    ]
    
    if (allowCustom) {
      choices.push({
        name: '✏️  Custom roles (Create your own)',
        value: 'custom',
        description: 'Define specific roles for your team'
      })
    }
    
    return await select({
      message: 'Select role configuration',
      choices,
      theme: this.theme
    })
  }

  /**
   * Select character with theme expansion
   */
  async selectCharacter(options = {}) {
    const {
      role,
      teamNumber,
      excludeCharacters = [],
      showSearch = true,
      showThemeGroups = true
    } = options
    
    // Load themes dynamically
    const { loadThemes } = await import('../themes/theme-loader.js')
    const themes = await loadThemes()
    
    // First, let user select a theme
    const themeChoices = themes.map(theme => ({
      name: `${theme.emoji} ${theme.name}`,
      value: theme,
      description: `${theme.agents.length} characters available`
    }))
    
    const selectedTheme = await select({
      message: `Select theme for Team ${teamNumber} - ${role.name || role.id || role}`,
      choices: themeChoices,
      pageSize: 15,
      theme: this.theme
    })
    
    // Then show characters from selected theme
    const excludeSet = new Set(excludeCharacters)
    const availableCharacters = []
    
    for (const character of selectedTheme.agents) {
      const characterId = `${selectedTheme.name}-${character.name}`
      
      if (!excludeSet.has(characterId)) {
        availableCharacters.push({
          name: `${character.emoji} ${character.name}`,
          value: {
            ...character,
            id: characterId,
            theme: selectedTheme.name,
            themeEmoji: selectedTheme.emoji
          },
          description: character.catchphrase
        })
      }
    }
    
    if (availableCharacters.length === 0) {
      throw new Error(`No available characters in ${selectedTheme.name} theme`)
    }
    
    if (showSearch && availableCharacters.length > 10) {
      // Use search for large character lists
      return await search({
        message: `Select character from ${selectedTheme.emoji} ${selectedTheme.name}`,
        source: async (input) => {
          if (!input) return availableCharacters
          
          const searchTerm = input.toLowerCase()
          return availableCharacters.filter(char => 
            char.name.toLowerCase().includes(searchTerm) ||
            char.description?.toLowerCase().includes(searchTerm)
          )
        },
        theme: this.theme
      })
    } else {
      // Use select for smaller character lists
      return await select({
        message: `Select character from ${selectedTheme.emoji} ${selectedTheme.name}`,
        choices: availableCharacters,
        pageSize: 15,
        theme: this.theme
      })
    }
  }

  /**
   * Select color scheme with preview
   */
  async selectColorScheme(options = {}) {
    const { character, availableColors = [], showPreview = true } = options
    
    const choices = availableColors.map(color => {
      const preview = showPreview ? 
        `${chalk.hex(color.primary)('███')} ${chalk.hex(color.secondary)('███')}` : ''
      
      return {
        name: `${color.emoji} ${color.name} ${preview}`,
        value: color,
        description: `Primary: ${color.primary}, Secondary: ${color.secondary}`
      }
    })
    
    // Add separator for premium colors
    const roygbivCount = 7
    if (choices.length > roygbivCount) {
      choices.splice(roygbivCount, 0, new Separator('─── Premium Colors ───'))
    }
    
    return await select({
      message: `Select color scheme for ${character.emoji} ${character.name}`,
      choices,
      pageSize: 15,
      theme: this.theme
    })
  }

  /**
   * Configure repository with GitHub browsing
   */
  async configureRepository(options = {}) {
    const { supportGitHub = true, supportLocal = true, supportBrowsing = true } = options
    
    const choices = []
    
    if (supportGitHub) {
      choices.push({
        name: '🌐 Enter GitHub URL',
        value: 'url',
        description: 'Clone from any GitHub repository'
      })
      
      if (supportBrowsing) {
        choices.push({
          name: '📋 Browse recent repositories',
          value: 'browse',
          description: 'Select from your recent repos'
        })
        
        choices.push({
          name: '🔍 Search GitHub',
          value: 'search',
          description: 'Find repositories by keyword'
        })
      }
    }
    
    if (supportLocal) {
      choices.push({
        name: '📁 Use current directory',
        value: 'current',
        description: 'Create teams in this folder'
      })
    }
    
    choices.push({
      name: '⏭️  Skip repository',
      value: 'skip',
      description: 'Start with empty projects'
    })
    
    const repoSource = await select({
      message: 'Repository configuration',
      choices,
      theme: this.theme
    })
    
    // Handle different sources
    if (repoSource === 'url') {
      const url = await input({
        message: 'Enter GitHub repository URL:',
        validate: (value) => {
          if (!value) return 'URL is required'
          if (!value.match(/^(https:\/\/github\.com\/.+\/.+|git@github\.com:.+\/.+\.git)$/)) {
            return 'Invalid GitHub URL format'
          }
          return true
        },
        theme: this.theme
      })
      
      // Select branch
      const branch = await this.selectBranch(url)
      
      return { source: 'url', url, branch }
    } else if (repoSource === 'browse') {
      // This would integrate with GitHub CLI
      return await this.browseRepositories()
    } else if (repoSource === 'search') {
      return await this.searchRepositories()
    }
    
    return { source: repoSource }
  }

  /**
   * Browse recent repositories
   */
  async browseRepositories() {
    try {
      // Check if gh is available
      const { execSync } = await import('child_process')
      execSync('gh --version', { stdio: 'ignore' })
      
      // Get recent repositories
      const reposJson = execSync('gh repo list --limit 20 --json name,description,url', 
        { encoding: 'utf-8' })
      const repos = JSON.parse(reposJson)
      
      if (repos.length === 0) {
        logger.warn('No repositories found')
        return { source: 'skip' }
      }
      
      const choices = repos.map(repo => ({
        name: `${repo.name}`,
        value: repo.url,
        description: repo.description || 'No description'
      }))
      
      const url = await select({
        message: 'Select a repository',
        choices,
        pageSize: 10,
        theme: this.theme
      })
      
      // Select branch
      const branch = await this.selectBranch(url)
      
      return { source: 'url', url, branch }
    } catch (error) {
      logger.error('GitHub CLI not available or not authenticated')
      return { source: 'skip' }
    }
  }
  
  /**
   * Select branch for repository
   */
  async selectBranch(repoUrl) {
    try {
      // Extract owner/repo from URL
      const match = repoUrl.match(/github\.com[/:](.+?)\/(.+?)(\.git)?$/)
      if (!match) return null
      
      const owner = match[1]
      const repo = match[2].replace('.git', '')
      
      const { execSync } = await import('child_process')
      
      // Get branches
      const branchesJson = execSync(
        `gh api repos/${owner}/${repo}/branches --paginate --jq '.[].name'`,
        { encoding: 'utf-8' }
      )
      
      const branches = branchesJson.trim().split('\n').filter(b => b)
      
      if (branches.length === 0) {
        return null
      }
      
      // Sort branches to put main/master first
      branches.sort((a, b) => {
        if (a === 'main' || a === 'master') return -1
        if (b === 'main' || b === 'master') return 1
        return a.localeCompare(b)
      })
      
      const choices = [
        {
          name: 'Default branch',
          value: null,
          description: 'Use repository default'
        },
        new Separator('─── Available Branches ───'),
        ...branches.map(branch => ({
          name: branch,
          value: branch,
          description: branch === 'main' || branch === 'master' ? 'Primary branch' : null
        }))
      ]
      
      return await select({
        message: 'Select branch',
        choices,
        theme: this.theme
      })
    } catch (error) {
      logger.warn('Could not fetch branches:', error.message)
      return null
    }
  }

  /**
   * Search repositories
   */
  async searchRepositories() {
    const query = await input({
      message: 'Search for repositories:',
      validate: (value) => value.length > 0 || 'Search query required',
      theme: this.theme
    })
    
    try {
      const { execSync } = await import('child_process')
      const searchJson = execSync(
        `gh search repos "${query}" --limit 10 --json fullName,description,url`,
        { encoding: 'utf-8' }
      )
      const results = JSON.parse(searchJson)
      
      if (results.length === 0) {
        logger.warn('No repositories found')
        return { source: 'skip' }
      }
      
      const choices = results.map(repo => ({
        name: repo.fullName,
        value: repo.url,
        description: repo.description || 'No description'
      }))
      
      const url = await select({
        message: 'Select a repository',
        choices,
        pageSize: 10,
        theme: this.theme
      })
      
      // Select branch
      const branch = await this.selectBranch(url)
      
      return { source: 'url', url, branch }
    } catch (error) {
      logger.error('Search failed:', error.message)
      return { source: 'skip' }
    }
  }

  /**
   * Review configuration with visual preview
   */
  async reviewConfiguration(options = {}) {
    const { summary, allowEdit = true, showVisualPreview = true } = options
    
    // Display summary
    console.log('\n' + chalk.bold('📋 Configuration Summary'))
    console.log(chalk.gray('────────────────────────'))
    
    console.log(chalk.bold(`\nTeams: ${summary.teamCount}`))
    
    for (const team of summary.teams) {
      console.log(`\n${chalk.bold(`Team ${team.number}:`)}`)
      for (const member of team.members) {
        console.log(`  ${member.roleIcon || '👤'} ${member.role}: ${member.emoji} ${member.character} (${member.colorScheme})`)
      }
    }
    
    if (summary.repository?.url) {
      console.log(`\n${chalk.bold('Repository:')} ${summary.repository.url}`)
    }
    
    console.log(`\n${chalk.bold('Port Range:')} ${summary.estimatedPorts[0].backend} - ${summary.estimatedPorts[summary.estimatedPorts.length - 1].backend}`)
    
    const choices = [
      { name: '✅ Confirm and generate', value: 'confirm' },
      { name: '❌ Cancel', value: 'cancel' }
    ]
    
    if (allowEdit) {
      choices.splice(1, 0, { name: '✏️  Edit configuration', value: 'edit' })
    }
    
    const action = await select({
      message: '\nReady to generate?',
      choices,
      theme: this.theme
    })
    
    return action === 'confirm'
  }

  /**
   * Create custom role
   */
  async createCustomRole(options = {}) {
    const { existingRoles = [] } = options
    
    const id = await input({
      message: 'Role ID (lowercase, no spaces):',
      validate: (value) => {
        if (!value) return 'Role ID is required'
        if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens'
        if (existingRoles.some(r => r.id === value)) return 'Role ID already exists'
        return true
      },
      theme: this.theme
    })
    
    const name = await input({
      message: 'Role name:',
      validate: (value) => value.length > 0 || 'Role name is required',
      theme: this.theme
    })
    
    const icon = await input({
      message: 'Role icon (emoji):',
      default: '👤',
      theme: this.theme
    })
    
    const description = await input({
      message: 'Role description:',
      theme: this.theme
    })
    
    return { id, name, icon, description }
  }

  /**
   * Select multiple items
   */
  async selectMultiple(options = {}) {
    const { message, choices, min = 1, max = 10 } = options
    
    const selected = await checkbox({
      message,
      choices,
      validate: (answer) => {
        if (answer.length < min) return `Select at least ${min} items`
        if (answer.length > max) return `Select at most ${max} items`
        return true
      },
      theme: this.theme
    })
    
    return selected
  }

  /**
   * Confirm action
   */
  async confirm(options = {}) {
    const { message, default: defaultValue = true } = options
    
    return await confirm({
      message,
      default: defaultValue,
      theme: this.theme
    })
  }
  
  /**
   * Generic select method
   */
  async select(options = {}) {
    return await select({
      ...options,
      theme: this.theme
    })
  }

  /**
   * Update progress display
   */
  updateProgress(progress) {
    if (progress.type === 'start') {
      console.log(`\n${chalk.bold(`🎭 Processing ${progress.theme.name}`)}`)
    } else if (progress.type === 'task') {
      const icon = progress.progress === 100 ? '✅' : 
                   progress.progress === -1 ? '❌' : '⏳'
      console.log(`  ${icon} ${progress.message}`)
    } else if (progress.type === 'complete') {
      console.log(chalk.green(`  ✨ ${progress.theme.name} complete\n`))
    } else if (progress.type === 'error') {
      console.log(chalk.red(`  ❌ Error: ${progress.message}`))
    }
  }
}