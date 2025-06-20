/**
 * AgentVibes - Team generation core logic
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import path from 'path'
import { generateFolderStructure } from './folder-generator.js'
import { cloneRepository } from './repo-cloner.js'
import { generateConfigurations } from './config-generator.js'
import { generateCharacterConfig } from '../themes/character-manager.js'
import { logger } from '../utils/logger.js'
import { generateGitHubProjectsSetup } from '../utils/github-projects.js'

export async function generateTeams(config, progressCallback = () => {}) {
  const { teams, outputDir, repoUrl, repoBranch, authMethod, projectBoard, projectId, dryRun } = config
  
  if (!teams || teams.length === 0) {
    throw new Error('No teams specified for generation')
  }
  
  logger.info(`Generating ${teams.length} teams in ${outputDir}`)
  
  if (dryRun) {
    logger.info('DRY RUN MODE - No files will be created')
    await simulateGeneration(teams, config, progressCallback)
    return
  }
  
  try {
    // Group teams by theme for better progress reporting
    const teamsByTheme = groupTeamsByTheme(teams)
    
    let overallProgress = 0
    const totalSteps = teams.length * 5 // 5 steps per team
    let completedSteps = 0
    
    // Setup GitHub Projects if enabled
    let projectConfig = null
    if (projectBoard) {
      progressCallback({
        type: 'overall',
        progress: 0,
        message: { current: 'Setting up GitHub Projects board', next: 'Creating team directories' }
      })
      
      projectConfig = await generateGitHubProjectsSetup(config)
    }
    
    // Process each theme group
    for (const [themeName, themeTeams] of Object.entries(teamsByTheme)) {
      progressCallback({
        type: 'start',
        theme: { name: themeName, emoji: themeTeams[0].themeEmoji }
      })
      
      for (const team of themeTeams) {
        // Use the teamNumber that was already assigned to the team
        const teamNumber = team.teamNumber
        const characterConfig = generateCharacterConfig(team, 
          { name: themeName, emoji: team.themeEmoji, docker: { network: team.dockerNetwork || `${themeName.toLowerCase()}-network` } }, 
          teamNumber
        )
        
        // Step 1: Clone repository first (if specified)
        if (repoUrl) {
          progressCallback({
            type: 'task',
            theme: { name: themeName },
            task: 'clone',
            progress: 20,
            message: `Cloning repository for ${team.name}`
          })
          
          await cloneRepository(repoUrl, path.join(outputDir, characterConfig.paths.root), {
            authMethod,
            branch: repoBranch,
            agentName: team.name
          })
          completedSteps++
        } else {
          completedSteps++
        }
        
        // Step 2: Create additional folder structure
        progressCallback({
          type: 'task',
          theme: { name: themeName },
          task: 'folders',
          progress: 40,
          message: `Creating additional directories for ${team.name}`
        })
        
        await generateFolderStructure(outputDir, characterConfig, { skipIfExists: true })
        completedSteps++
        
        // Step 3: Generate configurations
        progressCallback({
          type: 'task',
          theme: { name: themeName },
          task: 'config',
          progress: 60,
          message: `Generating configurations for ${team.name}`
        })
        
        try {
          await generateConfigurations(outputDir, characterConfig, {
            projectConfig,
            repoUrl
          })
        } catch (configError) {
          logger.error(`Configuration generation failed for ${team.name}:`, configError)
          progressCallback({
            type: 'task',
            theme: { name: themeName },
            task: 'config',
            progress: -1,
            message: `Failed to generate configurations for ${team.name}: ${configError.message}`
          })
          throw configError
        }
        
        completedSteps++
        
        // Update progress after config generation
        progressCallback({
          type: 'task',
          theme: { name: themeName },
          task: 'config',
          progress: 70,
          message: `Generated configurations for ${team.name}`
        })
        
        // Step 4: Setup git hooks
        progressCallback({
          type: 'task',
          theme: { name: themeName },
          task: 'git',
          progress: 80,
          message: `Setting up git hooks for ${team.name}`
        })
        
        await setupGitHooks(outputDir, characterConfig)
        completedSteps++
        
        // Step 5: Final setup
        progressCallback({
          type: 'task',
          theme: { name: themeName },
          task: 'final',
          progress: 100,
          message: `Completed setup for ${team.name}`
        })
        completedSteps++
        
        // Update overall progress
        overallProgress = Math.round((completedSteps / totalSteps) * 100)
        progressCallback({
          type: 'overall',
          progress: overallProgress,
          message: {
            current: `Completed ${team.name}`,
            next: completedSteps < totalSteps ? 'Setting up next agent' : 'Finalizing setup'
          }
        })
      }
      
      progressCallback({
        type: 'complete',
        theme: { name: themeName, emoji: themeTeams[0].themeEmoji }
      })
    }
    
    // Generate docker-compose files for each theme
    await generateDockerComposeFiles(outputDir, teamsByTheme)
    
    // Generate launch scripts
    await generateLaunchScripts(outputDir, teams)
    
    logger.success('All teams generated successfully!')
    
  } catch (error) {
    progressCallback({
      type: 'error',
      message: error.message
    })
    throw error
  }
}

function groupTeamsByTheme(teams) {
  return teams.reduce((groups, team) => {
    const theme = team.theme || 'default'
    if (!groups[theme]) {
      groups[theme] = []
    }
    groups[theme].push(team)
    return groups
  }, {})
}

async function setupGitHooks(outputDir, characterConfig) {
  const fs = (await import('fs-extra')).default
  const gitHooksPath = path.join(outputDir, characterConfig.paths.gitHooks)
  
  await fs.ensureDir(gitHooksPath)
  
  // Prepare commit message hook
  const prepareCommitMsg = `#!/bin/bash
# Prepend emoji to commit messages
COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
if [ -z "$COMMIT_SOURCE" ]; then
  # Only for regular commits, not merges/amends
  echo "${characterConfig.emoji} ${characterConfig.name}: $(cat $COMMIT_MSG_FILE)" > $COMMIT_MSG_FILE
fi`
  
  await fs.writeFile(
    path.join(gitHooksPath, 'prepare-commit-msg'),
    prepareCommitMsg,
    { mode: 0o755 }
  )
  
  // Commit message validation hook
  const commitMsg = `#!/bin/bash
# Ensure emoji is present
COMMIT_MSG_FILE=$1
if ! grep -q "^${characterConfig.emoji}" "$COMMIT_MSG_FILE"; then
  echo "${characterConfig.emoji} ${characterConfig.name}: $(cat $COMMIT_MSG_FILE)" > $COMMIT_MSG_FILE
fi`
  
  await fs.writeFile(
    path.join(gitHooksPath, 'commit-msg'),
    commitMsg,
    { mode: 0o755 }
  )
}

async function generateDockerComposeFiles(outputDir, teamsByTheme) {
  const fs = (await import('fs-extra')).default
  const dockerDir = path.join(outputDir, 'docker')
  await fs.ensureDir(dockerDir)
  
  for (const [themeName, teams] of Object.entries(teamsByTheme)) {
    const services = {}
    
    teams.forEach(team => {
      const serviceName = team.id
      services[serviceName] = {
        build: {
          context: `../teams/team-${team.teamNumber}/${team.role || 'dev'}`,
          dockerfile: 'Dockerfile'
        },
        container_name: `${themeName.toLowerCase()}-${team.id}`,
        ports: [
          `${team.ports.backend}:${team.ports.backend}`,
          `${team.ports.frontend}:${team.ports.frontend}`
        ],
        environment: {
          NODE_ENV: 'development',
          AGENT_NAME: team.name,
          AGENT_EMOJI: team.emoji,
          BACKEND_PORT: team.ports.backend,
          FRONTEND_PORT: team.ports.frontend
        },
        networks: [team.dockerNetwork || `${themeName.toLowerCase()}-network`],
        volumes: [
          `${team.id}_data:/app/data`,
          `${team.id}_logs:/app/logs`
        ],
        restart: 'unless-stopped'
      }
    })
    
    const compose = {
      version: '3.8',
      services,
      networks: {
        [teams[0].dockerNetwork || `${themeName.toLowerCase()}-network`]: {
          driver: 'bridge'
        }
      },
      volumes: teams.reduce((vols, team) => {
        vols[`${team.id}_data`] = {}
        vols[`${team.id}_logs`] = {}
        return vols
      }, {})
    }
    
    await fs.writeFile(
      path.join(dockerDir, `docker-compose.${themeName.toLowerCase()}.yml`),
      `# Docker Compose for ${themeName} theme
# Generated by Agentic Team Generator
      
${JSON.stringify(compose, null, 2).replace(/"/g, '')}`
    )
  }
}

async function generateLaunchScripts(outputDir, teams) {
  const fs = (await import('fs-extra')).default
  const scriptsDir = path.join(outputDir, 'scripts')
  await fs.ensureDir(scriptsDir)
  
  // Launch all teams script
  const launchAll = `#!/bin/bash
# Launch all agentic teams - AgentVibes

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

clear

echo "================================================================================"
echo "AGENTVIBES MULTI-AGENT ORCHESTRATOR v1.0"
echo "================================================================================"
echo ""
echo "🔥 Starting all agentic teams..."
echo "📁 Working directory: $(pwd)"
echo "🎭 Teams to launch: ${teams.length}"
echo ""

echo "TEAM CONFIGURATION:"
${teams.map((team, index) => `echo "├─ ${index === teams.length - 1 ? '└─' : '├─'} ${team.emoji} ${team.name} (${team.theme}) - Ports: ${team.ports?.backend || 'N/A'}/${team.ports?.frontend || 'N/A'}"`).join('\n')}
echo ""

echo "🚀 LAUNCHING SEQUENCE:"
LAUNCH_PIDS=()

${teams.map((team, index) => `
echo "├─ ${index === teams.length - 1 ? '└─' : '├─'} Starting ${team.emoji} ${team.name}..."
cd teams/team-${team.teamNumber}/${team.role || 'dev'}
if [ -f "./launch" ]; then
    ./launch > ../../launch-team-${team.teamNumber}-${team.id}.log 2>&1 &
    LAUNCH_PIDS+=($!)
    echo "   📋 PID: $! | 📊 Log: teams/launch-team-${team.teamNumber || '1'}-${team.id}.log"
else
    echo "   ❌ Launch script not found for ${team.name}"
fi
cd ../../..
sleep 2
`).join('')}

echo ""
echo "⏳ Waiting for all services to start..."
sleep 10

echo ""
echo "🔍 HEALTH CHECK:"
HEALTHY_COUNT=0
${teams.map((team, index) => `
if curl -s http://localhost:${team.ports?.backend || 3000}/health > /dev/null 2>&1 || curl -s http://localhost:${team.ports?.backend || 3000} > /dev/null 2>&1; then
    echo "├─ ✅ ${team.emoji} ${team.name} - Backend healthy"
    HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
else
    echo "├─ ⚠️  ${team.emoji} ${team.name} - Starting up..."
fi`).join('\n')}

echo ""
echo "================================================================================"
if [ $HEALTHY_COUNT -eq ${teams.length} ]; then
    echo "🚀 ALL TEAMS LAUNCHED SUCCESSFULLY"
else
    echo "🔄 TEAMS STARTING ($HEALTHY_COUNT/${teams.length} ready)"
fi
echo "================================================================================"
echo ""

echo "ACCESS POINTS:"
${teams.map(team => `echo "├─ ${team.emoji} ${team.name}: http://${team.host || 'localhost'}:${team.ports?.frontend || 'N/A'}"`).join('\n')}
echo ""

echo "USEFUL COMMANDS:"
echo "├─ 🔍 Status check: ./scripts/status-check.sh"
echo "├─ 📊 View logs:    tail -f teams/launch-team-*.log"
echo "└─ 🛑 Stop all:     ./scripts/down-all-teams.sh"
echo ""

echo "💡 Powered by AgentVibes - https://github.com/paulpreibisch/AgentVibes"
echo "🐦 Follow: @997Fire"
echo ""
echo "================================================================================"
`
  
  await fs.writeFile(
    path.join(scriptsDir, 'launch-all-teams.sh'),
    launchAll,
    { mode: 0o755 }
  )
  
  // Down all teams script
  const downAll = `#!/bin/bash
# Stop all agentic teams - AgentVibes

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

clear

echo "================================================================================"
echo "AGENTVIBES SHUTDOWN ORCHESTRATOR v1.0"
echo "================================================================================"
echo ""
echo "🛑 Stopping all agentic teams..."
echo "📁 Working directory: $(pwd)"
echo "🎭 Teams to stop: ${teams.length}"
echo ""

echo "SHUTDOWN SEQUENCE:"
STOPPED_COUNT=0

${teams.map((team, index) => `
echo "├─ ${index === teams.length - 1 ? '└─' : '├─'} Stopping ${team.emoji} ${team.name}..."
cd teams/team-${team.teamNumber}/${team.role || 'dev'}
if [ -f "./down" ]; then
    if ./down > /dev/null 2>&1; then
        echo "   ✅ ${team.name} stopped successfully"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        echo "   ⚠️  ${team.name} may have already been stopped"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    fi
else
    echo "   ❌ Down script not found for ${team.name}"
fi
cd ../../..
`).join('')}

echo ""
echo "🧹 CLEANUP OPERATIONS:"
echo "├─ 🔍 Checking for lingering processes..."

# Kill any remaining processes on known ports
${teams.map(team => `
if lsof -ti:${team.ports?.backend || 3000} > /dev/null 2>&1; then
    echo "├─ 🔧 Cleaning up port ${team.ports?.backend || 3000} (${team.name})"
    lsof -ti:${team.ports?.backend || 3000} | xargs kill -9 2>/dev/null || true
fi
if lsof -ti:${team.ports?.frontend || 5000} > /dev/null 2>&1; then
    echo "├─ 🔧 Cleaning up port ${team.ports?.frontend || 5000} (${team.name})"
    lsof -ti:${team.ports?.frontend || 5000} | xargs kill -9 2>/dev/null || true
fi`).join('\n')}

echo "└─ ✅ Cleanup completed"
echo ""

echo "================================================================================"
if [ $STOPPED_COUNT -eq ${teams.length} ]; then
    echo "🛑 ALL TEAMS STOPPED SUCCESSFULLY"
else
    echo "⚠️  PARTIAL SHUTDOWN ($STOPPED_COUNT/${teams.length} stopped)"
fi
echo "================================================================================"
echo ""

echo "💡 Powered by AgentVibes - https://github.com/paulpreibisch/AgentVibes"
echo "🐦 Follow: @997Fire"
echo ""
echo "================================================================================"
`
  
  await fs.writeFile(
    path.join(scriptsDir, 'down-all-teams.sh'),
    downAll,
    { mode: 0o755 }
  )
  
  // Status check script
  const statusCheck = `#!/bin/bash
# Check status of all teams - AgentVibes

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

clear

echo "================================================================================"
echo "AGENTVIBES STATUS MONITOR v1.0"
echo "================================================================================"
echo ""
echo "📊 Checking status of all agentic teams..."
echo "📁 Working directory: $(pwd)"
echo "🎭 Teams to check: ${teams.length}"
echo ""

echo "TEAM STATUS:"
RUNNING_COUNT=0
TOTAL_COUNT=${teams.length}

${teams.map((team, index) => `
echo -n "├─ ${index === teams.length - 1 ? '└─' : '├─'} ${team.emoji} ${team.name}: "
if curl -s http://localhost:${team.ports?.backend || 3000}/health > /dev/null 2>&1 || curl -s http://localhost:${team.ports?.backend || 3000} > /dev/null 2>&1; then
    echo -e "\\\\$\{GREEN}✅ Running\\\\$\{NC} (Port: ${team.ports?.backend || 3000})"
    RUNNING_COUNT=$((RUNNING_COUNT + 1))
else
    echo -e "\\\\$\{RED}❌ Not running\\\\$\{NC} (Port: ${team.ports?.backend || 3000})"
fi`).join('\n')}

echo ""
echo "PORT USAGE:"
${teams.map(team => `
if lsof -i :${team.ports?.backend || 3000} > /dev/null 2>&1; then
    echo "├─ ✅ Port ${team.ports?.backend || 3000} (${team.name}) - In use"
else
    echo "├─ ⚪ Port ${team.ports?.backend || 3000} (${team.name}) - Available"
fi`).join('\n')}

echo ""
echo "================================================================================"
if [ $RUNNING_COUNT -eq $TOTAL_COUNT ]; then
    echo -e "\\\\$\{GREEN}🚀 ALL TEAMS RUNNING ($RUNNING_COUNT/$TOTAL_COUNT)\\\\$\{NC}"
elif [ $RUNNING_COUNT -gt 0 ]; then
    echo -e "\\\\$\{YELLOW}⚠️  PARTIAL OPERATION ($RUNNING_COUNT/$TOTAL_COUNT running)\\\\$\{NC}"
else
    echo -e "\\\\$\{RED}🛑 ALL TEAMS STOPPED (0/$TOTAL_COUNT running)\\\\$\{NC}"
fi
echo "================================================================================"
echo ""

echo "USEFUL COMMANDS:"
echo "├─ 🚀 Start all:    ./scripts/launch-all-teams.sh"
echo "├─ 🛑 Stop all:     ./scripts/down-all-teams.sh"
echo "└─ 📊 Check again:  ./scripts/status-check.sh"
echo ""

echo "💡 Powered by AgentVibes - https://github.com/paulpreibisch/AgentVibes"
echo "🐦 Follow: @997Fire"
echo ""
echo "================================================================================"
`
  
  await fs.writeFile(
    path.join(scriptsDir, 'status-check.sh'),
    statusCheck,
    { mode: 0o755 }
  )
}

async function simulateGeneration(teams, config, progressCallback) {
  // Dry run simulation
  logger.info('\n=== DRY RUN RESULTS ===\n')
  logger.info('The following would be created:')
  
  // Call progress callback to indicate start
  progressCallback({
    type: 'start',
    theme: { name: 'All Themes', emoji: '🎭' }
  })
  
  teams.forEach((team, index) => {
    logger.info(`\n${team.emoji} ${team.name}:`)
    logger.info(`  - Directory: teams/team-${team.teamNumber}/${team.role || 'dev'}/`)
    logger.info(`  - CLAUDE.md with personality traits`)
    logger.info(`  - .mcp.json configuration`)
    logger.info(`  - Git hooks for emoji commits`)
    logger.info(`  - Ports: Backend ${team.ports.backend}, Frontend ${team.ports.frontend}`)
    if (config.repoUrl) {
      logger.info(`  - Clone repository: ${config.repoUrl}`)
    }
  })
  
  logger.info('\nDocker compose files for each theme')
  logger.info('Launch scripts in scripts/')
  
  if (config.projectBoard) {
    logger.info('\nGitHub Projects board with automation')
  }
  
  logger.info('\n=== END DRY RUN ===\n')
}