
const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("verifysetup")
    .setDescription("Create the verification button")
].map(command => command.toJSON());

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Verification command registered.");
  } catch (error) {
    console.error("Command registration failed:", error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== "verifysetup") return;

    if (!interaction.memberPermissions.has(
      PermissionsBitField.Flags.ManageGuild
    )) {
      return interaction.reply({
        content: "Only server managers can set up verification.",
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_member")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅")
    );

    return interaction.reply({
      content: "Welcome! Click Verify below to receive your Member role.",
      components: [row]
    });
  }

  if (interaction.isButton() &&
      interaction.customId === "verify_member") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;
      const role = await guild.roles.fetch(MEMBER_ROLE_ID);
      const botMember = await guild.members.fetchMe();

      if (!role) {
        return interaction.editReply("Member role not found. Check its ID.");
      }

      if (
        !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        role.position >= botMember.roles.highest.position
      ) {
        return interaction.editReply(
          "The bot needs Manage Roles permission and its role must be above Member."
        );
      }

      const member = await guild.members.fetch(interaction.user.id);

      if (member.roles.cache.has(role.id)) {
        return interaction.editReply("You already have the Member role! ✅");
      }

      await member.roles.add(role);
      return interaction.editReply("Verified! Your Member role has been added. ✅");
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "Couldn't assign the role. Please contact a server admin."
      );
    }
  }
});

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !MEMBER_ROLE_ID) {
  throw new Error("Missing BOT_TOKEN, CLIENT_ID, GUILD_ID, or MEMBER_ROLE_ID.");
}

client.login(TOKEN);
