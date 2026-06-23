import mongoose, { InferSchemaType, Schema } from "mongoose";

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, default: "", maxlength: 4000 },
    attachments: [attachmentSchema],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isAi: { type: Boolean, default: false }
  },
  { timestamps: true }
);

messageSchema.index({ body: "text" });

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Message = mongoose.model("Message", messageSchema);
