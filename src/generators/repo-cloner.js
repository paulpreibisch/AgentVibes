import simpleGit from 'simple-git'
import { execAsync } from '../utils/exec-utils.js'
import { logger } from '../utils/logger.js'
import fs from 'fs-extra'
import path from 'path'

export async function cloneRepository(repoUrl, targetPath, options = {}) {
  const { authMethod, branch, agentName } = options
  
  try {
    // Check if directory already has a git repo
    if (await fs.exists(path.join(targetPath, '.git'))) {
      logger.warn(`Directory ${targetPath} already contains a git repository`)
      return
    }
    
    // Ensure the parent directory exists
    await fs.ensureDir(path.dirname(targetPath))
    
    // Check if target directory exists and is not empty (excluding hidden files)
    if (await fs.exists(targetPath)) {
      const files = await fs.readdir(targetPath)
      const visibleFiles = files.filter(f => !f.startsWith('.'))
      
      if (visibleFiles.length > 0) {
        // Log what we found and check if it looks like a git repository
        logger.warn(`Directory ${targetPath} is not empty. Found files: ${visibleFiles.join(', ')}`)
        
        // Check if this looks like an already cloned repo (has typical repo files)
        const repoIndicators = ['package.json', 'README.md', 'src', 'backend', 'frontend', 'docker-compose.yml']
        const hasRepoFiles = visibleFiles.some(f => repoIndicators.includes(f))
        
        if (hasRepoFiles) {
          logger.info(`Directory appears to contain repository files. Skipping clone.`)
          return
        } else {
          // These look like template files, remove them and proceed with clone
          logger.info(`Removing template files to proceed with repository clone...`)
          for (const file of visibleFiles) {
            await fs.remove(path.join(targetPath, file))
          }
        }
      }
    }
    
    // Determine clone method based on auth
    let cloneUrl = repoUrl
    let cloneCommand = ''
    
    switch (authMethod) {
      case 'gh':
        // Use GitHub CLI
        const repoPath = repoUrl.replace('https://github.com/', '').replace('.git', '')
        cloneCommand = `gh repo clone ${repoPath} ${targetPath}`
        if (branch) {
          cloneCommand += ` -- --branch ${branch}`
        }
        break
        
      case 'ssh':
        // Convert to SSH URL using the SSH config
        if (repoUrl.startsWith('https://github.com/')) {
          cloneUrl = repoUrl.replace('https://github.com/', 'git@github.com-preibisch:')
        } else if (repoUrl.startsWith('git@github.com:')) {
          cloneUrl = repoUrl.replace('git@github.com:', 'git@github.com-preibisch:')
        }
        break
        
      case 'token':
        // Token will be handled via git config
        break
        
      case 'public':
      default:
        // Use HTTPS URL as-is
        break
    }
    
    // Clone the repository
    if (cloneCommand) {
      // Use GitHub CLI
      logger.info(`Cloning repository for ${agentName} using GitHub CLI...`)
      await execAsync(cloneCommand)
    } else {
      // Use simple-git
      const branchInfo = branch ? ` (branch: ${branch})` : ''
      logger.info(`Cloning repository for ${agentName}${branchInfo}...`)
      const git = simpleGit()
      
      const cloneOptions = ['--depth', '1']
      if (branch) {
        cloneOptions.push('--branch', branch)
      }
      
      await git.clone(cloneUrl, targetPath, cloneOptions)
    }
    
    // Remove existing git hooks to replace with our own
    const hooksDir = path.join(targetPath, '.git', 'hooks')
    const existingHooks = await fs.readdir(hooksDir)
    for (const hook of existingHooks) {
      if (!hook.endsWith('.sample')) {
        await fs.remove(path.join(hooksDir, hook))
      }
    }
    
    logger.success(`Repository cloned successfully for ${agentName}`)
    
  } catch (error) {
    logger.error(`Failed to clone repository: ${error.message}`)
    throw error
  }
}

export async function setupGitConfig(targetPath, agentConfig) {
  const git = simpleGit(targetPath)
  
  // Set user name and email for the agent
  await git.addConfig('user.name', agentConfig.name)
  await git.addConfig('user.email', `${agentConfig.id}@agentic-team.local`)
  
  // Set commit template if needed
  const commitTemplate = path.join(targetPath, '.gitmessage')
  await fs.writeFile(
    commitTemplate,
    `${agentConfig.emoji} ${agentConfig.name}: 

# Team ${agentConfig.teamNumber} - ${agentConfig.theme}
# Character: ${agentConfig.description}
`
  )
  
  await git.addConfig('commit.template', commitTemplate)
}