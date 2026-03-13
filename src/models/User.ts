import { Schema, model, Types } from "mongoose"

interface IUser {
  username: string,
  email: string,
  password: string,
  avatar?: string,
  bio?: string,
  role: "user" | "admin",
  isVerified: boolean,
  followers: Types.ObjectId[],
  following: Types.ObjectId[],
  refreshToken?: string | null,
  passwordResetToken?: string | null,
  passwordResetTokenExpiry?: Date | null
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    unique: true,
    trim: true,
    minLength: [3, "Must be at least 3 characters"],
    maxLength: [30, "Must be less than 30 characters"],
    required: true
  },
  email: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    required: true
  },
  password: {
    type: String,
    select: false,
    required: true
  },
  avatar: {
    type: String
  },
  bio: {
    type: String,
    default: ""
  },
  role: {
    type: String,
    enum: {
      values: ["user", "admin"],
      message: "Role must be either user or admin"
    },
    default: "user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
  refreshToken: {
    type: String,
    select: false,
    default: null
  },
  passwordResetToken: {
    type: String,
    select: false,
    default: null
  },
  passwordResetTokenExpiry: {
    type: Date,
    select: false,
    default: null
  }
}, { timestamps: true })

const User = model<IUser>("User", userSchema)

export default User