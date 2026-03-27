const mongoose = require("mongoose");
const MONGODB_URI = "mongodb+srv://kaighassysuresh_db_user:cY7vBN3sFiMYLIGW@cluster0.bctmocd.mongodb.net/black_bullet?appName=Cluster0";

const BROKEN_URL = "https://res.cloudinary.com/dzsyzxhjx/image/upload/v1774423927/esgznedghc3y2aibybud.jpg";
const FALLBACK_URL = "https://placehold.co/600x400?text=Image+Not+Found";

async function fix() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const blogs = await db.collection("blogs").find().toArray();
  let bCount = 0;
  for (let doc of blogs) {
    let s = JSON.stringify(doc);
    if (s.includes("esgznedghc3y2aibybud")) {
      s = s.replace(/https?:\/\/res\.cloudinary\.com\/[^"]*esgznedghc3y2aibybud[^"]*/g, FALLBACK_URL);
      const updated = JSON.parse(s);
      delete updated._id;
      await db.collection("blogs").updateOne({ _id: doc._id }, { $set: updated });
      bCount++;
    }
  }

  const services = await db.collection("services").find().toArray();
  let sCount = 0;
  for (let doc of services) {
    let s = JSON.stringify(doc);
    if (s.includes("esgznedghc3y2aibybud")) {
      s = s.replace(/https?:\/\/res\.cloudinary\.com\/[^"]*esgznedghc3y2aibybud[^"]*/g, FALLBACK_URL);
      const updated = JSON.parse(s);
      delete updated._id;
      await db.collection("services").updateOne({ _id: doc._id }, { $set: updated });
      sCount++;
    }
  }

  console.log("Fixed Blogs:", bCount);
  console.log("Fixed Services:", sCount);
  process.exit(0);
}
fix();
