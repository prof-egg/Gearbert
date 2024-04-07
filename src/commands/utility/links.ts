import Discord from "discord.js"
import Util from "../../lib/util/Util.js";
import { ECommandTags, ISlashCommandAutocompleteFunc, ISlashCommandFunc } from "../../lib/handlers/CommandHandler.js";
import messageconfig from "../../config/messages.json" assert { type: 'json' }

const queryOption = "query"

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    const query = options.getString(queryOption)
    if (!query) 
        return interaction.reply({ embeds: [Util.embedMessage(`Missing ${queryOption} option`)] })
    
    const link = messageconfig.links.find((link) => query == link.name) ?? { name: "Bad Query", value: messageconfig.error.query.badLink}
    const msg = `**${link.name}:** ${link.value}`
    interaction.reply({ embeds: [Util.embedMessage(msg)] })
}

const autocomplete: ISlashCommandAutocompleteFunc = async (interaction, options, client, loggerID) => {
    const focusedValue = options.getFocused();
    const choices = messageconfig.links.map((link) => link.name)
    const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
    await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice })),
    );
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("links")
    .setDescription("Returns some links related to Big Boy Games")
    .addStringOption(option =>
        option.setName(queryOption)
            .setDescription('Link to search for')
            .setAutocomplete(true)
            .setRequired(true))
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, autocomplete, buildData, tags }
