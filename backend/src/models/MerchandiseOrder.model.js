const mongoose = require("mongoose");

const merchandiseOrderSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
        size: String, // Selected size variant
        color: String // Selected color variant
      }
    ],
    paymentProof: {
      type: String // file path or URL
    },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "APPROVED", "REJECTED"],
      default: "CREATED"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MerchandiseOrder", merchandiseOrderSchema);
