
import Discord from "discord.js"
import Util from "../../lib/util/Util";
import { ECommandTags, ISlashCommandFunc } from "../../lib/handlers/CommandHandler";

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {

    await interaction.deferReply()

    const reply = await interaction.fetchReply()
    const clientPing = reply.createdTimestamp - interaction.createdTimestamp

    const title = "Pong!"
    const msg = `**Client Ping:** ${clientPing}ms \n**Websocket Ping:** ${client.ws.ping}ms`
    const pingEmbed = Util.standardEmbedMessage(title, msg)

    interaction.editReply({ embeds: [pingEmbed] })
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("ping")
    .setDescription("Get client and websocket ping")
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Complete, ECommandTags.Utility]

export { commandFunction, buildData, tags }
