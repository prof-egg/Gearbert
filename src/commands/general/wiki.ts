import Discord from "discord.js"
import { ECommandTags, ISlashCommandAutocompleteFunc, ISlashCommandFunc } from "../../lib/handlers/CommandHandler.js";
import messageconfig from "../../config/messages.json" assert { type: "json" }
import Util from "../../lib/util/Util.js";
import Wiki from "../../lib/util/WikiParser.js";
import path from "node:path"

const queryOption = "query"
const errorChoice = "Error"
// NOTE: Make a cronjob loop to refresh these objects, or
// have the command handler handle background jobs
const parsedWikiObjects = await Wiki.fetchMainWikiLinksAsParsed()

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    // Get user query
    const query = options.getString(queryOption)
    // Find the wiki object that matches the query
    const parsedWiki = parsedWikiObjects.find((pw) => {return pw.title == query})

    if (!query) 
        return interaction.reply({ embeds: [Util.embedMessage(`Uknown option "${queryOption}"`)] })
    if (query == errorChoice || !parsedWiki)
        return interaction.reply({ embeds: [Util.embedMessage(messageconfig.error.command.generalError)] })

    const embed = Util.standardEmbedMessage(parsedWiki.fullTitle + " (Beta Command)", parsedWiki.text, parsedWiki.link)
        .addFields(...parsedWiki.getTablesAsDiscordEmbedFields())
    interaction.reply({ embeds: [embed] })
}

const autocomplete: ISlashCommandAutocompleteFunc = async (interaction, options, client, loggerID) => {
    // Get the user input as they are typing
    const focusedValue = options.getFocused();
    // Get autocomplete choices that the user will choose from
    const choices = parsedWikiObjects.map((wikiParsed) => {return path.parse(wikiParsed.title).base})
    // Filter out choices the choices that dont start with what the user typed
    const filtered = choices.filter(choice => {return choice.toLowerCase().startsWith(focusedValue.toLowerCase())});
    // Respond with the auto complete suggestions
    await interaction.respond(
        filtered.map(choice => {return { name: choice, value: choice }}),
    );
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("wiki")
    .setDescription("Get info from the official starground wiki.")
    .addStringOption((option) =>
        {return option.setName(queryOption)
            .setDescription("Wiki to search for")
            .setAutocomplete(true)
            .setRequired(true)})
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Incomplete, ECommandTags.General]

export { commandFunction, autocomplete, buildData, tags }
