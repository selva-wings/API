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
async function loginUser( realm, username, password) {
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
 
// // 📌 **Create a New Organization (Realm)**
// async function createOrganization(
//   realm,
//   adminUsername,
//   adminEmail,
//   adminPassword,
//   superAdminToken
// ) {
//   try {
//     // **Step 1: Create Realm**
//     await axios.post(
//       `${config.KEYCLOAK_URL}/admin/realms`,
//       { id: realm, realm, enabled: true },
//       {
//         headers: { Authorization: `Bearer ${superAdminToken}` },
//       }
//     );

//     console.log(`✅ Realm '${realm}' created successfully.`);

//     // **Step 2: Configure Realm Settings (SSO & Token Lifespan)**
//     await axios.put(
//       `${config.KEYCLOAK_URL}/admin/realms/${realm}`,
//       {
//         ssoSessionIdleTimeout: 86400, // 1 day in seconds
//         accessTokenLifespan: 86400, // 1 day in seconds
//       },
//       {
//         headers: { Authorization: `Bearer ${superAdminToken}` },
//       }
//     );

//     console.log(`✅ Updated SSO and Access Token Lifespan settings.`);

//     // **Step 3: Create Client in Realm**
//     await axios.post(
//       `${config.KEYCLOAK_URL}/admin/realms/${realm}/clients`,
//       {
//         clientId: `${realm}-api`,
//         enabled: true,
//         directAccessGrantsEnabled: true,
//         publicClient: false,
//         secret: config.CLIENT_SECRET,
//       },
//       {
//         headers: { Authorization: `Bearer ${superAdminToken}` },
//       }
//     );

//     console.log(`✅ Client '${realm}-api' created.`);

//     // **Step 4: Create Org-Admin Role**
//     await axios.post(
//       `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles`,
//       { name: "org-admin" },
//       {
//         headers: { Authorization: `Bearer ${superAdminToken}` },
//       }
//     );

//     console.log(`✅ Role 'org-admin' created.`);

//     // **Step 5: Create Organization Admin with Email Verification**
//     const userResponse = await axios.post(
//       `${config.KEYCLOAK_URL}/admin/realms/${realm}/users`,
//       {
//         username: adminUsername,
//         email: adminEmail,
//         enabled: true,
//         emailVerified: true, 
//         firstName: adminUsername,
//         lastName: adminUsername,
//         credentials: [
//           { type: "password", value: adminPassword, temporary: false },
//         ],
//       },
//       {
//         headers: { Authorization: `Bearer ${superAdminToken}` },
//       }
//     );

//     console.log(
//       `✅ Organization Admin '${adminUsername}' created with email verification enabled.`
//     );
//     return { message: `✅ Organization '${realm}' created successfully.` };
//   } catch (error) {
//     if (error.response?.status === 409) {
//       console.error(` Organization '${realm}' already exists.`);
//       return { message: ` Organization '${realm}' already exists.` };
//     }

//     console.error(
//       "❌ Error creating organization:",
//       error.response?.data || error
//     );
//     throw new Error("Failed to create organization.");
//   }
// }

// 📌 **Create a New Organization (Realm)**

async function createOrganization(realm, adminUsername, adminEmail, adminPassword, superAdminToken) {
  try {
    // **Step 1: Create Realm**
    await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms`,
      { id: realm, realm, enabled: true },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    console.log(`✅ Realm '${realm}' created successfully.`);

    // **Step 2: Configure Realm Settings (SSO & Token Lifespan)**
    await axios.put(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}`,
      {
        ssoSessionIdleTimeout: 86400, // 1 day in seconds
        accessTokenLifespan: 86400, // 1 day in seconds
      },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
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
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    console.log(`✅ Client '${realm}-api' created.`);

    // **Step 4: Create Org-Admin Role**
    await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles`,
      { name: "org-admin" },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    console.log(`✅ Role 'org-admin' created.`);

    // **Step 5: Fetch Org-Admin Role**
    const orgAdminRoleResponse = await axios.get(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles/org-admin`,
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    const orgAdminRole = orgAdminRoleResponse.data;

    if (!orgAdminRole || !orgAdminRole.id) {
      throw new Error("❌ 'org-admin' role not found.");
    }

    // **Step 6: Fetch Available Roles to Assign**
    const availableRolesResponse = await axios.get(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles`,
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    const availableRoles = availableRolesResponse.data;
    console.log("availableRoles:", availableRoles);

    const roleNames = [
      "delete-account",
      "manage-account",
      "manage-account-links",
      "manage-consent",
      "view-applications",
      "view-consent",
      "view-groups",
      "view-profile",
      "read-token",
      "create-client",
    ];
    
    for (const roleName of roleNames) {
      await axios.post(
        `${config.KEYCLOAK_URL}/admin/realms/${realm}/roles`,
        { name: roleName },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      console.log(`✅ Role '${roleName}' created.`);
    }
    

    // **Step 8: Create Organization Admin with Email Verification**
    const userResponse = await axios.post(
      `${config.KEYCLOAK_URL}/admin/realms/${realm}/users`,
      {
        username: adminUsername,
        email: adminEmail,
        enabled: true,
        emailVerified: true,
        firstName: adminUsername,
        lastName: adminUsername,
        credentials: [{ type: "password", value: adminPassword, temporary: false }],
      },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    console.log(`✅ Organization Admin '${adminUsername}' created with email verification enabled.`);

    return { message: `✅ Organization '${realm}' created successfully.` };
  } catch (error) {
    if (error.response?.status === 409) {
      console.error(`⚠️ Organization '${realm}' already exists.`);
      return { message: `⚠️ Organization '${realm}' already exists.` };
    }

    console.error("❌ Error creating organization:", error.response?.data || error.message || error);
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
      console.error(`⚠️ User '${username}' already exists in realm '${realm}'.`);
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

    console.log(`✅ User '${username}' created successfully in realm '${realm}'.`);
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

module.exports = {
  getSuperAdminToken,
  loginUser,
  createOrganization,
  deleteOrganization,
  createUser
};