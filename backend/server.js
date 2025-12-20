const app = require("./src/app");
const connectDB = require("./src/config/db");
require("dotenv").config();

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Renzi backend running on port ${PORT}`);
});
