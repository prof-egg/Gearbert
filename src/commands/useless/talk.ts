import Discord from "discord.js"
import { ECommandTags, ISlashCommandFunc } from "../../lib/handlers/CommandHandler.js";
import clientconfig from "../../config/client.json" assert { type: "json" }

const inputOption = "input"

const commandFunction: ISlashCommandFunc = async (interaction, options, client, loggerID) => {
    interaction.reply({ content: "I have to reply to this because discord said so ¯\\_(ツ)_/¯", ephemeral: true })
    interaction.channel?.send({ content: options.getString(inputOption) ?? "I forgot what I'm supposed to say" })
}

const buildData = new Discord.SlashCommandBuilder()
    .setName("talk")
    .setDescription(`Silly command to make ${clientconfig.name} talk`)
    .addStringOption(option =>
		{return option.setName(inputOption)
			.setDescription("The input to echo back")
            .setRequired(true)})
    .toJSON()

const tags: ECommandTags[] = [ECommandTags.Incomplete, ECommandTags.Useless]

export { commandFunction, buildData, tags }
