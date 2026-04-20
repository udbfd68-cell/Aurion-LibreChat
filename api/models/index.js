const mongoose = require('mongoose');
const { createMethods } = require('@librechat/data-schemas');
const { matchModelName, findMatchingPattern } = require('@librechat/api');
const getLogStores = require('~/cache/getLogStores');

const methods = createMethods(mongoose, {
  matchModelName,
  findMatchingPattern,
  getCache: getLogStores,
});

const seedDatabase = async () => {
  await methods.initializeRoles();
  await methods.seedDefaultRoles();
  await methods.ensureDefaultCategories();
  await methods.seedSystemGrants();
  await methods.seedBuiltInSkills();

  // Ensure USER role has MCP_SERVERS USE + CREATE permissions
  // (default CREATE is false, we need it true for Connectors page)
  try {
    const Role = mongoose.models.Role;
    if (Role) {
      await Role.updateOne(
        { name: 'USER' },
        {
          $set: {
            'permissions.MCP_SERVERS.USE': true,
            'permissions.MCP_SERVERS.CREATE': true,
          },
        },
      );
    }
  } catch (e) {
    // Non-fatal — MCP will still work for YAML-configured servers
  }
};

module.exports = {
  ...methods,
  seedDatabase,
};
