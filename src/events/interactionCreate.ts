import Discord , { Events } from "discord.js"
import CommandHandler, { ECommandTags } from "../lib/handlers/CommandHandler"
import { IEventFunc } from "../lib/handlers/EventHandler"
import Util from "../lib/util/Util"
import messageConfig from "../config/messages.json"
import clientconfig from "../config/client.json"
import Debug from "../lib/util/Debug"

const eventType = Events.InteractionCreate

const eventFunction: IEventFunc<typeof eventType> = async (client, loggerID, interaction) => {

    // Filter interaction commands
    if (!interaction.isCommand()) return
    interaction = interaction as Discord.ChatInputCommandInteraction

    // If command is marked incomplete then check for bot testing role to execute command
    const slashCommand = CommandHandler.getSlashCommand(interaction)
    if (slashCommand?.hasTag(ECommandTags.Incomplete) && interaction.member instanceof Discord.GuildMember){

        const isBotTester = interaction.member.roles.cache.has(clientconfig.homeGuild.roles.botTesterId)
        
        if (!isBotTester) {
            const errorMessage = messageConfig.error.userNoTestingRights + `\nOnly users with the <@&${clientconfig.homeGuild.roles.botTesterId}> role can test this command!`
            interaction.reply({ embeds: [Util.standardEmbedMessage(interaction.commandName, errorMessage)] })
            return 
        }  
    } 
    
    // Execute command
    CommandHandler.executeSlashCommand(interaction)
}

const eventData = {
    event: eventType,
    once: false
}

export { eventFunction, eventData }