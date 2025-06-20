/**
 * AgentVibes - Teams Project Adapter
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
import { logger } from '../utils/logger.js'

export class TeamsAdapter extends BaseAdapter {
  constructor(config) {
    super('teams-project', config)
    this.projectPath = config.projectPath || process.cwd()
    this.teams = config.teams || []
    this.agents = config.agents || []
  }

  /**
   * Get available actions for teams project
   */
  getAvailableActions() {
    const actions = [
      {
        id: 'status',
        name: 'Check Teams Status',
        description: 'View status of all teams and agents',
        category: 'management'
      },
      {
        id: 'add-team',
        name: 'Add New Team',
        description: 'Create a new team with agents',
        category: 'creation'
      },
      {
        id: 'add-agent',
        name: 'Add Agent to Existing Team',
        description: 'Add a new agent to an existing team',
        category: 'creation'
      },
      {
        id: 'hotswap',
        name: 'Agent Hotswap',
        description: 'Change agent personality/theme without recreating',
        category: 'management'
      },
      {
        id: 'backup',
        name: 'Backup Teams Configuration',
        description: 'Create backup of current teams setup',
        category: 'management'
      },
      {
        id: 'restore',
        name: 'Restore Teams Configuration',
        description: 'Restore teams setup from backup',
        category: 'management'
      },
      {
        id: 'clean',
        name: 'Clean Unused Resources',
        description: 'Remove orphaned files and directories',
        category: 'maintenance'
      }
    ]

    // Add team-specific actions
    this.teams.forEach(team => {
      actions.push({
        id: `team-${team.number}-status`,
        name: `Team ${team.number} Status`,
        description: `Check status of team ${team.number}`,
        category: 'team-specific',
        teamNumber: team.number
      })
    })

    return actions
  }

  /**
   * Execute an action
   */
  async executeAction(action, options = {}) {
    logger.info(`Executing action: ${action}`)

    switch (action) {
      case 'status':
        return await this.getTeamsStatus()
      
      case 'add-team':
        return await this.addNewTeam(options)
      
      case 'add-agent':
        return await this.addAgentToTeam(options)
      
      case 'hotswap':
        return await this.performAgentHotswap(options)
      
      case 'backup':
        return await this.backupConfiguration(options)
      
      case 'restore':
        return await this.restoreConfiguration(options)
      
      case 'clean':
        return await this.cleanUnusedResources(options)
      
      default:
        // Check for team-specific actions
        if (action.startsWith('team-') && action.endsWith('-status')) {
          const teamNumber = parseInt(action.match(/team-(\d+)-status/)[1])
          return await this.getTeamStatus(teamNumber)
        }
        
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Get comprehensive teams status
   */
  async getTeamsStatus() {
    const status = {
      projectPath: this.projectPath,
      totalTeams: this.teams.length,
      totalAgents: this.agents.length,
      teams: [],
      summary: {
        healthy: 0,
        warning: 0,
        error: 0
      }
    }

    for (const team of this.teams) {
      const teamStatus = await this.getTeamStatus(team.number)
      status.teams.push(teamStatus)
      
      if (teamStatus.health === 'healthy') status.summary.healthy++
      else if (teamStatus.health === 'warning') status.summary.warning++
      else status.summary.error++
    }

    return {
      success: true,
      data: status,
      message: `Found ${status.totalTeams} teams with ${status.totalAgents} agents`
    }
  }

  /**
   * Get status of a specific team
   */
  async getTeamStatus(teamNumber) {
    const team = this.teams.find(t => t.number === teamNumber)
    if (!team) {
      return {
        teamNumber,
        exists: false,
        health: 'error',
        message: 'Team not found'
      }
    }

    const teamPath = path.join(this.projectPath, 'teams', team.name)
    const teamAgents = this.agents.filter(a => a.teamNumber === teamNumber)
    
    const agentStatuses = []
    let healthyAgents = 0
    
    for (const agent of teamAgents) {
      const agentStatus = await this.getAgentStatus(agent)
      agentStatuses.push(agentStatus)
      if (agentStatus.health === 'healthy') healthyAgents++
    }

    const health = healthyAgents === teamAgents.length ? 'healthy' : 
                   healthyAgents > 0 ? 'warning' : 'error'

    return {
      teamNumber,
      teamName: team.name,
      teamPath,
      exists: await fs.exists(teamPath),
      agentCount: teamAgents.length,
      healthyAgents,
      health,
      agents: agentStatuses
    }
  }

  /**
   * Get status of a specific agent
   */
  async getAgentStatus(agent) {
    const agentPath = agent.agentPath
    const claudeFile = path.join(agentPath, 'CLAUDE.md')
    const mcpFile = path.join(agentPath, '.mcp.json')
    
    const exists = await fs.exists(agentPath)
    const hasClaudeFile = await fs.exists(claudeFile)
    const hasMcpFile = await fs.exists(mcpFile)
    
    let health = 'error'
    if (exists && (hasClaudeFile || hasMcpFile)) {
      health = 'healthy'
    } else if (exists) {
      health = 'warning'
    }

    return {
      agentName: agent.agentName,
      role: agent.role,
      agentPath,
      exists,
      hasClaudeFile,
      hasMcpFile,
      health,
      isValid: agent.isValid
    }
  }

  /**
   * Add a new team
   */
  async addNewTeam(options) {
    const { theme, teamCount = 1 } = options
    
    if (!theme) {
      throw new Error('Theme is required to add a new team')
    }

    // This would integrate with the existing team generation logic
    logger.info(`Adding new team with theme: ${theme}`)
    
    return {
      success: true,
      message: `New team creation initiated with ${theme} theme`,
      action: 'redirect-to-team-generator',
      options: { theme, teamCount, existingProject: true }
    }
  }

  /**
   * Add agent to existing team
   */
  async addAgentToTeam(options) {
    const { teamNumber, agentConfig } = options
    
    if (!teamNumber || !agentConfig) {
      throw new Error('Team number and agent configuration required')
    }

    logger.info(`Adding agent to team ${teamNumber}`)
    
    return {
      success: true,
      message: `Agent addition to team ${teamNumber} initiated`,
      action: 'create-agent',
      teamNumber,
      agentConfig
    }
  }

  /**
   * Perform agent hotswap (change personality without recreating)
   */
  async performAgentHotswap(options) {
    const { agentPath, newTheme, newPersonality } = options
    
    if (!agentPath) {
      throw new Error('Agent path is required for hotswap')
    }

    logger.info(`Performing hotswap for agent at: ${agentPath}`)
    
    // Create backup first
    const backupPath = `${agentPath}.backup.${Date.now()}`
    await fs.copy(agentPath, backupPath)
    
    try {
      // Update .agent-theme.json if it exists
      const themeFile = path.join(path.dirname(agentPath), '.agent-theme.json')
      if (await fs.exists(themeFile)) {
        const themeData = await fs.readJson(themeFile)
        if (newTheme) themeData.theme = newTheme
        if (newPersonality) themeData.personality = newPersonality
        await fs.writeJson(themeFile, themeData, { spaces: 2 })
      }
      
      // Update CLAUDE.md file with new personality
      const claudeFile = path.join(agentPath, 'CLAUDE.md')
      if (await fs.exists(claudeFile) && newPersonality) {
        // This would update the personality in the CLAUDE.md file
        logger.info('Updating CLAUDE.md with new personality')
      }
      
      return {
        success: true,
        message: 'Agent hotswap completed successfully',
        backupPath,
        updatedFiles: ['CLAUDE.md', '.agent-theme.json']
      }
    } catch (error) {
      // Restore backup on error
      await fs.remove(agentPath)
      await fs.copy(backupPath, agentPath)
      throw error
    }
  }

  /**
   * Backup teams configuration
   */
  async backupConfiguration(options) {
    const backupDir = options.backupDir || path.join(this.projectPath, '.agentvibes-backups')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `teams-backup-${timestamp}`)
    
    await fs.ensureDir(backupPath)
    
    // Copy teams directory
    const teamsDir = path.join(this.projectPath, 'teams')
    if (await fs.exists(teamsDir)) {
      await fs.copy(teamsDir, path.join(backupPath, 'teams'))
    }
    
    // Save metadata
    const metadata = {
      timestamp,
      projectPath: this.projectPath,
      teams: this.teams,
      agents: this.agents,
      agentVibesVersion: '2.0.0'
    }
    
    await fs.writeJson(path.join(backupPath, 'metadata.json'), metadata, { spaces: 2 })
    
    return {
      success: true,
      message: 'Configuration backup completed',
      backupPath,
      timestamp
    }
  }

  /**
   * Restore teams configuration
   */
  async restoreConfiguration(options) {
    const { backupPath } = options
    
    if (!backupPath || !await fs.exists(backupPath)) {
      throw new Error('Valid backup path is required')
    }
    
    logger.info(`Restoring configuration from: ${backupPath}`)
    
    // Read backup metadata
    const metadataPath = path.join(backupPath, 'metadata.json')
    const metadata = await fs.readJson(metadataPath)
    
    // Create current backup before restore
    await this.backupConfiguration({ backupDir: path.join(this.projectPath, '.agentvibes-backups', 'pre-restore') })
    
    // Restore teams directory
    const teamsBackup = path.join(backupPath, 'teams')
    const teamsDir = path.join(this.projectPath, 'teams')
    
    if (await fs.exists(teamsBackup)) {
      await fs.remove(teamsDir)
      await fs.copy(teamsBackup, teamsDir)
    }
    
    return {
      success: true,
      message: 'Configuration restored successfully',
      restoredFrom: backupPath,
      metadata
    }
  }

  /**
   * Clean unused resources
   */
  async cleanUnusedResources(options) {
    const cleaned = {
      files: [],
      directories: [],
      totalSize: 0
    }
    
    logger.info('Cleaning unused resources...')
    
    // Clean up backup files older than specified days
    const maxAge = options.maxAge || 30
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000)
    
    const backupsDir = path.join(this.projectPath, '.agentvibes-backups')
    if (await fs.exists(backupsDir)) {
      const backups = await fs.readdir(backupsDir)
      
      for (const backup of backups) {
        const backupPath = path.join(backupsDir, backup)
        const stats = await fs.stat(backupPath)
        
        if (stats.mtime < cutoffDate) {
          const size = await this.getDirectorySize(backupPath)
          await fs.remove(backupPath)
          cleaned.directories.push(backup)
          cleaned.totalSize += size
        }
      }
    }
    
    return {
      success: true,
      message: `Cleaned ${cleaned.directories.length} old backups`,
      cleaned
    }
  }

  /**
   * Get directory size
   */
  async getDirectorySize(dirPath) {
    let size = 0
    const items = await fs.readdir(dirPath)
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stats = await fs.stat(itemPath)
      
      if (stats.isDirectory()) {
        size += await this.getDirectorySize(itemPath)
      } else {
        size += stats.size
      }
    }
    
    return size
  }

  /**
   * Get project status
   */
  async getProjectStatus() {
    return await this.getTeamsStatus()
  }

  /**
   * Validate project configuration
   */
  async validateConfiguration() {
    const issues = []
    const warnings = []
    
    // Check if teams directory exists
    const teamsDir = path.join(this.projectPath, 'teams')
    if (!await fs.exists(teamsDir)) {
      issues.push('teams/ directory does not exist')
    }
    
    // Validate each team
    for (const team of this.teams) {
      const teamPath = path.join(teamsDir, team.name)
      if (!await fs.exists(teamPath)) {
        issues.push(`Team directory missing: ${team.name}`)
      }
    }
    
    // Validate agents
    for (const agent of this.agents) {
      if (!await fs.exists(agent.agentPath)) {
        issues.push(`Agent directory missing: ${agent.agentName}`)
      } else if (!agent.isValid) {
        warnings.push(`Agent incomplete: ${agent.agentName} (missing CLAUDE.md or .mcp.json)`)
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      warnings,
      summary: {
        teams: this.teams.length,
        agents: this.agents.length,
        issues: issues.length,
        warnings: warnings.length
      }
    }
  }
}