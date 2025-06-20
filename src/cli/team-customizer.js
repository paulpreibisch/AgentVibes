import chalk from 'chalk'
import inquirer from 'inquirer'
import boxen from 'boxen'

export async function customizeTeams(selectedThemes, loadThemes) {
  const allTeams = []
  let themesToProcess = [...selectedThemes]
  
  while (themesToProcess.length > 0) {
    const theme = themesToProcess.shift()
    
    console.log('\n' + chalk.bold(`${theme.emoji} ${theme.name} Theme`))
    console.log(chalk.yellow('💡 Select which characters will join your development team'))
    console.log(chalk.yellow('   Each character brings unique skills and personality traits'))
    console.log(chalk.yellow('\n[↑↓] Navigate  [Space] Toggle  [Enter] Continue\n'))
    
    // Show available characters and let user select which ones to include
    const { selectedAgents } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedAgents',
        message: `Select characters:`,
        choices: theme.agents.map(agent => ({
          name: `${agent.emoji} ${agent.name} - ${agent.description}`,
          value: agent,
          checked: false // Start with none selected
        })),
        loop: false,
        validate: (answer) => {
          if (answer.length < 1) {
            return 'You must select at least one character.'
          }
          return true
        }
      }
    ])
    
    console.log() // Add spacing
    
    // Ask if they want to customize the selected characters
    const { shouldCustomize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldCustomize',
        message: 'Would you like to customize these characters?',
        default: false
      }
    ])
    
    let finalAgents = selectedAgents
    
    if (shouldCustomize) {
      const { customizeChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'customizeChoice',
          message: 'What would you like to do?',
          choices: [
            { name: '✏️  Edit character details', value: 'edit' },
            { name: '➕ Add custom character', value: 'add' },
            { name: '🔧 Modify ports/hosts', value: 'ports' }
          ]
        }
      ])
      
      switch (customizeChoice) {
        case 'edit':
          finalAgents = await editCharacters(finalAgents, theme)
          break
        case 'add':
          finalAgents = await addCharacter(finalAgents, theme)
          break
        case 'ports':
          finalAgents = await modifyPorts(finalAgents, theme)
          break
      }
    }
    
    // Add processed agents to allTeams with proper team structure
    // Create teams with dev and testing roles
    const maxTeams = Math.ceil(finalAgents.length / 2) // Each team gets 2 agents (dev + testing)
    
    for (let teamIndex = 0; teamIndex < maxTeams; teamIndex++) {
      const teamNumber = teamIndex + 1
      const devAgent = finalAgents[teamIndex * 2] || finalAgents[0]
      const testingAgent = finalAgents[teamIndex * 2 + 1] || finalAgents[1] || finalAgents[0]
      
      // Add dev role
      allTeams.push({
        ...devAgent,
        role: 'dev',
        teamNumber,
        theme: theme.name,
        themeEmoji: theme.emoji,
        dockerNetwork: `${theme.name.toLowerCase().replace(/\s+/g, '-')}-network`
      })
      
      // Add testing role
      allTeams.push({
        ...testingAgent,
        role: 'testing',
        teamNumber,
        theme: theme.name,
        themeEmoji: theme.emoji,
        dockerNetwork: `${theme.name.toLowerCase().replace(/\s+/g, '-')}-network`
      })
    }
    
    console.log() // Add spacing
    
    // Ask if they want to add another theme
    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Add another theme?',
        default: false
      }
    ])
    
    if (addAnother) {
      // Get available themes and show selection again
      const availableThemes = await loadThemes()
      const { moreThemes } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'moreThemes',
          message: 'Select additional themes:',
          choices: availableThemes.map(t => ({
            name: `${t.emoji} ${t.name} (${t.agents.length} agents)`,
            value: t,
            checked: false
          })),
          loop: false,
          validate: (answer) => {
            if (answer.length < 1) {
              return 'You must select at least one theme.'
            }
            return true
          }
        }
      ])
      themesToProcess.push(...moreThemes)
    }
  }
  
  return allTeams
}

function displayAgentCard(agent, theme) {
  const content = [
    `${chalk.green('✅ Enabled')}    Port: ${agent.ports?.backend || 3011}    Host: ${agent.host || agent.id + '.test'}`,
    chalk.italic(`"${agent.description}"`),
    chalk.gray(`Traits: ${agent.personality?.traits?.join(', ') || 'default'}`)
  ].join('\n')

  const box = boxen(content, {
    title: `${agent.name} (${agent.emoji})`,
    titleAlignment: 'left',
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: 'round',
    borderColor: 'gray',
    dimBorder: true
  })

  console.log(box)
}

