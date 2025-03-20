require("dotenv").config();

module.exports = {
  KEYCLOAK_URL: "http://localhost:8080", // Adjust if Keycloak runs on a different host
  CLIENT_SECRET: "client-secret", // Change this in production
};
