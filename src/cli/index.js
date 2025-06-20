/**
 * AgentVibes - Create themed AI agent teams
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { Command } from 'commander'
import chalk from 'chalk'
import figlet from 'figlet'
import boxen from 'boxen'
import inquirer from 'inquirer'
import { showWelcomeScreen } from './prompts.js'
import { selectThemes } from './theme-selector.js'
import { customizeTeams } from './team-customizer.js'
import { displayProgress } from './progress-display.js'
import { generateTeams } from '../generators/team-generator.js'
import { loadThemes, loadThemeByName } from '../themes/theme-loader.js'
import { logger } from '../utils/logger.js'
import { ProjectDetector } from '../detectors/project-detector.js'
import { TeamsAdapter } from '../adapters/teams-adapter.js'
import { NewProjectAdapter } from '../adapters/new-project-adapter.js'
import path from 'path'

export async function runCLI(args) {
  const program = new Command()
  
  program
    .name('create-teams')
    .description('Create unlimited themed agent teams for collaborative coding projects')
    .version('1.0.0')
    .option('-t, --themes <themes>', 'Comma-separated theme names')
    .option('--theme <theme>', 'Single theme name (alias for --themes)')
    .option('-r, --repo <url>', 'GitHub repository URL to clone')
    .option('-b, --branch <branch>', 'Git branch to clone (default: main/master)')
    .option('--auth <method>', 'Authentication method: ssh, gh, token, public', 'public')
    .option('--team-count <number>', 'Number of teams to create per theme', '2')
    .option('-o, --output <path>', 'Output directory', process.cwd())
    .option('-p, --port-start <number>', 'Starting port number', '3011')
    .option('--docker-network <name>', 'Docker network name')
    .option('--project-board', 'Enable GitHub Projects integration')
    .option('--project-id <id>', 'Use existing project board by ID')
    .option('--skip-commands', 'Skip installing slash commands')
    .option('-c, --config <file>', 'Load configuration from file')
    .option('--dry-run', 'Show what would be created without doing it')
    .option('-v, --verbose', 'Detailed output')
    .parse(process.argv)

  const options = program.opts()

  // Check if CLI arguments were provided
  const hasThemes = options.themes !== undefined
  const hasTheme = options.theme !== undefined
  const hasConfig = options.config !== undefined
  
  if (!hasThemes && !hasTheme && !hasConfig) {
    await runInteractiveMode(options)
  } else {
    await runCommandMode(options)
  }
}

async function runInteractiveMode(options) {
  try {
    // Check if setup already exists
    const fs = (await import('fs-extra')).default
    
    // Get absolute path for display
    const absolutePath = path.resolve(options.output)
    
    // Use new universal detection system
    const detector = new ProjectDetector()
    const detection = await detector.detectProject(options.output)
    
    if (detection.exists) {
      // Show welcome screen
      await showWelcomeScreen()
      
      // Show current working directory
      console.log('\n' + chalk.bold('📍 Working Directory'))
      console.log(chalk.cyan(`   ${absolutePath}`))
      console.log(chalk.gray('   (Current location)\n'))
      
      console.log(chalk.bold('⚠️  Existing Teams Project Detected'))
      console.log(chalk.yellow(`💡 Found ${detection.config.totalTeams} teams with ${detection.config.totalAgents} agents\n`))
      
      const { modifyChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'modifyChoice',
          message: 'What would you like to do?',
          choices: [
            { name: '🎯 Manage existing teams', value: 'manage' },
            { name: '➕ Add more themes/characters', value: 'add' },
            { name: '🔄 Start over (delete all)', value: 'restart' },
            { name: '❌ Cancel', value: 'cancel' }
          ]
        }
      ])
      
      if (modifyChoice === 'cancel') {
        console.log(chalk.yellow('\n👋 Setup cancelled'))
        process.exit(0)
      }
      
      if (modifyChoice === 'restart') {
        // Double confirmation for destructive action
        console.log('\n' + chalk.red.bold('⚠️  WARNING: This will delete all existing teams!'))
        const { confirmDelete } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDelete',
            message: chalk.red('Are you sure you want to delete everything?'),
            default: false
          }
        ])
        
        if (confirmDelete) {
          const { reallyConfirm } = await inquirer.prompt([
            {
              type: 'input',
              name: 'reallyConfirm',
              message: chalk.red('Type "DELETE ALL" to confirm:'),
              validate: (input) => input === 'DELETE ALL' || 'Please type exactly: DELETE ALL'
            }
          ])
          
          if (reallyConfirm === 'DELETE ALL') {
            console.log(chalk.yellow('\n🧹 Deleting existing setup...'))
            await cleanupExistingSetup(options.output)
            console.log(chalk.green('✅ Cleanup complete\n'))
          } else {
            process.exit(0)
          }
        } else {
          process.exit(0)
        }
      } else if (modifyChoice === 'manage') {
        // Use teams adapter for management
        await manageExistingTeams(detection, options)
        return
      } else if (modifyChoice === 'add') {
        // Add more themes to existing setup
        await addToExistingSetup(detection, options)
        return
      }
    } else if (detection.type === 'new-project') {
      // Show welcome screen for new setup
      await showWelcomeScreen()
      
      // Show project analysis
      if (detection.metadata && !detection.metadata.isEmpty) {
        console.log('\n' + chalk.bold('📊 Directory Analysis'))
        console.log(chalk.cyan(`   Suitability: ${detection.metadata.reason}`))
        console.log(chalk.gray(`   Confidence: ${Math.round(detection.confidence * 100)}%\n`))
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Unknown project structure detected'))
      console.log(chalk.gray('Proceeding with new project setup...\n'))
      await showWelcomeScreen()
    }

    // Show current working directory
    console.log('\n' + chalk.bold('📍 Working Directory'))
    console.log(chalk.cyan(`   ${absolutePath}`))
    console.log(chalk.gray('   (Teams will be created here)\n'))

    // Select setup type
    console.log(chalk.bold('Setup Type'))
    console.log(chalk.yellow('💡 Choose how you want to create your AI coding teams\n'))
    
    const { setupType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupType',
        message: 'What type of setup would you like?',
        choices: [
          { name: chalk.bold('🎭 Themed Setup') + ' (Recommended)', value: 'themed' },
          { name: '📦 Basic Setup (Simple team numbers)', value: 'basic' },
          { name: '🛠️  Custom Configuration', value: 'custom' },
          { name: '📚 Load from existing config', value: 'load' }
        ]
      }
    ])

    let config = {}

    if (setupType === 'themed') {
      // Load available themes
      const themes = await loadThemes()
      
      // Select themes
      const selectedThemes = await selectThemes(themes)
      
      // Customize teams if desired
      config.teams = await customizeTeams(selectedThemes, loadThemes)
    } else if (setupType === 'basic') {
      // Basic setup with team numbers
      const { teamCount } = await inquirer.prompt([
        {
          type: 'number',
          name: 'teamCount',
          message: 'How many teams would you like to create?',
          default: 4,
          validate: (value) => value > 0 && value <= 20
        }
      ])
      
      config.teams = Array.from({ length: teamCount }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        emoji: '🤖',
        ports: {
          backend: 3011 + i * 10,
          frontend: 5175 + i,
          nginx: 3080 + i
        }
      }))
    }

    // Get repository configuration
    const repoConfig = await getRepositoryConfig()
    config = { ...config, ...repoConfig }

    // Configure GitHub Projects if desired
    if (!options.skipProjects) {
      const projectConfig = await configureGitHubProjects()
      config = { ...config, ...projectConfig }
    }

    // Set output directory
    config.outputDir = options.output

    // Generate teams with progress display
    await generateTeams(config, (progress) => {
      displayProgress(progress)
    })

    logger.success('✨ All teams created successfully!')
    
    // Show attribution
    console.log('\n' + boxen(
      chalk.cyan('Created with AgentVibes') + '\n' +
      chalk.yellow('by Paul Preibisch (@paulpreibisch)') + '\n' +
      chalk.gray('⭐ Star us: github.com/paulpreibisch/AgentVibes'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        textAlignment: 'center'
      }
    ))
    
  } catch (error) {
    logger.error('Error during team generation:', error.message)
    process.exit(1)
  }
}

async function runCommandMode(options) {
  try {
    const themeNames = options.themes ? options.themes.split(',') : (options.theme ? [options.theme] : [])
    
    // Load theme configurations and convert to teams
    const teams = []
    let portOffset = 0
    
    for (const themeName of themeNames) {
      const trimmedName = themeName.trim()
      if (!trimmedName) {
        throw new Error('Theme "" not found')
      }
      const theme = await loadThemeByName(trimmedName)
      
      // Add agents from theme - create teams with dev and testing roles
      const maxTeams = parseInt(options.teamCount) || 2
      const agentsToUse = theme.agents.slice(0, maxTeams) // Get agents for teams
      
      // Create both dev and testing roles for each team
      for (let teamIndex = 0; teamIndex < maxTeams; teamIndex++) {
        const agent = agentsToUse[teamIndex] || agentsToUse[teamIndex % agentsToUse.length]
        const teamNumber = teamIndex + 1
        
        // Create dev role
        const devTeam = {
          ...agent,
          role: 'dev',
          theme: theme.name,
          themeEmoji: theme.emoji,
          teamNumber,
          dockerNetwork: options.dockerNetwork || `${theme.name.toLowerCase().replace(/\s+/g, '-')}-network`
        }
        
        // Create testing role (use next agent or cycle back)
        const testingAgent = agentsToUse[(teamIndex + 1) % agentsToUse.length] || agent
        const testingTeam = {
          ...testingAgent,
          role: 'testing',
          theme: theme.name,
          themeEmoji: theme.emoji,
          teamNumber,
          dockerNetwork: options.dockerNetwork || `${theme.name.toLowerCase().replace(/\s+/g, '-')}-network`
        }
        
        // Override ports if port-start is specified
        if (options.portStart) {
          const basePort = parseInt(options.portStart)
          devTeam.ports = {
            backend: basePort + portOffset * 10,
            frontend: 5175 + portOffset,
            nginx: 3080 + portOffset
          }
          testingTeam.ports = {
            backend: basePort + (portOffset + 1) * 10,
            frontend: 5175 + (portOffset + 1),
            nginx: 3080 + (portOffset + 1)
          }
        }
        
        teams.push(devTeam)
        teams.push(testingTeam)
        portOffset += 2 // Increment by 2 for both roles
      }
    }
    
    const config = {
      teams,
      repoUrl: options.repo,
      repoBranch: options.branch,
      authMethod: options.auth,
      outputDir: options.output,
      projectBoard: options.projectBoard,
      projectId: options.projectId,
      skipCommands: options.skipCommands,
      dryRun: options.dryRun,
      verbose: options.verbose
    }

    if (options.config) {
      // Load configuration from file
      const fileConfig = await loadConfigFromFile(options.config)
      Object.assign(config, fileConfig)
    }

    // Generate teams
    await generateTeams(config, (progress) => {
      if (options.verbose || options.dryRun) {
        displayProgress(progress)
      }
    })

    if (!options.dryRun) {
      logger.success('✨ All teams created successfully!')
      
      // Show attribution
      console.log('\n' + boxen(
        chalk.cyan('Created with AgentVibes') + '\n' +
        chalk.yellow('by Paul Preibisch (@paulpreibisch)') + '\n' +
        chalk.gray('⭐ Star us: github.com/paulpreibisch/AgentVibes'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'cyan',
          textAlignment: 'center'
        }
      ))
    }
    
  } catch (error) {
    logger.error('Error during team generation:', error.message)
    process.exit(1)
  }
}

async function getRepositoryConfig() {
  console.log('\n' + chalk.bold('Repository Setup'))
  console.log(chalk.yellow('💡 Each agent will clone and work on their own copy of your codebase'))
  console.log(chalk.yellow('   This ensures isolated development environments\n'))

  const { repoSource } = await inquirer.prompt([
    {
      type: 'list',
      name: 'repoSource',
      message: 'Which repository should teams clone?',
      choices: [
        { name: '🌐 Enter GitHub URL manually', value: 'url' },
        { name: '📁 Use current directory as template', value: 'current' },
        { name: '📋 Clone from existing project', value: 'existing' },
        { name: '🔗 Import from GitHub organization', value: 'org' },
        { name: '⏭️  Skip (no repository)', value: 'skip' }
      ]
    }
  ])

  let repoUrl = ''
  let repoBranch = undefined

  if (repoSource === 'skip') {
    return { repoUrl: '', repoBranch: undefined, authMethod: 'none', repoSource }
  }

  console.log() // Add spacing

  if (repoSource === 'url' || repoSource === 'existing') {
    const { url, branch } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'GitHub Repository URL (HTTPS or SSH):',
        validate: (value) => {
          if (!value) return 'Please enter a URL'
          // Accept both HTTPS and SSH URLs
          if (!value.match(/^(https:\/\/github\.com\/.+\/.+|git@github\.com:.+\/.+\.git)$/)) {
            return 'Please enter a valid GitHub URL (HTTPS or SSH format)'
          }
          return true
        }
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Git branch to clone (leave empty for default):',
        default: ''
      }
    ])
    repoUrl = url
    repoBranch = branch || undefined
  } else if (repoSource === 'org') {
    const { org, repo } = await inquirer.prompt([
      {
        type: 'input',
        name: 'org',
        message: 'GitHub organization name:',
        validate: (value) => value.length > 0 || 'Please enter an organization name'
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Repository name:',
        validate: (value) => value.length > 0 || 'Please enter a repository name'
      }
    ])
    repoUrl = `https://github.com/${org}/${repo}.git`
  }

  // Authentication method - auto-select SSH if SSH URL is provided
  let authMethod = 'public'
  
  if (repoUrl.startsWith('git@')) {
    authMethod = 'ssh'
    console.log(chalk.yellow('ℹ️  Using SSH authentication for SSH URL'))
  } else if (repoUrl) {
    const authAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Authentication method:',
        choices: [
          { name: '🔑 Use current GitHub CLI auth (gh auth status)', value: 'gh' },
          { name: '🔐 SSH key authentication', value: 'ssh' },
          { name: '🎫 Provide GitHub token manually', value: 'token' },
          { name: '🚫 Clone as public (no auth)', value: 'public' }
        ]
      }
    ])
    authMethod = authAnswer.authMethod
  }

  return {
    repoUrl,
    repoBranch,
    authMethod,
    repoSource
  }
}

async function configureGitHubProjects() {
  console.log('\n' + chalk.bold('GitHub Projects Integration'))
  console.log(chalk.yellow('💡 GitHub Project Boards are an excellent way to keep track of what your agents are up to'))
  console.log(chalk.yellow('   See which agent is working on what, track progress, and monitor completed tasks\n'))
  
  const { useProjects } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useProjects',
      message: 'Set up GitHub Project Board?',
      default: true
    }
  ])

  if (!useProjects) return {}

  console.log() // Add spacing
  console.log(chalk.yellow('💡 Choose where your project board will live'))
  console.log(chalk.yellow('   Create a new board or connect to an existing one\n'))

  const { projectLocation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectLocation',
      message: 'Project board location:',
      choices: [
        { name: '📋 Create new project board', value: 'new' },
        { name: '🔗 Use existing project board', value: 'existing' }
      ]
    }
  ])

  let projectConfig = { useProjects: true }

  if (projectLocation === 'new') {
    console.log() // Add spacing
    console.log(chalk.yellow('💡 Project visibility determines who can view and contribute'))
    console.log(chalk.yellow('   Private boards are best for internal team coordination\n'))
    
    const { visibility } = await inquirer.prompt([
      {
        type: 'list',
        name: 'visibility',
        message: 'Project visibility:',
        choices: [
          { name: '🔒 Private (team members only)', value: 'private' },
          { name: '🌐 Public (open to all)', value: 'public' }
        ]
      }
    ])

    projectConfig.createNewProject = true
    projectConfig.projectVisibility = visibility
  } else {
    console.log() // Add spacing
    console.log(chalk.yellow('💡 Connect to an existing project board by providing its URL or ID'))
    console.log(chalk.yellow('   Example: https://github.com/users/username/projects/1\n'))
    
    const { projectId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectId',
        message: 'Enter project board URL or ID:',
        validate: (value) => value.length > 0
      }
    ])
    
    projectConfig.projectId = projectId
  }

  console.log() // Add spacing
  console.log(chalk.yellow('💡 Automated workflows are GitHub Actions that update your project board automatically'))
  console.log(chalk.yellow('   When agents create issues or PRs, the board updates without manual intervention'))
  console.log(chalk.yellow('   Track agent progress in real-time as they work on tasks\n'))
  
  const { automation } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'automation',
      message: 'Enable automated workflows?',
      default: true
    }
  ])

  projectConfig.enableAutomation = automation

  return projectConfig
}

async function loadConfigFromFile(configPath) {
  const fs = await import('fs-extra')
  return await fs.readJson(configPath)
}

async function checkExistingSetup(outputDir) {
  const fs = (await import('fs-extra')).default
  
  const teamsDir = path.join(outputDir, 'teams')
  const dockerDir = path.join(outputDir, 'docker')
  const scriptsDir = path.join(outputDir, 'scripts')
  
  if (!await fs.exists(teamsDir)) {
    return { exists: false }
  }
  
  // Scan for existing teams
  const teams = []
  const themes = new Set()
  
  try {
    const teamDirs = await fs.readdir(teamsDir)
    
    // Look for team-N directories
    for (const teamDir of teamDirs) {
      if (!teamDir.startsWith('team-')) continue
      
      const teamPath = path.join(teamsDir, teamDir)
      const agentDirs = await fs.readdir(teamPath)
    
      for (const agentDir of agentDirs) {
        const claudePath = path.join(teamPath, agentDir, 'CLAUDE.md')
      if (await fs.exists(claudePath)) {
        const content = await fs.readFile(claudePath, 'utf-8')
        // Extract theme from CLAUDE.md
        const themeMatch = content.match(/Team \d+ - (.+)/)
        if (themeMatch) {
          themes.add(themeMatch[1])
        }
        teams.push(`${teamDir}/${agentDir}`)
      }
    }
    }
    
    return {
      exists: true,
      teamCount: teams.length,
      teams,
      themes: Array.from(themes),
      paths: {
        teams: teamsDir,
        docker: dockerDir,
        scripts: scriptsDir
      }
    }
  } catch (error) {
    return { exists: false }
  }
}

async function cleanupExistingSetup(outputDir) {
  const fs = (await import('fs-extra')).default
  
  // Remove directories
  await fs.remove(path.join(outputDir, 'teams'))
  await fs.remove(path.join(outputDir, 'docker'))
  await fs.remove(path.join(outputDir, 'scripts'))
  await fs.remove(path.join(outputDir, 'teams'))
  
  // Remove any .pid files
  const files = await fs.readdir(outputDir)
  for (const file of files) {
    if (file.endsWith('.pid') || file === 'built.flag') {
      await fs.remove(path.join(outputDir, file))
    }
  }
}


async function manageExistingTeams(detection, options) {
  console.log('\n' + chalk.bold('🎯 Teams Management Dashboard'))
  
  // Create teams adapter
  const adapter = new TeamsAdapter({
    projectPath: options.output,
    teams: detection.config.teams,
    agents: detection.config.agents
  })
  
  // Get available actions
  const actions = adapter.getAvailableActions()
  
  // Group actions by category
  const actionsByCategory = actions.reduce((groups, action) => {
    const category = action.category || 'other'
    if (!groups[category]) groups[category] = []
    groups[category].push(action)
    return groups
  }, {})
  
  // Show action menu
  const choices = []
  Object.entries(actionsByCategory).forEach(([category, categoryActions]) => {
    choices.push(new inquirer.Separator(`--- ${category.toUpperCase()} ---`))
    categoryActions.forEach(action => {
      choices.push({
        name: `${action.name} - ${action.description}`,
        value: action.id
      })
    })
  })
  
  const { selectedAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedAction',
      message: 'What would you like to do?',
      choices
    }
  ])
  
  try {
    const result = await adapter.executeAction(selectedAction)
    
    if (result.success) {
      console.log(chalk.green(`\n✅ ${result.message}`))
      
      if (result.data) {
        // Display result data nicely
        console.log('\n' + chalk.bold('📊 Results:'))
        console.log(JSON.stringify(result.data, null, 2))
      }
    } else {
      console.log(chalk.red(`\n❌ ${result.message}`))
    }
  } catch (error) {
    console.log(chalk.red(`\n❌ Error: ${error.message}`))
    logger.error('Management action failed:', error)
  }
}

async function addToExistingSetup(detection, options) {
  console.log('\n' + chalk.bold('➕ Add to Existing Teams'))
  console.log(chalk.yellow(`💡 You currently have ${detection.config.totalTeams} teams with ${detection.config.totalAgents} agents\n`))
  
  // Load themes and let user select new ones
  const themes = await loadThemes()
  const selectedThemes = await selectThemes(themes)
  
  // Customize teams
  const config = {
    teams: await customizeTeams(selectedThemes, loadThemes),
    outputDir: options.output,
    appendMode: true,
    existingTeams: detection.config.teams
  }
  
  // Get repository configuration
  const repoConfig = await getRepositoryConfig()
  config.repoUrl = repoConfig.repoUrl
  config.authMethod = repoConfig.authMethod
  
  // Generate new teams
  await generateTeams(config, (progress) => {
    displayProgress(progress)
  })
  
  logger.success('✨ Additional teams added successfully!')
}