async function editCharacters(agents, theme) {
  const { agentToEdit } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentToEdit',
      message: 'Which character would you like to edit?',
      choices: agents.map(agent => ({
        name: `${agent.emoji} ${agent.name}`,
        value: agent.id
      }))
    }
  ])
  
  const agentIndex = agents.findIndex(a => a.id === agentToEdit)
  const agent = agents[agentIndex]
  
  const { editFields } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'editFields',
      message: 'What would you like to edit?',
      choices: [
        { name: 'Name', value: 'name' },
        { name: 'Emoji', value: 'emoji' },
        { name: 'Description', value: 'description' },
        { name: 'Personality traits', value: 'traits' },
        { name: 'Catchphrases', value: 'catchphrases' },
        { name: 'Ports', value: 'ports' }
      ],
      loop: false
    }
  ])
  
  const updates = {}
  
  for (const field of editFields) {
    switch (field) {
      case 'name':
        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'New name:',
            default: agent.name
          }
        ])
        updates.name = name
        break
        
      case 'emoji':
        const { emoji } = await inquirer.prompt([
          {
            type: 'input',
            name: 'emoji',
            message: 'New emoji:',
            default: agent.emoji
          }
        ])
        updates.emoji = emoji
        break
        
      case 'description':
        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: 'New description:',
            default: agent.description
          }
        ])
        updates.description = description
        break
        
      case 'traits':
        const { traits } = await inquirer.prompt([
          {
            type: 'input',
            name: 'traits',
            message: 'Personality traits (comma-separated):',
            default: agent.personality?.traits?.join(', ') || ''
          }
        ])
        updates.personality = {
          ...agent.personality,
          traits: traits.split(',').map(t => t.trim())
        }
        break
        
      case 'catchphrases':
        const { catchphrases } = await inquirer.prompt([
          {
            type: 'input',
            name: 'catchphrases',
            message: 'Catchphrases (comma-separated):',
            default: agent.personality?.catchphrases?.join(', ') || ''
          }
        ])
        updates.personality = {
          ...agent.personality,
          catchphrases: catchphrases.split(',').map(c => c.trim())
        }
        break
        
      case 'ports':
        const portAnswers = await inquirer.prompt([
          {
            type: 'number',
            name: 'backend',
            message: 'Backend port:',
            default: agent.ports?.backend || 3011
          },
          {
            type: 'number',
            name: 'frontend',
            message: 'Frontend port:',
            default: agent.ports?.frontend || 5175
          },
          {
            type: 'number',
            name: 'nginx',
            message: 'Nginx port:',
            default: agent.ports?.nginx || 3080
          }
        ])
        updates.ports = portAnswers
        break
    }
  }
  
  agents[agentIndex] = { ...agent, ...updates }
  return agents
}

async function addCharacter(agents, theme) {
  console.log('\n' + chalk.bold('➕ Add Custom Character'))
  
  const newAgent = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Character ID (lowercase, no spaces):',
      validate: (value) => {
        if (!value.match(/^[a-z0-9-]+$/)) {
          return 'ID must be lowercase letters, numbers, and hyphens only'
        }
        if (agents.find(a => a.id === value)) {
          return 'This ID already exists'
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'name',
      message: 'Character name:'
    },
    {
      type: 'input',
      name: 'emoji',
      message: 'Character emoji:',
      default: '🤖'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Character description:'
    },
    {
      type: 'input',
      name: 'traits',
      message: 'Personality traits (comma-separated):'
    },
    {
      type: 'input',
      name: 'catchphrases',
      message: 'Catchphrases (comma-separated):'
    }
  ])
  
  const lastPort = Math.max(...agents.map(a => a.ports?.backend || 3011))
  
  agents.push({
    id: newAgent.id,
    name: newAgent.name,
    emoji: newAgent.emoji,
    description: newAgent.description,
    personality: {
      traits: newAgent.traits.split(',').map(t => t.trim()),
      catchphrases: newAgent.catchphrases.split(',').map(c => c.trim()),
      communication_style: 'default'
    },
    ports: {
      backend: lastPort + 10,
      frontend: 5175 + agents.length,
      nginx: 3080 + agents.length
    },
    host: `${newAgent.id}.test`
  })
  
  return agents
}

async function removeCharacters(agents, theme) {
  const { agentsToRemove } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'agentsToRemove',
      message: 'Select characters to remove:',
      choices: agents.map(agent => ({
        name: `${agent.emoji} ${agent.name}`,
        value: agent.id
      })),
      loop: false,
      validate: (answer) => {
        if (answer.length === agents.length) {
          return 'You must keep at least one character.'
        }
        return true
      }
    }
  ])
  
  return agents.filter(agent => !agentsToRemove.includes(agent.id))
}

async function modifyPorts(agents, theme) {
  const { startPort } = await inquirer.prompt([
    {
      type: 'number',
      name: 'startPort',
      message: 'Starting backend port number:',
      default: agents[0]?.ports?.backend || 3011,
      validate: (value) => value >= 1024 && value <= 65535
    }
  ])
  
  return agents.map((agent, index) => ({
    ...agent,
    ports: {
      backend: startPort + (index * 10),
      frontend: 5175 + index,
      nginx: 3080 + index
    }
  }))
}