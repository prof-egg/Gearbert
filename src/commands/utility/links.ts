import Discord from "discord.js"
import Util from "../../lib/util/Util.js";
import { ECommandTags, ISlashCommandAutocompleteFunc, ISlashCommandFunc } from "../../lib/handlers/CommandHandler.js";
import messageconfig from "../../config/messages.json" assert { type: "json" }

const queryOption = "query"

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    // Check if option exists (this code should 
    // never run though since the option is required)
    const query = options.getString(queryOption)
    if (!query) 
        return interaction.reply({ embeds: [Util.embedMessage(`Uknown option "${queryOption}"`)] })
    
    // Try and find the full link based on the query
    const link = messageconfig.links.find((link) => {return query == link.name}) 
    // If we cant find the link (though that should never happen)
    // substitute an error message as a fake link
    ?? { name: "Bad Query", value: messageconfig.error.query.badLink}

    const msg = `**${link.name}:** ${link.value}`
    interaction.reply({ embeds: [Util.embedMessage(msg)] })
}

const autocomplete: ISlashCommandAutocompleteFunc = async (interaction, options, client, loggerID) => {
    // Get the user input as they are typing
    const focusedValue = options.getFocused();
    // Get autocomplete choices that the user will choose from
    const choices = messageconfig.links.map((link) => {return link.name})
    // Filter out choices the choices that dont start with what the user typed
    const filtered = choices.filter((choice) => {return choice.toLowerCase().startsWith(focusedValue.toLowerCase())});
    // Respond with the auto complete suggestions
    await interaction.respond(
        filtered.map((choice) => {return { name: choice, value: choice }}),
    );
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("links")
    .setDescription("Returns some links related to Big Boy Games")
    .addStringOption(option =>
        {return option.setName(queryOption)
            .setDescription("Link to search for")
            .setAutocomplete(true)
            .setRequired(true)})
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, autocomplete, buildData, tags }
