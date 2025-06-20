import path from 'path'
import fs from 'fs-extra'

export async function generateFolderStructure(outputDir, characterConfig, options = {}) {
  const agentRoot = path.join(outputDir, characterConfig.paths.root)
  
  // Create main agent directory
  await fs.ensureDir(agentRoot)
  
  // Create subdirectories - but skip .git/hooks if git repo already exists
  const subdirs = [
    '.claude/commands',
    'src',
    'tests',
    'docs',
    'config',
    'scripts'
  ]
  
  // Only add .git/hooks if no git repository exists yet
  const gitDir = path.join(agentRoot, '.git')
  const hasGitRepo = await fs.exists(gitDir)
  
  if (!hasGitRepo) {
    subdirs.push('.git/hooks')
  }
  
  for (const subdir of subdirs) {
    const fullPath = path.join(agentRoot, subdir)
    
    // Skip if directory already exists and skipIfExists is true
    if (options.skipIfExists && await fs.exists(fullPath)) {
      continue
    }
    
    await fs.ensureDir(fullPath)
  }
  
  // Create .gitkeep files to preserve empty directories (only if they don't already exist)
  const gitkeepDirs = ['src', 'tests', 'docs', 'config']
  for (const dir of gitkeepDirs) {
    const gitkeepPath = path.join(agentRoot, dir, '.gitkeep')
    const dirPath = path.join(agentRoot, dir)
    
    // Only create .gitkeep if directory exists and doesn't already have a .gitkeep
    if (await fs.exists(dirPath) && !await fs.exists(gitkeepPath)) {
      // Check if directory is empty (excluding .gitkeep files)
      const files = await fs.readdir(dirPath)
      const nonGitkeepFiles = files.filter(f => f !== '.gitkeep')
      
      // Only add .gitkeep if directory is empty or only has .gitkeep files
      if (nonGitkeepFiles.length === 0) {
        await fs.writeFile(gitkeepPath, '# This file preserves the directory structure\n')
      }
    }
  }
  
  return agentRoot
}