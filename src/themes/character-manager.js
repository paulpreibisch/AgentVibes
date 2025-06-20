export function generateCharacterConfig(agent, theme, teamNumber) {
  // Agent signatures for attribution
  const agentSignatures = [
    "🎭 Vibing with AgentVibes",
    "💫 Powered by AgentVibes from @paulpreibisch",
    "🚀 Agent personality by AgentVibes",
    "✨ Created with AgentVibes",
    "🤖 Built with ❤️ by AgentVibes"
  ]
  
  // Enhanced personality with occasional signature
  const enhancedPersonality = {
    ...agent.personality,
    // 10% chance to include attribution signature
    signature: Math.random() < 0.1 ? agentSignatures[Math.floor(Math.random() * agentSignatures.length)] : null
  }
  
  return {
    id: agent.id,
    name: agent.name,
    emoji: agent.emoji,
    teamNumber,
    theme: theme.name,
    themeEmoji: theme.emoji,
    description: agent.description,
    personality: enhancedPersonality,
    ports: agent.ports,
    host: agent.host,
    docker: {
      containerName: `${theme.name.toLowerCase()}-${agent.id}`,
      network: theme.docker.network,
      volumes: {
        data: `${agent.id}_data`,
        logs: `${agent.id}_logs`
      }
    },
    paths: {
      root: `teams/team-${teamNumber}/${agent.role || 'dev'}`,
      claude: `teams/team-${teamNumber}/${agent.role || 'dev'}/CLAUDE.md`,
      mcp: `teams/team-${teamNumber}/${agent.role || 'dev'}/.mcp.json`,
      commands: `teams/team-${teamNumber}/${agent.role || 'dev'}/.claude/commands`,
      gitHooks: `teams/team-${teamNumber}/${agent.role || 'dev'}/.git/hooks`
    }
  }
}

export function generateTeamIdentity(agent, theme, teamNumber) {
  const catchphrase = agent.personality.catchphrases?.[0] || 'Let\'s code!'
  
  return {
    greeting: `${agent.emoji} ${agent.name} says: "${catchphrase}"`,
    commitPrefix: `${agent.emoji} ${agent.name}:`,
    issuePrefix: `${agent.emoji} Team-${teamNumber}:`,
    prPrefix: `${agent.emoji} Team-${teamNumber}:`,
    commentPrefix: `${agent.emoji} ${agent.name} says:`
  }
}

export function interpolatePersonality(template, character) {
  const replacements = {
    '{{agentName}}': character.name,
    '{{agentEmoji}}': character.emoji,
    '{{teamNumber}}': character.teamNumber,
    '{{teamDescription}}': character.description,
    '{{personality.traits}}': character.personality.traits.join(', '),
    '{{personality.catchphrases}}': character.personality.catchphrases.map(c => `"${c}"`).join(', '),
    '{{personality.communication_style}}': character.personality.communication_style,
    '{{theme}}': character.theme,
    '{{themeEmoji}}': character.themeEmoji,
    '{{ports.backend}}': character.ports.backend,
    '{{ports.frontend}}': character.ports.frontend,
    '{{ports.nginx}}': character.ports.nginx,
    '{{hostName}}': character.host,
    '{{containerName}}': character.docker.containerName,
    '{{dockerNetwork}}': character.docker.network
  }
  
  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), value)
  }
  
  return result
}