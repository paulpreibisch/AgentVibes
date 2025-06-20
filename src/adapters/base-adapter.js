/**
 * AgentVibes - Base Adapter Interface
 * Copyright 2024 Paul Preibisch
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export class BaseAdapter {
  constructor(type, config = {}) {
    this.type = type
    this.config = config
  }

  /**
   * Get available actions for this adapter
   * @returns {Array} Array of available actions
   */
  getAvailableActions() {
    throw new Error(`getAvailableActions() must be implemented by ${this.type} adapter`)
  }

  /**
   * Execute an action
   * @param {string} action - Action to execute
   * @param {Object} options - Action options
   * @returns {Promise<Object>} Action result
   */
  async executeAction(action, options = {}) {
    throw new Error(`executeAction() must be implemented by ${this.type} adapter`)
  }

  /**
   * Get project status/information
   * @returns {Promise<Object>} Project status
   */
  async getProjectStatus() {
    throw new Error(`getProjectStatus() must be implemented by ${this.type} adapter`)
  }

  /**
   * Validate project configuration
   * @returns {Promise<Object>} Validation result
   */
  async validateConfiguration() {
    throw new Error(`validateConfiguration() must be implemented by ${this.type} adapter`)
  }

  /**
   * Get project metadata
   * @returns {Promise<Object>} Project metadata
   */
  async getProjectMetadata() {
    return {
      type: this.type,
      config: this.config,
      adapter: this.constructor.name,
      timestamp: new Date().toISOString()
    }
  }
}