const axios = require("axios");
const config = require("./config");
const jwt = require("jsonwebtoken");

// 📌 **Super Admin Login**
async function getSuperAdminToken(username, password) {
  const payload = new URLSearchParams({
    client_id: "admin-cli",
    username,
    password,
    grant_type: "password",
  });

  try {
    const response = await axios.post(
      `${config.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      payload,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Super Admin Login Error:", error.response?.data || error);
    throw new Error("Invalid Super Admin credentials.");
  }
}

// 📌 **Login for Org Admin / Org User**
async function loginUser(realm, username, password) {
  const clientId = `admin-cli`;

  const payload = new URLSearchParams({
    client_id: clientId,
    username,
    password,
    grant_type: "password",
  });

  try {
    const response = await axios.post(
      `${config.KEYCLOAK_URL}/realms/${realm}/protocol/openid-connect/token`,
      payload,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return response.data;
  } catch (error) {
    console.error("❌ Login Error:", error.response?.data || error);
    throw new Error("Invalid credentials.");
  }
}

// 📌 **Create a New Organization (Realm)**
async function createOrganization(
  realm,
  adminUsername,
  adminEmail,
  adminPassword,
  superAdminToken
) {
  try {
    // **Step 1: Create Realm**
    await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms`,
      { id: realm, realm, enabled: true },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    console.log(`✅ Realm '${realm}' created successfully.`);

    // **Step 2: Configure Realm Settings (SSO & Token Lifespan)**
    await axios.put(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}`,
      {
        ssoSessionIdleTimeout: 86400, // 1 day in seconds
        accessTokenLifespan: 86400, // 1 day in seconds
      },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    console.log(`✅ Updated SSO and Access Token Lifespan settings.`);

    // **Step 3: Create Client in Realm**
    await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/clients`,
      {
        clientId: `${realm}-api`,
        enabled: true,
        directAccessGrantsEnabled: true,
        publicClient: false,
        secret: config.CLIENT_SECRET,
      },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    console.log(`✅ Client '${realm}-api' created.`);

    // **Step 4: Create Org-Admin Role**
    await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles`,
      { name: "org-admin" },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    console.log(`✅ Role 'org-admin' created.`);

    // **Step 5: Create Organization Admin with Email Verification**
    const userResponse = await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users`,
      {
        username: adminUsername,
        email: adminEmail,
        enabled: true,
        emailVerified: true,
        firstName: adminUsername,
        lastName: adminUsername,
        credentials: [
          { type: "password", value: adminPassword, temporary: false },
        ],
      },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    console.log(
      `✅ Organization Admin '${adminUsername}' created with email verification enabled.`
    );
    return { message: `✅ Organization '${realm}' created successfully.` };
  } catch (error) {
    if (error.response?.status === 409) {
      console.error(` Organization '${realm}' already exists.`);
      return { message: ` Organization '${realm}' already exists.` };
    }

    console.error(
      "❌ Error creating organization:",
      error.response?.data || error
    );
    throw new Error("Failed to create organization.");
  }
}

// 📌 Delete Realm (Super Admin Only)
async function deleteOrganization(realm, superAdminToken) {
  try {
    await axios.delete(`${config.KEYCLOAK_URL}/admin/realms/${realm}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    console.log(`✅ Realm '${realm}' deleted successfully.`);
    return { message: `✅ Organization '${realm}' deleted successfully.` };
  } catch (error) {
    console.error("❌ Error deleting realm:", error.response?.data || error);
    throw new Error("Failed to delete organization.");
  }
}

async function createUser(realm, username, email, password, superAdminToken) {
  try {
    // **Step 1: Check if User Already Exists**
    const existingUsers = await axios.get(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users`,
      {
        params: { username },
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    if (existingUsers.data.length > 0) {
      console.error(
        `⚠️ User '${username}' already exists in realm '${realm}'.`
      );
      return { message: `⚠️ User '${username}' already exists.` };
    }

    // **Step 2: Create the User**
    const userResponse = await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users`,
      {
        username,
        email,
        enabled: true,
        emailVerified: true, // Set email verification
        firstName: username,
        lastName: username,
        credentials: [{ type: "password", value: password, temporary: false }],
      },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    console.log(
      `✅ User '${username}' created successfully in realm '${realm}'.`
    );
    return { message: `✅ User '${username}' created successfully.` };
  } catch (error) {
    if (error.response?.status === 409) {
      console.error(`User '${username}' already exists.`);
      return { message: `User '${username}' already exists.` };
    }

    console.error("❌ Error creating user:", error.response?.data || error);
    throw new Error("Failed to create user.");
  }
}

// 📌 **Edit User (Super Admin & Org Admin)**
async function editUser(
  realm,
  username,
  firstName,
  lastName,
  password,
  adminToken
) {
  try {
    // **Step 1: Get User ID from Username**
    const userSearchResponse = await axios.get(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users?username=${username}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    if (!userSearchResponse.data.length) {
      throw new Error(`User '${username}' not found in realm '${realm}'.`);
    }

    const userId = userSearchResponse.data[0].id;

    // **Step 2: Update First Name & Last Name**
    await axios.put(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users/${userId}`,
      { firstName, lastName },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    console.log(
      `✅ User '${username}' updated successfully in realm '${realm}'.`
    );

    // **Step 3: Update Password & Set as Permanent (if provided)**
    if (password) {
      await axios.put(
        `${config.KEYCLOAK_URL}/admin/realms/${realm}/users/${userId}/reset-password`,
        {
          type: "password",
          value: password,
          temporary: false, // Password set to permanent
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      console.log(`✅ Password updated successfully for user '${username}'.`);
    }

    return { message: `✅ User '${username}' updated successfully.` };
  } catch (error) {
    console.error("❌ Error updating user:", error.response?.data || error);
    throw new Error("Failed to update user.");
  }
}

// 📌 **Get List of Users (Super Admin & Org Admin)**
async function getUsersList(realm, adminToken, isSuperAdmin) {
  try {
    let users = [];

    if (isSuperAdmin) {
      // **Super Admin - Get Users from All Realms**
      const realmsResponse = await axios.get(
        `${config.KEYCLOAK_URL}/admin/realms`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const realms = realmsResponse.data.map((realm) => realm.realm);

      for (const realmName of realms) {
        const usersResponse = await axios.get(
          `${config.KEYCLOAK_URL}/admin/realms/${realmName}/users`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        users = [
          ...users,
          ...usersResponse.data.map((user) => ({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            username: user.username,
            organization: realmName,
          })),
        ];
      }
    } else {
      // **Org Admin - Get Users from Their Specific Realm**
      const usersResponse = await axios.get(
        `${config.KEYCLOAK_URL}/admin/realms/${realm}/users`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      users = usersResponse.data.map((user) => ({
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        username: user.username,
        organization: realm,
      }));
    }

    return users;
  } catch (error) {
    console.error("❌ Error fetching users:", error.response?.data || error);
    throw new Error("Failed to fetch users.");
  }
}

// 📌 **Delete User by Username (Super Admin & Org Admin)**
async function deleteUser(realm, username, adminToken) {
  try {
    // Step 1: Get User ID using Username
    const usersResponse = await axios.get(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (usersResponse.data.length === 0) {
      throw new Error(`User '${username}' not found in realm '${realm}'.`);
    }

    const userId = usersResponse.data[0].id; // Extract User ID

    // Step 2: Delete User by User ID
    await axios.delete(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users/${userId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    console.log(
      `✅ User '${username}' deleted successfully from realm '${realm}'.`
    );
    return { message: `✅ User '${username}' deleted successfully.` };
  } catch (error) {
    console.error("❌ Error deleting user:", error.response?.data || error);
    throw new Error("Failed to delete user.");
  }
}

// 📌 **List Realm Roles (Excluding Default Roles)**
async function getRealmRoles(realm, adminToken) {
  try {
    // Step 1: Fetch All Realm Roles
    const response = await axios.get(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    let roles = response.data.map((role) => role.name);

    // Step 2: Filter Out Default Roles
    const excludedRoles = [
      "offline_access",
      "uma_authorization",
      `default-roles-${realm}`,
    ];
    roles = roles.filter((role) => !excludedRoles.includes(role));

    console.log(`✅ Realm Roles for '${realm}':`, roles);
    return { roles };
  } catch (error) {
    console.error(
      "❌ Error fetching realm roles:",
      error.response?.data || error
    );
    throw new Error("Failed to fetch realm roles.");
  }
}

module.exports = {
  getSuperAdminToken,
  loginUser,
  createOrganization,
  deleteOrganization,
  createUser,
  editUser,
  getUsersList,
  deleteUser,
  getRealmRoles, // ✅ New function added
};
