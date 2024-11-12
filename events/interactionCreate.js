module.exports = async (client, interaction) => {
  if (!interaction.isCommand()) return;

  // Accede al comando desde el mapa de comandos
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Comando no encontrado: ${interaction.commandName}`);
    return;
  }

  try {
    // Ejecutar el comando
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Hubo un error al ejecutar este comando.',
      ephemeral: true,
    });
  }
};