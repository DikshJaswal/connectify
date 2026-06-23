import bcrypt from "bcryptjs";
import mongoose, { InferSchemaType, Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 180 },
    statusMessage: { type: String, default: "Available", maxlength: 80 },
    lastSeen: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
    privacy: {
      showOnline: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const json = ret as Record<string, unknown>;
    delete json.passwordHash;
    delete json.__v;
    return ret;
  }
});

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  comparePassword(password: string): Promise<boolean>;
};

export const User = mongoose.model("User", userSchema);
