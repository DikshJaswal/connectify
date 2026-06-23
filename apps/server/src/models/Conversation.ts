import mongoose, { InferSchemaType, Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    type: { type: String, enum: ["direct", "group", "ai"], required: true },
    name: { type: String, trim: true, maxlength: 80 },
    avatarUrl: { type: String, default: "" },
    description: { type: String, default: "", maxlength: 220 },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date },
    unreadBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    hiddenBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] }
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1, type: 1 });
conversationSchema.index({ name: "text", description: "text" });

export type ConversationDoc = InferSchemaType<typeof conversationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Conversation = mongoose.model("Conversation", conversationSchema);
