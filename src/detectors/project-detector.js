/**
 * AgentVibes - Universal Project Detection Framework
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { TeamsDetector } from './teams-detector.js'
import { NewProjectDetector } from './new-project-detector.js'
import { logger } from '../utils/logger.js'

export class ProjectDetector {
  constructor() {
    this.detectors = [
      new TeamsDetector(),
      new NewProjectDetector()
    ]
  }

  /**
   * Detect project type and configuration
   * @param {string} directory - Directory to scan
   * @returns {Promise<Object>} Detection result with type and config
   */
  async detectProject(directory) {
    logger.info(`Detecting project type in: ${directory}`)
    
    const results = []
    
    for (const detector of this.detectors) {
      try {
        const result = await detector.detect(directory)
        if (result.detected) {
          results.push({
            type: detector.type,
            confidence: result.confidence,
            config: result.config,
            metadata: result.metadata
          })
        }
      } catch (error) {
        logger.error(`Error in ${detector.type} detector:`, error.message)
      }
    }
    
    // Sort by confidence score (highest first)
    results.sort((a, b) => b.confidence - a.confidence)
    
    if (results.length === 0) {
      return {
        type: 'unknown',
        confidence: 0,
        config: {},
        metadata: {
          message: 'No compatible project structure detected'
        }
      }
    }
    
    const bestMatch = results[0]
    logger.info(`Detected project type: ${bestMatch.type} (confidence: ${bestMatch.confidence})`)
    
    return bestMatch
  }

  /**
   * Get all detection results for comparison
   * @param {string} directory - Directory to scan
   * @returns {Promise<Array>} All detection results
   */
  async getAllDetectionResults(directory) {
    const results = []
    
    for (const detector of this.detectors) {
      try {
        const result = await detector.detect(directory)
        results.push({
          type: detector.type,
          detected: result.detected,
          confidence: result.confidence,
          config: result.config,
          metadata: result.metadata
        })
      } catch (error) {
        results.push({
          type: detector.type,
          detected: false,
          confidence: 0,
          error: error.message
        })
      }
    }
    
    return results
  }
}