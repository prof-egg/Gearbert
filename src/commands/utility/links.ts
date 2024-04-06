import Discord from "discord.js"
import Util from "../../lib/util/Util.js";
import { ECommandTags, ISlashCommandFunc } from "../../lib/handlers/CommandHandler.js";
import messageconfig from "../../config/messages.json" assert { type: 'json' }

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    const title = "Links"
    let msg = ""
    messageconfig.links.forEach((linkSet) => {
        msg += `${linkSet[0]}: ${linkSet[1]}\n`
    })

    const embed = Util.standardEmbedMessage(title, msg)

    interaction.reply({ embeds: [embed] })
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("links")
    .setDescription("Returns some links related to Big Boy Games")
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, buildData, tags }
