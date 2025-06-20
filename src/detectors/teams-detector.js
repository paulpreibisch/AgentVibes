/**
 * AgentVibes - Teams Structure Detector
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
import { logger } from '../utils/logger.js'

export class TeamsDetector {
  constructor() {
    this.type = 'teams-project'
  }

  /**
   * Detect teams/team-N structure
   * @param {string} directory - Directory to scan
   * @returns {Promise<Object>} Detection result
   */
  async detect(directory) {
    const teamsDir = path.join(directory, 'teams')
    
    if (!await fs.exists(teamsDir)) {
      return {
        detected: false,
        confidence: 0,
        config: {},
        metadata: { reason: 'No teams/ directory found' }
      }
    }
    
    const teamDirs = await this.scanTeamDirectories(teamsDir)
    
    if (teamDirs.length === 0) {
      return {
        detected: false,
        confidence: 0.2,
        config: {},
        metadata: { reason: 'teams/ directory exists but no team-N subdirectories found' }
      }
    }
    
    const agents = await this.scanAgents(teamsDir, teamDirs)
    const agentThemes = await this.detectAgentThemes(teamsDir, teamDirs)
    
    // Calculate confidence based on structure quality
    let confidence = 0.6 // Base confidence for teams/ structure
    
    // Bonus for .agent-theme.json files
    if (agentThemes.length > 0) confidence += 0.2
    
    // Bonus for multiple teams
    if (teamDirs.length > 1) confidence += 0.1
    
    // Bonus for proper agent directories
    if (agents.length > 0) confidence += 0.1
    
    confidence = Math.min(confidence, 1.0)
    
    return {
      detected: true,
      confidence,
      config: {
        type: 'teams-project',
        teams: teamDirs,
        agents,
        agentThemes,
        totalTeams: teamDirs.length,
        totalAgents: agents.length
      },
      metadata: {
        teamsDirectory: teamsDir,
        structure: 'teams/team-N',
        hasThemeFiles: agentThemes.length > 0,
        teamNumbers: teamDirs.map(t => t.number).sort()
      }
    }
  }

  /**
   * Scan for team-N directories
   * @param {string} teamsDir - Teams directory path
   * @returns {Promise<Array>} Array of team directory info
   */
  async scanTeamDirectories(teamsDir) {
    const items = await fs.readdir(teamsDir)
    const teamDirs = []
    
    for (const item of items) {
      const itemPath = path.join(teamsDir, item)
      const stats = await fs.stat(itemPath)
      
      if (stats.isDirectory() && item.match(/^team-(\d+)$/)) {
        const teamNumber = parseInt(item.match(/^team-(\d+)$/)[1])
        teamDirs.push({
          name: item,
          number: teamNumber,
          path: itemPath
        })
      }
    }
    
    return teamDirs.sort((a, b) => a.number - b.number)
  }

  /**
   * Scan for agents within team directories
   * @param {string} teamsDir - Teams directory path
   * @param {Array} teamDirs - Team directory info
   * @returns {Promise<Array>} Array of agent info
   */
  async scanAgents(teamsDir, teamDirs) {
    const agents = []
    
    for (const teamDir of teamDirs) {
      const teamPath = teamDir.path
      
      try {
        const agentDirs = await fs.readdir(teamPath)
        
        for (const agentDir of agentDirs) {
          const agentPath = path.join(teamPath, agentDir)
          const stats = await fs.stat(agentPath)
          
          if (stats.isDirectory()) {
            // Check for CLAUDE.md to confirm it's an agent directory
            const claudePath = path.join(agentPath, 'CLAUDE.md')
            const mcpPath = path.join(agentPath, '.mcp.json')
            
            const hasClaudeFile = await fs.exists(claudePath)
            const hasMcpFile = await fs.exists(mcpPath)
            
            // Parse agent info from directory name (e.g., dev__neo, testing__trinity)
            const agentInfo = this.parseAgentDirectory(agentDir)
            
            agents.push({
              teamNumber: teamDir.number,
              teamName: teamDir.name,
              agentDirectory: agentDir,
              agentPath,
              role: agentInfo.role,
              agentName: agentInfo.name,
              hasClaudeFile,
              hasMcpFile,
              isValid: hasClaudeFile || hasMcpFile
            })
          }
        }
      } catch (error) {
        logger.warn(`Could not scan team directory ${teamDir.name}:`, error.message)
      }
    }
    
    return agents
  }

  /**
   * Parse agent directory name to extract role and name
   * @param {string} dirName - Directory name (e.g., dev__neo, testing__trinity)
   * @returns {Object} Parsed role and name
   */
  parseAgentDirectory(dirName) {
    // Handle both new format (dev__neo) and legacy format (dev-neo)
    const patterns = [
      /^(dev|testing)__(.+)$/,     // New format: dev__neo, testing__trinity
      /^(dev|testing)-(.+)$/,      // Legacy format: dev-neo, testing-trinity
      /^(.+)$/                     // Fallback: just the name
    ]
    
    for (const pattern of patterns) {
      const match = dirName.match(pattern)
      if (match) {
        if (match.length === 3) {
          return {
            role: match[1],
            name: match[2]
          }
        } else {
          return {
            role: 'dev', // Default role
            name: match[1]
          }
        }
      }
    }
    
    return {
      role: 'dev',
      name: dirName
    }
  }

  /**
   * Detect .agent-theme.json files
   * @param {string} teamsDir - Teams directory path
   * @param {Array} teamDirs - Team directory info
   * @returns {Promise<Array>} Array of theme file info
   */
  async detectAgentThemes(teamsDir, teamDirs) {
    const themes = []
    
    for (const teamDir of teamDirs) {
      const themeFile = path.join(teamDir.path, '.agent-theme.json')
      
      if (await fs.exists(themeFile)) {
        try {
          const themeData = await fs.readJson(themeFile)
          themes.push({
            teamNumber: teamDir.number,
            teamName: teamDir.name,
            themePath: themeFile,
            themeData
          })
        } catch (error) {
          logger.warn(`Could not read theme file ${themeFile}:`, error.message)
        }
      }
    }
    
    return themes
  }
}