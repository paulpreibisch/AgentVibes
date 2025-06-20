/**
 * AgentVibes - New Project Detector
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

export class NewProjectDetector {
  constructor() {
    this.type = 'new-project'
  }

  /**
   * Detect if directory is suitable for new project creation
   * @param {string} directory - Directory to scan
   * @returns {Promise<Object>} Detection result
   */
  async detect(directory) {
    // Check if directory exists
    if (!await fs.exists(directory)) {
      return {
        detected: false,
        confidence: 0,
        config: {},
        metadata: { reason: 'Directory does not exist' }
      }
    }
    
    const items = await this.scanDirectory(directory)
    
    // If directory is completely empty, it's perfect for new project
    if (items.totalFiles === 0 && items.totalDirectories === 0) {
      return {
        detected: true,
        confidence: 1.0,
        config: {
          type: 'new-project',
          setup: 'empty-directory',
          recommended: 'create-teams-structure'
        },
        metadata: {
          reason: 'Empty directory - ideal for new teams/ project',
          path: directory,
          isEmpty: true
        }
      }
    }
    
    // Check for conflicting structures
    const hasConflicts = this.checkForConflicts(items)
    
    if (hasConflicts.hasConflicts) {
      return {
        detected: false,
        confidence: 0,
        config: {},
        metadata: {
          reason: 'Directory contains conflicting structure',
          conflicts: hasConflicts.conflicts,
          suggestion: 'Use a different directory or clean up existing files'
        }
      }
    }
    
    // Directory has some files but no conflicts - could work for new project
    const confidence = this.calculateNewProjectConfidence(items)
    
    if (confidence < 0.3) {
      return {
        detected: false,
        confidence,
        config: {},
        metadata: {
          reason: 'Directory not suitable for new teams/ project',
          items: items.summary
        }
      }
    }
    
    return {
      detected: true,
      confidence,
      config: {
        type: 'new-project',
        setup: 'existing-directory',
        recommended: 'create-teams-structure-alongside'
      },
      metadata: {
        reason: 'Directory suitable for new teams/ project creation',
        path: directory,
        existingItems: items.summary,
        canCoexist: true
      }
    }
  }

  /**
   * Scan directory contents
   * @param {string} directory - Directory to scan
   * @returns {Promise<Object>} Directory contents summary
   */
  async scanDirectory(directory) {
    const items = await fs.readdir(directory)
    const contents = {
      files: [],
      directories: [],
      hiddenFiles: [],
      totalFiles: 0,
      totalDirectories: 0,
      summary: {}
    }
    
    for (const item of items) {
      const itemPath = path.join(directory, item)
      const stats = await fs.stat(itemPath)
      
      if (stats.isDirectory()) {
        contents.directories.push(item)
        contents.totalDirectories++
      } else {
        if (item.startsWith('.')) {
          contents.hiddenFiles.push(item)
        } else {
          contents.files.push(item)
        }
        contents.totalFiles++
      }
    }
    
    // Create summary for easy analysis
    contents.summary = {
      totalItems: contents.totalFiles + contents.totalDirectories,
      files: contents.files.length,
      directories: contents.directories.length,
      hiddenFiles: contents.hiddenFiles.length,
      hasPackageJson: contents.files.includes('package.json'),
      hasDockerCompose: contents.files.some(f => f.startsWith('docker-compose')),
      hasGitRepo: contents.directories.includes('.git'),
      hasNodeModules: contents.directories.includes('node_modules'),
      directories: contents.directories,
      files: contents.files.slice(0, 10) // Show first 10 files
    }
    
    return contents
  }

  /**
   * Check for structures that would conflict with teams/ setup
   * @param {Object} items - Directory contents
   * @returns {Object} Conflict analysis
   */
  checkForConflicts(items) {
    const conflicts = []
    
    // Check for existing teams/ directory with different structure
    if (items.directories.includes('teams')) {
      conflicts.push({
        type: 'teams-directory-exists',
        message: 'teams/ directory already exists - need to analyze compatibility'
      })
    }
    
    // Check for legacy agents/ directory
    if (items.directories.includes('agents')) {
      conflicts.push({
        type: 'legacy-agents-directory',
        message: 'Legacy agents/ directory found - migration needed'
      })
    }
    
    // Check for existing AgentVibes project markers
    if (items.files.includes('.agentvibes-project.json')) {
      conflicts.push({
        type: 'existing-agentvibes-project',
        message: 'Existing AgentVibes project detected'
      })
    }
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    }
  }

  /**
   * Calculate confidence for new project suitability
   * @param {Object} items - Directory contents
   * @returns {number} Confidence score (0-1)
   */
  calculateNewProjectConfidence(items) {
    let confidence = 0.8 // Base confidence for non-empty directory
    
    // Reduce confidence based on existing content
    if (items.totalFiles > 10) confidence -= 0.2
    if (items.totalDirectories > 5) confidence -= 0.2
    
    // Bonus for project-like structure that could coexist
    if (items.summary.hasPackageJson) confidence += 0.1
    if (items.summary.hasGitRepo) confidence += 0.1
    
    // Penalty for messy directories
    if (items.summary.hasNodeModules) confidence -= 0.1
    if (items.totalFiles > 50) confidence -= 0.3
    
    return Math.max(0, Math.min(1, confidence))
  }
}