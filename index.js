const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.afwac63.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const appointmentOptionCollection = client
      .db("doctorsPortal")
      .collection("appointmentOptions");
    const bookingsCollection = client
      .db("doctorsPortal")
      .collection("bookings");

    app.get("/appointments", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();

      // এই ডেটের মাধ্যমে এই particular date এ particular রোগের জন্য যতগুলো booking available আছে সবগুলো পাবো আমরা।
      const bookingQuery = { appointmentDate: date };
      const alreadyBooked = await bookingsCollection
        .find(bookingQuery)
        .toArray();

      // প্রত্যেক option এর জন্য ঐ দিনে কতগুলো বুকিং available আছে সেগুলোকে দিবে
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );

        // প্রত্যেক option এর জন্য কয়টা বুকিং স্লট বুক করা হয়েছে সেগুলো কে দিবে
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment,
      };

      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already have an appointment on ${booking.appointmentDate}`;
        return res.send({ acknowledged: false, message });
      }

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Doctors portal server running successfully!");
});

app.listen(port, () => {
  console.log(`Doctors portal app running on port ${port}`);
});
