import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initFirebase } from "./config/firebase.js";

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  initFirebase();

  app.listen(process.env.PORT, () => {
    console.log(`Server running on ${process.env.PORT}`);
  });
};

start().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
