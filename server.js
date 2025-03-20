const express = require("express");
const bodyParser = require("body-parser");
const {
  getSuperAdminToken,
  loginUser,
  createOrganization,
  deleteOrganization,
  createUser,
  editUser,
  getUsersList,
  deleteUser,
  getRealmRoles,
} = require("./keycloakService");
const { authenticateRole } = require("./rbacMiddleware");

const app = express();
app.use(bodyParser.json());

// 📌 **Super Admin Login**
app.post("/auth/superadmin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const tokenData = await getSuperAdminToken(username, password);
    res.status(200).json(tokenData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Org Admin & Org User Login**
app.post("/auth/login", async (req, res) => {
  try {
    const { realm, username, password } = req.body;
    const tokenData = await loginUser(realm, username, password);
    res.status(200).json(tokenData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Super Admin Creates Organization**
app.post("/org/create", async (req, res) => {
  try {
    const { realm, adminUsername, adminEmail, adminPassword } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    const result = await createOrganization(
      realm,
      adminUsername,
      adminEmail,
      adminPassword,
      token
    );

    if (result.message.includes("already exists")) {
      return res.status(409).json(result); // Return 409 if the organization exists
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 Delete an Organization (Super Admin Only)
app.delete("/org/delete", async (req, res) => {
  try {
    const { realm } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    const result = await deleteOrganization(realm, token);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/user/create", async (req, res) => {
  try {
    const { realm, username, email, password } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    console.log("token:", token);

    const result = await createUser(realm, username, email, password, token);

    if (result.message.includes("already exists")) {
      return res.status(409).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Super Admin & Org Admin Edit User by Username**
app.put("/org/user/edit", async (req, res) => {
  try {
    const { realm, username, firstName, lastName, password } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    const result = await editUser(
      realm,
      username,
      firstName,
      lastName,
      password,
      token
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Super Admin & Org Admin - Get List of Users**
app.get("/users/list", async (req, res) => {
  try {
    const { realm, isSuperAdmin } = req.query;
    const token = req.headers.authorization?.split(" ")[1];

    const usersList = await getUsersList(realm, token, isSuperAdmin === "true");
    res.status(200).json(usersList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Super Admin & Org Admin - Delete a User**
app.delete("/users/delete", async (req, res) => {
  try {
    const { realm, username } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    const result = await deleteUser(realm, username, token);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Super Admin & Org Admin - List Realm Roles (Excluding Defaults)**
app.get("/roles/list", async (req, res) => {
  try {
    const { realm } = req.query;
    const token = req.headers.authorization?.split(" ")[1];

    const result = await getRealmRoles(realm, token);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 **Start Server**
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
