
import Discord from "discord.js"
import Util from "../../lib/util/Util.js";
import { ECommandTags, ISlashCommandFunc } from "../../lib/handlers/CommandHandler.js";
import clientconfig from "../../config/client.json" assert { type: "json" }
import Debug from "../../lib/util/Debug.js";

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    // Defer the reply to get more time to respond
    await interaction.deferReply()

    // Get a list of all the users in the guild
    let guildMembers = await interaction.guild?.members.fetch()

    // Handle error
    if (!guildMembers) {
        interaction.editReply({ embeds: [Util.embedMessage("Oh no! I couldn't find any alpha testers to thank :(")] })
        Debug.logWarning("Couldn't find any alpha testers to thank", loggerID);
        return 
    }

    // Get all the users in the guild who have the 
    //alpha tester role in the form of an iterable
    let alphaTesters = guildMembers.filter(
        (m) => m.roles.cache.has(clientconfig.homeGuild.roles.alphaTesterId)
    ).values()

    // Build useable string from iterable
    let alphaTestersString = ""
    let shouldPrependComma = false
    for (let member of alphaTesters) {
        let username = member.displayName
        let segement = (shouldPrependComma) ? ", " + username : username
        shouldPrependComma = true
        alphaTestersString += segement
    }

    interaction.editReply({ embeds: [Util.standardEmbedMessage("Thank you Alpha Testers!", alphaTestersString)] })
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("alpha-testers")
    .setDescription("Displays a thank you message directed to all the current server members with the Closed-Alpha role")
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, buildData, tags }
